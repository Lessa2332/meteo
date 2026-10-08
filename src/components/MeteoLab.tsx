import React, { useState } from 'react';
import { Sparkles, Wind, Compass, Shirt, HelpCircle, Save, CheckCircle2 } from 'lucide-react';
import { Language, Profile, SkyType, Units } from '../types';
import { getT } from '../i18n/translations';
import {
  toDispTemp,
  getTempColor,
  formatTempStr,
  formatWindStr,
  getTodayKey,
  triggerConfetti,
  SKY_CONFIG,
  DIR_LABELS,
  DIR_ANGLES
} from '../utils/weather';
import { sound } from '../utils/audio';

interface MeteoLabProps {
  lang: Language;
  units: Units;
  activeProfile: Profile;
  onSaveToToday: (temp: number, sky: SkyType, wind: number, dir: number | null, notes: string) => void;
}

export const MeteoLab: React.FC<MeteoLabProps> = ({
  lang,
  units,
  activeProfile,
  onSaveToToday
}) => {
  const t = getT(lang);

  const [tempC, setTempC] = useState<number>(20);
  const [sky, setSky] = useState<SkyType>('clear');
  const [windMs, setWindMs] = useState<number>(3);
  const [dirIndex, setDirIndex] = useState<number | null>(4); // South by default
  const [factIndex, setFactIndex] = useState<number>(0);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleTempStep = (delta: number) => {
    sound.playStep(delta > 0);
    setTempC(prev => Math.min(45, Math.max(-30, prev + delta)));
  };

  const handleSave = () => {
    sound.playSuccess();
    triggerConfetti();
    onSaveToToday(
      tempC,
      sky,
      windMs,
      dirIndex,
      'Спостереження через інтерактивну лабораторію погоди'
    );
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const nextFact = () => {
    sound.playTap();
    setFactIndex(prev => (prev + 1) % 6);
  };

  // Clothing recommendation items based on temp and sky
  const clothingItems = React.useMemo(() => {
    const list: Array<{ icon: string; label: string; desc: string }> = [];

    if (tempC < -5) {
      list.push({ icon: '🧥', label: 'Теплий пуховик', desc: 'Зберігає тепло всередині' });
      list.push({ icon: '🧤', label: 'Теплі рукавички', desc: 'Захист пальчиків від морозу' });
      list.push({ icon: '🧣', label: 'Шарф і шапка', desc: 'Ніякого протягу!' });
      list.push({ icon: '🥾', label: 'Зимові черевики', desc: 'Не ковзають по снігу' });
    } else if (tempC <= 6) {
      list.push({ icon: '🧥', label: 'Тепла куртка', desc: 'Демісезонна або зимова' });
      list.push({ icon: '🧣', label: 'Шапка й шарф', desc: 'Бережи вушка!' });
      list.push({ icon: '👖', label: 'Теплі штани', desc: 'Для довгих прогулянок' });
    } else if (tempC <= 14) {
      list.push({ icon: '🧥', label: 'Легка куртка', desc: 'Вітровка або парка' });
      list.push({ icon: '🧶', label: 'Худі або кофта', desc: 'Затишно й свіжо' });
      list.push({ icon: '👟', label: 'Кросівки', desc: 'Зручно бігати у дворі' });
    } else if (tempC <= 22) {
      list.push({ icon: '👕', label: 'Футболка або лонгслів', desc: 'Комфортно і не жарко' });
      list.push({ icon: '👖', label: 'Джинси чи штани', desc: 'Універсальний вибір' });
      list.push({ icon: '👟', label: 'Кросівки', desc: 'Час для спорту!' });
    } else {
      list.push({ icon: '👕', label: 'Легка футболка', desc: 'Світлих кольорів' });
      list.push({ icon: '🩳', label: 'Шорти або спідниця', desc: 'Легкий літній одяг' });
      list.push({ icon: '🧢', label: 'Кепка чи панамка', desc: 'Захищає від перегріву на сонці' });
      list.push({ icon: '🕶️', label: 'Сонцезахисні окуляри', desc: 'Оченята в безпеці' });
    }

    if (sky === 'rain' || sky === 'storm') {
      list.push({ icon: '☔', label: 'Парасолька чи дощовик', desc: 'Сухий одяг у будь-яку зливу!' });
      list.push({ icon: '🥾', label: 'Гумові чоботи', desc: 'Можна весело міряти калюжі' });
    }

    return list;
  }, [tempC, sky]);

  // Thermometer percentage (scale -30 to +45)
  const mercuryPercent = Math.min(100, Math.max(5, ((tempC + 30) / 75) * 100));
  const currentColor = getTempColor(tempC);

  return (
    <div className="space-y-6">
      {/* Hero Lab Header with Mascot Greeting */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-sky-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="text-4xl sm:text-5xl shrink-0 p-2.5 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner">
              {activeProfile.avatar}
            </span>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/25 text-xs font-black tracking-wide uppercase mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Метео-Помічник
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                {activeProfile.name}, експериментуймо з погодою!
              </h2>
              <p className="text-white/90 text-sm mt-1 max-w-xl">
                Змінюй температуру термометра, крути компас вітру та спостерігай, як природа підказує
                нам правильний одяг і настрій.
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="self-start md:self-center px-4 py-2.5 rounded-2xl bg-white text-slate-900 font-extrabold text-xs shadow-md hover:bg-amber-50 active:scale-95 transition-all flex items-center gap-2 shrink-0"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Записано на сьогодні!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-amber-600" />
                <span>Зберегти цей день</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid: Interactive Thermometer & Compass */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Liquid Thermometer (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {t('lab.thermometer')}
                </h3>
                <p className="text-xs text-slate-500">{t('lab.thermometerHint')}</p>
              </div>

              <span
                className="text-2xl font-black font-mono px-3 py-1 rounded-xl shadow-xs"
                style={{
                  backgroundColor: currentColor,
                  color: tempC < -5 || tempC > 26 ? '#ffffff' : '#0f172a'
                }}
              >
                {formatTempStr(tempC, units)}
              </span>
            </div>

            {/* Interactive Thermometer Body */}
            <div className="py-6 flex items-center justify-center gap-8">
              {/* Stepper Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleTempStep(5)}
                  className="w-12 h-12 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-black text-sm border border-amber-200 flex items-center justify-center active:scale-90 transition-all shadow-xs"
                  title="+5 градусів"
                >
                  +5°
                </button>
                <button
                  onClick={() => handleTempStep(1)}
                  className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-sm border border-slate-200 flex items-center justify-center active:scale-90 transition-all shadow-xs"
                  title="+1 градус"
                >
                  +1°
                </button>
                <button
                  onClick={() => handleTempStep(-1)}
                  className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-sm border border-slate-200 flex items-center justify-center active:scale-90 transition-all shadow-xs"
                  title="-1 градус"
                >
                  -1°
                </button>
                <button
                  onClick={() => handleTempStep(-5)}
                  className="w-12 h-12 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-sm border border-blue-200 flex items-center justify-center active:scale-90 transition-all shadow-xs"
                  title="-5 градусів"
                >
                  -5°
                </button>
              </div>

              {/* Graphic Liquid Glass Tube */}
              <div className="relative flex flex-col items-center">
                {/* Scale Ticks on Left */}
                <div className="absolute -left-10 inset-y-0 flex flex-col justify-between py-2 text-[10px] font-mono text-slate-400 font-bold">
                  <span>+40°</span>
                  <span>+20°</span>
                  <span className="text-sky-500 font-black">0°</span>
                  <span>-20°</span>
                </div>

                {/* Glass Tube Container */}
                <div className="w-9 h-64 rounded-full bg-slate-100 border-2 border-slate-300 p-1 flex flex-col justify-end relative overflow-hidden shadow-inner">
                  {/* Liquid Column */}
                  <div
                    className="w-full rounded-full transition-all duration-300 relative shadow-sm"
                    style={{
                      height: `${mercuryPercent}%`,
                      backgroundColor: currentColor
                    }}
                  >
                    <div className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-white/70" />
                  </div>
                </div>

                {/* Bottom Bulb */}
                <div
                  className="w-16 h-16 rounded-full -mt-4 border-2 border-slate-300 flex items-center justify-center shadow-md relative z-10 transition-colors duration-300"
                  style={{ backgroundColor: currentColor }}
                >
                  <div className="w-5 h-5 rounded-full bg-white/40 absolute top-2 left-2" />
                  <span className="text-white text-xs font-black font-mono drop-shadow-xs">
                    {tempC > 0 ? `+${tempC}` : tempC}°
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick slider */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <input
              type="range"
              min="-25"
              max="40"
              value={tempC}
              onChange={e => {
                setTempC(Number(e.target.value));
              }}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-1 font-mono">
              <span>Мороз (-25°)</span>
              <span>Кімнатна (+20°)</span>
              <span>Спека (+40°)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Sky & Wind Compass (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Sky Condition Selector */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight mb-3">
              {t('lab.skyState')}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SKY_CONFIG.map(item => {
                const isSelected = sky === item.type;
                return (
                  <button
                    key={item.type}
                    onClick={() => {
                      sound.playTap();
                      setSky(item.type);
                    }}
                    className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 border transition-all text-center ${
                      isSelected
                        ? 'bg-amber-50 border-amber-400 text-amber-950 font-black shadow-xs scale-102 ring-2 ring-amber-300/60'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 font-semibold'
                    }`}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-xs leading-tight">{t(item.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wind Vane & Compass */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <Wind className="w-4 h-4 text-sky-500" />
                  {t('lab.windCompass')}
                </h3>
                <p className="text-xs text-slate-500">
                  {dirIndex !== null ? DIR_LABELS[dirIndex] : 'Штиль'} · {formatWindStr(windMs, units)}
                </p>
              </div>

              {/* Wind Speed Control */}
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-xl">
                <span className="text-xs font-bold text-slate-600">Швидкість:</span>
                <span className="text-xs font-black font-mono text-slate-900">
                  {formatWindStr(windMs, units)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
              {/* Compass Dial */}
              <div className="relative w-40 h-40 rounded-full border-4 border-slate-200 bg-slate-50 flex items-center justify-center shadow-inner">
                {/* 8 Direction Dots */}
                {DIR_LABELS.map((label, idx) => {
                  const angle = (idx * 45 - 90) * (Math.PI / 180);
                  const x = 50 + 40 * Math.cos(angle);
                  const y = 50 + 40 * Math.sin(angle);
                  const active = dirIndex === idx;

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        sound.playTap();
                        setDirIndex(idx);
                      }}
                      style={{ left: `${x}%`, top: `${y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-[10px] font-black flex items-center justify-center transition-all ${
                        active
                          ? 'bg-sky-600 text-white shadow-md scale-110 ring-2 ring-sky-300'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                      title={label}
                    >
                      {label.slice(2)}
                    </button>
                  );
                })}

                {/* Rotating Vane Arrow */}
                {dirIndex !== null ? (
                  <div
                    className="w-2.5 h-20 bg-gradient-to-t from-sky-600 to-amber-500 rounded-full transition-transform duration-500 shadow-md relative"
                    style={{ transform: `rotate(${DIR_ANGLES[dirIndex]}deg)` }}
                  >
                    {/* Arrow head */}
                    <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[12px] border-b-amber-500 absolute -top-2 -left-[2px]" />
                  </div>
                ) : (
                  <span className="text-xs font-black text-slate-400">Штиль</span>
                )}
              </div>

              {/* Wind Speed Slider & Calm Toggle */}
              <div className="flex-1 w-full space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                    <span>Сила вітру:</span>
                    <span>
                      {windMs === 0
                        ? 'Штиль (0)'
                        : windMs < 5
                        ? 'Легкий вітерець'
                        : windMs < 12
                        ? 'Помірний вітер'
                        : 'Шквальний вітер'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={windMs}
                    onChange={e => setWindMs(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      sound.playTap();
                      setDirIndex(null);
                      setWindMs(0);
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      dirIndex === null
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    Тихо / Штиль
                  </button>

                  <button
                    onClick={() => {
                      sound.playTap();
                      setWindMs(8);
                      setDirIndex(1);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-bold border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 transition-colors"
                  >
                    Свіжий вітер
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kid Clothing Advisor: "Що сьогодні вдягнути?" */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg">
              <Shirt className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                {t('lab.whatToWear')}
              </h3>
              <p className="text-xs text-slate-500">
                Порада для температури {formatTempStr(tempC, units)} та стану погоди
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {clothingItems.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 hover:bg-slate-100/80 transition-colors"
            >
              <span className="text-3xl shrink-0 p-1 bg-white rounded-xl shadow-xs">{item.icon}</span>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{item.label}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fun Science Fact Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="text-3xl p-2 bg-slate-800 rounded-2xl shrink-0">💡</span>
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-amber-400">
              {t('lab.funFact')}
            </span>
            <p className="text-sm font-semibold text-slate-100 mt-0.5 max-w-2xl">
              {t(`fact.${factIndex}`)}
            </p>
          </div>
        </div>

        <button
          onClick={nextFact}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300 border border-slate-700 shrink-0 transition-colors"
        >
          Ще один факт →
        </button>
      </div>
    </div>
  );
};
