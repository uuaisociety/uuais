import type { ProgramCourseCategory, ProgramEdgeType } from '@/lib/programs';
import type { CourseStatus } from '@/lib/programs/status';

/** Category colours reuse the site's chart tokens, so dark mode comes free from .dark. */
export const CATEGORY_STYLE: Record<
  ProgramCourseCategory,
  { label: string; description: string; color: string }
> = {
  MANDATORY_CORE: {
    label: 'Mandatory core',
    description: 'Required for the degree',
    color: 'var(--chart-5)',
  },
  MANDATORY_ELECTIVE: {
    label: 'Mandatory elective',
    description: 'Choose within your specialisation',
    color: 'var(--chart-2)',
  },
  OPTIONAL_ELECTIVE: {
    label: 'Optional elective',
    description: 'Recommended but not required',
    color: 'var(--chart-4)',
  },
  PROJECT_THESIS: {
    label: 'Project / thesis',
    description: 'Capstone or degree project',
    color: 'var(--chart-3)',
  },
  OTHER: {
    label: 'Other / free elective',
    description: 'Other courses',
    color: 'var(--muted-foreground)',
  },
};

export const STATUS_STYLE: Record<CourseStatus, { label: string; color: string }> = {
  COMPLETED: { label: 'Completed', color: 'var(--chart-4)' },
  IN_PROGRESS: { label: 'In progress', color: 'var(--chart-2)' },
  UPCOMING: { label: 'Upcoming', color: 'var(--chart-3)' },
  NOT_STARTED: { label: 'Not started', color: 'var(--muted-foreground)' },
};

/**
 * At map zoom a 6/4 and a 2/4 dash read as the same grey line, so each type differs in colour
 * too; an exclusion can invalidate a degree, which is where the brand red earns its scarcity.
 */
export const EDGE_STYLE: Record<
  ProgramEdgeType,
  { label: string; description: string; dash?: string; color: string; opacity: number }
> = {
  HARD: {
    label: 'Hard requirement',
    description: 'You must pass the previous course',
    color: 'var(--muted-foreground)',
    opacity: 0.75,
  },
  SOFT: {
    label: 'Soft requirement',
    description: 'Recommended / should have taken',
    dash: '6 4',
    color: 'var(--chart-2)',
    opacity: 0.75,
  },
  EXCLUSIVE: {
    label: 'Exclusive',
    description: 'Cannot be combined in one degree',
    dash: '2 3',
    color: 'var(--destructive)',
    opacity: 0.85,
  },
};

/** Capped rather than fixed: a fixed 820px pane filled a phone screen and buried the rules. */
export const MAP_PANE_HEIGHT = 'clamp(26rem, calc(100vh - 15rem), 51rem)';
