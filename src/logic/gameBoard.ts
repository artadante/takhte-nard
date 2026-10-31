/* gameBoard.ts
 * Manages the board state for Traditional Iranian Backgammon:
 * - Authentic 24-point setup: (2, 5, 3, 5 checkers)
 * - The Bar (for killed/hit checkers)
 * - Bearing-off trays
 */

import { BoardPoint, CheckerColor, PointStack, VictoryType, oppositeColor } from './models';

export class GameBoard {
  stacks: (PointStack | null)[];
  whiteBarIds: number[];
  blackBarIds: number[];
  whiteBorneOffIds: number[];
  blackBorneOffIds: number[];

  constructor() {
    this.stacks = new Array(25).fill(null);
    this.whiteBarIds = [];
    this.blackBarIds = [];
    this.whiteBorneOffIds = [];
    this.blackBorneOffIds = [];
  }

  /** Traditional Iranian Backgammon Setup:
   * White: 2 on pt 24, 5 on pt 13, 3 on pt 8, 5 on pt 6
   * Black: 2 on pt 1, 5 on pt 12, 3 on pt 17, 5 on pt 19
   */
  static initialTraditional(): GameBoard {
    const board = new GameBoard();

    // White checkers (IDs 0..14)
    board.stacks[24] = PointStack.withCount('white', 2, 0);
    board.stacks[13] = PointStack.withCount('white', 5, 2);
    board.stacks[8] = PointStack.withCount('white', 3, 7);
    board.stacks[6] = PointStack.withCount('white', 5, 10);

    // Black checkers (IDs 15..29)
    board.stacks[1] = PointStack.withCount('black', 2, 15);
    board.stacks[12] = PointStack.withCount('black', 5, 17);
    board.stacks[17] = PointStack.withCount('black', 3, 22);
    board.stacks[19] = PointStack.withCount('black', 5, 25);

    return board;
  }

  // Alias for starting match
  static initialLong(): GameBoard {
    return this.initialTraditional();
  }

  clone(): GameBoard {
    const copy = new GameBoard();
    for (let i = 1; i <= 24; i++) {
      const s = this.stacks[i];
      if (s) {
        copy.stacks[i] = new PointStack(s.color, [...s.checkerIds]);
      }
    }
    copy.whiteBarIds = [...this.whiteBarIds];
    copy.blackBarIds = [...this.blackBarIds];
    copy.whiteBorneOffIds = [...this.whiteBorneOffIds];
    copy.blackBorneOffIds = [...this.blackBorneOffIds];
    return copy;
  }

  barCount(color: CheckerColor): number {
    return color === 'white' ? this.whiteBarIds.length : this.blackBarIds.length;
  }

  borneOffCount(color: CheckerColor): number {
    return color === 'white' ? this.whiteBorneOffIds.length : this.blackBorneOffIds.length;
  }

  isWinner(color: CheckerColor): boolean {
    return this.borneOffCount(color) >= 15;
  }

  stackAt(point: BoardPoint): PointStack | null {
    return this.stacks[point] || null;
  }

  occupiedPoints(): BoardPoint[] {
    const res: BoardPoint[] = [];
    for (let raw = 1; raw <= 24; raw++) {
      if (this.stacks[raw] && this.stacks[raw]!.checkerIds.length > 0) {
        res.push(raw);
      }
    }
    return res;
  }

