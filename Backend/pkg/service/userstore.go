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

// LocalUserStore implements UserStore backed by in-memory map (single-node only)
type LocalUserStore struct {
	users map[string]*UserRecord
	lock  sync.RWMutex
}

func NewLocalUserStore() *LocalUserStore {
	return &LocalUserStore{
		users: make(map[string]*UserRecord),
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
