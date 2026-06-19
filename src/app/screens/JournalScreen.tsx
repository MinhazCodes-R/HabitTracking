import { useState } from 'react';
import { BottomNav } from '../components/BottomNav';
import { PostCard } from '../components/PostCard';
import { PostComposer } from '../components/PostComposer';
import { useJournal, useFeed, type PostWithAuthor, type Visibility } from '@/hooks/useJournal';
import { useProfile } from '@/hooks/useProfile';
import { fetchProfilesByIds } from '@/hooks/useProfile';
import { useAuth } from '@/app/AuthContext';

type Tab = 'feed' | 'yours';

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
        <p className="text-muted-foreground text-xs">Friends will follow you with this. Letters, numbers, underscore. 3-20 chars.</p>
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

function FeedList({ posts, loading, onDelete, empty }: {
  posts: PostWithAuthor[];
  loading: boolean;
  onDelete: (id: string) => void;
  empty: string;
}) {
  if (loading) {
    return <p className="text-muted-foreground text-center py-8">Loading…</p>;
  }
  if (posts.length === 0) {
    return <p className="text-muted-foreground text-center py-8 text-sm">{empty}</p>;
  }
  return (
    <div className="space-y-3">
      {posts.map(p => (
        <PostCard key={p.id} post={p} onDelete={() => onDelete(p.id)} />
      ))}
    </div>
  );
}

export function JournalScreen() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { entries, loading: yoursLoading, createEntry, deleteEntry, refetch: refetchYours } = useJournal();
  const { posts: feedPosts, loading: feedLoading, refetch: refetchFeed } = useFeed();
  const [tab, setTab] = useState<Tab>('feed');

  const handlePost = async (body: string, visibility: Visibility) => {
    const entry = await createEntry(body, { visibility });
    if (entry && visibility !== 'private') {
      refetchFeed();
    }
  };

  const handleDelete = async (id: string) => {
    await deleteEntry(id);
    refetchFeed();
    refetchYours();
  };

  // Hydrate "yours" tab entries with author info for unified display.
  // Cheap: the author is always you.
  const yoursWithAuthor: PostWithAuthor[] = entries.map(e => ({
    ...e,
    author: profile,
    reply_count: 0,
  }));

  return (
    <div className="min-h-screen bg-background pb-24 max-w-md mx-auto">
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-medium text-white mb-1">Journal</h1>
        <p className="text-muted-foreground">Post a thought. Read what your circle's up to.</p>
      </div>

      {!profileLoading && profile && !profile.username && (
        <div className="px-6 mb-6">
          <YouHaveNoUsernameYet onSet={(u) => updateProfile({ username: u })} />
        </div>
      )}

      <div className="mb-6">
        <PostComposer onSubmit={handlePost} defaultVisibility="public" />
      </div>

      <div className="px-6 mb-4">
        <div className="flex gap-1 p-1 bg-card border border-border rounded-full">
          <button
            onClick={() => setTab('feed')}
            className={`flex-1 py-1.5 text-sm rounded-full transition-colors ${tab === 'feed' ? 'bg-white text-black' : 'text-muted-foreground'}`}
          >
            For You
          </button>
          <button
            onClick={() => setTab('yours')}
            className={`flex-1 py-1.5 text-sm rounded-full transition-colors ${tab === 'yours' ? 'bg-white text-black' : 'text-muted-foreground'}`}
          >
            Your Posts
          </button>
        </div>
      </div>

      <div className="px-6">
        {tab === 'feed' ? (
          <FeedList
            posts={feedPosts}
            loading={feedLoading}
            onDelete={handleDelete}
            empty={user ? "No posts yet. Follow people or post publicly to fill this in." : "Sign in to see posts."}
          />
        ) : (
          <FeedList
            posts={yoursWithAuthor}
            loading={yoursLoading}
            onDelete={handleDelete}
            empty="No entries yet. Write your first above."
          />
        )}
      </div>

      <BottomNav />
    </div>
  );
}
