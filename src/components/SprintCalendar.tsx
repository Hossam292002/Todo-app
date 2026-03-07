'use client';

import { useState, useMemo } from 'react';

/** Get Monday of the week for the given date (week starts Monday). */
export function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** ISO date string (YYYY-MM-DD) for a Date, using local date (for calendar display). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format sprint range for display: "Mar 2 – Mar 8". */
export function formatSprintRange(sprintStart: string): string {
  const mon = new Date(sprintStart + 'T12:00:00');
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const fmt = (d: Date) => {
    const m = d.toLocaleString('default', { month: 'short' });
    const day = d.getDate();
    return `${m} ${day}`;
  };
  return `${fmt(mon)} – ${fmt(sun)}`;
}

type SprintCalendarProps = {
  value: string | null;
  onChange: (sprintStart: string | null) => void;
  className?: string;
};

export function SprintCalendar({ value, onChange, className = '' }: SprintCalendarProps) {
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value + 'T12:00:00');
    const d = new Date();
    return getMondayOfWeek(d);
  });

  const selectedMonday = value ? new Date(value + 'T12:00:00') : null;
  const selectedSunday = value ? (() => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d + 6);
  })() : null;

  const { monthLabel, weeks } = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startMonday = getMondayOfWeek(first);
    const endSunday = new Date(getMondayOfWeek(last));
    endSunday.setDate(endSunday.getDate() + 6);
    const days: Date[] = [];
    const d = new Date(startMonday);
    while (d <= endSunday) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    const weekCount = Math.ceil(days.length / 7);
    const weeks: Date[][] = [];
    for (let w = 0; w < weekCount; w++) weeks.push(days.slice(w * 7, w * 7 + 7));
    const monthLabel = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    return { monthLabel, weeks };
  }, [viewDate.getFullYear(), viewDate.getMonth()]);

  const isInSelectedWeek = (d: Date) => {
    if (!selectedMonday || !selectedSunday) return false;
    const dayStr = toISODate(d);
    return dayStr >= toISODate(selectedMonday) && dayStr <= toISODate(selectedSunday);
  };
  const isStartOfSelectedWeek = (d: Date) => selectedMonday !== null && toISODate(d) === toISODate(selectedMonday);
  const isEndOfSelectedWeek = (d: Date) => selectedSunday !== null && toISODate(d) === toISODate(selectedSunday);
  const isCurrentMonth = (d: Date) => d.getMonth() === viewDate.getMonth();

  const handleDayClick = (d: Date) => {
    const monday = getMondayOfWeek(d);
    const iso = toISODate(monday);
    onChange(value === iso ? null : iso);
  };

  const prevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  const nextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1));

  return (
    <div className={`rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-500 dark:bg-slate-700 ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-600"
          aria-label="Previous month"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{monthLabel}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-600"
          aria-label="Next month"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-x-0 gap-y-1 text-center text-xs">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="py-1 font-medium text-slate-500 dark:text-slate-400">{day}</div>
        ))}
        {weeks.flatMap((row) =>
          row.map((d) => {
            const inWeek = isInSelectedWeek(d);
            const isStart = isStartOfSelectedWeek(d);
            const isEnd = isEndOfSelectedWeek(d);
            const isMiddle = inWeek && !isStart && !isEnd;
            const currentMonth = isCurrentMonth(d);
            const barBg = 'bg-slate-300 dark:bg-slate-500';
            const barRoundedLeft = isStart ? 'rounded-l-lg' : '';
            const barRoundedRight = isEnd ? 'rounded-r-lg' : '';
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => handleDayClick(d)}
                className={`
                  min-h-8 min-w-8 py-1 text-sm transition-colors
                  ${inWeek ? `${barBg} ${barRoundedLeft} ${barRoundedRight}` : ''}
                  ${!inWeek && !currentMonth ? 'text-slate-400 dark:text-slate-500' : ''}
                  ${!inWeek && currentMonth ? 'text-slate-800 dark:text-slate-200' : ''}
                  ${inWeek && (isStart || isEnd) ? '' : ''}
                  ${inWeek && isMiddle ? 'text-white dark:text-white' : ''}
                  ${!inWeek ? 'hover:text-emerald-600 dark:hover:text-emerald-400' : ''}
                `}
              >
                {(isStart || isEnd) && inWeek ? (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-800 dark:bg-white dark:text-slate-900">
                    {d.getDate()}
                  </span>
                ) : (
                  d.getDate()
                )}
              </button>
            );
          })
        )}
      </div>
      {value && (
        <p className="mt-2 text-center text-xs font-medium text-slate-700 dark:text-slate-300">
          Sprint: {formatSprintRange(value)}
        </p>
      )}
    </div>
  );
}
