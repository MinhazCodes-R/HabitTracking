import { RouterProvider } from 'react-router';
import { router } from './routes';
import { HabitProvider } from './context/HabitContext';

export default function App() {
  return (
    <HabitProvider>
      <RouterProvider router={router} />
    </HabitProvider>
  );
}
