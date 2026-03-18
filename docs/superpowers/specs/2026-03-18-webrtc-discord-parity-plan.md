# Kế Hoạch Tối Ưu WebRTC — Discord-Parity

**Ngày:** 2026-03-18
**Phạm vi:** Backend LiveKit SFU + Frontend livekit-client
**Mục tiêu:** Đạt chất lượng audio/video ngang Discord: ổn định dưới mạng yếu, adaptive bitrate mượt, latency thấp, không drop khi bandwidth biến động

---

## 1. Phân Tích Gap — Stream-HUB vs Discord Architecture

### 1.1 Kiến trúc Discord (từ sơ đồ tham khảo)

Discord sử dụng mô hình SFU có các đặc điểm:
- **Send-side BWE (Bandwidth Estimation)** với pacer để tránh burst
- **Simulcast 3 tầng** (low/medium/high) — SFU chọn tầng phù hợp cho từng subscriber dựa trên bandwidth
- **TWCC (Transport-Wide Congestion Control)** — feedback từ receiver về toàn bộ transport, không chỉ per-stream
- **Adaptive codec selection** — AV1 ưu tiên khi GPU hỗ trợ hardware encode, fallback H264/VP8
- **PLI throttle** — giới hạn tần suất request re-encode để tránh encoder bị quá tải
- **TURN cluster** — đảm bảo kết nối xuyên NAT/firewall
- **Stream Allocator** — cấp phát bandwidth cho từng stream dựa trên priority + available BWE

### 1.2 Trạng Thái Hiện Tại Stream-HUB

| Thành phần | Discord | Stream-HUB hiện tại | Mức độ gap |
|---|---|---|---|
| Congestion Control | TWCC + Send-side BWE | TWCC enabled, **Send-side BWE tắt** | 🔴 Critical |
| Simulcast | 3 tầng (180p/360p/720p) | Dynacast bật nhưng **chỉ 1 quality layer** từ frontend | 🔴 Critical |
| TURN | Cluster geographically distributed | **Tắt hoàn toàn** | 🟡 Important |
| Codec | AV1 priority → H264 → VP8 | Tất cả enabled nhưng **không có priority logic** | 🟡 Important |
| PLI Throttle | Tuned per stream type | DefaultPLIThrottleConfig (chưa tuned) | 🟡 Important |
| Capture Resolution | Adaptive 360p→1080p | **Fixed h720** | 🟡 Important |
| Packet Buffer | Optimized per codec | Video 500, Audio 200 (default) | 🟢 Minor |
| DynacastPauseDelay | Aggressive | 5s (default) | 🟢 Minor |

---

## 2. Tier 1 — Critical (làm trước, impact lớn nhất)

### 2.1 Enable Send-Side Bandwidth Estimation (BWE)

**Vấn đề:** Hiện tại `UseSendSideBWE: false`. Khi tắt, server dùng receive-side estimation — kém chính xác hơn vì receiver không biết packet departure time chính xác từ phía sender.

**Logic cần bật:**
- `CongestionControl.UseSendSideBWE = true`
- `CongestionControl.AllowPause = true` — cho phép SFU tạm dừng stream khi bandwidth quá thấp thay vì giữ stream chất lượng kém
- `CongestionControl.ProbeMode = ProbeModeMedia` — probe bandwidth qua media packet thay vì padding riêng (ít overhead hơn)

**Tác động:** SFU sẽ track departure time của từng packet, kết hợp TWCC feedback để tính chính xác available bandwidth. Giảm rebuffering, video sẽ drop quality trước khi freeze.

**Cấu hình trong config.yaml:**
```yaml
rtc:
  congestion_control:
    enabled: true
    allow_pause: true
    use_send_side_bwe: true
    probe_mode: media
```

### 2.2 Enable Simulcast 3 Quality Layers từ Frontend

