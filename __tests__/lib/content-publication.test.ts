import {
  CODEX_AMBASSADOR_INTERVIEW_PUBLISH_AT,
  isCodexAmbassadorInterviewPublished,
} from '@/lib/content-publication';

describe('Codex ambassador interview publication time', () => {
  it('uses Stockholm local time and publishes at the exact boundary', () => {
    expect(CODEX_AMBASSADOR_INTERVIEW_PUBLISH_AT.toISOString()).toBe(
      '2026-10-22T08:00:00.000Z',
    );
    expect(
      isCodexAmbassadorInterviewPublished(
        new Date(CODEX_AMBASSADOR_INTERVIEW_PUBLISH_AT.getTime() - 1),
      ),
    ).toBe(false);
    expect(
      isCodexAmbassadorInterviewPublished(
        CODEX_AMBASSADOR_INTERVIEW_PUBLISH_AT,
      ),
    ).toBe(true);
    expect(
      isCodexAmbassadorInterviewPublished(
        new Date(CODEX_AMBASSADOR_INTERVIEW_PUBLISH_AT.getTime() + 1),
      ),
    ).toBe(true);
  });
});
