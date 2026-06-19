import { Link } from 'react-router';
import { Plus, ChevronDown, ChevronRight, CheckCheck } from 'lucide-react';
import { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { BottomNav } from '../components/BottomNav';
import { HabitCard } from '../components/HabitCard';
import { useHabits, type HabitWithProgress } from '@/hooks/useHabits';
import { useHabitGroups, type HabitGroup } from '@/hooks/useHabitGroups';

const ITEM_TYPE = 'HABIT';
const COLLAPSED_KEY = 'minihabits.home.collapsedGroups';
const UNGROUPED_BUCKET = '__ungrouped__';

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

function GroupHeader({ group, completed, total, collapsed, onToggle, onCheckAll }: {
  group: HabitGroup | null;
  completed: number;
  total: number;
  collapsed: boolean;
  onToggle: () => void;
  onCheckAll?: () => void;
}) {
  const allDone = total > 0 && completed >= total;
  const name = group?.name ?? 'Ungrouped';
  const accent = group?.color ?? undefined;

  return (
    <div className="flex items-center justify-between mb-3">
      <button onClick={onToggle} className="flex items-center gap-2 text-white group">
        {collapsed
          ? <ChevronRight className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        <span className="font-medium" style={accent ? { color: accent } : undefined}>{name}</span>
        <span className="text-xs text-muted-foreground">{completed}/{total}</span>
      </button>
      {onCheckAll && total > 0 && (
        <button onClick={onCheckAll} disabled={allDone}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            allDone
              ? 'bg-secondary/40 text-muted-foreground cursor-not-allowed'
              : 'bg-secondary text-white hover:bg-accent'
          }`}>
          <CheckCheck className="w-3.5 h-3.5" />
          {allDone ? 'All done' : 'Check all'}
        </button>
      )}
    </div>
  );
}

export function HomeScreen() {
  const { habits, loading, logProgress, reorderHabits, logProgressForGroup } = useHabits();
  const { groups, loading: groupsLoading } = useHabitGroups();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '{}'); }
    catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed));
  }, [collapsed]);

  const toggleCollapsed = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const handleDone = (habit: HabitWithProgress) => {
    const isDone = habit.current >= habit.goal;
    logProgress(habit.id, isDone ? 0 : habit.goal);
  };

  const handleIncrement = (habit: HabitWithProgress, amount: number) => {
    const newValue = Math.min(habit.current + amount, habit.goal);
    logProgress(habit.id, newValue);
  };

  // Build [group, habits[]] buckets in group.position order, with Ungrouped last.
  const buckets = useMemo(() => {
    const byGroup = new Map<string, HabitWithProgress[]>();
    for (const h of habits) {
      const key = h.group_id ?? UNGROUPED_BUCKET;
      const arr = byGroup.get(key) ?? [];
      arr.push(h);
      byGroup.set(key, arr);
    }
    const ordered: Array<{ group: HabitGroup | null; habits: HabitWithProgress[] }> = [];
    for (const g of groups) {
      ordered.push({ group: g, habits: byGroup.get(g.id) ?? [] });
    }
    const ungrouped = byGroup.get(UNGROUPED_BUCKET) ?? [];
    if (ungrouped.length > 0) ordered.push({ group: null, habits: ungrouped });
    return ordered;
  }, [habits, groups]);

  // Drag-reorder operates on the FLAT list, mirroring previous behaviour. Reordering across
  // groups intentionally does NOT change group membership (use Habit Detail for that).
  const moveHabit = useCallback((from: number, to: number) => {
    const updated = [...habits];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    reorderHabits(updated);
  }, [habits, reorderHabits]);

  const indexOf = (id: string) => habits.findIndex(h => h.id === id);

  const renderEmpty = !loading && !groupsLoading && habits.length === 0;
  const hasAnyGroups = groups.length > 0;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-background pb-24 max-w-md mx-auto">
        <div className="px-6 pt-12 pb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-medium text-white mb-1">Today</h1>
            <p className="text-muted-foreground">{today}</p>
          </div>
          <Link to="/groups" className="text-xs text-muted-foreground hover:text-white transition-colors mt-2">
            Manage groups
          </Link>
        </div>

        <div className="px-6 space-y-8">
          {loading || groupsLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : renderEmpty ? (
            <p className="text-muted-foreground text-center py-8">No habits yet. Create one!</p>
          ) : !hasAnyGroups ? (
            // No groups defined at all — render the flat list, no headers.
            <div className="space-y-4">
              {habits.map((habit, index) => (
                <DraggableHabitCard
                  key={habit.id}
                  habit={habit}
                  index={index}
                  moveHabit={moveHabit}
                  onDone={() => handleDone(habit)}
                  onIncrement={(amt) => handleIncrement(habit, amt)}
                />
              ))}
            </div>
          ) : (
            buckets.map(({ group, habits: groupHabits }) => {
              const key = group?.id ?? UNGROUPED_BUCKET;
              const isCollapsed = !!collapsed[key];
              const completed = groupHabits.filter(h => h.current >= h.goal).length;
              return (
                <section key={key}>
                  <GroupHeader
                    group={group}
                    completed={completed}
                    total={groupHabits.length}
                    collapsed={isCollapsed}
                    onToggle={() => toggleCollapsed(key)}
                    onCheckAll={group ? () => logProgressForGroup(group.id) : undefined}
                  />
                  {!isCollapsed && (
                    <div className="space-y-4">
                      {groupHabits.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">No habits in this group yet.</p>
                      ) : (
                        groupHabits.map(habit => (
                          <DraggableHabitCard
                            key={habit.id}
                            habit={habit}
                            index={indexOf(habit.id)}
                            moveHabit={moveHabit}
                            onDone={() => handleDone(habit)}
                            onIncrement={(amt) => handleIncrement(habit, amt)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </section>
              );
            })
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
