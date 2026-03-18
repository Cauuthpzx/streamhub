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
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/livekit/protocol/auth"
	"github.com/livekit/protocol/livekit"
	"github.com/livekit/protocol/logger"

	"github.com/livekit/livekit-server/pkg/config"
)

const (
	// MaxFileSize is 10MB
	MaxFileSize = 10 << 20
	// UploadDir is the directory for uploaded files
	UploadDir = "uploads"
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
	// Lobby (waiting room)
	mux.HandleFunc("/auth/room/lobby/pending", s.handleLobbyPending)
	mux.HandleFunc("/auth/room/lobby/approve", s.handleLobbyApprove)
	mux.HandleFunc("/auth/room/lobby/reject", s.handleLobbyReject)
	mux.HandleFunc("/auth/room/lobby/status", s.handleLobbyStatus)
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
	// File sharing
	mux.HandleFunc("/auth/room/file/upload", s.handleFileUpload)
	mux.HandleFunc("/auth/room/file/download/", s.handleFileDownload)
	mux.HandleFunc("/auth/room/file/list", s.handleFileList)
	// Share links
	mux.HandleFunc("/auth/room/share/create", s.handleShareCreate)
	mux.HandleFunc("/auth/room/share/get", s.handleShareGet)
	mux.HandleFunc("/auth/room/share/resolve", s.handleShareResolve)
	// User profile
	mux.HandleFunc("/auth/profile", s.handleProfile)
	// Room membership
	mux.HandleFunc("/auth/room/leave", s.handleRoomLeave)
	mux.HandleFunc("/auth/room/delete", s.handleRoomDelete)
	mux.HandleFunc("/auth/room/members", s.handleRoomMembers)

	mux.Handle("/auth/ws/events", globalRoomEventHub)
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
	AccessToken  string `json:"access_token"`
	Username     string `json:"username"`
	LobbyPending bool   `json:"lobby_pending,omitempty"`
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

	// check lobby (waiting room) — if enabled and not yet approved, add to pending
	lobbyPending := false
	if req.Room != "" {
		lobbyEnabled, _ := s.userStore.IsRoomLobbyEnabled(r.Context(), req.Room)
		if lobbyEnabled {
			decision, _ := s.userStore.GetLobbyDecision(r.Context(), req.Room, username)
			switch decision {
			case "approved":
				// user was approved, proceed normally
			case "rejected":
				writeJSON(w, http.StatusForbidden, errorResponse{Error: ErrLobbyRejected.Error()})
				return
			default:
				// not yet decided — add to pending
				_ = s.userStore.AddLobbyPending(r.Context(), req.Room, username)
				lobbyPending = true
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
	grant.SetCanUpdateOwnMetadata(true)

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

	// auto-add user as room member when joining
	if req.Room != "" {
		_ = s.userStore.AddRoomMember(r.Context(), req.Room, username, "member")
	}

	logger.Debugw("log.issuedLivekitToken", "username", username, "room", req.Room)
	writeJSON(w, http.StatusOK, tokenResponse{
		AccessToken:  accessToken,
		Username:     username,
		LobbyPending: lobbyPending,
	})
}

// room create/list types

type roomCreateRequest struct {
	Name            string `json:"name"`
	Password        string `json:"password,omitempty"`
	MaxParticipants uint32 `json:"max_participants,omitempty"`
	LobbyEnabled    bool   `json:"lobby_enabled,omitempty"`
}

type roomInfo struct {
	SID             string `json:"sid"`
	Name            string `json:"name"`
	NumParticipants uint32 `json:"num_participants"`
	MaxParticipants uint32 `json:"max_participants"`
	HasPassword     bool   `json:"has_password"`
	HasLobby        bool   `json:"has_lobby"`
	CreatedAt       int64  `json:"created_at"`
	Creator         string `json:"creator,omitempty"`
	IsMember        bool   `json:"is_member,omitempty"`
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

	// store lobby setting if enabled — auto-approve the room creator
	if req.LobbyEnabled {
		if err := s.userStore.SetRoomLobby(r.Context(), req.Name, true); err != nil {
			logger.Errorw("log.setRoomLobbyFailed", err, "room", req.Name)
		}
		_ = s.userStore.SetLobbyDecision(r.Context(), req.Name, username, true)
	}

	// hash room password if provided
	var passwordHash string
	if req.Password != "" {
		hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			logger.Errorw("log.hashRoomPasswordFailed", err)
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
			return
		}
		passwordHash = string(hashed)
		if err := s.userStore.StoreRoomPassword(r.Context(), req.Name, passwordHash); err != nil {
			logger.Errorw("log.storeRoomPasswordFailed", err, "room", req.Name)
		}
	}

	// persist room in PostgreSQL
	nowTs := time.Now().Unix()
	_ = s.userStore.StoreRoom(r.Context(), &RoomRecord{
		Name:            req.Name,
		Creator:         username,
		PasswordHash:    passwordHash,
		LobbyEnabled:    req.LobbyEnabled,
		MaxParticipants: int(req.MaxParticipants),
		Status:          "active",
		CreatedAt:       nowTs,
		UpdatedAt:       nowTs,
	})
	// creator is always a member
	_ = s.userStore.AddRoomMember(r.Context(), req.Name, username, "creator")

	logger.Infow("log.roomCreated", "username", username, "room", req.Name, "hasPassword", req.Password != "", "hasLobby", req.LobbyEnabled, "maxParticipants", req.MaxParticipants)
	writeJSON(w, http.StatusCreated, roomInfo{
		SID:             room.Sid,
		Name:            room.Name,
		NumParticipants: room.NumParticipants,
		MaxParticipants: room.MaxParticipants,
		HasPassword:     req.Password != "",
		HasLobby:        req.LobbyEnabled,
		CreatedAt:       room.CreationTime,
		Creator:         username,
	})
}

func (s *UserAuthService) handleRoomList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}

	username, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	// get active RTC rooms from LiveKit for participant counts
	ctx := WithGrants(r.Context(), &auth.ClaimGrants{
		Video: &auth.VideoGrant{RoomList: true},
	}, s.apiKey)
	lkResp, _ := s.roomService.ListRooms(ctx, &livekit.ListRoomsRequest{})

	// build map: roomName → online participant count
	onlineMap := make(map[string]uint32)
	sidMap := make(map[string]string)
	for _, lkRoom := range lkResp.GetRooms() {
		onlineMap[lkRoom.Name] = lkRoom.NumParticipants
		sidMap[lkRoom.Name] = lkRoom.Sid
	}

	// list all persistent rooms
	dbRooms, _ := s.userStore.ListAllRooms(r.Context())

	// build membership set for current user
	memberRooms, _ := s.userStore.ListUserRooms(r.Context(), username)
	memberSet := make(map[string]struct{}, len(memberRooms))
	for _, m := range memberRooms {
		memberSet[m.Name] = struct{}{}
	}

	rooms := make([]roomInfo, 0, len(dbRooms))
	for _, dbRoom := range dbRooms {
		_, isMember := memberSet[dbRoom.Name]
		rooms = append(rooms, roomInfo{
			SID:             sidMap[dbRoom.Name],
			Name:            dbRoom.Name,
			NumParticipants: onlineMap[dbRoom.Name],
			MaxParticipants: uint32(dbRoom.MaxParticipants),
			HasPassword:     dbRoom.PasswordHash != "",
			HasLobby:        dbRoom.LobbyEnabled,
			CreatedAt:       dbRoom.CreatedAt,
			Creator:         dbRoom.Creator,
			IsMember:        isMember,
		})
	}

	writeJSON(w, http.StatusOK, roomListResponse{Rooms: rooms})
}

