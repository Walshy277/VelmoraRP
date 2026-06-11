# VelmoraRP Overhaul Coordination Spec

## Goal

Full front-end polish, database migration system, and expanded main mechanics for the VelmoraRP civilization simulation.

## Current Stack

- Backend: Express + TypeScript + PostgreSQL (pg) + Zod + Pino
- Frontend: Vanilla JS/HTML/CSS served from `public/`
- Tests: Vitest
- DB: Single `schema.sql` applied via `psql`, no migration runner

## Shared Contracts

### API Routes (must not change without approval)

- `POST /auth/register` — exists, returns account + world.dayOneStarted
- `GET /health` — exists
- `GET /world/regions` — exists
- `GET /world/history` — exists
- `GET /world/calendar` — exists
- `GET /dev/state` — exists
- `GET /dev/replay` — exists

### New API Routes (all agents must align on these)

- `POST /actions` — enqueue player action. Body: `{ actionType, characterId?, regionId?, payload? }`. Returns `{ id, status }`.
- `POST /characters` — create character for authenticated account. Body: `{ name, regionId? }`. Returns character.
- `POST /groups` — create group. Body: `{ name, type?, description? }`. Returns group.
- `POST /groups/:id/join` — join group. Returns membership.
- `POST /settlements` — create settlement. Body: `{ name, regionId, positionX, positionY, groupId? }`. Returns settlement.
- `POST /structures` — create structure. Body: `{ kind, regionId, positionX, positionY, settlementId?, groupId? }`. Returns structure.
- `GET /world/characters` — list characters
- `GET /world/settlements` — list settlements
- `GET /world/structures` — list structures
- `GET /world/knowledge` — list knowledge entries
- `GET /world/territory` — list territory claims

### Database Migration Contract

- Migration files live in `database/migrations/`
- Naming: `NNN_description.sql` (e.g., `001_initial_schema.sql`)
- `schema_migrations` table tracks applied migrations
- `npm run db:migrate` runs the migration runner
- `scripts/setup-db.ts` applies migrations instead of raw schema.sql

### Simulation System Order (must not change)

1. player_actions
2. resources
3. survival
4. injuries
5. progression
6. evolution
7. construction
8. territory
9. knowledge
10. politics

## Task Slices

### Slice 1: Database Migration System (Owner: db-agent)

- Create `database/migrations/` directory
- Split current `schema.sql` into `001_initial_schema.sql`
- Create `002_seed_data.sql`
- Create migration runner in `src/db/migrate.ts`
- Update `scripts/setup-db.ts` to use migration runner
- Update `package.json` scripts: `db:migrate` runs the runner
- Add `schema_migrations` table creation to initial migration

### Slice 2: Backend Mechanics (Owner: backend-agent)

- Implement `POST /actions` with Zod validation, enqueue to `player_actions`
- Implement `POST /characters` — create character, spawn in region, create lineage, create inventory
- Implement `POST /groups` and `POST /groups/:id/join`
- Implement `POST /settlements` and `POST /structures`
- Add GET routes for characters, settlements, structures, knowledge, territory
- Expand `playerActions` simulation system to process `gather_resource`, `craft_item`, `build_structure`, `travel`, `teach`, `form_group` actions
- Expand `resources` system to handle node depletion from gather actions
- Expand `construction` system to handle build_structure action progress
- Add action result recording to `player_actions` table (add `result` JSONB column via migration)
- Add `character_id` to accounts or track active character in session

### Slice 3: Frontend Polish (Owner: frontend-agent)

- Polish `public/index.html`: better layout, responsive improvements, loading states
- Enhance `public/styles.css`: animations, transitions, better typography, dark mode polish
- Rewrite `public/app.js`:
  - Real API integration for all action buttons
  - Character creation modal/flow after registration
  - Action feedback with toast notifications
  - Live world state polling with visual updates
  - Interactive world map: click to travel, hover for region info
  - Settlement and group management UI
  - Knowledge tree visualization
  - Inventory display
- Enhance `public/dev.html` and `public/dev.js`:
  - Better dev dashboard with charts/metrics
  - Real-time tick visualization
  - Action queue inspection
  - System run metrics display
- Add `public/components/` for modular JS components

## Validation

- `npm run build` must pass
- `npm run lint` must pass
- `npm run test` must pass (or existing tests must not break)
- `npm run format:check` must pass

## Merge Order

1. Slice 1 (DB migrations) — foundation
2. Slice 2 (Backend mechanics) — depends on DB contract
3. Slice 3 (Frontend) — depends on backend APIs

## Notes

- Do not change existing auth/registration flow
- Do not change tick engine core logic (advisory locks, transaction boundaries)
- Do not change existing simulation system interfaces
- Keep all existing tests passing
- Use existing patterns: Zod for validation, Pino for logging, pg pool for DB
