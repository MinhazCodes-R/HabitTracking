import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/AuthContext';

export function useFollows() {
  const { user, loading: authLoading } = useAuth();
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchFollowing = useCallback(async () => {
    if (!user) {
      setFollowingIds(new Set());
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);
    setFollowingIds(new Set((data ?? []).map(r => r.following_id as string)));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    fetchFollowing();
  }, [authLoading, fetchFollowing]);

  const follow = async (targetId: string) => {
    if (!user || targetId === user.id) return;
    setFollowingIds(prev => {
      const next = new Set(prev);
      next.add(targetId);
      return next;
    });
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: targetId });
    if (error) {
      setFollowingIds(prev => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  };

  const unfollow = async (targetId: string) => {
    if (!user) return;
    setFollowingIds(prev => {
      const next = new Set(prev);
      next.delete(targetId);
      return next;
    });
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetId);
  };

  const isFollowing = (targetId: string) => followingIds.has(targetId);

  return { followingIds, isFollowing, follow, unfollow, loading, refetch: fetchFollowing };
}

export async function fetchFollowerCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('follows')
    .select('follower_id', { count: 'exact', head: true })
    .eq('following_id', userId);
  return count ?? 0;
}

export async function fetchFollowingCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('follows')
    .select('following_id', { count: 'exact', head: true })
    .eq('follower_id', userId);
  return count ?? 0;
}
