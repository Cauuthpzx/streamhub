// Copyright 2024 LiveKit, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package service

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/livekit/protocol/auth"
	"github.com/livekit/protocol/livekit"
	"github.com/livekit/protocol/logger"

	"github.com/livekit/livekit-server/pkg/config"
)

type UserAuthService struct {
	config      config.UserAuthConfig
	userStore   UserStore
	keyProvider auth.KeyProvider
	roomService livekit.RoomService
	apiKey      string
	apiSecret   string
}

func NewUserAuthService(
	conf *config.Config,
	userStore UserStore,
	keyProvider auth.KeyProvider,
	roomService livekit.RoomService,
) *UserAuthService {
	// use the first API key pair for issuing LiveKit tokens
	var apiKey, apiSecret string
	for k, v := range conf.Keys {
		apiKey = k
		apiSecret = v
		break
	}

	return &UserAuthService{
		config:      conf.UserAuth,
		userStore:   userStore,
		keyProvider: keyProvider,
		roomService: roomService,
		apiKey:      apiKey,
		apiSecret:   apiSecret,
	}
}

func (s *UserAuthService) SetupRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/auth/register", s.handleRegister)
	mux.HandleFunc("/auth/login", s.handleLogin)
	mux.HandleFunc("/auth/token", s.handleToken)
	mux.HandleFunc("/auth/room/create", s.handleRoomCreate)
	mux.HandleFunc("/auth/room/list", s.handleRoomList)
}

// request/response types

type registerRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type authResponse struct {
	Token    string `json:"token"`
	Username string `json:"username"`
}

type errorResponse struct {
	Error string `json:"error"`
}

// UserClaims represents JWT claims for user tokens
type UserClaims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

func (s *UserAuthService) handleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	if s.config.JWTSecret == "" {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: ErrUserAuthNotEnabled.Error()})
		return
	}

	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
		return
	}

	// validate
	if req.Username == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: ErrUsernameEmpty.Error()})
		return
	}
	if req.Password == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: ErrPasswordEmpty.Error()})
		return
	}
	if len(req.Username) < s.config.MinUsernameLength {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: ErrUsernameTooShort.Error()})
		return
	}
	if len(req.Password) < s.config.MinPasswordLength {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: ErrPasswordTooShort.Error()})
		return
	}

	// check if user already exists
	exists, err := s.userStore.UserExists(r.Context(), req.Username)
	if err != nil {
		logger.Errorw("failed to check user existence", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}
	if exists {
		writeJSON(w, http.StatusConflict, errorResponse{Error: ErrUserAlreadyExists.Error()})
		return
	}

	// hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		logger.Errorw("failed to hash password", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}

	// store user
	user := &UserRecord{
		Username:     req.Username,
		PasswordHash: string(hashedPassword),
		CreatedAt:    time.Now().Unix(),
	}
	if err := s.userStore.StoreUser(r.Context(), user); err != nil {
		logger.Errorw("failed to store user", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}

	// generate token
	token, err := s.generateToken(req.Username)
	if err != nil {
		logger.Errorw("failed to generate token", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}

	logger.Infow("user registered", "username", req.Username)
	writeJSON(w, http.StatusCreated, authResponse{
		Token:    token,
		Username: req.Username,
	})
}

func (s *UserAuthService) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	if s.config.JWTSecret == "" {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: ErrUserAuthNotEnabled.Error()})
		return
	}

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
		return
	}

	if req.Username == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: ErrUsernameEmpty.Error()})
		return
	}
	if req.Password == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: ErrPasswordEmpty.Error()})
		return
	}

	// load user
	user, err := s.userStore.LoadUser(r.Context(), req.Username)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	// verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	// generate token
	token, err := s.generateToken(req.Username)
	if err != nil {
		logger.Errorw("failed to generate token", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}

	logger.Infow("user logged in", "username", req.Username)
	writeJSON(w, http.StatusOK, authResponse{
		Token:    token,
		Username: req.Username,
	})
}

func (s *UserAuthService) generateToken(username string) (string, error) {
	expiry := s.config.TokenExpiry
	if expiry == 0 {
		expiry = 24 * time.Hour
	}

	claims := &UserClaims{
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   username,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.config.JWTSecret))
}

// tokenRequest for requesting a LiveKit access token
type tokenRequest struct {
	// room to join (optional, if empty grants room create/list permission only)
	Room string `json:"room,omitempty"`
	// password for password-protected rooms
	Password string `json:"password,omitempty"`
}

type tokenResponse struct {
	AccessToken string `json:"access_token"`
	Username    string `json:"username"`
}

