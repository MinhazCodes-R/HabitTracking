import { RouterProvider } from 'react-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { router } from './routes';
import { AuthProvider } from './AuthContext';
import { Analytics } from '@vercel/analytics/react';
import { queryClient, persistOptions } from '@/lib/queryClient';

export default function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Analytics />
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}
