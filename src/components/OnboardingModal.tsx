import React, { useState } from 'react';
import { Sparkles, MapPin, Search, ArrowRight, Check } from 'lucide-react';
import { City, Language } from '../types';
import { getT } from '../i18n/translations';
import { AVATARS, DEFAULT_CITY, searchCitiesApi, reverseGeocodeCoords, triggerConfetti } from '../utils/weather';
import { sound } from '../utils/audio';

interface OnboardingModalProps {
  isOpen: boolean;
  lang: Language;
  onFinish: (name: string, cls: string, avatar: string, city: City) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  lang,
  onFinish
}) => {
  const t = getT(lang);

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [cls, setCls] = useState('3-А');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [city, setCity] = useState<City>(DEFAULT_CITY);
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<City[]>([]);
  const [loadingCity, setLoadingCity] = useState(false);

  if (!isOpen) return null;

  const handleNextStep = () => {
    sound.playTap();
    if (step === 1 && !name.trim()) return;
    setStep(prev => prev + 1);
  };

  const handleCitySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cityQuery.trim().length < 2) return;
    setLoadingCity(true);
    sound.playTap();
    try {
      const res = await searchCitiesApi(cityQuery, lang);
      setCityResults(res);
    } catch {
    } finally {
      setLoadingCity(false);
    }
  };

  const handleDetectGeo = () => {
    if (!navigator.geolocation) return;
    setLoadingCity(true);
    sound.playTap();
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const res = await reverseGeocodeCoords(pos.coords.latitude, pos.coords.longitude, lang);
          if (res) {
            setCity(res);
            sound.playSuccess();
          }
        } finally {
          setLoadingCity(false);
        }
      },
      () => setLoadingCity(false),
      { timeout: 8000 }
    );
  };

  const handleComplete = () => {
    sound.playSuccess();
    triggerConfetti();
    onFinish(name.trim() || 'Юний синоптик', cls.trim(), avatar, city);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-sky-600 p-6 text-white text-center relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-4xl inline-block mb-1">🌤️</span>
            <h2 className="text-xl font-black tracking-tight">{t('onb.welcome')}</h2>
            <p className="text-xs text-white/90 mt-1">Твій особистий щоденник спостережень за природою</p>
          </div>
        </div>

        {/* Steps */}
        <div className="p-6 space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-extrabold text-slate-900">{t('onb.step1')}</h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Твоє ім'я</label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('onb.namePlaceholder')}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm font-bold focus:outline-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Клас</label>
                <input
                  type="text"
                  value={cls}
                  onChange={e => setCls(e.target.value)}
                  placeholder={t('onb.classPlaceholder')}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm font-bold focus:outline-amber-500"
                />
              </div>

              <button
                type="button"
                disabled={!name.trim()}
                onClick={handleNextStep}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all mt-2 shadow-xs"
              >
                <span>Далі</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-extrabold text-slate-900">{t('onb.step2')}</h3>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {AVATARS.map(av => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setAvatar(av);
                    }}
                    className={`text-3xl p-3 rounded-2xl border transition-all ${
                      avatar === av
                        ? 'bg-amber-100 border-amber-500 shadow-xs scale-105 ring-2 ring-amber-300'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleNextStep}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <span>Далі</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center">
                  3
                </span>
                <h3 className="text-sm font-extrabold text-slate-900">{t('onb.step3')}</h3>
              </div>

              <form onSubmit={handleCitySearch} className="flex gap-2">
                <input
                  type="text"
                  value={cityQuery}
                  onChange={e => setCityQuery(e.target.value)}
                  placeholder={t('onb.cityPlaceholder')}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-amber-500"
                />
                <button
                  type="submit"
                  disabled={loadingCity}
                  className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shrink-0"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>

              <button
                type="button"
                onClick={handleDetectGeo}
                disabled={loadingCity}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>{t('act.detectLocation')}</span>
              </button>

              {cityResults.length > 0 && (
                <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-100 border rounded-xl p-2">
                  {cityResults.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setCity(c);
                        setCityResults([]);
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-amber-50 text-xs font-semibold text-slate-800"
                    >
                      {c.name} ({[c.admin, c.country].filter(Boolean).join(', ')})
                    </button>
                  ))}
                </div>
              )}

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs font-bold text-amber-900 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Обране місто: {city.name}</span>
              </div>

              <button
                type="button"
                onClick={handleComplete}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t('onb.start')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
