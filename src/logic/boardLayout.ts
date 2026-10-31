/* boardLayout.ts
 * Coordinates, points mapping, and The Bar layout for traditional backgammon.
 * Reference resolution: 1920 x 1200 (16:10 aspect ratio)
 * Base checker diameter: 85px
 */

import { BoardPoint, BoardSide, CheckerColor, isTopHalf } from './models';

export class BoardLayout {
  static readonly BASE_WIDTH = 1920;
  static readonly BASE_HEIGHT = 1200;
  static readonly BASE_CHECKER_DIAMETER = 100; // 85px at 1920x1200
  static readonly ASPECT_RATIO = 1920 / 1200; // 1.6

  static isPlayerOnRightSide(color: CheckerColor, boardSide: BoardSide = 'right'): boolean {
    return boardSide === 'right' ? color === 'white' : color === 'black';
  }

  static getNormalizedX(point: BoardPoint, _boardSide: BoardSide = 'right'): number {
    switch (point) {
      // Bottom half: 1 to 12 (Right to Left)
      case 1:  return 0.871;
      case 2:  return 0.810;
      case 3:  return 0.749;
      case 4:  return 0.688;
      case 5:  return 0.626;
      case 6:  return 0.566;
      // BAR is in the center (~0.50)
      case 7:  return 0.437;
      case 8:  return 0.376;
      case 9:  return 0.314;
      case 10: return 0.252;
      case 11: return 0.191;
      case 12: return 0.130;

      // Top half: 13 to 24 (Left to Right)
      case 13: return 0.134;
      case 14: return 0.195;
      case 15: return 0.256;
      case 16: return 0.316;
      case 17: return 0.376;
      case 18: return 0.436;
      // BAR is in the center (~0.50)
      case 19: return 0.564;
      case 20: return 0.624;
      case 21: return 0.685;
      case 22: return 0.745;
      case 23: return 0.806;
      default: return 0.867; // 24
    }
  }

  static getNormalizedY(point: BoardPoint, boardSide: BoardSide = 'right'): number {
    return isTopHalf(point, boardSide) ? 0.090 : 0.910;
  }

  static position(
    point: BoardPoint,
    width: number,
    height: number,
    boardSide: BoardSide = 'right'
  ): { x: number; y: number } {
    const px = this.getNormalizedX(point, boardSide);
    const py = this.getNormalizedY(point, boardSide);
    return {
      x: px * width,
      y: py * height,
    };
  }

  static checkerDiameter(width: number, _height: number = 0): number {
    // 70px at 1920px width: scales smoothly with board resolution
    return (width / this.BASE_WIDTH) * this.BASE_CHECKER_DIAMETER;
  }

  static stackSpacing(diameter: number): number {
    return diameter * 1.0;
  }

  static stackOffset(index: number, diameter: number, direction: number): number {
    if (index <= 0) return 0;
    const compress = index > 5 ? 0.75 : 1.0;
    return index * this.stackSpacing(diameter) * direction * compress;
  }

  /**
   * Coordinates for checkers on The Bar (پیشخوان وسط تخته)
   */
  static barPosition(
    color: CheckerColor,
    index: number,
    width: number,
    height: number
  ): { x: number; y: number } {
    const x = 0.50 * width;
    const diameter = this.checkerDiameter(width, height);
    // White bar on upper half, Black bar on lower half
    const baseAy = color === 'white' ? 0.38 : 0.62;
    const dir = color === 'white' ? -1 : 1;
    const spacing = diameter * 0.85;
    return {
      x,
      y: (baseAy * height) + (index * spacing * dir),
    };
  }

  /**
   * Position of borne-off checkers in trays
   */
  static bearOffPosition(
    color: CheckerColor,
    index: number,
    width: number,
    height: number,
    _boardSide: BoardSide = 'right'
  ): { x: number; y: number } {
    // White bears off at bottom right (x=0.943, y=0.934), Black bears off at top right (x=0.943, y=0.066)
    const ax = 0.943;
    const ay = color === 'white' ? 0.934 : 0.066;
    const direction = color === 'white' ? -1 : 1;

    const diameter = this.checkerDiameter(width, height);
    const spacing = diameter * 0.45;
    return {
      x: ax * width,
      y: ay * height + index * spacing * direction,
    };
  }
}