  /**
   * Executes moving one checker from point or 'bar' to target point (or null for bear off).
   * Automatically handles hitting an opponent blot (single checker) and sending it to the bar!
   */
  moveOneChecker(from: BoardPoint | 'bar', to: BoardPoint | null): boolean {
    let movingId: number | null = null;
    let color: CheckerColor;

    if (from === 'bar') {
      // Determine which color is on the bar: caller context or auto-detect
      // Let's pop from bar
      if (this.whiteBarIds.length > 0) {
        // Will be checked by caller or context
        movingId = this.whiteBarIds.pop()!;
        color = 'white';
      } else if (this.blackBarIds.length > 0) {
        movingId = this.blackBarIds.pop()!;
        color = 'black';
      } else {
        return false;
      }
    } else {
      const source = this.stacks[from];
      if (!source || source.checkerIds.length === 0) return false;
      color = source.color;
      movingId = source.checkerIds.pop()!;
      if (source.checkerIds.length === 0) {
        this.stacks[from] = null;
      }
    }

    if (to === null) {
      // Bear off
      if (color === 'white') {
        this.whiteBorneOffIds.push(movingId);
      } else {
        this.blackBorneOffIds.push(movingId);
      }
      return true;
    }

    const target = this.stacks[to];
    if (!target) {
      this.stacks[to] = new PointStack(color, [movingId]);
      return true;
    }

    if (target.color === color) {
      target.checkerIds.push(movingId);
      return true;
    }

    // Target is occupied by opponent!
    if (target.count === 1) {
      // HIT / KILL OPPONENT BLOT!
      const hitId = target.checkerIds.pop()!;
      if (target.color === 'white') {
        this.whiteBarIds.push(hitId);
      } else {
        this.blackBarIds.push(hitId);
      }

      // Now place our checker
      this.stacks[to] = new PointStack(color, [movingId]);
      return true;
    }

    // Target is closed (2+ opponent checkers) - illegal
    return false;
  }

  // Version with explicit color for bar moves
  moveChecker(from: BoardPoint | 'bar', to: BoardPoint | null, color: CheckerColor): boolean {
    let movingId: number | null = null;

    if (from === 'bar') {
      if (color === 'white') {
        if (this.whiteBarIds.length === 0) return false;
        movingId = this.whiteBarIds.pop()!;
      } else {
        if (this.blackBarIds.length === 0) return false;
        movingId = this.blackBarIds.pop()!;
      }
    } else {
      const source = this.stacks[from];
      if (!source || source.checkerIds.length === 0 || source.color !== color) return false;
      movingId = source.checkerIds.pop()!;
      if (source.checkerIds.length === 0) {
        this.stacks[from] = null;
      }
    }

    if (to === null) {
      if (color === 'white') {
        this.whiteBorneOffIds.push(movingId);
      } else {
        this.blackBorneOffIds.push(movingId);
      }
      return true;
    }

    const target = this.stacks[to];
    if (!target) {
      this.stacks[to] = new PointStack(color, [movingId]);
      return true;
    }

    if (target.color === color) {
      target.checkerIds.push(movingId);
      return true;
    }

    // HIT OPPONENT SINGLE BLOT!
    if (target.count === 1) {
      const hitId = target.checkerIds.pop()!;
      if (target.color === 'white') {
        this.whiteBarIds.push(hitId);
      } else {
        this.blackBarIds.push(hitId);
      }
      this.stacks[to] = new PointStack(color, [movingId]);
      return true;
    }

    return false;
  }

  victoryType(loserColor: CheckerColor): VictoryType {
    const loserBorneOff = this.borneOffCount(loserColor);
    if (loserBorneOff > 0) {
      return 'oin'; // Normal win (1 point)
    }

    // Check for Backgammon (سگ مارس / مارس سیاه - 3 points):
    // If loser has any checker on the bar OR in the winner's home board:
    // Winner's home board:
    // - If winner is white, white's home is 1..6
    // - If winner is black, black's home is 19..24
    const winnerColor = oppositeColor(loserColor);
    const loserOnBar = this.barCount(loserColor) > 0;
    let loserInWinnerHome = false;

    const winnerHomePoints = winnerColor === 'white' ? [1, 2, 3, 4, 5, 6] : [19, 20, 21, 22, 23, 24];
    for (const pt of winnerHomePoints) {
      const st = this.stacks[pt];
      if (st && st.color === loserColor && st.count > 0) {
        loserInWinnerHome = true;
        break;
      }
    }

    if (loserOnBar || loserInWinnerHome) {
      return 'home_mars'; // Backgammon / سگ مارس (3 points)
    }

    return 'mars'; // Gammon / مارس (2 points)
  }
}