func (s *UserAuthService) handleRoomLeave(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}
	username, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}
	var req struct {
		Room string `json:"room"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Room == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}
	// creator cannot leave — must delete room
	dbRoom, err := s.userStore.LoadRoom(r.Context(), req.Room)
	if err == nil && dbRoom.Creator == username {
		writeJSON(w, http.StatusForbidden, errorResponse{Error: "error.creatorCannotLeave"})
		return
	}
	_ = s.userStore.RemoveRoomMember(r.Context(), req.Room, username)
	logger.Infow("log.roomMemberLeft", "username", username, "room", req.Room)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *UserAuthService) handleRoomDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}
	username, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}
	var req struct {
		Room string `json:"room"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Room == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}
	// only creator can delete
	dbRoom, err := s.userStore.LoadRoom(r.Context(), req.Room)
	if err != nil {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: ErrRoomNotFound.Error()})
		return
	}
	if dbRoom.Creator != username {
		writeJSON(w, http.StatusForbidden, errorResponse{Error: "error.onlyCreatorCanDelete"})
		return
	}
	// delete from LiveKit (stops active RTC session)
	ctx := WithGrants(r.Context(), &auth.ClaimGrants{
		Video: &auth.VideoGrant{RoomCreate: true, RoomAdmin: true, Room: req.Room},
	}, s.apiKey)
	_, _ = s.roomService.DeleteRoom(ctx, &livekit.DeleteRoomRequest{Room: req.Room})
	// delete from PostgreSQL (cascade deletes room_members)
	_ = s.userStore.DeleteRoom(r.Context(), req.Room)
	_ = s.userStore.DeleteRoomPassword(r.Context(), req.Room)
	logger.Infow("log.roomDeleted", "username", username, "room", req.Room)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *UserAuthService) handleRoomMembers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}
	_, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}
	roomName := r.URL.Query().Get("room")
	if roomName == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}
	members, err := s.userStore.ListRoomMembers(r.Context(), roomName)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"members": members})
}

