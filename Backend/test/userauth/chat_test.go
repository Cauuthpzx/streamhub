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
	"fmt"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/livekit/livekit-server/pkg/service"
)

// ============================
// Chat Store Tests
// ============================

func TestLocalUserStore_Chat_StoreAndLoad(t *testing.T) {
	store := service.NewLocalUserStore()
	ctx := context.Background()

	msg := &service.ChatMessage{
		ID:        "msg-1",
		RoomName:  "room1",
		Sender:    "alice",
		Text:      "hello",
		Timestamp: 1000,
	}

	err := store.StoreChatMessage(ctx, "room1", msg)
	require.NoError(t, err)

	messages, err := store.LoadChatMessages(ctx, "room1", 100)
	require.NoError(t, err)
	require.Len(t, messages, 1)
	require.Equal(t, "alice", messages[0].Sender)
	require.Equal(t, "hello", messages[0].Text)
}

func TestLocalUserStore_Chat_EmptyRoom(t *testing.T) {
	store := service.NewLocalUserStore()
	ctx := context.Background()

	messages, err := store.LoadChatMessages(ctx, "empty-room", 100)
	require.NoError(t, err)
	require.Len(t, messages, 0)
}

func TestLocalUserStore_Chat_MultipleMessages(t *testing.T) {
	store := service.NewLocalUserStore()
	ctx := context.Background()

	for i := 0; i < 10; i++ {
		err := store.StoreChatMessage(ctx, "room1", &service.ChatMessage{
			ID:        fmt.Sprintf("msg-%d", i),
			RoomName:  "room1",
			Sender:    "user",
			Text:      fmt.Sprintf("message %d", i),
			Timestamp: int64(1000 + i),
		})
		require.NoError(t, err)
	}

	// load all
	messages, err := store.LoadChatMessages(ctx, "room1", 100)
	require.NoError(t, err)
	require.Len(t, messages, 10)

	// load with limit
	messages, err = store.LoadChatMessages(ctx, "room1", 3)
	require.NoError(t, err)
	require.Len(t, messages, 3)
	// should be the last 3
	require.Equal(t, "message 7", messages[0].Text)
	require.Equal(t, "message 8", messages[1].Text)
	require.Equal(t, "message 9", messages[2].Text)
}

func TestLocalUserStore_Chat_MaxHistory(t *testing.T) {
	store := service.NewLocalUserStore()
	ctx := context.Background()

	// store more than MaxChatHistory (200) messages
	for i := 0; i < 250; i++ {
		err := store.StoreChatMessage(ctx, "room1", &service.ChatMessage{
			ID:        fmt.Sprintf("msg-%d", i),
			RoomName:  "room1",
			Sender:    "user",
			Text:      fmt.Sprintf("message %d", i),
			Timestamp: int64(i),
		})
		require.NoError(t, err)
	}

	messages, err := store.LoadChatMessages(ctx, "room1", 0)
	require.NoError(t, err)
	require.Len(t, messages, 200)
	// first message should be #50 (250-200)
	require.Equal(t, "message 50", messages[0].Text)
	require.Equal(t, "message 249", messages[199].Text)
}

func TestLocalUserStore_Chat_IsolatedRooms(t *testing.T) {
	store := service.NewLocalUserStore()
	ctx := context.Background()

	store.StoreChatMessage(ctx, "room-a", &service.ChatMessage{ID: "a1", Sender: "alice", Text: "in room A"})
	store.StoreChatMessage(ctx, "room-b", &service.ChatMessage{ID: "b1", Sender: "bob", Text: "in room B"})

	msgsA, _ := store.LoadChatMessages(ctx, "room-a", 100)
	msgsB, _ := store.LoadChatMessages(ctx, "room-b", 100)

	require.Len(t, msgsA, 1)
	require.Len(t, msgsB, 1)
	require.Equal(t, "in room A", msgsA[0].Text)
	require.Equal(t, "in room B", msgsB[0].Text)
}

// ============================
// Chat API Tests
// ============================

func TestChatSend_Success(t *testing.T) {
	svc := newTestServiceWithKeys()
	mux := setupMux(svc)

	token := registerAndLogin(mux, "chatuser1", "password123")

	w := doPost(mux, "/auth/room/chat/send",
		map[string]string{"room": "test-room", "text": "hello world"},
		"Authorization", "Bearer "+token,
	)

	require.Equal(t, http.StatusCreated, w.Code)
	resp := parseJSON(w)
	require.Equal(t, "chatuser1", resp["sender"])
	require.Equal(t, "hello world", resp["text"])
	require.NotEmpty(t, resp["id"])
	require.NotZero(t, resp["timestamp"])
}

func TestChatSend_EmptyText(t *testing.T) {
	svc := newTestServiceWithKeys()
	mux := setupMux(svc)

	token := registerAndLogin(mux, "chatuser2", "password123")

	w := doPost(mux, "/auth/room/chat/send",
		map[string]string{"room": "test-room", "text": ""},
		"Authorization", "Bearer "+token,
	)

	require.Equal(t, http.StatusBadRequest, w.Code)
}

func TestChatSend_NoAuth(t *testing.T) {
	svc := newTestServiceWithKeys()
	mux := setupMux(svc)

	w := doPost(mux, "/auth/room/chat/send",
		map[string]string{"room": "test-room", "text": "hello"},
	)

	require.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestChatHistory_Success(t *testing.T) {
	svc := newTestServiceWithKeys()
	mux := setupMux(svc)

	token := registerAndLogin(mux, "chatuser3", "password123")

	// send some messages
	for i := 0; i < 5; i++ {
		doPost(mux, "/auth/room/chat/send",
			map[string]string{"room": "history-room", "text": fmt.Sprintf("msg %d", i)},
			"Authorization", "Bearer "+token,
		)
	}

	// load history
	w := doPost(mux, "/auth/room/chat/history",
		map[string]any{"room": "history-room", "limit": 10},
		"Authorization", "Bearer "+token,
	)

	require.Equal(t, http.StatusOK, w.Code)
	resp := parseJSON(w)
	messages := resp["messages"].([]any)
	require.Len(t, messages, 5)
}

func TestChatHistory_EmptyRoom(t *testing.T) {
	svc := newTestServiceWithKeys()
	mux := setupMux(svc)

	token := registerAndLogin(mux, "chatuser4", "password123")

	w := doPost(mux, "/auth/room/chat/history",
		map[string]string{"room": "empty-room"},
		"Authorization", "Bearer "+token,
	)

	require.Equal(t, http.StatusOK, w.Code)
	resp := parseJSON(w)
	messages := resp["messages"].([]any)
	require.Len(t, messages, 0)
}

func TestChatHistory_NoRoom(t *testing.T) {
	svc := newTestServiceWithKeys()
	mux := setupMux(svc)

	token := registerAndLogin(mux, "chatuser5", "password123")

	w := doPost(mux, "/auth/room/chat/history",
		map[string]string{"room": ""},
		"Authorization", "Bearer "+token,
	)

	require.Equal(t, http.StatusBadRequest, w.Code)
}

func TestChatHistory_NoAuth(t *testing.T) {
	svc := newTestServiceWithKeys()
	mux := setupMux(svc)

	w := doPost(mux, "/auth/room/chat/history",
		map[string]string{"room": "test-room"},
	)

	require.Equal(t, http.StatusUnauthorized, w.Code)
}
