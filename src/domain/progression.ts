import type { UUID, WorldTickNumber } from './ids.js';

export type ProgressionScope = 'group' | 'settlement';

export interface ProgressionRate {
  id: UUID;
  scope: ProgressionScope;
  groupId?: UUID;
  settlementId?: UUID;
  activeMemberCount: number;
  institutionCount: number;
  laborMultiplier: number;
  knowledgeMultiplier: number;
  territoryMultiplier: number;
  calculatedTick: WorldTickNumber;
}

export function describeProgressionBand(activeMemberCount: number): string {
  if (activeMemberCount <= 0) return 'dormant';
  if (activeMemberCount === 1) return 'solitary';
  if (activeMemberCount <= 4) return 'small_band';
  if (activeMemberCount <= 9) return 'camp';
  if (activeMemberCount <= 24) return 'village';
  if (activeMemberCount <= 49) return 'town';
  return 'city_state';
}
