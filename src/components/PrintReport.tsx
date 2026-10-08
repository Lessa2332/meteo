import React from 'react';
import { Profile, Units, WeatherRecord } from '../types';
import { formatTempStr, toDispWind, SKY_CONFIG, getDaysInMonth } from '../utils/weather';

interface PrintReportProps {
  profile: Profile;
  viewYear: number;
  viewMonth: number;
  units: Units;
}

export const PrintReport: React.FC<PrintReportProps> = ({
  profile,
  viewYear,
  viewMonth,
  units
}) => {
  const monthNames = [
    'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
    'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
  ];

  const daysCount = getDaysInMonth(viewYear, viewMonth);
  const rows = Array.from({ length: daysCount }, (_, i) => {
    const day = i + 1;
    const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const rec: WeatherRecord | undefined = profile.records[dateKey];
    return { day, dateKey, rec };
  });

  return (
    <div className="hidden print:block p-8 bg-white text-black font-sans text-xs">
      {/* School Header */}
      <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Шкільний щоденник погоди</h1>
          <p className="text-sm font-bold text-gray-700 mt-1">
            Аркуш регулярних метеорологічних спостережень
          </p>
        </div>
        <div className="text-right text-xs space-y-1">
          <div><span className="font-bold">Учень:</span> {profile.name}</div>
          <div><span className="font-bold">Клас:</span> {profile.cls || '—'}</div>
          <div><span className="font-bold">Місто/Село:</span> {profile.city.name}</div>
          <div><span className="font-bold">Місяць:</span> {monthNames[viewMonth]} {viewYear} р.</div>
        </div>
      </div>

      {/* Observation Table */}
      <table className="w-full border-collapse border border-black text-center text-[10px]">
        <thead>
          <tr className="bg-gray-100 border-b border-black font-bold uppercase">
            <th className="border border-black p-1.5 w-10">День</th>
            <th className="border border-black p-1.5 w-16">Час</th>
            <th className="border border-black p-1.5 w-20">Температура</th>
            <th className="border border-black p-1.5 w-24">Стан неба</th>
            <th className="border border-black p-1.5 w-16">Вологість</th>
            <th className="border border-black p-1.5 w-24">Вітер</th>
            <th className="border border-black p-1.5">Особливі спостереження (нотатки)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ day, rec }) => {
            const skyObj = rec ? SKY_CONFIG.find(s => s.type === rec.sky) : null;
            return (
              <tr key={day} className="border-b border-gray-300">
                <td className="border border-black p-1 font-bold">{day}</td>
                <td className="border border-black p-1">{rec?.t || '—'}</td>
                <td className="border border-black p-1 font-bold font-mono">
                  {rec ? formatTempStr(rec.temp, units) : '—'}
                </td>
                <td className="border border-black p-1">
                  {skyObj ? `${skyObj.icon} ${skyObj.type}` : '—'}
                </td>
                <td className="border border-black p-1 font-mono">
                  {rec?.hum !== null && rec?.hum !== undefined ? `${rec.hum}%` : '—'}
                </td>
                <td className="border border-black p-1 font-mono">
                  {rec?.wind !== null && rec?.wind !== undefined ? `${toDispWind(rec.wind, units)} м/с` : '—'}
                </td>
                <td className="border border-black p-1 text-left px-2 italic">
                  {rec?.notes || ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Teacher Signature & Assessment */}
      <div className="mt-8 pt-4 border-t border-gray-400 flex justify-between items-center text-xs">
        <div>
          <span>Підпис вчителя: _____________________</span>
        </div>
        <div>
          <span>Оцінка: __________</span>
        </div>
        <div>
          <span>Дата перевірки: _________________</span>
        </div>
      </div>
    </div>
  );
};