// chat types

type chatSendRequest struct {
	Room      string `json:"room"`
	Text      string `json:"text"`
	ReplyTo   string `json:"reply_to,omitempty"`
	ReplyText string `json:"reply_text,omitempty"`
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
		ReplyTo:   req.ReplyTo,
		ReplyText: req.ReplyText,
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

// --- Lobby (waiting room) handlers ---

type lobbyRoomRequest struct {
	Room string `json:"room"`
}

type lobbyDecisionRequest struct {
	Room     string `json:"room"`
	Username string `json:"username"`
}

type lobbyPendingResponse struct {
	Pending []string `json:"pending"`
}

type lobbyStatusResponse struct {
	Status string `json:"status"` // "approved", "rejected", "pending", ""
}

func (s *UserAuthService) handleLobbyPending(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}
	if _, err := s.verifyUserToken(r); err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}
	var req lobbyRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Room == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}
	pending, err := s.userStore.ListLobbyPending(r.Context(), req.Room)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
		return
	}
	writeJSON(w, http.StatusOK, lobbyPendingResponse{Pending: pending})
}

func (s *UserAuthService) handleLobbyApprove(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}
	if _, err := s.verifyUserToken(r); err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}
	var req lobbyDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Room == "" || req.Username == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}
	if err := s.userStore.SetLobbyDecision(r.Context(), req.Room, req.Username, true); err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
		return
	}
	logger.Infow("log.lobbyApproved", "room", req.Room, "username", req.Username)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *UserAuthService) handleLobbyReject(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}
	if _, err := s.verifyUserToken(r); err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}
	var req lobbyDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Room == "" || req.Username == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}
	if err := s.userStore.SetLobbyDecision(r.Context(), req.Room, req.Username, false); err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
		return
	}
	logger.Infow("log.lobbyRejected", "room", req.Room, "username", req.Username)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *UserAuthService) handleLobbyStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}
	username, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}
	var req lobbyRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Room == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}
	decision, _ := s.userStore.GetLobbyDecision(r.Context(), req.Room, username)
	if decision == "" {
		// check if still in pending
		pending, _ := s.userStore.ListLobbyPending(r.Context(), req.Room)
		for _, p := range pending {
			if p == username {
				decision = "pending"
				break
			}
		}
	}
	writeJSON(w, http.StatusOK, lobbyStatusResponse{Status: decision})
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

// ── File sharing ──

func (s *UserAuthService) handleFileUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}

	username, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, MaxFileSize+1024)
	if err := r.ParseMultipartForm(MaxFileSize); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.fileTooLarge"})
		return
	}

	roomName := r.FormValue("room")
	if roomName == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}
	defer file.Close()

	if header.Size > MaxFileSize {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.fileTooLarge"})
		return
	}

	// generate unique file ID
	idBytes := make([]byte, 16)
	rand.Read(idBytes)
	fileID := hex.EncodeToString(idBytes)
	ext := filepath.Ext(header.Filename)
	storedName := fileID + ext

	// ensure upload dir exists
	if err := os.MkdirAll(UploadDir, 0o755); err != nil {
		logger.Errorw("log.createUploadDirFailed", err, "dir", UploadDir)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.fileUploadFailed"})
		return
	}

	dstPath := filepath.Join(UploadDir, storedName)
	dst, err := os.Create(dstPath)
	if err != nil {
		logger.Errorw("log.createFileFailed", err, "path", dstPath)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.fileUploadFailed"})
		return
	}
	defer dst.Close()

	written, err := io.Copy(dst, file)
	if err != nil {
		logger.Errorw("log.writeFileFailed", err, "path", dstPath)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.fileUploadFailed"})
		return
	}

	meta := &FileMetadata{
		ID:        fileID,
		RoomName:  roomName,
		Sender:    username,
		FileName:  header.Filename,
		FileSize:  written,
		MimeType:  header.Header.Get("Content-Type"),
		Timestamp: time.Now().UnixMilli(),
	}

	if err := s.userStore.StoreFileMetadata(r.Context(), meta); err != nil {
		logger.Errorw("log.storeFileMetaFailed", err, "fileID", fileID)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.fileUploadFailed"})
		return
	}

	// persist file message to chat history so it survives reload
	chatMsg := &ChatMessage{
		ID:        fmt.Sprintf("file-%s", fileID),
		RoomName:  roomName,
		Sender:    username,
		Timestamp: meta.Timestamp,
		FileID:    meta.ID,
		FileName:  meta.FileName,
		FileSize:  meta.FileSize,
	}
	_ = s.userStore.StoreChatMessage(r.Context(), roomName, chatMsg)

	writeJSON(w, http.StatusCreated, meta)
}

