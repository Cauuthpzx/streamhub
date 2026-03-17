# Stream-HUB — Bản đồ tính năng

> Dữ liệu 100% từ source code thực tế, review ngày 2026-03-17.
> Backend: 67 API endpoints | Frontend: 5 routes, 2 services, 4 views

---

## I. TỔNG QUAN

| Thống kê | Số liệu |
|---|---|
| Twirp RPC endpoints (backend) | **49** |
| HTTP REST endpoints (backend) | **11** |
| WebSocket endpoints (backend) | **2** |
| Data Track operations (backend) | **5** |
| **Tổng API entry points** | **67** |
| Frontend routes | 5 (`/login`, `/register`, `/home`, `/room/:name`, `/`) |
| Frontend services | 2 (`auth.js`, `room.js`) |
| Frontend views | 4 (`Login`, `Register`, `Home`, `Room`) |

---

## II. TÍNH NĂNG ĐÃ TRIỂN KHAI (Frontend + Backend)

### 1. Xác thực người dùng — ✅ 100%

| Endpoint | Method | Mô tả | Trạng thái |
|---|---|---|---|
| `/auth/register` | POST | Đăng ký bằng username + password (bcrypt) | ✅ Có sẵn |
| `/auth/login` | POST | Đăng nhập, trả JWT token | ✅ Có sẵn |
| `/auth/token` | POST | Cấp LiveKit access token cho user đã đăng nhập | ✅ Có sẵn |

**Frontend:** LoginView, RegisterView, auth.js — đầy đủ.

### 2. Quản lý phòng — ✅ 100%

| Endpoint | Method | Mô tả | Trạng thái |
|---|---|---|---|
| `/auth/room/create` | POST | Tạo phòng (tên, max người, mật khẩu) | ✅ Có sẵn |
| `/auth/room/list` | POST/GET | Danh sách phòng kèm `has_password` | ✅ Có sẵn |
| `/twirp/livekit.RoomService/DeleteRoom` | POST | Xoá phòng | ✅ Có sẵn |

**Frontend:** HomeView với form tạo, danh sách, xoá, icon khoá/mở, dialog nhập mật khẩu.

### 3. Video/Audio call (WebRTC) — ✅ 100%

| Tính năng | Mô tả | Trạng thái |
|---|---|---|
| Camera | Bật/tắt, 720p, mirror local | ✅ Có sẵn |
| Microphone | Bật/tắt | ✅ Có sẵn |
| Screen share | Chia sẻ màn hình | ✅ Có sẵn |
| Adaptive streaming | `adaptiveStream: true`, `dynacast: true` | ✅ Có sẵn |
| Video grid | Layout tự động 1→6+ participants | ✅ Có sẵn |
| Join/Leave | Kết nối/ngắt WebSocket + WebRTC | ✅ Có sẵn |

**Frontend:** RoomView với livekit-client SDK.

### 4. Đa ngôn ngữ (i18n) — ✅ 100%

| Ngôn ngữ | Trạng thái |
|---|---|
| Tiếng Việt (vi) | ✅ Có sẵn |
| English (en) | ✅ Có sẵn |
| 中文 (zh) | ✅ Có sẵn |

**Frontend:** vue-i18n, LanguageSwitcher component.

---

## III. TÍNH NĂNG BACKEND CÓ SẴN — CHƯA CÓ FRONTEND

### Ưu tiên 1 — Chat / Nhắn tin trong phòng

| Backend API | Mô tả | Loại |
|---|---|---|
| `RoomService.SendData` | Gửi tin nhắn binary/text đến room hoặc participant cụ thể | Twirp RPC |
| DataChannel (livekit-client SDK) | Gửi/nhận data real-time qua WebRTC DataChannel | Client SDK |
| `participant_data_track.go` | 5 methods: PublishDataTrack, UnpublishDataTrack, UpdateDataSubscription, onReceivedDataTrackMessage, GetNextSubscribedDataTrackHandle | Internal |

**Backend:** ✅ Sẵn sàng 100% — cần viết Frontend.
**Cần làm:** Chat component, data channel integration trong RoomView.