**Vấn đề:** Frontend publish video với `videoCaptureDefaults: h720` cố định. Dynacast bật nhưng nếu chỉ có 1 layer thì SFU không có gì để lựa chọn — Dynacast vô nghĩa.

**Logic cần implement:**

Khi publish video, livekit-client cần được cấu hình để publish **3 simulcast layers**:
- **Layer 0 (low):** 320×180, 150 kbps, 15 fps
- **Layer 1 (medium):** 640×360, 500 kbps, 30 fps
- **Layer 2 (high):** 1280×720, 1500 kbps, 30 fps

Các thông số này được pass vào `publishTrack()` hoặc `setCameraEnabled()` qua `VideoPreset` với `simulcast: true`.

**Resolution capture:** Capture ở max resolution (1080p hoặc nguồn thực tế) rồi để browser scale down cho các layer thấp. Không capture fixed 720p vì:
- Nếu user có camera 1080p, bỏ phí
- Các layer simulcast phải được scale từ source, không thể upscale

**Capture config trong frontend:**
```
source: camera
captureWidth: 1920 (hoặc max của camera)
captureHeight: 1080
scalabilityMode: L3T1 (3 spatial layers, 1 temporal layer)
```

**Tác động:** SFU có thể gửi layer phù hợp cho từng subscriber. User mạng yếu nhận 180p, user mạng tốt nhận 720p — cùng lúc, từ cùng 1 publisher.

### 2.3 Stream Allocator Tuning

**Logic:** Stream Allocator quyết định tổng bandwidth allocation giữa các stream. Cần set:
- `MinChannelCapacity`: bandwidth tối thiểu đảm bảo cho audio (không bao giờ drop audio)
- Priority: audio > screen share > camera video
- `ChannelCapacityProbeInterval`: tần suất probe tăng bandwidth sau khi đã giảm

Với audio: Opus 20-32 kbps là đủ. Allocator phải reserve ít nhất 40 kbps/participant cho audio trước khi phân bổ phần còn lại cho video.

---

## 3. Tier 2 — Important (làm sau Tier 1)

### 3.1 PLI Throttle Tuning

**Vấn đề:** PLI (Picture Loss Indication) là request từ receiver yêu cầu re-encode keyframe. Nếu không throttle, mạng kém → nhiều PLI → encoder bị flood → CPU spike → quality tệ hơn.

**Logic tuning:**
- Camera stream: min 2s giữa các PLI (keyframe interval của encoder thường 2-4s)
- Screen share: min 1s (content thay đổi ít, keyframe nhẹ hơn)
- Low quality layer: min 3s (ít quan trọng hơn)

```yaml
rtc:
  pli_throttle:
    low_quality: 3s
    mid_quality: 2s
    high_quality: 1.5s
```

### 3.2 TURN Server Setup

**Vấn đề:** Không có TURN → user sau symmetric NAT hoặc firewall corporate không kết nối được WebRTC trực tiếp. Ước tính ~15-20% user gặp vấn đề này.

**Logic:**
- Deploy coturn hoặc LiveKit's built-in TURN (port 3478 UDP/TCP, port 443 TLS)
- TURN TLS trên port 443 bypass hầu hết firewall corporate
- LiveKit có `RTCConfig.TURNServers` — cấu hình danh sách TURN credential

**Priority:** UDP TURN (nhanh) → TCP TURN → TLS TURN (chậm nhất nhưng vượt firewall tốt nhất)

**Credential:** Dùng time-limited TURN credential (HMAC-based) để tránh lạm dụng. LiveKit hỗ trợ sẵn.

### 3.3 Adaptive Codec Selection

**Logic:** Không phải cứ enable tất cả codec là tốt. Browser negotiate theo thứ tự, thứ tự phải được chỉ định rõ:

