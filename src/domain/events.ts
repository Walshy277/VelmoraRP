import type { UUID, WorldTickNumber } from './ids.js';

export type EventScope = 'character' | 'settlement' | 'group' | 'region' | 'world';

export interface HistoricalEventInput {
  tickNumber?: WorldTickNumber;
  scope: EventScope;
  eventType: string;
  regionId?: UUID;
  characterId?: UUID;
  groupId?: UUID;
  settlementId?: UUID;
  summary: string;
  payload?: Record<string, unknown>;
}
