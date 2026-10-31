/* gameSession.ts
 * Match orchestrator for Traditional Iranian Backgammon:
 * - Turn flow, Roll-off, Dice rolls
 * - Bar re-entry, Hitting blots, Bearing off
 * - Robust turn switching without recursion bugs
 */

import {
  BoardPoint,
  CheckerColor,
  DiceRoll,
  MoveOption,
  oppositeColor,
  TurnRecordItem,
  VictoryType
} from './models';
import { BoardDiceState } from './dice3D';
import { GameBoard } from './gameBoard';
import { PlayerPath } from './playerPath';
import { MoveValidator } from './moveValidator';
import { ComputerAI } from './computerAi';
import { AdvancedAI } from './advancedAi';
import { SoundManager } from './soundManager';
import { SettingsStore } from './settingsStore';
import { StatsStore } from './statsStore';

export interface UndoStep {
  board: GameBoard;
  remainingDice: number[];
  from: BoardPoint | 'bar';
  to: BoardPoint | null;
  usedIndices: number[];
}

export class GameSession {
  private static instance: GameSession | null = null;

  board: GameBoard = GameBoard.initialTraditional();
  currentPlayer: CheckerColor = 'white';
  diceRoll: DiceRoll | null = null;
  boardDiceState: BoardDiceState | null = null;
  remainingDice: number[] = [];
  selectedPoint: BoardPoint | 'bar' | null = null;
  isGameStarted: boolean = false;
  isGameOver: boolean = false;
  winner: CheckerColor | null = null;
  victoryType: VictoryType | null = null;

  turnNumber: number = 1;
  isRolling: boolean = false;
  isAiMoving: boolean = false;
  statusMessage: string = '';

  // Roll-off to determine who starts
  isRollOffActive: boolean = true;
  whiteRollOffDie: number | null = null;
  blackRollOffDie: number | null = null;
  rollOffWinner: CheckerColor | null = null;

  // Undo history for current human turn
  undoStack: UndoStep[] = [];
  turnLog: TurnRecordItem[] = [];

  private listeners: Set<() => void> = new Set();

  static shared(): GameSession {
    if (!this.instance) {
      this.instance = new GameSession();
    }
    return this.instance;
  }

  constructor() {
    this.startNewGame();
  }

  startNewGame(): void {
    this.board = GameBoard.initialTraditional();
    this.isGameStarted = true;
    this.isGameOver = false;
    this.winner = null;
    this.victoryType = null;
    this.turnNumber = 1;
    this.selectedPoint = null;
    this.undoStack = [];
    this.turnLog = [];
    this.diceRoll = null;
    this.boardDiceState = null;
    this.remainingDice = [];
    this.isRolling = false;
    this.isAiMoving = false;

    // Roll-off setup
    this.isRollOffActive = true;
    this.whiteRollOffDie = null;
    this.blackRollOffDie = null;
    this.rollOffWinner = null;
    this.statusMessage = 'statusRollOffPrompt';

    SoundManager.shared().playNewGame();
    this.notify();
  }

  async performRollOff(): Promise<void> {
    if (!this.isRollOffActive || this.isRolling) return;

    this.isRolling = true;
    SoundManager.shared().playDiceRoll();
    this.notify();

    await new Promise(r => setTimeout(r, 600));

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;

    this.whiteRollOffDie = d1;
    this.blackRollOffDie = d2;
    this.isRolling = false;

    if (d1 === d2) {
      this.statusMessage = 'statusRollOffTie';
      this.notify();
      return;
    }

    const firstPlayer: CheckerColor = d1 > d2 ? 'white' : 'black';
    this.rollOffWinner = firstPlayer;
    this.currentPlayer = firstPlayer;
    this.isRollOffActive = false;
    this.statusMessage = 'statusRollOffResult';
    this.notify();

    await new Promise(r => setTimeout(r, 1200));

    // First turn begins
    if (this.isComputerTurn()) {
      await this.computerTurn();
    } else {
      this.statusMessage = 'statusRollDice';
      this.notify();
    }
  }

