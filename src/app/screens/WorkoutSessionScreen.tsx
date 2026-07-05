import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { X, Check, Plus, Timer, SkipForward, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkouts, type WorkoutTemplate, type SetLog } from '@/hooks/useWorkouts';

interface SetState {
  weight: string;
  reps: string;
  done: boolean;
}

interface ExerciseState {
  name: string;
  restSeconds: number;
  notes: string | null;
  repsLabel: string;
  sets: SetState[];
  prev: SetLog[]; // last session's sets, for placeholders
}

function fmtClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function WorkoutSessionScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const {
    templates, loading,
    startSession, logSet, finishSession, discardSession, getLastSessionSets,
  } = useWorkouts();

  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseState[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [restLeft, setRestLeft] = useState<number | null>(null);
  const [restLabel, setRestLabel] = useState('');
  const [finishing, setFinishing] = useState(false);
  const startedRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());

  // Boot: find template, create session row, prefill from last session
  useEffect(() => {
    if (loading || startedRef.current) return;
    const t = templates.find(x => x.id === id);
    if (!t) return;
    startedRef.current = true;
    setTemplate(t);

    (async () => {
      const [sid, prevSets] = await Promise.all([startSession(t), getLastSessionSets(t.id)]);
      setSessionId(sid);
      startTimeRef.current = Date.now();
      setExercises(t.exercises.map(e => ({
        name: e.name,
        restSeconds: e.rest_seconds,
        notes: e.notes,
        repsLabel: e.target_reps_min === e.target_reps_max
          ? String(e.target_reps_min)
          : `${e.target_reps_min}–${e.target_reps_max}`,
        sets: Array.from({ length: e.target_sets }, () => ({ weight: '', reps: '', done: false })),
        prev: prevSets.get(e.name) ?? [],
      })));
    })();
  }, [loading, templates, id]);

  // Overall stopwatch
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Rest countdown
  useEffect(() => {
    if (restLeft === null) return;
    if (restLeft <= 0) {
      setRestLeft(null);
      toast('Rest over — next set!', { icon: '💪' });
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      return;
    }
    const timeout = setTimeout(() => setRestLeft(v => (v === null ? null : v - 1)), 1000);
    return () => clearTimeout(timeout);
  }, [restLeft]);

  const setField = (ei: number, si: number, field: 'weight' | 'reps', value: string) => {
    setExercises(prev => prev.map((e, i) => i !== ei ? e : {
      ...e,
      sets: e.sets.map((s, j) => j !== si ? s : { ...s, [field]: value }),
    }));
  };

  const completeSet = (ei: number, si: number) => {
    const ex = exercises[ei];
    const set = ex.sets[si];
    if (set.done) return;

    setExercises(prev => prev.map((e, i) => i !== ei ? e : {
      ...e,
      sets: e.sets.map((s, j) => j !== si ? s : { ...s, done: true }),
    }));

    if (sessionId) {
      logSet(
        sessionId, ex.name, si + 1,
        set.reps === '' ? null : Number(set.reps),
        set.weight === '' ? null : Number(set.weight),
      );
    }

    // Don't start a rest timer after the very last set of the workout
    const isLastSetOfExercise = si === ex.sets.length - 1;
    const isLastExercise = ei === exercises.length - 1;
    if (!(isLastSetOfExercise && isLastExercise) && ex.restSeconds > 0) {
      setRestLeft(ex.restSeconds);
      setRestLabel(ex.name);
    }
  };

  const addSet = (ei: number) => {
    setExercises(prev => prev.map((e, i) => i !== ei ? e : {
      ...e,
      sets: [...e.sets, { weight: '', reps: '', done: false }],
    }));
  };

  const doneCount = exercises.reduce((acc, e) => acc + e.sets.filter(s => s.done).length, 0);
  const totalCount = exercises.reduce((acc, e) => acc + e.sets.length, 0);

  const handleFinish = async () => {
    if (!sessionId || !template) return;
    if (doneCount === 0 && !confirm('No sets logged. Finish anyway?')) return;
    setFinishing(true);
    await finishSession(sessionId, template, elapsed, null);
    toast.success(`${template.name} done — ${fmtClock(elapsed)}, ${doneCount} sets`);
    navigate('/workouts');
  };

  const handleQuit = async () => {
    if (!confirm('Discard this session? Logged sets will be deleted.')) return;
    if (sessionId) await discardSession(sessionId);
    navigate('/workouts');
  };

  if (loading || !template) {
    return (
      <div className="min-h-screen bg-background max-w-md mx-auto flex items-center justify-center">
        <p className="text-muted-foreground">Loading workout…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-40">
      {/* Header with stopwatch */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-6 pt-10 pb-4">
          <div>
            <h1 className="text-lg font-medium text-white leading-tight">{template.name}</h1>
            <p className="text-sm text-muted-foreground tabular-nums">
              {fmtClock(elapsed)} · {doneCount}/{totalCount} sets
            </p>
          </div>
          <button onClick={handleQuit} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="h-1 bg-secondary">
          <div className="h-full bg-orange-400 transition-all duration-300" style={{ width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Exercises */}
      <div className="px-6 pt-6 space-y-6">
        {exercises.map((ex, ei) => (
          <div key={ei} className="bg-card rounded-2xl p-5 border border-border">
            <div className="mb-1 flex items-baseline justify-between">
              <h3 className="text-white font-medium">{ex.name}</h3>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">target {ex.repsLabel} reps</span>
            </div>
            {ex.notes && <p className="text-xs text-muted-foreground mb-3">{ex.notes}</p>}

            <div className="grid grid-cols-[2rem_1fr_1fr_3rem] gap-2 items-center text-xs text-muted-foreground mb-1 mt-3">
              <span>Set</span><span className="text-center">Weight</span><span className="text-center">Reps</span><span />
            </div>

            {ex.sets.map((set, si) => {
              const prev = ex.prev[si];
              const prevHint = prev ? `${prev.weight ?? '–'} × ${prev.reps ?? '–'}` : '';
              return (
                <div key={si} className="grid grid-cols-[2rem_1fr_1fr_3rem] gap-2 items-center py-1">
                  <span className={`text-sm tabular-nums ${set.done ? 'text-green-400' : 'text-muted-foreground'}`}>{si + 1}</span>
                  <input
                    type="number" inputMode="decimal" value={set.weight}
                    onChange={e => setField(ei, si, 'weight', e.target.value)}
                    placeholder={prev?.weight != null ? String(prev.weight) : 'lbs/kg'}
                    disabled={set.done}
                    className="px-2 py-2.5 bg-input rounded-lg text-white text-sm text-center placeholder:text-muted-foreground/60 border border-border focus:outline-none focus:border-white transition-colors disabled:opacity-60" />
                  <input
                    type="number" inputMode="numeric" value={set.reps}
                    onChange={e => setField(ei, si, 'reps', e.target.value)}
                    placeholder={prev?.reps != null ? String(prev.reps) : ex.repsLabel}
                    disabled={set.done}
                    className="px-2 py-2.5 bg-input rounded-lg text-white text-sm text-center placeholder:text-muted-foreground/60 border border-border focus:outline-none focus:border-white transition-colors disabled:opacity-60" />
                  <button
                    onClick={() => completeSet(ei, si)}
                    disabled={set.done}
                    title={prevHint ? `Last time: ${prevHint}` : undefined}
                    className={`h-10 rounded-lg flex items-center justify-center transition-colors ${
                      set.done ? 'bg-green-400/20 text-green-400' : 'bg-secondary text-white hover:bg-accent'
                    }`}>
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            <button onClick={() => addSet(ei)}
              className="mt-2 text-xs text-muted-foreground hover:text-white transition-colors flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add set
            </button>
          </div>
        ))}

        <button onClick={handleFinish} disabled={finishing}
          className="w-full py-4 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          <Flag className="w-4 h-4" /> {finishing ? 'Saving…' : 'Finish Workout'}
        </button>
      </div>

      {/* Rest timer overlay */}
      {restLeft !== null && (
        <div className="fixed bottom-0 left-0 right-0 z-20">
          <div className="max-w-md mx-auto m-4 bg-card border border-orange-400/40 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Timer className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-white font-medium tabular-nums text-lg leading-tight">{fmtClock(restLeft)}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[10rem]">Rest — {restLabel}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setRestLeft(v => (v ?? 0) + 30)}
                  className="px-3 py-2 rounded-lg bg-secondary text-white text-sm hover:bg-accent transition-colors">+30s</button>
                <button onClick={() => setRestLeft(0)}
                  className="px-3 py-2 rounded-lg bg-secondary text-white text-sm hover:bg-accent transition-colors flex items-center gap-1">
                  <SkipForward className="w-3.5 h-3.5" /> Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
