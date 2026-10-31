/* computerAi.ts
 * Standard / Heuristic AI engine for Traditional Iranian Backgammon.
 */

import { CheckerColor, MoveOption } from './models';
import { PlayerPath } from './playerPath';
import { GameBoard } from './gameBoard';

export class ComputerAI {
  static calculatePipCount(board: GameBoard, color: CheckerColor): number {
    let total = 0;

    // Checkers on the bar: distance is 25 pips each
    const onBar = board.barCount(color);
    total += onBar * 25;

    for (let pt = 1; pt <= 24; pt++) {
      const st = board.stackAt(pt);
      if (st && st.color === color) {
        const dist = color === 'white' ? pt : (25 - pt);
        total += st.count * dist;
      }
    }

    return total;
  }

  private static evaluateMove(move: MoveOption, board: GameBoard, color: CheckerColor): number {
    let score = 0.0;

    // 1. Mandatory / high priority: Enter from bar
    if (move.from === 'bar') {
      score += 100000;
    }

    // 2. HIT OPPONENT BLOT! (Major tactical advantage in traditional backgammon)
    if (move.isHit) {
      score += 500000;
      // Bonus if hitting deep in opponent territory or in our home
      if (move.to !== null && PlayerPath.isHomePoint(move.to, color)) {
        score += 200000;
      }
    }

    // 3. Bear off checkers
    if (move.to === null) {
      score += 600000;
      return score;
    }

    const simBoard = board.clone();
    simBoard.moveChecker(move.from, move.to, color);

    // 4. Making points (creating safe pairs / anchors)
    const targetStack = simBoard.stackAt(move.to);
    if (targetStack && targetStack.count === 2) {
      score += 150000; // Safe anchor formed!
      // Extra bonus for golden points: 5, 7, 20
      if (move.to === 5 || move.to === 7 || move.to === 20) {
        score += 80000;
      }
    }

    // 5. Penalty for leaving an exposed blot (single checker)
    if (targetStack && targetStack.count === 1) {
      score -= 80000; // Danger of being hit!
    }

    // If source had 2 checkers, moving one leaves a blot!
    if (move.from !== 'bar') {
      const sourceBefore = board.stackAt(move.from);
      if (sourceBefore && sourceBefore.count === 2) {
        score -= 60000; // Broken anchor leaves a blot
      }
    }

    // 6. Escaping back checkers
    if (move.from !== 'bar') {
      const isBackChecker = color === 'white' ? (move.from >= 19) : (move.from <= 6);
      if (isBackChecker) {
        score += 40000;
      }
    }

    // 7. Progress towards home
    const pipsBefore = this.calculatePipCount(board, color);
    const pipsAfter = this.calculatePipCount(simBoard, color);
    score += (pipsBefore - pipsAfter) * 1000;

    // Slight randomness to avoid deterministic loops
    score += Math.random() * 20000;

    return score;
  }

  static chooseMove(
    options: MoveOption[],
    board: GameBoard,
    color: CheckerColor,
    _remainingDice: number[]
  ): MoveOption | null {
    if (options.length === 0) return null;
    if (options.length === 1) return options[0];

    let best: MoveOption | null = null;
    let bestScore = -Infinity;

    for (const opt of options) {
      const score = this.evaluateMove(opt, board, color);
      if (score > bestScore) {
        bestScore = score;
        best = opt;
      }
    }

    return best;
  }
}