---

### Ưu tiên 2 — Quản lý Participant trong phòng

| Backend API | Mô tả | Loại |
|---|---|---|
| `RoomService.ListParticipants` | Danh sách tất cả participant trong phòng | Twirp RPC |
| `RoomService.GetParticipant` | Thông tin chi tiết 1 participant | Twirp RPC |
| `RoomService.RemoveParticipant` | Kick participant khỏi phòng | Twirp RPC |
| `RoomService.MutePublishedTrack` | Mute/unmute track của participant từ xa | Twirp RPC |
| `RoomService.UpdateParticipant` | Cập nhật metadata, tên, attributes | Twirp RPC |
| `RoomService.UpdateSubscriptions` | Điều khiển track nào participant subscribe | Twirp RPC |

**Backend:** ✅ Sẵn sàng 100% — 6 endpoints, cần viết Frontend.
**Cần làm:** Participant list sidebar, kick button, mute button, admin panel.

---

### Ưu tiên 3 — Ghi hình / Recording (Egress)

| Backend API | Mô tả | Loại |
|---|---|---|
| `Egress.StartRoomCompositeEgress` | Ghi toàn bộ phòng (video + audio composite) | Twirp RPC |
| `Egress.StartParticipantEgress` | Ghi 1 participant cụ thể | Twirp RPC |
| `Egress.StartTrackCompositeEgress` | Ghi tổ hợp track cụ thể | Twirp RPC |
| `Egress.StartTrackEgress` | Ghi 1 track riêng lẻ | Twirp RPC |
| `Egress.StartWebEgress` | Ghi nội dung web page | Twirp RPC |
| `Egress.UpdateLayout` | Thay đổi layout ghi hình | Twirp RPC |
| `Egress.UpdateStream` | Thêm/xoá URL streaming output | Twirp RPC |
| `Egress.ListEgress` | Danh sách job ghi hình đang/đã chạy | Twirp RPC |
| `Egress.StopEgress` | Dừng ghi hình | Twirp RPC |

