import { useNavigate } from 'react-router';
import { MessageCircle, Globe, Lock, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/app/AuthContext';
import type { PostWithAuthor, Visibility } from '@/hooks/useJournal';

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function VisibilityIcon({ visibility }: { visibility: Visibility }) {
  const cls = 'w-3 h-3 text-muted-foreground';
  if (visibility === 'public') return <Globe className={cls} />;
  return <Lock className={cls} />;
}

function Avatar({ author }: { author: PostWithAuthor['author'] }) {
  const initial = (author?.display_name || author?.username || '?').charAt(0).toUpperCase();
  if (author?.avatar_url) {
    return <img src={author.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />;
  }
  return (
    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-white text-sm">
      {initial}
    </div>
  );
}

export function PostCard({
  post,
  onDelete,
  clickable = true,
}: {
  post: PostWithAuthor;
  onDelete?: () => void;
  clickable?: boolean;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const isOwn = user?.id === post.user_id;

  const handleClick = (e: React.MouseEvent) => {
    if (!clickable) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a')) return;
    navigate(`/post/${post.id}`);
  };

  const displayName = post.author?.display_name || post.author?.username || 'someone';
  const handle = post.author?.username ? `@${post.author.username}` : null;

  return (
    <div
      onClick={handleClick}
      className={`bg-card border border-border rounded-2xl p-4 ${clickable ? 'cursor-pointer hover:border-white/30 transition-colors' : ''}`}
    >
      <div className="flex gap-3">
        <Avatar author={post.author} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white text-sm font-medium truncate">{displayName}</span>
            {handle && <span className="text-muted-foreground text-xs truncate">{handle}</span>}
            <span className="text-muted-foreground text-xs">·</span>
            <span className="text-muted-foreground text-xs">{relativeTime(post.created_at)}</span>
            <VisibilityIcon visibility={post.visibility} />
          </div>
          <p className="text-white whitespace-pre-wrap break-words mt-1 text-sm">{post.body}</p>
          <div className="flex items-center justify-between mt-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.id}`); }}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-white transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs">{post.reply_count > 0 ? post.reply_count : 'Reply'}</span>
            </button>
            {isOwn && onDelete && (
              confirming ? (
                <div className="flex items-center gap-2">
                  <button onClick={onDelete} className="text-xs text-destructive hover:underline">Delete</button>
                  <button onClick={() => setConfirming(false)} className="text-xs text-muted-foreground hover:text-white">Cancel</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
