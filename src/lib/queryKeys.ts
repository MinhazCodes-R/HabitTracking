// All user-scoped keys start with ['user', uid] so sign-out can drop the whole
// subtree, and everything derived from habit_logs lives under ['user', uid, 'logs']
// so a single invalidation covers every screen after a log write.
export const qk = {
  user: (uid: string) => ['user', uid] as const,
  habits: (uid: string, today: string) => ['user', uid, 'habits', today] as const,
  groups: (uid: string) => ['user', uid, 'groups'] as const,
  profile: (uid: string) => ['user', uid, 'profile'] as const,
  feed: (uid: string) => ['user', uid, 'feed'] as const,
  thread: (uid: string, postId: string) => ['user', uid, 'thread', postId] as const,
  logs: (uid: string) => ['user', uid, 'logs'] as const,
  habitLogs: (uid: string, habitId: string) => ['user', uid, 'logs', 'habit', habitId] as const,
  monthLogs: (uid: string, habitId: string, year: number, month: number) =>
    ['user', uid, 'logs', 'month', habitId, year, month] as const,
  dayLogs: (uid: string, year: number, month: number) =>
    ['user', uid, 'logs', 'day', year, month] as const,
  weeklyStats: (uid: string, weekStart: string) =>
    ['user', uid, 'logs', 'weekly', weekStart] as const,
};

// Anonymous visitors can still read the public feed and threads.
export const ANON = 'anon';
