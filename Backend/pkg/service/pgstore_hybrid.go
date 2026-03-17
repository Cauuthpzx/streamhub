package service

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// HybridUserStore delegates persistent data to PostgreSQL
// and ephemeral data (lobby, room passwords) to Redis.
type HybridUserStore struct {
	pg    *PgUserStore
	redis *RedisUserStore
}

func NewHybridUserStore(pool *pgxpool.Pool, rc redis.UniversalClient) *HybridUserStore {
	return &HybridUserStore{
		pg:    NewPgUserStore(pool),
		redis: NewRedisUserStore(rc),
	}
}

// ── User (PostgreSQL) ───────────────────────────────────────────────────────

func (h *HybridUserStore) StoreUser(ctx context.Context, user *UserRecord) error {
	return h.pg.StoreUser(ctx, user)
}

func (h *HybridUserStore) LoadUser(ctx context.Context, username string) (*UserRecord, error) {
	return h.pg.LoadUser(ctx, username)
}

func (h *HybridUserStore) UserExists(ctx context.Context, username string) (bool, error) {
	return h.pg.UserExists(ctx, username)
}

func (h *HybridUserStore) UpdateProfile(ctx context.Context, username, displayName, avatar string, ax, ay, as float64) error {
	return h.pg.UpdateProfile(ctx, username, displayName, avatar, ax, ay, as)
}

func (h *HybridUserStore) GetProfile(ctx context.Context, username string) (string, string, float64, float64, float64, error) {
	return h.pg.GetProfile(ctx, username)
}

// ── Chat (PostgreSQL) ───────────────────────────────────────────────────────

func (h *HybridUserStore) StoreChatMessage(ctx context.Context, roomName string, msg *ChatMessage) error {
	return h.pg.StoreChatMessage(ctx, roomName, msg)
}

func (h *HybridUserStore) LoadChatMessages(ctx context.Context, roomName string, limit int) ([]*ChatMessage, error) {
	return h.pg.LoadChatMessages(ctx, roomName, limit)
}

// ── Files (PostgreSQL) ──────────────────────────────────────────────────────

func (h *HybridUserStore) StoreFileMetadata(ctx context.Context, file *FileMetadata) error {
	return h.pg.StoreFileMetadata(ctx, file)
}

func (h *HybridUserStore) LoadFileMetadata(ctx context.Context, fileID string) (*FileMetadata, error) {
	return h.pg.LoadFileMetadata(ctx, fileID)
}

func (h *HybridUserStore) ListRoomFiles(ctx context.Context, roomName string) ([]*FileMetadata, error) {
	return h.pg.ListRoomFiles(ctx, roomName)
}

// ── Share Links (PostgreSQL) ────────────────────────────────────────────────

func (h *HybridUserStore) StoreShareLink(ctx context.Context, link *ShareLink) error {
	return h.pg.StoreShareLink(ctx, link)
}

func (h *HybridUserStore) LoadShareLink(ctx context.Context, code string) (*ShareLink, error) {
	return h.pg.LoadShareLink(ctx, code)
}

func (h *HybridUserStore) LoadShareLinkByRoom(ctx context.Context, roomName string) (*ShareLink, error) {
	return h.pg.LoadShareLinkByRoom(ctx, roomName)
}

func (h *HybridUserStore) DeleteShareLink(ctx context.Context, code string) error {
	return h.pg.DeleteShareLink(ctx, code)
}

// ── Room Passwords (Redis) ──────────────────────────────────────────────────

func (h *HybridUserStore) StoreRoomPassword(ctx context.Context, roomName, passwordHash string) error {
	return h.redis.StoreRoomPassword(ctx, roomName, passwordHash)
}

func (h *HybridUserStore) LoadRoomPassword(ctx context.Context, roomName string) (string, error) {
	return h.redis.LoadRoomPassword(ctx, roomName)
}

func (h *HybridUserStore) DeleteRoomPassword(ctx context.Context, roomName string) error {
	return h.redis.DeleteRoomPassword(ctx, roomName)
}

func (h *HybridUserStore) RoomHasPassword(ctx context.Context, roomName string) (bool, error) {
	return h.redis.RoomHasPassword(ctx, roomName)
}

// ── Lobby (Redis) ───────────────────────────────────────────────────────────

func (h *HybridUserStore) SetRoomLobby(ctx context.Context, roomName string, enabled bool) error {
	return h.redis.SetRoomLobby(ctx, roomName, enabled)
}

func (h *HybridUserStore) IsRoomLobbyEnabled(ctx context.Context, roomName string) (bool, error) {
	return h.redis.IsRoomLobbyEnabled(ctx, roomName)
}

func (h *HybridUserStore) AddLobbyPending(ctx context.Context, roomName, username string) error {
	return h.redis.AddLobbyPending(ctx, roomName, username)
}

func (h *HybridUserStore) RemoveLobbyPending(ctx context.Context, roomName, username string) error {
	return h.redis.RemoveLobbyPending(ctx, roomName, username)
}

func (h *HybridUserStore) ListLobbyPending(ctx context.Context, roomName string) ([]string, error) {
	return h.redis.ListLobbyPending(ctx, roomName)
}

func (h *HybridUserStore) SetLobbyDecision(ctx context.Context, roomName, username string, approved bool) error {
	return h.redis.SetLobbyDecision(ctx, roomName, username, approved)
}

func (h *HybridUserStore) GetLobbyDecision(ctx context.Context, roomName, username string) (string, error) {
	return h.redis.GetLobbyDecision(ctx, roomName, username)
}

// ── Persistent Rooms (PostgreSQL) ───────────────────────────────────────────

func (h *HybridUserStore) StoreRoom(ctx context.Context, room *RoomRecord) error {
	return h.pg.StoreRoom(ctx, room)
}

func (h *HybridUserStore) LoadRoom(ctx context.Context, roomName string) (*RoomRecord, error) {
	return h.pg.LoadRoom(ctx, roomName)
}

func (h *HybridUserStore) DeleteRoom(ctx context.Context, roomName string) error {
	return h.pg.DeleteRoom(ctx, roomName)
}

func (h *HybridUserStore) ListAllRooms(ctx context.Context) ([]*RoomRecord, error) {
	return h.pg.ListAllRooms(ctx)
}

func (h *HybridUserStore) ListUserRooms(ctx context.Context, username string) ([]*RoomRecord, error) {
	return h.pg.ListUserRooms(ctx, username)
}

func (h *HybridUserStore) AddRoomMember(ctx context.Context, roomName, username, role string) error {
	return h.pg.AddRoomMember(ctx, roomName, username, role)
}

func (h *HybridUserStore) RemoveRoomMember(ctx context.Context, roomName, username string) error {
	return h.pg.RemoveRoomMember(ctx, roomName, username)
}

func (h *HybridUserStore) ListRoomMembers(ctx context.Context, roomName string) ([]*RoomMember, error) {
	return h.pg.ListRoomMembers(ctx, roomName)
}

func (h *HybridUserStore) IsRoomMember(ctx context.Context, roomName, username string) (bool, error) {
	return h.pg.IsRoomMember(ctx, roomName, username)
}
