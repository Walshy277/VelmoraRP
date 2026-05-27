export type UUID = string;

export interface Region {
  id: UUID;
  name: string;
  shard_key: string;
  terrain: Record<string, unknown>;
  climate: Record<string, unknown>;
}

export interface HistoricalEventInput {
  tickNumber?: number;
  scope: 'character' | 'settlement' | 'group' | 'region' | 'world';
  eventType: string;
  regionId?: UUID;
  characterId?: UUID;
  groupId?: UUID;
  settlementId?: UUID;
  summary: string;
  payload?: Record<string, unknown>;
}
