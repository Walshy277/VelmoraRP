CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE character_status AS ENUM ('active', 'incapacitated', 'imprisoned', 'exiled', 'retired', 'missing');
CREATE TYPE injury_kind AS ENUM (
  'exhaustion',
  'broken_limb',
  'trauma',
  'disease',
  'morale_collapse',
  'political_disgrace',
  'imprisonment',
  'battlefield_injury'
);
CREATE TYPE region_status AS ENUM ('active', 'hibernating', 'archived');
CREATE TYPE tick_status AS ENUM ('running', 'completed', 'failed');
CREATE TYPE group_type AS ENUM ('group', 'clan', 'alliance', 'faction', 'dynasty', 'empire');
CREATE TYPE membership_role AS ENUM ('member', 'elder', 'leader', 'founder');
CREATE TYPE claim_control_type AS ENUM ('presence', 'construction', 'political', 'legal');
CREATE TYPE event_scope AS ENUM ('character', 'settlement', 'group', 'region', 'world');
CREATE TYPE resource_kind AS ENUM ('food', 'water', 'wood', 'stone', 'fiber', 'clay', 'copper', 'tin', 'iron');
CREATE TYPE structure_kind AS ENUM ('campfire', 'hut', 'storehouse', 'workshop', 'wall', 'farm', 'shrine', 'archive');
CREATE TYPE knowledge_category AS ENUM ('survival', 'crafting', 'agriculture', 'metallurgy', 'construction', 'medicine', 'governance', 'religion', 'writing');
CREATE TYPE player_action_status AS ENUM ('queued', 'processing', 'applied', 'rejected', 'failed');
CREATE TYPE relationship_stance AS ENUM ('unknown', 'neutral', 'friendly', 'allied', 'rival', 'hostile', 'war');
CREATE TYPE progression_scope AS ENUM ('group', 'settlement');

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_creator BOOLEAN NOT NULL DEFAULT false,
  registration_sequence BIGSERIAL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_accounts_single_creator ON accounts(is_creator) WHERE is_creator = true;

CREATE TABLE world_ticks (
  id BIGSERIAL PRIMARY KEY,
  tick_number BIGINT NOT NULL UNIQUE,
  game_day BIGINT CHECK (game_day IS NULL OR game_day >= 1),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  status tick_status NOT NULL DEFAULT 'running'
);

CREATE TABLE world_calendar (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  day_one_started_at TIMESTAMPTZ,
  day_one_started_by_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  day_length_seconds INTEGER NOT NULL DEFAULT 86400 CHECK (day_length_seconds > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (id = true)
);

INSERT INTO world_calendar (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE simulation_system_runs (
  id BIGSERIAL PRIMARY KEY,
  tick_number BIGINT NOT NULL REFERENCES world_ticks(tick_number) ON DELETE CASCADE,
  system_name TEXT NOT NULL,
  processed_count INTEGER NOT NULL DEFAULT 0 CHECK (processed_count >= 0),
  emitted_event_count INTEGER NOT NULL DEFAULT 0 CHECK (emitted_event_count >= 0),
  duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tick_number, system_name)
);

CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  shard_key TEXT NOT NULL UNIQUE,
  status region_status NOT NULL DEFAULT 'active',
  terrain JSONB NOT NULL DEFAULT '{}'::jsonb,
  climate JSONB NOT NULL DEFAULT '{}'::jsonb,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE map_cells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  cell_x INTEGER NOT NULL,
  cell_y INTEGER NOT NULL,
  terrain_type TEXT NOT NULL,
  elevation INTEGER NOT NULL DEFAULT 0,
  fertility INTEGER NOT NULL DEFAULT 50 CHECK (fertility >= 0 AND fertility <= 100),
  moisture INTEGER NOT NULL DEFAULT 50 CHECK (moisture >= 0 AND moisture <= 100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (region_id, cell_x, cell_y)
);

CREATE TABLE lineages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_character_id UUID,
  family_name TEXT NOT NULL,
  cultural_memory JSONB NOT NULL DEFAULT '{}'::jsonb,
  founded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  region_id UUID REFERENCES regions(id),
  name TEXT NOT NULL,
  status character_status NOT NULL DEFAULT 'active',
  age_days INTEGER NOT NULL DEFAULT 0,
  hunger INTEGER NOT NULL DEFAULT 0 CHECK (hunger >= 0 AND hunger <= 100),
  thirst INTEGER NOT NULL DEFAULT 0 CHECK (thirst >= 0 AND thirst <= 100),
  health INTEGER NOT NULL DEFAULT 100 CHECK (health >= 0 AND health <= 100),
  position_x NUMERIC(12, 3) NOT NULL DEFAULT 0,
  position_y NUMERIC(12, 3) NOT NULL DEFAULT 0,
  lineage_id UUID REFERENCES lineages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retired_at TIMESTAMPTZ
);

