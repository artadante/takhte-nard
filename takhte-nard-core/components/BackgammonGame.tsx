/* BackgammonGame.tsx
 * Complete Standalone Backgammon Component (تخته نرد سنتی ایرانی)
 * Drop-in React component containing:
 * - 1920x1200 responsive Canvas Board
 * - 3D tumbling directional dice
 * - 60FPS physics checker movement & hit animations
 * - Intelligent Heuristic & Grandmaster Computer Bot (AI)
 * - Roll-off starting modal & victory banner
 * - Zero external UI library dependencies (pure Tailwind CSS & inline SVGs)
 */

import React, { useEffect, useState } from 'react';
import { BoardCanvas } from './BoardCanvas';
import { SingleDie } from './SingleDie';
import { GameSession } from '../logic/gameSession';
import { AIDifficulty, BoardTheme, CheckerColor, GameSpeed, VictoryType } from '../logic/models';
import { SoundManager } from '../logic/soundManager';
import { ComputerAI } from '../logic/computerAi';

export interface BackgammonGameProps {
  playerName1?: string;
  playerName2?: string;
  aiDifficulty?: AIDifficulty;
  gameSpeed?: GameSpeed;
  isSoundEnabled?: boolean;
  boardTheme?: BoardTheme;
  assetsBasePath?: string;
  onGameOver?: (winner: CheckerColor, victoryType: VictoryType) => void;
  className?: string;
}

