import React from 'react';
import { render, screen } from '@testing-library/react';
import ProgramPage, { generateMetadata } from '@/app/programs/[code]/page';

jest.mock('@/lib/programs', () => ({
  getProgram: jest.fn(),
  getProgramIndex: () => ({ programmes: [] }),
  getSpecialisations: () => [],
  programSlug: (entry: { file: string }) => entry.file,
  isProgramMapBlocked: jest.requireActual('@/lib/programs').isProgramMapBlocked,
}));
jest.mock('@/lib/programs/format', () => ({
  programDisplayNames: () => ({ primary: 'Test programme', secondary: null }),
}));
jest.mock('@/components/programs/ProgramExplorer', () => ({
  __esModule: true,
  default: () => (
    <div data-testid="program-map">
      Map<h2>Rules from the study plan</h2>
    </div>
  ),
}));
jest.mock('@/components/programs/SyllabusView', () => ({
  __esModule: true,
  default: () => <div data-testid="syllabus-list">Syllabus list</div>,
}));
jest.mock('@/components/programs/ReportErrorDialog', () => ({
  __esModule: true,
  default: () => null,
}));

const { getProgram } = jest.requireMock('@/lib/programs') as {
  getProgram: jest.Mock;
};

const program = (safety: unknown, tracks: unknown[] = []) => ({
  id: 'id',
  code: 'TEST',
  revisionId: 'id',
  nameSv: 'Test programme',
  totalCredits: 120,
  semesters: 4,
  registrationNumber: null,
  finalisedDate: null,
  tracks,
  courses: [
    {
      code: '1AB123',
      titleSv: 'Coded course',
      titleEn: 'Coded course',
      semester: 1,
    },
  ],
  rules: [],
  edges: [],
  revisions: [],
  scrapedAt: '2026-01-01',
  sourceUrl: 'https://example.test/plan',
  validFrom: null,
  validFromYear: null,
  reviewed: false,
  programmeTitle: 'Test programme',
  programmeTitleEn: null,
  programmeUri: '',
  planFormat: 'legacy',
  faculty: 'Test',
  safety,
});

async function page() {
  const tree = await ProgramPage({ params: Promise.resolve({ code: 'test' }) });
  return render(tree);
}

describe('programme page source safety', () => {
  it('withholds the graph and syllabus list for blocked maps', async () => {
    getProgram.mockReturnValue(
      program({
        status: 'blocked',
        issues: [
          { kind: 'unsupported-structure', message: 'Alternative route' },
        ],
      }),
    );
    await page();
    expect(
      screen.getByRole('heading', { name: 'Course map unavailable' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open the official study plan' }),
    ).toHaveAttribute('href', 'https://example.test/plan');
    expect(screen.queryByTestId('program-map')).not.toBeInTheDocument();
    expect(screen.queryByTestId('syllabus-list')).not.toBeInTheDocument();
    expect(screen.queryByText('Coded course')).not.toBeInTheDocument();
    const metadata = await generateMetadata({
      params: Promise.resolve({ code: 'test' }),
    });
    expect(metadata.description).toContain('official study plan');
    expect(metadata.description).not.toContain('Course map for');
  });

  it('labels source prose by semester and specialisation rather than as course rows', async () => {
    getProgram.mockReturnValue(
      program(
        {
          status: 'warning',
          issues: [
            {
              kind: 'source-text-content',
              message: 'Source text',
              semester: 2,
              trackId: 'physics',
              textSv: 'Original source prose.',
            },
          ],
        },
        [
          {
            id: 'physics',
            specialisationSv: 'Fysik',
            profileSv: 'Kvantteknologi',
          },
        ],
      ),
    );
    await page();

    expect(
      screen.getByRole('heading', {
        name: /additional source text is not arranged as course rows/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent(
      'Semester 2: Specialisation Kvantteknologi: Original source prose.',
    );
  });

  it.each([undefined, { status: 'unexpected', issues: [] }])(
    'withholds unaudited maps (%p)',
    async (safety) => {
      getProgram.mockReturnValue(program(safety));
      await page();
      expect(screen.queryByTestId('program-map')).not.toBeInTheDocument();
      expect(screen.queryByTestId('syllabus-list')).not.toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Course map unavailable' }),
      ).toBeInTheDocument();
    },
  );

  it('shows warning source wording without inventing a course code', async () => {
    getProgram.mockReturnValue(
      program({
        status: 'warning',
        issues: [
          {
            kind: 'uncoded-credit-content',
            message: 'Credited source text',
            semester: 3,
            textSv: 'Scripting för leveldesign, 7,5 hp',
            textEn: 'Scripting for Level Design, 7.5 credits',
          },
        ],
      }),
    );
    await page();
    expect(
      screen.getByRole('heading', {
        name: /additional source text is not arranged as course rows/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Semester 3: Scripting for Level Design, 7.5 credits/),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Scripting för leveldesign, 7,5 hp'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/1[A-Z]{2}\d{3}/)).not.toBeInTheDocument();
    expect(screen.getByTestId('program-map')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /additional source text is not arranged as course rows/i,
      }),
    ).toAppearAfter(
      screen.getByRole('heading', { name: 'Rules from the study plan' }),
    );
  });
});