  /**
   * Internal dice generator (does NOT trigger computerTurn)
   */
  private async rollDiceInternal(): Promise<void> {
    const roll = DiceRoll.random();
    this.diceRoll = roll;
    this.boardDiceState = new BoardDiceState(this.currentPlayer, roll, 1.35);
    this.isRolling = true;
    SoundManager.shared().playDiceRoll();
    this.notify();

    // Wait for tumble & bounce animation
    await new Promise(r => setTimeout(r, 1350));

    if (roll.isDouble) {
      this.remainingDice = [roll.die1, roll.die1, roll.die1, roll.die1];
      this.statusMessage = 'statusDoubleDoubled';
    } else {
      this.remainingDice = [roll.die1, roll.die2];
      this.statusMessage = this.board.barCount(this.currentPlayer) > 0 ? 'statusCheckerOnBar' : 'statusSelectChecker';
    }

    this.isRolling = false;
    this.undoStack = [];

    if (this.board.barCount(this.currentPlayer) > 0) {
      this.selectedPoint = 'bar';
    }

    this.notify();
  }

  /**
   * Human player rolls dice
   */
  async rollDice(): Promise<void> {
    if (this.isRolling || this.remainingDice.length > 0 || this.isGameOver || this.isRollOffActive || this.isAiMoving) {
      return;
    }

    await this.rollDiceInternal();

    // Check if legal moves exist for human
    const legalMoves = this.getLegalMoves();
    if (legalMoves.length === 0) {
      this.statusMessage = 'statusNoAvailableMoves';
      this.notify();
      await new Promise(r => setTimeout(r, 1400));
      this.endTurn();
    }
  }

  isComputerTurn(): boolean {
    return this.currentPlayer === 'black';
  }

  getLegalMoves(): MoveOption[] {
    if (this.remainingDice.length === 0) return [];
    const all = MoveValidator.allMoves(this.board, this.currentPlayer, this.remainingDice);
    return MoveValidator.filterLegalMoves(all, this.board, this.currentPlayer, this.remainingDice);
  }

  getLegalMovesForOrigin(origin: BoardPoint | 'bar'): MoveOption[] {
    const all = this.getLegalMoves();
    return all.filter(opt => opt.from === origin);
  }

  selectPoint(point: BoardPoint | 'bar' | null): void {
    if (this.isAiMoving || this.remainingDice.length === 0 || this.isComputerTurn()) return;

    // If checkers on bar, origin must be 'bar'
    if (this.board.barCount(this.currentPlayer) > 0) {
      this.selectedPoint = 'bar';
      if (typeof point === 'number') {
        const barMoves = this.getLegalMovesForOrigin('bar');
        const match = barMoves.find(m => m.to === point);
        if (match) {
          this.humanExecuteMove(match);
          return;
        }
      }
      this.notify();
      return;
    }

    if (point === null) {
      this.selectedPoint = null;
      this.notify();
      return;
    }

    if (point === 'bar') {
      if (this.board.barCount(this.currentPlayer) > 0) {
        this.selectedPoint = 'bar';
        this.statusMessage = 'statusSelectTarget';
        this.notify();
      }
      return;
    }

    const stack = this.board.stackAt(point);
    if (stack && stack.color === this.currentPlayer && stack.count > 0) {
      const legalForPoint = this.getLegalMovesForOrigin(point);
      if (legalForPoint.length > 0) {
        this.selectedPoint = point;
        this.statusMessage = 'statusSelectTarget';
        this.notify();
        return;
      }
    }

    // If another point was selected and clicked destination
    if (this.selectedPoint !== null) {
      const validOptions = this.getLegalMovesForOrigin(this.selectedPoint);
      const match = validOptions.find(opt => opt.to === point);
      if (match) {
        this.humanExecuteMove(match);
        return;
      }
    }

    this.selectedPoint = null;
    this.notify();
  }

  bearOffSelected(): void {
    if (this.selectedPoint === null || this.isAiMoving || this.isComputerTurn()) return;
    const validOptions = this.getLegalMovesForOrigin(this.selectedPoint);
    const bearOffOption = validOptions.find(opt => opt.to === null);
    if (bearOffOption) {
      this.humanExecuteMove(bearOffOption);
    }
  }

