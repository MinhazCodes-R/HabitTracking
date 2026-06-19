import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/AuthContext';

export interface JournalEntry {
  id: string;
  body: string;
  created_at: string;
}

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
      .select('id, body, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);
    setEntries((data ?? []) as JournalEntry[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    fetchEntries();
  }, [authLoading, fetchEntries]);

  const createEntry = async (body: string): Promise<JournalEntry | null> => {
    const trimmed = body.trim();
    if (!user || !trimmed) return null;
    const { data } = await supabase
      .from('journal_entries')
      .insert({ user_id: user.id, body: trimmed })
      .select('id, body, created_at')
      .single();
    if (!data) return null;
    const entry = data as JournalEntry;
    setEntries(prev => [entry, ...prev]);
    return entry;
  };

  const deleteEntry = async (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    await supabase.from('journal_entries').delete().eq('id', id);
  };

  return { entries, loading, createEntry, deleteEntry, refetch: fetchEntries };
}
