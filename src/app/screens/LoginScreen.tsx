import { Link, useNavigate } from 'react-router';
import { Target } from 'lucide-react';
import { useState } from 'react';

export function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login - go to home
    navigate('/home');
  };
  
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
      <div className="w-full space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center">
            <Target className="w-8 h-8 text-black" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-medium text-white">Habit</h1>
            <p className="text-muted-foreground mt-1">Build better habits, one day at a time</p>
          </div>
        </div>
        
        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm text-muted-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-4 bg-input rounded-xl text-white placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm text-muted-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-4 bg-input rounded-xl text-white placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors"
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-4 bg-white text-black rounded-xl font-medium hover:bg-gray-100 transition-colors"
          >
            Log In
          </button>
        </form>
        
        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        
        {/* Google Sign In */}
        <button className="w-full py-4 bg-secondary text-white rounded-xl font-medium border border-border hover:bg-accent transition-colors">
          Continue with Google
        </button>
        
        {/* Create Account Link */}
        <div className="text-center">
          <span className="text-muted-foreground text-sm">Don't have an account? </span>
          <Link to="/signup" className="text-white text-sm hover:underline">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
