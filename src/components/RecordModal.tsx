import React, { useState, useEffect } from 'react';
import { X, Trash2, Check, Clock, Cloud, Wind, Smile, FileText, Satellite } from 'lucide-react';
import { Language, MoodType, SkyType, Units, WeatherRecord } from '../types';
import { getT } from '../i18n/translations';
import {
  toDispTemp,
  fromDispTemp,
  toDispWind,
  fromDispWind,
  formatTempStr,
  formatWindStr,
  getTempColor,
  triggerConfetti,
  SKY_CONFIG,
  DIR_LABELS
} from '../utils/weather';
import { sound } from '../utils/audio';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  units: Units;
  dateKey: string;
  existingRecord?: WeatherRecord;
  onSave: (record: WeatherRecord) => void;
  onDelete: (key: string) => void;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  lang,
  units,
  dateKey,
  existingRecord,
  onSave,
  onDelete
}) => {
  const t = getT(lang);

  const [temp, setTemp] = useState<number>(18);
  const [time, setTime] = useState<string>('09:00');
  const [sky, setSky] = useState<SkyType>('clear');
  const [hum, setHum] = useState<number | null>(55);
  const [wind, setWind] = useState<number | null>(3);
  const [dir, setDir] = useState<number | null>(null);
  const [mood, setMood] = useState<MoodType | null>('joy');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (existingRecord) {
      setTemp(existingRecord.temp);
      setTime(existingRecord.t || '09:00');
      setSky(existingRecord.sky);
      setHum(existingRecord.hum);
      setWind(existingRecord.wind);
      setDir(existingRecord.dir);
      setMood(existingRecord.mood);
      setNotes(existingRecord.notes || '');
    } else {
      // Defaults for a new record
      setTemp(18);
      setTime('09:00');
      setSky('clear');
      setHum(55);
      setWind(3);
      setDir(null);
      setMood('joy');
      setNotes('');
    }
  }, [existingRecord, dateKey, isOpen]);

  if (!isOpen) return null;

  const displayTemp = toDispTemp(temp, units);
  const displayWind = wind !== null ? toDispWind(wind, units) : null;

  const handleTempDelta = (delta: number) => {
    sound.playStep(delta > 0);
    const currentDisp = toDispTemp(temp, units);
    const newDisp = Math.round((currentDisp + delta) * 10) / 10;
    setTemp(fromDispTemp(newDisp, units));
  };

  const handleWindDelta = (delta: number) => {
    sound.playStep(delta > 0);
    const currentDisp = wind !== null ? toDispWind(wind, units) : 0;
    const newDisp = Math.max(0, Math.round((currentDisp + delta) * 10) / 10);
    setWind(fromDispWind(newDisp, units));
  };

  const handleHumDelta = (delta: number) => {
    sound.playStep(delta > 0);
    setHum(prev => {
      const v = prev !== null ? prev : 50;
      return Math.min(100, Math.max(0, v + delta));
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playSuccess();
    triggerConfetti();

    const record: WeatherRecord = {
      key: dateKey,
      temp: Math.round(temp * 10) / 10,
      sky,
      t: time,
      hum,
      wind,
      dir,
      mood,
      notes,
      real: existingRecord?.real || null
    };

    onSave(record);
    onClose();
  };

  const formattedDate = new Intl.DateTimeFormat(lang, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(dateKey + 'T00:00:00'));

  const MOODS: Array<{ type: MoodType; icon: string; labelKey: string }> = [
    { type: 'joy', icon: '😀', labelKey: 'mood.joy' },
    { type: 'ok', icon: '😐', labelKey: 'mood.ok' },
    { type: 'sad', icon: '😢', labelKey: 'mood.sad' },
    { type: 'wow', icon: '🤩', labelKey: 'mood.wow' },
    { type: 'sleepy', icon: '😴', labelKey: 'mood.sleepy' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full sm:max-w-xl sm:rounded-3xl rounded-t-3xl shadow-xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="text-lg font-black text-slate-900 capitalize tracking-tight">
              {formattedDate}
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              {existingRecord ? 'Редагування спостереження' : 'Новий запис у щоденник'}
            </span>
          </div>

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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Temperature section with large tactile controls */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              {t('field.temp')}
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleTempDelta(-1)}
                className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 text-2xl font-black flex items-center justify-center active:scale-90 transition-all shrink-0"
              >
                ▼
              </button>

              <div
                className="flex-1 h-14 rounded-2xl flex items-center justify-center shadow-inner font-mono text-2xl font-black tracking-tight"
                style={{
                  backgroundColor: getTempColor(temp),
                  color: temp < -5 || temp > 26 ? '#ffffff' : '#0f172a'
                }}
              >
                {displayTemp > 0 ? `+${displayTemp}` : displayTemp}°
                {units === 'imperial' ? 'F' : 'C'}
              </div>

              <button
                type="button"
                onClick={() => handleTempDelta(1)}
                className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 text-2xl font-black flex items-center justify-center active:scale-90 transition-all shrink-0"
              >
                ▲
              </button>
            </div>
          </div>

          {/* Sky Condition */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              {t('lab.skyState')}
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {SKY_CONFIG.map(item => {
                const active = sky === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setSky(item.type);
                    }}
                    className={`p-2 rounded-2xl flex flex-col items-center gap-1 border transition-all ${
                      active
                        ? 'bg-amber-100 border-amber-500 shadow-xs scale-105 ring-2 ring-amber-300'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-[10px] font-bold text-slate-700 truncate w-full text-center">
                      {t(item.labelKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time & Humidity in a grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Observation Time */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {t('field.time')}
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white font-mono text-sm font-bold text-slate-800 focus:outline-amber-500"
              />
            </div>

            {/* Humidity */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                {t('field.humidity')}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleHumDelta(-5)}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 active:scale-95 transition-all"
                >
                  -5
                </button>
                <div className="flex-1 py-2 text-center bg-slate-100 rounded-xl font-mono font-black text-sm text-slate-800">
                  {hum !== null ? `${hum} %` : '—'}
                </div>
                <button
                  type="button"
                  onClick={() => handleHumDelta(5)}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 active:scale-95 transition-all"
                >
                  +5
                </button>
              </div>
            </div>
          </div>

          {/* Wind Speed & Direction */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5" />
              {t('field.windSpeed')} & {t('field.windDir')}
            </label>

            {/* Wind Steppers */}
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => handleWindDelta(-1)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 active:scale-95 transition-all"
              >
                -1
              </button>
              <div className="flex-1 py-2 text-center bg-slate-100 rounded-xl font-mono font-black text-sm text-slate-800">
                {displayWind !== null ? `${displayWind} ${units === 'imperial' ? 'mph' : 'м/с'}` : '—'}
              </div>
              <button
                type="button"
                onClick={() => handleWindDelta(1)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 active:scale-95 transition-all"
              >
                +1
              </button>
            </div>

            {/* Direction Quick Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {DIR_LABELS.map((label, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setDir(idx);
                  }}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                    dir === idx
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setDir(null);
                  setWind(0);
                }}
                className={`col-span-4 py-2 text-center rounded-xl text-xs font-bold border transition-all ${
                  dir === null
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {t('dir.calm')}
              </button>
            </div>
          </div>

          {/* Mood */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5" />
              {t('lab.howAreYou')}
            </label>
            <div className="flex items-center justify-between gap-2">
              {MOODS.map(m => (
                <button
                  key={m.type}
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setMood(m.type);
                  }}
                  className={`flex-1 p-2 rounded-2xl flex flex-col items-center gap-1 border transition-all ${
                    mood === m.type
                      ? 'bg-amber-100 border-amber-400 scale-105 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <span className="text-2xl">{m.icon}</span>
                  <span className="text-[10px] font-bold text-slate-600">{t(m.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {t('field.notes')}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('field.notesPlaceholder')}
              className="w-full p-3 rounded-2xl border border-slate-300 text-xs text-slate-800 focus:outline-amber-500 placeholder:text-slate-400"
            />
          </div>

          {/* Open-Meteo Comparison Preview if available */}
          {existingRecord?.real && (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 mb-2">
                <Satellite className="w-4 h-4 text-amber-700" />
                {t('cmp.title')}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-white border border-amber-200">
                  <span className="text-[10px] text-slate-500 block">{t('cmp.you')}</span>
                  <span className="font-bold text-slate-900">{formatTempStr(temp, units)}</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-amber-200">
                  <span className="text-[10px] text-slate-500 block">{t('cmp.satellite')}</span>
                  <span className="font-bold text-slate-900">
                    {formatTempStr(existingRecord.real.temp, units)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-amber-200">
                  <span className="text-[10px] text-slate-500 block">{t('cmp.diff')}</span>
                  <span className="font-bold text-amber-700">
                    {Math.abs(Math.round((temp - existingRecord.real.temp) * 10) / 10)}°
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between gap-3">
            {existingRecord ? (
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  if (confirm('Справді видалити цей запис?')) {
                    onDelete(dateKey);
                    onClose();
                  }
                }}
                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('act.delete')}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
              >
                {t('act.cancel')}
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{t('act.save')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
