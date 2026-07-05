import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { X, Plus, Trash2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { useWorkouts, type ExerciseDraft } from '@/hooks/useWorkouts';

const emptyExercise = (): ExerciseDraft => ({
  name: '',
  target_sets: 3,
  target_reps_min: 8,
  target_reps_max: 12,
  rest_seconds: 120,
  notes: '',
});

export function WorkoutBuilderScreen() {
  const navigate = useNavigate();
  const { id } = useParams(); // present in edit mode
  const { templates, loading, createTemplate, updateTemplate } = useWorkouts();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<ExerciseDraft[]>([emptyExercise()]);
  const [linkHabit, setLinkHabit] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const editing = Boolean(id);

  useEffect(() => {
    if (!editing || loading || hydrated) return;
    const template = templates.find(t => t.id === id);
    if (!template) return;
    setName(template.name);
    setDescription(template.description ?? '');
    setExercises(template.exercises.map(e => ({
      name: e.name,
      target_sets: e.target_sets,
      target_reps_min: e.target_reps_min,
      target_reps_max: e.target_reps_max,
      rest_seconds: e.rest_seconds,
      notes: e.notes ?? '',
    })));
    setHydrated(true);
  }, [editing, loading, hydrated, id, templates]);

  const setField = (index: number, field: keyof ExerciseDraft, value: string | number) => {
    setExercises(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const move = (index: number, dir: -1 | 1) => {
    setExercises(prev => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = exercises.filter(x => x.name.trim().length > 0);
    if (valid.length === 0) return;
    setSaving(true);
    if (editing && id) {
      await updateTemplate(id, name, description || null, valid);
    } else {
      await createTemplate(name, description || null, valid, { linkHabit });
    }
    navigate('/workouts');
  };

  const numInput = (value: number, onChange: (n: number) => void, min = 0, max = 999) => (
    <input
      type="number" value={value} min={min} max={max}
      onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
      className="w-full px-2 py-2 bg-input rounded-lg text-white text-center text-sm border border-border focus:outline-none focus:border-white transition-colors"
    />
  );

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto">
      <div className="flex items-center justify-between px-6 pt-12 pb-6">
        <h1 className="text-2xl font-medium text-white">{editing ? 'Edit Workout' : 'New Workout'}</h1>
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      <form onSubmit={handleSave} className="px-6 space-y-6 pb-12">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Workout Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Monday — Chest + Abs" required
            className="w-full px-4 py-4 bg-input rounded-xl text-white placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors" />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Description (optional)</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Focus, cues, intensity notes…"
            className="w-full px-4 py-4 bg-input rounded-xl text-white placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors" />
        </div>

        <div className="space-y-3">
          <label className="text-sm text-muted-foreground">Exercises</label>

          {exercises.map((ex, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 border border-border space-y-3">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                <input type="text" value={ex.name} onChange={e => setField(i, 'name', e.target.value)} placeholder="Exercise name"
                  className="flex-1 px-3 py-2.5 bg-input rounded-lg text-white text-sm placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors" />
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                  className="p-1.5 text-muted-foreground hover:text-white disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === exercises.length - 1}
                  className="p-1.5 text-muted-foreground hover:text-white disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                <button type="button" onClick={() => setExercises(prev => prev.filter((_, j) => j !== i))}
                  className="p-1.5 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 text-center">Sets</p>
                  {numInput(ex.target_sets, n => setField(i, 'target_sets', n), 1, 20)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 text-center">Reps min</p>
                  {numInput(ex.target_reps_min, n => setField(i, 'target_reps_min', n), 1)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 text-center">Reps max</p>
                  {numInput(ex.target_reps_max, n => setField(i, 'target_reps_max', n), 1)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 text-center">Rest (s)</p>
                  {numInput(ex.rest_seconds, n => setField(i, 'rest_seconds', n), 0, 900)}
                </div>
              </div>

              <input type="text" value={ex.notes ?? ''} onChange={e => setField(i, 'notes', e.target.value)} placeholder="Notes (e.g., slow negatives, per leg)"
                className="w-full px-3 py-2 bg-input rounded-lg text-white text-sm placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors" />
            </div>
          ))}

          <button type="button" onClick={() => setExercises(prev => [...prev, emptyExercise()])}
            className="w-full py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-white hover:border-white transition-colors text-sm flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Add exercise
          </button>
        </div>

        {!editing && (
          <label className="flex items-center justify-between bg-card rounded-2xl p-4 border border-border cursor-pointer">
            <div>
              <p className="text-white text-sm font-medium">Track as a habit</p>
              <p className="text-xs text-muted-foreground">Adds this workout to your Home screen; finishing a session checks it off.</p>
            </div>
            <input type="checkbox" checked={linkHabit} onChange={e => setLinkHabit(e.target.checked)} className="w-5 h-5 accent-white" />
          </label>
        )}

        <button type="submit" disabled={saving || !name.trim()}
          className="w-full py-4 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Workout'}
        </button>
      </form>
    </div>
  );
}
