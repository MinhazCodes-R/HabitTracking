import { RouterProvider } from 'react-router';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { router } from './routes';
import { HabitProvider } from './context/HabitContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <HabitProvider>
        <RouterProvider router={router} />
      </HabitProvider>
    </GoogleOAuthProvider>
  );
}
