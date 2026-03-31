import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Pencil, Check, X } from 'lucide-react';
import { CalendarHeatmap } from '../components/CalendarHeatmap';
import { useState, useEffect } from 'react';
import { useHabits } from '@/hooks/useHabits';
import { iconOptions, colorOptions, getIcon } from '@/lib/habitConfig';

const categories = ['health', 'fitness', 'study', 'productivity', 'mindfulness', 'finance', 'personal', 'custom'];

export function HabitDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { habits, loading, logProgress, getHabitLogs, updateHabit } = useHabits();
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [editingIncrements, setEditingIncrements] = useState(false);
  const [incValues, setIncValues] = useState<string[]>(['', '', '']);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const habit = habits.find(h => h.id === id);

  useEffect(() => {
    if (!id) return;
    getHabitLogs(id).then(data => setHeatmapData(data ?? {}));
  }, [id, habits]);

  useEffect(() => {
    if (habit) {
      setIncValues(habit.increments.map(String));
      setNameValue(habit.name);
    }
  }, [habit?.id]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!habit) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Habit not found</p></div>;

  const HabitIcon = getIcon(habit.icon);
  const isBoolean = habit.metric_type === 'boolean';
  const isDone = habit.current >= habit.goal;
  const progress = Math.min((habit.current / habit.goal) * 100, 100);

  const normalizedHeatmap: Record<string, number> = {};
  for (const [date, value] of Object.entries(heatmapData)) {
    normalizedHeatmap[date] = Math.min(value / habit.goal, 1);
  }

  const addProgress = async (amount: number) => {
    const newValue = Math.min(habit.current + amount, habit.goal);
    await logProgress(habit.id, newValue);
  };

  const toggleDone = async () => {
    await logProgress(habit.id, isDone ? 0 : habit.goal);
  };

  const saveIncrements = async () => {
    const parsed = incValues.map(v => Number(v) || 0).filter(v => v > 0);
    if (parsed.length === 3) {
      await updateHabit(habit.id, { increments: parsed });
      setEditingIncrements(false);
    }
  };

  const saveName = () => {
    if (nameValue.trim()) {
      updateHabit(habit.id, { name: nameValue.trim() });
      setEditingName(false);
    }
  };

  const dates = Object.keys(heatmapData).sort().reverse();
  let currentStreak = 0;
  const today = new Date();
  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (dates[i] === expected.toISOString().split('T')[0] && heatmapData[dates[i]] > 0) {
      currentStreak++;
    } else break;
  }

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-8">
      <div className="px-6 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors mb-6">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-4 mb-6">
          {/* Icon - clickable to change */}
          <button onClick={() => { setShowIconPicker(!showIconPicker); setShowColorPicker(false); }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: habit.color + '20' }}>
            <HabitIcon className="w-8 h-8" style={{ color: habit.color }} />
          </button>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input value={nameValue} onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  className="text-2xl font-medium text-white bg-transparent border-b border-white focus:outline-none w-full" autoFocus />
                <button onClick={saveName} className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-white" />
                </button>
                <button onClick={() => { setEditingName(false); setNameValue(habit.name); }}
                  className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ) : (
              <button onClick={() => setEditingName(true)} className="flex items-center gap-2 group">
                <h1 className="text-2xl font-medium text-white">{habit.name}</h1>
                <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
            <select value={habit.category} onChange={(e) => updateHabit(habit.id, { category: e.target.value })}
              className="bg-transparent text-muted-foreground capitalize text-sm focus:outline-none cursor-pointer">
              {categories.map(cat => <option key={cat} value={cat} className="bg-card capitalize">{cat}</option>)}
            </select>
          </div>
        </div>

        {/* Icon picker */}
        {showIconPicker && (
          <div className="bg-card rounded-2xl p-4 border border-border mb-4">
            <p className="text-sm text-muted-foreground mb-3">Choose Icon</p>
            <div className="grid grid-cols-6 gap-2">
              {Object.entries(iconOptions).map(([key, Icon]) => (
                <button key={key} onClick={() => { updateHabit(habit.id, { icon: key }); setShowIconPicker(false); }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${habit.icon === key ? 'bg-white' : 'bg-secondary hover:bg-accent'}`}>
                  <Icon className={`w-5 h-5 ${habit.icon === key ? 'text-black' : 'text-white'}`} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Color picker */}
        {showColorPicker && (
          <div className="bg-card rounded-2xl p-4 border border-border mb-4">
            <p className="text-sm text-muted-foreground mb-3">Choose Color</p>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map(c => (
                <button key={c} onClick={() => { updateHabit(habit.id, { color: c }); setShowColorPicker(false); }}
                  className={`w-10 h-10 rounded-full border-2 transition-transform ${habit.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        )}

        {!showIconPicker && !showColorPicker && (
          <button onClick={() => { setShowColorPicker(true); setShowIconPicker(false); }}
            className="text-sm text-muted-foreground hover:text-white transition-colors mb-2">
            Change color
          </button>
        )}
      </div>

      <div className="px-6 mb-6">
        <div className="bg-card rounded-2xl p-6 border border-border">
          {isBoolean ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground">Today's Status</span>
                <span className={`text-2xl font-medium ${isDone ? 'text-green-400' : 'text-white'}`}>
                  {isDone ? 'Done' : 'Not Done'}
                </span>
              </div>
              <button onClick={toggleDone}
                className={`w-full py-4 rounded-xl font-medium transition-colors ${
                  isDone ? 'bg-secondary text-white hover:bg-accent' : 'bg-white text-black hover:bg-gray-100'
                }`}>
                {isDone ? 'Mark Undone' : 'Mark Done'}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground">Today's Progress</span>
                <span className="text-white text-2xl font-medium">{habit.current} / {habit.goal} {habit.unit}</span>
              </div>
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden mb-6">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: habit.color }} />
              </div>

              <button onClick={toggleDone}
                className={`w-full py-3 mb-3 rounded-xl font-medium transition-colors ${
                  isDone ? 'bg-secondary text-white hover:bg-accent' : 'bg-white text-black hover:bg-gray-100'
                }`}>
                {isDone ? 'Mark Undone' : 'Mark Complete'}
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">Quick Add</span>
                <button onClick={() => editingIncrements ? saveIncrements() : setEditingIncrements(true)}
                  className="ml-auto w-7 h-7 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
                  {editingIncrements ? <Check className="w-3.5 h-3.5 text-white" /> : <Pencil className="w-3.5 h-3.5 text-white" />}
                </button>
                {editingIncrements && (
                  <button onClick={() => { setEditingIncrements(false); setIncValues(habit.increments.map(String)); }}
                    className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                )}
              </div>

              {editingIncrements ? (
                <div className="grid grid-cols-3 gap-3">
                  {incValues.map((v, i) => (
                    <input key={i} type="number" value={v}
                      onChange={(e) => { const next = [...incValues]; next[i] = e.target.value; setIncValues(next); }}
                      className="py-3 bg-secondary rounded-xl text-white font-medium text-center border border-border focus:outline-none focus:border-white transition-colors" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {habit.increments.map((amt, i) => (
                    <button key={i} onClick={() => addProgress(amt)}
                      className="py-3 bg-secondary rounded-xl text-white font-medium hover:bg-accent transition-colors">
                      +{amt} {habit.unit}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="px-6 mb-6">
        <CalendarHeatmap data={normalizedHeatmap} />
      </div>

      <div className="px-6">
        <div className="bg-card rounded-2xl p-6 border border-border">
          <h3 className="text-white font-medium mb-4">Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Current Streak</p>
              <p className="text-white text-2xl font-medium">{currentStreak} days</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm mb-1">Total Logged</p>
              <p className="text-white text-2xl font-medium">{dates.filter(d => heatmapData[d] > 0).length} days</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
