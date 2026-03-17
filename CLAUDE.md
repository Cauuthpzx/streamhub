# Stream-HUB Development Guide

## Project Structure
- `Backend/` — Go LiveKit WebRTC server (port 7880)
- `Frontend/` — Vue 3 + Vite 7 + Tailwind CSS v4 SPA (port 3000)

## Backend (Go)
- Entry: `cmd/server/main.go`
- Services: `pkg/service/` — follow existing patterns strictly
- Config: `config.yaml` (YAML), struct in `pkg/config/config.go`
- DI: Google Wire (`wire.go` + `wire_gen.go`) — update BOTH when adding services
- Auth: API Key middleware for Twirp RPC, custom JWT for user auth (`/auth/*`)
- Storage: Redis (prod) / LocalStore (dev) — always implement both
- Errors: use `psrpc.NewErrorf()` in `errors.go`
- Logging: `github.com/livekit/protocol/logger`

## Frontend (Vue 3)
- Composition API with `<script setup>` only
- Tailwind CSS v4 via `@tailwindcss/vite` plugin
- Icons: `lucide-vue-next`
- Router: Vue Router 4, lazy-loaded views
- API proxy: Vite proxies `/auth` -> backend

## Code Style Rules
- Follow existing LiveKit server conventions exactly
- Production-ready: clean, performant, no demo/prototype code
- New services: constructor injection, Wire DI, dual store (Redis + Local)
- Prefer extending existing interfaces over creating new layers
- Always read existing code before writing new code

## Commands
```bash
# Backend
cd Backend && go build -o bin/livekit-server.exe ./cmd/server/
./bin/livekit-server.exe --dev --config config.yaml --bind 127.0.0.1

# Frontend
cd Frontend && npm run dev
```

## API
- User Auth: `POST /auth/register`, `POST /auth/login` (no API key needed)
- Room Management: `POST /twirp/livekit.RoomService/*` (API key JWT required)
- WebRTC Signaling: `WS /rtc/v1` (participant JWT required)
