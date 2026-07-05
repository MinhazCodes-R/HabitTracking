import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useHabitMonthLogs } from '@/hooks/useHabits';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Miniature month calendar for a single habit — same shading scale as CalendarScreen.
export function HabitMiniCalendar({ habitId, goal }: { habitId: string; goal: number }) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const logs = useHabitMonthLogs(habitId, viewYear, viewMonth);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startingDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const getCompletionLevel = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const ratio = (logs[dateStr] ?? 0) / (goal || 1);
    if (ratio >= 1) return 'bg-white text-black';
    if (ratio >= 0.5) return 'bg-muted-foreground text-white';
    if (ratio > 0) return 'bg-muted text-white';
    return 'bg-secondary text-muted-foreground';
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: startingDayOfWeek }, (_, i) => i);

  return (
    <div className="bg-card rounded-2xl p-4 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">Activity</h3>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
            <ChevronLeft className="w-3 h-3 text-white" />
          </button>
          <span className="text-muted-foreground text-xs font-medium w-16 text-center">{monthNames[viewMonth]} {viewYear}</span>
          <button onClick={nextMonth} className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
            <ChevronRight className="w-3 h-3 text-white" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayLabels.map((label, i) => (
          <div key={i} className="text-center text-[10px] text-muted-foreground font-medium">{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {emptyDays.map((i) => <div key={`empty-${i}`} className="aspect-square" />)}
        {days.map((day) => {
          const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
          return (
            <div key={day}
              className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium ${getCompletionLevel(day)} ${isToday ? 'ring-1 ring-white' : ''}`}>
              {day}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border text-[10px] text-muted-foreground">
        <span>Completion:</span>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-secondary" /><span>None</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-muted" /><span>Low</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-muted-foreground" /><span>Medium</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-white" /><span>High</span></div>
      </div>
    </div>
  );
}
