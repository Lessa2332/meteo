import React from 'react';
import { Settings, Sparkles, MapPin, Download, Volume2, VolumeX } from 'lucide-react';
import { Language, Profile } from '../types';
import { getT } from '../i18n/translations';
import { sound } from '../utils/audio';

interface HeaderProps {
  lang: Language;
  onSetLang: (l: Language) => void;
  activeProfile: Profile;
  onOpenProfileModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenCityModal: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  activeTab: 'calendar' | 'lab' | 'quests' | 'stats';
  onSelectTab: (tab: 'calendar' | 'lab' | 'quests' | 'stats') => void;
  canInstallPwa: boolean;
  onInstallPwa: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onSetLang,
  activeProfile,
  onOpenProfileModal,
  onOpenSettingsModal,
  onOpenCityModal,
  soundEnabled,
  onToggleSound,
  activeTab,
  onSelectTab,
  canInstallPwa,
  onInstallPwa
}) => {
  const t = getT(lang);

  const navItems: Array<{ id: 'calendar' | 'lab' | 'quests' | 'stats'; labelKey: string }> = [
    { id: 'calendar', labelKey: 'nav.calendar' },
    { id: 'lab', labelKey: 'nav.lab' },
    { id: 'quests', labelKey: 'nav.quests' },
    { id: 'stats', labelKey: 'nav.stats' }
  ];

  const handleTabClick = (tab: 'calendar' | 'lab' | 'quests' | 'stats') => {
    sound.playTap();
    onSelectTab(tab);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs px-safe pt-safe transition-all">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5 py-2.5 px-3">
        {/* Zone 1: Wordmark & Location */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-sky-500 flex items-center justify-center text-white text-lg shadow-sm font-bold shrink-0">
              🌤️
            </span>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 leading-none">
                {t('app.name')}
              </span>
              <span className="text-[11px] font-medium text-slate-500 mt-0.5">
                {t('app.forKids')}
              </span>
            </div>
          </div>

          {/* Quick city trigger */}
          <button
            onClick={() => {
              sound.playTap();
              onOpenCityModal();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-xs font-semibold text-slate-700 transition-colors"
            title={t('act.changeCity')}
          >
            <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate max-w-[110px] md:max-w-[150px]">
              {activeProfile.city.name}
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Tabs */}
        <nav className="flex items-center justify-center p-1 bg-slate-100/90 rounded-xl gap-1 shrink-0 overflow-x-auto no-scrollbar">
          {navItems.map(item => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {item.id === 'lab' && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                {t(item.labelKey)}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions & Profile */}
        <div className="flex items-center justify-end gap-1.5 shrink-0">
          {/* PWA Install Button if available */}
          {canInstallPwa && (
            <button
              onClick={onInstallPwa}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-lg hover:bg-amber-100 transition-all shrink-0 animate-pulse"
              title={t('act.installApp')}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('act.installApp')}</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => {
              onToggleSound();
              sound.playTap();
            }}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            title={t('set.sound')}
            aria-label={t('set.sound')}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Language Selector */}
          <div className="inline-flex bg-slate-100 rounded-lg p-0.5 text-xs font-bold text-slate-600 shrink-0">
            {(['uk', 'en', 'es'] as Language[]).map(l => (
              <button
                key={l}
                onClick={() => {
                  sound.playTap();
                  onSetLang(l);
                }}
                className={`px-2 py-1 rounded-md uppercase transition-colors ${
                  lang === l ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Profile Button */}
          <button
            onClick={() => {
              sound.playTap();
              onOpenProfileModal();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 transition-colors shrink-0"
          >
            <span className="text-base leading-none">{activeProfile.avatar}</span>
            <span className="truncate max-w-[75px] md:max-w-[100px]">{activeProfile.name}</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => {
              sound.playTap();
              onOpenSettingsModal();
            }}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            title={t('set.title')}
            aria-label={t('set.title')}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
