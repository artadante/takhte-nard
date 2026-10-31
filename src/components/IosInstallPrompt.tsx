/* IosInstallPrompt.tsx
 * Safari iOS Add to Home Screen Tutorial Overlay:
 * - Appears when user opens the site in Safari browser (not yet installed to Home Screen)
 * - Clear 3-step visual Persian guide with icons
 * - Bouncing arrow pointing towards Safari's share button
 */

import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, ArrowDown, ExternalLink } from 'lucide-react';

export const IosInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState<boolean>(false);

  useEffect(() => {
    // Check if running on iOS (iPhone, iPad, iPod)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Check if already in standalone PWA mode (Add to Home Screen)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone === true);

    // If opened in Safari browser (not standalone), show the tutorial!
    if (isIos && !isStandalone) {
      setShowPrompt(true);
    }
  }, []);

  if (!showPrompt) {
    return null;
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[120] flex flex-col items-center justify-between bg-stone-950/95 backdrop-blur-xl text-stone-100 p-6 select-none overflow-y-auto animate-fade-in"
    >
      {/* Decorative Glow */}
      <div className="absolute top-10 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-3 pt-4 max-w-sm w-full">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-stone-950 flex items-center justify-center shadow-xl border-2 border-amber-400 text-3xl font-black">
          🎲
        </div>

        <div className="space-y-1">
          <span className="text-xs font-semibold px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
            مرحله ۱ از ۲: افزودن به صفحه اصلی
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-200">
            نصب برنامه تخته نرد روی آیفون
          </h2>
          <p className="text-xs text-stone-300 leading-relaxed">
            برای اجرای تمام‌صفحه، حذف نوار مرورگر و تجربه اجرای روان مانند یک اپ بومی، لطفاً این ۳ گام ساده را انجام دهید:
          </p>
        </div>
      </div>

      {/* 3 Step Tutorial Cards */}
      <div className="relative z-10 w-full max-w-sm space-y-2.5 my-auto py-3">
        {/* Step 1 */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
            <Share size={20} />
          </div>
          <div className="text-right">
            <div className="font-bold text-xs sm:text-sm text-stone-100">
              ۱. لمس دکمه اشتراک‌گذاری (Share)
            </div>
            <div className="text-[11px] text-stone-400">
              در پایین مرورگر سافاری روی آیکون اشتراک‌گذاری (مربع با فلش رو به بالا) بزنید.
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <PlusSquare size={20} />
          </div>
          <div className="text-right">
            <div className="font-bold text-xs sm:text-sm text-stone-100">
              ۲. انتخاب «Add to Home Screen»
            </div>
            <div className="text-[11px] text-stone-400">
              منوی بازشده را کمی به پایین کشیده و گزینه «Add to Home Screen» (افزودن به صفحه اصلی) را انتخاب کنید.
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <ExternalLink size={20} />
          </div>
          <div className="text-right">
            <div className="font-bold text-xs sm:text-sm text-stone-100">
              ۳. زدن دکمه Add و باز کردن بازی
            </div>
            <div className="text-[11px] text-stone-400">
              در گوشه بالا دکمه «Add» را بزنید. سپس برنامه را از روی صفحه گوشی باز کنید.
            </div>
          </div>
        </div>
      </div>

      {/* Footer & Safari Pointer */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm space-y-3 pb-2 text-center">
        <button
          onClick={() => setShowPrompt(false)}
          className="text-xs text-stone-400 hover:text-stone-200 underline underline-offset-4 py-1 transition"
        >
          ادامه موقت در همین مرورگر
        </button>

        {/* Animated pointer arrow pointing to the bottom share button */}
        <div className="flex flex-col items-center gap-1 text-amber-400 animate-bounce">
          <span className="text-[11px] font-bold">دکمه Share در نوار پایین مرورگر سافاری</span>
          <ArrowDown size={22} className="stroke-[2.5]" />
        </div>
      </div>
    </div>
  );
};
