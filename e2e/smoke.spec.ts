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
  { path: '/careers', title: /Job board/ },
  { path: '/join', title: /Join/ },
  { path: '/login', title: /UU AI Society|Sign In/ },
];

// Desktop nav labels from components/layout/Header.tsx. The wordmark links home,
// and member destinations (showcase, jobs) live in the Community dropdown.
// Contact merged into /about, so it no longer has a nav slot of its own.
const NAV_LINKS = ['UU AI Society', 'Events', 'Blog', 'About'];
const COMMUNITY_LINKS = ['Member Showcase', 'Job board'];

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

    const community = header.getByRole('button', { name: /Community/ });
    await expect(community).toBeVisible();
    await community.click();
    for (const label of COMMUNITY_LINKS) {
      await expect(header.getByRole('link', { name: label })).toBeVisible();
    }

    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });
}

// Contact merged into /about, so the old route must keep working for old links.
test('redirects /contact to the contact section of /about', async ({ page }) => {
  await page.goto('/contact', { waitUntil: 'load' });
  await expect(page).toHaveURL(/\/about#contact$/);
  // toBeVisible passes anywhere on the page; the fragment must actually land here.
  await expect(page.getByRole('region', { name: /touch/i })).toBeInViewport();
});
