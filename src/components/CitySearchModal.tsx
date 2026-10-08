import React, { useState } from 'react';
import { X, Search, MapPin, Loader2, Globe } from 'lucide-react';
import { City, Language } from '../types';
import { getT } from '../i18n/translations';
import { searchCitiesApi, reverseGeocodeCoords } from '../utils/weather';
import { sound } from '../utils/audio';

interface CitySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  currentCity: City;
  onSelectCity: (city: City) => void;
}

export const CitySearchModal: React.FC<CitySearchModalProps> = ({
  isOpen,
  onClose,
  lang,
  currentCity,
  onSelectCity
}) => {
  const t = getT(lang);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<City[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true);
    setErrorMsg('');
    sound.playTap();

    try {
      const cities = await searchCitiesApi(query, lang);
      setResults(cities);
      if (cities.length === 0) {
        setErrorMsg('Нічого не знайдено. Спробуй написати назву інакше.');
      }
    } catch {
      setErrorMsg('Помилка пошуку. Перевір підключення до інтернету.');
    } finally {
      setLoading(false);
    }
  };

  const handleDetectGeo = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Геолокація не підтримується цим браузером.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    sound.playTap();

    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const city = await reverseGeocodeCoords(pos.coords.latitude, pos.coords.longitude, lang);
          if (city) {
            onSelectCity(city);
            sound.playSuccess();
            onClose();
          } else {
            setErrorMsg('Не вдалося визначити назву міста. Будь ласка, введи назву вручну.');
          }
        } catch {
          setErrorMsg('Помилка визначення міста.');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        setErrorMsg('Будь ласка, дозволь доступ до геолокації у браузері або напиши місто.');
      },
      { timeout: 10000 }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-extrabold text-slate-900">
              Місце спостережень
            </h3>
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

        {/* Content */}
        <div className="p-6 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Введи місто або село (Київ, Львів...)"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-amber-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </form>

          <button
            type="button"
            onClick={handleDetectGeo}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-colors"
          >
            <MapPin className="w-4 h-4 text-amber-600" />
            <span>{t('act.detectLocation')}</span>
          </button>

          {errorMsg && (
            <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-xl text-center">
              {errorMsg}
            </p>
          )}

          {/* Results List */}
          {results.length > 0 && (
            <div className="max-h-56 overflow-y-auto space-y-1.5 divide-y divide-slate-100">
              {results.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    sound.playSuccess();
                    onSelectCity(c);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-amber-50/70 flex flex-col gap-0.5 transition-colors"
                >
                  <span className="text-xs font-bold text-slate-900">{c.name}</span>
                  <span className="text-[11px] text-slate-500">
                    {[c.admin, c.country].filter(Boolean).join(', ')}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="text-[11px] text-slate-400 bg-slate-50 p-3 rounded-xl leading-relaxed">
            🔒 Безпека дитини: для порівняння з супутником Open-Meteo надсилаються лише приблизні
            координати (~1 км). Ім’я, клас та нотатки ніколи не залишають твій пристрій!
          </div>
        </div>
      </div>
    </div>
  );
};
