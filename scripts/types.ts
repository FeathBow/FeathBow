export type Hue = 'peach' | 'rose' | 'sage' | 'caramel' | 'gold' | 'teal' | 'blue' | 'plum';

export interface Lang {
  name: string;
  pct: number;
  hue: Hue;
}

export interface DayCount {
  day: string;
  count: number;
}

export interface StatsCore {
  name: string;
  commits: number;
  prs: number;
  issues: number;
  reviews: number;
  contributedTo: number;
  currentStreak: number;
  longestStreak: number;
  contribYear: number;
  week: DayCount[];
  weekStart: string;
  weekEnd: string;
  langs: Lang[];
}

export interface StatsData extends StatsCore {
  updatedAt: string;
}
