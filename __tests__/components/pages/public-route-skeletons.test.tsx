import { act, render, screen } from '@testing-library/react';
import RootLoading from '@/app/loading';
import EventsLoading from '@/app/events/loading';
import EventLoading from '@/app/events/[id]/loading';
import InterviewLoading from '@/app/events/codex-ambassador-interview/loading';
import AboutLoading from '@/app/about/loading';
import CareersLoading from '@/app/careers/loading';
import PartnersLoading from '@/app/partners/loading';
import CvsLoading from '@/app/partners/cvs/loading';
import { TeamGridSkeleton } from '@/components/team/TeamTabsSection';

// The page modules pull in data clients the skeletons never touch.
jest.mock('@/lib/firestore/analytics', () => ({
  incrementJobClick: jest.fn(),
}));
jest.mock('@/contexts/AppContext', () => ({ useApp: jest.fn() }));

const mockFlags = { PARTNERS_PAGE_PUBLIC: true };
jest.mock('@/lib/feature-flags', () => ({
  get PARTNERS_PAGE_PUBLIC() {
    return mockFlags.PARTNERS_PAGE_PUBLIC;
  },
}));

const setPathname = (p: string) => {
  (global as unknown as { __mockPathname?: string }).__mockPathname = p;
};

afterEach(() => setPathname(''));

const busyRoot = (container: HTMLElement) =>
  container.querySelector('[aria-busy="true"]');

describe('root loading.tsx', () => {
  it('shows the home skeleton straight away on /', () => {
    setPathname('/');
    const { container } = render(<RootLoading />);
    expect(busyRoot(container)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: /Build the future/ }),
    ).toBeInTheDocument();
    for (const heading of [
      /Join UU AI Society/,
      /Events/,
      /What members are building/,
      /Articles/,
    ])
      expect(
        screen.getByRole('heading', { name: heading }),
      ).toBeInTheDocument();
    // Placeholder cards, not real ones: three per section.
    expect(
      container.querySelectorAll('[data-slot=card-skeleton]'),
    ).toHaveLength(9);
  });

  it('stays blank elsewhere, then only announces the load', () => {
    jest.useFakeTimers();
    setPathname('/admin');
    const { container } = render(<RootLoading />);
    expect(container).toBeEmptyDOMElement();
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    jest.useRealTimers();
  });
});

describe('events skeletons', () => {
  it('has the events hero, inert filters and three placeholder cards', () => {
    setPathname('/events');
    const { container } = render(<EventsLoading />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading events…');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Events' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Upcoming Events').closest('[inert]'),
    ).not.toBeNull();
    expect(container.querySelectorAll('.aspect-\\[16\\/10\\]')).toHaveLength(3);
  });

  it('event detail keeps the back link and the static section heading', () => {
    render(<EventLoading />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading event…');
    expect(
      screen.getByRole('link', { name: /Back to Events/ }),
    ).toHaveAttribute('href', '/events');
    expect(
      screen.getByRole('heading', { name: 'About This Event' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  // A navigation prefetches only down to the first loading boundary, so the
  // list's loading.tsx stands in for the nested pages too.
  it('the list boundary shows the event skeleton on an event page', () => {
    setPathname('/events/abc');
    render(<EventsLoading />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading event…');
    expect(screen.queryByText('Upcoming Events')).not.toBeInTheDocument();
  });

  it('the list boundary shows the interview’s fallback on the interview', () => {
    jest.useFakeTimers();
    setPathname('/events/codex-ambassador-interview');
    const { container } = render(<EventsLoading />);
    expect(container).toBeEmptyDOMElement();
    jest.useRealTimers();
  });

  it('the interview gets the neutral fallback, not the events list', () => {
    jest.useFakeTimers();
    const { container } = render(<InterviewLoading />);
    expect(container).toBeEmptyDOMElement();
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(screen.queryByText('Upcoming Events')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    jest.useRealTimers();
  });
});

describe('about skeleton', () => {
  it('has the hero, section links, mission and contact, with the team as placeholders', () => {
    render(<AboutLoading />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 1, name: /About us/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'On this page' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Mission', { selector: 'h3' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /our team/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('contact@uuais.com')).toBeInTheDocument();
  });

  it('the team grid announces its own load in the page', () => {
    render(<TeamGridSkeleton />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading team profiles...',
    );
  });
});

describe('careers skeleton', () => {
  it('has the hero, inert filters, placeholder roles and the posting note', () => {
    render(<CareersLoading />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading roles…');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Job board' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Show all' }).closest('[inert]'),
    ).not.toBeNull();
    expect(screen.getByText(/Want to post a role/)).toBeInTheDocument();
  });
});

describe('partners skeletons', () => {
  it('shows the partners hero while the page is public', () => {
    mockFlags.PARTNERS_PAGE_PUBLIC = true;
    setPathname('/partners');
    render(<PartnersLoading />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading partners…');
    expect(
      screen.getByRole('heading', { level: 1, name: /Partners/ }),
    ).toBeInTheDocument();
  });

  it('shows nothing partner-shaped while the page is hidden', () => {
    mockFlags.PARTNERS_PAGE_PUBLIC = false;
    setPathname('/partners');
    const { container } = render(<PartnersLoading />);
    expect(container).toBeEmptyDOMElement();
  });

  it('the partners boundary shows the CV review skeleton on /partners/cvs', () => {
    mockFlags.PARTNERS_PAGE_PUBLIC = false;
    setPathname('/partners/cvs');
    render(<PartnersLoading />);
    expect(
      screen.getByRole('heading', { level: 1, name: /Member/ }),
    ).toBeInTheDocument();
  });

  it('CV review keeps its heading', () => {
    render(<CvsLoading />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(
      screen.getByRole('heading', { level: 1, name: /Member/ }),
    ).toBeInTheDocument();
  });
});
