export function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function displayUnit(metric_type: string, unit: string): string {
  if (metric_type === 'boolean') return '';
  if (metric_type === 'count') return 'times';
  if (metric_type === 'duration') return 'min';
  return unit;
}
