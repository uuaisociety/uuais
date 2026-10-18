import { render, screen } from '@testing-library/react';
import { ReactFlowProvider, type NodeProps } from 'reactflow';
import ElectivePoolNode, {
  type ElectivePoolData,
} from '@/components/programs/ElectivePoolNode';
import ProgramRules from '@/components/programs/ProgramRules';
import { CATEGORY_STYLE } from '@/components/programs/constants';
import type { ProgramCourse, ProgramRule } from '@/lib/programs';

function rule(overrides: Partial<ProgramRule> = {}): ProgramRule {
  return {
    id: 'rule-9',
    type: 'NOTE',
    courseCodes: [],
    semester: 5,
    trackId: null,
    textSv: 'Ekonomistyrning för ingenjörer, 5 hp (FÖ0498 SLU)',
    labelEn: 'Financial Management for Engineers, 7.5 credits',
    cohortBefore: null,
    source: 'llm',
    ...overrides,
  };
}

describe('programme source labels', () => {
  it('uses neutral labels when the source does not mark a course compulsory', () => {
    expect(CATEGORY_STYLE.OPTIONAL_ELECTIVE.label).toBe('Listed course');
    expect(CATEGORY_STYLE.OPTIONAL_ELECTIVE.description).toMatch(
      /does not mark this course compulsory/i,
    );
    expect(CATEGORY_STYLE.MANDATORY_ELECTIVE.label).toBe(
      'Specialisation course',
    );
    expect(CATEGORY_STYLE.MANDATORY_ELECTIVE.description).toMatch(
      /does not mark it compulsory/i,
    );
  });

  it('does not call a pool elective or aggregate its credits as semester load', () => {
    const props = {
      data: {
        semester: 2,
        courses: [
          {
            code: 'FÖ0498',
            credits: 5,
            titleSv: 'Economy',
            titleEn: 'Economy',
          } as ProgramCourse,
        ],
        onOpen: jest.fn(),
      },
    } as NodeProps<ElectivePoolData>;

    render(
      <ReactFlowProvider>
        <ElectivePoolNode {...props} />
      </ReactFlowProvider>,
    );

    expect(screen.getByText('Additional listed courses')).toBeInTheDocument();
    expect(
      screen.queryByText(/to choose from|hp offered/i),
    ).not.toBeInTheDocument();
  });

  it('hides unreviewed English summaries while preserving source wording and verified plan labels', () => {
    render(
      <ProgramRules
        rules={[
          rule(),
          rule({
            id: 'rule-plan',
            source: 'plan',
            textSv: 'Välj en av dessa kurser:',
            labelEn: 'Choose one of these courses:',
          }),
        ]}
      />,
    );

    expect(
      screen.getByText('Ekonomistyrning för ingenjörer, 5 hp (FÖ0498 SLU)'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Financial Management for Engineers, 7.5 credits'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Choose one of these courses:'),
    ).toBeInTheDocument();
  });
});
