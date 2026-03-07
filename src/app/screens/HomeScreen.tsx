import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { HabitCard } from '../components/HabitCard';

// Mock data
const habits = [
  {
    id: '1',
    name: 'Drink Water',
    category: 'health',
    current: 1200,
    goal: 2000,
    unit: 'ml',
  },
  {
    id: '2',
    name: 'Study',
    category: 'study',
    current: 45,
    goal: 60,
    unit: 'min',
  },
  {
    id: '3',
    name: 'Workout',
    category: 'fitness',
    current: 1,
    goal: 3,
    unit: 'sessions',
  },
  {
    id: '4',
    name: 'Read',
    category: 'personal',
    current: 15,
    goal: 30,
    unit: 'pages',
  },
  {
    id: '5',
    name: 'Meditate',
    category: 'mindfulness',
    current: 10,
    goal: 20,
    unit: 'min',
  },
];

export function HomeScreen() {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return (
    <div className="min-h-screen bg-background pb-24 max-w-md mx-auto">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-medium text-white mb-1">Today</h1>
        <p className="text-muted-foreground">{today}</p>
      </div>
      
      {/* Habits List */}
      <div className="px-6 space-y-4">
        {habits.map((habit) => (
          <HabitCard key={habit.id} {...habit} />
        ))}
      </div>
      
      {/* Floating Add Button */}
      <Link
        to="/create-habit"
        className="fixed bottom-24 right-6 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        <Plus className="w-6 h-6 text-black" />
      </Link>
      
      <BottomNav />
    </div>
  );
}
