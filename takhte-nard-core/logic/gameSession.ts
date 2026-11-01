/* gameSession.ts
 * Standalone Match Orchestrator for Traditional Iranian Backgammon:
 * - Turn flow, Roll-off, 3D Dice rolls
 * - Bar re-entry, Hitting blots, Bearing off
 * - 60FPS physics-based checker movement animations
 * - Automated AI computer opponent with standard and master difficulty
 * - Fully decoupled from external settings stores or databases
 */

import {
  AIDifficulty,
  BoardPoint,
  CheckerColor,
  DiceRoll,
  GameSpeed,
  MoveOption,
  oppositeColor,
  TurnRecordItem,
  VictoryType,
} from './models';
import { BoardDiceState } from './dice3D';
import { CheckerAnimationEngine } from './checkerAnimation';
import { GameBoard } from './gameBoard';
import { PlayerPath } from './playerPath';
import { MoveValidator } from './moveValidator';
import { ComputerAI } from './computerAi';
import { AdvancedAI } from './advancedAi';
import { SoundManager } from './soundManager';

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
  isAnimatingMove: boolean = false;
  statusMessage: string = '';

  // Match Configuration
  playerName1: string = 'بازیکن ۱';
  playerName2: string = 'کامپیوتر (هوش مصنوعی)';
  aiDifficulty: AIDifficulty = 'standard';
  gameSpeed: GameSpeed = 'fast';
  onVictory?: (winner: CheckerColor, victoryType: VictoryType) => void;

  configure(config: {
    playerName1?: string;
    playerName2?: string;
    aiDifficulty?: AIDifficulty;
    gameSpeed?: GameSpeed;
    onVictory?: (winner: CheckerColor, victoryType: VictoryType) => void;
  }): void {
    if (config.playerName1 !== undefined) this.playerName1 = config.playerName1;
    if (config.playerName2 !== undefined) this.playerName2 = config.playerName2;
    if (config.aiDifficulty !== undefined) this.aiDifficulty = config.aiDifficulty;
    if (config.gameSpeed !== undefined) this.gameSpeed = config.gameSpeed;
    if (config.onVictory !== undefined) this.onVictory = config.onVictory;
  }

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
    this.isAnimatingMove = false;
    CheckerAnimationEngine.shared().clear();

    // Roll-off setup
    this.isRollOffActive = true;
    this.whiteRollOffDie = null;
    this.blackRollOffDie = null;
    this.rollOffWinner = null;
    this.statusMessage = 'rollOffPrompt';

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
      this.statusMessage = 'rollOffTie';
      this.notify();
      return;
    }

    const firstPlayer: CheckerColor = d1 > d2 ? 'white' : 'black';
    this.rollOffWinner = firstPlayer;
    this.currentPlayer = firstPlayer;
    this.isRollOffActive = false;
    this.statusMessage = 'rollOffResult';
    this.notify();

    await new Promise(r => setTimeout(r, 1200));

    // First turn begins
    if (this.isComputerTurn()) {
      await this.computerTurn();
    } else {
      this.statusMessage = 'rollDice';
      this.notify();
    }
  }

  /**
   * Internal dice generator (does NOT trigger computerTurn)
   */
  private async rollDiceInternal(): Promise<void> {
    const roll = DiceRoll.random();
    this.diceRoll = roll;
    this.boardDiceState = new BoardDiceState(this.currentPlayer, roll, 1.30);
    this.isRolling = true;
    SoundManager.shared().playDiceRoll();
    this.notify();

    // Wait for 3D tumble & bounce animation
    await new Promise(r => setTimeout(r, 1300));

    if (roll.isDouble) {
      this.remainingDice = [roll.die1, roll.die1, roll.die1, roll.die1];
      this.statusMessage = 'doubleDoubled';
    } else {
      this.remainingDice = [roll.die1, roll.die2];
      this.statusMessage = this.board.barCount(this.currentPlayer) > 0 ? 'checkerOnBar' : 'selectChecker';
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
      this.statusMessage = 'noAvailableMoves';
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
        this.statusMessage = 'selectTarget';
        this.notify();
      }
      return;
    }

    const stack = this.board.stackAt(point);
    if (stack && stack.color === this.currentPlayer && stack.count > 0) {
      const legalForPoint = this.getLegalMovesForOrigin(point);
      if (legalForPoint.length > 0) {
        this.selectedPoint = point;
        this.statusMessage = 'selectTarget';
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
  private applyMove(option: MoveOption, skipSound: boolean = false): void {
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

    if (!skipSound) {
      if (option.isHit) {
        SoundManager.shared().playStep();
      } else {
        SoundManager.shared().playMove();
      }
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
   * Performs smooth animated move before finalizing on board
   */
  async animateAndApplyMove(
    option: MoveOption,
    fromDragCoords?: { x: number; y: number }
  ): Promise<void> {
    const from = option.from;
    const to = option.to;
    const color = this.currentPlayer;
    const isHit = !!option.isHit;

    // Stack indices prior to mutation
    const fromStackIndex =
      from === 'bar'
        ? Math.max(0, this.board.barCount(color) - 1)
        : Math.max(0, (this.board.stackAt(from)?.count || 1) - 1);

    let toStackIndex = 0;
    if (to === null) {
      toStackIndex = this.board.borneOffCount(color);
    } else {
      const targetStack = this.board.stackAt(to);
      if (isHit) {
        toStackIndex = 0;
      } else if (targetStack && targetStack.color === color) {
        toStackIndex = targetStack.count;
      } else {
        toStackIndex = 0;
      }
    }

    const hitBarIndex = isHit ? this.board.barCount(oppositeColor(color)) : 0;
    const isDrag = !!fromDragCoords;
    const duration = isDrag ? 190 : 340;

    CheckerAnimationEngine.shared().startMove({
      from,
      to,
      color,
      isHit,
      fromStackIndex,
      toStackIndex,
      hitBarIndex,
      customStartPos: fromDragCoords,
      duration,
    });

    this.applyMove(option, true);
    this.notify();

    // Await animation landing + microscopic settle
    await new Promise(r => setTimeout(r, duration + 30));
  }

  /**
   * Human player executes move
   */
  async humanExecuteMove(
    option: MoveOption,
    fromDragCoords?: { x: number; y: number }
  ): Promise<void> {
    if (this.isAnimatingMove) return;
    this.isAnimatingMove = true;

    await this.animateAndApplyMove(option, fromDragCoords);

    this.isAnimatingMove = false;

    if (this.isGameOver) return;

    // Check if human turn is finished
    if (this.remainingDice.length === 0 || this.getLegalMoves().length === 0) {
      this.notify();
      await new Promise(r => setTimeout(r, 350));
      this.endTurn();
      return;
    }

    this.notify();
  }

  executeMove(option: MoveOption, fromDragCoords?: { x: number; y: number }): void {
    this.humanExecuteMove(option, fromDragCoords);
  }

  undo(): void {
    if (this.undoStack.length === 0 || this.isAiMoving || this.isComputerTurn() || this.isAnimatingMove) return;
    CheckerAnimationEngine.shared().clear();
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
    this.statusMessage = 'computerMoving';
    this.notify();

    // 1. Roll dice for AI
    await this.rollDiceInternal();

    // 2. Check if legal moves exist
    const initialLegal = this.getLegalMoves();
    if (initialLegal.length === 0) {
      this.statusMessage = 'noAvailableMoves';
      this.notify();
      await new Promise(r => setTimeout(r, 1400));
      this.isAiMoving = false;
      this.endTurn();
      return;
    }

    const pauseBetweenMoves = this.gameSpeed === 'fast' ? 180 : 320;

    // 3. Sequential AI moves with smooth visible animation
    while (this.remainingDice.length > 0 && !this.isGameOver) {
      const legal = this.getLegalMoves();
      if (legal.length === 0) break;

      const chosen =
        this.aiDifficulty === 'master'
          ? AdvancedAI.chooseMove(legal, this.board, this.currentPlayer, this.remainingDice)
          : ComputerAI.chooseMove(legal, this.board, this.currentPlayer, this.remainingDice);

      if (!chosen) break;

      // Smooth parabolic arc animation for computer move
      await this.animateAndApplyMove(chosen);

      if (this.board.isWinner(this.currentPlayer)) {
        this.isAiMoving = false;
        return;
      }

      if (this.remainingDice.length > 0) {
        await new Promise(r => setTimeout(r, pauseBetweenMoves));
      }
    }

    // 4. Conclude AI turn
    await new Promise(r => setTimeout(r, 350));
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
      this.statusMessage = 'rollDice';
      this.notify();
    }
  }

  private handleVictory(): void {
    this.isGameOver = true;
    this.winner = this.currentPlayer;
    const loser = oppositeColor(this.currentPlayer);

    this.victoryType = this.board.victoryType(loser);
    SoundManager.shared().playVictory();

    if (this.onVictory && this.winner && this.victoryType) {
      this.onVictory(this.winner, this.victoryType);
    }

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
