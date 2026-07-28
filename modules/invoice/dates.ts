export function toUtcStartOfDay(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`;
}

export function toUtcEndOfDay(dateStr: string): string {
  return `${dateStr}T23:59:59.999Z`;
}
