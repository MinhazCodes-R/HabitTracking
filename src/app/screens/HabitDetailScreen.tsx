import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Droplet } from 'lucide-react';
import { CalendarHeatmap } from '../components/CalendarHeatmap';
import { useState, useEffect } from 'react';
import { useHabits, type HabitWithProgress } from '@/hooks/useHabits';

const categories = ['health', 'fitness', 'study', 'productivity', 'mindfulness', 'finance', 'personal', 'custom'];

export function HabitDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { habits, loading, logProgress, getHabitLogs, updateHabit } = useHabits();
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});

  const habit = habits.find(h => h.id === id);

  useEffect(() => {
    if (!id) return;
    getHabitLogs(id).then(data => setHeatmapData(data ?? {}));
  }, [id, habits]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!habit) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Habit not found</p></div>;

  const progress = Math.min((habit.current / habit.goal) * 100, 100);

  // Normalize heatmap values to 0-1 based on goal
  const normalizedHeatmap: Record<string, number> = {};
  for (const [date, value] of Object.entries(heatmapData)) {
    normalizedHeatmap[date] = Math.min(value / habit.goal, 1);
  }

  const addProgress = async (amount: number) => {
    const newValue = Math.min(habit.current + amount, habit.goal);
    await logProgress(habit.id, newValue);
  };

  // Compute streaks from heatmap data
  const dates = Object.keys(heatmapData).sort().reverse();
  let currentStreak = 0;
  const today = new Date();
  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (dates[i] === expected.toISOString().split('T')[0] && heatmapData[dates[i]] > 0) {
      currentStreak++;
    } else break;
  }

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-8">
      <div className="px-6 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors mb-6">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
            <Droplet className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-medium text-white">{habit.name}</h1>
            <select
              value={habit.category}
              onChange={(e) => updateHabit(habit.id, { category: e.target.value })}
              className="bg-transparent text-muted-foreground capitalize text-sm focus:outline-none cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat} value={cat} className="bg-card capitalize">{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="px-6 mb-6">
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Today's Progress</span>
            <span className="text-white text-2xl font-medium">{habit.current} / {habit.goal} {habit.unit}</span>
          </div>
          <div className="w-full h-3 bg-secondary rounded-full overflow-hidden mb-6">
            <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[100, 250, 500].map(amt => (
              <button key={amt} onClick={() => addProgress(amt)} className="py-3 bg-secondary rounded-xl text-white font-medium hover:bg-accent transition-colors">
                +{amt} {habit.unit}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 mb-6">
        <CalendarHeatmap data={normalizedHeatmap} />
      </div>

      <div className="px-6">
        <div className="bg-card rounded-2xl p-6 border border-border">
          <h3 className="text-white font-medium mb-4">Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Current Streak</p>
              <p className="text-white text-2xl font-medium">{currentStreak} days</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm mb-1">Total Logged</p>
              <p className="text-white text-2xl font-medium">{dates.filter(d => heatmapData[d] > 0).length} days</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
