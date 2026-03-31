import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/AuthContext';

export interface Habit {
  id: string;
  name: string;
  category: string;
  metric_type: string;
  unit: string;
  goal: number;
  frequency: string;
}

export interface HabitWithProgress extends Habit {
  current: number;
}

export function useHabits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<HabitWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const fetchHabits = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: habitsData } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id);

    if (!habitsData) { setLoading(false); return; }

    const { data: logsData } = await supabase
      .from('habit_logs')
      .select('habit_id, value')
      .eq('user_id', user.id)
      .eq('date', today);

    const logMap = new Map((logsData ?? []).map(l => [l.habit_id, l.value]));

    setHabits(habitsData.map(h => ({
      ...h,
      current: logMap.get(h.id) ?? 0,
    })));
    setLoading(false);
  }, [user, today]);

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  const createHabit = async (habit: Omit<Habit, 'id'>) => {
    if (!user) return;
    await supabase.from('habits').insert({ ...habit, user_id: user.id });
    await fetchHabits();
  };

  const logProgress = async (habitId: string, value: number) => {
    if (!user) return;
    await supabase.from('habit_logs').upsert(
      { habit_id: habitId, user_id: user.id, date: today, value },
      { onConflict: 'habit_id,date' }
    );
    await fetchHabits();
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
      .gte('date', from.toISOString().split('T')[0]);

    const map: Record<string, number> = {};
    (data ?? []).forEach(l => { map[l.date] = l.value; });
    return map;
  };

  const deleteHabit = async (habitId: string) => {
    await supabase.from('habits').delete().eq('id', habitId);
    await fetchHabits();
  };

  return { habits, loading, createHabit, logProgress, getHabitLogs, deleteHabit, refetch: fetchHabits };
}
