import type { UUID } from './ids.js';

export type RegionStatus = 'active' | 'hibernating' | 'archived';

export interface Region {
  id: UUID;
  name: string;
  shardKey: string;
  status: RegionStatus;
  terrain: Record<string, unknown>;
  climate: Record<string, unknown>;
}
