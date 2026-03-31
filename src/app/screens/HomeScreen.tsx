import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { useRef, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { BottomNav } from '../components/BottomNav';
import { HabitCard } from '../components/HabitCard';
import { useHabits, type HabitWithProgress } from '@/hooks/useHabits';

const ITEM_TYPE = 'HABIT';

function DraggableHabitCard({ habit, index, moveHabit, onDone, onIncrement }: {
  habit: HabitWithProgress;
  index: number;
  moveHabit: (from: number, to: number) => void;
  onDone: () => void;
  onIncrement: (amt: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover(item: { index: number }) {
      if (item.index === index) return;
      moveHabit(item.index, index);
      item.index = index;
    },
  });

  drag(drop(ref));

  return (
    <div ref={ref} style={{ opacity: isDragging ? 0.4 : 1, cursor: 'grab' }}>
      <HabitCard
        id={habit.id}
        name={habit.name}
        category={habit.category}
        metric_type={habit.metric_type}
        current={habit.current}
        goal={habit.goal}
        unit={habit.unit}
        increments={habit.increments}
        icon={habit.icon}
        color={habit.color}
        onDone={onDone}
        onIncrement={onIncrement}
      />
    </div>
  );
}

export function HomeScreen() {
  const { habits, loading, logProgress, reorderHabits } = useHabits();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleDone = (habit: HabitWithProgress) => {
    const isDone = habit.current >= habit.goal;
    logProgress(habit.id, isDone ? 0 : habit.goal);
  };

  const handleIncrement = (habit: HabitWithProgress, amount: number) => {
    const newValue = Math.min(habit.current + amount, habit.goal);
    logProgress(habit.id, newValue);
  };

  const moveHabit = useCallback((from: number, to: number) => {
    const updated = [...habits];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    reorderHabits(updated);
  }, [habits, reorderHabits]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-background pb-24 max-w-md mx-auto">
        <div className="px-6 pt-12 pb-6">
          <h1 className="text-3xl font-medium text-white mb-1">Today</h1>
          <p className="text-muted-foreground">{today}</p>
        </div>

        <div className="px-6 space-y-4">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : habits.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No habits yet. Create one!</p>
          ) : (
            habits.map((habit, index) => (
              <DraggableHabitCard
                key={habit.id}
                habit={habit}
                index={index}
                moveHabit={moveHabit}
                onDone={() => handleDone(habit)}
                onIncrement={(amt) => handleIncrement(habit, amt)}
              />
            ))
          )}
        </div>

        <Link to="/create-habit" className="fixed bottom-24 right-6 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
          <Plus className="w-6 h-6 text-black" />
        </Link>

        <BottomNav />
      </div>
    </DndProvider>
  );
}
