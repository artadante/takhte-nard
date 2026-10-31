/* settingsStore.ts
 * Persistence and state management for user preferences.
 */

import { AIDifficulty, BoardSide, BoardTheme, GameSpeed, MovementType, ScoreDisplayMode } from './models';

export interface GameSettings {
  language: string;
  isSoundEnabled: boolean;
  aiDifficulty: AIDifficulty;
  boardTheme: BoardTheme;
  boardSide: BoardSide;
  gameSpeed: GameSpeed;
  movementType: MovementType;
  isDragAndDropEnabled: boolean;
  scoreDisplayMode: ScoreDisplayMode;
  showPathPlayer: boolean;
  showPathComputer: boolean;
  highlightLogPaths: boolean;
  showCellIndices: boolean;
  playerName1: string;
  playerName2: string;
}

const DEFAULT_SETTINGS: GameSettings = {
  language: 'fa', // Default to Persian as requested by user, with English/Russian available
  isSoundEnabled: true,
  aiDifficulty: 'master',
  boardTheme: 'wood',
  boardSide: 'right',
  gameSpeed: 'fast',
  movementType: 'arc',
  isDragAndDropEnabled: true,
  scoreDisplayMode: 'score',
  showPathPlayer: true,
  showPathComputer: true,
  highlightLogPaths: true,
  showCellIndices: true,
  playerName1: 'بازیکن ۱',
  playerName2: 'هوش مصنوعی',
};

const STORAGE_KEY = 'long_backgammon_settings_v1';

export class SettingsStore {
  private static instance: SettingsStore | null = null;
  private settings: GameSettings;
  private listeners: Set<(settings: GameSettings) => void> = new Set();

  static shared(): SettingsStore {
    if (!this.instance) {
      this.instance = new SettingsStore();
    }
    return this.instance;
  }

  constructor() {
    this.settings = this.load();
  }

  private load(): GameSettings {
    if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch {
      // Ignore parse errors
    }
    return { ...DEFAULT_SETTINGS };
  }

  get(): GameSettings {
    return { ...this.settings };
  }

  update(partial: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...partial };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // storage unavailable
    }
    this.listeners.forEach(fn => fn(this.settings));
  }

  subscribe(listener: (settings: GameSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
