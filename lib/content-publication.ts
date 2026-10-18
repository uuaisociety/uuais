export const CODEX_AMBASSADOR_INTERVIEW_PUBLISH_AT = new Date(
  '2026-10-22T10:00:00+02:00',
);

export function isCodexAmbassadorInterviewPublished(
  now: Date = new Date(),
): boolean {
  return now.getTime() >= CODEX_AMBASSADOR_INTERVIEW_PUBLISH_AT.getTime();
}
