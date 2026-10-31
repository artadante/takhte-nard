/* playerPath.ts
 * Navigation routes for Traditional Iranian Backgammon:
 * - White moves from 24 down to 1 (Home: 1..6)
 * - Black moves from 1 up to 24 (Home: 19..24)
 */

import { BoardPoint, CheckerColor } from './models';

export class PlayerPath {
  // White moves 24 down to 1
  static readonly WHITE_ROUTE: BoardPoint[] = [
    24, 23, 22, 21, 20, 19,
    18, 17, 16, 15, 14, 13,
    12, 11, 10, 9, 8, 7,
    6, 5, 4, 3, 2, 1
  ];

  // Black moves 1 up to 24
  static readonly BLACK_ROUTE: BoardPoint[] = [
    1, 2, 3, 4, 5, 6,
    7, 8, 9, 10, 11, 12,
    13, 14, 15, 16, 17, 18,
    19, 20, 21, 22, 23, 24
  ];

  static white(): BoardPoint[] {
    return this.WHITE_ROUTE;
  }

  static black(): BoardPoint[] {
    return this.BLACK_ROUTE;
  }

  static path(color: CheckerColor): BoardPoint[] {
    return color === 'white' ? this.WHITE_ROUTE : this.BLACK_ROUTE;
  }

  static homePoints(color: CheckerColor): BoardPoint[] {
    return color === 'white' ? [1, 2, 3, 4, 5, 6] : [19, 20, 21, 22, 23, 24];
  }

  static isHomePoint(point: BoardPoint, color: CheckerColor): boolean {
    return color === 'white' ? (point >= 1 && point <= 6) : (point >= 19 && point <= 24);
  }

  // Bar entry point for a die value (1..6)
  static barEntryPoint(die: number, color: CheckerColor): BoardPoint {
    return color === 'white' ? (25 - die) : die;
  }

  static pointFrom(start: BoardPoint | 'bar', steps: number, color: CheckerColor): BoardPoint | null {
    if (start === 'bar') {
      return this.barEntryPoint(steps, color);
    }
    if (steps <= 0) return start;

    if (color === 'white') {
      const target = start - steps;
      return target >= 1 ? target : null; // null means bearing off
    } else {
      const target = start + steps;
      return target <= 24 ? target : null; // null means bearing off
    }
  }

  static stepsToFinish(point: BoardPoint, color: CheckerColor): number {
    return color === 'white' ? point : (25 - point);
  }

  static findIndex(route: BoardPoint[], point: BoardPoint): number {
    return route.indexOf(point);
  }
}
