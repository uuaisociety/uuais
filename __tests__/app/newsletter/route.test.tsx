import type { ReactElement } from 'react';
import NewsletterRoute from '@/app/newsletter/page';

describe('newsletter route query parsing', () => {
  it.each([
    ['true', true],
    ['false', false],
    ['TRUE', null],
    ['1', null],
    [['true', 'false'], null],
    [undefined, null],
  ])('maps subscribe=%p to %p', async (subscribe, expected) => {
    const element = (await NewsletterRoute({
      searchParams: Promise.resolve({
        subscribe: subscribe as string | string[] | undefined,
      }),
    })) as ReactElement<{ requestedSubscription: boolean | null }>;
    expect(element.props.requestedSubscription).toBe(expected);
  });
});
