import React, { useMemo, useState } from 'react';
import { BarChart3, Compass, Table, TrendingUp, Info } from 'lucide-react';
import { Language, Profile, Units, WeatherRecord } from '../types';
import { getT } from '../i18n/translations';
import {
  toDispTemp,
  toDispWind,
  formatTempStr,
  getTempColor,
  DIR_LABELS,
  SKY_CONFIG,
  getDaysInMonth
} from '../utils/weather';

interface ChartSectionProps {
  lang: Language;
  units: Units;
  viewYear: number;
  viewMonth: number;
  activeProfile: Profile;
}

export const ChartSection: React.FC<ChartSectionProps> = ({
  lang,
  units,
  viewYear,
  viewMonth,
  activeProfile
}) => {
  const t = getT(lang);
  const [showTable, setShowTable] = useState(false);

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`;
  const daysInCurMonth = getDaysInMonth(viewYear, viewMonth);

  const monthRecords: WeatherRecord[] = useMemo(() => {
    return Object.entries(activeProfile.records)
      .filter(([k]) => k.startsWith(monthPrefix))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, r]) => ({
        ...r,
        key: k,
        day: Number(k.split('-')[2])
      }));
  }, [activeProfile.records, monthPrefix]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (!monthRecords.length) return null;
    const temps = monthRecords.map(r => r.temp);
    const sum = temps.reduce((a, b) => a + b, 0);
    const avg = sum / temps.length;

    let maxRec = monthRecords[0];
    let minRec = monthRecords[0];
    let wetDays = 0;
    const dirCounts = new Array(8).fill(0);

    monthRecords.forEach(r => {
      if (r.temp > maxRec.temp) maxRec = r;
      if (r.temp < minRec.temp) minRec = r;
      if (r.sky === 'rain' || r.sky === 'storm' || r.sky === 'snow') wetDays++;
      if (r.dir !== null && r.dir >= 0 && r.dir <= 7) dirCounts[r.dir]++;
    });

    const maxDirVal = Math.max(...dirCounts);
    const topDirIndex = maxDirVal > 0 ? dirCounts.indexOf(maxDirVal) : null;

    return {
      count: monthRecords.length,
      avg,
      maxRec,
      minRec,
      wetDays,
      topDirIndex,
      dirCounts
    };
  }, [monthRecords]);

  // SVG Chart Geometry
  const chartSvg = useMemo(() => {
    if (!monthRecords.length) return null;

    const width = 640;
    const height = 240;
    const padL = 45;
    const padR = 25;
    const padT = 20;
    const padB = 35;

    const allTemps: number[] = [];
    monthRecords.forEach(r => {
      allTemps.push(toDispTemp(r.temp, units));
      if (r.real) allTemps.push(toDispTemp(r.real.temp, units));
    });

    let minT = Math.min(...allTemps);
    let maxT = Math.max(...allTemps);

    // Padding bounds
    minT = Math.floor(minT - 2);
    maxT = Math.ceil(maxT + 2);
    if (minT === maxT) {
      minT -= 5;
      maxT += 5;
    }

    const scaleX = (day: number) => {
      return padL + ((day - 1) / (daysInCurMonth - 1 || 1)) * (width - padL - padR);
    };

    const scaleY = (val: number) => {
      return height - padB - ((val - minT) / (maxT - minT)) * (height - padT - padB);
    };

    // Build user line points
    const userPoints = monthRecords.map(r => `${scaleX(r.day || 1)},${scaleY(toDispTemp(r.temp, units))}`).join(' ');

    // Build satellite line points
    const satRecords = monthRecords.filter(r => r.real !== null && r.real !== undefined);
    const satPoints = satRecords
      .map(r => `${scaleX(r.day || 1)},${scaleY(toDispTemp(r.real!.temp, units))}`)
      .join(' ');

    const zeroY = units === 'metric' ? scaleY(0) : scaleY(32);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none font-sans">
        {/* Horizontal grid lines */}
        {[minT, Math.round((minT + maxT) / 2), maxT].map((val, idx) => (
          <g key={idx}>
            <line
              x1={padL}
              x2={width - padR}
              y1={scaleY(val)}
              y2={scaleY(val)}
              stroke="#E2E8F0"
              strokeDasharray="4 4"
            />
            <text
              x={padL - 8}
              y={scaleY(val) + 4}
              textAnchor="end"
              className="text-[10px] fill-slate-400 font-mono font-bold"
            >
              {val}°
            </text>
          </g>
        ))}

        {/* 0°C Freezing point reference */}
        {zeroY >= padT && zeroY <= height - padB && (
          <g>
            <line
              x1={padL}
              x2={width - padR}
              y1={zeroY}
              y2={zeroY}
              stroke="#38BDF8"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
            <text
              x={width - padR}
              y={zeroY - 4}
              textAnchor="end"
              className="text-[9px] fill-sky-600 font-bold"
            >
              ❄️ Точка замерзання ({units === 'metric' ? '0°C' : '32°F'})
            </text>
          </g>
        )}

        {/* Satellite Line */}
        {satRecords.length > 1 && (
          <polyline
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2.5"
            strokeDasharray="5 4"
            points={satPoints}
          />
        )}

        {/* User Line */}
        {monthRecords.length > 1 && (
          <polyline
            fill="none"
            stroke="#0F172A"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={userPoints}
          />
        )}

        {/* Satellite dots */}
        {satRecords.map((r, i) => (
          <circle
            key={`sat-${i}`}
            cx={scaleX(r.day || 1)}
            cy={scaleY(toDispTemp(r.real!.temp, units))}
            r={3.5}
            fill="#F59E0B"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
        ))}

        {/* User dots */}
        {monthRecords.map((r, i) => (
          <circle
            key={`usr-${i}`}
            cx={scaleX(r.day || 1)}
            cy={scaleY(toDispTemp(r.temp, units))}
            r={5.5}
            fill={getTempColor(r.temp)}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        ))}

        {/* Days X Axis markers */}
        {Array.from({ length: daysInCurMonth }).map((_, i) => {
          const d = i + 1;
          if (d === 1 || d === 5 || d === 10 || d === 15 || d === 20 || d === 25 || d === daysInCurMonth) {
            return (
              <text
                key={`day-${d}`}
                x={scaleX(d)}
                y={height - 12}
                textAnchor="middle"
                className="text-[10px] fill-slate-400 font-mono font-bold"
              >
                {d}
              </text>
            );
          }
          return null;
        })}
      </svg>
    );
  }, [monthRecords, daysInCurMonth, units]);

  // Wind Rose SVG Geometry
  const windRoseSvg = useMemo(() => {
    if (!stats || !stats.dirCounts) return null;
    const counts = stats.dirCounts;
    const maxVal = Math.max(...counts, 1);
    const size = 180;
    const center = size / 2;
    const maxRadius = 60;

    const points = counts.map((cnt, idx) => {
      const angle = (idx * 45 - 90) * (Math.PI / 180);
      const r = (cnt / maxVal) * maxRadius;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${size} ${size}`} className="w-44 h-44 select-none">
        {/* Radar Rings */}
        <circle cx={center} cy={center} r={maxRadius * 0.5} fill="none" stroke="#E2E8F0" strokeWidth="1" />
        <circle cx={center} cy={center} r={maxRadius} fill="none" stroke="#CBD5E1" strokeWidth="1.5" />

        {/* 8 Axes */}
        {DIR_LABELS.map((label, idx) => {
          const angle = (idx * 45 - 90) * (Math.PI / 180);
          const x2 = center + (maxRadius + 18) * Math.cos(angle);
          const y2 = center + (maxRadius + 18) * Math.sin(angle);
          return (
            <g key={idx}>
              <line
                x1={center}
                y1={center}
                x2={center + maxRadius * Math.cos(angle)}
                y2={center + maxRadius * Math.sin(angle)}
                stroke="#E2E8F0"
                strokeWidth="1"
              />
              <text
                x={x2}
                y={y2 + 3}
                textAnchor="middle"
                className="text-[9px] fill-slate-500 font-bold font-mono"
              >
                {label.slice(2)}
              </text>
            </g>
          );
        })}

        {/* Filled polygon */}
        {counts.some(c => c > 0) && (
          <polygon
            points={points}
            fill="rgba(2, 132, 199, 0.25)"
            stroke="#0284C7"
            strokeWidth="2"
          />
        )}
      </svg>
    );
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Середня t°
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">
              {formatTempStr(stats.avg, units)}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              За {stats.count} днів
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Найтепліше
            </span>
            <span className="text-2xl font-black text-amber-600 font-mono mt-0.5 block">
              {formatTempStr(stats.maxRec.temp, units)}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              День {stats.maxRec.day}
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Найхолодніше
            </span>
            <span className="text-2xl font-black text-sky-600 font-mono mt-0.5 block">
              {formatTempStr(stats.minRec.temp, units)}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              День {stats.minRec.day}
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Днів з опадами
            </span>
            <span className="text-2xl font-black text-indigo-600 font-mono mt-0.5 block">
              {stats.wetDays}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Дощ, сніг чи гроза
            </span>
          </div>
        </div>
      )}

      {/* Main Charts: Trend & Wind Rose */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Line Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                Графік зміни температури
              </h3>
              <p className="text-xs text-slate-500">
                Твої власні спостереження (темна лінія) та супутникова модель (пунктир)
              </p>
            </div>

            {/* Legend pills */}
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-1 bg-slate-900 rounded-full" />
                Ти
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-1 bg-amber-500 rounded-full" />
                Open-Meteo
              </span>
            </div>
          </div>

          {monthRecords.length > 0 ? (
            <div className="mt-2">{chartSvg}</div>
          ) : (
            <div className="py-16 text-center text-slate-400 text-xs">
              Ще немає записів у цьому місяці. Додай перший запис у календарі або лабораторії!
            </div>
          )}
        </div>

        {/* Wind Rose (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col items-center justify-between">
          <div className="w-full text-left mb-2">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-500" />
              Роза вітрів
            </h3>
            <p className="text-xs text-slate-500">
              {stats?.topDirIndex !== null && stats?.topDirIndex !== undefined
                ? `Вітер найчастіше дув: ${DIR_LABELS[stats.topDirIndex]}`
                : 'Показує переважаючі напрямки вітру'}
            </p>
          </div>

          <div className="my-auto py-2">{windRoseSvg}</div>

          <span className="text-[11px] text-slate-400 text-center">
            Чим довша пелюстка у бік напрямку, тим частіше дув вітер.
          </span>
        </div>
      </div>

      {/* Expandable Data Table for school inspection */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
        <button
          onClick={() => setShowTable(!showTable)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-slate-600" />
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Таблиця наукових спостережень
            </h3>
          </div>
          <span className="text-xs font-bold text-amber-600 hover:text-amber-700">
            {showTable ? 'Згорнути ▲' : 'Показати всі дані ▼'}
          </span>
        </button>

        {showTable && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Дата</th>
                  <th className="py-2.5 px-3">Час</th>
                  <th className="py-2.5 px-3">Температура</th>
                  <th className="py-2.5 px-3">Небо</th>
                  <th className="py-2.5 px-3">Вологість</th>
                  <th className="py-2.5 px-3">Вітер</th>
                  <th className="py-2.5 px-3">Супутник</th>
                  <th className="py-2.5 px-3">Нотатки</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {monthRecords.map(r => {
                  const skyObj = SKY_CONFIG.find(s => s.type === r.sky);
                  return (
                    <tr key={r.key} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-bold text-slate-900 font-mono">{r.key}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">{r.t || '09:00'}</td>
                      <td className="py-2.5 px-3 font-bold font-mono">
                        {formatTempStr(r.temp, units)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="mr-1">{skyObj?.icon}</span>
                        <span>{t(skyObj?.labelKey || '')}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono">{r.hum !== null ? `${r.hum}%` : '—'}</td>
                      <td className="py-2.5 px-3 font-mono">
                        {r.wind !== null ? `${toDispWind(r.wind, units)} ${units === 'imperial' ? 'mph' : 'м/с'}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-amber-700">
                        {r.real ? formatTempStr(r.real.temp, units) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                        {r.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
