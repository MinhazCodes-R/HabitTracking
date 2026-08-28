import type { SupabaseClient, User } from '@supabase/supabase-js';
import { unwrap } from './client.js';
import { toLocalDateStr } from '../../src/lib/date';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const today = () => toLocalDateStr(new Date());

/** MCP tool results are plain text; JSON reads well and keeps field names explicit. */
export function json(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

export function text(message: string) {
  return { content: [{ type: 'text' as const, text: message }] };
}

export interface HabitRow {
  id: string;
  name: string;
  category: string;
  group_id: string | null;
  metric_type: string;
  unit: string;
  goal: number;
  frequency: string;
  increments: number[];
  icon: string;
  color: string;
  position: number;
  archived: boolean;
  is_habit: boolean;
  habit_since: string | null;
}

/**
 * is_habit / habit_since only exist once the habit-state migration has been run; default
 * them so the server still works against an un-migrated database.
 */
export function normalizeHabit(row: Record<string, unknown>): HabitRow {
  return {
    ...(row as unknown as HabitRow),
    increments: (row.increments as number[]) ?? [10, 25, 50],
    icon: (row.icon as string) ?? 'circle',
    color: (row.color as string) ?? '#ffffff',
    position: (row.position as number) ?? 0,
    archived: (row.archived as boolean) ?? false,
    is_habit: (row.is_habit as boolean) ?? false,
    habit_since: (row.habit_since as string) ?? null,
  };
}

/**
 * Resolve a habit by id or by name. Models generally have the name the user said, not a
 * uuid, so accept both and fail loudly when a name is ambiguous rather than guessing.
 */
export async function resolveHabit(
  db: SupabaseClient,
  user: User,
  ref: string,
  { includeArchived = false } = {},
): Promise<HabitRow> {
  let query = db.from('habits').select('*').eq('user_id', user.id);
  if (!includeArchived) query = query.eq('archived', false);

  query = UUID_RE.test(ref) ? query.eq('id', ref) : query.ilike('name', ref);

  const rows = unwrap(await query);
  if (rows.length === 1) return normalizeHabit(rows[0]);
  if (rows.length > 1) {
    const names = rows.map((r: { id: string; name: string }) => `${r.name} (${r.id})`).join(', ');
    throw new Error(`"${ref}" matches more than one habit: ${names}. Pass the id instead.`);
  }

  // Fall back to a substring match before giving up, then list what does exist.
  const all = unwrap(await db.from('habits').select('id, name').eq('user_id', user.id).eq('archived', false));
  const partial = all.filter((r: { name: string }) => r.name.toLowerCase().includes(ref.toLowerCase()));
  if (partial.length === 1) return resolveHabit(db, user, partial[0].id, { includeArchived });

  throw new Error(
    `No habit matching "${ref}". Existing habits: ${all.map((r: { name: string }) => r.name).join(', ') || '(none)'}`,
  );
}

/** Resolve a habit group by id or name, the same way. */
export async function resolveGroup(db: SupabaseClient, user: User, ref: string) {
  let query = db.from('habit_groups').select('*').eq('user_id', user.id);
  query = UUID_RE.test(ref) ? query.eq('id', ref) : query.ilike('name', ref);

  const rows = unwrap(await query);
  if (rows.length === 1) return rows[0] as { id: string; name: string; icon: string | null; color: string | null; position: number };
  if (rows.length > 1) throw new Error(`"${ref}" matches more than one group. Pass the id instead.`);

  const all = unwrap(await db.from('habit_groups').select('name').eq('user_id', user.id));
  throw new Error(
    `No group matching "${ref}". Existing groups: ${all.map((r: { name: string }) => r.name).join(', ') || '(none)'}`,
  );
}
