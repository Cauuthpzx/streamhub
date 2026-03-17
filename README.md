1. Tech Stack chính
Thành phần	Công nghệ
Ngôn ngữ	Go 1.24.0+
WebRTC	Pion WebRTC v4.2.7
WebSocket	Gorilla WebSocket v1.5.3
RPC	Twirp (Protobuf) + PSRPC
Database	Redis (state, pub/sub, clustering) — không dùng SQL
Auth	JWT (API Key + Secret)
Metrics	Prometheus + OpenTelemetry + Jaeger
HTTP	Negroni middleware + CORS
DI	Google Wire
2. Cấu trúc thư mục

Backend/
├── cmd/server/          # Entry point (main.go)
├── pkg/
│   ├── config/          # Cấu hình YAML
│   ├── service/         # HTTP handlers, API services
│   ├── rtc/             # Real-time communication core
│   ├── sfu/             # Selective Forwarding Unit (xử lý media)
│   ├── routing/         # Message routing & node management
│   ├── agent/           # Agent framework
│   ├── metric/          # Metrics collection
│   └── telemetry/       # Observability & webhooks
├── config-sample.yaml   # Template cấu hình
├── Dockerfile
└── go.mod
3. API Endpoints
Twirp RPC:

/livekit.RoomService/* — Quản lý phòng
/livekit.AgentDispatchService/* — Điều phối agent
/livekit.Egress/* — Ghi hình/streaming
/livekit.Ingress/* — Ingest (RTMP, WHIP, HLS)
/livekit.SIP/* — Tích hợp SIP
WebSocket (Signaling):

/rtc và /rtc/v1 — Kết nối WebSocket signal
/rtc/validate, /rtc/v1/validate — Validate token
Khác:

/whip/* — WHIP ingest
/agent — Agent worker WebSocket
/metrics — Prometheus metrics
/debug/* — Debug endpoints (dev mode)
4. Authentication
JWT token từ cặp API Key/Secret trong config
Middleware APIKeyAuthMiddleware validate mọi request
Token chứa VideoGrant với quyền: RoomJoin, CanPublish, CanPublishData, CanSubscribe, Recorder, Agent
5. Real-time / WebSocket
Client kết nối WebSocket → validate JWT → trao đổi message Protobuf/JSON
Ping/pong keep-alive mỗi 10s
Signal messages: AddTrack, RemoveTrack, Trickle ICE, quality feedback
Data Channel: reliable + unreliable modes, broadcast messaging
PSRPC SignalServer: relay tín hiệu giữa các node trong cluster
6. Database (Redis-based)
Không dùng SQL — toàn bộ state lưu trong Redis:

Room state & participant info
Node registration & health
Room-to-node mapping
Distributed locks
Pub/Sub cho inter-node communication
Fallback LocalStore (in-memory) cho single-node
7. Luồng khởi động Server
Parse CLI flags & load config YAML
Tạo LocalNode (đăng ký node ID, region, IP)
Init Prometheus metrics
Wire DI khởi tạo toàn bộ services (Redis, Router, Room, RTC, Signal, TURN...)
Start HTTP server trên port 7880
Lắng nghe SIGINT/SIGTERM để graceful shutdown
8. Tích hợp bên ngoài
Egress — Ghi hình/stream ra cloud storage
Ingress — Nhận stream RTMP/WHIP/HLS vào
SIP — Tích hợp gọi điện thoại
Webhooks — Notify events (room start/end, participant join/left)
Agents — Worker registration qua WebSocket, load balancing
File quan trọng nhất cần đọc
File	Vai trò
main.go	Entry point
server.go	Server setup & lifecycle
rtcservice.go	WebSocket handler
roomservice.go	Room API
config.go	Config structs
config-sample.yaml	Config template
Đây là một media server cấp production với kiến trúc phân tán, hỗ trợ clustering qua Redis, và real-time communication qua WebRTC + WebSocket