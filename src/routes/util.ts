export function toIdArray(value: string | string[] | undefined): number[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).map(Number);
}
