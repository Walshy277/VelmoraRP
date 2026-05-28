import { config } from '../config.js';

export interface WorldCalendar {
  dayOneStartedAt?: Date;
  dayLengthSeconds: number;
}

export function calculateGameDay(calendar: WorldCalendar, now: Date = new Date()): number | null {
  if (!calendar.dayOneStartedAt) {
    return null;
  }

  const elapsedMs = Math.max(0, now.getTime() - calendar.dayOneStartedAt.getTime());
  const elapsedDays = Math.floor(elapsedMs / (calendar.dayLengthSeconds * 1000));

  return elapsedDays + 1;
}

export const defaultWorldCalendar: WorldCalendar = {
  dayLengthSeconds: config.GAME_DAY_REAL_SECONDS
};
