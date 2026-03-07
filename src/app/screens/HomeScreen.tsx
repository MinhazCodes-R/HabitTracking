import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { HabitCard } from '../components/HabitCard';
import { useHabits } from '../context/HabitContext';

// Removed mock data

export function HomeScreen() {
  const { habits, getHabitProgress, user } = useHabits();
  const dateObj = new Date();
  const todayDateStr = dateObj.toISOString().split('T')[0];
  
  const today = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return (
    <div className="min-h-screen bg-background pb-24 max-w-md mx-auto">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-medium text-white mb-1">
          {user ? `Welcome, ${user.name}` : 'Today'}
        </h1>
        <p className="text-muted-foreground">{today}</p>
      </div>
      
      {/* Habits List */}
      <div className="px-6 space-y-4">
        {habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-2xl border border-border">
            <p className="text-white font-medium mb-1">No habits yet</p>
            <p className="text-sm text-muted-foreground">Add your first habit below</p>
          </div>
        ) : (
          habits.map((habit) => (
            <HabitCard 
              key={habit.id} 
              {...habit} 
              current={getHabitProgress(habit.id, todayDateStr)} 
            />
          ))
        )}
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
