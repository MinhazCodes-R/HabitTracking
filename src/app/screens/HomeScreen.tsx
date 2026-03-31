import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { HabitCard } from '../components/HabitCard';
import { useHabits } from '@/hooks/useHabits';

export function HomeScreen() {
  const { habits, loading } = useHabits();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background pb-24 max-w-md mx-auto">
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-medium text-white mb-1">Today</h1>
        <p className="text-muted-foreground">{today}</p>
      </div>

      <div className="px-6 space-y-4">
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : habits.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No habits yet. Create one!</p>
        ) : (
          habits.map((habit) => (
            <HabitCard key={habit.id} id={habit.id} name={habit.name} category={habit.category} current={habit.current} goal={habit.goal} unit={habit.unit} />
          ))
        )}
      </div>

      <Link to="/create-habit" className="fixed bottom-24 right-6 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
        <Plus className="w-6 h-6 text-black" />
      </Link>

      <BottomNav />
    </div>
  );
}
