/* App.tsx
 * Traditional Iranian Backgammon (تخته نرد سنتی ایرانی)
 * High-End Mobile & Desktop Responsive App:
 * - Safari Add-to-Home-Screen Step 1 Tutorial
 * - Automatic Landscape Enforcer (چپ به راست)
 * - Maximum Sized Board (نوار بالا و پایین حذف شد تا تخته حداکثر فضا را بگیرد)
 * - Circular Player Avatars in top corners with names
 * - Single "Leave / خروج" button with 2-step confirmation to return to Main Menu
 */

import React, { useEffect, useState } from 'react';
import {
  RotateCcw,
  LogOut,
  Bot,
  User,
} from 'lucide-react';
import { GameSession } from './logic/gameSession';
import { BoardCanvas } from './components/BoardCanvas';
import { SingleDie } from './components/DiceView';
import { SettingsModal, RulesModal, StatsModal, VictoryModal, LeaveConfirmModal } from './components/Modals';
import { LoadingScreen } from './components/LoadingScreen';
import { MainMenuScreen } from './components/MainMenuScreen';
import { OrientationPrompt } from './components/OrientationPrompt';
import { IosInstallPrompt } from './components/IosInstallPrompt';
import { SettingsStore, GameSettings } from './logic/settingsStore';
import { Localization } from './logic/localization';
import { ComputerAI } from './logic/computerAi';
import { SoundManager } from './logic/soundManager';

