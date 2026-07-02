import { useParams, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { PostCard } from '../components/PostCard';
import { PostComposer } from '../components/PostComposer';
import { useThread, type Visibility } from '@/hooks/useJournal';

export function PostThreadScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { root, replies, loading, notFound, createReply, deletePost } = useThread(id);

  const handleReply = async (body: string, visibility: Visibility) => {
    await createReply(body, visibility);
  };

  return (
    <div className="min-h-screen bg-background pb-24 max-w-md mx-auto">
      <div className="sticky top-0 bg-background/95 backdrop-blur z-10 px-6 pt-12 pb-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl font-medium text-white mt-3">Thread</h1>
      </div>

      <div className="px-6 py-6 space-y-3">
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading…</p>
        ) : notFound || !root ? (
          <p className="text-muted-foreground text-center py-8 text-sm">Post not found or you can't see it.</p>
        ) : (
          <>
            <PostCard
              post={root}
              clickable={false}
              onDelete={() => { deletePost(root.id); navigate(-1); }}
            />

            <div className="pt-4">
              <PostComposer
                onSubmit={handleReply}
                placeholder="Post your reply"
                defaultVisibility={root.visibility}
                submitLabel="Reply"
                autoFocus
              />
            </div>

            {replies.length > 0 && (
              <div className="pt-6 space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</p>
                {replies.map(r => (
                  <PostCard
                    key={r.id}
                    post={r}
                    onDelete={() => deletePost(r.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
