import React from 'react';
import { Award, Star, Trophy, Sparkles, CheckCircle2 } from 'lucide-react';
import { Language, Profile } from '../types';
import { getT } from '../i18n/translations';
import { BADGES_LIST, QUESTS_LIST } from '../utils/weather';
import { sound } from '../utils/audio';

interface QuestsBadgesSectionProps {
  lang: Language;
  activeProfile: Profile;
}

export const QuestsBadgesSection: React.FC<QuestsBadgesSectionProps> = ({
  lang,
  activeProfile
}) => {
  const t = getT(lang);
  const records = activeProfile.records;
  const recordsCount = Object.keys(records).length;

  // Calculate XP and level
  const totalXp = QUESTS_LIST.reduce((acc, q) => {
    return q.check(records) ? acc + q.xp : acc;
  }, recordsCount * 15);

  const level = Math.floor(totalXp / 150) + 1;
  const xpCurrentLevel = totalXp % 150;
  const progressPercent = Math.min(100, Math.round((xpCurrentLevel / 150) * 100));

  const levelTitles: Record<number, string> = {
    1: 'level.1',
    2: 'level.2',
    3: 'level.3',
    4: 'level.4'
  };
  const levelTitleKey = levelTitles[Math.min(4, level)] || 'level.4';

  return (
    <div className="space-y-6">
      {/* Level Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-3xl shadow-inner shrink-0">
              <Trophy className="w-8 h-8 text-amber-300 drop-shadow-sm" />
            </div>

            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-300 bg-white/10 px-2.5 py-0.5 rounded-full">
                  Рівень {level}
                </span>
                <span className="text-xs font-bold text-white/80">
                  {totalXp} {t('quests.xp')}
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight mt-0.5">
                {t(levelTitleKey)}
              </h2>
              <p className="text-xs text-white/80 mt-1 max-w-md">
                Продовжуй щоденні спостереження, щоб відкрити наступний рівень та особливі метео-титули!
              </p>
            </div>
          </div>

          {/* Progress bar to next level */}
          <div className="w-full sm:w-60 bg-white/15 p-3.5 rounded-2xl border border-white/20 backdrop-blur-xs">
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span>До рівня {level + 1}</span>
              <span className="font-mono">{xpCurrentLevel} / 150 XP</span>
            </div>
            <div className="w-full h-3 rounded-full bg-black/20 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quests Grid */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Star className="w-4 h-4 text-amber-600" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Метеоквести для дослідників
              </h3>
              <p className="text-xs text-slate-500">Виконуй місії та отримуй очки досвіду</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {QUESTS_LIST.map(quest => {
            const isCompleted = quest.check(records);

            return (
              <div
                key={quest.id}
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                  isCompleted
                    ? 'bg-emerald-50/70 border-emerald-200 shadow-xs'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl p-2 bg-white rounded-xl shadow-xs shrink-0">
                    {quest.icon}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{t(quest.titleKey)}</h4>
                      <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.2 rounded-md">
                        +{quest.xp} XP
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {t(quest.descKey)}
                    </p>
                  </div>
                </div>

                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievement Badges Grid */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
              <Award className="w-4 h-4 text-purple-600" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Колекція значків та відзнак
              </h3>
              <p className="text-xs text-slate-500">
                Твої наукові нагороди за регулярність та уважність
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {BADGES_LIST.map(badge => {
            let isUnlocked = false;
            if (badge.id === 'first') isUnlocked = recordsCount >= 1;
            else if (badge.id === 'week') isUnlocked = recordsCount >= 7;
            else if (badge.id === 'month') isUnlocked = recordsCount >= 20;
            else if (badge.id === 'rain') {
              isUnlocked = Object.values(records).some(r => r.sky === 'rain' || r.sky === 'storm');
            } else if (badge.id === 'wind') {
              isUnlocked = Object.values(records).some(r => r.wind !== null && r.dir !== null);
            } else if (badge.id === 'satellite') {
              isUnlocked = Object.values(records).some(r => !!r.real);
            }

            return (
              <div
                key={badge.id}
                onClick={() => sound.playTap()}
                className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-between gap-2 transition-all cursor-pointer ${
                  isUnlocked
                    ? 'bg-gradient-to-b from-amber-50 to-orange-50/50 border-amber-300 shadow-xs hover:scale-105'
                    : 'bg-slate-50 border-slate-200 opacity-60 grayscale'
                }`}
              >
                <span className="text-4xl drop-shadow-sm">{badge.icon}</span>

                <div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">
                    {t(badge.keyTitle)}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                    {t(badge.keyDesc)}
                  </p>
                </div>

                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    isUnlocked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isUnlocked ? 'Відкрито ✓' : 'Заблоковано'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
