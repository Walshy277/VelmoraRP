import type { Pool, PoolClient } from 'pg';
import type { WorldTickNumber } from '../domain/ids.js';

export type SimulationSystemName =
  | 'player_actions'
  | 'resources'
  | 'survival'
  | 'injuries'
  | 'individual_resources'
  | 'construction';

export interface TickContext {
  tickNumber: WorldTickNumber;
  gameDay: number | null;
  startedAt: Date;
  pool: Pool;
  client: PoolClient;
}

export interface SimulationSystemResult {
  system: SimulationSystemName;
  processed: number;
  events: number;
  metrics?: Record<string, number | string | boolean>;
}

export interface SimulationSystem {
  name: SimulationSystemName;
  run(context: TickContext): Promise<SimulationSystemResult>;
}

export interface TickResult {
  tickNumber: WorldTickNumber;
  gameDay: number | null;
  durationMs: number;
  systems: SimulationSystemResult[];
}
