import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/AuthContext';
import { toLocalDateStr } from '@/lib/date';
import { qk } from '@/lib/queryKeys';

export interface Habit {
  id: string;
  name: string;
  category: string;
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

type TodayLogs = Record<string, number>;

function normalizeHabit(h: Habit): Habit {
  return {
    ...h,
    increments: h.increments ?? [10, 25, 50],
    icon: h.icon ?? 'circle',
    color: h.color ?? '#ffffff',
    position: h.position ?? 0,
    archived: h.archived ?? false,
  };
}

async function fetchHabitsList(userId: string): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('archived', false)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizeHabit);
}

async function fetchTodayLogs(userId: string, date: string): Promise<TodayLogs> {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('habit_id, value')
    .eq('user_id', userId)
    .eq('date', date);
  if (error) throw error;
  const map: TodayLogs = {};
  (data ?? []).forEach((l: { habit_id: string; value: number }) => {
    map[l.habit_id] = l.value;
  });
  return map;
}

function useTodayKey(): string {
  const [today, setToday] = useState(() => toLocalDateStr(new Date()));
  useEffect(() => {
    const recompute = () => {
      const next = toLocalDateStr(new Date());
      setToday(prev => (prev === next ? prev : next));
    };
    document.addEventListener('visibilitychange', recompute);
    window.addEventListener('focus', recompute);
    return () => {
      document.removeEventListener('visibilitychange', recompute);
      window.removeEventListener('focus', recompute);
    };
  }, []);
  return today;
}

export function useHabits() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const today = useTodayKey();

  const habitsQ = useQuery({
    queryKey: userId ? qk.habits(userId) : ['user', 'anon', 'habits'],
    queryFn: () => fetchHabitsList(userId!),
    enabled: !!userId && !authLoading,
    staleTime: 5 * 60_000,
  });

  const logsQ = useQuery({
    queryKey: userId ? qk.logsDay(userId, today) : ['user', 'anon', 'logs', 'day', today],
    queryFn: () => fetchTodayLogs(userId!, today),
    enabled: !!userId && !authLoading,
    staleTime: 30_000,
  });

  const habits = useMemo<HabitWithProgress[]>(() => {
    const list = habitsQ.data ?? [];
    const logs = logsQ.data ?? {};
    return list.map(h => ({ ...h, current: logs[h.id] ?? 0 }));
  }, [habitsQ.data, logsQ.data]);

  const loading = authLoading || (!!userId && (habitsQ.isPending || logsQ.isPending));

  const createHabit = useCallback(
    async (habit: Omit<Habit, 'id' | 'archived'>) => {
      if (!userId) return;
      await supabase.from('habits').insert({ ...habit, user_id: userId, archived: false });
      await queryClient.invalidateQueries({ queryKey: qk.habits(userId) });
    },
    [userId, queryClient],
  );

  const updateHabit = useCallback(
    async (habitId: string, updates: Partial<Omit<Habit, 'id'>>) => {
      if (!userId) return;
      const key = qk.habits(userId);
      queryClient.setQueryData<Habit[]>(key, prev =>
        prev ? prev.map(h => (h.id === habitId ? { ...h, ...updates } : h)) : prev,
      );
      const { error } = await supabase.from('habits').update(updates).eq('id', habitId);
      if (error) queryClient.invalidateQueries({ queryKey: key });
    },
    [userId, queryClient],
  );

  const reorderHabits = useCallback(
    (reordered: HabitWithProgress[]) => {
      if (!userId) return;
      const stripped: Habit[] = reordered.map(({ current: _c, ...rest }) => rest);
      queryClient.setQueryData<Habit[]>(qk.habits(userId), stripped);
      Promise.all(
        reordered.map((h, i) =>
          supabase.from('habits').update({ position: i }).eq('id', h.id),
        ),
      ).then(() => queryClient.invalidateQueries({ queryKey: qk.habits(userId) }));
    },
    [userId, queryClient],
  );

  const logProgress = useCallback(
    async (habitId: string, value: number) => {
      if (!userId) return;
      const key = qk.logsDay(userId, today);
      queryClient.setQueryData<TodayLogs>(key, prev => ({ ...(prev ?? {}), [habitId]: value }));
      const { error } = await supabase.from('habit_logs').upsert(
        { habit_id: habitId, user_id: userId, date: today, value },
        { onConflict: 'habit_id,date' },
      );
      if (error) queryClient.invalidateQueries({ queryKey: key });
    },
    [userId, today, queryClient],
  );

  const getHabitLogs = useCallback(
    async (habitId: string, days: number = 84) => {
      if (!userId) return {};
      const from = new Date();
      from.setDate(from.getDate() - days);
      const { data } = await supabase
        .from('habit_logs')
        .select('date, value')
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .gte('date', toLocalDateStr(from));
      const map: Record<string, number> = {};
      (data ?? []).forEach((l: { date: string; value: number }) => {
        map[l.date] = l.value;
      });
      return map;
    },
    [userId],
  );

  const archiveHabit = useCallback(
    async (habitId: string) => {
      if (!userId) return;
      const key = qk.habits(userId);
      queryClient.setQueryData<Habit[]>(key, prev => (prev ? prev.filter(h => h.id !== habitId) : prev));
      const { error } = await supabase.from('habits').update({ archived: true }).eq('id', habitId);
      if (error) queryClient.invalidateQueries({ queryKey: key });
    },
    [userId, queryClient],
  );

  return {
    habits,
    loading,
    createHabit,
    updateHabit,
    reorderHabits,
    logProgress,
    getHabitLogs,
    archiveHabit,
  };
}
