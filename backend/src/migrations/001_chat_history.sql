-- =============================================
-- Migration: Chat History Tables
-- Description: Create tables for persisting chat sessions and messages
-- Version: 001
-- =============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Table: chat_sessions
-- Stores chat session metadata
-- =============================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  table_context TEXT,                          -- Current table being discussed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Metadata for analytics
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for listing sessions (most recent first)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at 
  ON chat_sessions(created_at DESC);

-- Index for non-archived sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_not_archived 
  ON chat_sessions(is_archived) 
  WHERE is_archived = FALSE;

-- =============================================
-- Table: chat_messages
-- Stores individual messages within sessions
-- =============================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Extended metadata
  metadata JSONB DEFAULT '{}'::jsonb
  -- metadata can include:
  -- - tableUsed: string
  -- - queryExecuted: boolean
  -- - executionTime: number (ms)
  -- - confidence: number (0-1)
  -- - sqlGenerated: string
);

-- Index for fetching messages by session (chronological order)
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created 
  ON chat_messages(session_id, created_at ASC);

-- =============================================
-- Function: Update updated_at timestamp
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on chat_sessions
DROP TRIGGER IF EXISTS trigger_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER trigger_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Function: Update session updated_at when message is added
-- =============================================
CREATE OR REPLACE FUNCTION update_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions 
  SET updated_at = NOW() 
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session when message is added
DROP TRIGGER IF EXISTS trigger_update_session_on_message ON chat_messages;
CREATE TRIGGER trigger_update_session_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_on_message();

-- =============================================
-- Comments for documentation
-- =============================================
COMMENT ON TABLE chat_sessions IS 'Stores chat session metadata for the AI assistant';
COMMENT ON TABLE chat_messages IS 'Stores individual messages within chat sessions';
COMMENT ON COLUMN chat_sessions.table_context IS 'The database table currently being discussed in this session';
COMMENT ON COLUMN chat_messages.metadata IS 'Extended metadata including tableUsed, queryExecuted, executionTime, etc.';
