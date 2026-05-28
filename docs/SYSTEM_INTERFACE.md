# VelmoraRP System Interface

This document defines the first stable backend boundaries. The goal is to keep player input, simulation processing, world state, and historical output separate.

## Runtime Shape

```text
Client
  |
  v
HTTP API
  |
  +--> Command Intake -> player_actions
  |
  +--> Query API ------> current world state

Simulation Tick Engine
  |
  +--> player_actions
  +--> resources
  +--> survival
  +--> progression
  +--> construction
  +--> territory
  +--> knowledge
  +--> politics
  |
  v
PostgreSQL current state + historical_events
```

## Command Interface

Player commands should be written to `player_actions`; they should not mutate world state directly.

Initial command shape:

```json
{
  "accountId": "uuid",
  "characterId": "uuid",
  "regionId": "uuid",
  "actionType": "gather_resource",
  "availableTick": 15,
  "payload": {
    "resourceNodeId": "uuid",
    "toolId": "uuid"
  }
}
```

The tick engine owns validation, ordering, rejection, and application of queued actions.

## Registration Interface

`POST /auth/register` creates accounts.

The first registered account becomes the creator account. Creator accounts exist outside the historical start condition and do not begin Day 1.

The first non-creator account starts Day 1 by setting:

- `world_calendar.day_one_started_at`
- `world_calendar.day_one_started_by_account_id`

This gives the server an explicit pre-history state:

```text
0 accounts               -> blank canvas, no calendar
1 creator account        -> prepared world, still no calendar
first player account     -> Day 1 begins
later player accounts    -> join the existing calendar
```

## Query Interface

Read endpoints can query current state directly:

- Regions.
- Characters.
- Settlements.
- Structures.
- Territory claims.
- Historical events.

Queries should not advance the simulation.

## Simulation System Contract

Every simulation system implements:

```ts
interface SimulationSystem {
  name: SimulationSystemName;
  run(context: TickContext): Promise<SimulationSystemResult>;
}
```

Each system receives:

- `tickNumber`
- `startedAt`
- shared PostgreSQL `pool`
- transaction-bound PostgreSQL `client`

Each system returns:

- system name
- processed count
- emitted event count
- optional metrics

## Tick Rules

- Only one tick can run at a time.
- A tick is transactional.
- Systems run in a deterministic order.
- System run metrics are recorded in `simulation_system_runs`.
- Completed ticks are recorded in `world_ticks`.
- Major outcomes are recorded in `historical_events`.
- Ticks are real time; civilization progress is rate-limited by active social capacity.

## World Calendar

The world does not start with a calendar. At creation, VelmoraRP is a blank canvas: no day count, no shared time concept, no known regions, and no civilization-scale structure.

`Day 1` begins when the first normal player registers after the creator account. The creator can prepare or administer the world, but the creator account does not begin history.

After Day 1 begins, game days advance from real elapsed time, not from tick count and not from player population.

The initial configuration uses:

```text
Before first player registration after creator -> no game day
After Day 1 begins                       -> 1 real day = 1 game day
```

This is stored in `world_calendar.day_length_seconds` and defaults to `86400`. `world_ticks.game_day` is nullable because ticks can exist before the world has a calendar.

## Blank Canvas World

There are no gameplay regions at start. Geography becomes known through exploration. The `regions` table is a discovered-world table, not a preloaded world map contract.

Early low-population play should assume:

- Players are unlikely to meet quickly.
- Players must fend for themselves.
- Survival gameplay must work for isolated players.
- Civilization-scale progress remains slow until more players join and organize.
- Exploration creates the first known locations, not pre-seeded regions.

## Progression Rules

Low member count means slow progression. The server should not pause real-time simulation for small groups, but construction, territory, and knowledge advancement should use progression multipliers.

Progression is calculated each tick into `progression_rates`.

Initial bands:

```text
0 active members    -> 0.05x dormant progress
1 active member     -> 0.10x solitary progress
2-4 active members  -> 0.25x small-band progress
5-9 active members  -> 0.50x camp progress
10-24 members       -> 1.00x village baseline
25-49 members       -> 1.50x town progress
50+ members         -> 2.00x city-state progress
```

Institutions add small bonuses:

- Workshops and storehouses improve labor.
- Archives improve knowledge preservation.
- Shrines and civic structures improve social cohesion and territory legitimacy.

This keeps the game real time while making civilization-scale progress require population, organization, and institutions.

## System Order

```text
1. player_actions
2. resources
3. survival
4. progression
5. construction
6. territory
7. knowledge
8. politics
```

This order is intentionally conservative:

- Player actions enter first.
- Resource and survival pressure update before social systems.
- Progression rates are recalculated before systems consume labor, knowledge, or territory multipliers.
- Construction changes territory possibilities.
- Knowledge and politics react to world changes after physical state has moved.

## Persistence Rules

- Current state lives in normalized tables.
- Historical facts live in `historical_events`.
- Tick telemetry lives in `world_ticks` and `simulation_system_runs`.
- JSONB is allowed for unstable design areas, but important query dimensions should graduate into real columns.