func (s *UserAuthService) handleToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	if s.apiKey == "" || s.apiSecret == "" {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: "API keys not configured"})
		return
	}

	// verify user JWT from Authorization header
	username, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	var req tokenRequest
	if r.Body != nil {
		json.NewDecoder(r.Body).Decode(&req)
	}

	// if joining a specific room, verify password if room is protected
	if req.Room != "" {
		hasPassword, err := s.userStore.RoomHasPassword(r.Context(), req.Room)
		if err != nil && err != ErrRoomNotFound {
			logger.Errorw("failed to check room password", err, "room", req.Room)
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
			return
		}
		if hasPassword {
			if req.Password == "" {
				writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrRoomPasswordRequired.Error()})
				return
			}
			storedHash, err := s.userStore.LoadRoomPassword(r.Context(), req.Room)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
				return
			}
			if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(req.Password)); err != nil {
				writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrRoomPasswordIncorrect.Error()})
				return
			}
		}
	}

	// build LiveKit access token with grants based on request
	grant := &auth.VideoGrant{
		RoomCreate: true,
		RoomList:   true,
		RoomJoin:   true,
		Room:       req.Room,
	}
	grant.SetCanPublish(true)
	grant.SetCanPublishData(true)
	grant.SetCanSubscribe(true)

	at := auth.NewAccessToken(s.apiKey, s.apiSecret).
		SetVideoGrant(grant).
		SetIdentity(username).
		SetValidFor(s.config.TokenExpiry)

	accessToken, err := at.ToJWT()
	if err != nil {
		logger.Errorw("failed to generate LiveKit token", err, "username", username)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}

	logger.Debugw("issued LiveKit token", "username", username, "room", req.Room)
	writeJSON(w, http.StatusOK, tokenResponse{
		AccessToken: accessToken,
		Username:    username,
	})
}

// room create/list types

type roomCreateRequest struct {
	Name            string `json:"name"`
	Password        string `json:"password,omitempty"`
	MaxParticipants uint32 `json:"max_participants,omitempty"`
}

type roomInfo struct {
	SID             string `json:"sid"`
	Name            string `json:"name"`
	NumParticipants uint32 `json:"num_participants"`
	MaxParticipants uint32 `json:"max_participants"`
	HasPassword     bool   `json:"has_password"`
	CreatedAt       int64  `json:"created_at"`
}

type roomListResponse struct {
	Rooms []roomInfo `json:"rooms"`
}

func (s *UserAuthService) handleRoomCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	username, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	var req roomCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
		return
	}

	if req.Name == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: ErrRoomNameEmpty.Error()})
		return
	}

	// create room via LiveKit RoomService with admin grants
	ctx := WithGrants(r.Context(), &auth.ClaimGrants{
		Video: &auth.VideoGrant{RoomCreate: true, RoomAdmin: true, Room: req.Name},
	}, s.apiKey)

	room, err := s.roomService.CreateRoom(ctx, &livekit.CreateRoomRequest{
		Name:            req.Name,
		MaxParticipants: req.MaxParticipants,
		EmptyTimeout:    300,
		DepartureTimeout: 20,
	})
	if err != nil {
		logger.Errorw("failed to create room", err, "username", username, "room", req.Name)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
		return
	}

	// store room password if provided
	if req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			logger.Errorw("failed to hash room password", err)
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
			return
		}
		if err := s.userStore.StoreRoomPassword(r.Context(), req.Name, string(hashedPassword)); err != nil {
			logger.Errorw("failed to store room password", err, "room", req.Name)
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
			return
		}
	}

	logger.Infow("room created", "username", username, "room", req.Name, "hasPassword", req.Password != "", "maxParticipants", req.MaxParticipants)
	writeJSON(w, http.StatusCreated, roomInfo{
		SID:             room.Sid,
		Name:            room.Name,
		NumParticipants: room.NumParticipants,
		MaxParticipants: room.MaxParticipants,
		HasPassword:     req.Password != "",
		CreatedAt:       room.CreationTime,
	})
}

func (s *UserAuthService) handleRoomList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	_, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	// list rooms via LiveKit RoomService with list grants
	ctx := WithGrants(r.Context(), &auth.ClaimGrants{
		Video: &auth.VideoGrant{RoomList: true},
	}, s.apiKey)

	resp, err := s.roomService.ListRooms(ctx, &livekit.ListRoomsRequest{})
	if err != nil {
		logger.Errorw("failed to list rooms", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}

	rooms := make([]roomInfo, 0, len(resp.Rooms))
	for _, room := range resp.Rooms {
		hasPassword, _ := s.userStore.RoomHasPassword(r.Context(), room.Name)
		rooms = append(rooms, roomInfo{
			SID:             room.Sid,
			Name:            room.Name,
			NumParticipants: room.NumParticipants,
			MaxParticipants: room.MaxParticipants,
			HasPassword:     hasPassword,
			CreatedAt:       room.CreationTime,
		})
	}

	writeJSON(w, http.StatusOK, roomListResponse{Rooms: rooms})
}

// verifyUserToken extracts and validates the user JWT from Authorization header
func (s *UserAuthService) verifyUserToken(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return "", ErrMissingAuthorization
	}

	tokenStr := authHeader[len("Bearer "):]
	claims := &UserClaims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidAuthorizationToken
		}
		return []byte(s.config.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return "", ErrInvalidAuthorizationToken
	}

	return claims.Username, nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
