import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Plus, Dumbbell, Play, Pencil, Trash2, ChevronDown, ChevronRight, Download, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { BottomNav } from '../components/BottomNav';
import { useWorkouts, type WorkoutTemplate, type WorkoutSession } from '@/hooks/useWorkouts';
import { workoutPresets } from '@/lib/workoutPresets';

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

function TemplateCard({ template, onDelete, onHistory, history }: {
  template: WorkoutTemplate;
  onDelete: () => void;
  onHistory: () => void;
  history: WorkoutSession[] | undefined;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && history === undefined) onHistory();
  };

  return (
    <div className="bg-card rounded-2xl p-5 border border-border">
      <div className="flex items-start justify-between gap-3">
        <button onClick={toggle} className="flex items-start gap-3 flex-1 text-left">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
            <Dumbbell className="w-5 h-5 text-orange-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-white font-medium leading-tight">{template.name}</h3>
            <p className="text-sm text-muted-foreground">
              {template.exercises.length} exercise{template.exercises.length === 1 ? '' : 's'}
            </p>
          </div>
        </button>
        {expanded
          ? <ChevronDown className="w-4 h-4 text-muted-foreground mt-3 shrink-0" />
          : <ChevronRight className="w-4 h-4 text-muted-foreground mt-3 shrink-0" />}
      </div>

      {expanded && (
        <div className="mt-4 space-y-1">
          {template.exercises.map(e => (
            <div key={e.id} className="flex items-center justify-between text-sm py-1">
              <span className="text-white truncate pr-2">{e.name}</span>
              <span className="text-muted-foreground shrink-0">
                {e.target_sets} × {e.target_reps_min === e.target_reps_max ? e.target_reps_min : `${e.target_reps_min}–${e.target_reps_max}`}
              </span>
            </div>
          ))}

          {history !== undefined && (
            <div className="pt-3 mt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Recent sessions</p>
              {history.length === 0
                ? <p className="text-sm text-muted-foreground">No sessions yet.</p>
                : history.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-sm py-1">
                    <span className="text-white">{s.date}</span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />{formatDuration(s.duration_seconds)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => navigate(`/workouts/${template.id}/session`)}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
          <Play className="w-4 h-4" /> Start
        </button>
        <button
          onClick={() => navigate(`/workouts/${template.id}/edit`)}
          className="px-4 py-2.5 rounded-xl bg-secondary text-white hover:bg-accent transition-colors">
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="px-4 py-2.5 rounded-xl bg-secondary text-red-400 hover:bg-accent transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function WorkoutsScreen() {
  const { templates, loading, deleteTemplate, importPresetWorkouts, getSessionHistory } = useWorkouts();
  const [importing, setImporting] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [histories, setHistories] = useState<Record<string, WorkoutSession[]>>({});

  const loadHistory = async (templateId: string) => {
    const sessions = await getSessionHistory(templateId, 5);
    setHistories(prev => ({ ...prev, [templateId]: sessions }));
  };

  const handleImport = async (presetId: string) => {
    const preset = workoutPresets.find(p => p.id === presetId);
    if (!preset) return;
    setImporting(true);
    await importPresetWorkouts(preset.workouts);
    setImporting(false);
    setShowPresets(false);
    toast.success(`Imported ${preset.workouts.length} workouts + linked habits`);
  };

  const handleDelete = async (template: WorkoutTemplate) => {
    if (!confirm(`Delete "${template.name}"? Past sessions are kept, the linked habit is archived.`)) return;
    await deleteTemplate(template.id);
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-28">
      <div className="flex items-center justify-between px-6 pt-12 pb-6">
        <h1 className="text-2xl font-medium text-white">Workouts</h1>
        <Link to="/workouts/new" className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-colors">
          <Plus className="w-5 h-5 text-black" />
        </Link>
      </div>

      <div className="px-6 space-y-4">
        {loading && <p className="text-muted-foreground text-sm">Loading…</p>}

        {!loading && templates.length === 0 && (
          <div className="bg-card rounded-2xl p-6 border border-border text-center">
            <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-white font-medium mb-1">No workouts yet</p>
            <p className="text-sm text-muted-foreground mb-4">Build your own or import a ready-made split.</p>
          </div>
        )}

        {templates.map(t => (
          <TemplateCard
            key={t.id}
            template={t}
            history={histories[t.id]}
            onHistory={() => loadHistory(t.id)}
            onDelete={() => handleDelete(t)}
          />
        ))}

        {/* Preset import */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <button onClick={() => setShowPresets(v => !v)}
            className="w-full flex items-center justify-between p-5 text-left">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-muted-foreground" />
              <span className="text-white font-medium">Import a preset split</span>
            </div>
            {showPresets ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showPresets && workoutPresets.map(preset => (
            <div key={preset.id} className="px-5 pb-5">
              <p className="text-white text-sm font-medium">{preset.name}</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">{preset.description}</p>
              <div className="space-y-1 mb-4">
                {preset.workouts.map(w => (
                  <p key={w.name} className="text-xs text-muted-foreground">• {w.name}</p>
                ))}
              </div>
              <button
                onClick={() => handleImport(preset.id)}
                disabled={importing}
                className="w-full py-2.5 rounded-xl text-sm font-medium bg-secondary text-white hover:bg-accent transition-colors disabled:opacity-50">
                {importing ? 'Importing…' : `Import all ${preset.workouts.length} workouts`}
              </button>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
