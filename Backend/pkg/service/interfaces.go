// Copyright 2023 LiveKit, Inc.
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
	"context"
	"time"

	"github.com/livekit/protocol/livekit"
)

//go:generate go run github.com/maxbrunsfeld/counterfeiter/v6 -generate

// encapsulates CRUD operations for room settings
//
//counterfeiter:generate . ObjectStore
type ObjectStore interface {
	ServiceStore
	OSSServiceStore

	// enable locking on a specific room to prevent race
	// returns a (lock uuid, error)
	LockRoom(ctx context.Context, roomName livekit.RoomName, duration time.Duration) (string, error)
	UnlockRoom(ctx context.Context, roomName livekit.RoomName, uid string) error

	StoreRoom(ctx context.Context, room *livekit.Room, internal *livekit.RoomInternal) error

	StoreParticipant(ctx context.Context, roomName livekit.RoomName, participant *livekit.ParticipantInfo) error
	DeleteParticipant(ctx context.Context, roomName livekit.RoomName, identity livekit.ParticipantIdentity) error
}

//counterfeiter:generate . ServiceStore
type ServiceStore interface {
	LoadRoom(ctx context.Context, roomName livekit.RoomName, includeInternal bool) (*livekit.Room, *livekit.RoomInternal, error)
	RoomExists(ctx context.Context, roomName livekit.RoomName) (bool, error)

	// ListRooms returns currently active rooms. if names is not nil, it'll filter and return
	// only rooms that match
	ListRooms(ctx context.Context, roomNames []livekit.RoomName) ([]*livekit.Room, error)
	LoadParticipant(ctx context.Context, roomName livekit.RoomName, identity livekit.ParticipantIdentity) (*livekit.ParticipantInfo, error)
	ListParticipants(ctx context.Context, roomName livekit.RoomName) ([]*livekit.ParticipantInfo, error)
}

type OSSServiceStore interface {
	DeleteRoom(ctx context.Context, roomName livekit.RoomName) error
	HasParticipant(context.Context, livekit.RoomName, livekit.ParticipantIdentity) (bool, error)
}

//counterfeiter:generate . EgressStore
type EgressStore interface {
	StoreEgress(ctx context.Context, info *livekit.EgressInfo) error
	LoadEgress(ctx context.Context, egressID string) (*livekit.EgressInfo, error)
	ListEgress(ctx context.Context, roomName livekit.RoomName, active bool) ([]*livekit.EgressInfo, error)
	UpdateEgress(ctx context.Context, info *livekit.EgressInfo) error
}

//counterfeiter:generate . IngressStore
type IngressStore interface {
	StoreIngress(ctx context.Context, info *livekit.IngressInfo) error
	LoadIngress(ctx context.Context, ingressID string) (*livekit.IngressInfo, error)
	LoadIngressFromStreamKey(ctx context.Context, streamKey string) (*livekit.IngressInfo, error)
	ListIngress(ctx context.Context, roomName livekit.RoomName) ([]*livekit.IngressInfo, error)
	UpdateIngress(ctx context.Context, info *livekit.IngressInfo) error
	UpdateIngressState(ctx context.Context, ingressId string, state *livekit.IngressState) error
	DeleteIngress(ctx context.Context, info *livekit.IngressInfo) error
}

//counterfeiter:generate . RoomAllocator
type RoomAllocator interface {
	AutoCreateEnabled(ctx context.Context) bool
	SelectRoomNode(ctx context.Context, roomName livekit.RoomName, nodeID livekit.NodeID) error
	CreateRoom(ctx context.Context, req *livekit.CreateRoomRequest, isExplicit bool) (*livekit.Room, *livekit.RoomInternal, bool, error)
	ValidateCreateRoom(ctx context.Context, roomName livekit.RoomName) error
}

//counterfeiter:generate . SIPStore
type SIPStore interface {
	StoreSIPTrunk(ctx context.Context, info *livekit.SIPTrunkInfo) error
	StoreSIPInboundTrunk(ctx context.Context, info *livekit.SIPInboundTrunkInfo) error
	StoreSIPOutboundTrunk(ctx context.Context, info *livekit.SIPOutboundTrunkInfo) error
	LoadSIPTrunk(ctx context.Context, sipTrunkID string) (*livekit.SIPTrunkInfo, error)
	LoadSIPInboundTrunk(ctx context.Context, sipTrunkID string) (*livekit.SIPInboundTrunkInfo, error)
	LoadSIPOutboundTrunk(ctx context.Context, sipTrunkID string) (*livekit.SIPOutboundTrunkInfo, error)
	ListSIPTrunk(ctx context.Context, opts *livekit.ListSIPTrunkRequest) (*livekit.ListSIPTrunkResponse, error)
	ListSIPInboundTrunk(ctx context.Context, opts *livekit.ListSIPInboundTrunkRequest) (*livekit.ListSIPInboundTrunkResponse, error)
	ListSIPOutboundTrunk(ctx context.Context, opts *livekit.ListSIPOutboundTrunkRequest) (*livekit.ListSIPOutboundTrunkResponse, error)
	DeleteSIPTrunk(ctx context.Context, sipTrunkID string) error

	StoreSIPDispatchRule(ctx context.Context, info *livekit.SIPDispatchRuleInfo) error
	LoadSIPDispatchRule(ctx context.Context, sipDispatchRuleID string) (*livekit.SIPDispatchRuleInfo, error)
	ListSIPDispatchRule(ctx context.Context, opts *livekit.ListSIPDispatchRuleRequest) (*livekit.ListSIPDispatchRuleResponse, error)
	DeleteSIPDispatchRule(ctx context.Context, sipDispatchRuleID string) error
}

