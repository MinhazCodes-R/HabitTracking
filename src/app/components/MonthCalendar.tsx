import React from 'react';
import { Habit, ProgressLogs } from '../context/HabitContext';

interface MonthCalendarProps {
  year: number;
  month: number;
  habits: Habit[];
  monthLogs: ProgressLogs;
  selectedDate: string | null;
  onSelectDate: (dateStr: string) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Returns a colour style object based on completion ratio 0‑1 */
function getCompletionStyle(ratio: number): React.CSSProperties {
  if (ratio <= 0) return {};
  if (ratio >= 1) return { background: 'rgba(255,255,255,0.95)', color: '#000' };
  if (ratio >= 0.6) return { background: 'rgba(34,197,94,0.55)' };   // green
  if (ratio >= 0.3) return { background: 'rgba(234,179,8,0.45)' };   // yellow
  return { background: 'rgba(99,102,241,0.35)' };                     // indigo
}

export const MonthCalendar = React.memo(function MonthCalendar({
  year,
  month,
  habits,
  monthLogs,
  selectedDate,
  onSelectDate,
}: MonthCalendarProps) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const getDateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const getCompletionRatio = (day: number): number => {
    if (habits.length === 0) return 0;
    const dateStr = getDateStr(day);
    const dayLogs = monthLogs[dateStr];
    if (!dayLogs) return 0;

    let totalRatio = 0;
    for (const habit of habits) {
      const progress = dayLogs[habit.id] ?? 0;
      const ratio = habit.goal > 0 ? Math.min(progress / habit.goal, 1) : (progress > 0 ? 1 : 0);
      totalRatio += ratio;
    }
    return totalRatio / habits.length;
  };

  const emptySlots = Array.from({ length: firstDay });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Month header */}
      <div style={{ 
        padding: '0.25rem 0 0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <span style={{ 
          fontSize: '1.1rem', 
          fontWeight: 600, 
          color: '#fff',
          letterSpacing: '-0.01em',
        }}>
          {MONTH_NAMES[month]}
        </span>
        <span style={{ fontSize: '1.1rem', fontWeight: 400, color: 'var(--muted-foreground)' }}>
          {year}
        </span>
      </div>

      {/* Day header row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '4px',
        marginBottom: '4px',
      }}>
        {DAY_NAMES.map((d) => (
          <div key={d} style={{
            textAlign: 'center',
            fontSize: '0.7rem',
            fontWeight: 500,
            color: 'var(--muted-foreground)',
            paddingBottom: '2px',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '4px',
      }}>
        {/* Empty start cells */}
        {emptySlots.map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day buttons */}
        {days.map((day) => {
          const dateStr = getDateStr(day);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const ratio = getCompletionRatio(day);
          const completionStyle = isSelected ? {} : getCompletionStyle(ratio);

          return (
            <button
              key={day}
              onClick={() => onSelectDate(dateStr)}
              style={{
                aspectRatio: '1',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: isToday ? 700 : 500,
                cursor: 'pointer',
                border: isToday ? '2px solid rgba(255,255,255,0.8)' : isSelected ? 'none' : '1px solid transparent',
                background: isSelected
                  ? '#ffffff'
                  : completionStyle.background ?? 'var(--secondary)',
                color: isSelected ? '#000' : (completionStyle.color ?? '#fff'),
                transition: 'all 0.15s ease',
                outline: 'none',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {day}
              {/* Progress dot for partial completion */}
              {!isSelected && ratio > 0 && ratio < 1 && (
                <span style={{
                  position: 'absolute',
                  bottom: '3px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '3px',
                  height: '3px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.8)',
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});
