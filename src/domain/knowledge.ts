import type { UUID } from './ids.js';

export type KnowledgeCategory =
  | 'survival'
  | 'crafting'
  | 'agriculture'
  | 'metallurgy'
  | 'construction'
  | 'medicine'
  | 'governance'
  | 'religion'
  | 'writing';

export interface KnowledgeEntry {
  id: UUID;
  name: string;
  category: KnowledgeCategory;
  description?: string;
  requirements: Record<string, unknown>;
}

export interface KnowledgeCarrier {
  knowledgeId: UUID;
  carrierType: 'character' | 'group' | 'structure';
  carrierId: UUID;
  strength: number;
}
