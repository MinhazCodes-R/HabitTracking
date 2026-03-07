import { useState } from 'react';
import { useNavigate } from 'react-router';
import { X } from 'lucide-react';
import { useHabits } from '../context/HabitContext';

const categories = [
  'Health',
  'Fitness',
  'Study',
  'Productivity',
  'Mindfulness',
  'Finance',
  'Personal',
  'Custom',
];

const frequencies = ['Daily', 'Weekly', 'Specific Days', 'Custom'];

const metricTypes = ['Boolean', 'Count', 'Duration', 'Quantity'];

const units = ['ml', 'oz', 'minutes', 'hours', 'pages', 'reps', 'sessions'];

export function CreateHabitScreen() {
  const navigate = useNavigate();
  const { addHabit } = useHabits();
  const [habitName, setHabitName] = useState('');
  const [category, setCategory] = useState('Health');
  const [frequency, setFrequency] = useState('Daily');
  const [metricType, setMetricType] = useState('Quantity');
  const [unit, setUnit] = useState('ml');
  const [goal, setGoal] = useState('');
  
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName || !goal) return;
    
    addHabit({
      name: habitName,
      category: category.toLowerCase(),
      frequency,
      metricType,
      unit: metricType === 'Quantity' ? unit : '',
      goal: Number(goal),
    });
    
    navigate('/home');
  };
  
  return (
    <div className="min-h-screen bg-background max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-6">
        <h1 className="text-2xl font-medium text-white">Create Habit</h1>
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSave} className="px-6 space-y-6">
        {/* Habit Name */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Habit Name</label>
          <input
            type="text"
            value={habitName}
            onChange={(e) => setHabitName(e.target.value)}
            placeholder="e.g., Drink Water"
            className="w-full px-4 py-4 bg-input rounded-xl text-white placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors"
          />
        </div>
        
        {/* Category */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-4 bg-input rounded-xl text-white border border-border focus:outline-none focus:border-white transition-colors appearance-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        
        {/* Frequency */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Frequency</label>
          <div className="grid grid-cols-2 gap-2">
            {frequencies.map((freq) => (
              <button
                key={freq}
                type="button"
                onClick={() => setFrequency(freq)}
                className={`py-3 rounded-xl font-medium transition-colors ${
                  frequency === freq
                    ? 'bg-white text-black'
                    : 'bg-secondary text-white hover:bg-accent'
                }`}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>
        
        {/* Metric Type */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Metric Type</label>
          <div className="grid grid-cols-2 gap-2">
            {metricTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMetricType(type)}
                className={`py-3 rounded-xl font-medium transition-colors ${
                  metricType === type
                    ? 'bg-white text-black'
                    : 'bg-secondary text-white hover:bg-accent'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        
        {/* Unit (if Quantity is selected) */}
        {metricType === 'Quantity' && (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-4 py-4 bg-input rounded-xl text-white border border-border focus:outline-none focus:border-white transition-colors appearance-none"
            >
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        )}
        
        {/* Goal */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">
            Goal {metricType === 'Quantity' && `(${unit})`}
          </label>
          <input
            type="number"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g., 2000"
            className="w-full px-4 py-4 bg-input rounded-xl text-white placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors"
          />
        </div>
        
        {/* Save Button */}
        <button
          type="submit"
          className="w-full py-4 bg-white text-black rounded-xl font-medium hover:bg-gray-100 transition-colors"
        >
          Save Habit
        </button>
      </form>
    </div>
  );
}
