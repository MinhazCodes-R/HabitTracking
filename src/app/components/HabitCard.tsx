import { Link } from 'react-router';
import { CheckCircle, Plus } from 'lucide-react';
import { getIcon } from '@/lib/habitConfig';

interface HabitCardProps {
  id: string;
  name: string;
  category: string;
  metric_type: string;
  current: number;
  goal: number;
  unit: string;
  increments: number[];
  icon: string;
  color: string;
  onDone: () => void;
  onIncrement: (amount: number) => void;
}

export function HabitCard({ id, name, category, metric_type, current, goal, unit, increments, icon, color, onDone, onIncrement }: HabitCardProps) {
  const Icon = getIcon(icon);
  const isBoolean = metric_type === 'boolean';
  const isDone = current >= goal;
  const progress = Math.min((current / goal) * 100, 100);

  return (
    <div className="bg-card rounded-2xl p-6 border border-border">
      <Link to={`/habit/${id}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <h3 className="text-white font-medium">{name}</h3>
              <p className="text-sm text-muted-foreground capitalize">{category}</p>
            </div>
          </div>
        </div>

        {isBoolean ? (
          <p className={`text-sm font-medium ${isDone ? 'text-green-400' : 'text-muted-foreground'}`}>
            {isDone ? 'Done' : 'Not done'}
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-white">{current} / {goal} {unit}</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: color }} />
            </div>
          </div>
        )}
      </Link>

      <div className="flex gap-2 mt-4">
        <button onClick={(e) => { e.preventDefault(); onDone(); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            isDone ? 'bg-green-400/20 text-green-400' : 'bg-secondary text-white hover:bg-accent'
          }`}>
          <CheckCircle className="w-4 h-4" />
          {isDone ? 'Done' : 'Complete'}
        </button>

        {!isBoolean && (
          <button onClick={(e) => { e.preventDefault(); onIncrement(increments[0] ?? 10); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-secondary text-white hover:bg-accent transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            +{increments[0] ?? 10} {unit}
          </button>
        )}
      </div>
    </div>
  );
}
