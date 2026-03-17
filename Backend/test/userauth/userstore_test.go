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

package userauth_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/livekit/livekit-server/pkg/service"
)

func TestLocalUserStore_StoreAndLoad(t *testing.T) {
	store := service.NewLocalUserStore()
	ctx := context.Background()

	user := &service.UserRecord{
		Username:     "storeuser",
		PasswordHash: "$2a$10$fakehash",
		CreatedAt:    time.Now().Unix(),
	}

	err := store.StoreUser(ctx, user)
	require.NoError(t, err)

	loaded, err := store.LoadUser(ctx, "storeuser")
	require.NoError(t, err)
	require.Equal(t, user.Username, loaded.Username)
	require.Equal(t, user.PasswordHash, loaded.PasswordHash)
	require.Equal(t, user.CreatedAt, loaded.CreatedAt)
}

func TestLocalUserStore_LoadNotFound(t *testing.T) {
	store := service.NewLocalUserStore()
	ctx := context.Background()

	_, err := store.LoadUser(ctx, "nonexistent")
	require.Error(t, err)
}

func TestLocalUserStore_UserExists(t *testing.T) {
	store := service.NewLocalUserStore()
	ctx := context.Background()

	exists, err := store.UserExists(ctx, "nobody")
	require.NoError(t, err)
	require.False(t, exists)

	err = store.StoreUser(ctx, &service.UserRecord{
		Username:     "somebody",
		PasswordHash: "$2a$10$fakehash",
		CreatedAt:    time.Now().Unix(),
	})
	require.NoError(t, err)

	exists, err = store.UserExists(ctx, "somebody")
	require.NoError(t, err)
	require.True(t, exists)
}

func TestLocalUserStore_OverwriteUser(t *testing.T) {
	store := service.NewLocalUserStore()
	ctx := context.Background()

	err := store.StoreUser(ctx, &service.UserRecord{
		Username:     "user1",
		PasswordHash: "hash1",
		CreatedAt:    1000,
	})
	require.NoError(t, err)

	// overwrite
	err = store.StoreUser(ctx, &service.UserRecord{
		Username:     "user1",
		PasswordHash: "hash2",
		CreatedAt:    2000,
	})
	require.NoError(t, err)

	loaded, err := store.LoadUser(ctx, "user1")
	require.NoError(t, err)
	require.Equal(t, "hash2", loaded.PasswordHash)
	require.Equal(t, int64(2000), loaded.CreatedAt)
}

func TestLocalUserStore_MultipleUsers(t *testing.T) {
	store := service.NewLocalUserStore()
	ctx := context.Background()

	users := []string{"alice", "bob", "charlie"}
	for _, u := range users {
		err := store.StoreUser(ctx, &service.UserRecord{
			Username:     u,
			PasswordHash: "hash_" + u,
			CreatedAt:    time.Now().Unix(),
		})
		require.NoError(t, err)
	}

	for _, u := range users {
		exists, err := store.UserExists(ctx, u)
		require.NoError(t, err)
		require.True(t, exists)

		loaded, err := store.LoadUser(ctx, u)
		require.NoError(t, err)
		require.Equal(t, "hash_"+u, loaded.PasswordHash)
	}

	exists, err := store.UserExists(ctx, "dave")
	require.NoError(t, err)
	require.False(t, exists)
}
