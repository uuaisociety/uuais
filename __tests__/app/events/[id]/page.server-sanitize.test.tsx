/**
 * @jest-environment node
 */
// Runs without a DOM, as the server component does in production, where plain
// dompurify would return the description unsanitized.
import { renderToStaticMarkup } from 'react-dom/server';
import EventDetailPage from '@/app/events/[id]/page';

jest.mock('@/lib/firebase-admin', () => ({ adminDb: {} }));
jest.mock('@/lib/server-events', () => ({
  getEventByIdServer: jest.fn(),
  getRelatedEventsServer: jest.fn(() => Promise.resolve([])),
}));
jest.mock('@/app/metadata', () => ({ SITE_URL: 'https://uuais.com' }));
// isomorphic-dompurify's jsdom 30 is ESM-only under Jest; build the same
// thing it does (DOMPurify over a jsdom window) from the jsdom Jest ships.
jest.mock('isomorphic-dompurify', () => {
  const { JSDOM } = jest.requireActual('jsdom');
  return jest.requireActual('dompurify')(new JSDOM('').window);
});
jest.mock('@/components/events/EventDetailClient', () => ({
  __esModule: true,
  default: () => null,
}));

const mockGetEventByIdServer = jest.requireMock('@/lib/server-events')
  .getEventByIdServer as jest.Mock;

it('strips scripts and event handlers from an HTML description on the server', async () => {
  mockGetEventByIdServer.mockResolvedValue({
    id: 'event-1',
    title: 'AI Workshop',
    description:
      '<p>Hello <strong>World</strong></p><img src="x" onerror="alert(1)"><script>alert(2)</script>',
    location: 'Room 101',
    image: '/images/event.jpg',
    category: 'workshop',
    status: 'upcoming',
    registrationRequired: false,
    published: true,
    eventStartAt: '2030-06-15T14:00:00Z',
  });
  const html = renderToStaticMarkup(
    await EventDetailPage({ params: Promise.resolve({ id: 'event-1' }) }),
  );
  // Outside the JSON-LD block, where the description is escaped data.
  const body = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    '',
  );
  expect(body).toContain('<p>Hello <strong>World</strong></p><img src="x">');
  expect(body).not.toContain('onerror');
  expect(body).not.toContain('alert(2)');
});

it('keeps a </script> in the description from ending the JSON-LD block', async () => {
  mockGetEventByIdServer.mockResolvedValue({
    id: 'event-1',
    title: 'AI Workshop',
    description: 'Plain text </script><script>alert(1)</script>',
    location: 'Room 101',
    image: '/images/event.jpg',
    category: 'workshop',
    status: 'upcoming',
    registrationRequired: false,
    published: true,
    eventStartAt: '2030-06-15T14:00:00Z',
  });
  const html = renderToStaticMarkup(
    await EventDetailPage({ params: Promise.resolve({ id: 'event-1' }) }),
  );
  const ldJson = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  )![1];
  expect(JSON.parse(ldJson).description).toBe(
    'Plain text </script><script>alert(1)</script>',
  );
  expect(html).not.toContain('<script>alert(1)');
});
