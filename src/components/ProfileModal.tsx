import React, { useState } from 'react';
import { X, UserPlus, Check, Trash2, Download, Upload, User } from 'lucide-react';
import { Language, Profile } from '../types';
import { getT } from '../i18n/translations';
import { AVATARS, DEFAULT_CITY } from '../utils/weather';
import { sound } from '../utils/audio';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  profiles: Profile[];
  activeId: string;
  onSelectProfile: (id: string) => void;
  onSaveProfile: (profile: Profile) => void;
  onDeleteProfile: (id: string) => void;
  onExportCurrent: () => void;
  onImportTrigger: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  lang,
  profiles,
  activeId,
  onSelectProfile,
  onSaveProfile,
  onDeleteProfile,
  onExportCurrent,
  onImportTrigger
}) => {
  const t = getT(lang);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  if (!isOpen) return null;

  const handleStartNew = () => {
    sound.playTap();
    setEditingProfile({
      id: 'p_' + Date.now().toString(36),
      name: '',
      cls: '3-А',
      avatar: AVATARS[0],
      city: { ...DEFAULT_CITY },
      records: {},
      xp: 0
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !editingProfile.name.trim()) return;
    sound.playSuccess();
    onSaveProfile(editingProfile);
    setEditingProfile(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-extrabold text-slate-900">
              Профілі учнів на цьому пристрої
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

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {editingProfile ? (
            /* Editing / Creating Profile Form */
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">
                Створення нового щоденника
              </h4>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Ім’я або нікнейм учня
                </label>
                <input
                  type="text"
                  required
                  value={editingProfile.name}
                  onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })}
                  placeholder="Наприклад: Марійка чи Богдан"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Клас (необов’язково)
                </label>
                <input
                  type="text"
                  value={editingProfile.cls}
                  onChange={e => setEditingProfile({ ...editingProfile, cls: e.target.value })}
                  placeholder="3-Б"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  Обери метео-аватар
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATARS.map(av => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => {
                        sound.playTap();
                        setEditingProfile({ ...editingProfile, avatar: av });
                      }}
                      className={`text-2xl p-2.5 rounded-xl border transition-all ${
                        editingProfile.avatar === av
                          ? 'bg-amber-100 border-amber-400 scale-110 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
                >
                  Зберегти профіль
                </button>
              </div>
            </form>
          ) : (
            /* Profiles List */
            <>
              <p className="text-xs text-slate-500 leading-relaxed">
                Кожен учень чи брат/сестра може вести свій окремий щоденник спостережень на одному
                телефоні або планшеті.
              </p>

              <div className="space-y-2">
                {profiles.map(p => {
                  const isActive = p.id === activeId;
                  const recordsCount = Object.keys(p.records).length;

                  return (
                    <div
                      key={p.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isActive
                          ? 'bg-amber-50/70 border-amber-300 shadow-xs ring-2 ring-amber-200'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl p-1.5 bg-white rounded-xl shadow-xs">
                          {p.avatar}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900">{p.name}</h4>
                            {p.cls && (
                              <span className="text-[10px] text-slate-500 bg-slate-200/80 px-1.5 py-0.2 rounded font-semibold">
                                {p.cls}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 mt-0.5 block">
                            {recordsCount} спостережень · {p.city.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isActive ? (
                          <span className="px-3 py-1 rounded-xl bg-amber-500 text-white text-xs font-extrabold flex items-center gap-1 shadow-xs">
                            <Check className="w-3.5 h-3.5" />
                            Активний
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              sound.playSuccess();
                              onSelectProfile(p.id);
                              onClose();
                            }}
                            className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                          >
                            Обрати
                          </button>
                        )}

                        {profiles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              sound.playTap();
                              if (confirm(`Видалити щоденник "${p.name}"?`)) {
                                onDeleteProfile(p.id);
                              }
                            }}
                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleStartNew}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-amber-600" />
                  <span>Додати учня</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    onExportCurrent();
                  }}
                  className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Зберегти резервну копію .weather"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Зберегти файл</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    onImportTrigger();
                  }}
                  className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Відкрити файл .weather"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Відкрити</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
