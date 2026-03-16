import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Target } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useHabits } from '../context/HabitContext';

interface GoogleJwtPayload {
  sub: string;
  name: string;
  email: string;
  picture?: string;
}

export function LoginScreen() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useHabits();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Please enter an email address.'); return; }
    login(email, email.split('@')[0]);
    navigate('/home');
  };

  const handleGoogleSuccess = (response: CredentialResponse) => {
    try {
      const decoded = jwtDecode<GoogleJwtPayload>(response.credential!);
      loginWithGoogle({
        id: decoded.sub,
        name: decoded.name,
        email: decoded.email,
        avatar: decoded.picture,
      });
      navigate('/home');
    } catch {
      setError('Google sign-in failed. Try signing in with email.');
    }
  };

  const hasGoogleClientId = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--background)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      maxWidth: '480px',
      margin: '0 auto',
      width: '100%',
    }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '18px',
            background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.4)',
          }}>
            <Target size={32} color="#000" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
              Habit
            </h1>
            <p style={{ color: 'var(--muted-foreground)', margin: '4px 0 0', fontSize: '0.9rem' }}>
              Build better habits, one day at a time
            </p>
          </div>
        </div>

        {/* Email form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#fca5a5',
              fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'var(--input)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'var(--input)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '14px',
              background: '#fff',
              color: '#000',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              border: 'none',
              transition: 'opacity 0.15s',
            }}
          >
            Log In
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* Google Sign In */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          {hasGoogleClientId ? (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in failed. Try again.')}
              theme="filled_black"
              shape="rectangular"
              size="large"
              width="100%"
              text="continue_with"
            />
          ) : (
            <div style={{
              width: '100%',
              padding: '14px',
              background: 'var(--secondary)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              color: 'var(--muted-foreground)',
              fontSize: '0.875rem',
              textAlign: 'center',
              lineHeight: '1.4',
            }}>
              Google Sign-In requires a Client ID.<br />
              <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                Set <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: '3px' }}>VITE_GOOGLE_CLIENT_ID</code> in your <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: '3px' }}>.env</code> file.
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
