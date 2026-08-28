import { toLocalDateStr } from './date';

// A habit in the "Habit" state is one the user has internalised — they no longer want to
// tick it off every day. Every day from `habit_since` onwards counts as Done automatically,
// without writing a habit_logs row. Days before `habit_since` keep whatever was logged.
export interface HabitStateFields {
  goal: number;
  is_habit: boolean;
  habit_since: string | null;
}

/** True when `dateStr` (YYYY-MM-DD) falls inside the habit's auto-complete window. */
export function isAutoDone(habit: HabitStateFields, dateStr: string): boolean {
  if (!habit.is_habit || !habit.habit_since) return false;
  if (dateStr < habit.habit_since) return false;
  return dateStr <= toLocalDateStr(new Date());
}

/** The value to display for a date: the goal on auto days, otherwise what was logged. */
export function effectiveValue(habit: HabitStateFields, dateStr: string, logged: number): number {
  return isAutoDone(habit, dateStr) ? Math.max(logged, habit.goal) : logged;
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
    merged[key] = Math.max(merged[key] ?? 0, habit.goal);
    cursor.setDate(cursor.getDate() + 1);
  }
  return merged;
}
