import { BottomNav } from '../components/BottomNav';
import { TrendingUp, Award, Calendar, Target } from 'lucide-react';
import { useHabits } from '../context/HabitContext';

export function AnalyticsScreen() {
  const { habits, logs, getHabitProgress } = useHabits();
  
  // Basic calculations
  const activeHabits = habits.length;
  const totalDaysLogged = Object.keys(logs).length;
  
  // Weekly averages
  const today = new Date();
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    
    if (habits.length === 0) return { day: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()], completion: 0 };
    
    let totalProgress = 0;
    habits.forEach(h => {
      const p = getHabitProgress(h.id, dateStr);
      totalProgress += Math.min((p / h.goal) || 0, 1);
    });
    
    return {
      day: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()],
      completion: Math.round((totalProgress / habits.length) * 100),
    };
  });
  
  const weekAverage = weekData.length > 0 
    ? Math.round(weekData.reduce((acc, curr) => acc + curr.completion, 0) / 7)
    : 0;

  // Best performing sorting
  const bestPerforming = habits.map(h => {
    let sum = 0;
    let days = 0;
    Object.keys(logs).forEach(date => {
      days++;
      sum += Math.min((getHabitProgress(h.id, date) / h.goal) || 0, 1);
    });
    return {
      name: h.name,
      score: days > 0 ? Math.round((sum / days) * 100) : 0
    };
  }).sort((a, b) => b.score - a.score).slice(0, 3);
  
  return (
    <div className="min-h-screen bg-background pb-24 max-w-md mx-auto">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-medium text-white mb-1">Analytics</h1>
        <p className="text-muted-foreground">Your progress overview</p>
      </div>
      
      {/* Stats Grid */}
      <div className="px-6 space-y-4">
        {/* Overall Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-white" />
            </div>
            <p className="text-muted-foreground text-sm mb-1">Active Habits</p>
            <p className="text-white text-3xl font-medium">{activeHabits}</p>
          </div>
          
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-3">
              <Award className="w-5 h-5 text-white" />
            </div>
            <p className="text-muted-foreground text-sm mb-1">Days Tracked</p>
            <p className="text-white text-3xl font-medium">{totalDaysLogged}</p>
          </div>
        </div>
        
        {/* Weekly Progress */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-medium">This Week</h3>
              <p className="text-sm text-muted-foreground">7 days tracked</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Average Completion</span>
                <span className="text-white">{weekAverage}%</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${weekAverage}%` }} />
              </div>
            </div>
            
            <div className="pt-3 border-t border-border">
              <div className="grid grid-cols-7 gap-2">
                {weekData.map((data, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="h-20 w-full bg-secondary rounded-lg overflow-hidden flex flex-col justify-end">
                      <div 
                        className="bg-white rounded-t-lg transition-all"
                        style={{ height: `${data.completion}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{data.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Best Performing Habits */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <h3 className="text-white font-medium mb-4">Best Performing</h3>
          
          <div className="space-y-4">
            {bestPerforming.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data available yet.</p>
            ) : (
              bestPerforming.map((bp, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white">{bp.name}</span>
                    <span className="text-sm text-muted-foreground">{bp.score}%</span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all" style={{ width: `${bp.score}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Monthly Overview */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-medium">This Month</h3>
              <p className="text-sm text-muted-foreground">
                {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Days Logged</p>
              <p className="text-white text-2xl font-medium">{totalDaysLogged}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm mb-1">Avg. Score</p>
              <p className="text-white text-2xl font-medium">{weekAverage}%</p>
            </div>
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
}
