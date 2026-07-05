import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/AuthContext';
import { fetchProfilesByIds, type Profile } from '@/hooks/useProfile';
import { qk, ANON } from '@/lib/queryKeys';

export type Visibility = 'private' | 'public';

export interface JournalEntry {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  parent_id: string | null;
  visibility: Visibility;
}

export interface PostWithAuthor extends JournalEntry {
  author: Profile | null;
  reply_count: number;
}

interface Thread {
  root: PostWithAuthor | null;
  replies: PostWithAuthor[];
}

const POST_FIELDS = 'id, user_id, body, created_at, parent_id, visibility';

async function hydratePosts(rows: JournalEntry[]): Promise<PostWithAuthor[]> {
  if (rows.length === 0) return [];
  const authors = await fetchProfilesByIds(rows.map(r => r.user_id));

  const ids = rows.map(r => r.id);
  const { data: replyRows } = await supabase
    .from('journal_entries')
    .select('parent_id')
    .in('parent_id', ids);

  const counts = new Map<string, number>();
  for (const r of (replyRows ?? []) as { parent_id: string | null }[]) {
    if (!r.parent_id) continue;
    counts.set(r.parent_id, (counts.get(r.parent_id) ?? 0) + 1);
  }

  return rows.map(r => ({
    ...r,
    author: authors.get(r.user_id) ?? null,
    reply_count: counts.get(r.id) ?? 0,
  }));
}

// Single chronological feed: your own posts (any visibility) + everyone's
// public posts. Top-level only; replies live in the thread view.
export function useFeed() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id ?? ANON;
  const feedKey = qk.feed(uid);

  const { data: posts = [], isPending, refetch } = useQuery({
    queryKey: feedKey,
    queryFn: async () => {
      let query = supabase
        .from('journal_entries')
        .select(POST_FIELDS)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (user) {
        query = query.or(`visibility.eq.public,user_id.eq.${user.id}`);
      } else {
        query = query.eq('visibility', 'public');
      }

      const { data } = await query;
      return hydratePosts((data ?? []) as JournalEntry[]);
    },
    enabled: !authLoading,
  });

  const loading = authLoading || isPending;

  const createPost = async (
    body: string,
    opts: { visibility?: Visibility; parentId?: string | null } = {},
  ): Promise<JournalEntry | null> => {
    const trimmed = body.trim();
    if (!user || !trimmed) return null;
    const visibility = opts.visibility ?? 'private';
    const parent_id = opts.parentId ?? null;
    const { data } = await supabase
      .from('journal_entries')
      .insert({ user_id: user.id, body: trimmed, visibility, parent_id })
      .select(POST_FIELDS)
      .single();
    if (!data) return null;
    const entry = data as JournalEntry;
    if (!parent_id) {
      refetch();
    }
    return entry;
  };

  const deletePost = async (id: string) => {
    queryClient.setQueryData<PostWithAuthor[]>(feedKey, prev => (prev ?? []).filter(p => p.id !== id));
    await supabase.from('journal_entries').delete().eq('id', id);
  };

  return { posts, loading, createPost, deletePost, refetch };
}

// A single post + its direct replies. One level of nesting for MVP.
export function useThread(postId: string | undefined) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id ?? ANON;
  const threadKey = qk.thread(uid, postId ?? '');

  const { data, isPending, refetch } = useQuery({
    queryKey: threadKey,
    queryFn: async (): Promise<Thread> => {
      const { data: rootRow } = await supabase
        .from('journal_entries')
        .select(POST_FIELDS)
        .eq('id', postId!)
        .maybeSingle();

      if (!rootRow) return { root: null, replies: [] };

      const { data: replyRows } = await supabase
        .from('journal_entries')
        .select(POST_FIELDS)
        .eq('parent_id', postId!)
        .order('created_at', { ascending: true })
        .limit(200);

      const [rootHydrated] = await hydratePosts([rootRow as JournalEntry]);
      const repliesHydrated = await hydratePosts((replyRows ?? []) as JournalEntry[]);
      return { root: rootHydrated ?? null, replies: repliesHydrated };
    },
    enabled: !authLoading && !!postId,
  });

  const loading = authLoading || isPending;
  const root = data?.root ?? null;
  const replies = data?.replies ?? [];
  const notFound = !loading && !!data && data.root === null;

  const setCached = (updater: (prev: Thread) => Thread) => {
    queryClient.setQueryData<Thread>(threadKey, prev => updater(prev ?? { root: null, replies: [] }));
  };

  const createReply = async (body: string, visibility: Visibility): Promise<void> => {
    if (!postId || !user) return;
    const trimmed = body.trim();
    if (!trimmed) return;
    const { data } = await supabase
      .from('journal_entries')
      .insert({ user_id: user.id, body: trimmed, visibility, parent_id: postId })
      .select(POST_FIELDS)
      .single();
    if (!data) return;
    const authors = await fetchProfilesByIds([user.id]);
    const reply: PostWithAuthor = {
      ...(data as JournalEntry),
      author: authors.get(user.id) ?? null,
      reply_count: 0,
    };
    setCached(prev => ({
      root: prev.root ? { ...prev.root, reply_count: prev.root.reply_count + 1 } : prev.root,
      replies: [...prev.replies, reply],
    }));
    // Reply counts shown on the feed are now stale.
    queryClient.invalidateQueries({ queryKey: qk.feed(uid) });
  };

  const deletePost = async (id: string) => {
    setCached(prev => ({ ...prev, replies: prev.replies.filter(r => r.id !== id) }));
    await supabase.from('journal_entries').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: qk.feed(uid) });
  };

  return { root, replies, loading, notFound, refetch, createReply, deletePost };
}
