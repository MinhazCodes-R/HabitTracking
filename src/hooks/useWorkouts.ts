import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/AuthContext';
import { toLocalDateStr } from '@/lib/date';
import type { PresetWorkout } from '@/lib/workoutPresets';

export interface WorkoutExercise {
  id: string;
  template_id: string;
  name: string;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  rest_seconds: number;
  notes: string | null;
  position: number;
}

export interface WorkoutTemplate {
  id: string;
  habit_id: string | null;
  name: string;
  description: string | null;
  position: number;
  exercises: WorkoutExercise[];
}

export interface WorkoutSession {
  id: string;
  template_id: string | null;
  template_name: string;
  date: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
}

export interface SetLog {
  id: string;
  session_id: string;
  exercise_name: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
}

export interface ExerciseDraft {
  name: string;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  rest_seconds: number;
  notes?: string | null;
}

export function useWorkouts() {
  const { user, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!user) { setTemplates([]); setLoading(false); return; }

    const { data: templatesData } = await supabase
      .from('workout_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true });

    if (!templatesData) { setLoading(false); return; }

    const { data: exercisesData } = await supabase
      .from('workout_exercises')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true });

    const byTemplate = new Map<string, WorkoutExercise[]>();
    (exercisesData ?? []).forEach(e => {
      const list = byTemplate.get(e.template_id) ?? [];
      list.push(e);
      byTemplate.set(e.template_id, list);
    });

    setTemplates(templatesData.map(t => ({ ...t, exercises: byTemplate.get(t.id) ?? [] })));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    fetchTemplates();
  }, [authLoading, fetchTemplates]);

  // Creates a linked habit so the workout shows up on the Home screen.
  const createLinkedHabit = async (name: string): Promise<string | null> => {
    if (!user) return null;
    const { data } = await supabase.from('habits').insert({
      user_id: user.id,
      name,
      category: 'fitness',
      metric_type: 'boolean',
      unit: 'done',
      goal: 1,
      frequency: 'weekly',
      increments: [1],
      icon: 'dumbbell',
      color: '#f97316',
      position: 999,
      archived: false,
    }).select('id').single();
    return data?.id ?? null;
  };

  const createTemplate = async (
    name: string,
    description: string | null,
    exercises: ExerciseDraft[],
    options: { linkHabit?: boolean } = {},
  ): Promise<string | null> => {
    if (!user) return null;

    const habit_id = options.linkHabit ? await createLinkedHabit(name) : null;

    const { data: template } = await supabase
      .from('workout_templates')
      .insert({ user_id: user.id, habit_id, name, description, position: templates.length })
      .select('id')
      .single();
    if (!template) return null;

    if (exercises.length > 0) {
      await supabase.from('workout_exercises').insert(
        exercises.map((e, i) => ({
          template_id: template.id,
          user_id: user.id,
          name: e.name,
          target_sets: e.target_sets,
          target_reps_min: e.target_reps_min,
          target_reps_max: e.target_reps_max,
          rest_seconds: e.rest_seconds,
          notes: e.notes ?? null,
          position: i,
        })),
      );
    }

    await fetchTemplates();
    return template.id;
  };

  const updateTemplate = async (
    templateId: string,
    name: string,
    description: string | null,
    exercises: ExerciseDraft[],
  ) => {
    if (!user) return;
    await supabase.from('workout_templates').update({ name, description }).eq('id', templateId);
    // Simplest correct approach: replace the exercise list wholesale.
    await supabase.from('workout_exercises').delete().eq('template_id', templateId);
    if (exercises.length > 0) {
      await supabase.from('workout_exercises').insert(
        exercises.map((e, i) => ({
          template_id: templateId,
          user_id: user.id,
          name: e.name,
          target_sets: e.target_sets,
          target_reps_min: e.target_reps_min,
          target_reps_max: e.target_reps_max,
          rest_seconds: e.rest_seconds,
          notes: e.notes ?? null,
          position: i,
        })),
      );
    }
    await fetchTemplates();
  };

  const deleteTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    if (template?.habit_id) {
      await supabase.from('habits').update({ archived: true }).eq('id', template.habit_id);
    }
    await supabase.from('workout_templates').delete().eq('id', templateId);
  };

  const importPresetWorkouts = async (workouts: PresetWorkout[]) => {
    for (const w of workouts) {
      await createTemplate(
        w.name,
        w.description,
        w.exercises.map(e => ({
          name: e.name,
          target_sets: e.sets,
          target_reps_min: e.repsMin,
          target_reps_max: e.repsMax,
          rest_seconds: e.rest,
          notes: e.notes ?? null,
        })),
        { linkHabit: true },
      );
    }
  };

  // ---- Sessions ----

  const startSession = async (template: WorkoutTemplate): Promise<string | null> => {
    if (!user) return null;
    const { data } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        template_id: template.id,
        template_name: template.name,
        date: toLocalDateStr(new Date()),
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    return data?.id ?? null;
  };

  const logSet = async (
    sessionId: string,
    exerciseName: string,
    setNumber: number,
    reps: number | null,
    weight: number | null,
  ) => {
    if (!user) return;
    await supabase.from('workout_set_logs').insert({
      session_id: sessionId,
      user_id: user.id,
      exercise_name: exerciseName,
      set_number: setNumber,
      reps,
      weight,
      completed_at: new Date().toISOString(),
    });
  };

  const finishSession = async (
    sessionId: string,
    template: WorkoutTemplate,
    durationSeconds: number,
    notes: string | null,
  ) => {
    if (!user) return;
    await supabase
      .from('workout_sessions')
      .update({
        completed_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        notes,
      })
      .eq('id', sessionId);

    // Mark the linked habit done for today so streaks keep working.
    if (template.habit_id) {
      await supabase.from('habit_logs').upsert(
        { habit_id: template.habit_id, user_id: user.id, date: toLocalDateStr(new Date()), value: 1 },
        { onConflict: 'habit_id,date' },
      );
    }
  };

  const discardSession = async (sessionId: string) => {
    await supabase.from('workout_set_logs').delete().eq('session_id', sessionId);
    await supabase.from('workout_sessions').delete().eq('id', sessionId);
  };

  const getSessionHistory = async (templateId: string, limit = 10): Promise<WorkoutSession[]> => {
    if (!user) return [];
    const { data } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('template_id', templateId)
      .not('completed_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(limit);
    return data ?? [];
  };

  // Last completed session's sets, used to prefill weights/reps ("beat last time").
  const getLastSessionSets = async (templateId: string): Promise<Map<string, SetLog[]>> => {
    const map = new Map<string, SetLog[]>();
    if (!user) return map;

    const sessions = await getSessionHistory(templateId, 1);
    if (sessions.length === 0) return map;

    const { data } = await supabase
      .from('workout_set_logs')
      .select('*')
      .eq('session_id', sessions[0].id)
      .order('set_number', { ascending: true });

    (data ?? []).forEach(log => {
      const list = map.get(log.exercise_name) ?? [];
      list.push(log);
      map.set(log.exercise_name, list);
    });
    return map;
  };

  const getSessionSets = async (sessionId: string): Promise<SetLog[]> => {
    if (!user) return [];
    const { data } = await supabase
      .from('workout_set_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('completed_at', { ascending: true });
    return data ?? [];
  };

  return {
    templates,
    loading,
    refetch: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    importPresetWorkouts,
    startSession,
    logSet,
    finishSession,
    discardSession,
    getSessionHistory,
    getLastSessionSets,
    getSessionSets,
  };
}
