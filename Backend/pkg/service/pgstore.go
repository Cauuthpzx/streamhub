package service

import (
	"context"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PgUserStore implements UserStore backed by PostgreSQL for persistent data
// and in-memory maps for ephemeral data (lobby, room passwords).
type PgUserStore struct {
	pool *pgxpool.Pool

	// ephemeral in-memory state (lobby + room passwords)
	mu            sync.RWMutex
	roomPasswords map[string]string
	lobbies       map[string]bool
	lobbyPending  map[string][]string
	lobbyDecision map[string]map[string]string
}

func NewPgUserStore(pool *pgxpool.Pool) *PgUserStore {
	return &PgUserStore{
		pool:          pool,
		roomPasswords: make(map[string]string),
		lobbies:       make(map[string]bool),
		lobbyPending:  make(map[string][]string),
		lobbyDecision: make(map[string]map[string]string),
	}
}

// ── User CRUD ───────────────────────────────────────────────────────────────

func (s *PgUserStore) StoreUser(ctx context.Context, user *UserRecord) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO users (username, password_hash, display_name, avatar, avatar_x, avatar_y, avatar_scale, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		ON CONFLICT (username) DO UPDATE SET
			password_hash=EXCLUDED.password_hash,
			display_name=EXCLUDED.display_name,
			avatar=EXCLUDED.avatar,
			avatar_x=EXCLUDED.avatar_x,
			avatar_y=EXCLUDED.avatar_y,
			avatar_scale=EXCLUDED.avatar_scale`,
		user.Username, user.PasswordHash, user.DisplayName, user.Avatar,
		user.AvatarX, user.AvatarY, user.AvatarScale, user.CreatedAt)
	return err
}

func (s *PgUserStore) LoadUser(ctx context.Context, username string) (*UserRecord, error) {
	u := &UserRecord{}
	err := s.pool.QueryRow(ctx, `
		SELECT username, password_hash, display_name, avatar, avatar_x, avatar_y, avatar_scale, created_at
		FROM users WHERE username=$1`, username).
		Scan(&u.Username, &u.PasswordHash, &u.DisplayName, &u.Avatar,
			&u.AvatarX, &u.AvatarY, &u.AvatarScale, &u.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, ErrUserNotFound
	}
	return u, err
}

func (s *PgUserStore) UserExists(ctx context.Context, username string) (bool, error) {
	var exists bool
	err := s.pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE username=$1)", username).Scan(&exists)
	return exists, err
}

func (s *PgUserStore) UpdateProfile(ctx context.Context, username string, displayName, avatar string, ax, ay, as float64) error {
	tag, err := s.pool.Exec(ctx, `
		UPDATE users SET display_name=$2, avatar=$3, avatar_x=$4, avatar_y=$5, avatar_scale=$6
		WHERE username=$1`, username, displayName, avatar, ax, ay, as)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

func (s *PgUserStore) GetProfile(ctx context.Context, username string) (string, string, float64, float64, float64, error) {
	var dn, av string
	var ax, ay, as float64
	err := s.pool.QueryRow(ctx, `
		SELECT display_name, avatar, avatar_x, avatar_y, avatar_scale
		FROM users WHERE username=$1`, username).Scan(&dn, &av, &ax, &ay, &as)
	if err == pgx.ErrNoRows {
		return "", "", 0, 0, 0, ErrUserNotFound
	}
	return dn, av, ax, ay, as, err
}

// ── Chat Messages ───────────────────────────────────────────────────────────

func (s *PgUserStore) StoreChatMessage(ctx context.Context, roomName string, msg *ChatMessage) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO chat_messages (id, room_name, sender, text, timestamp, reply_to, reply_text, file_id, file_name, file_size)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		msg.ID, roomName, msg.Sender, msg.Text, msg.Timestamp,
		msg.ReplyTo, msg.ReplyText, msg.FileID, msg.FileName, msg.FileSize)
	return err
}

func (s *PgUserStore) LoadChatMessages(ctx context.Context, roomName string, limit int) ([]*ChatMessage, error) {
	if limit <= 0 {
		limit = 200
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id, room_name, sender, text, timestamp, reply_to, reply_text, file_id, file_name, file_size
		FROM chat_messages WHERE room_name=$1 ORDER BY timestamp DESC LIMIT $2`, roomName, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []*ChatMessage
	for rows.Next() {
		m := &ChatMessage{}
		if err := rows.Scan(&m.ID, &m.RoomName, &m.Sender, &m.Text, &m.Timestamp,
			&m.ReplyTo, &m.ReplyText, &m.FileID, &m.FileName, &m.FileSize); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	// reverse to chronological order
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	return msgs, nil
}

// ── File Metadata ───────────────────────────────────────────────────────────

func (s *PgUserStore) StoreFileMetadata(ctx context.Context, file *FileMetadata) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO file_metadata (id, room_name, sender, file_name, file_size, mime_type, timestamp)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		file.ID, file.RoomName, file.Sender, file.FileName, file.FileSize, file.MimeType, file.Timestamp)
	return err
}