ALTER TABLE lineages
  ADD CONSTRAINT lineages_founder_character_fk
  FOREIGN KEY (founder_character_id) REFERENCES characters(id) ON DELETE SET NULL;

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type group_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  founded_by_character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  founded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dissolved_at TIMESTAMPTZ,
  governance JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX idx_groups_active_name_type ON groups(type, lower(name)) WHERE dissolved_at IS NULL;

CREATE TABLE group_memberships (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  role membership_role NOT NULL DEFAULT 'member',
  reputation INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  PRIMARY KEY (group_id, character_id)
);

CREATE TABLE group_relationships (
  source_group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  target_group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  stance relationship_stance NOT NULL DEFAULT 'unknown',
  trust INTEGER NOT NULL DEFAULT 0 CHECK (trust >= -100 AND trust <= 100),
  tension INTEGER NOT NULL DEFAULT 0 CHECK (tension >= 0 AND tension <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (source_group_id, target_group_id),
  CHECK (source_group_id <> target_group_id)
);

CREATE TABLE character_injuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  kind injury_kind NOT NULL,
  severity INTEGER NOT NULL DEFAULT 1 CHECK (severity >= 1 AND severity <= 100),
  efficiency_penalty NUMERIC(5, 3) NOT NULL DEFAULT 0 CHECK (efficiency_penalty >= 0 AND efficiency_penalty <= 1),
  movement_penalty NUMERIC(5, 3) NOT NULL DEFAULT 0 CHECK (movement_penalty >= 0 AND movement_penalty <= 1),
  influence_penalty NUMERIC(5, 3) NOT NULL DEFAULT 0 CHECK (influence_penalty >= 0 AND influence_penalty <= 1),
  source_event_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recovery_started_at TIMESTAMPTZ,
  recovered_at TIMESTAMPTZ
);

CREATE TABLE character_setbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  setback_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  reputation_delta INTEGER NOT NULL DEFAULT 0,
  influence_delta INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_event_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  controlling_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  position_x NUMERIC(12, 3) NOT NULL,
  position_y NUMERIC(12, 3) NOT NULL,
  population_estimate INTEGER NOT NULL DEFAULT 0,
  storage JSONB NOT NULL DEFAULT '{}'::jsonb,
  founded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  abandoned_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_settlements_active_region_name ON settlements(region_id, lower(name)) WHERE abandoned_at IS NULL;

CREATE TABLE progression_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope progression_scope NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  settlement_id UUID REFERENCES settlements(id) ON DELETE CASCADE,
  active_member_count INTEGER NOT NULL DEFAULT 0 CHECK (active_member_count >= 0),
  institution_count INTEGER NOT NULL DEFAULT 0 CHECK (institution_count >= 0),
  labor_multiplier NUMERIC(6, 3) NOT NULL DEFAULT 0.100 CHECK (labor_multiplier >= 0),
  knowledge_multiplier NUMERIC(6, 3) NOT NULL DEFAULT 0.100 CHECK (knowledge_multiplier >= 0),
  territory_multiplier NUMERIC(6, 3) NOT NULL DEFAULT 0.100 CHECK (territory_multiplier >= 0),
  calculated_tick BIGINT NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (scope = 'group' AND group_id IS NOT NULL AND settlement_id IS NULL)
    OR
    (scope = 'settlement' AND settlement_id IS NOT NULL AND group_id IS NULL)
  )
);