**Ưu tiên codec (từ cao đến thấp):**
1. **AV1** — nếu cả sender và receiver support hardware encode/decode. Hiệu quả gấp 2x VP9. Check: `RTCRtpSender.getCapabilities('video').codecs` bao gồm AV1.
2. **H264 (Baseline/Main profile)** — hardware support rộng nhất, mobile tốt. Dùng khi AV1 không available.
3. **VP9** — software encode tốt hơn VP8, nhưng CPU nặng hơn H264 trên hardware.
4. **VP8** — fallback cuối, tương thích rộng nhất.

**Detection logic trong frontend:**
- Query browser capabilities trước khi publish
- Nếu `AV1` trong capabilities và GPU mid-range+: prefer AV1
- Fallback chain: AV1 → H264 → VP9 → VP8

**Lưu ý:** Screen share nên dùng VP9 hoặc AV1 vì content screen share có nhiều vùng đồng nhất (text, UI) — các codec này encode hiệu quả hơn H264 cho loại content này.

### 3.4 Packet Buffer Optimization

**Logic:**
- Video: 500 packets — đủ cho 720p@30fps với jitter ~100ms. Có thể tăng lên 1000 nếu server RAM dư.
- Audio: 200 packets — Opus gói 20ms/packet, 200 packets = 4s jitter buffer. Đủ cho mạng bình thường.
- Screen share: cần buffer lớn hơn vì keyframe lớn hơn — `PacketBufferSizeVideo` áp dụng cho tất cả video kể cả screen share.

---

## 4. Tier 3 — Nice-to-Have (làm khi Tier 1+2 ổn định)

### 4.1 Adaptive Capture Resolution từ Frontend

**Logic:** Thay vì capture cố định, frontend điều chỉnh capture resolution dựa trên estimated upload bandwidth:
- BWE > 2 Mbps: capture 1080p
- BWE 1-2 Mbps: capture 720p
- BWE 500k-1M: capture 360p
- BWE < 500k: capture 180p + giảm framerate còn 15fps

Đây là "input adaptation" — giảm tải cho encoder trước khi gửi lên, khác với simulcast (publish nhiều layer từ 1 input).

**Livekit-client API:** `LocalTrack.setPublishingQuality()` hoặc subscribe vào `room.engine.publishVideoQuality` event để biết SFU đang request quality gì.

### 4.2 Dynacast Pause Delay Tuning

**Hiện tại:** `DynacastPauseDelay: 5s` — nghĩa là SFU chờ 5s sau khi subscriber cuối cùng dừng subscribe layer X mới pause publisher layer đó.

**Logic tuning:**
- High quality layer: 3s (nhanh tay giải phóng bandwidth)
- Medium quality layer: 5s (giữ sẵn)
- Low quality layer: 8s (ít tốn kém, giữ lâu hơn)

Nếu `DynacastPauseDelay` là global setting (không per-layer), set về 3s để optimize bandwidth.

### 4.3 RED (Redundant Encoding) cho Audio

**Hiện tại:** RED được enable trong codec list nhưng chưa verify được dùng hay không.

**Logic:** RED là forward error correction cho Opus — mỗi packet audio chứa cả packet trước đó. Nếu packet bị lost, receiver có thể recover từ packet tiếp theo. Tăng bandwidth ~2x nhưng audio cực kỳ ổn định dưới mạng 20% packet loss.

**Điều kiện bật RED:** Chỉ bật khi subscriber đang mất packet > 5%. SFU phải detect loss rate per-subscriber và chỉ bật RED cho subscriber đó, không bật global.

### 4.4 Bandwidth Probing Strategy

**Logic:** Sau khi bandwidth giảm do congestion, SFU cần probe để tìm lại available bandwidth. Quá trình:
1. Giảm bitrate khi detect congestion (TWCC feedback)
2. Giữ bitrate thấp 2-5s để network recover
3. Tăng dần 10% mỗi probe interval cho đến khi congestion tái xuất hiện hoặc đạt target
4. Target = 90% estimated available BW (để có headroom)

`ProbeMode: ProbeModeMedia` — probe qua real media packets, không padding riêng. Phù hợp vì stream media liên tục.

---

## 5. Frontend Implementation Notes (không phải code mẫu)

