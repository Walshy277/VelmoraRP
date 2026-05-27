# VelmoraRP Server Skeleton

This is an early backend skeleton for the VelmoraRP civilization simulation.

## Contents

- `database/schema.sql`: PostgreSQL schema for accounts, characters, groups, settlements, structures, resources, knowledge, territory, ticks, and historical events.
- `database/seed.sql`: starter region and early knowledge entries.
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

## Initial API

- `GET /health`
- `GET /world/regions`
- `GET /world/history`

## Architecture Direction

The skeleton follows the GDD model:

- The database is event-friendly and stores historical events separately from current world state.
- The tick engine records each world tick before processing simulation systems.
- Simulation systems are isolated modules so resources, survival, knowledge, territory, and politics can evolve separately.
- Regions include a `shard_key` so future region servers can split world simulation geographically.
