/* moveValidator.ts
 * Rules referee for Traditional Iranian Backgammon:
 * - The Bar rule (mandatory re-entry before any other moves)
 * - Hitting opponent single blots
 * - Closed points (2+ opponent checkers block entry/landing)
 * - Bearing-off rules (all checkers must be in Home board)
 * - Combined moves and dice utilization filtering
 */

import { BoardPoint, CheckerColor, MoveOption } from './models';
import { PlayerPath } from './playerPath';
import { GameBoard } from './gameBoard';

export class MoveValidator {
  /**
   * Is point closed by opponent? (Occupied by 2 or more opponent checkers)
   */
  static isClosedByOpponent(point: BoardPoint, board: GameBoard, color: CheckerColor): boolean {
    const stack = board.stackAt(point);
    return stack !== null && stack.color !== color && stack.count >= 2;
  }

  /**
   * Can a checker land on this point?
   * Yes if: empty, occupied by same color, or occupied by exactly 1 opponent checker (Blot to Hit!).
   */
  static canLandOn(point: BoardPoint, board: GameBoard, color: CheckerColor): boolean {
    const stack = board.stackAt(point);
    if (!stack || stack.count === 0) return true;
    if (stack.color === color) return true;
    return stack.count === 1; // Can hit single blot
  }

  /**
   * Checks whether this move results in hitting an opponent blot
   */
  static isHitMove(point: BoardPoint, board: GameBoard, color: CheckerColor): boolean {
    const stack = board.stackAt(point);
    return stack !== null && stack.color !== color && stack.count === 1;
  }

