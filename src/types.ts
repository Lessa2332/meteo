export type Language = 'uk' | 'en' | 'es' | 'de' | 'pl' | 'fr';
export type Units = 'metric' | 'imperial';

export type SkyType = 'clear' | 'partly' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';
export type MoodType = 'joy' | 'ok' | 'sad' | 'wow' | 'sleepy';

export interface RealWeather {
  temp: number;
  hum: number | null;
  wind: number | null;
  dir: number | null; // 0-7: 0=N, 1=NE, 2=E, 3=SE, 4=S, 5=SW, 6=W, 7=NW
  sky: SkyType | null;
  at: string;
}

export interface WeatherRecord {
  key: string; // YYYY-MM-DD
  day?: number;
  temp: number; // in Celsius in storage
  sky: SkyType;
  t: string | null; // HH:MM
  hum: number | null; // 0-100%
  wind: number | null; // in m/s in storage
  dir: number | null; // 0-7
  mood: MoodType | null;
  notes: string;
  real?: RealWeather | null;
}

export interface City {
  name: string;
  admin?: string;
  country?: string;
  lat: number | null;
  lon: number | null;
  tz?: string | null;
}

export interface Badge {
  id: string;
  keyTitle: string;
  keyDesc: string;
  icon: string;
  reqCount: number;
}

export interface Quest {
  id: string;
  titleKey: string;
  descKey: string;
  icon: string;
  xp: number;
  category: 'daily' | 'explorer' | 'scientist';
  check: (records: Record<string, WeatherRecord>) => boolean;
}

export interface Profile {
  id: string;
  name: string;
  cls: string;
  avatar: string;
  city: City;
  records: Record<string, WeatherRecord>;
  xp?: number;
}

export interface A11ySettings {
  hc: boolean; // high contrast
  large: boolean; // large text
  readable: boolean; // dyslexia font spacing
  hideChart: boolean;
}

export interface AppStore {
  v: number;
  lang: Language;
  units: Units;
  kidMode: boolean;
  soundEnabled: boolean;
  a11y: A11ySettings;
  onboarded: boolean;
  active: string;
  profiles: Profile[];
}
