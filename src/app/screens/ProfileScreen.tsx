import { useNavigate } from 'react-router';
import { BottomNav } from '../components/BottomNav';
import { User, Bell, Moon, LogOut, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../AuthContext';

export function ProfileScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/');
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
      </div>

      <div className="px-6 mt-8 text-center">
        <p className="text-muted-foreground text-sm">Version 1.0.0</p>
      </div>

      <BottomNav />
    </div>
  );
}
