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
	"context"
	"encoding/json"
	"sync"

	"github.com/redis/go-redis/v9"
)

const (
	// UsersKey is a hash of username => UserRecord JSON
	UsersKey = "users"
	// RoomPasswordsKey is a hash of roomName => password hash
	RoomPasswordsKey = "room_passwords"
	// RoomChatPrefix is the prefix for room chat message lists
	RoomChatPrefix = "room_chat:"
	// MaxChatHistory is the max number of messages to keep per room
	MaxChatHistory = 200
	// RoomLobbyKey is a hash of roomName => "1" (lobby enabled)
	RoomLobbyKey = "room_lobbies"
	// RoomLobbyPendingPrefix is a set of pending usernames per room
	RoomLobbyPendingPrefix = "room_lobby_pending:"
	// RoomLobbyDecisionPrefix is a hash of username => "approved"/"rejected"
	RoomLobbyDecisionPrefix = "room_lobby_decision:"
)

// RedisUserStore implements UserStore backed by Redis
type RedisUserStore struct {
	rc redis.UniversalClient
}

func NewRedisUserStore(rc redis.UniversalClient) *RedisUserStore {
	return &RedisUserStore{rc: rc}
}

func (s *RedisUserStore) StoreUser(ctx context.Context, user *UserRecord) error {
	data, err := json.Marshal(user)
	if err != nil {
		return err
	}
	return s.rc.HSet(ctx, UsersKey, user.Username, string(data)).Err()
}

func (s *RedisUserStore) LoadUser(ctx context.Context, username string) (*UserRecord, error) {
	data, err := s.rc.HGet(ctx, UsersKey, username).Result()
	if err == redis.Nil {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}

	var user UserRecord
	if err := json.Unmarshal([]byte(data), &user); err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *RedisUserStore) UserExists(ctx context.Context, username string) (bool, error) {
	return s.rc.HExists(ctx, UsersKey, username).Result()
}

func (s *RedisUserStore) StoreRoomPassword(ctx context.Context, roomName string, passwordHash string) error {
	return s.rc.HSet(ctx, RoomPasswordsKey, roomName, passwordHash).Err()
}

func (s *RedisUserStore) LoadRoomPassword(ctx context.Context, roomName string) (string, error) {
	data, err := s.rc.HGet(ctx, RoomPasswordsKey, roomName).Result()
	if err == redis.Nil {
		return "", ErrRoomNotFound
	}
	if err != nil {
		return "", err
	}
	return data, nil
}

func (s *RedisUserStore) DeleteRoomPassword(ctx context.Context, roomName string) error {
	return s.rc.HDel(ctx, RoomPasswordsKey, roomName).Err()
}

func (s *RedisUserStore) RoomHasPassword(ctx context.Context, roomName string) (bool, error) {
	return s.rc.HExists(ctx, RoomPasswordsKey, roomName).Result()
}

func (s *RedisUserStore) StoreChatMessage(ctx context.Context, roomName string, msg *ChatMessage) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	key := RoomChatPrefix + roomName
	pipe := s.rc.Pipeline()
	pipe.RPush(ctx, key, string(data))
	pipe.LTrim(ctx, key, -MaxChatHistory, -1)
	_, err = pipe.Exec(ctx)
	return err
}

func (s *RedisUserStore) LoadChatMessages(ctx context.Context, roomName string, limit int) ([]*ChatMessage, error) {
	key := RoomChatPrefix + roomName
	if limit <= 0 || limit > MaxChatHistory {
		limit = MaxChatHistory
	}
	results, err := s.rc.LRange(ctx, key, int64(-limit), -1).Result()
	if err != nil {
		return nil, err
	}
	messages := make([]*ChatMessage, 0, len(results))
	for _, data := range results {
		var msg ChatMessage
		if err := json.Unmarshal([]byte(data), &msg); err != nil {
			continue
		}
		messages = append(messages, &msg)
	}
	return messages, nil
}

