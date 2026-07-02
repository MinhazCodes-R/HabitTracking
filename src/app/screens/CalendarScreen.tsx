import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, Plus, Minus } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { useHabits } from '@/hooks/useHabits';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../AuthContext';
import { displayUnit, toLocalDateStr } from '@/lib/date';
import { getIcon } from '@/lib/habitConfig';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarScreen() {
  const { user } = useAuth();
  const { habits, logProgressForDate } = useHabits();
  const today = new Date();
  const todayStr = toLocalDateStr(today);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [dayLogs, setDayLogs] = useState<Record<string, Record<string, number>>>({});

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startingDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => {
    setSelectedDate(null);
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    setSelectedDate(null);
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const categories = useMemo(() => {
    const cats = [...new Set(habits.map(h => h.category))];
    return ['all', ...cats];
  }, [habits]);

  const filteredHabits = useMemo(() =>
    selectedCategory === 'all' ? habits : habits.filter(h => h.category === selectedCategory),
    [habits, selectedCategory]
  );

  const filteredHabitIds = useMemo(() => new Set(filteredHabits.map(h => h.id)), [filteredHabits]);

  const selectedHabit = useMemo(
    () => habits.find(h => h.id === selectedHabitId) ?? null,
    [habits, selectedHabitId]
  );

  useEffect(() => {
    if (selectedHabitId && !filteredHabits.some(h => h.id === selectedHabitId)) {
      setSelectedHabitId(null);
    }
  }, [filteredHabits, selectedHabitId]);

  useEffect(() => {
    if (!user) return;
    const mm = String(viewMonth + 1).padStart(2, '0');
    const from = `${viewYear}-${mm}-01`;
    const to = `${viewYear}-${mm}-${daysInMonth}`;

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
  }, [user, viewMonth, viewYear, daysInMonth]);

  const getCompletionLevel = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const logs = dayLogs[dateStr];
    if (!logs) return 'bg-secondary';

    if (selectedHabit) {
      const goal = selectedHabit.goal || 1;
      const ratio = (logs[selectedHabit.id] ?? 0) / goal;
      if (ratio >= 1) return 'bg-white';
      if (ratio >= 0.5) return 'bg-muted-foreground';
      if (ratio > 0) return 'bg-muted';
      return 'bg-secondary';
    }

    if (filteredHabits.length === 0) return 'bg-secondary';
    const relevant = Object.keys(logs).filter(id => filteredHabitIds.has(id));
    const completed = relevant.length / filteredHabits.length;
    if (completed >= 0.8) return 'bg-white';
    if (completed >= 0.5) return 'bg-muted-foreground';
    if (completed > 0) return 'bg-muted';
    return 'bg-secondary';
  };

  const habitMonthStats = useMemo(() => {
    if (!selectedHabit) return null;
    const goal = selectedHabit.goal || 1;
    let hit = 0;
    let logged = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const value = dayLogs[dateStr]?.[selectedHabit.id] ?? 0;
      if (value > 0) logged++;
      if (value >= goal) hit++;
    }
    return { hit, logged, total: daysInMonth };
  }, [selectedHabit, dayLogs, viewMonth, viewYear, daysInMonth]);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: startingDayOfWeek }, (_, i) => i);

  const selectedDateStr = selectedDate ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}` : '';
  const selectedLogs = selectedDateStr ? (dayLogs[selectedDateStr] ?? {}) : {};
  const isFutureDate = selectedDateStr > todayStr;
  const canEditSelected = Boolean(selectedDateStr) && !isFutureDate;

  const updateSelectedLog = (habitId: string, value: number) => {
    if (!canEditSelected) return;
    const clamped = Math.max(0, value);
    setDayLogs(prev => {
      const next = { ...prev };
      const day = { ...(next[selectedDateStr] ?? {}) };
      if (clamped === 0) delete day[habitId];
      else day[habitId] = clamped;
      next[selectedDateStr] = day;
      return next;
    });
    logProgressForDate(habitId, clamped, selectedDateStr);
  };

  return (
    <div className="min-h-screen bg-background pb-24 max-w-md mx-auto">
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-medium text-white mb-1">Calendar</h1>
        <div className="flex items-center gap-4 mt-2">
          <button onClick={prevMonth} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <span className="text-muted-foreground text-lg font-medium">{monthNames[viewMonth]} {viewYear}</span>
          <button onClick={nextMonth} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="px-6 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat ? 'bg-white text-black' : 'bg-secondary text-white hover:bg-accent'
              }`}>
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filteredHabits.length > 0 && (
        <div className="px-6 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button onClick={() => setSelectedHabitId(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                selectedHabitId === null ? 'bg-white text-black border-white' : 'bg-transparent text-muted-foreground border-border hover:text-white'
              }`}>
              All habits
            </button>
            {filteredHabits.map(h => {
              const HabitIcon = getIcon(h.icon);
              const isOn = selectedHabitId === h.id;
              return (
                <button key={h.id} onClick={() => setSelectedHabitId(h.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors flex items-center gap-1.5 ${
                    isOn ? 'text-black border-transparent' : 'text-white border-border hover:bg-accent'
                  }`}
                  style={isOn ? { backgroundColor: h.color } : { backgroundColor: h.color + '20' }}>
                  <HabitIcon className="w-3.5 h-3.5" style={{ color: isOn ? '#000' : h.color }} />
                  {h.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedHabit && habitMonthStats && (
        <div className="px-6 mb-4">
          <div className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tracking</p>
              <p className="text-white font-medium" style={{ color: selectedHabit.color }}>{selectedHabit.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Goal hit this month</p>
              <p className="text-white font-medium">
                {habitMonthStats.hit} / {habitMonthStats.total} days
              </p>
            </div>
          </div>
        </div>
      )}

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
              const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">{monthNames[viewMonth]} {selectedDate}, {viewYear}</h3>
              {isFutureDate && <span className="text-xs text-muted-foreground">Future date</span>}
            </div>
            <div className="space-y-4">
              {filteredHabits.length === 0 ? (
                <p className="text-muted-foreground">No habits in this category</p>
              ) : (
                filteredHabits.map(h => {
                  const current = selectedLogs[h.id] ?? 0;
                  const isBoolean = h.metric_type === 'boolean';
                  const isDone = current >= h.goal;
                  const unitLabel = displayUnit(h.metric_type, h.unit);
                  const step = h.increments?.[0] ?? 1;
                  return (
                    <div key={h.id}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white">{h.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {current} / {h.goal}{unitLabel ? ` ${unitLabel}` : ''}
                        </span>
                      </div>
                      {isBoolean ? (
                        <button
                          disabled={!canEditSelected}
                          onClick={() => updateSelectedLog(h.id, isDone ? 0 : h.goal)}
                          className={`w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isDone ? 'bg-green-400/20 text-green-400' : 'bg-secondary text-white hover:bg-accent'
                          }`}>
                          <CheckCircle className="w-4 h-4" />
                          {isDone ? 'Done' : 'Mark done'}
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            disabled={!canEditSelected}
                            onClick={() => updateSelectedLog(h.id, Math.max(current - step, 0))}
                            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-secondary text-white hover:bg-accent transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            <Minus className="w-4 h-4" />
                            {step}{unitLabel ? ` ${unitLabel}` : ''}
                          </button>
                          <button
                            disabled={!canEditSelected}
                            onClick={() => updateSelectedLog(h.id, isDone ? 0 : h.goal)}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              isDone ? 'bg-green-400/20 text-green-400' : 'bg-secondary text-white hover:bg-accent'
                            }`}>
                            <CheckCircle className="w-4 h-4" />
                            {isDone ? 'Done' : 'Complete'}
                          </button>
                          <button
                            disabled={!canEditSelected}
                            onClick={() => updateSelectedLog(h.id, Math.min(current + step, h.goal))}
                            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-secondary text-white hover:bg-accent transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            <Plus className="w-4 h-4" />
                            {step}{unitLabel ? ` ${unitLabel}` : ''}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
