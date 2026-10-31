/* Modals.tsx
 * Dialog overlays: Settings, Game Rules, Player Statistics, and Victory Screen.
 */

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Volume2,
  VolumeX,
  Palette,
  Trophy,
  Bot,
} from 'lucide-react';
import { Localization } from '../logic/localization';
import { GameSettings, SettingsStore } from '../logic/settingsStore';
import { PlayerStats, StatsStore } from '../logic/statsStore';
import { AIDifficulty, BoardSide, BoardTheme, VictoryType } from '../logic/models';

interface ModalWrapperProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-fade-in">
    <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950/60">
        <h2 className="text-lg font-bold text-stone-100 flex items-center gap-2">
          {title}
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition"
        >
          <X size={20} />
        </button>
      </div>
      <div className="p-5 overflow-y-auto space-y-5 text-stone-300 text-sm">
        {children}
      </div>
    </div>
  </div>
);

// 1. Settings Modal
export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const store = SettingsStore.shared();
  const [settings, setSettings] = useState<GameSettings>(store.get());

  if (!isOpen) return null;

  const update = (partial: Partial<GameSettings>) => {
    store.update(partial);
    setSettings(store.get());
  };

  const handleLanguageChange = async (lang: string) => {
    update({ language: lang });
    await Localization.setLanguage(lang);
  };

  return (
    <ModalWrapper title={Localization.t('settingsHeader')} onClose={onClose}>
      {/* Language */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
          {Localization.t('settingsLanguageLabel')}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'fa', name: 'فارسی' },
            { id: 'en', name: 'English' },
            { id: 'ru', name: 'Русский' },
            { id: 'tr', name: 'Türkçe' },
            { id: 'az', name: 'Azərbaycan' },
            { id: 'de', name: 'Deutsch' },
          ].map(lang => (
            <button
              key={lang.id}
              onClick={() => handleLanguageChange(lang.id)}
              className={`py-2 px-3 rounded-xl border text-center font-medium transition ${
                settings.language === lang.id
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                  : 'border-stone-800 bg-stone-950 hover:bg-stone-800 text-stone-300'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      </div>

      {/* Board Theme */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
          <Palette size={14} />
          {Localization.t('settingsThemeLabel')}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'wood' as BoardTheme, name: Localization.t('settingsThemeWood') },
            { id: 'marble' as BoardTheme, name: Localization.t('settingsThemeMarble') },
            { id: 'classic' as BoardTheme, name: 'کلاسیک' },
          ].map(th => (
            <button
              key={th.id}
              onClick={() => update({ boardTheme: th.id })}
              className={`py-2 px-3 rounded-xl border text-center font-medium transition ${
                settings.boardTheme === th.id
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold'
                  : 'border-stone-800 bg-stone-950 hover:bg-stone-800 text-stone-300'
              }`}
            >
              {th.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sound */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950/70 border border-stone-800">
        <span className="flex items-center gap-2">
          {settings.isSoundEnabled ? <Volume2 size={18} className="text-emerald-400" /> : <VolumeX size={18} className="text-stone-500" />}
          <span>{Localization.t('settingsSoundLabel')}</span>
        </span>
        <button
          onClick={() => update({ isSoundEnabled: !settings.isSoundEnabled })}
          className={`w-12 h-6 rounded-full transition-colors p-0.5 ${
            settings.isSoundEnabled ? 'bg-emerald-500' : 'bg-stone-700'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white transition-transform ${
              settings.isSoundEnabled ? 'ltr:translate-x-6 rtl:-translate-x-6' : ''
            }`}
          />
        </button>
      </div>

      {/* AI Difficulty */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
          <Bot size={14} />
          {Localization.t('settingsAIDifficultyLabel')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'master' as AIDifficulty, label: Localization.t('settingsAIMaster') },
            { id: 'standard' as AIDifficulty, label: Localization.t('settingsAIStandard') },
          ].map(ai => (
            <button
              key={ai.id}
              onClick={() => update({ aiDifficulty: ai.id })}
              className={`py-2 px-3 rounded-xl border text-center font-medium transition ${
                settings.aiDifficulty === ai.id
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold'
                  : 'border-stone-800 bg-stone-950 hover:bg-stone-800 text-stone-300'
              }`}
            >
              {ai.label}
            </button>
          ))}
        </div>
      </div>

      {/* Board Side */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
          {Localization.t('settingsBoardSideLabel')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'right' as BoardSide, label: Localization.t('settingsBoardSideRight') },
            { id: 'left' as BoardSide, label: Localization.t('settingsBoardSideLeft') },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => update({ boardSide: s.id })}
              className={`py-2 px-3 rounded-xl border text-center font-medium transition ${
                settings.boardSide === s.id
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400 font-bold'
                  : 'border-stone-800 bg-stone-950 hover:bg-stone-800 text-stone-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Show Cell Indices */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950/70 border border-stone-800">
        <span>{Localization.t('settingsShowCellIndicesLabel')}</span>
        <button
          onClick={() => update({ showCellIndices: !settings.showCellIndices })}
          className={`w-12 h-6 rounded-full transition-colors p-0.5 ${
            settings.showCellIndices ? 'bg-blue-500' : 'bg-stone-700'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white transition-transform ${
              settings.showCellIndices ? 'ltr:translate-x-6 rtl:-translate-x-6' : ''
            }`}
          />
        </button>
      </div>
    </ModalWrapper>
  );
};

// 2. Rules Modal
export const RulesModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <ModalWrapper title={Localization.t('rulesTitle')} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-stone-100 mb-1">{Localization.t('rulesGoalTitle')}</h3>
          <p className="text-stone-300 leading-relaxed">{Localization.t('rulesGoalText')}</p>
        </div>

        <div>
          <h3 className="font-bold text-stone-100 mb-1">{Localization.t('rulesMovementTitle')}</h3>
          <p className="text-stone-300 whitespace-pre-line leading-relaxed">{Localization.t('rulesMovementText')}</p>
        </div>

        <div>
          <h3 className="font-bold text-stone-100 mb-1">{Localization.t('rulesHeadTitle')}</h3>
          <p className="text-stone-300 whitespace-pre-line leading-relaxed">{Localization.t('rulesHeadText')}</p>
        </div>

        <div>
          <h3 className="font-bold text-stone-100 mb-1">{Localization.t('rulesBlockTitle')}</h3>
          <p className="text-stone-300 whitespace-pre-line leading-relaxed">{Localization.t('rulesBlockText')}</p>
        </div>

        <div>
          <h3 className="font-bold text-stone-100 mb-1">{Localization.t('rulesHomeTitle')}</h3>
          <p className="text-stone-300 whitespace-pre-line leading-relaxed">{Localization.t('rulesHomeText')}</p>
        </div>

        <div>
          <h3 className="font-bold text-stone-100 mb-1">{Localization.t('rulesVictoryTitle')}</h3>
          <p className="text-stone-300 whitespace-pre-line leading-relaxed">{Localization.t('rulesVictoryText')}</p>
        </div>
      </div>
    </ModalWrapper>
  );
};

// 3. Stats Modal
export const StatsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const store = StatsStore.shared();
  const [stats, setStats] = useState<PlayerStats>(store.get());

  if (!isOpen) return null;

  const handleReset = () => {
    if (confirm(Localization.t('statsResetConfirmationMessage'))) {
      store.reset();
      setStats(store.get());
    }
  };

  const totalGames = stats.wins + stats.losses;
  const winRate = store.getWinRate();

  return (
    <ModalWrapper title={Localization.t('statsTitle')} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-center">
          <div className="text-xs text-stone-400 mb-1">مجموع بازی‌ها</div>
          <div className="text-2xl font-bold text-stone-100">{totalGames}</div>
        </div>
        <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-center">
          <div className="text-xs text-stone-400 mb-1">{Localization.t('statsWinRate')}</div>
          <div className="text-2xl font-bold text-emerald-400">{winRate}%</div>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <div className="flex justify-between py-2 border-b border-stone-800">
          <span className="text-stone-400">{Localization.t('statsOinVictories')} (۱ امتیاز)</span>
          <span className="font-semibold text-stone-200">{stats.oinVictories}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-stone-800">
          <span className="text-stone-400">{Localization.t('statsMarsVictories')} (۲ امتیاز)</span>
          <span className="font-semibold text-amber-400">{stats.marsVictories}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-stone-800">
          <span className="text-stone-400">{Localization.t('statsHomeMarsVictories')} (۳ امتیاز)</span>
          <span className="font-semibold text-rose-400">{stats.homeMarsVictories}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-stone-800">
          <span className="text-stone-400">{Localization.t('statsLosses')}</span>
          <span className="font-semibold text-stone-300">{stats.losses}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="font-bold text-stone-200">{Localization.t('statsTotalPoints')}</span>
          <span className="font-bold text-emerald-400 text-lg">{stats.totalPoints}</span>
        </div>
      </div>

      <button
        onClick={handleReset}
        className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold transition"
      >
        {Localization.t('statsResetButton')}
      </button>
    </ModalWrapper>
  );
};

