/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { Header } from './components/Header';
import { CalendarMonth } from './components/CalendarMonth';
import { MeteoLab } from './components/MeteoLab';
import { QuestsBadgesSection } from './components/QuestsBadgesSection';
import { ChartSection } from './components/ChartSection';
import { RecordModal } from './components/RecordModal';
import { CitySearchModal } from './components/CitySearchModal';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { OnboardingModal } from './components/OnboardingModal';
import { PrintReport } from './components/PrintReport';
import { AppStore, City, Language, Profile, SkyType, Units, WeatherRecord } from './types';
import { loadStore, saveStore, exportProfileToFile, parseImportFile, getDefaultStore } from './utils/storage';
import { sound } from './utils/audio';
import { fetchOpenMeteoData, getTodayKey, triggerConfetti } from './utils/weather';
import { Calendar, Sparkles, Award, BarChart2 } from 'lucide-react';

export default function App() {
  const [store, setStore] = useState<AppStore>(() => loadStore());
  const [, startTransition] = useTransition();

  const now = new Date();
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(now.getMonth());

  const [activeTab, setActiveTab] = useState<'calendar' | 'lab' | 'quests' | 'stats'>('calendar');

  // Modals state
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [isCityModalOpen, setIsCityModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isComparing, setIsComparing] = useState<boolean>(false);

  // PWA install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstallPwa, setCanInstallPwa] = useState<boolean>(false);

  // Hidden file input for file import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize store to localStorage
  useEffect(() => {
    saveStore(store);
  }, [store]);

  // Synchronize a11y & kidMode classes on <html> root
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('hc', store.a11y.hc);
    root.classList.toggle('rf', store.a11y.readable);
    root.classList.toggle('kid', store.kidMode);
    sound.enabled = store.soundEnabled;
  }, [store.a11y, store.kidMode, store.soundEnabled]);

  // PWA install prompt handler
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPwa(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstallPwa(false);
    }
    setDeferredPrompt(null);
  };

  const activeProfile = store.profiles.find(p => p.id === store.active) || store.profiles[0];

  const handleSetLang = (lang: Language) => {
    setStore(prev => ({ ...prev, lang }));
  };

  const handleSetUnits = (units: Units) => {
    setStore(prev => ({ ...prev, units }));
  };

  const handleToggleKidMode = () => {
    setStore(prev => ({ ...prev, kidMode: !prev.kidMode }));
  };

  const handleToggleSound = () => {
    const next = !store.soundEnabled;
    sound.enabled = next;
    setStore(prev => ({ ...prev, soundEnabled: next }));
  };

  const handleChangeMonth = (delta: number) => {
    let nextMonth = viewMonth + delta;
    let nextYear = viewYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setViewMonth(nextMonth);
    setViewYear(nextYear);
  };

  const handleGoToToday = () => {
    const d = new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  // Save weather entry
  const handleSaveRecord = (record: WeatherRecord) => {
    startTransition(() => {
      setStore(prev => {
        const profiles = prev.profiles.map(p => {
          if (p.id !== prev.active) return p;
          const records = { ...p.records, [record.key]: record };
          return { ...p, records };
        });
        return { ...prev, profiles };
      });
    });
  };

  // Delete weather entry
  const handleDeleteRecord = (dateKey: string) => {
    startTransition(() => {
      setStore(prev => {
        const profiles = prev.profiles.map(p => {
          if (p.id !== prev.active) return p;
          const records = { ...p.records };
          delete records[dateKey];
          return { ...p, records };
        });
        return { ...prev, profiles };
      });
    });
  };

  // Quick save from Weather Lab
  const handleSaveFromLab = (
    temp: number,
    sky: SkyType,
    wind: number,
    dir: number | null,
    notes: string
  ) => {
    const todayKey = getTodayKey();
    const existing = activeProfile.records[todayKey];
    const newRecord: WeatherRecord = {
      key: todayKey,
      temp: Math.round(temp * 10) / 10,
      sky,
      t: existing?.t || '12:00',
      hum: existing?.hum || 50,
      wind: Math.round(wind * 10) / 10,
      dir,
      mood: existing?.mood || 'joy',
      notes: existing?.notes ? `${existing.notes} · ${notes}` : notes,
      real: existing?.real || null
    };
    handleSaveRecord(newRecord);
  };

  // Compare with Open-Meteo Satellite model
  const handleCompareWithSatellite = async () => {
    if (isComparing || !activeProfile.city.lat || !activeProfile.city.lon) return;

    const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`;
    const dateKeys = Object.keys(activeProfile.records).filter(k => k.startsWith(monthPrefix));
    if (!dateKeys.length) return;

    setIsComparing(true);
    sound.playTap();

    try {
      const realData = await fetchOpenMeteoData(activeProfile.city, dateKeys);

      startTransition(() => {
        setStore(prev => {
          const profiles = prev.profiles.map(p => {
            if (p.id !== prev.active) return p;
            const records = { ...p.records };
            Object.entries(realData).forEach(([dateKey, real]) => {
              if (records[dateKey]) {
                records[dateKey] = {
                  ...records[dateKey],
                  real
                };
              }
            });
            return { ...p, records };
          });
          return { ...prev, profiles };
        });
      });

      sound.playFanfare();
      triggerConfetti();
    } catch (err) {
      console.error('Failed to compare with satellite:', err);
    } finally {
      setIsComparing(false);
    }
  };

  // City update
  const handleSelectCity = (city: City) => {
    setStore(prev => {
      const profiles = prev.profiles.map(p => (p.id === prev.active ? { ...p, city } : p));
      return { ...prev, profiles };
    });
  };

  // Profiles management
  const handleSelectProfile = (id: string) => {
    setStore(prev => ({ ...prev, active: id }));
  };

  const handleSaveProfile = (profile: Profile) => {
    setStore(prev => {
      const exists = prev.profiles.some(p => p.id === profile.id);
      let profiles: Profile[];
      if (exists) {
        profiles = prev.profiles.map(p => (p.id === profile.id ? profile : p));
      } else {
        profiles = [...prev.profiles, profile];
      }
      return { ...prev, profiles, active: profile.id };
    });
  };

  const handleDeleteProfile = (id: string) => {
    setStore(prev => {
      const profiles = prev.profiles.filter(p => p.id !== id);
      const active = profiles.some(p => p.id === prev.active) ? prev.active : profiles[0]?.id;
      return { ...prev, profiles, active };
    });
  };

  // Export / Import
  const handleExportProfile = () => {
    exportProfileToFile(activeProfile);
  };

  const handleImportFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseImportFile(text);
      if (imported) {
        handleSaveProfile(imported);
        sound.playSuccess();
        triggerConfetti();
      } else {
        alert('Не вдалося розпізнати файл .weather. Переконайся, що файл створений у Метеощоденнику.');
      }
    } catch {
      alert('Помилка читання файлу.');
    } finally {
      e.target.value = '';
    }
  };

  // Print
  const handleOpenPrint = () => {
    window.print();
  };

  // Wipe All Data
  const handleWipeData = () => {
    const fresh = getDefaultStore();
    setStore(fresh);
    sound.playTap();
  };

  // Onboarding Finish
  const handleOnboardingFinish = (name: string, cls: string, avatar: string, city: City) => {
    setStore(prev => {
      const updatedProfile: Profile = {
        ...prev.profiles[0],
        name,
        cls,
        avatar,
        city
      };
      return {
        ...prev,
        onboarded: true,
        profiles: [updatedProfile],
        active: updatedProfile.id
      };
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-amber-200">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFileSelected}
        accept=".weather,.json"
        className="hidden"
      />

      {/* Main Header */}
      <div className="no-print">
        <Header
          lang={store.lang}
          onSetLang={handleSetLang}
          activeProfile={activeProfile}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          onOpenCityModal={() => setIsCityModalOpen(true)}
          soundEnabled={store.soundEnabled}
          onToggleSound={handleToggleSound}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          canInstallPwa={canInstallPwa}
          onInstallPwa={handleInstallPwa}
        />
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-24 md:pb-12 no-print">
        {activeTab === 'calendar' && (
          <CalendarMonth
            lang={store.lang}
            units={store.units}
            viewYear={viewYear}
            viewMonth={viewMonth}
            onChangeMonth={handleChangeMonth}
            onGoToToday={handleGoToToday}
            activeProfile={activeProfile}
            onSelectDate={dateKey => setSelectedDateKey(dateKey)}
            onCompareWithSatellite={handleCompareWithSatellite}
            isComparing={isComparing}
            onOpenPrint={handleOpenPrint}
            onExport={handleExportProfile}
            onImportTrigger={() => fileInputRef.current?.click()}
          />
        )}

        {activeTab === 'lab' && (
          <MeteoLab
            lang={store.lang}
            units={store.units}
            activeProfile={activeProfile}
            onSaveToToday={handleSaveFromLab}
          />
        )}

        {activeTab === 'quests' && (
          <QuestsBadgesSection lang={store.lang} activeProfile={activeProfile} />
        )}

        {activeTab === 'stats' && (
          <ChartSection
            lang={store.lang}
            units={store.units}
            viewYear={viewYear}
            viewMonth={viewMonth}
            activeProfile={activeProfile}
          />
        )}
      </main>

      {/* Mobile Ergonomic Bottom Bar (Natural Thumb Zone) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 pb-safe px-4 pt-1.5 shadow-lg flex justify-around items-center no-print">
        <button
          onClick={() => {
            sound.playTap();
            setActiveTab('calendar');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'calendar' ? 'text-amber-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px]">Календар</span>
        </button>

        <button
          onClick={() => {
            sound.playTap();
            setActiveTab('lab');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'lab' ? 'text-amber-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span className="text-[10px]">Лабораторія</span>
        </button>

        <button
          onClick={() => {
            sound.playTap();
            setActiveTab('quests');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'quests' ? 'text-amber-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Award className="w-5 h-5" />
          <span className="text-[10px]">Квести</span>
        </button>

        <button
          onClick={() => {
            sound.playTap();
            setActiveTab('stats');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'stats' ? 'text-amber-600 font-bold' : 'text-slate-500'
          }`}
        >
          <BarChart2 className="w-5 h-5" />
          <span className="text-[10px]">Графіки</span>
        </button>
      </nav>

      {/* Record Edit Modal */}
      {selectedDateKey && (
        <RecordModal
          isOpen={true}
          onClose={() => setSelectedDateKey(null)}
          lang={store.lang}
          units={store.units}
          dateKey={selectedDateKey}
          existingRecord={activeProfile.records[selectedDateKey]}
          onSave={handleSaveRecord}
          onDelete={handleDeleteRecord}
        />
      )}

      {/* City Search Modal */}
      <CitySearchModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        lang={store.lang}
        currentCity={activeProfile.city}
        onSelectCity={handleSelectCity}
      />

      {/* Profile Management Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        lang={store.lang}
        profiles={store.profiles}
        activeId={store.active}
        onSelectProfile={handleSelectProfile}
        onSaveProfile={handleSaveProfile}
        onDeleteProfile={handleDeleteProfile}
        onExportCurrent={handleExportProfile}
        onImportTrigger={() => fileInputRef.current?.click()}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        lang={store.lang}
        units={store.units}
        onSetUnits={handleSetUnits}
        kidMode={store.kidMode}
        onToggleKidMode={handleToggleKidMode}
        soundEnabled={store.soundEnabled}
        onToggleSound={handleToggleSound}
        a11y={store.a11y}
        onUpdateA11y={a => setStore(prev => ({ ...prev, a11y: { ...prev.a11y, ...a } }))}
        onWipeData={handleWipeData}
      />

      {/* Onboarding for New Users */}
      <OnboardingModal
        isOpen={!store.onboarded}
        lang={store.lang}
        onFinish={handleOnboardingFinish}
      />

      {/* Print Report (hidden on screen, formatted on paper) */}
      <PrintReport
        profile={activeProfile}
        viewYear={viewYear}
        viewMonth={viewMonth}
        units={store.units}
      />
    </div>
  );
}
