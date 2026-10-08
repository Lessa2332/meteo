import confetti from 'canvas-confetti';
import { Badge, Quest, Units, WeatherRecord, SkyType, City, RealWeather } from '../types';

export const AVATARS = ['🦊', '🐱', '🐼', '🦄', '🚀', '🌈', '🦉', '🐢', '🌻', '🐧', '🦋', '🐶'];

export const SKY_CONFIG: Array<{ type: SkyType; icon: string; labelKey: string }> = [
  { type: 'clear', icon: '☀️', labelKey: 'sky.clear' },
  { type: 'partly', icon: '🌤️', labelKey: 'sky.partly' },
  { type: 'cloudy', icon: '☁️', labelKey: 'sky.cloudy' },
  { type: 'rain', icon: '🌧️', labelKey: 'sky.rain' },
  { type: 'storm', icon: '⛈️', labelKey: 'sky.storm' },
  { type: 'snow', icon: '❄️', labelKey: 'sky.snow' },
  { type: 'fog', icon: '🌫️', labelKey: 'sky.fog' }
];

export const DIR_LABELS = ['↓ Пн', '↙ ПнСх', '← Сх', '↖ ПдСх', '↑ Пд', '↗ ПдЗх', '→ Зх', '↘ ПнЗх'];
export const DIR_ANGLES = [180, 225, 270, 315, 0, 45, 90, 135]; // Compass degrees to point arrow

export const DEFAULT_CITY: City = {
  name: 'Київ',
  admin: 'Київська область',
  country: 'Україна',
  lat: 50.45,
  lon: 30.52,
  tz: 'Europe/Kyiv'
};

export const BADGES_LIST: Badge[] = [
  { id: 'first', keyTitle: 'badge.first', keyDesc: 'badge.firstDesc', icon: '🌱', reqCount: 1 },
  { id: 'week', keyTitle: 'badge.week', keyDesc: 'badge.weekDesc', icon: '⭐', reqCount: 7 },
  { id: 'month', keyTitle: 'badge.month', keyDesc: 'badge.monthDesc', icon: '👑', reqCount: 20 },
  { id: 'rain', keyTitle: 'badge.rainHunter', keyDesc: 'badge.rainHunterDesc', icon: '🌧️', reqCount: 1 },
  { id: 'wind', keyTitle: 'badge.windMaster', keyDesc: 'badge.windMasterDesc', icon: '🪁', reqCount: 1 },
  { id: 'satellite', keyTitle: 'badge.satelliteFriend', keyDesc: 'badge.satelliteFriendDesc', icon: '🛰️', reqCount: 1 }
];

export const QUESTS_LIST: Quest[] = [
  {
    id: 'first_record',
    titleKey: 'badge.first',
    descKey: 'badge.firstDesc',
    icon: '🌱',
    xp: 50,
    category: 'daily',
    check: (records) => Object.keys(records).length >= 1
  },
  {
    id: 'rain_hunter',
    titleKey: 'badge.rainHunter',
    descKey: 'badge.rainHunterDesc',
    icon: '🌧️',
    xp: 100,
    category: 'explorer',
    check: (records) => Object.values(records).some(r => r.sky === 'rain' || r.sky === 'storm')
  },
  {
    id: 'wind_whisperer',
    titleKey: 'badge.windMaster',
    descKey: 'badge.windMasterDesc',
    icon: '🪁',
    xp: 80,
    category: 'explorer',
    check: (records) => Object.values(records).some(r => r.wind !== null && r.dir !== null)
  },
  {
    id: 'week_streak',
    titleKey: 'badge.week',
    descKey: 'badge.weekDesc',
    icon: '⭐',
    xp: 150,
    category: 'scientist',
    check: (records) => Object.keys(records).length >= 7
  },
  {
    id: 'satellite_detective',
    titleKey: 'badge.satelliteFriend',
    descKey: 'badge.satelliteFriendDesc',
    icon: '🛰️',
    xp: 120,
    category: 'scientist',
    check: (records) => Object.values(records).some(r => !!r.real)
  }
];