// 4. Victory / Game Over Modal
export const VictoryModal: React.FC<{
  isOpen: boolean;
  winner: string;
  victoryType: VictoryType | null;
  onNewGame: () => void;
}> = ({ isOpen, winner, victoryType, onNewGame }) => {
  // Trigger celebration confetti
  React.useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getVictoryLabel = () => {
    if (victoryType === 'home_mars') return Localization.t('victoryHomeMars');
    if (victoryType === 'mars') return Localization.t('victoryMars');
    return Localization.t('victoryOin');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-800 rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
          <Trophy size={36} />
        </div>

        <div>
          <h2 className="text-2xl font-black text-stone-100">{winner} برنده شد!</h2>
          <p className="text-amber-400 font-bold mt-1 text-sm">{getVictoryLabel()}</p>
        </div>

        <button
          onClick={onNewGame}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition"
        >
          {Localization.t('buttonNewGame')}
        </button>
      </div>
    </div>
  );
};

// 5. Leave Game Two-Step Confirmation Modal
export const LeaveConfirmModal: React.FC<{
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30 text-2xl font-bold">
          🚪
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-stone-100">خروج از بازی</h3>
          <p className="text-xs text-stone-300 leading-relaxed">
            آیا مطمئن هستید که می‌خواهید بازی جاری را ترک کنید و به صفحه اصلی بازگردید؟
          </p>
        </div>

        <div className="flex items-center gap-2.5 pt-2">
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-600/20 active:scale-95 transition"
          >
            بله، خروج به منو
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs sm:text-sm active:scale-95 transition"
          >
            ادامه بازی
          </button>
        </div>
      </div>
    </div>
  );
};
