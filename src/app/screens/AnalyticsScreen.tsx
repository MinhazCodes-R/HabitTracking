import { BottomNav } from '../components/BottomNav';
import { TrendingUp, Award, Calendar, Target } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useHabits } from '@/hooks/useHabits';
import { useAuth } from '../AuthContext';
import { supabase } from '@/lib/supabase';
import { useMemo } from 'react';
import { toLocalDateStr } from '@/lib/date';
import { qk } from '@/lib/queryKeys';

export function AnalyticsScreen() {
  const { user, loading: authLoading } = useAuth();
  const { habits } = useHabits();

  const todayStr = toLocalDateStr(new Date());
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekStartStr = toLocalDateStr(weekAgo);

  const { data: weekLogs = [] } = useQuery({
    queryKey: qk.weeklyStats(user?.id ?? '', weekStartStr),
    queryFn: async () => {
      const { data } = await supabase.from('habit_logs').select('date, value, habit_id')
        .eq('user_id', user!.id)
        .gte('date', weekStartStr)
        .lte('date', todayStr);
      return (data ?? []) as { date: string; value: number; habit_id: string }[];
    },
    enabled: !authLoading && !!user,
  });

  const { weeklyData, avgCompletion } = useMemo(() => {
    const habitMap = new Map(habits.map(h => [h.id, h.goal]));
    const dailyScores: Record<string, number[]> = {};

    weekLogs.forEach(l => {
      if (!dailyScores[l.date]) dailyScores[l.date] = [];
      const goal = habitMap.get(l.habit_id) ?? 1;
      dailyScores[l.date].push(Math.min(l.value / goal, 1) * 100);
    });

    const weekly: number[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - 6 + i);
      const scores = dailyScores[toLocalDateStr(d)] ?? [];
      weekly.push(scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0);
    }
    const allScores = weekly.filter(s => s > 0);
    const avg = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
    return { weeklyData: weekly, avgCompletion: avg };
  }, [habits, weekLogs, weekStartStr]);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekdayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return weekdayLetters[d.getDay()];
  });

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
