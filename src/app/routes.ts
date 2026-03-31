import { createBrowserRouter } from 'react-router';
import { LoginScreen } from './screens/LoginScreen';
import { SignupScreen } from './screens/SignupScreen';
import { HomeScreen } from './screens/HomeScreen';
import { CreateHabitScreen } from './screens/CreateHabitScreen';
import { HabitDetailScreen } from './screens/HabitDetailScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { ProfileScreen } from './screens/ProfileScreen';

export const router = createBrowserRouter([
  { path: '/', Component: LoginScreen },
  { path: '/signup', Component: SignupScreen },
  { path: '/home', Component: HomeScreen },
  { path: '/create-habit', Component: CreateHabitScreen },
  { path: '/habit/:id', Component: HabitDetailScreen },
  { path: '/calendar', Component: CalendarScreen },
  { path: '/analytics', Component: AnalyticsScreen },
  { path: '/profile', Component: ProfileScreen },
]);
