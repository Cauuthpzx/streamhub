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

## III. CÁC TÍNH NĂNG CẦN SERVICE BÊN NGOÀI (CHƯA LÀM)

### 1 — Ghi hình / Recording (Egress)

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

**Backend:** ✅ 9 Twirp RPC sẵn sàng. **Cần:** [livekit-egress](https://github.com/livekit/egress) + Redis + Frontend UI.

---

### 2 — RTMP / WHIP Ingest (Ingress)

| Backend API | Mô tả | Loại |
|---|---|---|
| `Ingress.CreateIngress` | Tạo endpoint ingest (RTMP/WHIP/URL pull) | Twirp RPC |
| `Ingress.UpdateIngress` | Cập nhật cấu hình ingest | Twirp RPC |
| `Ingress.ListIngress` | Danh sách ingest endpoints | Twirp RPC |
| `Ingress.DeleteIngress` | Xoá ingest | Twirp RPC |
| `/whip/v1` (POST) | WHIP session creation (SDP offer/answer) | HTTP |
| `/whip/v1/{id}` (PATCH) | ICE trickle/restart | HTTP |
| `/whip/v1/{id}` (DELETE) | Terminate WHIP session | HTTP |

**Backend:** ✅ 4 Twirp + 3 HTTP sẵn sàng. **Cần:** [livekit-ingress](https://github.com/livekit/ingress) + Redis + Frontend UI.

---

### 3 — AI Agent Workers

| Backend API | Mô tả | Loại |
|---|---|---|
| `/agent` (WebSocket) | Đăng ký agent worker | WebSocket |
| `AgentDispatchService.CreateDispatch` | Dispatch agent vào phòng | Twirp RPC |
| `AgentDispatchService.DeleteDispatch` | Xoá agent dispatch | Twirp RPC |
| `AgentDispatchService.ListDispatch` | Danh sách dispatches | Twirp RPC |
| `AgentService.JobRequest` | Gửi job đến worker | Internal RPC |
| `AgentService.JobTerminate` | Dừng job | Internal RPC |
| `AgentService.CheckEnabled` | Kiểm tra agent capabilities | Internal RPC |

**Backend:** ✅ 3 Twirp + 4 internal sẵn sàng. **Cần:** Agent worker app (Python/Node) + Frontend UI.

---

### 4 — SIP / Gọi điện thoại

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

**Backend:** ✅ 17 Twirp RPC sẵn sàng. **Cần:** [livekit-sip](https://github.com/livekit/sip) + SIP provider + Frontend UI.

---

## IV. BẢNG TỔNG HỢP (cập nhật 2026-03-17)

| # | Tính năng | Backend | Frontend | Test | Trạng thái |
|---|---|---|---|---|---|
| 1 | Đăng ký / Đăng nhập | ✅ 3 endpoints | ✅ Login + Register | ✅ 24 tests | ✅ XONG |
| 2 | Quản lý phòng (CRUD + password + max) | ✅ 2 endpoints | ✅ Create/List/Delete/Join | ✅ 8 tests | ✅ XONG |
| 3 | Video / Audio call | ✅ LiveKit RTC | ✅ Camera + Mic + Grid + toRaw fix | — | ✅ XONG |
| 4 | Screen share + PiP (Zoom/OBS style) | ✅ LiveKit RTC | ✅ PiP layout + reattach fix | — | ✅ XONG |
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
| 15 | Di chuyển participant | ✅ 2 Twirp RPC | ✅ Move dialog + chọn phòng đích | — | ✅ XONG |
| 16 | Cập nhật room metadata | ✅ 1 Twirp RPC | ✅ Edit dialog + textarea | — | ✅ XONG |
| 17 | RPC giữa participants | ✅ 1 Twirp RPC | ✅ API sẵn sàng | — | ✅ XONG |
| 18 | **AI Agent Workers** | ✅ 7 API | ❌ Chưa có | — | ⏳ Cần agent worker app |
| 19 | **SIP / Gọi điện** | ✅ 17 Twirp RPC | ❌ Chưa có | — | ⏳ Cần SIP service |

**Tổng: 15/19 tính năng XONG | 67 tests PASS (49 backend + 18 frontend)**

---

## V. TÍNH NĂNG CHƯA LÀM — THỨ TỰ ƯU TIÊN

**Cần deploy thêm service:**

| # | Tính năng | Service cần | Độ khó |
|---|---|---|---|
| 1 | Ghi hình / Recording | [livekit-egress](https://github.com/livekit/egress) + Redis | Trung bình |
| 2 | RTMP/WHIP Ingest (OBS stream vào) | [livekit-ingress](https://github.com/livekit/ingress) + Redis | Trung bình |
| 3 | AI Agent Workers | Viết agent worker (Python/Node) | Cao |
| 4 | SIP / Gọi điện thoại | [livekit-sip](https://github.com/livekit/sip) + SIP provider | Cao |
