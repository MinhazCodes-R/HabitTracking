import { useState } from 'react';
import { BottomNav } from '../components/BottomNav';
import { PostCard } from '../components/PostCard';
import { PostComposer } from '../components/PostComposer';
import { useFeed, type Visibility } from '@/hooks/useJournal';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/app/AuthContext';

function YouHaveNoUsernameYet({ onSet }: { onSet: (u: string) => Promise<string | null> }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const err = await onSet(username);
    if (err) setError(err);
    setSaving(false);
  };

  return (
    <form onSubmit={save} className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div>
        <p className="text-white text-sm font-medium">Pick a handle</p>
        <p className="text-muted-foreground text-xs">Other people will see this on your public posts. Letters, numbers, underscore. 3-20 chars.</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">@</span>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="yourhandle"
          className="flex-1 px-3 py-2 bg-input rounded-lg text-white placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors text-sm"
        />
        <button
          type="submit"
          disabled={!username.trim() || saving}
          className="px-4 py-2 bg-white text-black rounded-full text-sm font-medium disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}

export function JournalScreen() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { posts, loading, createPost, deletePost } = useFeed();

  const handlePost = async (body: string, visibility: Visibility) => {
    await createPost(body, { visibility });
  };

  return (
    <div className="min-h-screen bg-background pb-24 max-w-md mx-auto">
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-medium text-white mb-1">Journal</h1>
        <p className="text-muted-foreground">Post privately for yourself, or publicly for everyone.</p>
      </div>

      {!profileLoading && profile && !profile.username && (
        <div className="px-6 mb-6">
          <YouHaveNoUsernameYet onSet={(u) => updateProfile({ username: u })} />
        </div>
      )}

      <div className="mb-6">
        <PostComposer onSubmit={handlePost} defaultVisibility="public" />
      </div>

      <div className="px-6">
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading…</p>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm">
            {user ? 'No posts yet. Write the first one above.' : 'Sign in to see posts.'}
          </p>
        ) : (
          <div className="space-y-3">
            {posts.map(p => (
              <PostCard key={p.id} post={p} onDelete={() => deletePost(p.id)} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
