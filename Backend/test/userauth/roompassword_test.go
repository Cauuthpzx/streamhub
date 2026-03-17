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
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"

	"github.com/livekit/livekit-server/pkg/service"
)

// ============================
// Room Password Store Tests
// ============================

func TestLocalUserStore_RoomPassword_StoreAndLoad(t *testing.T) {
	store := service.NewLocalUserStore()
	ctx := context.Background()

	hash, err := bcrypt.GenerateFromPassword([]byte("secret123"), bcrypt.DefaultCost)
	require.NoError(t, err)

	err = store.StoreRoomPassword(ctx, "my-room", string(hash))
	require.NoError(t, err)

	loaded, err := store.LoadRoomPassword(ctx, "my-room")
	require.NoError(t, err)
	require.Equal(t, string(hash), loaded)

	err = bcrypt.CompareHashAndPassword([]byte(loaded), []byte("secret123"))
	require.NoError(t, err)
}

func TestLocalUserStore_RoomPassword_NotFound(t *testing.T) {
	store := service.NewLocalUserStore()
	ctx := context.Background()

	_, err := store.LoadRoomPassword(ctx, "nonexistent")
	require.Error(t, err)
}

func TestLocalUserStore_RoomPassword_HasPassword(t *testing.T) {
	store := service.NewLocalUserStore()
	ctx := context.Background()

	has, err := store.RoomHasPassword(ctx, "open-room")
	require.NoError(t, err)
	require.False(t, has)

	err = store.StoreRoomPassword(ctx, "locked-room", "hash")
	require.NoError(t, err)

	has, err = store.RoomHasPassword(ctx, "locked-room")
	require.NoError(t, err)
	require.True(t, has)
}

func TestLocalUserStore_RoomPassword_Delete(t *testing.T) {
	store := service.NewLocalUserStore()
	ctx := context.Background()

	err := store.StoreRoomPassword(ctx, "temp-room", "hash")
	require.NoError(t, err)

	has, err := store.RoomHasPassword(ctx, "temp-room")
	require.NoError(t, err)
	require.True(t, has)

	err = store.DeleteRoomPassword(ctx, "temp-room")
	require.NoError(t, err)

	has, err = store.RoomHasPassword(ctx, "temp-room")
	require.NoError(t, err)
	require.False(t, has)
}

// ============================
// Token with Room Password Tests
// ============================

func registerAndLogin(mux http.Handler, username, password string) string {
	doPost(mux, "/auth/register", map[string]string{
		"username": username,
		"password": password,
	})
	loginW := doPost(mux, "/auth/login", map[string]string{
		"username": username,
		"password": password,
	})
	return parseJSON(loginW)["token"].(string)
}

func TestToken_OpenRoom_NoPasswordRequired(t *testing.T) {
	svc := newTestServiceWithKeys()
	mux := setupMux(svc)

	token := registerAndLogin(mux, "user_open", "password123")

	// open room (no password stored) — should succeed without password
	w := doPost(mux, "/auth/token",
		map[string]string{"room": "open-room"},
		"Authorization", "Bearer "+token,
	)
	require.Equal(t, http.StatusOK, w.Code)
	resp := parseJSON(w)
	require.NotEmpty(t, resp["access_token"])
}

func TestToken_ProtectedRoom_CorrectPassword(t *testing.T) {
	conf := newTestConfig()
	store := service.NewLocalUserStore()
	keyProvider := newTestKeyProvider(conf)
	svc := service.NewUserAuthService(conf, store, keyProvider, nil)
	mux := setupMux(svc)

	token := registerAndLogin(mux, "user_protected", "password123")

	// store room password
	hash, _ := bcrypt.GenerateFromPassword([]byte("room_secret"), bcrypt.DefaultCost)
	store.StoreRoomPassword(context.Background(), "secret-room", string(hash))

	// try with correct password
	w := doPost(mux, "/auth/token",
		map[string]any{"room": "secret-room", "password": "room_secret"},
		"Authorization", "Bearer "+token,
	)
	require.Equal(t, http.StatusOK, w.Code)
	resp := parseJSON(w)
	require.NotEmpty(t, resp["access_token"])
}

func TestToken_ProtectedRoom_WrongPassword(t *testing.T) {
	conf := newTestConfig()
	store := service.NewLocalUserStore()
	keyProvider := newTestKeyProvider(conf)
	svc := service.NewUserAuthService(conf, store, keyProvider, nil)
	mux := setupMux(svc)

	token := registerAndLogin(mux, "user_wrong", "password123")

	hash, _ := bcrypt.GenerateFromPassword([]byte("room_secret"), bcrypt.DefaultCost)
	store.StoreRoomPassword(context.Background(), "secret-room2", string(hash))

	// wrong password
	w := doPost(mux, "/auth/token",
		map[string]any{"room": "secret-room2", "password": "wrong_password"},
		"Authorization", "Bearer "+token,
	)
	require.Equal(t, http.StatusUnauthorized, w.Code)
	resp := parseJSON(w)
	require.Contains(t, resp["error"], "incorrect")
}

func TestToken_ProtectedRoom_MissingPassword(t *testing.T) {
	conf := newTestConfig()
	store := service.NewLocalUserStore()
	keyProvider := newTestKeyProvider(conf)
	svc := service.NewUserAuthService(conf, store, keyProvider, nil)
	mux := setupMux(svc)

	token := registerAndLogin(mux, "user_missing", "password123")

	hash, _ := bcrypt.GenerateFromPassword([]byte("room_secret"), bcrypt.DefaultCost)
	store.StoreRoomPassword(context.Background(), "secret-room3", string(hash))

	// no password provided
	w := doPost(mux, "/auth/token",
		map[string]string{"room": "secret-room3"},
		"Authorization", "Bearer "+token,
	)
	require.Equal(t, http.StatusUnauthorized, w.Code)
	resp := parseJSON(w)
	require.Contains(t, resp["error"], "required")
}
