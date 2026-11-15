import { render, screen } from '@testing-library/react';
import { BlogSkeleton } from '@/components/blog/BlogLayout';
import { BlogDetailSkeleton } from '@/components/blog/BlogDetailLayout';
import { ShowcaseSkeleton } from '@/components/showcase/ShowcaseLayout';
import { ShowcaseDetailSkeleton } from '@/components/showcase/ShowcaseDetailLayout';
import BlogLoading from '@/app/blog/loading';
import BlogPostLoading from '@/app/blog/[id]/loading';
import ShowcaseLoading from '@/app/showcase/loading';
import ShowcaseProjectLoading from '@/app/showcase/[id]/loading';

const setPathname = (p: string) => {
  (global as unknown as { __mockPathname?: string }).__mockPathname = p;
};
afterEach(() => setPathname(''));

const status = (label: string) =>
  expect(screen.getByRole('status')).toHaveTextContent(label);

describe('BlogSkeleton', () => {
  it('shows the real hero and section heads with a single loading status', () => {
    const { container } = render(<BlogSkeleton />);
    status('Loading articles…');
    expect(container.firstChild).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Blog' }),
    ).toBeInTheDocument();
    for (const name of ['Featured Article', 'From the Team', 'AI News Desk'])
      expect(
        screen.getByRole('heading', { level: 2, name }),
      ).toBeInTheDocument();
    // The search control is drawn, not wired.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('is the blog route’s loading state', () => {
    setPathname('/blog');
    render(<BlogLoading />);
    status('Loading articles…');
  });

  // A navigation prefetches only down to the first loading boundary, so the
  // list's loading.tsx stands in for an article too.
  it('shows the article skeleton when the list boundary catches an article', () => {
    setPathname('/blog/some-post');
    render(<BlogLoading />);
    status('Loading article…');
  });
});

describe('BlogDetailSkeleton', () => {
  it('keeps the back link and announces the article load', () => {
    render(<BlogDetailSkeleton />);
    status('Loading article…');
    expect(screen.getByRole('link', { name: /back to blog/i })).toHaveAttribute(
      'href',
      '/blog',
    );
  });

  it('is the article route’s loading state', () => {
    render(<BlogPostLoading />);
    status('Loading article…');
  });
});

describe('ShowcaseSkeleton', () => {
  it('shows the real hero and toolbar labels, without live controls', () => {
    render(<ShowcaseSkeleton />);
    status('Loading projects…');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Showcase' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Newest')).toBeInTheDocument();
    expect(screen.getByText('Most voted')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('is the showcase route’s loading state', () => {
    setPathname('/showcase');
    render(<ShowcaseLoading />);
    status('Loading projects…');
  });

  it('shows the project skeleton when the list boundary catches a project', () => {
    setPathname('/showcase/some-project');
    render(<ShowcaseLoading />);
    status('Loading project…');
  });
});

describe('ShowcaseDetailSkeleton', () => {
  it('shows the back link, section head and fact labels', () => {
    render(<ShowcaseDetailSkeleton />);
    status('Loading project…');
    expect(
      screen.getByRole('link', { name: /back to showcase/i }),
    ).toHaveAttribute('href', '/showcase');
    expect(
      screen.getByRole('heading', { name: '(About) this project' }),
    ).toBeInTheDocument();
    for (const label of ['Built by', 'Votes', 'Added'])
      expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('is the project route’s loading state', () => {
    render(<ShowcaseProjectLoading />);
    status('Loading project…');
  });
});
