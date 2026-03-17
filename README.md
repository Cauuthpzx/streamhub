1. Tech Stack chính
Thành phần	Công nghệ
Ngôn ngữ	Go 1.24.0+
WebRTC	Pion WebRTC v4.2.7
WebSocket	Gorilla WebSocket v1.5.3
RPC	Twirp (Protobuf) + PSRPC
Database	PostgreSQL (persistent) + Redis (ephemeral + pub/sub)
Auth	JWT (API Key + Secret) + User Auth (register/login)
Metrics	Prometheus + OpenTelemetry + Jaeger
HTTP	Negroni middleware + CORS
DI	Google Wire
Frontend	Vue 3 + Vite 7 + Tailwind CSS v4
2. Cấu trúc thư mục

Backend/
├── cmd/server/          # Entry point (main.go)
├── pkg/
│   ├── config/          # Cấu hình YAML
│   ├── postgres/        # PostgreSQL connection pool + auto migration
│   │   └── migrations/  # SQL migration files (embed.FS)
│   ├── service/         # HTTP handlers, API services, data stores
│   ├── rtc/             # Real-time communication core
│   ├── sfu/             # Selective Forwarding Unit (xử lý media)
│   ├── routing/         # Message routing & node management
│   ├── agent/           # Agent framework
│   ├── metric/          # Metrics collection
│   └── telemetry/       # Observability & webhooks
├── config.yaml          # Cấu hình dev
└── go.mod

Frontend/
├── src/
│   ├── components/      # Vue 3 SFC (Composition API)
│   ├── composables/     # use*.js reactive composables
│   ├── views/           # Route views (orchestrator only)
│   ├── services/        # API client (auth, room)
│   ├── locales/         # i18n (en, zh, vi)
│   └── router/          # Vue Router 4
├── public/avatars/      # 48 WebP default avatars
└── vite.config.js

3. Database Architecture

Stream-HUB sử dụng kiến trúc dual-database:

PostgreSQL — Persistent Storage (dữ liệu sống sót qua restart)
┌─────────────────────────────────────────────────────────────┐
│ users           │ Tài khoản, mật khẩu, avatar, display name │
│ chat_messages   │ Lịch sử chat theo phòng (có index)        │
│ file_metadata   │ Metadata file upload (id, room, sender)    │
│ share_links     │ Link chia sẻ phòng (unique per room)       │
└─────────────────────────────────────────────────────────────┘

Redis — Ephemeral State (dữ liệu session, mất khi restart là OK)
┌─────────────────────────────────────────────────────────────┐
│ room_passwords       │ Mật khẩu phòng (chỉ tồn tại khi     │
│                      │ phòng đang hoạt động)                 │
│ room_lobbies         │ Lobby on/off per room                 │
│ room_lobby_pending:* │ Danh sách user đang chờ duyệt        │
│ room_lobby_decision:*│ Quyết định approve/reject             │
│ LiveKit internal     │ Room state, participant info,         │
│                      │ node registry, distributed locks,     │
│                      │ pub/sub inter-node communication      │
└─────────────────────────────────────────────────────────────┘

Chế độ khởi tạo (tự động theo config):
│ postgres + redis │ → HybridUserStore (production)
│ postgres only    │ → PgUserStore + in-memory ephemeral
│ redis only       │ → RedisUserStore (backward compatible)
│ không config     │ → LocalUserStore (dev/test)

Migration tự động: SQL files embedded trong binary, chạy khi server start.

4. API Endpoints
Twirp RPC:

