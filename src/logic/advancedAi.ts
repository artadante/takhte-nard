/* advancedAi.ts
 * Grandmaster AI for Traditional Iranian Backgammon.
 * Explores turn permutation trees, prioritizing blots, hits, and anchors.
 */

import { CheckerColor, MoveOption, oppositeColor } from './models';
import { PlayerPath } from './playerPath';
import { GameBoard } from './gameBoard';
import { MoveValidator } from './moveValidator';
import { ComputerAI } from './computerAi';

interface BranchResult {
  firstMove: MoveOption;
  finalBoard: GameBoard;
  diceUsed: number;
  score: number;
}

export class AdvancedAI {
  static chooseMove(
    options: MoveOption[],
    board: GameBoard,
    color: CheckerColor,
    remainingDice: number[]
  ): MoveOption | null {
    if (options.length === 0) return null;
    if (options.length === 1) return options[0];

    const candidates: BranchResult[] = [];

    for (const firstMove of options) {
      const nextBoard = board.clone();
      nextBoard.moveChecker(firstMove.from, firstMove.to, color);

      const usedIndices = new Set(firstMove.dieIndices);
      const nextDice = remainingDice.filter((_, idx) => !usedIndices.has(idx));

      const subResult = this.searchTree(
        nextBoard,
        color,
        nextDice,
        firstMove.dieIndices.length
      );

      candidates.push({
        firstMove,
        finalBoard: subResult.board,
        diceUsed: subResult.diceUsed,
        score: subResult.score,
      });
    }

    if (candidates.length === 0) {
      return ComputerAI.chooseMove(options, board, color, remainingDice);
    }

    // Sort by dice consumed first, then strategic score
    const maxDice = Math.max(...candidates.map(c => c.diceUsed));
    const bestCandidates = candidates.filter(c => c.diceUsed === maxDice);
    bestCandidates.sort((a, b) => b.score - a.score);

    return bestCandidates[0].firstMove;
  }

  private static searchTree(
    board: GameBoard,
    color: CheckerColor,
    remainingDice: number[],
    totalDiceUsed: number
  ): { board: GameBoard; diceUsed: number; score: number } {
    if (remainingDice.length === 0) {
      return {
        board,
        diceUsed: totalDiceUsed,
        score: this.evaluateBoard(board, color),
      };
    }

    const nextMoves = MoveValidator.allMoves(board, color, remainingDice);
    const legal = MoveValidator.filterLegalMoves(nextMoves, board, color, remainingDice);

    if (legal.length === 0) {
      return {
        board,
        diceUsed: totalDiceUsed,
        score: this.evaluateBoard(board, color),
      };
    }

    let bestBoard = board;
    let maxUsed = totalDiceUsed;
    let bestScore = -Infinity;

    for (const move of legal) {
      const branchBoard = board.clone();
      branchBoard.moveChecker(move.from, move.to, color);

      const usedIndices = new Set(move.dieIndices);
      const nextDice = remainingDice.filter((_, idx) => !usedIndices.has(idx));

      const result = this.searchTree(
        branchBoard,
        color,
        nextDice,
        totalDiceUsed + move.dieIndices.length
      );

      if (
        result.diceUsed > maxUsed ||
        (result.diceUsed === maxUsed && result.score > bestScore)
      ) {
        maxUsed = result.diceUsed;
        bestScore = result.score;
        bestBoard = result.board;
      }
    }

    return {
      board: bestBoard,
      diceUsed: maxUsed,
      score: bestScore,
    };
  }

  private static evaluateBoard(board: GameBoard, color: CheckerColor): number {
    const opp = oppositeColor(color);
    let score = 0.0;

    // 1. Borne off checkers (huge win factor)
    score += board.borneOffCount(color) * 500000;
    score -= board.borneOffCount(opp) * 550000;

    // 2. Opponent checkers on the bar
    const oppOnBar = board.barCount(opp);
    score += oppOnBar * 400000;

    // 3. Own checkers on the bar (severe penalty)
    const myOnBar = board.barCount(color);
    score -= myOnBar * 450000;

    // 4. Pip count difference
    const myPips = ComputerAI.calculatePipCount(board, color);
    const oppPips = ComputerAI.calculatePipCount(board, opp);
    score += (oppPips - myPips) * 8000;

    // 5. Anchors and Primes in Home board
    const homePoints = PlayerPath.homePoints(color);
    let homeAnchors = 0;
    for (const pt of homePoints) {
      const st = board.stackAt(pt);
      if (st && st.color === color && st.count >= 2) {
        homeAnchors++;
      }
    }
    score += homeAnchors * 70000;

    // 6. Penalty for exposed blots (single checkers)
    for (let raw = 1; raw <= 24; raw++) {
      const st = board.stackAt(raw);
      if (st && st.count === 1) {
        if (st.color === color) {
          score -= 90000;
        } else {
          score += 60000; // Target blot to attack
        }
      }
    }

    return score;
  }
}
