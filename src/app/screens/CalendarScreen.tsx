import { useState } from 'react';
import { BottomNav } from '../components/BottomNav';
import { useHabits } from '../context/HabitContext';

// Generate calendar data
const generateCalendarData = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  return {
    year,
    month,
    daysInMonth,
    startingDayOfWeek,
  };
};

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const calendarData = generateCalendarData();
  const { habits, getHabitProgress } = useHabits();
  
  const getActualCompletionLevel = (year: number, month: number, day: number) => {
    if (habits.length === 0) return 'bg-secondary';
    
    // Use midday to avoid timezone offset issues when extracting the iso string date
    const dateStr = new Date(year, month, day, 12).toISOString().split('T')[0];
    let totalProgress = 0;
    
    habits.forEach(habit => {
      const progress = getHabitProgress(habit.id, dateStr);
      totalProgress += Math.min((progress / habit.goal) || 0, 1);
    });
    
    const average = totalProgress / habits.length;

    if (average > 0.8) return 'bg-white';
    if (average > 0.5) return 'bg-muted-foreground';
    if (average > 0.1) return 'bg-muted';
    return 'bg-secondary';
  };
  
  const days = Array.from({ length: calendarData.daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: calendarData.startingDayOfWeek }, (_, i) => i);
  
  return (
    <div className="min-h-screen bg-background pb-24 max-w-md mx-auto">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-medium text-white mb-1">Calendar</h1>
        <p className="text-muted-foreground">
          {monthNames[calendarData.month]} {calendarData.year}
        </p>
      </div>
      
      {/* Calendar */}
      <div className="px-6">
        <div className="bg-card rounded-2xl p-6 border border-border">
          {/* Day names */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-xs text-muted-foreground font-medium">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty days */}
            {emptyDays.map((i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {/* Days */}
            {days.map((day) => {
              const isToday = day === new Date().getDate() && 
                             calendarData.month === new Date().getMonth() &&
                             calendarData.year === new Date().getFullYear();
              const isSelected = day === selectedDate;
              
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-white text-black'
                      : isToday
                      ? 'bg-muted text-white border-2 border-white'
                      : getActualCompletionLevel(calendarData.year, calendarData.month, day) + ' text-white'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-2 mt-6 pt-6 border-t border-border text-xs text-muted-foreground">
            <span>Completion:</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-secondary" />
              <span>None</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-muted" />
              <span>Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-muted-foreground" />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-white" />
              <span>High</span>
            </div>
          </div>
        </div>
        
        {/* Selected Date Info */}
        {selectedDate && (
          <div className="mt-4 bg-card rounded-2xl p-6 border border-border">
            <h3 className="text-white font-medium mb-4">
              {monthNames[calendarData.month]} {selectedDate}, {calendarData.year}
            </h3>
            
            <div className="space-y-3">
              {habits.length === 0 ? (
                <div className="text-muted-foreground">No habits tracked yet.</div>
              ) : (
                habits.map((habit) => {
                  const dateStr = new Date(calendarData.year, calendarData.month, selectedDate, 12).toISOString().split('T')[0];
                  const current = getHabitProgress(habit.id, dateStr);
                  return (
                    <div key={habit.id} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{habit.name}</span>
                      <span className="text-white">{current} / {habit.goal} {habit.unit}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
}