/livekit.RoomService/* — Quản lý phòng
/livekit.AgentDispatchService/* — Điều phối agent
/livekit.Egress/* — Ghi hình/streaming
/livekit.Ingress/* — Ingest (RTMP, WHIP, HLS)
/livekit.SIP/* — Tích hợp SIP
WebSocket (Signaling):

/rtc và /rtc/v1 — Kết nối WebSocket signal
/rtc/validate, /rtc/v1/validate — Validate token
User Auth:

POST /auth/register — Đăng ký tài khoản
POST /auth/login — Đăng nhập
GET/POST /auth/profile — Avatar + display name
POST /auth/token — Lấy LiveKit access token
Khác:

/whip/* — WHIP ingest
/agent — Agent worker WebSocket
/metrics — Prometheus metrics
/debug/* — Debug endpoints (dev mode)
5. Authentication
JWT token từ cặp API Key/Secret trong config
User auth: register/login → user JWT → profile management
Middleware APIKeyAuthMiddleware validate mọi Twirp RPC request
User JWT validate cho /auth/* endpoints
Token chứa VideoGrant với quyền: RoomJoin, CanPublish, CanPublishData, CanSubscribe, Recorder, Agent
6. Real-time / WebSocket
Client kết nối WebSocket → validate JWT → trao đổi message Protobuf/JSON
Ping/pong keep-alive mỗi 10s
Signal messages: AddTrack, RemoveTrack, Trickle ICE, quality feedback
Data Channel: reliable + unreliable modes, broadcast messaging
Participant metadata: avatar, display name broadcast qua LiveKit metadata
PSRPC SignalServer: relay tín hiệu giữa các node trong cluster
7. Luồng khởi động Server
Parse CLI flags & load config YAML
Tạo LocalNode (đăng ký node ID, region, IP)
Init Prometheus metrics
Wire DI khởi tạo toàn bộ services
  → Kết nối Redis (nếu có config)
  → Kết nối PostgreSQL + chạy auto migration (nếu có config)
  → Chọn UserStore phù hợp (Hybrid/PG/Redis/Local)
Start HTTP server trên port 7880
Lắng nghe SIGINT/SIGTERM để graceful shutdown
8. Tích hợp bên ngoài
Egress — Ghi hình/stream ra cloud storage
Ingress — Nhận stream RTMP/WHIP/HLS vào
SIP — Tích hợp gọi điện thoại
Webhooks — Notify events (room start/end, participant join/left)
Agents — Worker registration qua WebSocket, load balancing
9. Commands
```bash
# Backend
cd Backend && go build -o bin/livekit-server.exe ./cmd/server/
./bin/livekit-server.exe --dev --config config.yaml --bind 127.0.0.1

# Frontend
cd Frontend && npm run dev
```
File quan trọng nhất cần đọc
File	Vai trò
main.go	Entry point
server.go	Server setup & lifecycle
rtcservice.go	WebSocket handler
roomservice.go	Room API
userauthservice.go	User auth + profile API
pgstore.go	PostgreSQL data store
pgstore_hybrid.go	Hybrid PG+Redis store
config.go	Config structs
config.yaml	Config template
Đây là một media server cấp production với kiến trúc phân tán, hỗ trợ clustering qua Redis, persistent storage qua PostgreSQL, và real-time communication qua WebRTC + WebSocket.



PostgreSQL trong Stream-HUB — phân tích thực tế
PostgreSQL đảm nhiệm tốt nhất:
1. User accounts — Dữ liệu tài khoản cần tồn tại vĩnh viễn. PostgreSQL có ACID transaction, đảm bảo khi register/update profile không bao giờ mất dữ liệu. Redis hash users trước đây mất toàn bộ khi restart Redis hoặc khi Redis evict memory.

2. Chat history — Tin nhắn chat cần query theo room + sắp xếp theo thời gian. PostgreSQL có B-tree index trên (room_name, timestamp DESC) — query nhanh O(log n). Redis list (LPUSH/LRANGE) không có index, và LTRIM tự cắt bỏ tin cũ — mất dữ liệu.

3. File metadata — Cần lookup theo fileID (download) và list theo room_name (hiển thị). PostgreSQL PK + index phục vụ cả 2 pattern. Redis cần 2 key riêng (files hash + room_files:* list) — dễ bị desync.

4. Share links — Cần unique constraint room_name (1 link/room). PostgreSQL enforce bằng UNIQUE INDEX ở database level. Redis phải dùng 2 hash (share_links + share_links_by_room) và tự manage consistency — race condition có thể tạo duplicate.

PostgreSQL KHÔNG nên đảm nhiệm:
1. Lobby state — Hoàn toàn ephemeral. User chờ approve/reject chỉ tồn tại vài giây đến vài phút. Phòng đóng → lobby state vô nghĩa. Ghi vào PostgreSQL = tạo write I/O không cần thiết + cần cleanup logic. Redis SET/HASH tự expire hoặc mất khi restart — đúng behavior mong muốn.

2. Room passwords — Gắn liền lifecycle của room. Room tồn tại khi có participant, mất khi không ai còn trong phòng. PostgreSQL sẽ tích lũy row zombie — room đã hết nhưng password vẫn nằm trong DB. Redis key mất khi restart = tự cleanup.

3. LiveKit internal state — Room info, participant info, node registry, distributed locks, pub/sub. Đây là upstream LiveKit code dùng Redis native. Không nên chạm vào vì: (a) upstream sẽ conflict khi merge, (b) Redis pub/sub cho inter-node communication không có equivalent trong PostgreSQL, (c) state này thay đổi liên tục (mỗi giây) — PostgreSQL WAL sẽ bloat.

4. Real-time counters/metrics — Nếu sau này thêm view count, online count. PostgreSQL row-level locking sẽ bottleneck. Redis INCR là atomic O(1).

Không nên mở rộng PostgreSQL cho:
Session tokens / refresh tokens — TTL-based, Redis SETEX tốt hơn
Rate limiting — Cần atomic increment + expire, Redis INCR + EXPIRE pipeline
WebRTC ICE candidates caching — Vòng đời < 30 giây, viết vào PG là lãng phí
Presence tracking (ai đang online) — Thay đổi liên tục, Redis pub/sub đã handle qua LiveKit
Có thể mở rộng PostgreSQL cho (khi cần):
Room settings (nếu muốn phòng tồn tại vĩnh viễn, không chỉ khi có người) — thêm table rooms
Audit log (ai join/leave khi nào) — append-only table, query theo thời gian
User roles/permissions (admin, moderator) — relational data, FK tới users
Recording metadata (egress history) — cần persist, query theo room/user