import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './AuthContext';
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Analytics />
    </AuthProvider>
  );
}