  /**
   * Check if ALL checkers of this color are inside the Home board (or already borne off).
   * - White Home: points 1..6
   * - Black Home: points 19..24
   */
  static areAllCheckersInHome(board: GameBoard, color: CheckerColor): boolean {
    // If any checker is on the bar, cannot be in home
    if (board.barCount(color) > 0) return false;

    const isWhite = color === 'white';
    for (let raw = 1; raw <= 24; raw++) {
      const isHome = isWhite ? (raw >= 1 && raw <= 6) : (raw >= 19 && raw <= 24);
      if (!isHome) {
        const stack = board.stackAt(raw);
        if (stack !== null && stack.color === color && stack.count > 0) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Check if bearing off from point with `die` is legal
   */
  static canBearOffFrom(point: BoardPoint, die: number, board: GameBoard, color: CheckerColor): boolean {
    if (!this.areAllCheckersInHome(board, color)) return false;

    const distance = color === 'white' ? point : (25 - point);

    // Exact die match
    if (die === distance) return true;

    // Higher die: allowed only if no checkers on higher points in home
    if (die > distance) {
      if (color === 'white') {
        // Higher points: point + 1 up to 6
        for (let pt = point + 1; pt <= 6; pt++) {
          const st = board.stackAt(pt);
          if (st && st.color === color && st.count > 0) return false;
        }
        return true;
      } else {
        // Black: higher points are 19 up to point - 1 (since distance to finish is 25 - pt)
        // Point with greater distance to 25 is lower point number (e.g. 19 is distance 6, 24 is distance 1)
        for (let pt = 19; pt < point; pt++) {
          const st = board.stackAt(pt);
          if (st && st.color === color && st.count > 0) return false;
        }
        return true;
      }
    }

    return false;
  }

  /**
   * Destination for a single die move
   */
  static destination(
    from: BoardPoint | 'bar',
    die: number,
    board: GameBoard,
    color: CheckerColor
  ): { to: BoardPoint | null; isHit: boolean } | null {
    if (die <= 0) return null;

    if (from === 'bar') {
      const entryPoint = PlayerPath.barEntryPoint(die, color);
      if (this.canLandOn(entryPoint, board, color)) {
        return {
          to: entryPoint,
          isHit: this.isHitMove(entryPoint, board, color),
        };
      }
      return null;
    }

    const stack = board.stackAt(from);
    if (!stack || stack.color !== color || stack.count === 0) return null;

    const target = PlayerPath.pointFrom(from, die, color);

    if (target === null) {
      // Trying to bear off
      if (this.canBearOffFrom(from, die, board, color)) {
        return { to: null, isHit: false };
      }
      return null;
    }

    if (this.canLandOn(target, board, color)) {
      return {
        to: target,
        isHit: this.isHitMove(target, board, color),
      };
    }

    return null;
  }

  /**
   * Generates all available move options for a specific origin ('bar' or BoardPoint)
   */
  static moves(
    from: BoardPoint | 'bar',
    board: GameBoard,
    color: CheckerColor,
    remainingDice: number[]
  ): MoveOption[] {
    const options: MoveOption[] = [];
    if (remainingDice.length === 0) return options;

    // If player has checkers on the bar, ONLY 'bar' moves are permitted!
    if (board.barCount(color) > 0 && from !== 'bar') {
      return options;
    }

    const isDouble = remainingDice.length >= 2 && remainingDice.every(d => d === remainingDice[0]);

    // 1. Single moves
    const testedDiceValues = new Set<number>();
    for (let i = 0; i < remainingDice.length; i++) {
      const die = remainingDice[i];
      if (testedDiceValues.has(die)) continue;
      testedDiceValues.add(die);

      const dest = this.destination(from, die, board, color);
      if (dest) {
        options.push({
          from,
          to: dest.to,
          die,
          dieIndices: [i],
          isCombined: false,
          isHit: dest.isHit,
        });
      }
    }

    // 2. Combined moves (when player has >= 2 dice)
    if (remainingDice.length >= 2 && from !== 'bar') {
      if (isDouble) {
        const dieVal = remainingDice[0];
        const simBoard = board.clone();
        let currPt: BoardPoint | null = from;
        const usedIndices: number[] = [];
        let comboHit = false;

        for (let step = 1; step <= remainingDice.length; step++) {
          if (currPt === null) break;

          const dest = this.destination(currPt, dieVal, simBoard, color);
          if (!dest) break;

          usedIndices.push(step - 1);
          if (dest.isHit) comboHit = true;

          if (dest.to === null) {
            // Bear off at this step
            if (step >= 2) {
              options.push({
                from,
                to: null,
                die: dieVal * step,
                dieIndices: [...usedIndices],
                isCombined: true,
                isHit: comboHit,
              });
            }
            break;
          }

          // Move checker on simulated board for next step evaluation
          simBoard.moveChecker(currPt, dest.to, color);
          currPt = dest.to;

          if (step >= 2) {
            options.push({
              from,
              to: currPt,
              die: dieVal * step,
              dieIndices: [...usedIndices],
              isCombined: true,
              isHit: comboHit,
            });
          }
        }
      } else if (remainingDice.length === 2) {
        const d1 = remainingDice[0];
        const d2 = remainingDice[1];

        // Try order: d1 then d2
        const mid1 = this.destination(from, d1, board, color);
        if (mid1 && mid1.to !== null) {
          const simBoard = board.clone();
          simBoard.moveChecker(from, mid1.to, color);
          const end1 = this.destination(mid1.to, d2, simBoard, color);
          if (end1) {
            options.push({
              from,
              to: end1.to,
              die: d1 + d2,
              dieIndices: [0, 1],
              isCombined: true,
              isHit: end1.isHit || mid1.isHit,
            });
          }
        }

        // Try order: d2 then d1
        const mid2 = this.destination(from, d2, board, color);
        if (mid2 && mid2.to !== null) {
          const simBoard = board.clone();
          simBoard.moveChecker(from, mid2.to, color);
          const end2 = this.destination(mid2.to, d1, simBoard, color);
          if (end2) {
            // Avoid duplicate target
            if (!options.some(o => o.from === from && o.to === end2.to && o.isCombined)) {
              options.push({
                from,
                to: end2.to,
                die: d1 + d2,
                dieIndices: [1, 0],
                isCombined: true,
                isHit: end2.isHit || mid2.isHit,
              });
            }
          }
        }
      }
    }

    return options;
  }

  /**
   * Generates all moves across all checkers or bar
   */
  static allMoves(
    board: GameBoard,
    color: CheckerColor,
    remainingDice: number[]
  ): MoveOption[] {
    const result: MoveOption[] = [];

    // If checkers on the bar, must play from the bar!
    if (board.barCount(color) > 0) {
      return this.moves('bar', board, color, remainingDice);
    }

    const points = board.occupiedPoints();
    for (const pt of points) {
      const st = board.stackAt(pt);
      if (st && st.color === color) {
        const opts = this.moves(pt, board, color, remainingDice);
        result.push(...opts);
      }
    }

    return result;
  }

  /**
   * Filters moves to obey backgammon rule:
   * Player must play maximum number of dice possible.
   * If only one of two different dice can be played, player MUST play the higher die.
   */
  static filterLegalMoves(
    options: MoveOption[],
    board: GameBoard,
    color: CheckerColor,
    remainingDice: number[]
  ): MoveOption[] {
    if (options.length === 0 || remainingDice.length <= 1) {
      return options;
    }

    const isDouble = remainingDice.length >= 2 && remainingDice.every(d => d === remainingDice[0]);
    if (isDouble || remainingDice.length !== 2) {
      return options;
    }

    // Two distinct dice: e.g. 5 and 3
    // Check which single moves allow playing the second die as well!
    const canPlayBoth: MoveOption[] = [];
    const canPlayOne: MoveOption[] = [];

    for (const opt of options) {
      if (opt.isCombined) {
        canPlayBoth.push(opt);
        continue;
      }

      const tempBoard = board.clone();
      tempBoard.moveChecker(opt.from, opt.to, color);

      const nextDice = remainingDice.filter((_, idx) => idx !== opt.dieIndices[0]);
      const followUp = this.allMoves(tempBoard, color, nextDice);

      if (followUp.length > 0) {
        canPlayBoth.push(opt);
      } else {
        canPlayOne.push(opt);
      }
    }

    if (canPlayBoth.length > 0) {
      return canPlayBoth;
    }

    // Only one die can be played: player must play the HIGHER die
    let maxDie = 0;
    for (const opt of canPlayOne) {
      if (opt.die > maxDie) maxDie = opt.die;
    }

    return canPlayOne.filter(opt => opt.die === maxDie);
  }
}
