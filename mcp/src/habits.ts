import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getSession, unwrap } from './client.js';
import { HabitRow, json, normalizeHabit, resolveGroup, resolveHabit, text, today } from './shared.js';
import { isAutoDone, withAutoDays } from '../../src/lib/habitState';
import { toLocalDateStr } from '../../src/lib/date';

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

/** Longest run of consecutive days ending today (or the most recent logged day). */
function currentStreak(logs: Record<string, number>): number {
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = toLocalDateStr(cursor);
    if (!(logs[key] > 0)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function fetchLogs(habit: HabitRow, days: number) {
  const { db, user } = await getSession();
  const from = new Date();
  from.setDate(from.getDate() - days);
  const fromStr = toLocalDateStr(from);

  const rows = unwrap(
    await db
      .from('habit_logs')
      .select('date, value')
      .eq('habit_id', habit.id)
      .eq('user_id', user.id)
      .gte('date', fromStr),
  );

  const logged: Record<string, number> = {};
  for (const r of rows as { date: string; value: number }[]) logged[r.date] = r.value;
  // Overlay the "Habit" state's auto-complete days, exactly as the app's screens do.
  return withAutoDays(habit, logged, fromStr, today());
}

export function registerHabitTools(server: McpServer) {
  server.registerTool(
    'list_habits',
    {
      title: 'List habits',
      description:
        "The user's habits with their status for a date (defaults to today). A habit whose " +
        'state is "habit" is one they have internalised: it counts as done every day and is ' +
        'not logged or checked off.',
      inputSchema: {
        date: DATE.optional().describe('Day to report status for. Defaults to today.'),
        include_archived: z.boolean().optional(),
      },
    },
    async ({ date, include_archived }) => {
      const { db, user } = await getSession();
      const day = date ?? today();

      let query = db.from('habits').select('*').eq('user_id', user.id).order('position');
      if (!include_archived) query = query.eq('archived', false);
      const habits = unwrap(await query).map(normalizeHabit);

      const logs = unwrap(
        await db.from('habit_logs').select('habit_id, value').eq('user_id', user.id).eq('date', day),
      );
      const byHabit = new Map((logs as { habit_id: string; value: number }[]).map(l => [l.habit_id, l.value]));

      const groups = unwrap(await db.from('habit_groups').select('id, name').eq('user_id', user.id));
      const groupName = new Map((groups as { id: string; name: string }[]).map(g => [g.id, g.name]));

      return json({
        date: day,
        habits: habits.map(h => {
          const auto = isAutoDone(h, day);
          const current = auto ? h.goal : byHabit.get(h.id) ?? 0;
          return {
            id: h.id,
            name: h.name,
            group: h.group_id ? groupName.get(h.group_id) ?? null : null,
            category: h.category,
            state: h.is_habit ? 'habit' : 'daily',
            habit_since: h.habit_since,
            metric_type: h.metric_type,
            unit: h.unit,
            current,
            goal: h.goal,
            done: current >= h.goal,
            auto_complete: auto,
            archived: h.archived,
          };
        }),
      });
    },
  );

  server.registerTool(
    'get_habit',
    {
      title: 'Get one habit',
      description: 'Full detail for a habit: config, today\'s progress, current streak, and recent history.',
      inputSchema: {
        habit: z.string().describe('Habit name or id.'),
        history_days: z.number().int().min(1).max(365).optional().describe('Days of history. Default 30.'),
      },
    },
    async ({ habit: ref, history_days }) => {
      const { db, user } = await getSession();
      const habit = await resolveHabit(db, user, ref, { includeArchived: true });
      const logs = await fetchLogs(habit, history_days ?? 30);
      const day = today();
      const current = isAutoDone(habit, day) ? habit.goal : logs[day] ?? 0;

      return json({
        ...habit,
        state: habit.is_habit ? 'habit' : 'daily',
        current,
        done: current >= habit.goal,
        current_streak: currentStreak(logs),
        days_logged: Object.values(logs).filter(v => v > 0).length,
        history: logs,
      });
    },
  );

  server.registerTool(
    'create_habit',
    {
      title: 'Create a habit',
      description: 'Create a new habit. Boolean habits are a simple done/not-done tick (goal 1).',
      inputSchema: {
        name: z.string().min(1),
        metric_type: z.enum(['boolean', 'count', 'duration', 'quantity']).default('boolean'),
        goal: z.number().positive().optional().describe('Required unless metric_type is boolean.'),
        unit: z.string().optional().describe('e.g. ml, pages, reps. Ignored for boolean/count/duration.'),
        category: z.string().optional().describe('Default "personal".'),
        group: z.string().optional().describe('Group name or id. Omit for ungrouped.'),
        frequency: z.enum(['daily', 'weekly', 'specific days', 'custom']).optional(),
        increments: z.array(z.number().positive()).length(3).optional(),
        icon: z.string().optional(),
        color: z.string().optional().describe('Hex, e.g. #22c55e.'),
        state: z.enum(['daily', 'habit']).optional().describe('"habit" = already internalised, always done.'),
      },
    },
    async (args) => {
      const { db, user } = await getSession();
      const isBoolean = args.metric_type === 'boolean';
      const group = args.group ? await resolveGroup(db, user, args.group) : null;
      const asHabit = args.state === 'habit';

      const row = unwrap(
        await db
          .from('habits')
          .insert({
            user_id: user.id,
            name: args.name,
            category: (args.category ?? 'personal').toLowerCase(),
            group_id: group?.id ?? null,
            metric_type: args.metric_type,
            unit: isBoolean
              ? 'done'
              : args.metric_type === 'count'
                ? 'times'
                : args.metric_type === 'duration'
                  ? 'min'
                  : args.unit ?? 'units',
            goal: isBoolean ? 1 : args.goal ?? 1,
            frequency: args.frequency ?? 'daily',
            increments: isBoolean ? [1] : args.increments ?? [10, 25, 50],
            icon: args.icon ?? 'circle',
            color: args.color ?? '#ffffff',
            archived: false,
            is_habit: asHabit,
            habit_since: asHabit ? today() : null,
          })
          .select('*')
          .single(),
      );

      return json({ created: normalizeHabit(row) });
    },
  );

  server.registerTool(
    'update_habit',
    {
      title: 'Update a habit',
      description: 'Change a habit\'s configuration. Only the fields you pass are touched.',
      inputSchema: {
        habit: z.string().describe('Habit name or id.'),
        name: z.string().optional(),
        goal: z.number().positive().optional(),
        unit: z.string().optional(),
        category: z.string().optional(),
        group: z.string().nullable().optional().describe('Group name or id; null to ungroup.'),
        frequency: z.enum(['daily', 'weekly', 'specific days', 'custom']).optional(),
        increments: z.array(z.number().positive()).length(3).optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
      },
    },
    async ({ habit: ref, group, ...fields }) => {
      const { db, user } = await getSession();
      const habit = await resolveHabit(db, user, ref);

      const updates: Record<string, unknown> = Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v !== undefined),
      );
      if (group !== undefined) {
        updates.group_id = group === null ? null : (await resolveGroup(db, user, group)).id;
      }
      if (Object.keys(updates).length === 0) return text('Nothing to update.');

      const row = unwrap(await db.from('habits').update(updates).eq('id', habit.id).select('*').single());
      return json({ updated: normalizeHabit(row) });
    },
  );

  server.registerTool(
    'log_habit',
    {
      title: 'Log habit progress',
      description:
        'Record progress for a habit on a date (defaults to today). Pass `done` to complete it ' +
        'outright, or `value` for a specific amount. Habits in the "habit" state are always done ' +
        'and cannot be logged.',
      inputSchema: {
        habit: z.string().describe('Habit name or id.'),
        value: z.number().min(0).optional().describe('Absolute value for the day.'),
        done: z.boolean().optional().describe('true = set to goal, false = clear the day.'),
        add: z.number().optional().describe('Add to the existing value instead of replacing it.'),
        date: DATE.optional(),
      },
    },
    async ({ habit: ref, value, done, add, date }) => {
      const { db, user } = await getSession();
      const habit = await resolveHabit(db, user, ref);
      const day = date ?? today();

      if (day > today()) throw new Error(`${day} is in the future.`);
      if (isAutoDone(habit, day)) {
        throw new Error(
          `"${habit.name}" is in the Habit state (since ${habit.habit_since}) — it already counts as ` +
            'done every day. Use set_habit_state to switch it back to daily tracking first.',
        );
      }
      if (value === undefined && done === undefined && add === undefined) {
        throw new Error('Pass one of value, done, or add.');
      }

      let next: number;
      if (add !== undefined) {
        const existing = unwrap(
          await db.from('habit_logs').select('value').eq('habit_id', habit.id).eq('date', day).maybeSingle(),
        ) as { value: number } | null;
        next = Math.min(Math.max((existing?.value ?? 0) + add, 0), habit.goal);
      } else if (value !== undefined) {
        next = Math.max(value, 0);
      } else {
        next = done ? habit.goal : 0;
      }

      unwrap(
        await db
          .from('habit_logs')
          .upsert(
            { habit_id: habit.id, user_id: user.id, date: day, value: next },
            { onConflict: 'habit_id,date' },
          )
          .select('date, value')
          .single(),
      );

      return text(
        `${habit.name} on ${day}: ${next}/${habit.goal}${next >= habit.goal ? ' — done' : ''}.`,
      );
    },
  );

  server.registerTool(
    'set_habit_state',
    {
      title: 'Set habit state',
      description:
        'Switch a habit between "daily" (checked off each day) and "habit" (internalised — counts ' +
        'as done every day from today onwards, with no check-in). Past logs are never rewritten.',
      inputSchema: {
        habit: z.string().describe('Habit name or id.'),
        state: z.enum(['daily', 'habit']),
      },
    },
    async ({ habit: ref, state }) => {
      const { db, user } = await getSession();
      const habit = await resolveHabit(db, user, ref);
      const asHabit = state === 'habit';

      const { error } = await db
        .from('habits')
        .update({ is_habit: asHabit, habit_since: asHabit ? today() : null })
        .eq('id', habit.id);

      if (error) {
        throw new Error(
          `${error.message}. If the column is missing, run supabase-migration-habit-state.sql first.`,
        );
      }

      return text(
        asHabit
          ? `"${habit.name}" is now a Habit — it counts as done every day from ${today()}.`
          : `"${habit.name}" is back to daily tracking.`,
      );
    },
  );

  server.registerTool(
    'archive_habit',
    {
      title: 'Archive a habit',
      description: 'Hide a habit from the app. Its logs are kept, matching the in-app Delete button.',
      inputSchema: { habit: z.string().describe('Habit name or id.') },
    },
    async ({ habit: ref }) => {
      const { db, user } = await getSession();
      const habit = await resolveHabit(db, user, ref);
      unwrap(await db.from('habits').update({ archived: true }).eq('id', habit.id).select('id').single());
      return text(`Archived "${habit.name}". Its history is still there if you unarchive it.`);
    },
  );

  server.registerTool(
    'get_habit_history',
    {
      title: 'Get habit history',
      description:
        'Day-by-day values for one habit, with "habit"-state days filled in. Use for streaks, ' +
        'trends, or answering "how often did I actually do this?".',
      inputSchema: {
        habit: z.string().describe('Habit name or id.'),
        days: z.number().int().min(1).max(365).optional().describe('Default 84.'),
      },
    },
    async ({ habit: ref, days }) => {
      const { db, user } = await getSession();
      const habit = await resolveHabit(db, user, ref, { includeArchived: true });
      const logs = await fetchLogs(habit, days ?? 84);
      const hit = Object.values(logs).filter(v => v >= habit.goal).length;

      return json({
        habit: habit.name,
        goal: habit.goal,
        unit: habit.unit,
        state: habit.is_habit ? 'habit' : 'daily',
        days_hit_goal: hit,
        days_with_any_progress: Object.values(logs).filter(v => v > 0).length,
        current_streak: currentStreak(logs),
        history: logs,
      });
    },
  );

  server.registerTool(
    'get_daily_summary',
    {
      title: 'Get daily summary',
      description: 'How a single day went across every active habit — what was done, what was missed.',
      inputSchema: { date: DATE.optional().describe('Defaults to today.') },
    },
    async ({ date }) => {
      const { db, user } = await getSession();
      const day = date ?? today();

      const habits = unwrap(
        await db.from('habits').select('*').eq('user_id', user.id).eq('archived', false).order('position'),
      ).map(normalizeHabit);

      const logs = unwrap(
        await db.from('habit_logs').select('habit_id, value').eq('user_id', user.id).eq('date', day),
      );
      const byHabit = new Map((logs as { habit_id: string; value: number }[]).map(l => [l.habit_id, l.value]));

      const rows = habits.map(h => {
        const current = isAutoDone(h, day) ? h.goal : byHabit.get(h.id) ?? 0;
        return { name: h.name, current, goal: h.goal, done: current >= h.goal, state: h.is_habit ? 'habit' : 'daily' };
      });
      const done = rows.filter(r => r.done);

      return json({
        date: day,
        completed: done.length,
        total: rows.length,
        completion_pct: rows.length ? Math.round((done.length / rows.length) * 100) : 0,
        done: done.map(r => r.name),
        missed: rows.filter(r => !r.done).map(r => `${r.name} (${r.current}/${r.goal})`),
        habits: rows,
      });
    },
  );
}
