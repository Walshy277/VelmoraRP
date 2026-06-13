export type CharacterStatus = 'active' | 'incapacitated' | 'imprisoned' | 'exiled' | 'retired' | 'missing';
export type GroupType = 'group' | 'clan' | 'alliance' | 'faction' | 'dynasty' | 'empire';

export const GROUP_EVOLUTION_ORDER: GroupType[] = ['group', 'clan', 'alliance', 'faction', 'dynasty', 'empire'];
