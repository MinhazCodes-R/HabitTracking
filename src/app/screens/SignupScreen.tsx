import { Link, useNavigate } from 'react-router';
import { useState } from 'react';
import { useAuth } from '../AuthContext';

export function SignupScreen() {
  const navigate = useNavigate();
  const { signup, loginWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = await signup(name, email, password);
    if (err) setError(err);
    else navigate('/home');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
      <div className="w-full space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="text-center">
            <h1 className="text-3xl font-medium text-white">MiniHabits</h1>
            <p className="text-muted-foreground mt-1">Start tracking your habits today</p>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && <p className="text-destructive text-sm text-center">{error}</p>}

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm text-muted-foreground">Name</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required
              className="w-full px-4 py-4 bg-input rounded-xl text-white placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors" />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm text-muted-foreground">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
              className="w-full px-4 py-4 bg-input rounded-xl text-white placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors" />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm text-muted-foreground">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
              className="w-full px-4 py-4 bg-input rounded-xl text-white placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors" />
          </div>

          <button type="submit" className="w-full py-4 bg-white text-black rounded-xl font-medium hover:bg-gray-100 transition-colors">
            Create Account
          </button>
        </form>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button onClick={loginWithGoogle} className="w-full py-4 bg-secondary text-white rounded-xl font-medium border border-border hover:bg-accent transition-colors">
          Continue with Google
        </button>

        <div className="text-center">
          <span className="text-muted-foreground text-sm">Already have an account? </span>
          <Link to="/" className="text-white text-sm hover:underline">Log In</Link>
        </div>
      </div>
    </div>
  );
}
