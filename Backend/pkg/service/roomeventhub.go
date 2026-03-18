package service

import (
	"encoding/json"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/livekit/protocol/logger"
)

// RoomEvent is pushed to all connected WS clients.
type RoomEvent struct {
	Type     string `json:"type"` // "participant_joined" | "participant_left" | "lobby_request" | "lobby_approved" | "lobby_rejected"
	Room     string `json:"room"`
	Count    int    `json:"count,omitempty"`
	Username string `json:"username,omitempty"`
}

// RoomEventHub manages WebSocket clients listening for room participant changes.
type RoomEventHub struct {
	mu       sync.RWMutex
	clients  map[*websocket.Conn]struct{}
	upgrader websocket.Upgrader
}

var globalRoomEventHub = &RoomEventHub{
	clients: make(map[*websocket.Conn]struct{}),
	upgrader: websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	},
}

// BroadcastRoomEvent sends a participant count event to all connected WS clients.
func BroadcastRoomEvent(evt RoomEvent) {
	globalRoomEventHub.broadcast(evt)
}

func (h *RoomEventHub) broadcast(evt RoomEvent) {
	data, err := json.Marshal(evt)
	if err != nil {
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for conn := range h.clients {
		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			logger.Debugw("roomeventhub: write error, client will be removed on next ping", "err", err)
		}
	}
}

func (h *RoomEventHub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Warnw("roomeventhub: upgrade failed", err)
		return
	}

	h.mu.Lock()
	h.clients[conn] = struct{}{}
	h.mu.Unlock()

	// Block until client disconnects (read loop discards all inbound messages)
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}

	h.mu.Lock()
	delete(h.clients, conn)
	h.mu.Unlock()
	conn.Close()
}
