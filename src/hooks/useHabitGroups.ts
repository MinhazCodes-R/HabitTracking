import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/AuthContext';

export interface HabitGroup {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  position: number;
}

export function useHabitGroups() {
  const { user, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState<HabitGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('habit_groups')
      .select('id, name, icon, color, position')
      .eq('user_id', user.id)
      .order('position', { ascending: true });

    setGroups((data ?? []) as HabitGroup[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    fetchGroups();
  }, [authLoading, fetchGroups]);

  const createGroup = async (name: string, icon?: string, color?: string): Promise<HabitGroup | null> => {
    if (!user || !name.trim()) return null;
    const nextPosition = groups.length;
    const { data } = await supabase
      .from('habit_groups')
      .insert({ user_id: user.id, name: name.trim(), icon: icon ?? null, color: color ?? null, position: nextPosition })
      .select('id, name, icon, color, position')
      .single();
    if (!data) return null;
    const group = data as HabitGroup;
    setGroups(prev => [...prev, group]);
    return group;
  };

  const renameGroup = async (groupId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: trimmed } : g));
    await supabase.from('habit_groups').update({ name: trimmed }).eq('id', groupId);
  };

  const reorderGroups = (reordered: HabitGroup[]) => {
    setGroups(reordered);
    reordered.forEach((g, i) => {
      supabase.from('habit_groups').update({ position: i }).eq('id', g.id).then();
    });
  };

  // Two modes: 'reassign' moves habits to Ungrouped via ON DELETE SET NULL; 'cascade' archives them.
  const deleteGroup = async (groupId: string, mode: 'reassign' | 'cascade' = 'reassign') => {
    if (!user) return;
    if (mode === 'cascade') {
      await supabase.from('habits').update({ archived: true }).eq('group_id', groupId).eq('user_id', user.id);
    }
    await supabase.from('habit_groups').delete().eq('id', groupId);
    setGroups(prev => prev.filter(g => g.id !== groupId));
  };

  return { groups, loading, createGroup, renameGroup, reorderGroups, deleteGroup, refetch: fetchGroups };
}
