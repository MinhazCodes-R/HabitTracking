import { BottomNav } from '../components/BottomNav';
import { TrendingUp, Award, Calendar, Target } from 'lucide-react';

export function AnalyticsScreen() {
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
            <p className="text-white text-3xl font-medium">5</p>
          </div>
          
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-3">
              <Award className="w-5 h-5 text-white" />
            </div>
            <p className="text-muted-foreground text-sm mb-1">Total Streak</p>
            <p className="text-white text-3xl font-medium">42</p>
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
                <span className="text-white">87%</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: '87%' }} />
              </div>
            </div>
            
            <div className="pt-3 border-t border-border">
              <div className="grid grid-cols-7 gap-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                  const completion = [100, 80, 100, 90, 100, 70, 85][i];
                  return (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className="h-20 w-full bg-secondary rounded-lg overflow-hidden flex flex-col justify-end">
                        <div 
                          className="bg-white rounded-t-lg transition-all"
                          style={{ height: `${completion}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* Best Performing Habits */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <h3 className="text-white font-medium mb-4">Best Performing</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white">Drink Water</span>
                <span className="text-sm text-muted-foreground">98%</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: '98%' }} />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white">Workout</span>
                <span className="text-sm text-muted-foreground">92%</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: '92%' }} />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white">Study</span>
                <span className="text-sm text-muted-foreground">85%</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
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
              <p className="text-sm text-muted-foreground">March 2026</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Days Active</p>
              <p className="text-white text-2xl font-medium">7 / 7</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm mb-1">Avg. Score</p>
              <p className="text-white text-2xl font-medium">87%</p>
            </div>
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
}
