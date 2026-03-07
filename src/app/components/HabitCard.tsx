import { Link } from 'react-router';
import { Droplet, BookOpen, Dumbbell, Target, Brain, DollarSign, Heart, Circle } from 'lucide-react';

interface HabitCardProps {
  id: string;
  name: string;
  category: string;
  current: number;
  goal: number;
  unit: string;
}

const categoryIcons: Record<string, any> = {
  health: Droplet,
  fitness: Dumbbell,
  study: BookOpen,
  productivity: Target,
  mindfulness: Brain,
  finance: DollarSign,
  personal: Heart,
  custom: Circle,
};

export function HabitCard({ id, name, category, current, goal, unit }: HabitCardProps) {
  const Icon = categoryIcons[category.toLowerCase()] || Circle;
  const progress = Math.min((current / goal) * 100, 100);
  
  return (
    <Link to={`/habit/${id}`}>
      <div className="bg-card rounded-2xl p-6 border border-border hover:border-muted-foreground transition-colors">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-medium">{name}</h3>
              <p className="text-sm text-muted-foreground capitalize">{category}</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-white">
              {current} / {goal} {unit}
            </span>
          </div>
          
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
