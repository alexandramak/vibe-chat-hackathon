-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contacts table (mutual relationships)
CREATE TABLE contacts (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, accepted, blocked
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, contact_id),
    CHECK (user_id != contact_id)
);

-- Chat rooms table
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100),
    type VARCHAR(20) NOT NULL, -- 'direct' or 'group'
    creator_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat room participants
CREATE TABLE chat_participants (
    chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member', -- creator, admin, member
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (chat_room_id, user_id)
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_type VARCHAR(20) NOT NULL DEFAULT 'text', -- text, image
    media_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Message reactions
CREATE TABLE message_reactions (
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id, reaction)
);

-- Indexes
CREATE INDEX idx_users_username ON users USING btree (username);
CREATE INDEX idx_contacts_user_id ON contacts USING btree (user_id);
CREATE INDEX idx_contacts_contact_id ON contacts USING btree (contact_id);
CREATE INDEX idx_chat_rooms_creator ON chat_rooms USING btree (creator_id);
CREATE INDEX idx_chat_participants_room ON chat_participants USING btree (chat_room_id);
CREATE INDEX idx_chat_participants_user ON chat_participants USING btree (user_id);
CREATE INDEX idx_messages_chat_room ON messages USING btree (chat_room_id);
CREATE INDEX idx_messages_sender ON messages USING btree (sender_id);
CREATE INDEX idx_message_reactions_message ON message_reactions USING btree (message_id);
CREATE INDEX idx_message_content_search ON messages USING gin (content gin_trgm_ops);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_rooms_updated_at
    BEFORE UPDATE ON chat_rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create test user function
CREATE OR REPLACE FUNCTION create_test_data()
RETURNS void AS $$
DECLARE
    user1_id UUID;
    user2_id UUID;
    user3_id UUID;
    chat_room_id UUID;
BEGIN
    -- Create test users
    INSERT INTO users (username, password_hash)
    VALUES ('testuser1', '$2b$10$rPQkKC1Yw6NShdLFKuGYz.dqF3dW7g0dW1z1q3YdVGAVZf3RYayIm')
    RETURNING id INTO user1_id;

    INSERT INTO users (username, password_hash)
    VALUES ('testuser2', '$2b$10$rPQkKC1Yw6NShdLFKuGYz.dqF3dW7g0dW1z1q3YdVGAVZf3RYayIm')
    RETURNING id INTO user2_id;

    INSERT INTO users (username, password_hash)
    VALUES ('testuser3', '$2b$10$rPQkKC1Yw6NShdLFKuGYz.dqF3dW7g0dW1z1q3YdVGAVZf3RYayIm')
    RETURNING id INTO user3_id;

    -- Create contacts
    INSERT INTO contacts (user_id, contact_id, status)
    VALUES
        (user1_id, user2_id, 'accepted'),
        (user2_id, user1_id, 'accepted'),
        (user1_id, user3_id, 'pending'),
        (user3_id, user1_id, 'pending');

    -- Create a group chat
    INSERT INTO chat_rooms (name, type, creator_id)
    VALUES ('Test Group', 'group', user1_id)
    RETURNING id INTO chat_room_id;

    -- Add participants
    INSERT INTO chat_participants (chat_room_id, user_id, role)
    VALUES
        (chat_room_id, user1_id, 'creator'),
        (chat_room_id, user2_id, 'member'),
        (chat_room_id, user3_id, 'member');

    -- Add some messages
    INSERT INTO messages (chat_room_id, sender_id, content)
    VALUES
        (chat_room_id, user1_id, 'Hello everyone!'),
        (chat_room_id, user2_id, 'Hi there!'),
        (chat_room_id, user3_id, 'Hey guys!');
END;
$$ LANGUAGE plpgsql; 