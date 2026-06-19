import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/AuthContext';
import { fetchProfilesByIds, type Profile } from '@/hooks/useProfile';

export type Visibility = 'private' | 'followers' | 'public';

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

// "Your Posts" — current user's top-level entries, reverse-chron.
export function useJournal() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('journal_entries')
      .select(POST_FIELDS)
      .eq('user_id', user.id)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(200);
    setEntries((data ?? []) as JournalEntry[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    fetchEntries();
  }, [authLoading, fetchEntries]);

  const createEntry = async (
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
      setEntries(prev => [entry, ...prev]);
    }
    return entry;
  };

  const deleteEntry = async (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    await supabase.from('journal_entries').delete().eq('id', id);
  };

  return { entries, loading, createEntry, deleteEntry, refetch: fetchEntries };
}

// "For You" feed — public top-level posts + posts from anyone the user follows
// (RLS already filters to what the user is allowed to see; here we just narrow further).
export function useFeed() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    setLoading(true);

    let followingIds: string[] = [];
    if (user) {
      const { data: followRows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      followingIds = (followRows ?? []).map(r => r.following_id as string);
    }

    // We want: top-level posts where visibility = public OR (the author is followed and visibility in (followers, public)) OR author = me.
    // RLS already enforces the legality of the read; we just have to filter what makes it into the feed.
    let query = supabase
      .from('journal_entries')
      .select(POST_FIELDS)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (user) {
      const authorScope = [user.id, ...followingIds];
      // Posts that are either public OR written by an author in scope (which RLS will further validate).
      query = query.or(`visibility.eq.public,user_id.in.(${authorScope.join(',')})`);
    } else {
      query = query.eq('visibility', 'public');
    }

    const { data } = await query;
    const hydrated = await hydratePosts((data ?? []) as JournalEntry[]);
    setPosts(hydrated);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    fetchFeed();
  }, [authLoading, fetchFeed]);

  return { posts, loading, refetch: fetchFeed };
}

// A single post + its direct replies. One level of nesting for MVP.
export function useThread(postId: string | undefined) {
  const [root, setRoot] = useState<PostWithAuthor | null>(null);
  const [replies, setReplies] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchThread = useCallback(async () => {
    if (!postId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);

    const { data: rootRow } = await supabase
      .from('journal_entries')
      .select(POST_FIELDS)
      .eq('id', postId)
      .maybeSingle();

    if (!rootRow) {
      setRoot(null);
      setReplies([]);
      setNotFound(true);
      setLoading(false);
      return;
    }

    const { data: replyRows } = await supabase
      .from('journal_entries')
      .select(POST_FIELDS)
      .eq('parent_id', postId)
      .order('created_at', { ascending: true })
      .limit(200);

    const [rootHydrated] = await hydratePosts([rootRow as JournalEntry]);
    const repliesHydrated = await hydratePosts((replyRows ?? []) as JournalEntry[]);

    setRoot(rootHydrated ?? null);
    setReplies(repliesHydrated);
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  const addReply = (reply: PostWithAuthor) => {
    setReplies(prev => [...prev, reply]);
    setRoot(prev => prev ? { ...prev, reply_count: prev.reply_count + 1 } : prev);
  };

  return { root, replies, loading, notFound, refetch: fetchThread, addReply };
}