  /**
   * Applies single move on board state (no automatic endTurn)
   */
  private applyMove(option: MoveOption): void {
    // Record undo step
    this.undoStack.push({
      board: this.board.clone(),
      remainingDice: [...this.remainingDice],
      from: option.from,
      to: option.to,
      usedIndices: [...option.dieIndices],
    });

    // Execute move on board (step-by-step if combined to ensure intermediate hits are processed)
    if (option.isCombined && option.from !== 'bar') {
      let currentPos: BoardPoint | null = option.from;
      for (const idx of option.dieIndices) {
        if (currentPos === null) break;
        const die = this.remainingDice[idx];
        const nextTarget: BoardPoint | null = PlayerPath.pointFrom(currentPos, die, this.currentPlayer);
        this.board.moveChecker(currentPos, nextTarget, this.currentPlayer);
        currentPos = nextTarget;
      }
    } else {
      this.board.moveChecker(option.from, option.to, this.currentPlayer);
    }

    if (option.isHit) {
      SoundManager.shared().playStep();
    } else {
      SoundManager.shared().playMove();
    }

    // Deduct used dice
    const usedSet = new Set(option.dieIndices);
    this.remainingDice = this.remainingDice.filter((_, idx) => !usedSet.has(idx));

    // Reset selection or auto-select bar if checkers still on bar
    if (this.board.barCount(this.currentPlayer) > 0) {
      this.selectedPoint = 'bar';
    } else {
      this.selectedPoint = null;
    }

    // Check victory
    if (this.board.isWinner(this.currentPlayer)) {
      this.handleVictory();
    }
  }

  /**
   * Human player executes move
   */
  async humanExecuteMove(option: MoveOption): Promise<void> {
    this.applyMove(option);

    if (this.isGameOver) return;

    // Check if human turn is finished
    if (this.remainingDice.length === 0 || this.getLegalMoves().length === 0) {
      this.notify();
      await new Promise(r => setTimeout(r, 400));
      this.endTurn();
      return;
    }

    this.notify();
  }

  // Alias for backward compatibility if called from canvas
  executeMove(option: MoveOption): void {
    this.humanExecuteMove(option);
  }

  undo(): void {
    if (this.undoStack.length === 0 || this.isAiMoving || this.isComputerTurn()) return;
    const last = this.undoStack.pop()!;
    this.board = last.board;
    this.remainingDice = last.remainingDice;
    this.selectedPoint = this.board.barCount(this.currentPlayer) > 0 ? 'bar' : null;
    SoundManager.shared().playStep();
    this.notify();
  }

  /**
   * Computer (AI) Turn: executes sequentially and calls endTurn EXACTLY ONCE
   */
  private async computerTurn(): Promise<void> {
    if (this.isGameOver || this.isAiMoving) return;

    this.isAiMoving = true;
    this.statusMessage = 'statusComputerMoving';
    this.notify();

    // 1. Roll dice for AI
    await this.rollDiceInternal();

    // 2. Check if legal moves exist
    const initialLegal = this.getLegalMoves();
    if (initialLegal.length === 0) {
      this.statusMessage = 'statusNoAvailableMoves';
      this.notify();
      await new Promise(r => setTimeout(r, 1400));
      this.isAiMoving = false;
      this.endTurn();
      return;
    }

    const settings = SettingsStore.shared().get();
    const delayMs = settings.gameSpeed === 'fast' ? 450 : 750;

    // 3. Sequential AI moves
    while (this.remainingDice.length > 0 && !this.isGameOver) {
      await new Promise(r => setTimeout(r, delayMs));

      const legal = this.getLegalMoves();
      if (legal.length === 0) break;

      const chosen = settings.aiDifficulty === 'master'
        ? AdvancedAI.chooseMove(legal, this.board, this.currentPlayer, this.remainingDice)
        : ComputerAI.chooseMove(legal, this.board, this.currentPlayer, this.remainingDice);

      if (!chosen) break;

      this.applyMove(chosen);
      this.notify();

      if (this.board.isWinner(this.currentPlayer)) {
        this.isAiMoving = false;
        return;
      }
    }

    // 4. Conclude AI turn
    await new Promise(r => setTimeout(r, 400));
    this.isAiMoving = false;
    this.endTurn();
  }

  /**
   * Ends current turn and switches to opponent (EXACTLY ONCE per turn)
   */
  endTurn(): void {
    if (this.isGameOver) return;

    this.turnNumber++;
    this.currentPlayer = oppositeColor(this.currentPlayer);
    this.diceRoll = null;
    this.boardDiceState = null;
    this.remainingDice = [];
    this.selectedPoint = null;
    this.undoStack = [];

    this.notify();

    if (this.isComputerTurn()) {
      setTimeout(() => {
        this.computerTurn();
      }, 500);
    } else {
      this.statusMessage = 'statusRollDice';
      this.notify();
    }
  }

  private handleVictory(): void {
    this.isGameOver = true;
    this.winner = this.currentPlayer;
    const loser = oppositeColor(this.currentPlayer);

    this.victoryType = this.board.victoryType(loser);

    const isHumanWinner = this.winner === 'white';
    StatsStore.shared().recordMatch(isHumanWinner, this.victoryType);
    SoundManager.shared().playVictory();

    this.notify();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach(fn => fn());
  }
}
