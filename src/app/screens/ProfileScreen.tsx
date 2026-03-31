import { useNavigate } from 'react-router';
import { BottomNav } from '../components/BottomNav';
import { User, Bell, Moon, LogOut, ChevronRight, MessageSquare, Bug, Lightbulb, Github, Linkedin, Globe } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '@/lib/supabase';

export function ProfileScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feedback' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSubmitFeedback = async () => {
    if (!user || !feedbackText.trim()) return;
    await supabase.from('feedback').insert({
      user_id: user.id,
      type: feedbackType,
      message: feedbackText.trim(),
    });
    setFeedbackSent(true);
    setFeedbackText('');
    setTimeout(() => { setFeedbackSent(false); setFeedbackType(null); }, 2000);
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || '';

  return (
    <div className="min-h-screen bg-background pb-24 max-w-md mx-auto">
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-medium text-white mb-1">Profile</h1>
        <p className="text-muted-foreground">Manage your account</p>
      </div>

      <div className="px-6 mb-6">
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-4">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <User className="w-8 h-8 text-black" />
              </div>
            )}
            <div>
              <h2 className="text-white font-medium text-xl">{displayName}</h2>
              <p className="text-muted-foreground">{displayEmail}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-4">
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="text-white">Notifications</span>
            </div>
            <button onClick={() => setNotifications(!notifications)}
              className={`relative w-12 h-7 rounded-full transition-colors ${notifications ? 'bg-white' : 'bg-secondary'}`}>
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-black transition-transform ${notifications ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-muted-foreground" />
              <span className="text-white">Dark Mode</span>
            </div>
            <button onClick={() => setDarkMode(!darkMode)}
              className={`relative w-12 h-7 rounded-full transition-colors ${darkMode ? 'bg-white' : 'bg-secondary'}`}>
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-black transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 hover:bg-secondary transition-colors">
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-destructive" />
              <span className="text-destructive">Log Out</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Early Access Banner & Feedback */}
        <div className="bg-card rounded-2xl p-6 border border-border mt-6">
          <div className="text-center mb-4">
            <span className="inline-block px-3 py-1 bg-secondary rounded-full text-xs text-muted-foreground font-medium mb-3">EARLY ACCESS</span>
            <p className="text-white font-medium">Thanks for being an early user!</p>
            <p className="text-muted-foreground text-sm mt-1">
              This app is in its very early releases. Things may break, features may change. Your patience and feedback mean the world — thank you for helping shape this product.
            </p>
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={() => { setFeedbackType('bug'); setFeedbackSent(false); }}
              className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                feedbackType === 'bug' ? 'bg-white text-black' : 'bg-secondary text-white hover:bg-accent'
              }`}>
              <Bug className="w-4 h-4" /> Report Bug
            </button>
            <button onClick={() => { setFeedbackType('feedback'); setFeedbackSent(false); }}
              className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                feedbackType === 'feedback' ? 'bg-white text-black' : 'bg-secondary text-white hover:bg-accent'
              }`}>
              <Lightbulb className="w-4 h-4" /> Feedback
            </button>
          </div>

          {feedbackType && !feedbackSent && (
            <div className="space-y-3">
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder={feedbackType === 'bug' ? 'Describe the bug...' : 'Share your ideas or feedback...'}
                rows={3}
                className="w-full px-4 py-3 bg-input rounded-xl text-white placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors resize-none"
              />
              <button onClick={handleSubmitFeedback} disabled={!feedbackText.trim()}
                className="w-full py-3 bg-white text-black rounded-xl font-medium hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Submit
              </button>
            </div>
          )}

          {feedbackSent && (
            <p className="text-green-400 text-sm text-center py-2">Thanks for your feedback! 🙏</p>
          )}

          {/* Developer Info */}
          <div className="border-t border-border mt-4 pt-4">
            <p className="text-muted-foreground text-sm text-center mb-3">Built by <span className="text-white">Minha$Codes</span></p>
            <div className="flex items-center justify-center gap-4">
              <a href="https://github.com/MinhazCodes-R" target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
                <Github className="w-5 h-5 text-white" />
              </a>
              <a href="https://www.linkedin.com/in/minhazur-rakin/" target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
                <Linkedin className="w-5 h-5 text-white" />
              </a>
              <a href="https://www.minhazcodes.com/" target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
                <Globe className="w-5 h-5 text-white" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 mt-8 text-center">
        <p className="text-muted-foreground text-sm">Version 0.1.0</p>
      </div>

      <BottomNav />
    </div>
  );
}
