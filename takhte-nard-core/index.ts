/* takhte-nard-core
 * Entry point for Traditional Iranian Backgammon Engine & React Component.
 */

export { BackgammonGame } from './components/BackgammonGame';
export type { BackgammonGameProps } from './components/BackgammonGame';

export { BoardCanvas } from './components/BoardCanvas';
export type { BoardCanvasProps } from './components/BoardCanvas';

export { SingleDie } from './components/SingleDie';

// Core Game Orchestrator & State
export { GameSession } from './logic/gameSession';
export type { UndoStep } from './logic/gameSession';

// Rules & AI
export { GameBoard } from './logic/gameBoard';
export { BoardLayout } from './logic/boardLayout';
export { MoveValidator } from './logic/moveValidator';
export { PlayerPath } from './logic/playerPath';
export { ComputerAI } from './logic/computerAi';
export { AdvancedAI } from './logic/advancedAi';

// Physics & Animations
export { Dice3D, BoardDiceState } from './logic/dice3D';
export { CheckerAnimationEngine } from './logic/checkerAnimation';
export { SoundManager } from './logic/soundManager';

// Types & Models
export * from './logic/models';