func (s *RedisUserStore) SetRoomLobby(ctx context.Context, roomName string, enabled bool) error {
	if enabled {
		return s.rc.HSet(ctx, RoomLobbyKey, roomName, "1").Err()
	}
	return s.rc.HDel(ctx, RoomLobbyKey, roomName).Err()
}

func (s *RedisUserStore) IsRoomLobbyEnabled(ctx context.Context, roomName string) (bool, error) {
	return s.rc.HExists(ctx, RoomLobbyKey, roomName).Result()
}

func (s *RedisUserStore) AddLobbyPending(ctx context.Context, roomName string, username string) error {
	return s.rc.SAdd(ctx, RoomLobbyPendingPrefix+roomName, username).Err()
}

func (s *RedisUserStore) RemoveLobbyPending(ctx context.Context, roomName string, username string) error {
	return s.rc.SRem(ctx, RoomLobbyPendingPrefix+roomName, username).Err()
}

func (s *RedisUserStore) ListLobbyPending(ctx context.Context, roomName string) ([]string, error) {
	return s.rc.SMembers(ctx, RoomLobbyPendingPrefix+roomName).Result()
}

func (s *RedisUserStore) SetLobbyDecision(ctx context.Context, roomName string, username string, approved bool) error {
	key := RoomLobbyDecisionPrefix + roomName
	val := "rejected"
	if approved {
		val = "approved"
	}
	// remove from pending
	s.rc.SRem(ctx, RoomLobbyPendingPrefix+roomName, username)
	return s.rc.HSet(ctx, key, username, val).Err()
}

func (s *RedisUserStore) GetLobbyDecision(ctx context.Context, roomName string, username string) (string, error) {
	data, err := s.rc.HGet(ctx, RoomLobbyDecisionPrefix+roomName, username).Result()
	if err == redis.Nil {
		return "", nil
	}
	return data, err
}

// LocalUserStore implements UserStore backed by in-memory map (single-node only)
type LocalUserStore struct {
	users          map[string]*UserRecord
	roomPasswords  map[string]string
	chatMessages   map[string][]*ChatMessage
	lobbyEnabled   map[string]bool
	lobbyPending   map[string]map[string]bool
	lobbyDecisions map[string]map[string]string
	lock           sync.RWMutex
}

func NewLocalUserStore() *LocalUserStore {
	return &LocalUserStore{
		users:          make(map[string]*UserRecord),
		roomPasswords:  make(map[string]string),
		chatMessages:   make(map[string][]*ChatMessage),
		lobbyEnabled:   make(map[string]bool),
		lobbyPending:   make(map[string]map[string]bool),
		lobbyDecisions: make(map[string]map[string]string),
	}
}

func (s *LocalUserStore) StoreUser(_ context.Context, user *UserRecord) error {
	s.lock.Lock()
	defer s.lock.Unlock()
	s.users[user.Username] = user
	return nil
}

func (s *LocalUserStore) LoadUser(_ context.Context, username string) (*UserRecord, error) {
	s.lock.RLock()
	defer s.lock.RUnlock()
	user, ok := s.users[username]
	if !ok {
		return nil, ErrUserNotFound
	}
	return user, nil
}

func (s *LocalUserStore) UserExists(_ context.Context, username string) (bool, error) {
	s.lock.RLock()
	defer s.lock.RUnlock()
	_, ok := s.users[username]
	return ok, nil
}

func (s *LocalUserStore) StoreRoomPassword(_ context.Context, roomName string, passwordHash string) error {
	s.lock.Lock()
	defer s.lock.Unlock()
	s.roomPasswords[roomName] = passwordHash
	return nil
}

func (s *LocalUserStore) LoadRoomPassword(_ context.Context, roomName string) (string, error) {
	s.lock.RLock()
	defer s.lock.RUnlock()
	hash, ok := s.roomPasswords[roomName]
	if !ok {
		return "", ErrRoomNotFound
	}
	return hash, nil
}