func (s *PgUserStore) LoadFileMetadata(ctx context.Context, fileID string) (*FileMetadata, error) {
	f := &FileMetadata{}
	err := s.pool.QueryRow(ctx, `
		SELECT id, room_name, sender, file_name, file_size, mime_type, timestamp
		FROM file_metadata WHERE id=$1`, fileID).
		Scan(&f.ID, &f.RoomName, &f.Sender, &f.FileName, &f.FileSize, &f.MimeType, &f.Timestamp)
	if err == pgx.ErrNoRows {
		return nil, ErrFileNotFound
	}
	return f, err
}

func (s *PgUserStore) ListRoomFiles(ctx context.Context, roomName string) ([]*FileMetadata, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, room_name, sender, file_name, file_size, mime_type, timestamp
		FROM file_metadata WHERE room_name=$1 ORDER BY timestamp DESC LIMIT 100`, roomName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []*FileMetadata
	for rows.Next() {
		f := &FileMetadata{}
		if err := rows.Scan(&f.ID, &f.RoomName, &f.Sender, &f.FileName, &f.FileSize, &f.MimeType, &f.Timestamp); err != nil {
			return nil, err
		}
		files = append(files, f)
	}
	return files, nil
}

// ── Share Links ─────────────────────────────────────────────────────────────

func (s *PgUserStore) StoreShareLink(ctx context.Context, link *ShareLink) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO share_links (code, room_name, created_by, created_at)
		VALUES ($1,$2,$3,$4)
		ON CONFLICT (room_name) DO UPDATE SET code=EXCLUDED.code, created_by=EXCLUDED.created_by, created_at=EXCLUDED.created_at`,
		link.Code, link.RoomName, link.CreatedBy, link.CreatedAt)
	return err
}

func (s *PgUserStore) LoadShareLink(ctx context.Context, code string) (*ShareLink, error) {
	l := &ShareLink{}
	err := s.pool.QueryRow(ctx, `
		SELECT code, room_name, created_by, created_at FROM share_links WHERE code=$1`, code).
		Scan(&l.Code, &l.RoomName, &l.CreatedBy, &l.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, ErrShareLinkNotFound
	}
	return l, err
}

func (s *PgUserStore) LoadShareLinkByRoom(ctx context.Context, roomName string) (*ShareLink, error) {
	l := &ShareLink{}
	err := s.pool.QueryRow(ctx, `
		SELECT code, room_name, created_by, created_at FROM share_links WHERE room_name=$1`, roomName).
		Scan(&l.Code, &l.RoomName, &l.CreatedBy, &l.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, ErrShareLinkNotFound
	}
	return l, err
}

func (s *PgUserStore) DeleteShareLink(ctx context.Context, code string) error {
	_, err := s.pool.Exec(ctx, "DELETE FROM share_links WHERE code=$1", code)
	return err
}

// ── Room Passwords (ephemeral, in-memory) ───────────────────────────────────

func (s *PgUserStore) StoreRoomPassword(_ context.Context, roomName string, passwordHash string) error {
	s.mu.Lock()
	s.roomPasswords[roomName] = passwordHash
	s.mu.Unlock()
	return nil
}

func (s *PgUserStore) LoadRoomPassword(_ context.Context, roomName string) (string, error) {
	s.mu.RLock()
	pw, ok := s.roomPasswords[roomName]
	s.mu.RUnlock()
	if !ok {
		return "", ErrRoomNotFound
	}
	return pw, nil
}

func (s *PgUserStore) DeleteRoomPassword(_ context.Context, roomName string) error {
	s.mu.Lock()
	delete(s.roomPasswords, roomName)
	s.mu.Unlock()
	return nil
}

func (s *PgUserStore) RoomHasPassword(_ context.Context, roomName string) (bool, error) {
	s.mu.RLock()
	_, ok := s.roomPasswords[roomName]
	s.mu.RUnlock()
	return ok, nil
}

// ── Lobby (ephemeral, in-memory) ────────────────────────────────────────────

func (s *PgUserStore) SetRoomLobby(_ context.Context, roomName string, enabled bool) error {
	s.mu.Lock()
	s.lobbies[roomName] = enabled
	s.mu.Unlock()
	return nil
}

func (s *PgUserStore) IsRoomLobbyEnabled(_ context.Context, roomName string) (bool, error) {
	s.mu.RLock()
	v := s.lobbies[roomName]
	s.mu.RUnlock()
	return v, nil
}

func (s *PgUserStore) AddLobbyPending(_ context.Context, roomName string, username string) error {
	s.mu.Lock()
	s.lobbyPending[roomName] = append(s.lobbyPending[roomName], username)
	s.mu.Unlock()
	return nil
}

