import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/AuthContext';
import { toLocalDateStr } from '@/lib/date';
import { qk } from '@/lib/queryKeys';

export interface Habit {
  id: string;
  name: string;
  category: string;
  group_id: string | null;
  metric_type: string;
  unit: string;
  goal: number;
  frequency: string;
  increments: number[];
  icon: string;
  color: string;
  position: number;
  archived: boolean;
}

export interface HabitWithProgress extends Habit {
  current: number;
}

async function fetchHabitsWithProgress(userId: string, today: string): Promise<HabitWithProgress[]> {
  const { data: habitsData } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('archived', false)
    .order('position', { ascending: true });

  if (!habitsData) return [];

  const { data: logsData } = await supabase
    .from('habit_logs')
    .select('habit_id, value')
    .eq('user_id', userId)
    .eq('date', today);

  const logMap = new Map((logsData ?? []).map(l => [l.habit_id, l.value]));

  return habitsData.map(h => ({
    ...h,
    group_id: h.group_id ?? null,
    increments: h.increments ?? [10, 25, 50],
    icon: h.icon ?? 'circle',
    color: h.color ?? '#ffffff',
    position: h.position ?? 0,
    archived: h.archived ?? false,
    current: logMap.get(h.id) ?? 0,
  }));
}

export function useHabits() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const today = toLocalDateStr(new Date());
  const uid = user?.id ?? '';
  const habitsKey = qk.habits(uid, today);

  const { data: habits = [], isPending, refetch } = useQuery({
    queryKey: habitsKey,
    queryFn: () => fetchHabitsWithProgress(uid, today),
    enabled: !authLoading && !!user,
  });

  const loading = authLoading || (!!user && isPending);

  const setCached = (updater: (prev: HabitWithProgress[]) => HabitWithProgress[]) => {
    queryClient.setQueryData<HabitWithProgress[]>(habitsKey, prev => updater(prev ?? []));
  };

  // Any habit_logs write can affect the detail calendar, big calendar, and analytics.
  const invalidateLogs = () => {
    if (user) queryClient.invalidateQueries({ queryKey: qk.logs(uid) });
  };

  const createHabit = async (habit: Omit<Habit, 'id' | 'archived'>) => {
    if (!user) return;
    await supabase.from('habits').insert({ ...habit, user_id: user.id, archived: false });
    await refetch();
  };

  const updateHabit = async (habitId: string, updates: Partial<Omit<Habit, 'id'>>) => {
    setCached(prev => prev.map(h => h.id === habitId ? { ...h, ...updates } : h));
    supabase.from('habits').update(updates).eq('id', habitId).then();
  };

  const reorderHabits = (reordered: HabitWithProgress[]) => {
    setCached(() => reordered);
    reordered.forEach((h, i) => {
      supabase.from('habits').update({ position: i }).eq('id', h.id).then();
    });
  };

  const logProgress = async (habitId: string, value: number) => {
    if (!user) return;
    setCached(prev => prev.map(h => h.id === habitId ? { ...h, current: value } : h));
    await supabase.from('habit_logs').upsert(
      { habit_id: habitId, user_id: user.id, date: today, value },
      { onConflict: 'habit_id,date' }
    );
    invalidateLogs();
  };

  const logProgressForDate = async (habitId: string, value: number, date: string) => {
    if (!user) return;
    if (date === today) {
      setCached(prev => prev.map(h => h.id === habitId ? { ...h, current: value } : h));
    }
    await supabase.from('habit_logs').upsert(
      { habit_id: habitId, user_id: user.id, date, value },
      { onConflict: 'habit_id,date' }
    );
    invalidateLogs();
  };

  const getHabitLogs = async (habitId: string, days: number = 84) => {
    if (!user) return {};
    return fetchLogMap(user.id, habitId, days);
  };

  const archiveHabit = async (habitId: string) => {
    setCached(prev => prev.filter(h => h.id !== habitId));
    await supabase.from('habits').update({ archived: true }).eq('id', habitId);
  };

  // Bulk "check all" for a group. Idempotent: habits already at/past goal are skipped.
  // Binary habits go to value=goal (1); quantitative habits jump to their goal value.
  const logProgressForGroup = async (groupId: string) => {
    if (!user) return;
    const targets = habits.filter(h => h.group_id === groupId && h.current < h.goal);
    if (targets.length === 0) return;

    setCached(prev => prev.map(h => h.group_id === groupId && h.current < h.goal ? { ...h, current: h.goal } : h));

    const rows = targets.map(h => ({ habit_id: h.id, user_id: user.id, date: today, value: h.goal }));
    await supabase.from('habit_logs').upsert(rows, { onConflict: 'habit_id,date' });
    invalidateLogs();
  };

  return { habits, loading, createHabit, updateHabit, reorderHabits, logProgress, logProgressForDate, logProgressForGroup, getHabitLogs, archiveHabit, refetch };
}

