import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/AuthContext';
import { qk } from '@/lib/queryKeys';

export interface HabitGroup {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  position: number;
}

export function useHabitGroups() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id ?? '';
  const groupsKey = qk.groups(uid);

  const { data: groups = [], isPending, refetch } = useQuery({
    queryKey: groupsKey,
    queryFn: async () => {
      const { data } = await supabase
        .from('habit_groups')
        .select('id, name, icon, color, position')
        .eq('user_id', uid)
        .order('position', { ascending: true });
      return (data ?? []) as HabitGroup[];
    },
    enabled: !authLoading && !!user,
  });

  const loading = authLoading || (!!user && isPending);

  const setCached = (updater: (prev: HabitGroup[]) => HabitGroup[]) => {
    queryClient.setQueryData<HabitGroup[]>(groupsKey, prev => updater(prev ?? []));
  };

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
    setCached(prev => [...prev, group]);
    return group;
  };

  const renameGroup = async (groupId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCached(prev => prev.map(g => g.id === groupId ? { ...g, name: trimmed } : g));
    await supabase.from('habit_groups').update({ name: trimmed }).eq('id', groupId);
  };

  const reorderGroups = (reordered: HabitGroup[]) => {
    setCached(() => reordered);
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
    setCached(prev => prev.filter(g => g.id !== groupId));
    // Habits referencing the group changed server-side (group_id nulled or archived),
    // so refresh everything for this user except the groups list we just fixed up.
    queryClient.invalidateQueries({
      queryKey: qk.user(uid),
      predicate: q => q.queryKey[2] !== 'groups',
    });
  };

  return { groups, loading, createGroup, renameGroup, reorderGroups, deleteGroup, refetch };
}
