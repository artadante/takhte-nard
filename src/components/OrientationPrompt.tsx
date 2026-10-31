/* OrientationPrompt.tsx
 * Global Orientation Enforcer:
 * - Detects portrait orientation on mobile/tablet devices
 * - Prompts the user to rotate their device to landscape for the best backgammon board experience
 * - Uses .animate-rotate-phone CSS animation defined in index.css
 */

import React, { useState, useEffect } from 'react';
import { RotateCw, Smartphone } from 'lucide-react';

export const OrientationPrompt: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;

      // Strict check: whenever height is greater than width, enforce landscape!
      const isPortraitMode = window.innerHeight > window.innerWidth;
      setIsPortrait(isPortraitMode);
    };

    checkOrientation();

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Also support screen.orientation if available
    if (window.screen && window.screen.orientation) {
      window.screen.orientation.addEventListener('change', checkOrientation);
    }

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      if (window.screen && window.screen.orientation) {
        window.screen.orientation.removeEventListener('change', checkOrientation);
      }
    };
  }, []);

  if (!isPortrait) {
    return null;
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-stone-950/98 backdrop-blur-2xl text-stone-100 p-6 select-none animate-fade-in"
    >
      {/* Decorative Glow */}
      <div className="absolute w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full space-y-6">
        {/* Animated Phone Icon */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-amber-500/15 animate-ping opacity-30" />
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-stone-900 to-stone-800 border-2 border-amber-500/40 text-amber-400 flex items-center justify-center shadow-2xl animate-rotate-phone">
            <Smartphone size={46} className="stroke-[1.75]" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shadow-lg border-2 border-stone-950">
            <RotateCw size={18} className="animate-spin stroke-[2.5]" style={{ animationDuration: '3s' }} />
          </div>
        </div>

        {/* Heading & Badge */}
        <div className="space-y-2">
          <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
            حالت افقی بازی (Landscape)
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-200">
            گوشی را به حالت افقی بچرخانید
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed pt-1">
            برای نمایش کامل تخته نرد و جابجایی راحت مهره‌ها، لطفاً قفل چرخش خودکار گوشی را خاموش کرده و دستگاه خود را بچرخانید.
          </p>
        </div>

        {/* Tip Badge */}
        <div className="w-full p-3.5 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-lg text-right">
          <div className="flex items-center gap-2.5 text-xs text-stone-300">
            <span className="text-base">💡</span>
            <span>
              نکته: در صورت فعال بودن <strong>Auto-Rotate (چرخش خودکار)</strong>، با چرخاندن گوشی بازی به طور خودکار باز می‌شود.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
