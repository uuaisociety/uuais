import {
  useState,
  type ButtonHTMLAttributes,
  type ComponentType,
  type PropsWithChildren,
} from 'react';
import type { Node } from 'reactflow';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import ProgramCanvas from '@/components/programs/ProgramCanvas';
import type { ProgramCourseNodeData } from '@/components/programs/ProgramCourseNode';
import { getProgram } from '@/lib/programs';
import { deriveStatuses } from '@/lib/programs/status';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('reactflow', () => {
  return {
    __esModule: true,
    default: ({
      nodes,
      nodeTypes,
    }: {
      nodes: Node<ProgramCourseNodeData>[];
      nodeTypes: Record<
        string,
        ComponentType<{ id: string; data: ProgramCourseNodeData }>
      >;
    }) => (
      <div data-testid="flow">
        {nodes
          .filter((node) => node.type === 'programCourse')
          .map((node) => {
            const Component = nodeTypes[node.type!];
            return (
              <div
                key={node.id}
                data-placement={node.id}
                data-z-index={node.zIndex}
              >
                <Component id={node.id} data={node.data} />
              </div>
            );
          })}
      </div>
    ),
    Background: () => null,
    Controls: () => null,
    ControlButton: ({
      children,
      ...props
    }: ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
    MarkerType: { ArrowClosed: 'arrowclosed' },
    Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
    ReactFlowProvider: ({ children }: PropsWithChildren) => <>{children}</>,
    Handle: () => null,
    getNodesBounds: () => ({ x: 0, y: 0, width: 0, height: 0 }),
    useNodesInitialized: () => false,
    useReactFlow: () => ({
      fitView: jest.fn(),
      getNodes: () => [],
      getViewport: () => ({ zoom: 1 }),
      setViewport: jest.fn(),
    }),
    useStore: (selector: (state: { width: number }) => unknown) =>
      selector({ width: 0 }),
  };
});

const repeatedCourses = getProgram('ttf2y')!.courses.filter(
  (course) => course.code === '1FA103',
);
const interveningCourse = getProgram('ttf2y')!.courses.find(
  (course) => course.semester === 4 && course.code !== '1FA103',
)!;
const courses = [...repeatedCourses, interveningCourse];

function CanvasHarness() {
  const [passed, setPassed] = useState<Set<string>>(() => new Set());
  return (
    <ProgramCanvas
      courses={courses}
      pools={[]}
      onOpenPool={jest.fn()}
      edges={[]}
      rules={[]}
      statuses={deriveStatuses(courses, [], passed, new Set())}
      manualPassed={passed}
      onTogglePassed={(code) =>
        setPassed((current) => {
          const next = new Set(current);
          if (next.has(code)) next.delete(code);
          else next.add(code);
          return next;
        })
      }
    />
  );
}

describe('ProgramCanvas duplicate course popovers', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('scopes hover, pinning, delayed close, and completion to the right placement/code', () => {
    render(<CanvasHarness />);
    const placements = Array.from(
      document.querySelectorAll<HTMLElement>('[data-placement^="1FA103"]'),
    );
    expect(placements).toHaveLength(2);
    const requirements = placements.map((placement) =>
      within(placement).getByRole('button', {
        name: 'Requirements for 1FA103',
      }),
    );
    const passedToggles = placements.map((placement) =>
      within(placement).getByRole('button', { name: 'Mark as passed' }),
    );

    fireEvent.mouseEnter(requirements[0]);
    expect(requirements[0]).toHaveAttribute('aria-expanded', 'true');
    expect(requirements[1]).toHaveAttribute('aria-expanded', 'false');
    expect(placements[0]).toHaveAttribute('data-z-index', '60');
    expect(placements[1]).toHaveAttribute('data-z-index', '10');
    expect(
      screen.getAllByText('No prerequisites within this programme.'),
    ).toHaveLength(1);

    fireEvent.mouseLeave(requirements[0].closest('.group')!);
    act(() => jest.advanceTimersByTime(100));
    fireEvent.mouseEnter(requirements[1]);
    expect(requirements[0]).toHaveAttribute('aria-expanded', 'false');
    expect(requirements[1]).toHaveAttribute('aria-expanded', 'true');
    act(() => jest.advanceTimersByTime(200));
    expect(requirements[1]).toHaveAttribute('aria-expanded', 'true');
    fireEvent.mouseLeave(requirements[1].closest('.group')!);
    act(() => jest.advanceTimersByTime(300));
    expect(requirements[1]).toHaveAttribute('aria-expanded', 'false');

    fireEvent.mouseEnter(requirements[1]);
    fireEvent.click(requirements[1]);
    fireEvent.mouseEnter(requirements[0]);
    expect(requirements[0]).toHaveAttribute('aria-expanded', 'false');
    expect(requirements[1]).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(requirements[0]);
    expect(requirements[0]).toHaveAttribute('aria-expanded', 'true');
    expect(requirements[1]).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(requirements[0]);
    expect(requirements[0]).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(passedToggles[0]);
    const markedToggles = placements.map((placement) =>
      within(placement).getByRole('button', { name: 'Mark as not taken' }),
    );
    expect(markedToggles).toHaveLength(2);
    markedToggles.forEach((toggle) =>
      expect(toggle).toHaveAttribute('aria-pressed', 'true'),
    );
    fireEvent.click(markedToggles[1]);
    placements.forEach((placement) =>
      expect(
        within(placement).getByRole('button', { name: 'Mark as passed' }),
      ).toHaveAttribute('aria-pressed', 'false'),
    );
  });
});
