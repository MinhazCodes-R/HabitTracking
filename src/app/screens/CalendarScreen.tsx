import { useState, useEffect } from 'react';
import { BottomNav } from '../components/BottomNav';
import { useHabits } from '@/hooks/useHabits';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../AuthContext';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarScreen() {
  const { user } = useAuth();
  const { habits } = useHabits();
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [dayLogs, setDayLogs] = useState<Record<string, Record<string, number>>>({});

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Fetch all logs for this month
  useEffect(() => {
    if (!user) return;
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`;

    supabase.from('habit_logs').select('habit_id, date, value')
      .eq('user_id', user.id).gte('date', from).lte('date', to)
      .then(({ data }) => {
        const map: Record<string, Record<string, number>> = {};
        (data ?? []).forEach(l => {
          if (!map[l.date]) map[l.date] = {};
          map[l.date][l.habit_id] = l.value;
        });
        setDayLogs(map);
      });
  }, [user, month, year, daysInMonth]);

  const getCompletionLevel = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const logs = dayLogs[dateStr];
    if (!logs || habits.length === 0) return 'bg-secondary';
    const completed = Object.keys(logs).length / habits.length;
    if (completed >= 0.8) return 'bg-white';
    if (completed >= 0.5) return 'bg-muted-foreground';
    if (completed > 0) return 'bg-muted';
    return 'bg-secondary';
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: startingDayOfWeek }, (_, i) => i);

  const selectedDateStr = selectedDate ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}` : '';
  const selectedLogs = selectedDateStr ? (dayLogs[selectedDateStr] ?? {}) : {};

  return (
    <div className="min-h-screen bg-background pb-24 max-w-md mx-auto">
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-medium text-white mb-1">Calendar</h1>
        <p className="text-muted-foreground">{monthNames[month]} {year}</p>
      </div>

      <div className="px-6">
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-xs text-muted-foreground font-medium">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {emptyDays.map((i) => <div key={`empty-${i}`} className="aspect-square" />)}
            {days.map((day) => {
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = day === selectedDate;
              return (
                <button key={day} onClick={() => setSelectedDate(day)}
                  className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                    isSelected ? 'bg-white text-black' : isToday ? 'bg-muted text-white border-2 border-white' : getCompletionLevel(day) + ' text-white'
                  }`}>
                  {day}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-6 pt-6 border-t border-border text-xs text-muted-foreground">
            <span>Completion:</span>
            <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-secondary" /><span>None</span></div>
            <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-muted" /><span>Low</span></div>
            <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-muted-foreground" /><span>Medium</span></div>
            <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-white" /><span>High</span></div>
          </div>
        </div>

        {selectedDate && (
          <div className="mt-4 bg-card rounded-2xl p-6 border border-border">
            <h3 className="text-white font-medium mb-4">{monthNames[month]} {selectedDate}, {year}</h3>
            <div className="space-y-3">
              {habits.length === 0 ? (
                <p className="text-muted-foreground">No habits tracked</p>
              ) : (
                habits.map(h => (
                  <div key={h.id} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{h.name}</span>
                    <span className="text-white">{selectedLogs[h.id] ?? 0} / {h.goal} {h.unit}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
