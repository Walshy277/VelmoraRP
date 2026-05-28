import type { UUID } from './ids.js';

export interface WorldCalendarState {
  hasTimeConcept: boolean;
  gameDay: number | null;
  dayOneStartedAt?: Date;
  dayOneStartedByAccountId?: UUID;
  dayLengthSeconds: number;
}

export type WorldEra = 'pre_history' | 'day_counting';
