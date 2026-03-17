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
	"fmt"
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
	config               config.UserAuthConfig
	userStore            UserStore
	keyProvider          auth.KeyProvider
	roomService          livekit.RoomService
	ingressService       *IngressService
	agentDispatchService *AgentDispatchService
	egressService        *EgressService
	apiKey               string
	apiSecret            string
}

func NewUserAuthService(
	conf *config.Config,
	userStore UserStore,
	keyProvider auth.KeyProvider,
	roomService livekit.RoomService,
	ingressService *IngressService,
	agentDispatchService *AgentDispatchService,
	egressService *EgressService,
) *UserAuthService {
	// use the first API key pair for issuing LiveKit tokens
	var apiKey, apiSecret string
	for k, v := range conf.Keys {
		apiKey = k
		apiSecret = v
		break
	}

	return &UserAuthService{
		config:               conf.UserAuth,
		userStore:            userStore,
		keyProvider:          keyProvider,
		roomService:          roomService,
		ingressService:       ingressService,
		agentDispatchService: agentDispatchService,
		egressService:        egressService,
		apiKey:               apiKey,
		apiSecret:            apiSecret,
	}
}

func (s *UserAuthService) SetupRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/auth/register", s.handleRegister)
	mux.HandleFunc("/auth/login", s.handleLogin)
	mux.HandleFunc("/auth/token", s.handleToken)
	mux.HandleFunc("/auth/room/create", s.handleRoomCreate)
	mux.HandleFunc("/auth/room/list", s.handleRoomList)
	mux.HandleFunc("/auth/room/chat/send", s.handleChatSend)
	mux.HandleFunc("/auth/room/chat/history", s.handleChatHistory)
	// Ingress (RTMP/WHIP)
	mux.HandleFunc("/auth/ingress/create", s.handleIngressCreate)
	mux.HandleFunc("/auth/ingress/list", s.handleIngressList)
	mux.HandleFunc("/auth/ingress/delete", s.handleIngressDelete)
	// Agent dispatch
	mux.HandleFunc("/auth/agent/dispatch", s.handleAgentDispatch)
	mux.HandleFunc("/auth/agent/dispatch/list", s.handleAgentDispatchList)
	mux.HandleFunc("/auth/agent/dispatch/delete", s.handleAgentDispatchDelete)
	// Egress (Recording)
	mux.HandleFunc("/auth/egress/start", s.handleEgressStart)
	mux.HandleFunc("/auth/egress/list", s.handleEgressList)
	mux.HandleFunc("/auth/egress/stop", s.handleEgressStop)
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
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}

	if s.config.JWTSecret == "" {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: ErrUserAuthNotEnabled.Error()})
		return
	}

	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
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
		logger.Errorw("log.userCheckFailed", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
		return
	}
	if exists {
		writeJSON(w, http.StatusConflict, errorResponse{Error: ErrUserAlreadyExists.Error()})
		return
	}

	// hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		logger.Errorw("log.hashPasswordFailed", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
		return
	}

	// store user
	user := &UserRecord{
		Username:     req.Username,
		PasswordHash: string(hashedPassword),
		CreatedAt:    time.Now().Unix(),
	}
	if err := s.userStore.StoreUser(r.Context(), user); err != nil {
		logger.Errorw("log.storeUserFailed", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
		return
	}

	// generate token
	token, err := s.generateToken(req.Username)
	if err != nil {
		logger.Errorw("log.generateTokenFailed", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
		return
	}

	logger.Infow("log.userRegistered", "username", req.Username)
	writeJSON(w, http.StatusCreated, authResponse{
		Token:    token,
		Username: req.Username,
	})
}

func (s *UserAuthService) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}

	if s.config.JWTSecret == "" {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: ErrUserAuthNotEnabled.Error()})
		return
	}

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
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
		logger.Errorw("log.generateTokenFailed", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
		return
	}

	logger.Infow("log.userLoggedIn", "username", req.Username)
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
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}

	if s.apiKey == "" || s.apiSecret == "" {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: "error.apiKeysNotConfigured"})
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
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
			return
		}
	}

	// if joining a specific room, verify password if room is protected
	if req.Room != "" {
		hasPassword, err := s.userStore.RoomHasPassword(r.Context(), req.Room)
		if err != nil && err != ErrRoomNotFound {
			logger.Errorw("log.checkRoomPasswordFailed", err, "room", req.Room)
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
			return
		}
		if hasPassword {
			if req.Password == "" {
				writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrRoomPasswordRequired.Error()})
				return
			}
			storedHash, err := s.userStore.LoadRoomPassword(r.Context(), req.Room)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
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
		logger.Errorw("log.generateLivekitTokenFailed", err, "username", username)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
		return
	}

	logger.Debugw("log.issuedLivekitToken", "username", username, "room", req.Room)
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
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}

	username, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	var req roomCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
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
		Name:             req.Name,
		MaxParticipants:  req.MaxParticipants,
		EmptyTimeout:     86400 * 30, // 30 ngày, room tồn tại lâu dài
		DepartureTimeout: 86400 * 30, // 30 ngày sau khi tất cả rời
	})
	if err != nil {
		logger.Errorw("log.createRoomFailed", err, "username", username, "room", req.Name)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.roomCreateFailed"})
		return
	}

	// store room password if provided
	if req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			logger.Errorw("log.hashRoomPasswordFailed", err)
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
			return
		}
		if err := s.userStore.StoreRoomPassword(r.Context(), req.Name, string(hashedPassword)); err != nil {
			logger.Errorw("log.storeRoomPasswordFailed", err, "room", req.Name)
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
			return
		}
	}

	logger.Infow("log.roomCreated", "username", username, "room", req.Name, "hasPassword", req.Password != "", "maxParticipants", req.MaxParticipants)
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
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
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
		logger.Errorw("log.listRoomsFailed", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
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

// chat types

type chatSendRequest struct {
	Room string `json:"room"`
	Text string `json:"text"`
}

type chatHistoryRequest struct {
	Room  string `json:"room"`
	Limit int    `json:"limit,omitempty"`
}

type chatHistoryResponse struct {
	Messages []*ChatMessage `json:"messages"`
}

func (s *UserAuthService) handleChatSend(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}

	username, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	var req chatSendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}

	if req.Room == "" || req.Text == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}

	msg := &ChatMessage{
		ID:        fmt.Sprintf("%d-%s", time.Now().UnixNano(), username),
		RoomName:  req.Room,
		Sender:    username,
		Text:      req.Text,
		Timestamp: time.Now().UnixMilli(),
	}

	if err := s.userStore.StoreChatMessage(r.Context(), req.Room, msg); err != nil {
		logger.Errorw("log.storeChatFailed", err, "room", req.Room)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
		return
	}

	writeJSON(w, http.StatusCreated, msg)
}

