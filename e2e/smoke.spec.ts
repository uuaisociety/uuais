import { test, expect } from '@playwright/test';

// Public routes covered by the smoke suite. Data-heavy pages (home, events,
// blog, careers) fetch from Firestore via AppContext, so we only assert on the
// stable page chrome (header, nav, footer, main) rather than dynamic content.
// Titles come from app/metadata.ts (default 'UU AI Society') or per-page
// metadata; /login swaps its title client-side to 'Sign In'.
const PUBLIC_ROUTES: Array<{ path: string; title: RegExp }> = [
  { path: '/', title: /UU AI Society/ },
  { path: '/events', title: /Events/ },
  { path: '/blog', title: /UU AI Society/ },
  { path: '/about', title: /About/ },
  { path: '/contact', title: /Contact/ },
  { path: '/careers', title: /Job board/ },
  { path: '/join', title: /Join/ },
  { path: '/login', title: /UU AI Society|Sign In/ },
];

// Desktop nav labels from components/layout/Header.tsx (navigation array).
const NAV_LINKS = ['Home', 'Events', 'Job board', 'About', 'Contact'];

for (const route of PUBLIC_ROUTES) {
  test(`renders ${route.path}`, async ({ page }) => {
    const response = await page.goto(route.path, { waitUntil: 'load' });
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(route.title);

    const header = page.getByRole('banner');
    await expect(header).toBeVisible();

    for (const label of NAV_LINKS) {
      await expect(header.getByRole('link', { name: label })).toBeVisible();
    }

    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });
}
