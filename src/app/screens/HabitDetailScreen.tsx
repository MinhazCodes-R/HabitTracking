import { useParams, useNavigate, Navigate } from 'react-router';
import { ArrowLeft, Droplet } from 'lucide-react';
import { CalendarHeatmap } from '../components/CalendarHeatmap';
import { useHabits } from '../context/HabitContext';

// Generate dynamic heatmap data
const generateHeatmapData = (logs: any, habitId: string, goal: number) => {
  const data: Record<string, number> = {};
  const today = new Date();
  
  for (let i = 0; i < 84; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const progress = logs[dateStr]?.[habitId] || 0;
    data[dateStr] = Math.min((progress / goal) || 0, 1);
  }
  
  return data;
};

export function HabitDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { habits, logs, getHabitProgress, logProgress } = useHabits();
  
  const habit = habits.find((h) => h.id === id);
  
  if (!habit) {
    return <Navigate to="/home" replace />;
  }
  
  const dateObj = new Date();
  const todayDateStr = dateObj.toISOString().split('T')[0];
  const current = getHabitProgress(habit.id, todayDateStr);
  const progress = Math.min((current / habit.goal) * 100, 100);
  const heatmapData = generateHeatmapData(logs, habit.id, habit.goal);
  
  const addProgress = (amount: number) => {
    logProgress(habit.id, todayDateStr, Math.min(current + amount, habit.goal));
  };
  
  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-8">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
            <Droplet className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-medium text-white">{habit.name}</h1>
            <p className="text-muted-foreground capitalize">{habit.category}</p>
          </div>
        </div>
      </div>
      
      {/* Progress Card */}
      <div className="px-6 mb-6">
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Today's Progress</span>
            <span className="text-white text-2xl font-medium">
              {current} / {habit.goal} {habit.unit}
            </span>
          </div>
          
          <div className="w-full h-3 bg-secondary rounded-full overflow-hidden mb-6">
            <div 
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Quick Add Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => addProgress(100)}
              className="py-3 bg-secondary rounded-xl text-white font-medium hover:bg-accent transition-colors"
            >
              +100 {habit.unit}
            </button>
            <button
              onClick={() => addProgress(250)}
              className="py-3 bg-secondary rounded-xl text-white font-medium hover:bg-accent transition-colors"
            >
              +250 {habit.unit}
            </button>
            <button
              onClick={() => addProgress(500)}
              className="py-3 bg-secondary rounded-xl text-white font-medium hover:bg-accent transition-colors"
            >
              +500 {habit.unit}
            </button>
          </div>
        </div>
      </div>
      
      {/* Calendar Heatmap */}
      <div className="px-6 mb-6">
        <CalendarHeatmap data={heatmapData} />
      </div>
      
      {/* Stats */}
      <div className="px-6">
        <div className="bg-card rounded-2xl p-6 border border-border">
          <h3 className="text-white font-medium mb-4">Statistics</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Current Streak</p>
              <p className="text-white text-2xl font-medium">7 days</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm mb-1">Best Streak</p>
              <p className="text-white text-2xl font-medium">21 days</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm mb-1">Total Logged</p>
              <p className="text-white text-2xl font-medium">84 days</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm mb-1">Completion</p>
              <p className="text-white text-2xl font-medium">89%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