func (s *UserAuthService) handleChatHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}

	_, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	var req chatHistoryRequest
	if r.Body != nil {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
			return
		}
	}

	if req.Room == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}

	limit := req.Limit
	if limit <= 0 {
		limit = 100
	}

	messages, err := s.userStore.LoadChatMessages(r.Context(), req.Room, limit)
	if err != nil {
		logger.Errorw("log.loadChatFailed", err, "room", req.Room)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
		return
	}

	writeJSON(w, http.StatusOK, chatHistoryResponse{Messages: messages})
}

// --- Ingress handlers ---

type createIngressRequest struct {
	InputType string `json:"input_type"` // "rtmp" or "whip"
	Name      string `json:"name"`
	Room      string `json:"room"`
	Identity  string `json:"identity"`
}

type ingressInfoResponse struct {
	IngressID string `json:"ingress_id"`
	Name      string `json:"name"`
	StreamKey string `json:"stream_key"`
	URL       string `json:"url"`
	InputType string `json:"input_type"`
	Room      string `json:"room"`
	Identity  string `json:"identity"`
	Status    string `json:"status"`
}

func toIngressResponse(info *livekit.IngressInfo) ingressInfoResponse {
	status := "inactive"
	if info.State != nil {
		switch info.State.Status {
		case livekit.IngressState_ENDPOINT_BUFFERING:
			status = "buffering"
		case livekit.IngressState_ENDPOINT_PUBLISHING:
			status = "publishing"
		case livekit.IngressState_ENDPOINT_ERROR:
			status = "error"
		case livekit.IngressState_ENDPOINT_COMPLETE:
			status = "complete"
		}
	}
	inputType := "rtmp"
	if info.InputType == livekit.IngressInput_WHIP_INPUT {
		inputType = "whip"
	} else if info.InputType == livekit.IngressInput_URL_INPUT {
		inputType = "url"
	}
	return ingressInfoResponse{
		IngressID: info.IngressId,
		Name:      info.Name,
		StreamKey: info.StreamKey,
		URL:       info.Url,
		InputType: inputType,
		Room:      info.RoomName,
		Identity:  info.ParticipantIdentity,
		Status:    status,
	}
}

