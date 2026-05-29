import type { Position, UUID } from './ids.js';

export type CharacterStatus = 'active' | 'incapacitated' | 'imprisoned' | 'exiled' | 'retired' | 'missing';
export type GroupType = 'family' | 'clan' | 'tribe' | 'guild' | 'religion' | 'state' | 'empire';
export type MembershipRole = 'member' | 'elder' | 'leader' | 'founder';

export interface Character {
  id: UUID;
  accountId: UUID;
  regionId?: UUID;
  lineageId?: UUID;
  name: string;
  status: CharacterStatus;
  ageDays: number;
  hunger: number;
  thirst: number;
  health: number;
  position: Position;
}

export type InjuryKind =
  | 'exhaustion'
  | 'broken_limb'
  | 'trauma'
  | 'disease'
  | 'morale_collapse'
  | 'political_disgrace'
  | 'imprisonment'
  | 'battlefield_injury';

export interface CharacterInjury {
  id: UUID;
  characterId: UUID;
  kind: InjuryKind;
  severity: number;
  efficiencyPenalty: number;
  movementPenalty: number;
  influencePenalty: number;
  recoveredAt?: Date;
}

export interface Group {
  id: UUID;
  type: GroupType;
  name: string;
  parentGroupId?: UUID;
  foundedByCharacterId?: UUID;
  governance: Record<string, unknown>;
}

export interface Settlement {
  id: UUID;
  regionId: UUID;
  controllingGroupId?: UUID;
  name: string;
  position: Position;
  populationEstimate: number;
}
