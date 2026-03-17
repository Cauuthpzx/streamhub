# Stream-HUB Development Guide
BẮT BUỘC LUÔN LUÔN ĐỌC MEMORY VÀ FILE CLAUDE.MD NÀY TRƯỚC KHI CODE BẤT KỂ THỨ GÌ . PHONG CÁCH CODE SERVER DỰA HOÀN TOÀN TRÊN NHỮNG MÃ ĐÃ CÓ. CLEARN PRODUCATION READY . FIX CODE SỬA ĐÚNG CHỖ CẦN, KHÔNG VIẾT THÊM ĐỂ FIX TRÁNH DUPLICE CODE . VÀ DEADCODE .
STRICT HOÀN TOÀN DỰ ÁN 
- CHẤT LƯỢNG LÀ HÀNG ĐẦU 
- TỐC  ĐỘ LÀ ĐẶC BIỆT 
- ỔN ĐỊNH LÀ ĐIỀU KHÔNG THỂ THIẾU .

CÔNG NGHỆ HIỆN ĐẠI NHẤT  ĐƯỢC ÁP DỤNG VỚI CODE TOÀN VẸN NHẤT 2026 CỦA PRO CODER 40 NĂM KINH NGHIỆM .

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

## i18n (BẮT BUỘC - KHÔNG NGOẠI LỆ)
- **KHÔNG hardcode text ở bất kỳ đâu** — UI, logs, errors, placeholders, toasts, API responses, console.log, logger.Infow/Warnw/Errorw
- 3 ngôn ngữ: English (en), 中文 (zh), Tiếng Việt (vi)
- Frontend: dùng `vue-i18n`, mọi text phải dùng `t('key')` trong `<script setup>` hoặc `$t('key')` trong `<template>`
- Frontend console.log: dùng i18n key, KHÔNG viết chuỗi trực tiếp
- Backend Go logger: dùng i18n message key, KHÔNG hardcode string trong logger.Infow(), logger.Warnw(), logger.Errorw()
- Backend API responses: error message và success message đều dùng i18n key
- Locale files: `Frontend/src/locales/{en,zh,vi}.json`
- Áp dụng ngay từ dòng code đầu tiên, không refactor sau
- **KỂ CẢ log debug, log info, log warning, log error — TẤT CẢ phải dùng i18n key**

## CẤM tự sửa assets của developer
- KHÔNG sửa SVG logo, hình ảnh, assets mà developer cung cấp (viewBox, tọa độ, kích thước, màu, structure)
- KHÔNG tạo thêm phiên bản mới từ assets gốc mà không hỏi
- Muốn thay đổi bất kỳ thành phần nào developer đưa vào → PHẢI HỎI TRƯỚC
- Chỉ được wrap trong component và thêm CSS theme (dark/light), KHÔNG đổi nội dung gốc

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
