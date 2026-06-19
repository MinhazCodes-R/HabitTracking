import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { useJournal, type JournalEntry } from '@/hooks/useJournal';

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function EntryRow({ entry, onDelete }: { entry: JournalEntry; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <p className="text-white whitespace-pre-wrap break-words">{entry.body}</p>
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-muted-foreground">{relativeTime(entry.created_at)}</span>
        {confirming ? (
          <div className="flex items-center gap-2">
            <button onClick={onDelete} className="text-xs text-destructive hover:underline">Delete</button>
            <button onClick={() => setConfirming(false)} className="text-xs text-muted-foreground hover:text-white">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)}
            className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

export function JournalScreen() {
  const { entries, loading, createEntry, deleteEntry } = useJournal();
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || posting) return;
    setPosting(true);
    await createEntry(draft);
    setDraft('');
    setPosting(false);
  };

  const remaining = 500 - draft.length;

  return (
    <div className="min-h-screen bg-background pb-24 max-w-md mx-auto">
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-medium text-white mb-1">Journal</h1>
        <p className="text-muted-foreground">A quick note on what you're doing.</p>
      </div>

      <form onSubmit={submit} className="px-6 mb-6">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 500))}
          placeholder="What's happening?"
          rows={3}
          className="w-full px-4 py-3 bg-input rounded-xl text-white placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs ${remaining < 50 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {remaining} left
          </span>
          <button type="submit" disabled={!draft.trim() || posting}
            className="px-5 py-2 bg-white text-black rounded-full font-medium disabled:opacity-40 hover:bg-gray-100 transition-colors text-sm">
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>

      <div className="px-6 space-y-3">
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm">No entries yet. Write your first above.</p>
        ) : (
          entries.map(entry => (
            <EntryRow key={entry.id} entry={entry} onDelete={() => deleteEntry(entry.id)} />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
