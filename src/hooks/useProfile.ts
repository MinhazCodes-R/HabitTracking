import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/AuthContext';
import { qk } from '@/lib/queryKeys';

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const PROFILE_FIELDS = 'id, username, display_name, avatar_url, bio';

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id ?? '';
  const profileKey = qk.profile(uid);

  const { data: profile = null, isPending, refetch } = useQuery({
    queryKey: profileKey,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select(PROFILE_FIELDS)
        .eq('id', uid)
        .maybeSingle();
      return (data ?? null) as Profile | null;
    },
    enabled: !authLoading && !!user,
  });

  const loading = authLoading || (!!user && isPending);

  const updateProfile = async (patch: Partial<Omit<Profile, 'id'>>): Promise<string | null> => {
    if (!user) return 'Not signed in';
    const cleaned: Record<string, unknown> = {};
    if (patch.username !== undefined) {
      const u = (patch.username ?? '').trim().toLowerCase();
      if (u && !/^[a-z0-9_]{3,20}$/.test(u)) {
        return 'Username must be 3-20 chars, letters/numbers/underscore only';
      }
      cleaned.username = u || null;
    }
    if (patch.display_name !== undefined) cleaned.display_name = patch.display_name?.trim() || null;
    if (patch.avatar_url !== undefined) cleaned.avatar_url = patch.avatar_url?.trim() || null;
    if (patch.bio !== undefined) cleaned.bio = patch.bio?.trim() || null;
    cleaned.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...cleaned })
      .select(PROFILE_FIELDS)
      .single();

    if (error) {
      if (error.code === '23505') return 'That username is taken';
      return error.message;
    }
    queryClient.setQueryData(profileKey, data as Profile);
    return null;
  };

  return { profile, loading, updateProfile, refetch };
}

// Look up profiles by id, in bulk. Caller supplies a set of user_ids (e.g. from a feed query)
// and gets back a Map keyed by id.
export async function fetchProfilesByIds(ids: string[]): Promise<Map<string, Profile>> {
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) return new Map();
  const { data } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .in('id', unique);
  const map = new Map<string, Profile>();
  for (const row of (data ?? []) as Profile[]) {
    map.set(row.id, row);
  }
  return map;
}

export async function fetchProfileByUsername(username: string): Promise<Profile | null> {
  const u = username.trim().toLowerCase();
  if (!u) return null;
  const { data } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .ilike('username', u)
    .maybeSingle();
  return (data ?? null) as Profile | null;
}