func (s *UserAuthService) handleIngressCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}
	username, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	var req createIngressRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}
	if req.Room == "" || req.Name == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.missingFields"})
		return
	}
	if req.Identity == "" {
		req.Identity = username
	}

	inputType := livekit.IngressInput_RTMP_INPUT
	if req.InputType == "whip" {
		inputType = livekit.IngressInput_WHIP_INPUT
	}

	ctx := WithGrants(r.Context(), &auth.ClaimGrants{
		Video: &auth.VideoGrant{
			IngressAdmin: true,
			RoomCreate:   true,
			RoomAdmin:    true,
		},
	}, s.apiKey)

	info, err := s.ingressService.CreateIngress(ctx, &livekit.CreateIngressRequest{
		InputType:           inputType,
		Name:                req.Name,
		RoomName:            req.Room,
		ParticipantIdentity: req.Identity,
		ParticipantName:     req.Identity,
	})
	if err != nil {
		logger.Errorw("log.createIngressFailed", err, "user", username)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.ingressCreateFailed"})
		return
	}

	writeJSON(w, http.StatusOK, toIngressResponse(info))
}

func (s *UserAuthService) handleIngressList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}
	_, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	var body struct {
		Room string `json:"room"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}

	ctx := WithGrants(r.Context(), &auth.ClaimGrants{
		Video: &auth.VideoGrant{IngressAdmin: true},
	}, s.apiKey)

	resp, err := s.ingressService.ListIngress(ctx, &livekit.ListIngressRequest{
		RoomName: body.Room,
	})
	if err != nil {
		logger.Errorw("log.listIngressFailed", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
		return
	}

	items := make([]ingressInfoResponse, 0, len(resp.Items))
	for _, info := range resp.Items {
		items = append(items, toIngressResponse(info))
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *UserAuthService) handleIngressDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}
	username, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	var body struct {
		IngressID string `json:"ingress_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.IngressID == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.missingFields"})
		return
	}

	ctx := WithGrants(r.Context(), &auth.ClaimGrants{
		Video: &auth.VideoGrant{IngressAdmin: true},
	}, s.apiKey)

	_, err = s.ingressService.DeleteIngress(ctx, &livekit.DeleteIngressRequest{
		IngressId: body.IngressID,
	})
	if err != nil {
		logger.Errorw("log.deleteIngressFailed", err, "user", username)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.ingressDeleteFailed"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

// --- Agent dispatch handlers ---

type createAgentDispatchRequest struct {
	Room      string `json:"room"`
	AgentName string `json:"agent_name"`
	Metadata  string `json:"metadata,omitempty"`
}

type agentDispatchResponse struct {
	ID        string `json:"id"`
	AgentName string `json:"agent_name"`
	Room      string `json:"room"`
	Metadata  string `json:"metadata,omitempty"`
}

func toAgentDispatchResponse(d *livekit.AgentDispatch) agentDispatchResponse {
	return agentDispatchResponse{
		ID:        d.Id,
		AgentName: d.AgentName,
		Room:      d.Room,
		Metadata:  d.Metadata,
	}
}

func (s *UserAuthService) handleAgentDispatch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}
	username, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	var req createAgentDispatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}
	if req.Room == "" || req.AgentName == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.missingFields"})
		return
	}

	ctx := WithGrants(r.Context(), &auth.ClaimGrants{
		Video: &auth.VideoGrant{
			RoomAdmin: true,
			Room:      req.Room,
		},
	}, s.apiKey)

	dispatch, err := s.agentDispatchService.CreateDispatch(ctx, &livekit.CreateAgentDispatchRequest{
		Room:      req.Room,
		AgentName: req.AgentName,
		Metadata:  req.Metadata,
	})
	if err != nil {
		logger.Errorw("log.createAgentDispatchFailed", err, "user", username)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.agentDispatchFailed"})
		return
	}

	writeJSON(w, http.StatusOK, toAgentDispatchResponse(dispatch))
}