async function fetchLogMap(userId: string, habitId: string, days: number): Promise<Record<string, number>> {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const { data } = await supabase
    .from('habit_logs')
    .select('date, value')
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .gte('date', toLocalDateStr(from));

  const map: Record<string, number> = {};
  (data ?? []).forEach(l => { map[l.date] = l.value; });
  return map;
}

// Cached window of a single habit's recent logs (streak / totals on the detail screen).
export function useHabitLogs(habitId: string | undefined, days: number = 84) {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.id ?? '';

  const { data = {}, isPending } = useQuery({
    queryKey: [...qk.habitLogs(uid, habitId ?? ''), days],
    queryFn: () => fetchLogMap(uid, habitId!, days),
    enabled: !authLoading && !!user && !!habitId,
  });

  return { logs: data as Record<string, number>, loading: authLoading || (!!user && isPending) };
}

// One month of a single habit's logs, keyed per month (the detail mini calendar).
export function useHabitMonthLogs(habitId: string, year: number, month: number) {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.id ?? '';
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const { data = {} } = useQuery({
    queryKey: qk.monthLogs(uid, habitId, year, month),
    queryFn: async () => {
      const mm = String(month + 1).padStart(2, '0');
      const { data } = await supabase.from('habit_logs').select('date, value')
        .eq('habit_id', habitId).eq('user_id', uid)
        .gte('date', `${year}-${mm}-01`).lte('date', `${year}-${mm}-${daysInMonth}`);
      const map: Record<string, number> = {};
      (data ?? []).forEach(l => { map[l.date] = l.value; });
      return map;
    },
    enabled: !authLoading && !!user,
  });

  return data as Record<string, number>;
}

// One month of all habits' logs: date -> habit_id -> value (the Calendar screen).
export function useDayLogs(year: number, month: number) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id ?? '';
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const key = qk.dayLogs(uid, year, month);

  const { data = {} } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const mm = String(month + 1).padStart(2, '0');
      const { data } = await supabase.from('habit_logs').select('habit_id, date, value')
        .eq('user_id', uid)
        .gte('date', `${year}-${mm}-01`).lte('date', `${year}-${mm}-${daysInMonth}`);
      const map: Record<string, Record<string, number>> = {};
      (data ?? []).forEach(l => {
        if (!map[l.date]) map[l.date] = {};
        map[l.date][l.habit_id] = l.value;
      });
      return map;
    },
    enabled: !authLoading && !!user,
  });

  const setDayLog = (dateStr: string, habitId: string, value: number) => {
    queryClient.setQueryData<Record<string, Record<string, number>>>(key, prev => {
      const next = { ...(prev ?? {}) };
      const day = { ...(next[dateStr] ?? {}) };
      if (value === 0) delete day[habitId];
      else day[habitId] = value;
      next[dateStr] = day;
      return next;
    });
  };

  return { dayLogs: data as Record<string, Record<string, number>>, setDayLog };
}
