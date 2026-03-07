interface CalendarHeatmapProps {
  data: Record<string, number>; // date string -> completion value (0-1)
}

export function CalendarHeatmap({ data }: CalendarHeatmapProps) {
  // Generate last 12 weeks of dates
  const weeks = 12;
  const today = new Date();
  const days: Date[] = [];
  
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    days.push(date);
  }
  
  // Group by weeks
  const weekGroups: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weekGroups.push(days.slice(i, i + 7));
  }
  
  const getCompletionLevel = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const value = data[dateStr] || 0;
    
    if (value === 0) return 'bg-secondary';
    if (value < 0.5) return 'bg-muted';
    if (value < 1) return 'bg-muted-foreground';
    return 'bg-white';
  };
  
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  return (
    <div className="bg-card rounded-2xl p-6 border border-border">
      <h3 className="text-white font-medium mb-4">Activity</h3>
      
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-2">
          {dayLabels.map((label, i) => (
            <div key={i} className="w-6 h-3 flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
        
        {/* Heatmap grid */}
        <div className="flex gap-1 overflow-x-auto">
          {weekGroups.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-1">
              {week.map((date, dayIdx) => (
                <div
                  key={dayIdx}
                  className={`w-3 h-3 rounded-sm ${getCompletionLevel(date)}`}
                  title={date.toLocaleDateString()}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-secondary" />
          <div className="w-3 h-3 rounded-sm bg-muted" />
          <div className="w-3 h-3 rounded-sm bg-muted-foreground" />
          <div className="w-3 h-3 rounded-sm bg-white" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
