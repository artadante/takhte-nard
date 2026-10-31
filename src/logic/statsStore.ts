/* statsStore.ts
 * Player match results & outcomes statistics tracking.
 */

import { VictoryType } from './models';

export interface PlayerStats {
  wins: number;
  losses: number;
  oinVictories: number;
  marsVictories: number;
  homeMarsVictories: number;
  totalPoints: number;
}

const DEFAULT_STATS: PlayerStats = {
  wins: 0,
  losses: 0,
  oinVictories: 0,
  marsVictories: 0,
  homeMarsVictories: 0,
  totalPoints: 0,
};

const STATS_KEY = 'long_backgammon_stats_v1';

export class StatsStore {
  private static instance: StatsStore | null = null;
  private stats: PlayerStats;
  private listeners: Set<(stats: PlayerStats) => void> = new Set();

  static shared(): StatsStore {
    if (!this.instance) {
      this.instance = new StatsStore();
    }
    return this.instance;
  }

  constructor() {
    this.stats = this.load();
  }

  private load(): PlayerStats {
    if (typeof window === 'undefined') return { ...DEFAULT_STATS };
    try {
      const data = localStorage.getItem(STATS_KEY);
      if (data) {
        return { ...DEFAULT_STATS, ...JSON.parse(data) };
      }
    } catch {
      // Ignore parse error
    }
    return { ...DEFAULT_STATS };
  }

  get(): PlayerStats {
    return { ...this.stats };
  }

  getWinRate(): number {
    const total = this.stats.wins + this.stats.losses;
    if (total === 0) return 0;
    return Math.round((this.stats.wins / total) * 100);
  }

  recordMatch(isPlayerWinner: boolean, victoryType: VictoryType): void {
    if (isPlayerWinner) {
      this.stats.wins++;
      let points = 1;
      if (victoryType === 'mars') {
        this.stats.marsVictories++;
        points = 2;
      } else if (victoryType === 'home_mars') {
        this.stats.homeMarsVictories++;
        points = 3;
      } else {
        this.stats.oinVictories++;
      }
      this.stats.totalPoints += points;
    } else {
      this.stats.losses++;
    }

    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(this.stats));
    } catch {
      // Ignore
    }
    this.listeners.forEach(fn => fn(this.stats));
  }

  reset(): void {
    this.stats = { ...DEFAULT_STATS };
    try {
      localStorage.removeItem(STATS_KEY);
    } catch {
      // Ignore
    }
    this.listeners.forEach(fn => fn(this.stats));
  }

  subscribe(listener: (stats: PlayerStats) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
