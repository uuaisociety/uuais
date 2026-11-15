import { render } from '@testing-library/react';
import { Skeleton } from '@/components/ui/skeleton';

describe('Skeleton', () => {
  it('renders with data-slot attribute', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveAttribute('data-slot', 'skeleton');
  });

  it('renders with animate-pulse class', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="h-10 w-full" />);
    expect(container.firstChild).toHaveClass('h-10');
    expect(container.firstChild).toHaveClass('w-full');
  });
});

import { act, screen } from '@testing-library/react';
import {
  CardSkeleton,
  Delayed,
  SkeletonBox,
  SkeletonRegion,
  SkeletonText,
} from '@/components/ui/skeleton';

describe('SkeletonText', () => {
  it('takes the type style it stands in for and hides from assistive tech', () => {
    const { container } = render(<SkeletonText className="display-lg mb-4" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('display-lg', 'mb-4', 'block');
    expect(el).toHaveAttribute('aria-hidden');
  });

  it('renders one line box per line, each holding a bar', () => {
    const { container } = render(<SkeletonText lines={3} />);
    const lines = (container.firstChild as HTMLElement).children;
    expect(lines).toHaveLength(3);
    // The zero-width space gives each line the real line-height.
    expect(lines[0].textContent).toBe('\u200b');
  });

  it('sizes each bar from widths and shortens the last line by default', () => {
    const { container } = render(<SkeletonText lines={2} />);
    const bars = container.querySelectorAll<HTMLElement>(
      '[data-slot=skeleton-text] > span > span',
    );
    expect(bars[0].style.width).toBe('100%');
    expect(bars[1].style.width).toBe('60%');

    const { container: c2 } = render(
      <SkeletonText lines={2} widths={['8rem']} />,
    );
    const bars2 = c2.querySelectorAll<HTMLElement>(
      '[data-slot=skeleton-text] > span > span',
    );
    expect(bars2[0].style.width).toBe('8rem');
    expect(bars2[1].style.width).toBe('100%');
  });
});

describe('SkeletonBox', () => {
  it('is a decorative block sized by className', () => {
    const { container } = render(<SkeletonBox className="aspect-[16/10]" />);
    expect(container.firstChild).toHaveClass(
      'block',
      'aspect-[16/10]',
      'animate-pulse',
    );
    expect(container.firstChild).toHaveAttribute('aria-hidden');
  });
});

describe('SkeletonRegion', () => {
  it('is busy and announces one short status', () => {
    const { container } = render(
      <SkeletonRegion label="Loading events…" className="min-h-screen">
        <SkeletonText />
      </SkeletonRegion>,
    );
    expect(container.firstChild).toHaveAttribute('aria-busy', 'true');
    expect(container.firstChild).toHaveClass('min-h-screen');
    expect(screen.getByRole('status')).toHaveTextContent('Loading events…');
  });
});

describe('CardSkeleton', () => {
  it('reuses the given card shell with an image and the default body', () => {
    const { container } = render(<CardSkeleton className="glass rounded-md" />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('glass', 'rounded-md');
    expect(card).toHaveAttribute('aria-hidden');
    expect(card.querySelector('.aspect-\\[16\\/10\\]')).toBeInTheDocument();
    expect(card.querySelectorAll('[data-slot=skeleton-text]')).toHaveLength(3);
  });

  it('takes a custom body', () => {
    render(
      <CardSkeleton>
        <p>custom body</p>
      </CardSkeleton>,
    );
    expect(screen.getByText('custom body')).toBeInTheDocument();
  });
});

describe('Delayed', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders nothing until the delay passes', () => {
    render(
      <Delayed ms={150}>
        <p>late</p>
      </Delayed>,
    );
    expect(screen.queryByText('late')).not.toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(screen.getByText('late')).toBeInTheDocument();
  });
});
