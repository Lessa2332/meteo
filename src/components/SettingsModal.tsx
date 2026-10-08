import React from 'react';
import { X, ShieldCheck, Trash2, Eye, Volume2, Sparkles, Scale } from 'lucide-react';
import { A11ySettings, Language, Units } from '../types';
import { getT } from '../i18n/translations';
import { sound } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  units: Units;
  onSetUnits: (u: Units) => void;
  kidMode: boolean;
  onToggleKidMode: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  a11y: A11ySettings;
  onUpdateA11y: (a: Partial<A11ySettings>) => void;
  onWipeData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  lang,
  units,
  onSetUnits,
  kidMode,
  onToggleKidMode,
  soundEnabled,
  onToggleSound,
  a11y,
  onUpdateA11y,
  onWipeData
}) => {
  const t = getT(lang);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-base font-extrabold text-slate-900">{t('set.title')}</h3>
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Kid Mode */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{t('set.kidMode')}</span>
                <input
                  type="checkbox"
                  checked={kidMode}
                  onChange={onToggleKidMode}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                {t('set.kidModeHint')}
              </p>
            </div>
          </div>

          {/* Units */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              {t('set.units')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  onSetUnits('metric');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                  units === 'metric'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t('set.metric')}
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  onSetUnits('imperial');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                  units === 'imperial'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t('set.imperial')}
              </button>
            </div>
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-bold text-slate-800">{t('set.sound')}</span>
            </div>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={() => {
                onToggleSound();
                sound.playTap();
              }}
              className="w-4 h-4 accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Accessibility */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              {t('set.a11y')}
            </label>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer">
                <span>{t('set.contrast')}</span>
                <input
                  type="checkbox"
                  checked={a11y.hc}
                  onChange={e => onUpdateA11y({ hc: e.target.checked })}
                  className="w-4 h-4 accent-amber-500"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer">
                <span>{t('set.readable')}</span>
                <input
                  type="checkbox"
                  checked={a11y.readable}
                  onChange={e => onUpdateA11y({ readable: e.target.checked })}
                  className="w-4 h-4 accent-amber-500"
                />
              </label>
            </div>
          </div>

          {/* Privacy Guarantee */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span className="text-[11px] leading-relaxed">{t('privacy.guarantee')}</span>
          </div>

          {/* Wipe data */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                if (confirm(t('set.wipeConfirm'))) {
                  onWipeData();
                  onClose();
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t('set.wipe')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
