-- Vidor Database Initialization Script
-- PostgreSQL schema for room and user management

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code VARCHAR(8) UNIQUE NOT NULL,
    name VARCHAR(255),
    creator_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    max_participants INTEGER DEFAULT 10,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    is_host BOOLEAN DEFAULT FALSE,
    settings JSONB DEFAULT '{}',
    UNIQUE(room_id, user_id)
);

-- Recordings table (for future feature)
CREATE TABLE IF NOT EXISTS recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
    recording_url TEXT,
    transcription_url TEXT,
    duration INTEGER, -- in seconds
    size_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'processing', -- processing, ready, failed
    metadata JSONB DEFAULT '{}'
);

-- Chat messages table (for persistence)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
    sender_name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_system BOOLEAN DEFAULT FALSE
);

-- Transcriptions table (for AI transcriptions)
CREATE TABLE IF NOT EXISTS transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
    session_id VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    confidence DECIMAL(5,4),
    timestamps JSONB, -- array of {start, end, text}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_final BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_creator ON rooms(creator_id);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_participants_room ON participants(room_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_room ON recordings(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_transcriptions_room ON transcriptions(room_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_session ON transcriptions(session_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- View for active rooms with participant count
CREATE OR REPLACE VIEW active_rooms AS
SELECT 
    r.*,
    COUNT(p.id) as participant_count
FROM rooms r
LEFT JOIN participants p ON r.id = p.room_id AND p.left_at IS NULL
WHERE r.is_active = TRUE
GROUP BY r.id;

-- Insert default admin user (optional)
-- INSERT INTO users (id, email, name, role) VALUES ('admin', 'admin@vidor.local', 'Admin', 'admin');

-- Grant permissions (adjust as needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vidor;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO vidor;
