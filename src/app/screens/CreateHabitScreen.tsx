import { useState } from 'react';
import { useNavigate } from 'react-router';
import { X } from 'lucide-react';
import { useHabits } from '@/hooks/useHabits';
import { iconOptions, colorOptions, getIcon } from '@/lib/habitConfig';

const categories = ['Health', 'Fitness', 'Study', 'Productivity', 'Mindfulness', 'Finance', 'Personal', 'Custom'];
const frequencies = ['Daily', 'Weekly', 'Specific Days', 'Custom'];
const metricTypes = ['Boolean', 'Count', 'Duration', 'Quantity'];
const units = ['ml', 'oz', 'minutes', 'hours', 'pages', 'reps', 'sessions'];

export function CreateHabitScreen() {
  const navigate = useNavigate();
  const { createHabit } = useHabits();
  const [habitName, setHabitName] = useState('');
  const [category, setCategory] = useState('Health');
  const [frequency, setFrequency] = useState('Daily');
  const [metricType, setMetricType] = useState('Quantity');
  const [unit, setUnit] = useState('ml');
  const [goal, setGoal] = useState('');
  const [inc1, setInc1] = useState('');
  const [inc2, setInc2] = useState('');
  const [inc3, setInc3] = useState('');
  const [icon, setIcon] = useState('circle');
  const [color, setColor] = useState('#ffffff');

  const isBoolean = metricType === 'Boolean';
  const SelectedIcon = getIcon(icon);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await createHabit({
      name: habitName,
      category: category.toLowerCase(),
      metric_type: metricType.toLowerCase(),
      unit: isBoolean ? 'done' : metricType === 'Count' ? 'times' : metricType === 'Duration' ? 'min' : unit,
      goal: isBoolean ? 1 : (Number(goal) || 1),
      frequency: frequency.toLowerCase(),
      increments: isBoolean ? [1] : [Number(inc1) || 10, Number(inc2) || 25, Number(inc3) || 50],
      icon,
      color,
    });
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto">
      <div className="flex items-center justify-between px-6 pt-12 pb-6">
        <h1 className="text-2xl font-medium text-white">Create Habit</h1>
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      <form onSubmit={handleSave} className="px-6 space-y-6 pb-12">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Habit Name</label>
          <input type="text" value={habitName} onChange={(e) => setHabitName(e.target.value)} placeholder="e.g., Drink Water" required
            className="w-full px-4 py-4 bg-input rounded-xl text-white placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors" />
        </div>

        {/* Icon & Color */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Icon & Color</label>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
              <SelectedIcon className="w-7 h-7" style={{ color }} />
            </div>
            <span className="text-muted-foreground text-sm">Preview</span>
          </div>
          <div className="grid grid-cols-6 gap-2 mb-3">
            {Object.entries(iconOptions).map(([key, Icon]) => (
              <button key={key} type="button" onClick={() => setIcon(key)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${icon === key ? 'bg-white' : 'bg-secondary hover:bg-accent'}`}>
                <Icon className={`w-5 h-5 ${icon === key ? 'text-black' : 'text-white'}`} />
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {colorOptions.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={`w-10 h-10 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-4 bg-input rounded-xl text-white border border-border focus:outline-none focus:border-white transition-colors appearance-none">
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Frequency</label>
          <div className="grid grid-cols-2 gap-2">
            {frequencies.map((freq) => (
              <button key={freq} type="button" onClick={() => setFrequency(freq)}
                className={`py-3 rounded-xl font-medium transition-colors ${frequency === freq ? 'bg-white text-black' : 'bg-secondary text-white hover:bg-accent'}`}>
                {freq}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Metric Type</label>
          <div className="grid grid-cols-2 gap-2">
            {metricTypes.map((type) => (
              <button key={type} type="button" onClick={() => setMetricType(type)}
                className={`py-3 rounded-xl font-medium transition-colors ${metricType === type ? 'bg-white text-black' : 'bg-secondary text-white hover:bg-accent'}`}>
                {type}
              </button>
            ))}
          </div>
        </div>

        {!isBoolean && (
          <>
            {metricType === 'Quantity' && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Unit</label>
                <select value={unit} onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-4 py-4 bg-input rounded-xl text-white border border-border focus:outline-none focus:border-white transition-colors appearance-none">
                  {units.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Goal {metricType === 'Quantity' && `(${unit})`}</label>
              <input type="number" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g., 2000"
                className="w-full px-4 py-4 bg-input rounded-xl text-white placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors" />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Increment Buttons</label>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" value={inc1} onChange={(e) => setInc1(e.target.value)} placeholder="10"
                  className="px-4 py-4 bg-input rounded-xl text-white text-center placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors" />
                <input type="number" value={inc2} onChange={(e) => setInc2(e.target.value)} placeholder="25"
                  className="px-4 py-4 bg-input rounded-xl text-white text-center placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors" />
                <input type="number" value={inc3} onChange={(e) => setInc3(e.target.value)} placeholder="50"
                  className="px-4 py-4 bg-input rounded-xl text-white text-center placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors" />
              </div>
            </div>
          </>
        )}

        <button type="submit" className="w-full py-4 bg-white text-black rounded-xl font-medium hover:bg-gray-100 transition-colors">
          Save Habit
        </button>
      </form>
    </div>
  );
}