// UserStore encapsulates CRUD operations for user accounts and room passwords
type UserStore interface {
	StoreUser(ctx context.Context, user *UserRecord) error
	LoadUser(ctx context.Context, username string) (*UserRecord, error)
	UserExists(ctx context.Context, username string) (bool, error)
	UpdateProfile(ctx context.Context, username string, displayName string, avatar string, ax, ay, as float64) error
	GetProfile(ctx context.Context, username string) (displayName, avatar string, ax, ay, as float64, err error)

	// Room password management
	StoreRoomPassword(ctx context.Context, roomName string, passwordHash string) error
	LoadRoomPassword(ctx context.Context, roomName string) (string, error)
	DeleteRoomPassword(ctx context.Context, roomName string) error
	RoomHasPassword(ctx context.Context, roomName string) (bool, error)

	// Chat message history
	StoreChatMessage(ctx context.Context, roomName string, msg *ChatMessage) error
	LoadChatMessages(ctx context.Context, roomName string, limit int) ([]*ChatMessage, error)

	// Lobby (waiting room)
	SetRoomLobby(ctx context.Context, roomName string, enabled bool) error
	IsRoomLobbyEnabled(ctx context.Context, roomName string) (bool, error)
	AddLobbyPending(ctx context.Context, roomName string, username string) error
	RemoveLobbyPending(ctx context.Context, roomName string, username string) error
	ListLobbyPending(ctx context.Context, roomName string) ([]string, error)
	SetLobbyDecision(ctx context.Context, roomName string, username string, approved bool) error
	GetLobbyDecision(ctx context.Context, roomName string, username string) (string, error) // "approved", "rejected", ""

	// File sharing
	StoreFileMetadata(ctx context.Context, file *FileMetadata) error
	LoadFileMetadata(ctx context.Context, fileID string) (*FileMetadata, error)
	ListRoomFiles(ctx context.Context, roomName string) ([]*FileMetadata, error)

	// Share links
	StoreShareLink(ctx context.Context, link *ShareLink) error
	LoadShareLink(ctx context.Context, code string) (*ShareLink, error)
	LoadShareLinkByRoom(ctx context.Context, roomName string) (*ShareLink, error)
	DeleteShareLink(ctx context.Context, code string) error
}

// ChatMessage represents a single chat message in a room
type ChatMessage struct {
	ID        string `json:"id"`
	RoomName  string `json:"room_name"`
	Sender    string `json:"sender"`
	Text      string `json:"text"`
	Timestamp int64  `json:"timestamp"`
	ReplyTo   string `json:"reply_to,omitempty"`   // ID of parent message
	ReplyText string `json:"reply_text,omitempty"` // preview snippet of parent
	FileID    string `json:"file_id,omitempty"`
	FileName  string `json:"file_name,omitempty"`
	FileSize  int64  `json:"file_size,omitempty"`
}

// UserRecord represents a registered user account
type UserRecord struct {
	Username     string `json:"username"`
	PasswordHash string `json:"password_hash"`
	CreatedAt    int64  `json:"created_at"`
	DisplayName  string `json:"display_name,omitempty"`
	Avatar       string `json:"avatar,omitempty"`       // e.g. "avt-03"
	AvatarX      float64 `json:"avatar_x,omitempty"`     // crop offset X (0-1)
	AvatarY      float64 `json:"avatar_y,omitempty"`     // crop offset Y (0-1)
	AvatarScale  float64 `json:"avatar_scale,omitempty"` // crop zoom (1-3)
}

// FileMetadata represents an uploaded file in a room
type FileMetadata struct {
	ID        string `json:"id"`
	RoomName  string `json:"room_name"`
	Sender    string `json:"sender"`
	FileName  string `json:"file_name"`
	FileSize  int64  `json:"file_size"`
	MimeType  string `json:"mime_type"`
	Timestamp int64  `json:"timestamp"`
}

// ShareLink represents a shareable invite link for a room
type ShareLink struct {
	Code      string `json:"code"`
	RoomName  string `json:"room_name"`
	CreatedBy string `json:"created_by"`
	CreatedAt int64  `json:"created_at"`
}

//counterfeiter:generate . AgentStore
type AgentStore interface {
	StoreAgentDispatch(ctx context.Context, dispatch *livekit.AgentDispatch) error
	DeleteAgentDispatch(ctx context.Context, dispatch *livekit.AgentDispatch) error
	ListAgentDispatches(ctx context.Context, roomName livekit.RoomName) ([]*livekit.AgentDispatch, error)

	StoreAgentJob(ctx context.Context, job *livekit.Job) error
	DeleteAgentJob(ctx context.Context, job *livekit.Job) error
}