export const App: React.FC = () => {
  const [session] = useState<GameSession>(GameSession.shared());
  const [settings, setSettings] = useState<GameSettings>(SettingsStore.shared().get());
  const [, setTick] = useState(0);

  // App Navigation Flow: 'loading' -> 'menu' -> 'game'
  const [currentView, setCurrentView] = useState<'loading' | 'menu' | 'game'>('loading');

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);

  useEffect(() => {
    Localization.init(settings.language).then(() => setTick(t => t + 1));

    const unsubSettings = SettingsStore.shared().subscribe(s => {
      setSettings(s);
      SoundManager.shared().setEnabled(s.isSoundEnabled);
    });

    const unsubSession = session.subscribe(() => {
      setTick(t => t + 1);
    });

    return () => {
      unsubSettings();
      unsubSession();
    };
  }, [session]);

  const isRTL = settings.language === 'fa';

  const whitePips = ComputerAI.calculatePipCount(session.board, 'white');
  const blackPips = ComputerAI.calculatePipCount(session.board, 'black');

  const whiteBarCount = session.board.barCount('white');
  const blackBarCount = session.board.barCount('black');

  const isHumanTurn = session.currentPlayer === 'white';
  const _canRoll = !session.isRollOffActive && isHumanTurn && session.remainingDice.length === 0 && !session.isGameOver;

  const handleStartGame = () => {
    session.startNewGame();
    setCurrentView('game');
  };

  const handleToggleSound = () => {
    const nextVal = !settings.isSoundEnabled;
    SettingsStore.shared().update({ isSoundEnabled: nextVal });
  };

  const handleConfirmLeave = () => {
    setIsLeaveConfirmOpen(false);
    setCurrentView('menu');
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="flex flex-col h-screen w-screen bg-stone-950 text-stone-100 font-sans select-none overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]"
    >
      {/* 1. Safari iOS Step-1 Add-to-Home-Screen Tutorial Overlay */}
      <IosInstallPrompt />

      {/* 2. Global Orientation Enforcer (tells user to rotate device to landscape) */}
      <OrientationPrompt />

      {/* 3. Loading Screen */}
      {currentView === 'loading' && (
        <LoadingScreen onLoaded={() => setCurrentView('menu')} />
      )}

      {/* 4. Main Menu Screen */}
      {currentView === 'menu' && (
        <MainMenuScreen
          settings={settings}
          onStartVsAi={handleStartGame}
          onStartTwoPlayer={handleStartGame}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenStats={() => setIsStatsOpen(true)}
          onToggleSound={handleToggleSound}
        />
      )}

      {/* 5. Active Game Screen - Fullscreen Widescreen Board without top/bottom bars */}
      {currentView === 'game' && (
        <div className="relative w-full h-full flex flex-row items-center justify-between overflow-hidden p-1 sm:p-2">
          {/* Top Center: Single "Leave (خروج)" Button */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30">
            <button
              onClick={() => setIsLeaveConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900/80 hover:bg-rose-950/80 text-stone-300 hover:text-rose-300 border border-stone-800 hover:border-rose-700/60 shadow-lg backdrop-blur-md text-xs font-semibold active:scale-95 transition"
              title="خروج از بازی"
            >
              <LogOut size={13} />
              <span>خروج (Leave)</span>
            </button>
          </div>

          {/* RIGHT SIDE: White Player Avatar, Dice & Controls */}
          <div className="flex flex-col items-center justify-between h-full z-20 shrink-0 w-24 sm:w-28 py-1">
            {/* Circular Profile Avatar (Top Right) */}
            <div className="flex flex-col items-center text-center space-y-1">
              <div
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-stone-100 to-stone-300 text-stone-900 flex items-center justify-center font-bold shadow-xl border-2 transition-all ${
                  session.currentPlayer === 'white' && !session.isRollOffActive
                    ? 'border-emerald-400 ring-4 ring-emerald-500/25 scale-105'
                    : 'border-stone-400'
                }`}
              >
                <User size={24} className="text-stone-800" />
                {session.currentPlayer === 'white' && !session.isRollOffActive && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-stone-950 animate-pulse" />
                )}
              </div>

              {/* Name & Stats */}
              <div className="min-w-0 px-1">
                <div className="font-bold text-xs text-stone-100 truncate max-w-[90px]">
                  {settings.playerName1}
                </div>
                <div className="text-[10px] text-stone-400 font-medium">
                  پیپ: <span className="text-stone-200">{whitePips}</span>
                </div>
                <div className="text-[10px] text-stone-400 font-medium">
                  خارج: <span className="text-stone-200">{session.board.borneOffCount('white')}/۱۵</span>
                </div>
                {whiteBarCount > 0 && (
                  <div className="text-[10px] font-bold text-amber-400 animate-pulse">
                    روی بار: {whiteBarCount}
                  </div>
                )}
              </div>
            </div>

            {/* White Player Undo Control */}
            <div className="flex flex-col items-center gap-2 pb-2">
              {session.undoStack.length > 0 && !session.isAiMoving && (
                <button
                  onClick={() => session.undo()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs shadow-md shadow-amber-600/20 active:scale-95 transition"
                  title="بازگرداندن مهره"
                >
                  <RotateCcw size={12} />
                  <span>بازگشت ({session.undoStack.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* CENTER: Widescreen 1920x1200 Backgammon Board */}
          <div className="flex-1 min-w-0 min-h-0 h-full flex items-center justify-center relative overflow-hidden">
            <BoardCanvas
              session={session}
              boardTheme={settings.boardTheme}
              boardSide={settings.boardSide}
              selectedPoint={session.selectedPoint}
              legalMoves={session.getLegalMoves()}
              showCellIndices={settings.showCellIndices}
              onSelectPoint={p => session.selectPoint(p)}
              onBearOff={() => session.bearOffSelected()}
            />

            {/* Roll-off Overlay if active */}
            {session.isRollOffActive && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-stone-900/95 border border-stone-800 rounded-3xl p-5 text-center max-w-sm w-full shadow-2xl space-y-3">
                  <h3 className="text-base font-bold text-stone-100">
                    {Localization.t('settingsFirstMoveRollOffLabel')}
                  </h3>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    هر بازیکن یک تاس می‌اندازد. تاسی که بزرگ‌تر باشد آغازگر بازی خواهد بود.
                  </p>

                  <div className="flex items-center justify-center gap-6 py-1">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[11px] font-semibold text-stone-300">{settings.playerName1} (سفید)</span>
                      {session.whiteRollOffDie ? (
                        <SingleDie value={session.whiteRollOffDie} size={50} isRolling={session.isRolling} />
                      ) : (
                        <div className="w-12 h-12 rounded-xl border-2 border-dashed border-stone-600 flex items-center justify-center text-xs text-stone-500">
                          سفید
                        </div>
                      )}
                    </div>

                    <span className="text-sm font-bold text-stone-600">VS</span>

                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[11px] font-semibold text-stone-300">{settings.playerName2} (سیاه)</span>
                      {session.blackRollOffDie ? (
                        <SingleDie value={session.blackRollOffDie} size={50} isRolling={session.isRolling} />
                      ) : (
                        <div className="w-12 h-12 rounded-xl border-2 border-dashed border-stone-600 flex items-center justify-center text-xs text-stone-500">
                          سیاه
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => session.performRollOff()}
                    disabled={session.isRolling}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition"
                  >
                    {session.isRolling ? 'در حال پرتاب...' : 'پرتاب تاس آغازین'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* LEFT SIDE: Black Player / AI Avatar & Dice */}
          <div className="flex flex-col items-center justify-between h-full z-20 shrink-0 w-24 sm:w-28 py-1">
            {/* Circular Profile Avatar (Top Left) */}
            <div className="flex flex-col items-center text-center space-y-1">
              <div
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-stone-800 to-stone-900 text-stone-100 flex items-center justify-center font-bold shadow-xl border-2 transition-all ${
                  session.currentPlayer === 'black' && !session.isRollOffActive
                    ? 'border-emerald-400 ring-4 ring-emerald-500/25 scale-105'
                    : 'border-stone-700'
                }`}
              >
                <Bot size={24} className="text-stone-300" />
                {session.currentPlayer === 'black' && !session.isRollOffActive && (
                  <span className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-stone-950 animate-pulse" />
                )}
              </div>

              {/* Name & Stats */}
              <div className="min-w-0 px-1">
                <div className="font-bold text-xs text-stone-100 truncate max-w-[90px]">
                  {settings.playerName2}
                </div>
                <div className="text-[10px] text-stone-400 font-medium">
                  پیپ: <span className="text-stone-200">{blackPips}</span>
                </div>
                <div className="text-[10px] text-stone-400 font-medium">
                  خارج: <span className="text-stone-200">{session.board.borneOffCount('black')}/۱۵</span>
                </div>
                {blackBarCount > 0 && (
                  <div className="text-[10px] font-bold text-amber-400 animate-pulse">
                    روی بار: {blackBarCount}
                  </div>
                )}
              </div>
            </div>


          </div>
        </div>
      )}

      {/* Global Modals */}
      <LeaveConfirmModal
        isOpen={isLeaveConfirmOpen}
        onConfirm={handleConfirmLeave}
        onCancel={() => setIsLeaveConfirmOpen(false)}
      />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <StatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} />
      <VictoryModal
        isOpen={session.isGameOver}
        winner={session.winner === 'white' ? settings.playerName1 : settings.playerName2}
        victoryType={session.victoryType}
        onNewGame={() => session.startNewGame()}
      />
    </div>
  );
};

export default App;
