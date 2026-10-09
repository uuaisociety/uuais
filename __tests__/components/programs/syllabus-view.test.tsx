import { render, screen } from '@testing-library/react';
import SyllabusView from '@/components/programs/SyllabusView';

const defaults = {
  planFormat: 'syllabus' as const,
  layout: ['Original syllabus prose names courses and alternatives.'],
  entryRequirements: 'Valid profile requirement',
  sourceUrl: 'https://www.uu.se/study-plan',
  programmeUrl: 'https://www.uu.se/utbildning/program/profile-a',
};

describe('SyllabusView', () => {
  it('preserves source prose and does not render inferred course rows', () => {
    render(<SyllabusView {...defaults} />);

    expect(screen.getByText(defaults.layout[0])).toBeInTheDocument();
    expect(
      screen.queryByText(/courses named in the plan/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/could not establish a verified course map/i),
    ).toBeInTheDocument();
  });

  it('links UGY2Y readers to the selected profile for entry requirements', () => {
    render(<SyllabusView {...defaults} hideEntryRequirements />);

    expect(
      screen.queryByText(defaults.entryRequirements),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /university programme page/i }),
    ).toHaveAttribute('href', defaults.programmeUrl);
  });
});
