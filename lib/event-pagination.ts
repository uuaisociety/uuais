export const EVENT_PAGE_SIZE = 9;
const EVENT_DATE_BOUNDARY_DAYS = 2;

// Include a boundary window because legacy event dates mix local datetime strings and UTC timestamps.

export function recentEventsLowerBound(asOf: Date): string {
  const bound = new Date(asOf);
  bound.setUTCDate(bound.getUTCDate() - EVENT_DATE_BOUNDARY_DAYS);
  return bound.toISOString().slice(0, 10);
}

export function pastEventsUpperBound(asOf: Date): string {
  const bound = new Date(asOf);
  bound.setUTCDate(bound.getUTCDate() + EVENT_DATE_BOUNDARY_DAYS);
  return bound.toISOString().slice(0, 10);
}
