import { BottomNav } from '../components/BottomNav';
import { TrendingUp, Award, Calendar, Target } from 'lucide-react';
import { useHabits } from '@/hooks/useHabits';
import { useAuth } from '../AuthContext';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

export function AnalyticsScreen() {
  const { user } = useAuth();
  const { habits } = useHabits();
  const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [avgCompletion, setAvgCompletion] = useState(0);

  useEffect(() => {
    if (!user || habits.length === 0) return;

    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);

    supabase.from('habit_logs').select('date, value, habit_id')
      .eq('user_id', user.id)
      .gte('date', weekAgo.toISOString().split('T')[0])
      .lte('date', today.toISOString().split('T')[0])
      .then(({ data }) => {
        const habitMap = new Map(habits.map(h => [h.id, h.goal]));
        const dailyScores: Record<string, number[]> = {};

        (data ?? []).forEach(l => {
          if (!dailyScores[l.date]) dailyScores[l.date] = [];
          const goal = habitMap.get(l.habit_id) ?? 1;
          dailyScores[l.date].push(Math.min(l.value / goal, 1) * 100);
        });

        const weekly: number[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(weekAgo);
          d.setDate(d.getDate() + i);
          const key = d.toISOString().split('T')[0];
          const scores = dailyScores[key] ?? [];
          weekly.push(scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0);
        }
        setWeeklyData(weekly);
        const allScores = weekly.filter(s => s > 0);
        setAvgCompletion(allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0);
      });
  }, [user, habits]);

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="min-h-screen bg-background pb-24 max-w-md mx-auto">
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-medium text-white mb-1">Analytics</h1>
        <p className="text-muted-foreground">Your progress overview</p>
      </div>

      <div className="px-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-white" />
            </div>
            <p className="text-muted-foreground text-sm mb-1">Active Habits</p>
            <p className="text-white text-3xl font-medium">{habits.length}</p>
          </div>
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-3">
              <Award className="w-5 h-5 text-white" />
            </div>
            <p className="text-muted-foreground text-sm mb-1">Avg Completion</p>
            <p className="text-white text-3xl font-medium">{avgCompletion}%</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-medium">This Week</h3>
              <p className="text-sm text-muted-foreground">Last 7 days</p>
            </div>
          </div>
          <div className="pt-3 border-t border-border">
            <div className="grid grid-cols-7 gap-2">
              {dayLabels.map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="h-20 w-full bg-secondary rounded-lg overflow-hidden flex flex-col justify-end">
                    <div className="bg-white rounded-t-lg transition-all" style={{ height: `${weeklyData[i]}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {habits.length > 0 && (
          <div className="bg-card rounded-2xl p-6 border border-border">
            <h3 className="text-white font-medium mb-4">Habits</h3>
            <div className="space-y-4">
              {habits.map(h => {
                const pct = h.goal > 0 ? Math.round(Math.min(h.current / h.goal, 1) * 100) : 0;
                return (
                  <div key={h.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white">{h.name}</span>
                      <span className="text-sm text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
