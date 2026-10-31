/* LoadingScreen.tsx
 * High-polish introductory loading screen for Traditional Iranian Backgammon:
 * - Preloads boards, checkers, and Web Audio API binary SFX
 * - Animated Persian dice & progress bar
 */

import React, { useEffect, useState } from 'react';
import { SoundManager } from '../logic/soundManager';

interface LoadingScreenProps {
  onLoaded: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onLoaded }) => {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('در حال آماده‌سازی منابع بازی...');

  useEffect(() => {
    let isCancelled = false;

    // Safety fallback: guaranteed to transition within 2.5s even if network is very slow
    const safetyTimer = setTimeout(() => {
      if (!isCancelled) {
        onLoaded();
      }
    }, 2500);

    const runPreload = async () => {
      try {
        // Step 1: Preload audio with max 1.2s timeout
        setStatusText('در حال بارگذاری افکت‌های صوتی...');
        setProgress(35);
        await Promise.race([
          SoundManager.shared().preloadAll(),
          new Promise(r => setTimeout(r, 1200))
        ]);

        if (isCancelled) return;

        // Step 2: Preload only existing marble board and checkers
        setStatusText('در حال بارگذاری تخته و مهره‌ها...');
        setProgress(65);

        const imagesToPreload = [
          './assets/images/marble_board.png',
          './assets/images/marble_white.png',
          './assets/images/marble_black.png',
        ];

        const imgPromises = imagesToPreload.map(src => {
          return new Promise<void>(resolve => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        });

        await Promise.race([
          Promise.all(imgPromises),
          new Promise(r => setTimeout(r, 1500))
        ]);

        if (isCancelled) return;

        // Step 3: Complete
        setStatusText('بارگذاری کامل شد!');
        setProgress(100);

        await new Promise(r => setTimeout(r, 300));
        clearTimeout(safetyTimer);
        if (!isCancelled) {
          onLoaded();
        }
      } catch {
        clearTimeout(safetyTimer);
        if (!isCancelled) onLoaded();
      }
    };

    runPreload();

    return () => {
      isCancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [onLoaded]);

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 text-stone-100 select-none overflow-hidden p-4 sm:p-6"
    >
      {/* Decorative background glow */}
      <div className="absolute w-96 h-96 rounded-full bg-amber-600/10 blur-3xl pointer-events-none" />
      <div className="absolute w-72 h-72 rounded-full bg-emerald-600/10 blur-2xl pointer-events-none -bottom-10" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center space-y-6">
        {/* Animated Dice / Emblem */}
        <div className="relative flex items-center justify-center gap-3 animate-bounce">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-300 text-stone-900 flex items-center justify-center shadow-2xl border-2 border-stone-200 text-3xl font-black rotate-[-6deg]">
            ⚄
          </div>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-stone-950 flex items-center justify-center shadow-2xl border-2 border-amber-400 text-3xl font-black rotate-[8deg]">
            ⚅
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200">
            تخته نرد سنتی ایرانی
          </h1>
          <p className="text-xs text-stone-400 font-medium">
            قوانین اصیل ایرانی • زدن تک‌مهره • پیشخوان بار
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-2 pt-4">
          <div className="w-full h-2.5 bg-stone-800/80 rounded-full overflow-hidden border border-stone-700/60 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-teal-400 rounded-full transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-stone-400 font-medium px-1">
            <span>{statusText}</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