export function toDispTemp(celsius: number, units: Units): number {
  if (units === 'imperial') {
    return Math.round((celsius * 9 / 5 + 32) * 10) / 10;
  }
  return Math.round(celsius * 10) / 10;
}

export function fromDispTemp(val: number, units: Units): number {
  if (units === 'imperial') {
    return Math.round(((val - 32) * 5 / 9) * 10) / 10;
  }
  return Math.round(val * 10) / 10;
}

export function toDispWind(ms: number, units: Units): number {
  if (units === 'imperial') {
    return Math.round((ms * 2.23694) * 10) / 10;
  }
  return Math.round(ms * 10) / 10;
}

export function fromDispWind(val: number, units: Units): number {
  if (units === 'imperial') {
    return Math.round((val / 2.23694) * 10) / 10;
  }
  return Math.round(val * 10) / 10;
}

export function formatTempStr(celsius: number, units: Units): string {
  const v = toDispTemp(celsius, units);
  return `${v > 0 ? '+' : ''}${v}°${units === 'imperial' ? 'F' : 'C'}`;
}

export function formatWindStr(ms: number, units: Units): string {
  const v = toDispWind(ms, units);
  return `${v} ${units === 'imperial' ? 'mph' : 'м/с'}`;
}

// Thermal palette interpolator
const TEMP_GRADIENT: Array<[number, [number, number, number]]> = [
  [-25, [30, 64, 175]],  // deep blue
  [-15, [59, 130, 246]], // bright blue
  [-5,  [147, 197, 253]],// ice cyan
  [0,   [186, 230, 253]],// freeze zero
  [8,   [167, 243, 208]],// soft green
  [16,  [253, 224, 71]], // spring gold
  [22,  [251, 146, 60]], // mild warm
  [28,  [239, 68, 68]],  // hot amber
  [36,  [185, 28, 28]]   // extreme red
];

