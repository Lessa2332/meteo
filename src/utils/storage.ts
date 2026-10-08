import { AppStore, Profile } from '../types';
import { AVATARS, DEFAULT_CITY } from './weather';

const STORAGE_KEY = 'meteojournal.v6';

export function getDefaultStore(): AppStore {
  const initialProfile: Profile = {
    id: 'p_' + Date.now().toString(36),
    name: 'Юний синоптик',
    cls: '3-А',
    avatar: AVATARS[0],
    city: { ...DEFAULT_CITY },
    records: {},
    xp: 0
  };

  return {
    v: 6,
    lang: 'uk',
    units: 'metric',
    kidMode: true,
    soundEnabled: true,
    a11y: {
      hc: false,
      large: false,
      readable: false,
      hideChart: false
    },
    onboarded: false,
    active: initialProfile.id,
    profiles: [initialProfile]
  };
}

export function loadStore(): AppStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
        return {
          ...getDefaultStore(),
          ...parsed,
          // ensure current active profile exists
          active: parsed.profiles.some((p: Profile) => p.id === parsed.active)
            ? parsed.active
            : parsed.profiles[0].id
        };
      }
    }
  } catch (err) {
    console.error('Failed to load storage, using default store:', err);
  }
  return getDefaultStore();
}

export function saveStore(store: AppStore): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch (err) {
    console.error('Failed to save store:', err);
    return false;
  }
}

export function exportProfileToFile(profile: Profile) {
  const payload = {
    app: 'MeteoJournal',
    version: 6,
    exportedAt: new Date().toISOString(),
    profile
  };

  const filename = `Meteo_${profile.name.replace(/\s+/g, '_') || 'journal'}_${new Date().toISOString().slice(0, 10)}.weather`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function parseImportFile(fileText: string): Profile | null {
  try {
    const json = JSON.parse(fileText);
    if (json.profile && typeof json.profile.name === 'string') {
      return {
        id: 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: String(json.profile.name).slice(0, 40),
        cls: String(json.profile.cls || '').slice(0, 15),
        avatar: AVATARS.includes(json.profile.avatar) ? json.profile.avatar : AVATARS[0],
        city: json.profile.city || { ...DEFAULT_CITY },
        records: json.profile.records || {},
        xp: typeof json.profile.xp === 'number' ? json.profile.xp : 0
      };
    }
  } catch (err) {
    console.error('Invalid weather file format', err);
  }
  return null;
}