CREATE TABLE structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID REFERENCES settlements(id) ON DELETE SET NULL,
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  owner_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  owner_character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  kind structure_kind NOT NULL,
  name TEXT,
  position_x NUMERIC(12, 3) NOT NULL,
  position_y NUMERIC(12, 3) NOT NULL,
  hit_points INTEGER NOT NULL DEFAULT 100,
  construction_progress NUMERIC(6, 3) NOT NULL DEFAULT 0 CHECK (construction_progress >= 0 AND construction_progress <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE resource_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  kind resource_kind NOT NULL,
  position_x NUMERIC(12, 3) NOT NULL,
  position_y NUMERIC(12, 3) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  max_quantity INTEGER NOT NULL CHECK (max_quantity >= 0),
  regen_per_tick INTEGER NOT NULL DEFAULT 0,
  last_tick_processed BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE player_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  status player_action_status NOT NULL DEFAULT 'queued',
  available_tick BIGINT NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE inventories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  structure_id UUID REFERENCES structures(id) ON DELETE CASCADE,
  settlement_id UUID REFERENCES settlements(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (
    (character_id IS NOT NULL)::integer +
    (structure_id IS NOT NULL)::integer +
    (settlement_id IS NOT NULL)::integer +
    (group_id IS NOT NULL)::integer = 1
  )
);

CREATE TABLE knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category knowledge_category NOT NULL,
  description TEXT,
  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE character_knowledge (
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  knowledge_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  proficiency INTEGER NOT NULL DEFAULT 1 CHECK (proficiency >= 1 AND proficiency <= 100),
  learned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_event_id UUID,
  PRIMARY KEY (character_id, knowledge_id)
);

CREATE TABLE group_knowledge (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  knowledge_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  institutional_strength NUMERIC(6, 3) NOT NULL DEFAULT 1 CHECK (institutional_strength >= 1 AND institutional_strength <= 100),
  preserved_by_structure_id UUID REFERENCES structures(id) ON DELETE SET NULL,
  adopted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, knowledge_id)
);

CREATE TABLE territory_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  control_type claim_control_type NOT NULL,
  strength NUMERIC(6, 3) NOT NULL DEFAULT 1 CHECK (strength >= 0 AND strength <= 100),
  bounds JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_evaluated_tick BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE historical_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tick_number BIGINT,
  scope event_scope NOT NULL,
  event_type TEXT NOT NULL,
  region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  settlement_id UUID REFERENCES settlements(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE character_knowledge
  ADD CONSTRAINT character_knowledge_source_event_fk
  FOREIGN KEY (source_event_id) REFERENCES historical_events(id) ON DELETE SET NULL;

ALTER TABLE character_injuries
  ADD CONSTRAINT character_injuries_source_event_fk
  FOREIGN KEY (source_event_id) REFERENCES historical_events(id) ON DELETE SET NULL;

ALTER TABLE character_setbacks
  ADD CONSTRAINT character_setbacks_source_event_fk
  FOREIGN KEY (source_event_id) REFERENCES historical_events(id) ON DELETE SET NULL;

CREATE INDEX idx_characters_account_id ON characters(account_id);
CREATE INDEX idx_characters_region_position ON characters(region_id, position_x, position_y);
CREATE INDEX idx_character_injuries_character_active ON character_injuries(character_id) WHERE recovered_at IS NULL;
CREATE INDEX idx_character_setbacks_character_id ON character_setbacks(character_id);
CREATE INDEX idx_group_memberships_character_id ON group_memberships(character_id);
CREATE INDEX idx_group_relationships_target_group_id ON group_relationships(target_group_id);
CREATE INDEX idx_settlements_region_id ON settlements(region_id);
CREATE INDEX idx_structures_region_position ON structures(region_id, position_x, position_y);
CREATE INDEX idx_resource_nodes_region_kind ON resource_nodes(region_id, kind);
CREATE INDEX idx_player_actions_queue ON player_actions(status, available_tick, created_at);
CREATE INDEX idx_player_actions_character_id ON player_actions(character_id);
CREATE INDEX idx_territory_claims_region_id ON territory_claims(region_id);
CREATE INDEX idx_historical_events_tick_number ON historical_events(tick_number);
CREATE INDEX idx_historical_events_region_id ON historical_events(region_id);
CREATE INDEX idx_simulation_system_runs_tick_number ON simulation_system_runs(tick_number);
CREATE INDEX idx_progression_rates_group_tick ON progression_rates(group_id, calculated_tick DESC);
CREATE INDEX idx_progression_rates_settlement_tick ON progression_rates(settlement_id, calculated_tick DESC);
