import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getSession, unwrap } from './client.js';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { UUID_RE, json, text, today } from './shared.js';

const EXERCISE = z.object({
  name: z.string().min(1),
  target_sets: z.number().int().positive().optional(),
  target_reps_min: z.number().int().positive().optional(),
  target_reps_max: z.number().int().positive().optional(),
  rest_seconds: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

async function resolveTemplate(db: SupabaseClient, user: User, ref: string) {
  let query = db.from('workout_templates').select('*').eq('user_id', user.id);
  query = UUID_RE.test(ref) ? query.eq('id', ref) : query.ilike('name', ref);

  const rows = unwrap(await query);
  if (rows.length === 1) return rows[0] as { id: string; name: string };
  if (rows.length > 1) throw new Error(`"${ref}" matches more than one workout. Pass the id instead.`);

  const all = unwrap(await db.from('workout_templates').select('name').eq('user_id', user.id));
  throw new Error(
    `No workout matching "${ref}". Existing workouts: ${all.map((r: { name: string }) => r.name).join(', ') || '(none)'}`,
  );
}

export function registerWorkoutTools(server: McpServer) {
  server.registerTool(
    'list_workout_templates',
    {
      title: 'List workout templates',
      description: "The user's saved workouts and the exercises in each, with target sets/reps and rest.",
      inputSchema: {},
    },
    async () => {
      const { db, user } = await getSession();
      const templates = unwrap(
        await db.from('workout_templates').select('*').eq('user_id', user.id).order('position'),
      ) as { id: string }[];
      const exercises = unwrap(
        await db.from('workout_exercises').select('*').eq('user_id', user.id).order('position'),
      ) as { template_id: string }[];

      return json({
        templates: templates.map(t => ({
          ...t,
          exercises: exercises.filter(e => e.template_id === t.id),
        })),
      });
    },
  );

  server.registerTool(
    'create_workout_template',
    {
      title: 'Create a workout template',
      description: 'Create a reusable workout with its exercises. Optionally back it with a habit to tick off.',
      inputSchema: {
        name: z.string().min(1),
        description: z.string().optional(),
        exercises: z.array(EXERCISE).min(1),
        link_habit: z.boolean().optional().describe('Also create a boolean habit of the same name.'),
      },
    },
    async ({ name, description, exercises, link_habit }) => {
      const { db, user } = await getSession();

      let habit_id: string | null = null;
      if (link_habit) {
        const habit = unwrap(
          await db
            .from('habits')
            .insert({
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
              archived: false,
            })
            .select('id')
            .single(),
        );
        habit_id = habit.id;
      }

      const count = unwrap(await db.from('workout_templates').select('id').eq('user_id', user.id)).length;
      const template = unwrap(
        await db
          .from('workout_templates')
          .insert({ user_id: user.id, habit_id, name, description: description ?? null, position: count })
          .select('*')
          .single(),
      );

      const rows = unwrap(
        await db
          .from('workout_exercises')
          .insert(
            exercises.map((e, i) => ({
              template_id: template.id,
              user_id: user.id,
              name: e.name,
              target_sets: e.target_sets ?? 3,
              target_reps_min: e.target_reps_min ?? 8,
              target_reps_max: e.target_reps_max ?? 12,
              rest_seconds: e.rest_seconds ?? 120,
              notes: e.notes ?? null,
              position: i,
            })),
          )
          .select('*'),
      );

      return json({ created: { ...template, exercises: rows } });
    },
  );

  server.registerTool(
    'log_workout_session',
    {
      title: 'Log a completed workout',
      description:
        'Record a finished workout in one call: the session plus every set performed. Use this ' +
        'for a workout the user has already done, rather than starting a live session.',
      inputSchema: {
        workout: z.string().describe('Workout template name or id.'),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Defaults to today.'),
        duration_seconds: z.number().int().min(0).optional(),
        notes: z.string().optional(),
        sets: z
          .array(
            z.object({
              exercise_name: z.string().min(1),
              set_number: z.number().int().positive(),
              reps: z.number().int().min(0).optional(),
              weight: z.number().min(0).optional(),
            }),
          )
          .min(1),
      },
    },
    async ({ workout, date, duration_seconds, notes, sets }) => {
      const { db, user } = await getSession();
      const template = await resolveTemplate(db, user, workout);
      const day = date ?? today();

      const session = unwrap(
        await db
          .from('workout_sessions')
          .insert({
            user_id: user.id,
            template_id: template.id,
            template_name: template.name,
            date: day,
            completed_at: new Date().toISOString(),
            duration_seconds: duration_seconds ?? null,
            notes: notes ?? null,
          })
          .select('*')
          .single(),
      );

      unwrap(
        await db
          .from('workout_set_logs')
          .insert(
            sets.map(s => ({
              session_id: session.id,
              user_id: user.id,
              exercise_name: s.exercise_name,
              set_number: s.set_number,
              reps: s.reps ?? null,
              weight: s.weight ?? null,
            })),
          )
          .select('id'),
      );

      return text(`Logged "${template.name}" on ${day}: ${sets.length} sets across ${new Set(sets.map(s => s.exercise_name)).size} exercises.`);
    },
  );

  server.registerTool(
    'get_workout_history',
    {
      title: 'Get workout history',
      description: 'Past workout sessions with their set logs — for tracking volume and progression.',
      inputSchema: {
        workout: z.string().optional().describe('Template name or id. Omit for all workouts.'),
        limit: z.number().int().min(1).max(50).optional().describe('Default 10 sessions.'),
        include_sets: z.boolean().optional().describe('Include every set. Default true.'),
      },
    },
    async ({ workout, limit, include_sets }) => {
      const { db, user } = await getSession();

      let query = db
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(limit ?? 10);

      if (workout) query = query.eq('template_id', (await resolveTemplate(db, user, workout)).id);
      const sessions = unwrap(await query) as { id: string }[];

      if (include_sets === false || sessions.length === 0) return json({ sessions });

      const logs = unwrap(
        await db
          .from('workout_set_logs')
          .select('*')
          .in('session_id', sessions.map(s => s.id))
          .order('set_number'),
      ) as { session_id: string }[];

      return json({
        sessions: sessions.map(s => ({ ...s, sets: logs.filter(l => l.session_id === s.id) })),
      });
    },
  );
}