**Backend:** ✅ Sẵn sàng 100% — 9 endpoints, cần Egress service riêng (chạy ngoài) + Frontend.
**Cần làm:** Recording UI (start/stop/list), cấu hình output (file/S3/GCS).
**Lưu ý:** Cần deploy thêm [livekit-egress](https://github.com/livekit/egress) service + Redis.

---

### Ưu tiên 4 — RTMP / WHIP Ingest (Ingress)

| Backend API | Mô tả | Loại |
|---|---|---|
| `Ingress.CreateIngress` | Tạo endpoint ingest (RTMP/WHIP/URL pull) | Twirp RPC |
| `Ingress.UpdateIngress` | Cập nhật cấu hình ingest | Twirp RPC |
| `Ingress.ListIngress` | Danh sách ingest endpoints | Twirp RPC |
| `Ingress.DeleteIngress` | Xoá ingest | Twirp RPC |
| `/whip/v1` (POST) | WHIP session creation (SDP offer/answer) | HTTP |
| `/whip/v1/{id}` (PATCH) | ICE trickle/restart | HTTP |
| `/whip/v1/{id}` (DELETE) | Terminate WHIP session | HTTP |

**Backend:** ✅ Sẵn sàng 100% — 4 Twirp + 6 HTTP endpoints.
**Cần làm:** Ingress management UI, RTMP URL generator, WHIP stream status.
**Lưu ý:** Cần deploy thêm [livekit-ingress](https://github.com/livekit/ingress) service + Redis.

---

### Ưu tiên 5 — Di chuyển Participant giữa các phòng

| Backend API | Mô tả | Loại |
|---|---|---|
| `RoomService.MoveParticipant` | Di chuyển participant sang phòng khác | Twirp RPC |
| `RoomService.ForwardParticipant` | Forward participant đến destination room | Twirp RPC |

**Backend:** ✅ Sẵn sàng 100% — 2 endpoints.
**Cần làm:** UI chọn phòng đích, xác nhận di chuyển.

---

### Ưu tiên 6 — Cập nhật Room metadata

| Backend API | Mô tả | Loại |
|---|---|---|
| `RoomService.UpdateRoomMetadata` | Cập nhật metadata phòng khi đang chạy | Twirp RPC |

**Backend:** ✅ Sẵn sàng 100% — 1 endpoint.
**Cần làm:** UI chỉnh sửa thông tin phòng.

---

### Ưu tiên 7 — RPC giữa Participants

| Backend API | Mô tả | Loại |
|---|---|---|
| `RoomService.PerformRpc` | Thực thi RPC command lên participant | Twirp RPC |

**Backend:** ✅ Sẵn sàng 100% — 1 endpoint.
**Cần làm:** Tuỳ use case (remote control, commands).

---

### Ưu tiên 8 — AI Agent Workers

| Backend API | Mô tả | Loại |
|---|---|---|
| `/agent` (WebSocket) | Đăng ký agent worker | WebSocket |
| `AgentDispatchService.CreateDispatch` | Dispatch agent vào phòng | Twirp RPC |
| `AgentDispatchService.DeleteDispatch` | Xoá agent dispatch | Twirp RPC |
| `AgentDispatchService.ListDispatch` | Danh sách dispatches | Twirp RPC |
| `AgentService.JobRequest` | Gửi job đến worker | Internal RPC |
| `AgentService.JobTerminate` | Dừng job | Internal RPC |
| `AgentService.CheckEnabled` | Kiểm tra agent capabilities | Internal RPC |

**Backend:** ✅ Sẵn sàng 100% — 3 Twirp + 4 internal.
**Cần làm:** Agent worker SDK, dispatch UI, job monitoring.
**Lưu ý:** Cần viết agent worker (Python/Node) ngoài server.

---

### Ưu tiên 9 — SIP / Gọi điện thoại

| Backend API | Mô tả | Loại |
|---|---|---|
| `SIP.CreateSIPInboundTrunk` | Cấu hình nhận cuộc gọi đến | Twirp RPC |
| `SIP.CreateSIPOutboundTrunk` | Cấu hình gọi ra | Twirp RPC |
| `SIP.UpdateSIPInboundTrunk` | Sửa cấu hình nhận | Twirp RPC |
| `SIP.UpdateSIPOutboundTrunk` | Sửa cấu hình gọi | Twirp RPC |
| `SIP.GetSIPInboundTrunk` | Chi tiết trunk nhận | Twirp RPC |
| `SIP.GetSIPOutboundTrunk` | Chi tiết trunk gọi | Twirp RPC |
| `SIP.ListSIPInboundTrunk` | Danh sách trunks nhận | Twirp RPC |
| `SIP.ListSIPOutboundTrunk` | Danh sách trunks gọi | Twirp RPC |
| `SIP.ListSIPTrunk` | Danh sách trunks (legacy) | Twirp RPC |
| `SIP.DeleteSIPTrunk` | Xoá trunk | Twirp RPC |
| `SIP.CreateSIPDispatchRule` | Tạo rule điều hướng cuộc gọi | Twirp RPC |
| `SIP.UpdateSIPDispatchRule` | Sửa rule | Twirp RPC |
| `SIP.ListSIPDispatchRule` | Danh sách rules | Twirp RPC |
| `SIP.DeleteSIPDispatchRule` | Xoá rule | Twirp RPC |
| `SIP.CreateSIPParticipant` | Gọi số điện thoại và thêm vào phòng | Twirp RPC |
| `SIP.TransferSIPParticipant` | Chuyển cuộc gọi sang số khác | Twirp RPC |
| `SIP.CreateSIPTrunk` | Tạo trunk (legacy) | Twirp RPC |

**Backend:** ✅ Sẵn sàng 100% — 17 endpoints.
**Cần làm:** SIP management UI, dial pad, trunk config.
**Lưu ý:** Cần deploy thêm [livekit-sip](https://github.com/livekit/sip) service + SIP provider.

---

## IV. BẢNG TỔNG HỢP (cập nhật 2026-03-17)

| # | Tính năng | Backend | Frontend | Test | Trạng thái |
|---|---|---|---|---|---|
| 1 | Đăng ký / Đăng nhập | ✅ 3 endpoints | ✅ Login + Register | ✅ 24 tests | ✅ XONG |
| 2 | Quản lý phòng (CRUD + password + max) | ✅ 2 endpoints | ✅ Create/List/Delete/Join | ✅ 8 tests | ✅ XONG |
| 3 | Video / Audio call | ✅ LiveKit RTC | ✅ Camera + Mic + Grid | — | ✅ XONG |
| 4 | Screen share | ✅ LiveKit RTC | ✅ Toggle screen share | — | ✅ XONG |
| 5 | Chat real-time + lịch sử | ✅ 2 endpoints + DataChannel | ✅ RoomChat + history | ✅ 12 tests | ✅ XONG |
| 6 | Quản lý participant | ✅ 6 Twirp RPC | ✅ List/Kick/Mute panel | — | ✅ XONG |
| 7 | Đa ngôn ngữ (EN/VI/ZH) | ✅ i18n keys | ✅ vue-i18n + switcher | — | ✅ XONG |
| 8 | Dark / Light mode | — | ✅ ThemeToggle + useTheme | — | ✅ XONG |
| 9 | Tooltip component | — | ✅ AppTooltip (12 vị trí) | — | ✅ XONG |
| 10 | Logo + Branding | — | ✅ AppLogo SVG animated | — | ✅ XONG |
| 11 | Graceful fallback (no cam/mic) | — | ✅ 3-level fallback | — | ✅ XONG |
| 12 | Room timeout 30 ngày | ✅ EmptyTimeout fix | — | — | ✅ XONG |
| 13 | **Ghi hình / Recording** | ✅ 9 Twirp RPC | ❌ Chưa có | — | ⏳ Cần Egress service |
| 14 | **RTMP/WHIP Ingest** | ✅ 10 endpoints | ❌ Chưa có | — | ⏳ Cần Ingress service |
| 15 | **Di chuyển participant** | ✅ 2 Twirp RPC | ❌ Chưa có | — | Làm ngay được |
| 16 | **Cập nhật room metadata** | ✅ 1 Twirp RPC | ❌ Chưa có | — | Làm ngay được |
| 17 | **RPC giữa participants** | ✅ 1 Twirp RPC | ❌ Chưa có | — | Làm ngay được |
| 18 | **AI Agent Workers** | ✅ 7 API | ❌ Chưa có | — | ⏳ Cần agent worker app |
| 19 | **SIP / Gọi điện** | ✅ 17 Twirp RPC | ❌ Chưa có | — | ⏳ Cần SIP service |

**Tổng: 12/19 tính năng XONG | 67 tests PASS (49 backend + 18 frontend)**

---

## V. TÍNH NĂNG CHƯA LÀM — THỨ TỰ ƯU TIÊN

**Làm ngay được (không cần service ngoài):**

| # | Tính năng | Backend API | Độ khó |
|---|---|---|---|
| 1 | Di chuyển participant giữa phòng | `MoveParticipant`, `ForwardParticipant` | Thấp |
| 2 | Cập nhật room metadata (đổi tên/mô tả) | `UpdateRoomMetadata` | Thấp |
| 3 | RPC giữa participants | `PerformRpc` | Trung bình |

**Cần deploy thêm service:**

| # | Tính năng | Service cần | Độ khó |
|---|---|---|---|
| 4 | Ghi hình / Recording | [livekit-egress](https://github.com/livekit/egress) + Redis | Trung bình |
| 5 | RTMP/WHIP Ingest (OBS stream vào) | [livekit-ingress](https://github.com/livekit/ingress) + Redis | Trung bình |
| 6 | AI Agent Workers | Viết agent worker (Python/Node) | Cao |
| 7 | SIP / Gọi điện thoại | [livekit-sip](https://github.com/livekit/sip) + SIP provider | Cao |
