-- Knowledge Tree Migration
-- Extends knowledge system to support hierarchical discovery, prerequisites, and unlocking

-- Add columns to knowledge_entries for tree structure
ALTER TABLE knowledge_entries
ADD COLUMN parent_knowledge_id UUID REFERENCES knowledge_entries(id) ON DELETE SET NULL,
ADD COLUMN discovery_difficulty INTEGER NOT NULL DEFAULT 5 CHECK (discovery_difficulty >= 1 AND discovery_difficulty <= 100),
ADD COLUMN discovery_trigger TEXT DEFAULT 'manual',
ADD COLUMN discovery_trigger_data JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN era_unlocked TEXT,
ADD COLUMN unlock_tick BIGINT,
ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN discovery_event_id UUID REFERENCES historical_events(id) ON DELETE SET NULL;

-- Create knowledge_requirements table for fine-grained dependency tracking
CREATE TABLE knowledge_requirements (
  knowledge_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  required_knowledge_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  requirement_type TEXT NOT NULL DEFAULT 'prerequisite',
  min_proficiency INTEGER DEFAULT 1 CHECK (min_proficiency >= 1 AND min_proficiency <= 100),
  PRIMARY KEY (knowledge_id, required_knowledge_id),
  CHECK (knowledge_id <> required_knowledge_id)
);

-- Create knowledge_discovery table for tracking discovery attempts and progress
CREATE TABLE knowledge_discovery_progress (
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  knowledge_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  discovery_progress NUMERIC(6, 3) NOT NULL DEFAULT 0 CHECK (discovery_progress >= 0 AND discovery_progress <= 100),
  last_attempt_tick BIGINT,
  attempted_count INTEGER NOT NULL DEFAULT 0,
  discovered_at TIMESTAMPTZ,
  discovery_event_id UUID REFERENCES historical_events(id) ON DELETE SET NULL,
  PRIMARY KEY (character_id, knowledge_id)
);

-- Create knowledge_eras table to track when knowledge becomes discoverable
CREATE TABLE knowledge_eras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  era_name TEXT NOT NULL UNIQUE,
  description TEXT,
  unlock_conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  unlocked_at TIMESTAMPTZ,
  discovered_by_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Track which knowledge unlocks with which era
CREATE TABLE knowledge_era_mappings (
  knowledge_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  era_id UUID NOT NULL REFERENCES knowledge_eras(id) ON DELETE CASCADE,
  PRIMARY KEY (knowledge_id, era_id)
);

-- Create knowledge categories with unlock rules
CREATE TABLE knowledge_category_rules (
  category knowledge_category NOT NULL PRIMARY KEY,
  unlock_after_era_id UUID REFERENCES knowledge_eras(id) ON DELETE SET NULL,
  min_proficiency_to_discover INTEGER DEFAULT 1 CHECK (min_proficiency_to_discover >= 1 AND min_proficiency_to_discover <= 100),
  unlock_conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient discovery lookups
CREATE INDEX idx_knowledge_entries_parent_id ON knowledge_entries(parent_knowledge_id);
CREATE INDEX idx_knowledge_entries_era ON knowledge_entries(era_unlocked);
CREATE INDEX idx_knowledge_entries_hidden ON knowledge_entries(is_hidden) WHERE is_hidden = true;
CREATE INDEX idx_knowledge_requirements_required ON knowledge_requirements(required_knowledge_id);
CREATE INDEX idx_discovery_progress_character_knowledge ON knowledge_discovery_progress(character_id, knowledge_id);
CREATE INDEX idx_discovery_progress_discovered ON knowledge_discovery_progress(discovered_at) WHERE discovered_at IS NOT NULL;
CREATE INDEX idx_knowledge_era_mappings_era ON knowledge_era_mappings(era_id);

-- Initial knowledge tree structure (Dawn Era - no civilization advances)
-- These are only discoverable through direct interaction, not teaching

INSERT INTO knowledge_entries (name, category, description, discovery_difficulty, discovery_trigger, is_hidden)
VALUES
  ('fire_making', 'survival', 'The ability to create fire from friction or natural materials', 15, 'survival_action', true),
  ('shelter_construction', 'construction', 'Building simple shelters from natural materials', 10, 'survival_action', true),
  ('basic_tool_crafting', 'crafting', 'Creating tools from stone and wood', 8, 'survival_action', true),
  ('basic_foraging', 'survival', 'Identifying edible plants and gathering food', 5, 'survival_action', true),
  ('basic_hunting', 'survival', 'Hunting animals for food and materials', 12, 'survival_action', true),
  ('water_gathering', 'survival', 'Collecting and storing water safely', 3, 'survival_action', true),
  ('primitive_healing', 'medicine', 'Using plants and rest to treat wounds', 20, 'survival_action', true),
  ('fire_control', 'survival', 'Maintaining and using fire for cooking and warmth', 10, 'survival_action', false),
  ('simple_cooking', 'survival', 'Preparing food safely over fire', 8, 'survival_action', false)
ON CONFLICT (name) DO NOTHING;

-- Set fire_making as foundation (no prerequisites)
-- Set fire_control to require fire_making
UPDATE knowledge_entries SET parent_knowledge_id = NULL WHERE name = 'fire_making';

-- As groups grow, unlock new categories
INSERT INTO knowledge_category_rules (category, min_proficiency_to_discover, unlock_conditions)
VALUES
  ('survival', 1, '{"min_group_size": 1}'::jsonb),
  ('crafting', 1, '{"min_group_size": 1}'::jsonb),
  ('construction', 5, '{"min_group_size": 2, "min_age_days": 10}'::jsonb),
  ('agriculture', 30, '{"min_group_size": 5, "min_settlements": 1}'::jsonb),
  ('metallurgy', 50, '{"min_group_size": 10, "min_knowledge_entries": 5}'::jsonb),
  ('medicine', 20, '{"min_group_size": 3}'::jsonb),
  ('governance', 40, '{"min_group_size": 8, "min_institutions": 1}'::jsonb),
  ('religion', 35, '{"min_group_size": 5}'::jsonb),
  ('writing', 60, '{"min_group_size": 15, "min_institutions": 2}"::jsonb)
ON CONFLICT (category) DO NOTHING;
