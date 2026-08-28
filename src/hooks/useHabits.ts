import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/AuthContext';
import { toLocalDateStr } from '@/lib/date';
import { isAutoDone, withAutoDays } from '@/lib/habitState';

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
  // "Habit" state: internalised, auto-counted as Done from habit_since onwards.
  is_habit: boolean;
  habit_since: string | null;
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
      group_id: h.group_id ?? null,
      increments: h.increments ?? [10, 25, 50],
      icon: h.icon ?? 'circle',
      color: h.color ?? '#ffffff',
      position: h.position ?? 0,
      archived: h.archived ?? false,
      is_habit: h.is_habit ?? false,
      habit_since: h.habit_since ?? null,
      current: isAutoDone({ goal: h.goal, is_habit: h.is_habit ?? false, habit_since: h.habit_since ?? null }, today)
        ? h.goal
        : (logMap.get(h.id) ?? 0),
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

  // Enter/leave the "Habit" state. Entering stamps habit_since with today so past days keep
  // their real logs; leaving clears it and the habit goes back to manual tracking.
  const setHabitState = async (habitId: string, isHabit: boolean) => {
    const updates = { is_habit: isHabit, habit_since: isHabit ? today : null };
    setHabits(prev => prev.map(h => h.id === habitId
      ? { ...h, ...updates, current: isHabit ? h.goal : h.current }
      : h));
    await supabase.from('habits').update(updates).eq('id', habitId);
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
    // Habits in the "Habit" state are always Done — manual logging is a no-op.
    if (habits.find(h => h.id === habitId)?.is_habit) return;
    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, current: value } : h));
    supabase.from('habit_logs').upsert(
      { habit_id: habitId, user_id: user.id, date: today, value },
      { onConflict: 'habit_id,date' }
    ).then();
  };

  const logProgressForDate = async (habitId: string, value: number, date: string) => {
    if (!user) return;
    const target = habits.find(h => h.id === habitId);
    if (target && isAutoDone(target, date)) return;
    if (date === today) {
      setHabits(prev => prev.map(h => h.id === habitId ? { ...h, current: value } : h));
    }
    await supabase.from('habit_logs').upsert(
      { habit_id: habitId, user_id: user.id, date, value },
      { onConflict: 'habit_id,date' }
    );
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

    const habit = habits.find(h => h.id === habitId);
    if (!habit) return map;
    return withAutoDays(habit, map, toLocalDateStr(from), toLocalDateStr(new Date()));
  };

  const archiveHabit = async (habitId: string) => {
    setHabits(prev => prev.filter(h => h.id !== habitId));
    await supabase.from('habits').update({ archived: true }).eq('id', habitId);
  };

  // Bulk "check all" for a group. Idempotent: habits already at/past goal are skipped.
  // Binary habits go to value=goal (1); quantitative habits jump to their goal value.
  const logProgressForGroup = async (groupId: string) => {
    if (!user) return;
    const targets = habits.filter(h => h.group_id === groupId && !h.is_habit && h.current < h.goal);
    if (targets.length === 0) return;

    setHabits(prev => prev.map(h => h.group_id === groupId && !h.is_habit && h.current < h.goal ? { ...h, current: h.goal } : h));

    const rows = targets.map(h => ({ habit_id: h.id, user_id: user.id, date: today, value: h.goal }));
    await supabase.from('habit_logs').upsert(rows, { onConflict: 'habit_id,date' });
  };

  return { habits, setHabits, loading, createHabit, updateHabit, setHabitState, reorderHabits, logProgress, logProgressForDate, logProgressForGroup, getHabitLogs, archiveHabit, refetch: fetchHabits };
}
