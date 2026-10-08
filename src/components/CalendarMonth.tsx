import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Satellite, Plus, Printer, Download, Upload } from 'lucide-react';
import { Language, Profile, Units, WeatherRecord } from '../types';
import { getT } from '../i18n/translations';
import {
  getDaysInMonth,
  formatDateKey,
  getTodayKey,
  getTempColor,
  getContrastTextColor,
  toDispTemp,
  SKY_CONFIG
} from '../utils/weather';
import { sound } from '../utils/audio';

interface CalendarMonthProps {
  lang: Language;
  units: Units;
  viewYear: number;
  viewMonth: number; // 0-11
  onChangeMonth: (delta: number) => void;
  onGoToToday: () => void;
  activeProfile: Profile;
  onSelectDate: (key: string) => void;
  onCompareWithSatellite: () => void;
  isComparing: boolean;
  onOpenPrint: () => void;
  onExport: () => void;
  onImportTrigger: () => void;
}

export const CalendarMonth: React.FC<CalendarMonthProps> = ({
  lang,
  units,
  viewYear,
  viewMonth,
  onChangeMonth,
  onGoToToday,
  activeProfile,
  onSelectDate,
  onCompareWithSatellite,
  isComparing,
  onOpenPrint,
  onExport,
  onImportTrigger
}) => {
  const t = getT(lang);
  const todayKey = getTodayKey();

  const monthNames = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(2026, i, 1);
      return new Intl.DateTimeFormat(lang, { month: 'long' }).format(d);
    });
  }, [lang]);

  const weekDayNames = useMemo(() => {
    const startDay = lang === 'en' ? 0 : 1; // Sun vs Mon
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2026, 9, 4 + ((startDay + i) % 7)); // Sunday Oct 4 2026
      return {
        short: new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(d),
        long: new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(d)
      };
    });
  }, [lang]);

  const daysCount = getDaysInMonth(viewYear, viewMonth);

  // Calculate grid padding
  const startDayOffset = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const startDay = lang === 'en' ? 0 : 1;
    return (firstDay - startDay + 7) % 7;
  }, [viewYear, viewMonth, lang]);

  const monthRecords = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`;
    return Object.entries(activeProfile.records).filter(([key]) => key.startsWith(prefix));
  }, [activeProfile.records, viewYear, viewMonth]);

  const currentMonthTitle = `${monthNames[viewMonth]} ${viewYear}`;

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200/90 transition-all">
      {/* Month Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playStep(false);
              onChangeMonth(-1);
            }}
            className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight capitalize min-w-[170px]">
            {currentMonthTitle}
          </h2>

          <button
            onClick={() => {
              sound.playStep(true);
              onChangeMonth(1);
            }}
            className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              sound.playTap();
              onGoToToday();
            }}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-xs font-bold text-slate-700 transition-colors ml-1"
          >
            {t('act.today')}
          </button>
        </div>

        {/* Action Buttons: Compare, Add, Export, Print */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              sound.playTap();
              onCompareWithSatellite();
            }}
            disabled={isComparing || monthRecords.length === 0}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              isComparing
                ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                : 'bg-amber-500 hover:bg-amber-600 active:scale-95 text-white border-amber-600 shadow-xs'
            } disabled:opacity-50 disabled:pointer-events-none`}
            title="Порівняти спостереження з моделлю Open-Meteo"
          >
            <Satellite className="w-4 h-4" />
            <span>{isComparing ? t('act.comparing') : t('act.compare')}</span>
          </button>

          <button
            onClick={() => {
              sound.playTap();
              onSelectDate(todayKey);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('act.addRecord')}</span>
          </button>

          <button
            onClick={() => {
              sound.playTap();
              onOpenPrint();
            }}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
            title={t('act.print')}
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sound.playTap();
              onExport();
            }}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
            title={t('act.export')}
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sound.playTap();
              onImportTrigger();
            }}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
            title={t('act.import')}
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
        {weekDayNames.map((wd, idx) => (
          <div key={idx} className="text-xs font-bold text-slate-400 uppercase py-1">
            <span className="hidden sm:inline">{wd.long}</span>
            <span className="sm:hidden">{wd.short}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {/* Padding blanks before first day */}
        {Array.from({ length: startDayOffset }).map((_, i) => (
          <div key={`blank-${i}`} className="min-h-[58px] sm:min-h-[84px] opacity-0" />
        ))}

        {/* Days of current month */}
        {Array.from({ length: daysCount }).map((_, i) => {
          const dayNum = i + 1;
          const dateKey = formatDateKey(viewYear, viewMonth, dayNum);
          const rec: WeatherRecord | undefined = activeProfile.records[dateKey];
          const isToday = dateKey === todayKey;
          const isFuture = dateKey > todayKey;

          let bgStyle: React.CSSProperties = {};
          let textColor = 'text-slate-800';

          if (rec) {
            const color = getTempColor(rec.temp);
            const contrast = getContrastTextColor(rec.temp);
            bgStyle = { backgroundColor: color };
            textColor = contrast === '#ffffff' ? 'text-white' : 'text-slate-900';
          }

          const skyObj = rec ? SKY_CONFIG.find(s => s.type === rec.sky) : null;

          return (
            <button
              key={dateKey}
              onClick={() => {
                sound.playTap();
                onSelectDate(dateKey);
              }}
              disabled={isFuture}
              style={bgStyle}
              className={`min-h-[64px] sm:min-h-[88px] rounded-2xl p-2 sm:p-2.5 flex flex-col justify-between items-start text-left transition-all relative border ${
                rec
                  ? 'border-transparent shadow-xs hover:scale-[1.03]'
                  : isFuture
                  ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-60'
                  : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/80 hover:border-slate-300 active:scale-[0.98]'
              } ${isToday ? 'ring-3 ring-amber-500 ring-offset-2 font-black' : ''}`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-xs sm:text-sm font-bold ${
                    rec ? textColor : isToday ? 'text-amber-600 font-extrabold' : 'text-slate-600'
                  }`}
                >
                  {dayNum}
                </span>

                {skyObj && (
                  <span className="text-base sm:text-xl drop-shadow-xs" title={t(skyObj.labelKey)}>
                    {skyObj.icon}
                  </span>
                )}
              </div>

              {rec ? (
                <div className="w-full flex items-baseline justify-between mt-1">
                  <span className={`text-xs sm:text-base font-black tracking-tight ${textColor}`}>
                    {toDispTemp(rec.temp, units) > 0 ? '+' : ''}
                    {toDispTemp(rec.temp, units)}°
                  </span>

                  {rec.real && (
                    <span
                      className="text-[10px] px-1 py-0.2 rounded bg-black/20 text-white font-mono"
                      title="Є дані супутника Open-Meteo"
                    >
                      🛰️
                    </span>
                  )}
                </div>
              ) : !isFuture ? (
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                  + запис
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Legend & Summary Footer */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Color Spectrum */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
            Шкала тепла (°{units === 'imperial' ? 'F' : 'C'}):
          </span>
          <div className="flex-1 md:w-56 h-3 rounded-full bg-gradient-to-r from-blue-700 via-sky-300 via-emerald-300 via-amber-300 via-orange-400 to-red-600 border border-slate-200 shadow-inner" />
          <div className="flex justify-between text-[11px] font-bold text-slate-500 gap-2 shrink-0 font-mono">
            <span>{units === 'imperial' ? '-13°' : '-25°'}</span>
            <span>{units === 'imperial' ? '32°' : '0°'}</span>
            <span>{units === 'imperial' ? '95°' : '+35°'}</span>
          </div>
        </div>

        {/* Count Pill */}
        <div className="text-xs font-semibold text-slate-500">
          Записів цього місяця:{' '}
          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
            {monthRecords.length} із {daysCount} днів
          </span>
        </div>
      </div>
    </div>
  );
};