func (s *UserAuthService) handleFileDownload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}

	// extract fileID from path: /auth/room/file/download/{id}
	fileID := strings.TrimPrefix(r.URL.Path, "/auth/room/file/download/")
	if fileID == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}

	meta, err := s.userStore.LoadFileMetadata(r.Context(), fileID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "error.fileNotFound"})
		return
	}

	ext := filepath.Ext(meta.FileName)
	filePath := filepath.Join(UploadDir, fileID+ext)

	f, err := os.Open(filePath)
	if err != nil {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "error.fileNotFound"})
		return
	}
	defer f.Close()

	w.Header().Set("Content-Type", meta.MimeType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", meta.FileName))
	io.Copy(w, f)
}

func (s *UserAuthService) handleFileList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}

	_, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	var req struct {
		Room string `json:"room"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}

	files, err := s.userStore.ListRoomFiles(r.Context(), req.Room)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"files": files})
}

// ── Share links ──

func randomCode(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func (s *UserAuthService) handleShareCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}

	username, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	var req struct {
		Room string `json:"room"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}
	if req.Room == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.roomNameEmpty"})
		return
	}

	// return existing link if one exists
	existing, err := s.userStore.LoadShareLinkByRoom(r.Context(), req.Room)
	if err == nil {
		writeJSON(w, http.StatusOK, existing)
		return
	}

	link := &ShareLink{
		Code:      randomCode(6),
		RoomName:  req.Room,
		CreatedBy: username,
		CreatedAt: time.Now().UnixMilli(),
	}

	if err := s.userStore.StoreShareLink(r.Context(), link); err != nil {
		logger.Errorw("log.storeShareLinkFailed", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
		return
	}

	writeJSON(w, http.StatusCreated, link)
}

func (s *UserAuthService) handleShareGet(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}

	_, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: ErrInvalidCredentials.Error()})
		return
	}

	var req struct {
		Room string `json:"room"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}

	link, err := s.userStore.LoadShareLinkByRoom(r.Context(), req.Room)
	if err != nil {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "error.shareLinkNotFound"})
		return
	}

	writeJSON(w, http.StatusOK, link)
}

func (s *UserAuthService) handleShareResolve(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
		return
	}

	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
		return
	}

	link, err := s.userStore.LoadShareLink(r.Context(), req.Code)
	if err != nil {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "error.shareLinkNotFound"})
		return
	}

	writeJSON(w, http.StatusOK, link)
}

// ── User profile ──

func (s *UserAuthService) handleProfile(w http.ResponseWriter, r *http.Request) {
	username, err := s.verifyUserToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "error.missingAuthorization"})
		return
	}

	switch r.Method {
	case http.MethodGet:
		displayName, avatar, ax, ay, as, err := s.userStore.GetProfile(r.Context(), username)
		if err != nil {
			// user exists (JWT valid) but no profile yet — return empty profile
			writeJSON(w, http.StatusOK, map[string]any{
				"username":     username,
				"display_name": "",
				"avatar":       "",
				"avatar_x":     0.5,
				"avatar_y":     0.5,
				"avatar_scale": 1,
			})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"username":     username,
			"display_name": displayName,
			"avatar":       avatar,
			"avatar_x":     ax,
			"avatar_y":     ay,
			"avatar_scale": as,
		})

	case http.MethodPost:
		var req struct {
			DisplayName string  `json:"display_name"`
			Avatar      string  `json:"avatar"`
			AvatarX     float64 `json:"avatar_x"`
			AvatarY     float64 `json:"avatar_y"`
			AvatarScale float64 `json:"avatar_scale"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "error.invalidRequest"})
			return
		}

		if err := s.userStore.UpdateProfile(r.Context(), username, req.DisplayName, req.Avatar, req.AvatarX, req.AvatarY, req.AvatarScale); err != nil {
			// user may not exist in store (dev restart) — create stub record then retry
			stub := &UserRecord{Username: username, CreatedAt: time.Now().Unix()}
			if storeErr := s.userStore.StoreUser(r.Context(), stub); storeErr == nil {
				err = s.userStore.UpdateProfile(r.Context(), username, req.DisplayName, req.Avatar, req.AvatarX, req.AvatarY, req.AvatarScale)
			}
			if err != nil {
				logger.Errorw("log.updateProfileFailed", err)
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.internal"})
				return
			}
		}

		logger.Infow("log.profileUpdated", "username", username)
		writeJSON(w, http.StatusOK, map[string]any{
			"username":     username,
			"display_name": req.DisplayName,
			"avatar":       req.Avatar,
			"avatar_x":     req.AvatarX,
			"avatar_y":     req.AvatarY,
			"avatar_scale": req.AvatarScale,
		})

	default:
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "error.methodNotAllowed"})
	}
}
