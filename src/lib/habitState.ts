import { toLocalDateStr } from './date';

// A habit in the "Habit" state is one the user has internalised — they no longer want to
// tick it off every day. Every day from `habit_since` onwards defaults to Done without writing
// a habit_logs row. A logged row (including 0) overrides that default, so any day can still be
// flipped. Days before `habit_since` keep whatever was logged.
export interface HabitStateFields {
  goal: number;
  is_habit: boolean;
  habit_since: string | null;
}

/** True when `dateStr` (YYYY-MM-DD) falls inside the habit's default-done window. */
export function isAutoDone(habit: HabitStateFields, dateStr: string): boolean {
  if (!habit.is_habit || !habit.habit_since) return false;
  if (dateStr < habit.habit_since) return false;
  return dateStr <= toLocalDateStr(new Date());
}

/** The value for a date: an explicit log wins; otherwise the goal on default-done days. */
export function effectiveValue(habit: HabitStateFields, dateStr: string, logged: number | undefined): number {
  if (logged !== undefined) return logged;
  return isAutoDone(habit, dateStr) ? habit.goal : 0;
}

/**
 * Overlay auto-complete days onto a { date: value } log map. `from`/`to` bound the range to
 * fill (inclusive, YYYY-MM-DD); dates outside the auto window are left untouched.
 */
export function withAutoDays(
  habit: HabitStateFields,
  logs: Record<string, number>,
  from: string,
  to: string,
): Record<string, number> {
  if (!habit.is_habit || !habit.habit_since) return logs;

  const start = habit.habit_since > from ? habit.habit_since : from;
  const today = toLocalDateStr(new Date());
  const end = to < today ? to : today;
  if (start > end) return logs;

  const merged = { ...logs };
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cursor <= last) {
    const key = toLocalDateStr(cursor);
    if (merged[key] === undefined) merged[key] = habit.goal;
    cursor.setDate(cursor.getDate() + 1);
  }
  return merged;
}