func (s *LocalUserStore) DeleteRoomPassword(_ context.Context, roomName string) error {
	s.lock.Lock()
	defer s.lock.Unlock()
	delete(s.roomPasswords, roomName)
	return nil
}

func (s *LocalUserStore) RoomHasPassword(_ context.Context, roomName string) (bool, error) {
	s.lock.RLock()
	defer s.lock.RUnlock()
	_, ok := s.roomPasswords[roomName]
	return ok, nil
}

func (s *LocalUserStore) StoreChatMessage(_ context.Context, roomName string, msg *ChatMessage) error {
	s.lock.Lock()
	defer s.lock.Unlock()
	s.chatMessages[roomName] = append(s.chatMessages[roomName], msg)
	if len(s.chatMessages[roomName]) > MaxChatHistory {
		s.chatMessages[roomName] = s.chatMessages[roomName][len(s.chatMessages[roomName])-MaxChatHistory:]
	}
	return nil
}

func (s *LocalUserStore) LoadChatMessages(_ context.Context, roomName string, limit int) ([]*ChatMessage, error) {
	s.lock.RLock()
	defer s.lock.RUnlock()
	msgs := s.chatMessages[roomName]
	if limit <= 0 || limit > len(msgs) {
		limit = len(msgs)
	}
	if limit == 0 {
		return []*ChatMessage{}, nil
	}
	start := len(msgs) - limit
	result := make([]*ChatMessage, limit)
	copy(result, msgs[start:])
	return result, nil
}

func (s *LocalUserStore) SetRoomLobby(_ context.Context, roomName string, enabled bool) error {
	s.lock.Lock()
	defer s.lock.Unlock()
	if enabled {
		s.lobbyEnabled[roomName] = true
	} else {
		delete(s.lobbyEnabled, roomName)
	}
	return nil
}

func (s *LocalUserStore) IsRoomLobbyEnabled(_ context.Context, roomName string) (bool, error) {
	s.lock.RLock()
	defer s.lock.RUnlock()
	return s.lobbyEnabled[roomName], nil
}

func (s *LocalUserStore) AddLobbyPending(_ context.Context, roomName string, username string) error {
	s.lock.Lock()
	defer s.lock.Unlock()
	if s.lobbyPending[roomName] == nil {
		s.lobbyPending[roomName] = make(map[string]bool)
	}
	s.lobbyPending[roomName][username] = true
	return nil
}

func (s *LocalUserStore) RemoveLobbyPending(_ context.Context, roomName string, username string) error {
	s.lock.Lock()
	defer s.lock.Unlock()
	delete(s.lobbyPending[roomName], username)
	return nil
}

func (s *LocalUserStore) ListLobbyPending(_ context.Context, roomName string) ([]string, error) {
	s.lock.RLock()
	defer s.lock.RUnlock()
	pending := s.lobbyPending[roomName]
	result := make([]string, 0, len(pending))
	for u := range pending {
		result = append(result, u)
	}
	return result, nil
}

func (s *LocalUserStore) SetLobbyDecision(_ context.Context, roomName string, username string, approved bool) error {
	s.lock.Lock()
	defer s.lock.Unlock()
	// remove from pending
	delete(s.lobbyPending[roomName], username)
	if s.lobbyDecisions[roomName] == nil {
		s.lobbyDecisions[roomName] = make(map[string]string)
	}
	if approved {
		s.lobbyDecisions[roomName][username] = "approved"
	} else {
		s.lobbyDecisions[roomName][username] = "rejected"
	}
	return nil
}

func (s *LocalUserStore) GetLobbyDecision(_ context.Context, roomName string, username string) (string, error) {
	s.lock.RLock()
	defer s.lock.RUnlock()
	return s.lobbyDecisions[roomName][username], nil
}
