import { render, screen } from '@testing-library/react';
import {
  ConnectionsSkeleton,
  CourseDetailSkeleton,
  CONNECTIONS_HEIGHT,
} from '@/components/courses/course-detail-layout';
import { CourseCardSkeleton } from '@/components/courses/CourseCard';

jest.mock('@/lib/firebase-client', () => ({ auth: {} }));
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(() => jest.fn()),
}));
jest.mock('@/lib/firestore/favorites', () => ({
  isCourseFavorited: jest.fn(),
  toggleFavorite: jest.fn(),
}));

describe('CourseDetailSkeleton', () => {
  it('shows the course page frame with a short status', () => {
    const { container } = render(<CourseDetailSkeleton />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading course…');
    expect(container.firstChild).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.getByRole('heading', { name: 'Overview' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Back to Courses').closest('[inert]'),
    ).not.toBeNull();
  });
});

describe('ConnectionsSkeleton', () => {
  it('takes the graph’s height so the panel does not grow when it loads', () => {
    const { container } = render(<ConnectionsSkeleton />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading connections…',
    );
    expect(
      container.querySelector(`[style*="height: ${CONNECTIONS_HEIGHT}px"]`),
    ).toBeInTheDocument();
  });
});

describe('CourseCardSkeleton', () => {
  it('is a decorative card in the course card’s shell', () => {
    const { container } = render(<CourseCardSkeleton />);
    expect(container.firstChild).toHaveAttribute('aria-hidden');
    expect(container.firstChild).toHaveClass('h-full');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