### 5.1 Simulcast Configuration khi Publish

Khi gọi `setCameraEnabled(true)` hoặc publish track thủ công, cần pass `VideoPublishOptions` với:
- `simulcast: true`
- `videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360, VideoPresets.h720]`
- `backupCodec: true` (fallback VP8 nếu AV1/H264 fail)

### 5.2 Codec Preference Detection

Flow:
1. Query `RTCRtpSender.getCapabilities('video').codecs`
2. Sort theo priority: AV1 > H264 > VP9 > VP8
3. Pass preferred codec list vào Room options: `publishDefaults.videoCodec`

### 5.3 Bandwidth Monitoring UI (optional)

LiveKit client emit `ConnectionQualityChanged` event với quality score. Có thể hiển thị:
- Signal bar icon (excellent/good/poor/lost)
- Estimated bitrate (nếu cần debug)

Stream-HUB đã có `connectionQualities` state — chỉ cần render icon phù hợp.

### 5.4 Screen Share Optimization

Screen share cần config khác camera:
- **Codec:** VP9 hoặc AV1 (content-based)
- **Framerate:** 5-15fps (màn hình thường không cần 30fps)
- **Bitrate:** 1-2 Mbps target, 3 Mbps max
- **Simulcast:** Không cần cho screen share — 1 quality là đủ, SFU scale resolution cho subscriber

---

## 6. Implementation Order (Priority Queue)

```
PHASE 1 (tuần 1):
  [Backend] Enable UseSendSideBWE + AllowPause trong config.yaml
  [Backend] Tune PLI throttle values
  [Frontend] Enable simulcast 3 layers khi publish camera
  [Frontend] Capture ở max resolution thay vì fixed 720p

PHASE 2 (tuần 2-3):
  [Backend] Setup TURN server (coturn hoặc LiveKit built-in)
  [Frontend] Implement codec preference detection + AV1 priority
  [Frontend] Screen share specific config (VP9, 15fps)

PHASE 3 (sau khi PHASE 1+2 ổn định ≥ 2 tuần):
  [Backend] DynacastPauseDelay tuning
  [Backend] RED per-subscriber based on loss rate
  [Frontend] Adaptive capture resolution based on BWE
  [Frontend] Bandwidth/quality indicator UI
```

---

## 7. Monitoring & Validation

Sau mỗi phase, validate bằng:

1. **WebRTC Internals** (`chrome://webrtc-internals`): Kiểm tra simulcast layers đang được publish (phải thấy 3 SSRC cho camera), TWCC feedback frequency, estimated bitrate graph
2. **LiveKit Dashboard** (nếu có): Subscriber quality distribution, layer switching frequency
3. **Network throttling test**: Chrome DevTools → Network → throttle xuống 500kbps → video phải drop quality thay vì freeze
4. **Packet loss test**: Dùng `tc netem` trên Linux hoặc Clumsy trên Windows để simulate 10-20% packet loss → audio không drop nếu RED hoạt động

---

## 8. Risks & Mitigations

| Risk | Khả năng | Mitigation |
|---|---|---|
| CPU tăng mạnh khi encode 3 simulcast layers | Medium | Client-side: disable high layer trên máy yếu. Server: dynacast tắt layer không dùng |
| AV1 không support trên một số browser | Low (Chrome/Edge ok, Firefox ok từ 2024) | Fallback chain tự động |
| TURN server bị abuse | Low | Time-limited HMAC credential, rate limit per IP |
| AllowPause làm video freeze momentarily | Medium | Pause chỉ khi bandwidth cực thấp, resume ngay khi bandwidth recover. Thông báo UI "connection unstable" |
| SendSideBWE conflict với receiver-side estimate | Low | LiveKit xử lý nội bộ, không conflict |

---

*Tài liệu này mô tả logic và cấu hình — không chứa code mẫu. Implementation theo từng phase, validate trước khi sang phase tiếp.*