export function getTempColor(celsius: number): string {
  if (celsius <= TEMP_GRADIENT[0][0]) {
    const rgb = TEMP_GRADIENT[0][1];
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  }
  if (celsius >= TEMP_GRADIENT[TEMP_GRADIENT.length - 1][0]) {
    const rgb = TEMP_GRADIENT[TEMP_GRADIENT.length - 1][1];
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  }
  for (let i = 1; i < TEMP_GRADIENT.length; i++) {
    const [c1, rgb1] = TEMP_GRADIENT[i];
    if (celsius <= c1) {
      const [c0, rgb0] = TEMP_GRADIENT[i - 1];
      const ratio = (celsius - c0) / (c1 - c0);
      const r = Math.round(rgb0[0] + (rgb1[0] - rgb0[0]) * ratio);
      const g = Math.round(rgb0[1] + (rgb1[1] - rgb0[1]) * ratio);
      const b = Math.round(rgb0[2] + (rgb1[2] - rgb0[2]) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return '#3B82F6';
}

export function getContrastTextColor(celsius: number): string {
  if (celsius < -5 || celsius > 26) {
    return '#ffffff';
  }
  return '#0f172a';
}

export function getDaysInMonth(year: number, monthZeroIndexed: number): number {
  return new Date(year, monthZeroIndexed + 1, 0).getDate();
}

export function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): { year: number; month: number; day: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

export function formatDateKey(year: number, monthZeroIndexed: number, day: number): string {
  const m = String(monthZeroIndexed + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function triggerConfetti() {
  try {
    confetti({
      particleCount: 65,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6']
    });
  } catch {
    // fallback if canvas not available
  }
}

export function getKidClothingAdvice(tempC: number, sky: SkyType, windMs: number | null): string {
  let baseAdvice = '';
  if (tempC < -5) {
    baseAdvice = 'cloth.freeze';
  } else if (tempC <= 6) {
    baseAdvice = 'cloth.cold';
  } else if (tempC <= 15) {
    baseAdvice = 'cloth.mild';
  } else if (tempC <= 22) {
    baseAdvice = 'cloth.warm';
  } else {
    baseAdvice = 'cloth.hot';
  }
  return baseAdvice;
}

export function getMascotReaction(tempC: number, sky: SkyType, windMs: number | null): string {
  if (sky === 'snow') return 'mascot.snowy';
  if (sky === 'rain' || sky === 'storm') return 'mascot.rainy';
  if (windMs && windMs >= 8) return 'mascot.windy';
  if (tempC <= 0) return 'mascot.cold';
  if (tempC >= 25) return 'mascot.hot';
  if (sky === 'clear') return 'mascot.sunny';
  return 'mascot.cloudy';
}

// Open-Meteo Satellite Model Integration
export async function fetchOpenMeteoData(
  city: City,
  dateKeys: string[]
): Promise<Record<string, RealWeather>> {
  if (city.lat === null || city.lon === null || !dateKeys.length) return {};

  const sortedDates = [...dateKeys].sort();
  const startDate = sortedDates[0];
  const endDate = sortedDates[sortedDates.length - 1];

  const params = new URLSearchParams({
    latitude: city.lat.toFixed(2),
    longitude: city.lon.toFixed(2),
    hourly: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m',
    wind_speed_unit: 'ms',
    timezone: 'auto',
    start_date: startDate,
    end_date: endDate
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?${params.toString()}`;

  let data: any = null;
  try {
    const res = await fetch(url);
    if (res.ok) {
      data = await res.json();
    }
  } catch {}

  if (!data || !data.hourly) {
    try {
      const res = await fetch(archiveUrl);
      if (res.ok) {
        data = await res.json();
      }
    } catch {}
  }

  if (!data || !data.hourly || !Array.isArray(data.hourly.time)) {
    return {};
  }

  const results: Record<string, RealWeather> = {};
  const hourly = data.hourly;

  hourly.time.forEach((timeStr: string, idx: number) => {
    // Look for around 12:00 or 09:00 for mid-day standard
    const [datePart, hourPart] = timeStr.split('T');
    if (hourPart === '12:00' || (!results[datePart] && hourPart === '09:00')) {
      const code = hourly.weather_code[idx];
      let sky: SkyType = 'partly';
      if (code === 0) sky = 'clear';
      else if (code === 1 || code === 2) sky = 'partly';
      else if (code === 3) sky = 'cloudy';
      else if (code >= 51 && code <= 67) sky = 'rain';
      else if (code >= 71 && code <= 77) sky = 'snow';
      else if (code >= 95) sky = 'storm';
      else if (code === 45 || code === 48) sky = 'fog';

      const deg = hourly.wind_direction_10m[idx];
      const dirIndex = Math.round((((deg % 360) + 360) % 360) / 45) % 8;

      results[datePart] = {
        temp: Math.round(hourly.temperature_2m[idx] * 10) / 10,
        hum: Math.round(hourly.relative_humidity_2m[idx]),
        wind: Math.round(hourly.wind_speed_10m[idx] * 10) / 10,
        dir: dirIndex,
        sky,
        at: new Date().toISOString()
      };
    }
  });

  return results;
}

// City Search with Open-Meteo Geocoding
export async function searchCitiesApi(query: string, lang: string): Promise<City[]> {
  if (query.trim().length < 2) return [];
  try {
    const params = new URLSearchParams({
      name: query.trim(),
      count: '8',
      language: lang,
      format: 'json'
    });
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map((r: any) => ({
      name: r.name,
      admin: r.admin1 || '',
      country: r.country || '',
      lat: Math.round(r.latitude * 100) / 100,
      lon: Math.round(r.longitude * 100) / 100,
      tz: r.timezone || null
    }));
  } catch {
    return [];
  }
}

// Reverse Geocode with Nominatim (Safe ~1km resolution)
export async function reverseGeocodeCoords(lat: number, lon: number, lang: string): Promise<City | null> {
  try {
    const params = new URLSearchParams({
      lat: (Math.round(lat * 100) / 100).toString(),
      lon: (Math.round(lon * 100) / 100).toString(),
      format: 'json',
      zoom: '10',
      'accept-language': lang
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    const name = addr.city || addr.town || addr.village || addr.municipality || addr.state || 'Моє місто';

    return {
      name,
      admin: addr.state || addr.county || '',
      country: addr.country || '',
      lat: Math.round(lat * 100) / 100,
      lon: Math.round(lon * 100) / 100
    };
  } catch {
    return null;
  }
}
