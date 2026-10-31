/* MainMenuScreen.tsx
 * Landscape-First Main Menu Screen for Traditional Iranian Backgammon:
 * - 2-Column horizontal layout optimized for landscape phones, tablets and desktop
 * - Single Player (vs AI), Local 2-Player (Pass & Play)
 * - Settings, Rules, Statistics modals & sound toggle
 */

import React from 'react';
import {
  Play,
  Users,
  Settings as SettingsIcon,
  HelpCircle,
  BarChart2,
  Volume2,
  VolumeX,
  Bot
} from 'lucide-react';
import { GameSettings } from '../logic/settingsStore';
import { Localization } from '../logic/localization';

interface MainMenuScreenProps {
  settings: GameSettings;
  onStartVsAi: () => void;
  onStartTwoPlayer: () => void;
  onOpenSettings: () => void;
  onOpenRules: () => void;
  onOpenStats: () => void;
  onToggleSound: () => void;
}

export const MainMenuScreen: React.FC<MainMenuScreenProps> = ({
  settings,
  onStartVsAi,
  onStartTwoPlayer,
  onOpenSettings,
  onOpenRules,
  onOpenStats,
  onToggleSound,
}) => {
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950 text-stone-100 select-none overflow-hidden p-3 sm:p-6"
    >
      {/* Background Board Artwork with atmospheric dark vignette */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-xs scale-105"
        style={{
          backgroundImage: `url('./assets/images/${settings.boardTheme === 'wood' ? 'wood_board.png' : settings.boardTheme === 'marble' ? 'marble_board.png' : 'board.png'}')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/80 to-stone-950/90 pointer-events-none" />

      {/* Top Bar inside Menu */}
      <header className="absolute top-0 inset-x-0 px-4 sm:px-6 py-2.5 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎲</span>
          <span className="text-xs sm:text-sm font-bold text-amber-300">
            {Localization.t('windowTitle')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSound}
            title={settings.isSoundEnabled ? 'قطع صدا' : 'وصل صدا'}
            className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700/50 text-stone-300 transition active:scale-95"
          >
            {settings.isSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-rose-400" />}
          </button>
        </div>
      </header>

      {/* Main 2-Column Landscape Menu Layout */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between max-w-3xl w-full gap-4 sm:gap-8 px-2 my-auto">
        {/* Right Column: Title & Emblem */}
        <div className="flex flex-col items-center md:items-start text-center md:text-right space-y-2 flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <span>شاه‌مهره نرد سنتی</span>
            <span>•</span>
            <span>قوانین اصیل ایرانی</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-200 tracking-tight">
            تخته نرد سنتی ایرانی
          </h1>

          <p className="text-xs text-stone-400 max-w-sm leading-relaxed hidden sm:block">
            قوانین اصیل ایرانی با پیشخوان وسط (Bar)، زدن تک‌مهره‌ها، خانه‌داری و رقابت با هوش مصنوعی هوشمند
          </p>

          <div className="flex items-center gap-2 pt-1 text-[11px] text-stone-500 font-medium">
            <span className="px-2 py-0.5 rounded-md bg-stone-900 border border-stone-800">
              سطح هوش مصنوعی: {settings.aiDifficulty === 'master' ? 'Grandmaster' : 'Casual'}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-stone-900 border border-stone-800">
              طرح: {settings.boardTheme === 'wood' ? 'چوب' : settings.boardTheme === 'marble' ? 'مرمر' : 'کلاسیک'}
            </span>
          </div>
        </div>

        {/* Left Column: Action Buttons */}
        <div className="flex flex-col w-full md:w-72 lg:w-80 space-y-2.5 shrink-0">
          {/* Play vs AI Button */}
          <button
            onClick={onStartVsAi}
            className="w-full group py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-600/25 border border-emerald-400/30 flex items-center justify-between transition-all duration-200 active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                <Play size={16} className="fill-white" />
              </div>
              <div className="text-right">
                <div className="font-bold text-xs sm:text-sm">بازی با هوش مصنوعی</div>
                <div className="text-[10px] text-emerald-100/80 font-normal">تک‌نفره با هوش مصنوعی</div>
              </div>
            </div>
            <Bot size={20} className="text-emerald-200 group-hover:scale-110 transition shrink-0" />
          </button>

          {/* Local 2-Player Button */}
          <button
            onClick={onStartTwoPlayer}
            className="w-full group py-3 px-4 rounded-2xl bg-stone-900/90 hover:bg-stone-800/90 text-stone-100 font-bold text-xs sm:text-sm shadow-lg border border-stone-800 hover:border-amber-500/40 flex items-center justify-between transition-all duration-200 active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                <Users size={16} />
              </div>
              <div className="text-right">
                <div className="font-bold text-xs sm:text-sm">بازی دونفره محلی</div>
                <div className="text-[10px] text-stone-400 font-normal">دونفره روی یک دستگاه (Pass & Play)</div>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-800 text-amber-400 border border-stone-700">
              Pass & Play
            </span>
          </button>

          {/* Utility Row: Settings, Rules, Stats */}
          <div className="grid grid-cols-3 gap-2 pt-0.5">
            <button
              onClick={onOpenSettings}
              className="py-2.5 px-1.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-white flex flex-col items-center gap-1 transition active:scale-95"
            >
              <SettingsIcon size={16} className="text-amber-400" />
              <span className="text-[11px] font-semibold">{Localization.t('settingsMenu')}</span>
            </button>

            <button
              onClick={onOpenRules}
              className="py-2.5 px-1.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-white flex flex-col items-center gap-1 transition active:scale-95"
            >
              <HelpCircle size={16} className="text-teal-400" />
              <span className="text-[11px] font-semibold">{Localization.t('rulesMenuItem')}</span>
            </button>

            <button
              onClick={onOpenStats}
              className="py-2.5 px-1.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-white flex flex-col items-center gap-1 transition active:scale-95"
            >
              <BarChart2 size={16} className="text-sky-400" />
              <span className="text-[11px] font-semibold">{Localization.t('statsMenu')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
