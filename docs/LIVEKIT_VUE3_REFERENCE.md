# Stream-HUB - Tài liệu tham khảo LiveKit & Vue 3

> Tài liệu thu thập các kiến thức cần thiết để phát triển dự án Stream-HUB.
> Cập nhật: 2026-03-17

---

## Mục lục

- [1. Tổng quan dự án](#1-tổng-quan-dự-án)
- [2. LiveKit Server (Backend - Go)](#2-livekit-server-backend---go)
- [3. LiveKit Client SDK (JavaScript)](#3-livekit-client-sdk-javascript)
- [4. Vue 3 (Frontend)](#4-vue-3-frontend)
- [5. Vue Router 4](#5-vue-router-4)
- [6. Tailwind CSS](#6-tailwind-css)
- [7. Cấu hình & Triển khai](#7-cấu-hình--triển-khai)
- [8. Tài liệu chính thức](#8-tài-liệu-chính-thức)

---

## 1. Tổng quan dự án

### Kiến trúc

```
Stream-HUB/
├── Backend/          # LiveKit Server (Go 1.24+)
│   ├── cmd/server/   # Entry point
│   ├── pkg/
│   │   ├── config/   # Cấu hình server
│   │   ├── rtc/      # WebRTC core (rooms, tracks, participants)
│   │   ├── sfu/      # Selective Forwarding Unit (media routing)
│   │   ├── service/  # HTTP handlers, auth, room management
│   │   ├── routing/  # Message routing & node management
│   │   └── telemetry/# Metrics & webhooks
│   └── config-sample.yaml
│
├── Frontend/         # Vue 3 + Vite
│   ├── src/
│   │   ├── components/   # AuthInput, AuthLayout
│   │   ├── views/        # Login, Register, Home
│   │   ├── router/       # Vue Router config
│   │   ├── services/     # API calls (auth.js)
│   │   └── main.js       # App entry
│   └── vite.config.js
│
└── docs/             # Tài liệu
```

### Tech Stack

| Layer    | Công nghệ                                           |
| -------- | ---------------------------------------------------- |
| Backend  | Go 1.24+, Pion WebRTC v4, Redis, JWT, Protobuf      |
| Frontend | Vue 3.5, Vite 7, Vue Router 4, Tailwind CSS 4       |
| Protocol | WebRTC (UDP/TCP), WebSocket (signaling), Twirp (RPC) |
| Auth     | JWT tokens, bcrypt password hashing                  |

### Ports mặc định

| Port        | Mục đích                   |
| ----------- | -------------------------- |
| 7880        | HTTP/WebSocket signaling   |
| 7881        | WebRTC TCP fallback        |
| 50000-60000 | WebRTC media (UDP)         |
| 6789        | Prometheus metrics (tùy chọn) |

---

## 2. LiveKit Server (Backend - Go)

### 2.1 Access Token (JWT)

Token là cách LiveKit xác thực và phân quyền cho participant khi join room.

**Cấu trúc token:**

```json
{
  "exp": 1234567890,        // Thời gian hết hạn
  "iss": "API_KEY",          // API key phát hành token
  "sub": "user-identity",   // Định danh participant
  "video": {                // Quyền trong room
    "room": "my-room",
    "roomJoin": true,
    "canPublish": true,
    "canPublishData": true,
    "canSubscribe": true,
    "roomAdmin": false
  }
}
```

**Tạo token (Go):**

```go
import "github.com/livekit/protocol/auth"

func getJoinToken(apiKey, apiSecret, room, identity string) (string, error) {
    at := auth.NewAccessToken(apiKey, apiSecret)
    videoGrant := &auth.VideoGrant{
        RoomJoin: true,
        Room:     room,
    }
    at.SetVideoGrant(videoGrant).
        SetIdentity(identity).
        SetValidFor(time.Hour)
    return at.ToJWT()
}
```

**Tạo token (JavaScript/Node.js):**

```javascript
import { AccessToken } from 'livekit-server-sdk';

const at = new AccessToken('api-key', 'secret-key', {
    identity: 'user-name',
});
at.addGrant({
    room: 'my-room',
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
});
const token = await at.toJwt();
```

**Bảng quyền (Video Grant):**

| Permission       | Mô tả                                  |
| ---------------- | --------------------------------------- |
| `roomJoin`       | Cho phép join room                      |
| `canPublish`     | Cho phép publish audio/video tracks     |
| `canPublishData` | Cho phép gửi data messages              |
| `canSubscribe`   | Cho phép nhận tracks từ người khác      |
| `roomAdmin`      | Quyền quản trị room (kick, mute, etc.) |
| `room`           | Tên room cụ thể                        |

> **Lưu ý:** Token expiration chỉ ảnh hưởng kết nối ban đầu, không ảnh hưởng reconnect.

### 2.2 Room Management API

**Khởi tạo RoomServiceClient (Go):**

```go
import lksdk "github.com/livekit/server-sdk-go"

host := "https://my.livekit.host"
roomClient := lksdk.NewRoomServiceClient(host, "api-key", "secret-key")
```

**Tạo room:**

```go
room, _ := roomClient.CreateRoom(context.Background(), &livekit.CreateRoomRequest{
    Name:            "myroom",
    EmptyTimeout:    10 * 60,  // 10 phút timeout khi trống
    MaxParticipants: 20,
})
```

**Liệt kê rooms:**

```go
rooms, _ := roomClient.ListRooms(context.Background(), &livekit.ListRoomsRequest{})
```

**Xóa room:**

```go
roomClient.DeleteRoom(context.Background(), &livekit.DeleteRoomRequest{
    Room: "myroom",
})
// Xóa room sẽ ngắt kết nối tất cả participants
```

### 2.3 Webhook Events

| Event                             | Mô tả                                    |
| --------------------------------- | ----------------------------------------- |
| `room_started`                    | Participant đầu tiên join room trống      |
| `room_finished`                   | Room đóng (timeout hoặc xóa thủ công)    |
| `participant_joined`              | Participant kết nối media thành công       |
| `participant_left`                | Participant rời room                       |
| `participant_connection_aborted`  | Kết nối thất bại bất ngờ                  |
| `track_published`                 | Participant publish track                  |
| `track_unpublished`               | Participant unpublish track                |
| `egress_started/updated/ended`    | Recording/streaming lifecycle              |
| `ingress_started/ended`           | External stream lifecycle                  |

**Xác thực webhook (Node.js):**

```javascript
const { WebhookReceiver } = require('livekit-server-sdk');
const receiver = new WebhookReceiver('apikey', 'apisecret');
const event = await receiver.receive(req.body, req.get('Authorization'));
```

### 2.4 Custom User Auth (Stream-HUB)

Stream-HUB thêm hệ thống auth riêng ngoài LiveKit API keys:

- **`/auth/register`** - Đăng ký user (bcrypt hash password, lưu Redis)
- **`/auth/login`** - Đăng nhập (verify password, trả JWT token)
- **UserStore** - Redis-backed hoặc in-memory fallback
- File: `Backend/pkg/service/userauthservice.go`

---

## 3. LiveKit Client SDK (JavaScript)

### 3.1 Cài đặt

```bash
npm install livekit-client
```

### 3.2 Kết nối Room

```javascript
import { Room, RoomEvent } from 'livekit-client';

const room = new Room();

// Kết nối tới LiveKit server
await room.connect('ws://localhost:7880', token);

// Truy cập participants
console.log('Local:', room.localParticipant);
console.log('Remote:', room.remoteParticipants); // Map

// Ngắt kết nối
room.disconnect();
```

### 3.3 Publish Tracks (Camera/Microphone)

```javascript
// Bật camera
room.localParticipant.setCameraEnabled(true);

// Bật microphone
room.localParticipant.setMicrophoneEnabled(true);

// Kiểm soát ai được subscribe track của mình
room.localParticipant.setTrackSubscriptionPermissions(false, [
    { participantIdentity: 'allowed-user', allowAll: true },
]);
```

### 3.4 Room Events

```javascript
// Participant mới join
room.on(RoomEvent.ParticipantConnected, (participant) => {
    console.log(`${participant.identity} joined`);
});

// Participant rời room
room.on(RoomEvent.ParticipantDisconnected, (participant) => {
    console.log(`${participant.identity} left`);
});

// Subscribe track mới (nhận video/audio từ người khác)
room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    if (track.kind === 'video') {
        const element = track.attach(); // Tạo <video> element
        document.getElementById('videos').appendChild(element);
    }
    if (track.kind === 'audio') {
        const element = track.attach(); // Tạo <audio> element
        document.body.appendChild(element);
    }
});

// Track bị unsubscribe
room.on(RoomEvent.TrackUnsubscribed, (track) => {
    track.detach().forEach((el) => el.remove());
});

// Active speakers thay đổi
room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
    console.log('Active speakers:', speakers.map(s => s.identity));
});

// Nhận data message
room.on(RoomEvent.DataReceived, (data, participant) => {
    const message = new TextDecoder().decode(data);
    console.log(`${participant.identity}: ${message}`);
});

// Kết nối lại
room.on(RoomEvent.Reconnecting, () => console.log('Reconnecting...'));
room.on(RoomEvent.Reconnected, () => console.log('Reconnected!'));
room.on(RoomEvent.Disconnected, () => console.log('Disconnected'));
```

**Bảng Room Events đầy đủ:**

| Event                              | Mô tả                                         |
| ---------------------------------- | ---------------------------------------------- |
| `ParticipantConnected`             | Remote participant join room                   |
| `ParticipantActive`                | Media connection established (JS SDK only)     |
| `ParticipantDisconnected`          | Remote participant rời room                    |
| `TrackPublished`                   | Remote track mới được publish                  |
| `TrackUnpublished`                 | Remote track bị unpublish                      |
| `TrackSubscribed`                  | Subscribe thành công remote track              |
| `TrackUnsubscribed`                | Unsubscribe track                              |
| `TrackMuted`                       | Track bị mute (local + remote)                 |
| `TrackUnmuted`                     | Track bị unmute                                |
| `LocalTrackPublished`              | Local track publish thành công                 |
| `LocalTrackUnpublished`            | Local track bị unpublish                       |
| `ActiveSpeakersChanged`            | Danh sách người đang nói thay đổi              |
| `ConnectionQualityChanged`         | Chất lượng kết nối thay đổi                    |
| `RoomMetadataChanged`              | Metadata room thay đổi                         |
| `DataReceived`                     | Nhận data từ participant khác                  |
| `Reconnecting`                     | Đang thử kết nối lại                          |
| `Reconnected`                      | Kết nối lại thành công                         |
| `Disconnected`                     | Ngắt kết nối hoàn toàn                        |
| `TrackStreamStateChanged`          | Stream state thay đổi (paused/resumed)         |
| `ParticipantPermissionsChanged`    | Quyền participant thay đổi                     |

### 3.5 Data Exchange (5 phương thức)

| Phương thức      | Mô tả                                                    | Use case                          |
| ---------------- | --------------------------------------------------------- | --------------------------------- |
| Text Streams     | Gửi text với auto chunking, topic-based routing           | Chat, LLM responses               |
| Byte Streams     | Transfer binary data với progress tracking                | File sharing, images               |
| RPC              | Gọi method trên participant khác và nhận response         | AI agent tool calls, UI control    |
| Data Packets     | Low-level API: reliable hoặc lossy delivery               | High-frequency updates, game state |
| State Sync       | Đồng bộ participant attributes & room metadata            | Presence, shared config            |

---

## 4. Vue 3 (Frontend)

### 4.1 Composition API (Script Setup)

Stream-HUB sử dụng `<script setup>` syntax - cách viết Vue 3 hiện đại nhất:

```vue
<script setup>
import { ref, computed, onMounted, watch } from 'vue'

// Reactive state
const count = ref(0)
const username = ref('')

// Computed property
const greeting = computed(() => `Hello, ${username.value}!`)

// Methods
function increment() {
    count.value++
}

// Lifecycle hook
onMounted(() => {
    console.log('Component mounted')
})

// Watcher
watch(username, (newVal, oldVal) => {
    console.log(`Username changed: ${oldVal} -> ${newVal}`)
})
</script>

<template>
    <div>
        <p>{{ greeting }}</p>
        <button @click="increment">Count: {{ count }}</button>
    </div>
</template>
```

### 4.2 Reactivity System

| API              | Mô tả                                          | Khi nào dùng                     |
| ---------------- | ----------------------------------------------- | -------------------------------- |
| `ref()`          | Reactive reference cho giá trị đơn              | Primitives, đơn giản             |
| `reactive()`     | Reactive object (deep)                          | Objects phức tạp                 |
| `computed()`     | Giá trị tính toán tự động                       | Derived state                    |
| `watch()`        | Theo dõi thay đổi cụ thể                       | Side effects                     |
| `watchEffect()`  | Tự chạy khi dependencies thay đổi              | Auto-tracking side effects       |
| `toRef()`        | Chuyển property của reactive thành ref          | Destructuring reactive objects   |
| `toRefs()`       | Chuyển tất cả properties thành refs             | Spread reactive objects          |
| `shallowRef()`   | Ref không deep reactive                         | Large objects, performance       |

### 4.3 Lifecycle Hooks

```
setup()                    ← Composition API chạy ở đây
    ↓
onBeforeMount()
    ↓
onMounted()                ← DOM đã sẵn sàng, gọi API ở đây
    ↓
onBeforeUpdate()
    ↓
onUpdated()                ← DOM đã cập nhật
    ↓
onBeforeUnmount()
    ↓
onUnmounted()              ← Cleanup: remove listeners, timers
```

### 4.4 Component Communication

**Props (Parent → Child):**

```vue
<!-- Parent -->
<AuthInput v-model="username" label="Username" type="text" />

<!-- Child (AuthInput.vue) -->
<script setup>
const props = defineProps({
    modelValue: String,
    label: String,
    type: { type: String, default: 'text' },
    placeholder: String,
    icon: Object,
})
const emit = defineEmits(['update:modelValue'])
</script>
```

**v-model (Two-way binding):**

```vue
<script setup>
const model = defineModel()  // Vue 3.4+
// Hoặc cách cũ:
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])
</script>
```

**Provide/Inject (Deep passing):**

```vue
<!-- Ancestor -->
<script setup>
import { provide } from 'vue'
provide('theme', 'dark')
</script>

<!-- Descendant -->
<script setup>
import { inject } from 'vue'
const theme = inject('theme', 'light') // 'light' = default
</script>
```

### 4.5 Built-in Directives

| Directive                | Mô tả                          | Ví dụ                                  |
| ------------------------ | ------------------------------- | --------------------------------------- |
| `v-if / v-else-if / v-else` | Conditional rendering       | `<p v-if="show">Visible</p>`           |
| `v-show`                 | Toggle CSS display              | `<p v-show="show">Toggle</p>`          |
| `v-for`                  | List rendering                  | `<li v-for="item in items" :key="item.id">` |
| `v-bind` (`:`)          | Bind attribute                  | `:class="{ active: isActive }"`        |
| `v-on` (`@`)            | Event listener                  | `@click="handleClick"`                 |
| `v-model`               | Two-way binding                 | `<input v-model="text">`               |
| `v-slot` (`#`)          | Named/scoped slots              | `<template #header>`                   |

### 4.6 Built-in Components

| Component          | Mô tả                                     |
| ------------------ | ------------------------------------------ |
| `<Transition>`     | Animation khi element xuất hiện/biến mất   |
| `<TransitionGroup>`| Animation cho danh sách                    |
| `<KeepAlive>`      | Cache component instances                  |
| `<Teleport>`       | Render content ở vị trí khác trong DOM     |
| `<Suspense>`       | Xử lý async component loading              |

---

## 5. Vue Router 4

### 5.1 Cấu hình cơ bản

```javascript
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: HomeView },
        { path: '/login', component: LoginView },
        { path: '/register', component: RegisterView },
        {
            path: '/room/:id',           // Dynamic route
            component: RoomView,
            meta: { requiresAuth: true }, // Route meta
        },
    ],
})
```

### 5.2 Navigation Guards

```javascript
// Global guard - kiểm tra auth trước mỗi route
router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token')
    if (to.meta.requiresAuth && !token) {
        next('/login')
    } else {
        next()
    }
})
```

### 5.3 Programmatic Navigation

```javascript
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// Navigate
router.push('/room/123')
router.push({ name: 'room', params: { id: '123' } })
router.replace('/login')  // Không tạo history entry
router.go(-1)              // Quay lại

// Đọc route params
console.log(route.params.id)
console.log(route.query.search)
console.log(route.meta.requiresAuth)
```

### 5.4 Nested Routes

```javascript
{
    path: '/dashboard',
    component: DashboardLayout,
    children: [
        { path: '', component: DashboardHome },           // /dashboard
        { path: 'rooms', component: RoomList },            // /dashboard/rooms
        { path: 'settings', component: SettingsView },     // /dashboard/settings
    ]
}
```

### 5.5 History Modes

| Mode                    | URL format              | Cần server config? |
| ----------------------- | ----------------------- | ------------------- |
| `createWebHistory()`    | `/path/to/page`         | Có (SPA fallback)   |
| `createWebHashHistory()`| `/#/path/to/page`       | Không                |
| `createMemoryHistory()` | Không có URL             | Testing only         |

---

## 6. Tailwind CSS

### Cấu hình trong dự án

Stream-HUB sử dụng Tailwind CSS v4 với Vite plugin:

```javascript
// vite.config.js
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [vue(), tailwindcss()],
})
```

### Các class hay dùng trong dự án

```html
<!-- Layout -->
<div class="min-h-screen flex items-center justify-center">
<div class="grid grid-cols-2 gap-4">
<div class="hidden lg:flex">  <!-- Responsive: ẩn trên mobile -->

<!-- Spacing -->
<div class="p-6 m-4 space-y-4">

<!-- Typography -->
<h1 class="text-3xl font-bold text-white">
<p class="text-sm text-gray-400">

<!-- Colors (Indigo theme) -->
<button class="bg-indigo-600 hover:bg-indigo-700 text-white">
<div class="border-indigo-500 focus:ring-indigo-500">

<!-- States -->
<input class="focus:ring-2 focus:border-indigo-500">
<button class="hover:bg-indigo-700 disabled:opacity-50">

<!-- Transitions -->
<div class="transition-all duration-300 ease-in-out">
```

---

## 7. Cấu hình & Triển khai

### 7.1 LiveKit Server Config (config-sample.yaml)

```yaml
# Ports
port: 7880
bind_addresses:
    - ""

# Redis (bắt buộc cho distributed mode)
redis:
    address: localhost:6379

# WebRTC
rtc:
    port_range_start: 50000
    port_range_end: 60000
    tcp_port: 7881
    use_external_ip: true        # Bắt buộc trên cloud

# TURN server (tăng khả năng kết nối qua firewall)
turn:
    enabled: true
    tls_port: 5349
    domain: turn.myhost.com
    cert_file: /path/to/turn.crt
    key_file: /path/to/turn.key

# API keys
keys:
    my-api-key: my-secret-key

# Logging
logging:
    level: info
    pion_level: error
```

### 7.2 SSL/TLS

- **Bắt buộc** dùng SSL certificate từ trusted CA (self-signed không hoạt động)
- Cần reverse proxy (nginx/caddy) hoặc load balancer để terminate SSL
- WebSocket connection: `wss://` thay vì `ws://`

### 7.3 Docker Deployment

```dockerfile
# Sử dụng host networking cho performance tối ưu
docker run -d \
    --network host \
    -v /path/to/config.yaml:/etc/livekit.yaml \
    livekit/livekit-server \
    --config /etc/livekit.yaml
```

### 7.4 Production Recommendations

- Minimum 10Gbps ethernet
- Compute-optimized instance types (CPU + bandwidth intensive)
- Redis cho distributed state
- Prometheus + Grafana cho monitoring (dashboards có sẵn trong `Backend/deploy/`)

---

## 8. Tài liệu chính thức

### LiveKit

| Tài liệu                    | URL                                                        |
| ---------------------------- | ---------------------------------------------------------- |
| LiveKit Docs (tổng quan)     | https://docs.livekit.io                                    |
| Realtime SDK                 | https://docs.livekit.io/realtime/                          |
| Server SDK (Go)              | https://pkg.go.dev/github.com/livekit/server-sdk-go        |
| Server SDK (JS)              | https://www.npmjs.com/package/livekit-server-sdk            |
| Client SDK (JS)              | https://www.npmjs.com/package/livekit-client                |
| Protocol (protobuf)          | https://github.com/livekit/protocol                         |
| Token Generation             | https://docs.livekit.io/home/server/generating-tokens/      |
| Room Management              | https://docs.livekit.io/home/server/managing-rooms/         |
| Client Events                | https://docs.livekit.io/realtime/client/events/             |
| Data Messages                | https://docs.livekit.io/realtime/client/data-messages/      |
| Self-hosting                 | https://docs.livekit.io/home/self-hosting/deployment/       |
| GitHub (server source)       | https://github.com/livekit/livekit                          |

### Vue 3

| Tài liệu                    | URL                                                        |
| ---------------------------- | ---------------------------------------------------------- |
| Vue 3 Guide                  | https://vuejs.org/guide/introduction.html                  |
| Vue 3 API Reference          | https://vuejs.org/api/                                     |
| Composition API              | https://vuejs.org/guide/extras/composition-api-faq.html    |
| Reactivity Fundamentals      | https://vuejs.org/guide/essentials/reactivity-fundamentals |
| Lifecycle Hooks              | https://vuejs.org/guide/essentials/lifecycle               |
| Component Basics             | https://vuejs.org/guide/essentials/component-basics        |
| Template Syntax              | https://vuejs.org/guide/essentials/template-syntax         |
| Composables                  | https://vuejs.org/guide/reusability/composables            |
| Vue Router 4                 | https://router.vuejs.org/guide/                            |
| Vite                         | https://vite.dev/guide/                                    |

### Thư viện hỗ trợ

| Thư viện           | URL                                              | Vai trò               |
| ------------------ | ------------------------------------------------ | --------------------- |
| Tailwind CSS       | https://tailwindcss.com/docs                     | Utility-first CSS     |
| Lucide Icons       | https://lucide.dev/icons/                        | SVG icon library      |
| Pion WebRTC        | https://github.com/pion/webrtc                   | Go WebRTC library     |
| Redis              | https://redis.io/docs/                           | Distributed state     |

---

## Ghi chú phát triển

### Luồng hoạt động chính

```
1. User mở Frontend (Vue 3)
2. Đăng ký/Đăng nhập → POST /auth/register hoặc /auth/login
3. Backend trả JWT token → Frontend lưu localStorage
4. User muốn join room:
   a. Frontend gọi API tạo LiveKit access token (với room + identity)
   b. Frontend dùng livekit-client SDK connect tới ws://localhost:7880
   c. LiveKit Server xử lý WebRTC signaling
   d. Media flows qua UDP (50000-60000) hoặc TCP fallback (7881)
5. Trong room: publish/subscribe tracks, gửi data messages
6. Disconnect: room.disconnect()
```

### Những thứ cần phát triển tiếp

- [ ] Tích hợp `livekit-client` SDK vào Frontend Vue 3
- [ ] Trang Room UI: video grid, controls (mute, camera, share screen)
- [ ] API endpoint tạo LiveKit access token cho authenticated users
- [ ] State management (Pinia) cho room state, participants
- [ ] Chat functionality (sử dụng LiveKit Text Streams hoặc Data Packets)
- [ ] Screen sharing
- [ ] Recording (Egress API)
- [ ] Responsive mobile layout