func (s *UserAuthService) handleAgentDispatchList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}
	_, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	var body struct {
		Room string `json:"room"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Room == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.missingFields"})
		return
	}

	ctx := WithGrants(r.Context(), &auth.ClaimGrants{
		Video: &auth.VideoGrant{
			RoomAdmin: true,
			Room:      body.Room,
		},
	}, s.apiKey)

	resp, err := s.agentDispatchService.ListDispatch(ctx, &livekit.ListAgentDispatchRequest{
		Room: body.Room,
	})
	if err != nil {
		logger.Errorw("log.listAgentDispatchFailed", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
		return
	}

	items := make([]agentDispatchResponse, 0, len(resp.AgentDispatches))
	for _, d := range resp.AgentDispatches {
		items = append(items, toAgentDispatchResponse(d))
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *UserAuthService) handleAgentDispatchDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}
	username, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	var body struct {
		Room       string `json:"room"`
		DispatchID string `json:"dispatch_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.DispatchID == "" || body.Room == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.missingFields"})
		return
	}

	ctx := WithGrants(r.Context(), &auth.ClaimGrants{
		Video: &auth.VideoGrant{
			RoomAdmin: true,
			Room:      body.Room,
		},
	}, s.apiKey)

	_, err = s.agentDispatchService.DeleteDispatch(ctx, &livekit.DeleteAgentDispatchRequest{
		DispatchId: body.DispatchID,
		Room:       body.Room,
	})
	if err != nil {
		logger.Errorw("log.deleteAgentDispatchFailed", err, "user", username)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.agentDispatchDeleteFailed"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

// --- Egress (Recording) handlers ---

type startEgressRequest struct {
	Room string `json:"room"`
}

type egressInfoResponse struct {
	EgressID  string `json:"egress_id"`
	RoomName  string `json:"room"`
	Status    string `json:"status"`
	StartedAt int64  `json:"started_at"`
	EndedAt   int64  `json:"ended_at,omitempty"`
}

func toEgressStatus(status livekit.EgressStatus) string {
	switch status {
	case livekit.EgressStatus_EGRESS_STARTING:
		return "starting"
	case livekit.EgressStatus_EGRESS_ACTIVE:
		return "active"
	case livekit.EgressStatus_EGRESS_ENDING:
		return "ending"
	case livekit.EgressStatus_EGRESS_COMPLETE:
		return "complete"
	case livekit.EgressStatus_EGRESS_FAILED:
		return "failed"
	case livekit.EgressStatus_EGRESS_ABORTED:
		return "aborted"
	case livekit.EgressStatus_EGRESS_LIMIT_REACHED:
		return "limit_reached"
	default:
		return "unknown"
	}
}

func toEgressInfoResponse(info *livekit.EgressInfo) egressInfoResponse {
	return egressInfoResponse{
		EgressID:  info.EgressId,
		RoomName:  info.RoomName,
		Status:    toEgressStatus(info.Status),
		StartedAt: info.StartedAt,
		EndedAt:   info.EndedAt,
	}
}

func (s *UserAuthService) handleEgressStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}
	username, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	var req startEgressRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}
	if req.Room == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.missingFields"})
		return
	}

	ctx := WithGrants(r.Context(), &auth.ClaimGrants{
		Video: &auth.VideoGrant{
			RoomRecord: true,
			RoomAdmin:  true,
			Room:       req.Room,
		},
	}, s.apiKey)

	info, err := s.egressService.StartRoomCompositeEgress(ctx, &livekit.RoomCompositeEgressRequest{
		RoomName: req.Room,
		FileOutputs: []*livekit.EncodedFileOutput{
			{
				FileType: livekit.EncodedFileType_MP4,
			},
		},
	})
	if err != nil {
		logger.Errorw("log.startEgressFailed", err, "user", username, "room", req.Room)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.egressStartFailed"})
		return
	}

	writeJSON(w, http.StatusOK, toEgressInfoResponse(info))
}

func (s *UserAuthService) handleEgressList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}
	_, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	var body struct {
		Room string `json:"room"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}

	ctx := WithGrants(r.Context(), &auth.ClaimGrants{
		Video: &auth.VideoGrant{RoomRecord: true},
	}, s.apiKey)

	resp, err := s.egressService.ListEgress(ctx, &livekit.ListEgressRequest{
		RoomName: body.Room,
	})
	if err != nil {
		logger.Errorw("log.listEgressFailed", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
		return
	}

	items := make([]egressInfoResponse, 0, len(resp.Items))
	for _, info := range resp.Items {
		items = append(items, toEgressInfoResponse(info))
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *UserAuthService) handleEgressStop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}
	username, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	var body struct {
		EgressID string `json:"egress_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.EgressID == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.missingFields"})
		return
	}

	ctx := WithGrants(r.Context(), &auth.ClaimGrants{
		Video: &auth.VideoGrant{RoomRecord: true},
	}, s.apiKey)

	info, err := s.egressService.StopEgress(ctx, &livekit.StopEgressRequest{
		EgressId: body.EgressID,
	})
	if err != nil {
		logger.Errorw("log.stopEgressFailed", err, "user", username)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.egressStopFailed"})
		return
	}

	writeJSON(w, http.StatusOK, toEgressInfoResponse(info))
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
