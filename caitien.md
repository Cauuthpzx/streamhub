Đây là danh sách đầy đủ — tôi sắp xếp theo mức ưu tiên và dependency:

Nhóm 1 — Nền tảng (làm trước):

Room tồn tại sau restart server (Redis persistence)
Phê duyệt trước khi vào phòng (waiting room / lobby)
Reply + Markdown cho room chat
Nhóm 2 — Chia sẻ:
4. Chia sẻ file qua room chat (upload + download)
5. Link chia sẻ + QR code tham gia room

Nhóm 3 — Đề xuất thêm:
6. Typing indicator — hiện "X đang nhập..." trong chat
7. Pin message — ghim tin nhắn quan trọng lên đầu chat
8. Room roles — host/moderator/viewer với quyền khác nhau (mute others, kick)
9. Breakout rooms — tách nhóm nhỏ từ room chính
10. Virtual background — blur/thay nền camera (TensorFlow.js hoặc MediaPipe)
11. Noise suppression — lọc tiếng ồn micro (RNNoise/Krisp-style)
12. Poll/Vote — tạo bình chọn nhanh trong room
13. Whiteboard — bảng vẽ chia sẻ real-time

Bạn muốn bắt đầu từ tính năng nào? Tôi đề xuất nhóm 1 trước vì nó là nền tảng cho các tính năng khác.




B. BACKEND CÓ — FRONTEND CHƯA TRIỂN KHAI
#	Tính năng	Backend endpoint	Frontend status
36	Upload file	POST /auth/upload	Service function có (uploadFile) nhưng UI chat chưa hiện file attachment
37	Download file	GET /auth/files/:roomName/:filename	Chưa có UI download
38	Danh sách file phòng	GET /auth/files/:roomName	listRoomFiles() định nghĩa nhưng không được gọi
39	Tạo share link	POST /auth/share-link	createShareLink() định nghĩa nhưng không được gọi
40	Lấy share link	GET /auth/share-link/:roomName	getShareLink() định nghĩa nhưng không được gọi
41	Resolve share link	GET /auth/share/:code	resolveShareLink() định nghĩa nhưng không được gọi
42	Agent management view	Twirp AgentDispatch (3 methods)	AgentView.vue tồn tại nhưng KHÔNG CÓ ROUTE
43	Egress management view	Twirp Egress (9 methods)	EgressView.vue tồn tại nhưng KHÔNG CÓ ROUTE
44	Ingress management view	Twirp Ingress (6 methods)	IngressView.vue tồn tại nhưng KHÔNG CÓ ROUTE
45	SIP management	Twirp SIP (17 methods)	Không có UI
46	WHIP/WHEP streaming	6 WHIP endpoints	Không có UI
C. TRONG CAITIEN.MD — CHƯA TRIỂN KHAI
#	Tính năng (theo roadmap)	Backend	Frontend
47	Redis persistence	Chưa rõ (LocalStore đang dùng)	N/A
48	Reply + Markdown chat	Chưa	Chưa
49	Share link + QR code	Backend CÓ (endpoint 39-41)	Chưa kết nối UI
50	Typing indicator	Chưa	Chưa
51	Pin message	Chưa	Chưa
52	Room roles (host/mod/guest)	Chưa	Chưa
53	Breakout rooms	Chưa	Chưa
54	Virtual background	Chưa	Chưa
55	Noise suppression	Chưa	Chưa
56	Poll / Vote	Chưa	Chưa
57	Whiteboard	Chưa	Chưa
Tổng kết:

35 tính năng đã triển khai đầy đủ
11 tính năng backend có nhưng frontend chưa kết nối/chưa có route
11 tính năng trong roadmap chưa triển khai (3 trong đó backend đã có sẵn endpoint)
Vấn đề cần xử lý ngay:

3 view (Agent/Egress/Ingress) tồn tại nhưng không có route → dead code hoặc cần thêm route
4 service function không được gọi → dead code hoặc cần kết nối UI
File sharing backend sẵn sàng nhưng frontend chưa có UI