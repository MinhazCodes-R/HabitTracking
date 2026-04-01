import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/AuthContext';
import { toLocalDateStr } from '@/lib/date';

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

export function useHabits() {
  const { user, loading: authLoading } = useAuth();
  const [habits, setHabits] = useState<HabitWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const today = toLocalDateStr(new Date());

  const fetchHabits = useCallback(async () => {
    if (!user) {
      setHabits([]);
      setLoading(false);
      return;
    }

    const { data: habitsData } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('archived', false)
      .order('position', { ascending: true });

    if (!habitsData) { setLoading(false); return; }

    const { data: logsData } = await supabase
      .from('habit_logs')
      .select('habit_id, value')
      .eq('user_id', user.id)
      .eq('date', today);

    const logMap = new Map((logsData ?? []).map(l => [l.habit_id, l.value]));

    setHabits(habitsData.map(h => ({
      ...h,
      increments: h.increments ?? [10, 25, 50],
      icon: h.icon ?? 'circle',
      color: h.color ?? '#ffffff',
      position: h.position ?? 0,
      archived: h.archived ?? false,
      current: logMap.get(h.id) ?? 0,
    })));
    setLoading(false);
  }, [user?.id, today]);

  // Re-fetch when user changes or auth finishes loading
  useEffect(() => {
    if (authLoading) return;
    fetchHabits();
  }, [authLoading, fetchHabits]);

  const createHabit = async (habit: Omit<Habit, 'id' | 'archived'>) => {
    if (!user) return;
    await supabase.from('habits').insert({ ...habit, user_id: user.id, archived: false });
    await fetchHabits();
  };

  const updateHabit = async (habitId: string, updates: Partial<Omit<Habit, 'id'>>) => {
    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, ...updates } : h));
    supabase.from('habits').update(updates).eq('id', habitId).then();
  };

  const reorderHabits = (reordered: HabitWithProgress[]) => {
    setHabits(reordered);
    reordered.forEach((h, i) => {
      supabase.from('habits').update({ position: i }).eq('id', h.id).then();
    });
  };

  const logProgress = async (habitId: string, value: number) => {
    if (!user) return;
    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, current: value } : h));
    supabase.from('habit_logs').upsert(
      { habit_id: habitId, user_id: user.id, date: today, value },
      { onConflict: 'habit_id,date' }
    ).then();
  };

  const getHabitLogs = async (habitId: string, days: number = 84) => {
    if (!user) return {};
    const from = new Date();
    from.setDate(from.getDate() - days);

    const { data } = await supabase
      .from('habit_logs')
      .select('date, value')
      .eq('habit_id', habitId)
      .eq('user_id', user.id)
      .gte('date', toLocalDateStr(from));

    const map: Record<string, number> = {};
    (data ?? []).forEach(l => { map[l.date] = l.value; });
    return map;
  };

  const archiveHabit = async (habitId: string) => {
    setHabits(prev => prev.filter(h => h.id !== habitId));
    await supabase.from('habits').update({ archived: true }).eq('id', habitId);
  };

  return { habits, setHabits, loading, createHabit, updateHabit, reorderHabits, logProgress, getHabitLogs, archiveHabit, refetch: fetchHabits };
}
