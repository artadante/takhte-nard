/* models.ts
 * Core models and types for Traditional Iranian Backgammon (Short Backgammon).
 */

export type CheckerColor = 'white' | 'black';

export const CHECKER_WHITE: CheckerColor = 'white';
export const CHECKER_BLACK: CheckerColor = 'black';

export function oppositeColor(color: CheckerColor): CheckerColor {
  return color === 'white' ? 'black' : 'white';
}

export type BoardPoint = number; // 1 to 24

export function isTopHalf(point: BoardPoint, boardSide: 'right' | 'left' = 'right'): boolean {
  const isDefaultTop = point >= 13;
  return boardSide === 'right' ? isDefaultTop : !isDefaultTop;
}

export function stackDirection(point: BoardPoint, boardSide: 'right' | 'left' = 'right'): number {
  return isTopHalf(point, boardSide) ? 1 : -1;
}

export class PointStack {
  color: CheckerColor;
  checkerIds: number[];

  constructor(color: CheckerColor, checkerIds: number[]) {
    this.color = color;
    this.checkerIds = [...checkerIds];
  }

  static withCount(color: CheckerColor, count: number, startIdOffset: number = 0): PointStack {
    const ids: number[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(startIdOffset + i);
    }
    return new PointStack(color, ids);
  }

  get count(): number {
    return this.checkerIds.length;
  }
}

export interface MoveOption {
  from: BoardPoint | 'bar';
  to: BoardPoint | null; // null means bear off
  die: number;
  dieIndices: number[];
  isCombined: boolean;
  isHit?: boolean; // Hits opponent single blot
}

export class DiceRoll {
  die1: number;
  die2: number;

  constructor(die1: number, die2: number) {
    this.die1 = Math.min(6, Math.max(1, die1));
    this.die2 = Math.min(6, Math.max(1, die2));
  }

  static random(): DiceRoll {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    return new DiceRoll(d1, d2);
  }

  get isDouble(): boolean {
    return this.die1 === this.die2;
  }
}

export type VictoryType = 'oin' | 'mars' | 'home_mars'; // oin = normal win (1pt), mars = gammon (2pt), home_mars = backgammon (3pt)

export type BoardSide = 'right' | 'left';
export type BoardTheme = 'wood' | 'marble' | 'classic';
export type AIDifficulty = 'standard' | 'master';
export type GameSpeed = 'fast' | 'slow';
export type MovementType = 'straight' | 'arc';
export type ScoreDisplayMode = 'score' | 'progress';
export type OpponentType = 'computer' | 'human';

export interface TurnRecordItem {
  id: number;
  turnNumber: number;
  player: CheckerColor;
  playerName: string;
  diceRoll: [number, number];
  moves: Array<{
    from: BoardPoint | 'bar';
    to: BoardPoint | null;
    die: number;
    isCombined: boolean;
    isHit?: boolean;
  }>;
  isDouble: boolean;
}
