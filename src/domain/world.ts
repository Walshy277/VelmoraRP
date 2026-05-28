import type { Position, UUID } from './ids.js';

export type RegionStatus = 'active' | 'hibernating' | 'archived';
export type ResourceKind = 'food' | 'water' | 'wood' | 'stone' | 'fiber' | 'clay' | 'copper' | 'tin' | 'iron';
export type StructureKind = 'campfire' | 'hut' | 'storehouse' | 'workshop' | 'wall' | 'farm' | 'shrine' | 'archive';

export interface Region {
  id: UUID;
  name: string;
  shardKey: string;
  status: RegionStatus;
  terrain: Record<string, unknown>;
  climate: Record<string, unknown>;
}

export interface ResourceNode {
  id: UUID;
  regionId: UUID;
  kind: ResourceKind;
  position: Position;
  quantity: number;
  maxQuantity: number;
  regenPerTick: number;
}

export interface Structure {
  id: UUID;
  regionId: UUID;
  settlementId?: UUID;
  ownerGroupId?: UUID;
  ownerCharacterId?: UUID;
  kind: StructureKind;
  name?: string;
  position: Position;
  hitPoints: number;
  constructionProgress: number;
}
