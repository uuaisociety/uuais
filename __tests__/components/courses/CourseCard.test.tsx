import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CourseCard from '@/components/courses/CourseCard';
import type { Course } from '@/lib/courses';

jest.mock('next/link', () => {
  const MockLink = ({ children, href, ...props }: { children: React.ReactNode; href: string;[key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

const mockUnsubscribe = jest.fn();
let authCallback: ((user: { uid: string } | null) => void) | null = null;

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
}));

jest.mock('@/lib/firebase-client', () => ({
  auth: {},
}));

jest.mock('@/lib/firestore/favorites', () => ({
  isCourseFavorited: jest.fn(),
  toggleFavorite: jest.fn(),
}));

import { onAuthStateChanged } from 'firebase/auth';
import { isCourseFavorited, toggleFavorite } from '@/lib/firestore/favorites';

const baseCourse: Course = {
  id: '1DT051',
  title: 'Advanced Machine Learning',
  code: '1DT051',
  link: 'https://example.com/1DT051',
  description: 'An advanced course on machine learning techniques.',
  Learning_outcomes: '',
  tags: ['AI', 'Machine Learning', "Master's"],
  relatedCourses: [],
  level: "Master's",
};

describe('CourseCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authCallback = null;
    (onAuthStateChanged as jest.Mock).mockImplementation((_auth, cb) => {
      authCallback = cb;
      return mockUnsubscribe;
    });
    (isCourseFavorited as jest.Mock).mockResolvedValue(false);
    (toggleFavorite as jest.Mock).mockResolvedValue(true);
  });

  it('renders course title, code, description, and tags', () => {
    render(<CourseCard course={baseCourse} />);
    expect(screen.getByText('Advanced Machine Learning - 1DT051')).toBeInTheDocument();
    expect(screen.getByText('1DT051')).toBeInTheDocument();
    expect(screen.getByText('An advanced course on machine learning techniques.')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('Machine Learning')).toBeInTheDocument();
  });

  it('shows level badge when level is provided', () => {
    render(<CourseCard course={baseCourse} />);
    const elements = screen.getAllByText("Master's");
    expect(elements).toHaveLength(2);
  });

  it('does not show level badge when level is undefined', () => {
    const noLevel = { ...baseCourse, level: undefined };
    render(<CourseCard course={noLevel} />);
    expect(screen.queryAllByText("Master's")).toHaveLength(1);
  });

  it('renders View Details link with correct href', () => {
    render(<CourseCard course={baseCourse} />);
    const link = screen.getByRole('link', { name: /view details/i });
    expect(link).toHaveAttribute('href', '/course/1DT051');
  });

  it('uses custom hrefBase', () => {
    render(<CourseCard course={baseCourse} hrefBase="/courses" />);
    const link = screen.getByRole('link', { name: /view details/i });
    expect(link).toHaveAttribute('href', '/courses/1DT051');
  });

  it('does not show favorite button when user is not logged in', async () => {
    render(<CourseCard course={baseCourse} />);
    await act(async () => {
      await authCallback!(null);
    });
    expect(screen.queryByRole('button', { name: /(add to|remove from) favorites/i })).not.toBeInTheDocument();
  });

  it('shows favorite button when user is logged in', async () => {
    render(<CourseCard course={baseCourse} />);
    await act(async () => {
      await authCallback!({ uid: 'user-1' });
    });
    expect(screen.getByRole('button', { name: /add to favorites/i })).toBeInTheDocument();
  });

  it('shows filled heart when initially favorited', async () => {
    (isCourseFavorited as jest.Mock).mockResolvedValue(true);
    render(<CourseCard course={baseCourse} />);
    await act(async () => {
      await authCallback!({ uid: 'user-1' });
    });
    expect(screen.getByRole('button', { name: /remove from favorites/i })).toBeInTheDocument();
  });

  it('respects initialFavorited prop', async () => {
    (isCourseFavorited as jest.Mock).mockResolvedValue(true);
    render(<CourseCard course={baseCourse} initialFavorited={true} />);
    await act(async () => {
      await authCallback!({ uid: 'user-1' });
    });
    expect(screen.getByRole('button', { name: /remove from favorites/i })).toBeInTheDocument();
  });

  it('calls toggleFavorite when heart button is clicked', async () => {
    render(<CourseCard course={baseCourse} />);
    await act(async () => {
      await authCallback!({ uid: 'user-1' });
    });
    const heartButton = screen.getByRole('button', { name: /add to favorites/i });
    await userEvent.click(heartButton);
    expect(toggleFavorite).toHaveBeenCalledWith('user-1', '1DT051');
  });

  it('calls onFavoriteChange when toggled', async () => {
    const onFavoriteChange = jest.fn();
    render(<CourseCard course={baseCourse} onFavoriteChange={onFavoriteChange} />);
    await act(async () => {
      await authCallback!({ uid: 'user-1' });
    });
    await userEvent.click(screen.getByRole('button', { name: /add to favorites/i }));
    expect(onFavoriteChange).toHaveBeenCalledWith(true);
  });

  it('does not toggle when user is null', async () => {
    render(<CourseCard course={baseCourse} />);
    await act(async () => {
      await authCallback!(null);
    });
    const heartButton = screen.queryByRole('button', { name: /(add to|remove from) favorites/i });
    expect(heartButton).not.toBeInTheDocument();
  });

  it('cleans up auth subscription on unmount', () => {
    const { unmount } = render(<CourseCard course={baseCourse} />);
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
