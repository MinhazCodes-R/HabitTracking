export const qk = {
  habits: (userId: string) => ['user', userId, 'habits'] as const,
  logsDay: (userId: string, dateStr: string) =>
    ['user', userId, 'logs', 'day', dateStr] as const,
};