func (s *PgUserStore) RemoveLobbyPending(_ context.Context, roomName string, username string) error {
	s.mu.Lock()
	list := s.lobbyPending[roomName]
	for i, u := range list {
		if u == username {
			s.lobbyPending[roomName] = append(list[:i], list[i+1:]...)
			break
		}
	}
	s.mu.Unlock()
	return nil
}

func (s *PgUserStore) ListLobbyPending(_ context.Context, roomName string) ([]string, error) {
	s.mu.RLock()
	cp := make([]string, len(s.lobbyPending[roomName]))
	copy(cp, s.lobbyPending[roomName])
	s.mu.RUnlock()
	return cp, nil
}

func (s *PgUserStore) SetLobbyDecision(_ context.Context, roomName string, username string, approved bool) error {
	s.mu.Lock()
	if s.lobbyDecision[roomName] == nil {
		s.lobbyDecision[roomName] = make(map[string]string)
	}
	if approved {
		s.lobbyDecision[roomName][username] = "approved"
	} else {
		s.lobbyDecision[roomName][username] = "rejected"
	}
	s.mu.Unlock()
	return nil
}

func (s *PgUserStore) GetLobbyDecision(_ context.Context, roomName string, username string) (string, error) {
	s.mu.RLock()
	v := ""
	if m, ok := s.lobbyDecision[roomName]; ok {
		v = m[username]
	}
	s.mu.RUnlock()
	return v, nil
}

// ── Persistent Rooms (PostgreSQL) ───────────────────────────────────────────

func (s *PgUserStore) StoreRoom(ctx context.Context, room *RoomRecord) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO rooms (name, creator, password_hash, lobby_enabled, max_participants, description, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		ON CONFLICT (name) DO UPDATE SET
			password_hash=EXCLUDED.password_hash, lobby_enabled=EXCLUDED.lobby_enabled,
			max_participants=EXCLUDED.max_participants, description=EXCLUDED.description,
			status=EXCLUDED.status, updated_at=EXCLUDED.updated_at`,
		room.Name, room.Creator, room.PasswordHash, room.LobbyEnabled,
		room.MaxParticipants, room.Description, room.Status, room.CreatedAt, room.UpdatedAt)
	return err
}

func (s *PgUserStore) LoadRoom(ctx context.Context, roomName string) (*RoomRecord, error) {
	r := &RoomRecord{}
	err := s.pool.QueryRow(ctx, `
		SELECT name, creator, password_hash, lobby_enabled, max_participants, description, status, created_at, updated_at
		FROM rooms WHERE name=$1`, roomName).
		Scan(&r.Name, &r.Creator, &r.PasswordHash, &r.LobbyEnabled,
			&r.MaxParticipants, &r.Description, &r.Status, &r.CreatedAt, &r.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, ErrRoomNotFound
	}
	return r, err
}

func (s *PgUserStore) DeleteRoom(ctx context.Context, roomName string) error {
	_, err := s.pool.Exec(ctx, "DELETE FROM rooms WHERE name=$1", roomName)
	return err
}

func (s *PgUserStore) ListUserRooms(ctx context.Context, username string) ([]*RoomRecord, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT r.name, r.creator, r.password_hash, r.lobby_enabled, r.max_participants, r.description, r.status, r.created_at, r.updated_at
		FROM rooms r
		INNER JOIN room_members rm ON r.name = rm.room_name
		WHERE rm.username=$1 AND r.status='active'
		ORDER BY r.created_at DESC`, username)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*RoomRecord
	for rows.Next() {
		r := &RoomRecord{}
		if err := rows.Scan(&r.Name, &r.Creator, &r.PasswordHash, &r.LobbyEnabled,
			&r.MaxParticipants, &r.Description, &r.Status, &r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	return list, nil
}

// ── Room Members (PostgreSQL) ───────────────────────────────────────────────

func (s *PgUserStore) AddRoomMember(ctx context.Context, roomName, username, role string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO room_members (room_name, username, role, joined_at)
		VALUES ($1,$2,$3,$4)
		ON CONFLICT (room_name, username) DO NOTHING`,
		roomName, username, role, now())
	return err
}

func (s *PgUserStore) RemoveRoomMember(ctx context.Context, roomName, username string) error {
	_, err := s.pool.Exec(ctx, "DELETE FROM room_members WHERE room_name=$1 AND username=$2", roomName, username)
	return err
}

func (s *PgUserStore) ListRoomMembers(ctx context.Context, roomName string) ([]*RoomMember, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT room_name, username, role, joined_at
		FROM room_members WHERE room_name=$1 ORDER BY joined_at`, roomName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*RoomMember
	for rows.Next() {
		m := &RoomMember{}
		if err := rows.Scan(&m.RoomName, &m.Username, &m.Role, &m.JoinedAt); err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	return list, nil
}

func (s *PgUserStore) IsRoomMember(ctx context.Context, roomName, username string) (bool, error) {
	var exists bool
	err := s.pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM room_members WHERE room_name=$1 AND username=$2)", roomName, username).Scan(&exists)
	return exists, err
}

func now() int64 { return time.Now().Unix() }

