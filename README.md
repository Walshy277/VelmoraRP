# VelmoraRP Server Skeleton

This is an early backend skeleton for the VelmoraRP civilization simulation.

VelmoraRP is designed as a browser game. The Express server serves the first browser client from `public/` while also exposing the game API.

## Contents

- `database/schema.sql`: PostgreSQL schema for accounts, characters, groups, settlements, structures, resources, knowledge, territory, ticks, and historical events.
- `database/seed.sql`: starter region and early knowledge entries.
- `public/`: browser game shell served by the Express app.
- `docs/SYSTEM_INTERFACE.md`: backend interface boundaries and tick rules.
- `docs/NEXT_10_COMMITS.md`: recommended implementation roadmap.
- `src/server.ts`: Express API entrypoint.
- `src/simulation/tickEngine.ts`: world tick loop.
- `src/simulation/systems`: placeholder simulation systems.
- `src/routes`: basic health and world query routes.

## Local Setup

1. Copy `.env.example` to `.env`.
2. Start Postgres:

```bash
docker compose up -d
```

3. Install dependencies:

```bash
npm install
```

4. Apply schema and seed data:

```bash
npm run db:migrate
psql "$DATABASE_URL" -f database/seed.sql
```

5. Run the server:

```bash
npm run dev
```

## Verification

```bash
npm run format:check
npm run lint
npm run test
npm run build
```

## Initial API

- `POST /auth/register`
- `GET /health`
- `GET /world/regions`
- `GET /world/history`
- `GET /world/calendar`
- `GET /dev/state`
- `GET /dev/replay`

The first registered account becomes the creator account. The first non-creator registration starts Day 1.

## Browser Client

Run the server and open:

```text
http://localhost:3000
```

The first browser shell shows the blank-canvas world state, registration flow, calendar state, known regions, and recent history.

The dev dashboard is available at:

```text
http://localhost:3000/dev.html
```

## Architecture Direction

The skeleton follows the GDD model:

- The database is event-friendly and stores historical events separately from current world state.
- The tick engine records each world tick before processing simulation systems.
- Simulation systems are isolated modules so resources, survival, knowledge, territory, and politics can evolve separately.
- Regions include a `shard_key` so future region servers can split world simulation geographically, but no regions are seeded at start.
- Player input should enter through queued actions, then be processed by the tick engine.
- The world begins without a calendar. Day 1 starts when the first normal player registers after the creator.
