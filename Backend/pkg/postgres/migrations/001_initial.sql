CREATE TABLE IF NOT EXISTS users (
    username      VARCHAR(255) PRIMARY KEY,
    password_hash TEXT NOT NULL,
    display_name  VARCHAR(255) DEFAULT '',
    avatar        VARCHAR(50) DEFAULT '',
    avatar_x      DOUBLE PRECISION DEFAULT 0,
    avatar_y      DOUBLE PRECISION DEFAULT 0,
    avatar_scale  DOUBLE PRECISION DEFAULT 0,
    created_at    BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id         VARCHAR(64) PRIMARY KEY,
    room_name  VARCHAR(255) NOT NULL,
    sender     VARCHAR(255) NOT NULL,
    text       TEXT NOT NULL DEFAULT '',
    timestamp  BIGINT NOT NULL,
    reply_to   VARCHAR(64) DEFAULT '',
    reply_text TEXT DEFAULT '',
    file_id    VARCHAR(64) DEFAULT '',
    file_name  VARCHAR(255) DEFAULT '',
    file_size  BIGINT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_chat_room_ts ON chat_messages(room_name, timestamp DESC);

CREATE TABLE IF NOT EXISTS file_metadata (
    id         VARCHAR(64) PRIMARY KEY,
    room_name  VARCHAR(255) NOT NULL,
    sender     VARCHAR(255) NOT NULL,
    file_name  VARCHAR(255) NOT NULL,
    file_size  BIGINT NOT NULL DEFAULT 0,
    mime_type  VARCHAR(128) DEFAULT '',
    timestamp  BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_files_room ON file_metadata(room_name, timestamp DESC);

CREATE TABLE IF NOT EXISTS share_links (
    code       VARCHAR(64) PRIMARY KEY,
    room_name  VARCHAR(255) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_share_room ON share_links(room_name);
