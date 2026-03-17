CREATE TABLE IF NOT EXISTS rooms (
    name              VARCHAR(255) PRIMARY KEY,
    creator           VARCHAR(255) NOT NULL REFERENCES users(username),
    password_hash     TEXT DEFAULT '',
    lobby_enabled     BOOLEAN DEFAULT FALSE,
    max_participants  INT DEFAULT 0,
    description       TEXT DEFAULT '',
    status            VARCHAR(20) DEFAULT 'active',
    created_at        BIGINT NOT NULL,
    updated_at        BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rooms_creator ON rooms(creator);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

CREATE TABLE IF NOT EXISTS room_members (
    room_name   VARCHAR(255) NOT NULL REFERENCES rooms(name) ON DELETE CASCADE,
    username    VARCHAR(255) NOT NULL REFERENCES users(username),
    role        VARCHAR(20) DEFAULT 'member',
    joined_at   BIGINT NOT NULL,
    PRIMARY KEY (room_name, username)
);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(username);