export const BackgammonGame: React.FC<BackgammonGameProps> = ({
  playerName1 = 'شما (سفید)',
  playerName2 = 'کامپیوتر (سیاه)',
  aiDifficulty = 'standard',
  gameSpeed = 'fast',
  isSoundEnabled = true,
  boardTheme = 'classic',
  assetsBasePath = './assets',
  onGameOver,
  className = '',
}) => {
  const session = GameSession.shared();
  const [, setTick] = useState(0);

  useEffect(() => {
    session.configure({
      playerName1,
      playerName2,
      aiDifficulty,
      gameSpeed,
      onVictory: onGameOver,
    });

    SoundManager.shared().setEnabled(isSoundEnabled);
    SoundManager.shared().setBaseUrl(`${assetsBasePath}/sounds`);
    SoundManager.shared().preloadAll().catch(() => {});

    const unsubscribe = session.subscribe(() => {
      setTick(t => t + 1);
    });

    return () => {
      unsubscribe();
    };
  }, [session, playerName1, playerName2, aiDifficulty, gameSpeed, isSoundEnabled, assetsBasePath, onGameOver]);

  const whitePips = ComputerAI.calculatePipCount(session.board, 'white');
  const blackPips = ComputerAI.calculatePipCount(session.board, 'black');
  const whiteBarCount = session.board.barCount('white');
  const blackBarCount = session.board.barCount('black');
  const isHumanTurn = session.currentPlayer === 'white';

  const getVictoryLabel = (type: VictoryType | null) => {
    switch (type) {
      case 'home_mars':
        return 'مارس خانگی (۳ امتیاز)';
      case 'mars':
        return 'مارس (۲ امتیاز)';
      default:
        return 'برد معمولی (۱ امتیاز)';
    }
  };

  return (
    <div
      dir="rtl"
      className={`relative w-full h-full flex flex-col items-center justify-between bg-stone-950 text-stone-100 font-sans select-none overflow-hidden p-2 ${className}`}
    >
      {/* --- TOP STATUS BAR --- */}
      <div className="w-full max-w-5xl flex items-center justify-between px-3 py-2 bg-stone-900/80 border border-stone-800 rounded-2xl shadow-xl backdrop-blur-md z-20 gap-3">
        {/* White Player (Human) */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-stone-900 shadow-md transition-all ${
              isHumanTurn && !session.isRollOffActive
                ? 'bg-amber-300 ring-4 ring-amber-500/30 scale-105'
                : 'bg-stone-200'
            }`}
          >
            ⚪
          </div>
          <div className="text-right min-w-0">
            <div className="font-bold text-xs truncate max-w-[120px]">{playerName1}</div>
            <div className="text-[11px] text-stone-400">
              پیپ: <span className="text-stone-200 font-semibold">{whitePips}</span> | خارج: {session.board.borneOffCount('white')}/۱۵
              {whiteBarCount > 0 && <span className="text-amber-400 font-bold mr-1"> (بار: {whiteBarCount})</span>}
            </div>
          </div>
        </div>

        {/* Center: Turn Info & Actions */}
        <div className="flex items-center gap-2">
          {session.undoStack.length > 0 && !session.isAiMoving && isHumanTurn && (
            <button
              onClick={() => session.undo()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition active:scale-95"
              title="بازگرداندن حرکت"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 7v6h6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>بازگشت ({session.undoStack.length})</span>
            </button>
          )}

          <button
            onClick={() => session.startNewGame()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold shadow-md transition active:scale-95"
            title="شروع مجدد بازی"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>بازی جدید</span>
          </button>
        </div>

        {/* Black Player (AI) */}
        <div className="flex items-center gap-2.5 min-w-0 flex-row-reverse text-left">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md transition-all ${
              !isHumanTurn && !session.isRollOffActive
                ? 'bg-stone-700 ring-4 ring-sky-500/30 scale-105 border border-sky-400'
                : 'bg-stone-800 border border-stone-700'
            }`}
          >
            ⚫
          </div>
          <div className="text-left min-w-0">
            <div className="font-bold text-xs truncate max-w-[120px]">{playerName2}</div>
            <div className="text-[11px] text-stone-400">
              پیپ: <span className="text-stone-200 font-semibold">{blackPips}</span> | خارج: {session.board.borneOffCount('black')}/۱۵
              {blackBarCount > 0 && <span className="text-rose-400 font-bold ml-1"> (بار: {blackBarCount})</span>}
            </div>
          </div>
        </div>
      </div>

      {/* --- CENTER BOARD CANVAS --- */}
      <div className="flex-1 w-full h-full min-h-0 flex items-center justify-center relative overflow-hidden py-1">
        <BoardCanvas
          session={session}
          boardTheme={boardTheme}
          boardSide="right"
          assetsBasePath={assetsBasePath}
        />

        {/* --- ROLL-OFF MODAL (شروع بازی و تعیین تاس اول) --- */}
        {session.isRollOffActive && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 text-center max-w-sm w-full shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-stone-100">پرتاب تاس آغازین (Roll-Off)</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                هر بازیکن یک تاس می‌اندازد؛ بازیکنی که تاس بزرگ‌تری بیاورد بازی را آغاز می‌کند.
              </p>

              <div className="flex items-center justify-center gap-6 py-2">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-xs font-semibold text-stone-300">{playerName1}</span>
                  {session.whiteRollOffDie ? (
                    <SingleDie value={session.whiteRollOffDie} size={54} isRolling={session.isRolling} />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-stone-700 flex items-center justify-center text-xs text-stone-500">
                      سفید
                    </div>
                  )}
                </div>

                <span className="text-sm font-bold text-stone-600">در برابر</span>

                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-xs font-semibold text-stone-300">{playerName2}</span>
                  {session.blackRollOffDie ? (
                    <SingleDie value={session.blackRollOffDie} size={54} isRolling={session.isRolling} />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-stone-700 flex items-center justify-center text-xs text-stone-500">
                      سیاه
                    </div>
                  )}
                </div>
              </div>

              {!session.isRolling && (
                <button
                  onClick={() => session.performRollOff()}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-sm shadow-lg shadow-amber-600/30 transition active:scale-98"
                >
                  🎲 پرتاب تاس شروع
                </button>
              )}
            </div>
          </div>
        )}

        {/* --- VICTORY MODAL (پایان بازی و اعلام برنده) --- */}
        {session.isGameOver && session.winner && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 text-center max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl shadow-inner">
                🏆
              </div>

              <div>
                <h2 className="text-xl font-bold text-stone-100">
                  {session.winner === 'white' ? playerName1 : playerName2} پیروز شد!
                </h2>
                <p className="text-sm font-medium text-amber-400 mt-1">
                  {getVictoryLabel(session.victoryType)}
                </p>
              </div>

              <p className="text-xs text-stone-400">
                تمام ۱۵ مهره زودتر از حریف از تخته خارج شدند.
              </p>

              <button
                onClick={() => session.startNewGame()}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition active:scale-98"
              >
                🔄 بازی مجدد
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
