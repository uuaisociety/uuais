import { test, expect } from '@playwright/test';

// The programme map renders from a committed JSON file (data/programs/ttf2y.json),
// so unlike most pages it needs no Firestore and its content is stable enough to
// assert on directly.
const PROGRAM = '/programs/ttf2y';

/**
 * Waits for the explorer to settle on one copy of itself.
 *
 * The page is prerendered with the common-courses view and swaps in the URL-filtered
 * one once `useSearchParams` resolves on the client. React keeps both subtrees in the
 * DOM (hidden) for the length of that swap, so an assertion that lands inside the
 * window sees two of everything.
 */
async function explorerSettled(page: import('@playwright/test').Page) {
  await expect(page.locator('.react-flow__node-programCourse').first()).toBeVisible();
  await expect(page.locator('#programme-specialisation')).toHaveCount(1);
}

test('lists programmes and links into the map', async ({ page }) => {
  await page.goto('/programs', { waitUntil: 'load' });
  // Match the exact programme: "teknisk fysik" is also a prefix of "teknisk fysik
  // med materialvetenskap", which is a different degree.
  const link = page.locator('a[href="/programs/ttf2y"]');
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/programs\/ttf2y/);
});

test('renders semesters as banded period columns of course cards', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });

  // Bands and cards are reactflow nodes, drawn after hydration.
  await expect(page.locator('.react-flow__node-programCourse').first()).toBeVisible();

  const bands = page.locator('.react-flow__node-periodBand');
  // Semesters 7-9 are track-only, so the trunk shows 1-6 plus the thesis semester.
  await expect(bands).toHaveCount(7);

  const first = bands.first();
  await expect(first).toContainText('Semester 1');
  // A full-time semester is 30 hp, which only holds once a course spanning two
  // semesters contributes just its per-semester share to each.
  await expect(first).toContainText('30 hp');
  // Each semester is subdivided into the periods it teaches in.
  await expect(first).toContainText('P1');
  await expect(first).toContainText('P2');
});

test('summarises the free electives on the map and lists them in full below', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });

  // Drawn individually these would dwarf every other column, so the map holds their
  // place and the section below carries the actual list.
  const pool = page.locator('.react-flow__node-electivePool');
  await expect(pool).toBeVisible();
  await expect(pool).toContainText('Free electives');
  await expect(pool).toContainText(/to choose from/i);

  const section = page.locator('#free-electives');
  await expect(section).toContainText('Free electives');
  const items = section.getByRole('listitem');
  expect(await items.count()).toBeGreaterThan(20);

  // The list is filterable, since a pool this size is not scannable whole.
  const all = await items.count();
  await section.getByRole('searchbox').fill('physics');
  const filtered = await items.count();
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThan(all);

  await section.getByRole('searchbox').fill('zzzz-no-such-course');
  await expect(section).toContainText(/no elective matches/i);
});

test('places the elective list after the study-plan rules', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  const headings = await page.locator('section').evaluateAll((els) =>
    els.map((el) => (el.textContent || '').slice(0, 40))
  );
  const rules = headings.findIndex((t) => /rules from the study plan/i.test(t));
  const electives = headings.findIndex((t) => /free electives/i.test(t));
  expect(rules).toBeGreaterThanOrEqual(0);
  expect(electives).toBeGreaterThan(rules);
});

test('drops the legend duplicated from the sidebar', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  await expect(page.getByText(/connection types/i)).toHaveCount(0);
  // The sidebar keeps the one legend.
  await expect(page.getByText('Hard requirement')).toHaveCount(1);
});

test('keeps a selected course traced once the pointer leaves', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  const faded = page.locator('.react-flow__node-programCourse div.opacity-25');
  await expect(faded).toHaveCount(0);

  await page.locator('.react-flow__node-programCourse[data-id="1FA535"]').dispatchEvent('contextmenu');
  await expect(faded.first()).toBeVisible();
});

test('choosing a specialisation reveals its semesters and draws prerequisites', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  await expect(page.locator('.react-flow__node-periodBand')).toHaveCount(7);

  await page.getByLabel(/Specialisation/i).selectOption('tillampad-fysik__kvantteknologi');

  await expect(page).toHaveURL(/track=tillampad-fysik__kvantteknologi/);
  await expect(page.locator('.react-flow__node-periodBand')).toHaveCount(10);
  await expect(page.locator('.react-flow__edge').first()).toBeVisible();
});

test('hovering a course traces its prerequisites and fades the rest', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  const cards = page.locator('.react-flow__node-programCourse');
  await expect(cards.first()).toBeVisible();

  const faded = page.locator('.react-flow__node-programCourse div.opacity-25');
  await expect(faded).toHaveCount(0);

  // Quantum Physics F rests on a chain of earlier courses.
  await page.locator('.react-flow__node-programCourse[data-id="1FA535"]').hover();
  await expect(faded.first()).toBeVisible();

  // Its own prerequisite stays lit while unrelated courses fade.
  const transform = page.locator('.react-flow__node-programCourse[data-id="1MA034"] div').first();
  await expect(transform).not.toHaveClass(/opacity-25/);
});

test('outlines the courses a student chooses between', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  const choice = page.locator('.react-flow__node-choiceGroup').first();
  await expect(choice).toBeVisible();
  await expect(choice).toContainText('Choose one');
});

test('invites the reader to mark courses, with no upload flow on offer', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  await explorerSettled(page);
  await expect(page.getByText(/Mark the courses you have passed/)).toBeVisible();
  // Transcript upload is withdrawn for now; the parsing logic stays behind it.
  await expect(page.getByText(/upload your transcript/i)).toHaveCount(0);
});

test('marks a course from the map and reflects it in the sidebar', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  const progress = page.locator('aside > div').filter({ hasText: /your progress/i });
  await expect(progress).toContainText(/Mark the courses/);
  // The toggle renders with the canvas but only works once it has hydrated, so wait
  // for a card rather than for the button alone.
  await expect(page.locator('.react-flow__node-programCourse').first()).toBeVisible();

  // Mark mode turns the whole card into the target, for readers who would rather
  // click through a list than aim at a small icon.
  // The mode toggle is page chrome over the canvas, not inside its transform.
  const modeToggle = page.getByRole('button', { name: /Mark courses passed/ });
  await modeToggle.scrollIntoViewIfNeeded();
  await modeToggle.click();
  await expect(page.getByRole('button', { name: /Click a course to mark it/ })).toBeVisible();

  await page
    .locator('.react-flow__node-programCourse[data-id="1TE609"]')
    .dispatchEvent('click');

  // Clicking marks rather than navigating.
  await expect(page).toHaveURL(/\/programs\/ttf2y/);
  await expect(progress).toContainText('Completed');
  await expect(progress).toContainText(/Clear 1 marked course/);

  await progress.getByRole('button', { name: /Clear 1 marked course/ }).click();
  await expect(progress).toContainText(/Mark the courses/);
});

// The map is a desktop surface, and the pointer test below aims at a ~26px control
// inside a zoomed canvas; at the default 1280x720 the map opens panned so far that the
// controls land off screen or under the cursor's own tolerance.
test.describe('pointer behaviour', () => {
  test.use({ viewport: { width: 1700, height: 1050 } });

  test('does not close the requirements popover while crossing into it', async ({ page }) => {
    await page.goto(PROGRAM, { waitUntil: 'load' });
    await expect(page.locator('.react-flow__node-programCourse').first()).toBeVisible();

    // React derives enter/leave from over/out pairs, which dispatched events emulate
    // poorly, so this needs a real pointer on a control that is genuinely on screen.
    const start = await page.evaluate(() => {
      const controls = [
        ...document.querySelectorAll<HTMLElement>(
          '.react-flow__node-programCourse button[aria-label^="Requirements"]'
        ),
      ];
      for (const control of controls) {
        const r = control.getBoundingClientRect();
        const point = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        const hit = document.elementFromPoint(point.x, point.y);
        // Leave room to the right for the panel this opens, and confirm the control
        // actually receives the point rather than something painted over it.
        const clear =
          r.top > 80 && r.bottom < innerHeight - 80 && r.left > 40 && r.right < innerWidth - 380;
        if (clear && hit && control.contains(hit)) return point;
      }
      return null;
    });
    test.skip(start === null, 'no requirements control reachable at this viewport');
    if (!start) return;

    // Approach in two steps: a single jump from the origin does not reliably raise
    // the mouseover React derives its enter handling from.
    await page.mouse.move(start.x - 40, start.y - 40);
    await page.mouse.move(start.x, start.y);
    const popover = page.locator('.animate-popover-in');
    await expect(popover).toBeVisible();

    const to = await popover.boundingBox();
    if (!to) throw new Error('expected the panel to be laid out');
    const target = { x: to.x + to.width / 2, y: to.y + 60 };

    // Drift across the boundary slowly and at an angle, the way a hand actually moves.
    for (let step = 1; step <= 20; step += 1) {
      await page.mouse.move(
        start.x + (target.x - start.x) * (step / 20),
        start.y + (target.y - start.y) * (step / 20)
      );
      await page.waitForTimeout(30);
    }
    await expect(popover).toBeVisible();

    // Leaving both surfaces deliberately still dismisses it.
    await page.mouse.move(2, 2);
    await expect(popover).toHaveCount(0);
  });
});

test('puts the course link beside its status toggle', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  const card = page.locator('.react-flow__node-programCourse[data-id="1TE609"]');
  const link = card.getByRole('link', { name: /Open 1TE609 details/ });
  const toggle = card.getByRole('button', { name: /Mark as (passed|not taken)/ });
  const [linkBox, toggleBox] = [await link.boundingBox(), await toggle.boundingBox()];
  if (!linkBox || !toggleBox) throw new Error('expected both controls to be laid out');
  // Same row, link first.
  expect(Math.abs(linkBox.y - toggleBox.y)).toBeLessThan(6);
  expect(linkBox.x).toBeLessThan(toggleBox.x);
});

test('redirects the retired study-plan placeholder', async ({ page }) => {
  await page.goto('/study-plan', { waitUntil: 'load' });
  await expect(page).toHaveURL(/\/programs$/);
});

test('keeps prerequisite lines behind the course cards', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  await expect(page.locator('.react-flow__node-programCourse').first()).toBeVisible();

  // React Flow groups edges into a container per zIndex; any value above 0 lifts the
  // whole container over the node layer and arrows then cross card titles.
  const edgeZ = await page.locator('.react-flow__edges').first().evaluate(
    (el) => getComputedStyle(el).zIndex
  );
  expect(edgeZ === '0' || edgeZ === 'auto').toBe(true);
});

test('collapses and restores a semester', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  const cards = page.locator('.react-flow__node-programCourse');
  await expect(cards.first()).toBeVisible();
  const before = await cards.count();
  expect(before).toBeGreaterThan(0);

  // Controls live inside a pan/zoom canvas, so a given card may sit outside the
  // viewport at the opening framing; dispatch rather than depend on where it landed.
  await page.locator('button[title="Collapse semester"]').first().dispatchEvent('click');
  await expect(cards).not.toHaveCount(before);
  await expect(page.locator('.react-flow__node-periodBand').first()).toContainText(/courses hidden/i);

  await page.locator('button[title="Expand semester"]').first().dispatchEvent('click');
  await expect(cards).toHaveCount(before);
});

test('shows a course its requirements on demand', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  const card = page.locator('.react-flow__node-programCourse[data-id="1FA535"]');
  await card.getByRole('button', { name: /Requirements for 1FA535/ }).dispatchEvent('click');

  // Resolved prerequisites, and the sentence they were derived from.
  await expect(card).toContainText(/requires/i);
  await expect(card).toContainText('1MA034');
  await expect(card).toContainText(/From the course syllabus/i);

  // The panel must be readable over the cards it covers: opacity cannot be inherited
  // from a dimmed card, and neighbouring cards must not paint over it.
  const popover = page.locator('.animate-popover-in');
  await expect(popover).toBeVisible();
  // It flows in, so settle the animation before reading its resting opacity.
  await popover.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  expect(await popover.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  const [cardZ, openZ] = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.react-flow__node-programCourse')];
    const open = cards.find((n) => n.getAttribute('data-id') === '1FA535');
    const other = cards.find((n) => n !== open);
    if (!open || !other) throw new Error('expected an open card and a neighbour');
    return [Number(getComputedStyle(other).zIndex), Number(getComputedStyle(open).zIndex)];
  });
  expect(openZ).toBeGreaterThan(cardZ);
});

test('closes the requirements popover when the pointer leaves the course', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  const card = page.locator('.react-flow__node-programCourse[data-id="1FA535"]');
  const faded = page.locator('.react-flow__node-programCourse div.opacity-25');

  // Hovering the control opens it transiently and traces the course...
  await card.getByRole('button', { name: /Requirements for 1FA535/ }).hover();
  await expect(page.locator('.animate-popover-in')).toBeVisible();
  await expect(faded.first()).toBeVisible();

  // ...and leaving must release both, rather than leaving the course stuck traced.
  await page.mouse.move(10, 10);
  await expect(page.locator('.animate-popover-in')).toHaveCount(0);
  await expect(faded).toHaveCount(0);
});

test('keeps the requirements popover open once clicked', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  const card = page.locator('.react-flow__node-programCourse[data-id="1FA535"]');
  await card.getByRole('button', { name: /Requirements for 1FA535/ }).dispatchEvent('click');
  await page.mouse.move(10, 10);
  await expect(page.locator('.animate-popover-in')).toBeVisible();
});

test('right-clicking a course narrows the study-plan rules to it', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  await explorerSettled(page);
  const rules = page.locator('section').filter({ hasText: /rules from the study plan/i });
  await expect(rules).toContainText(/right-click a course/i);

  await page
    .locator('.react-flow__node-programCourse[data-id="1TM044"]')
    .dispatchEvent('contextmenu');
  await expect(rules).toContainText('1TM044');
  // Hover tracing must keep working alongside a selection.
  await page.locator('.react-flow__node-programCourse[data-id="1FA535"]').hover();
  await expect(page.locator('.react-flow__node-programCourse div.opacity-25').first()).toBeVisible();
});

test('lets a student mark a course passed without uploading anything', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  const card = page.locator('.react-flow__node-programCourse[data-id="1TE609"]');
  await card.getByRole('button', { name: 'Mark as passed' }).dispatchEvent('click');

  await expect(card.getByRole('button', { name: 'Mark as not taken' })).toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem('uuais.programs.completed.v1'));
  expect(stored).toContain('1TE609');

  // The mark survives a reload, since it is the reader's own record.
  await page.reload({ waitUntil: 'load' });
  await expect(
    page.locator('.react-flow__node-programCourse[data-id="1TE609"]')
      .getByRole('button', { name: 'Mark as not taken' })
  ).toBeVisible();
});

test('offers a way back after panning the map', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  await expect(page.getByRole('button', { name: 'Reset view' })).toBeVisible();
});

test('does not put hundreds of edges ahead of the map in the tab order', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  await expect(page.locator('.react-flow__node-programCourse').first()).toBeVisible();
  await expect(page.locator('.react-flow__edge[tabindex="0"]')).toHaveCount(0);
});

test('lists each programme variant distinctly, not seven identical rows', async ({ page }) => {
  await page.goto('/programs', { waitUntil: 'load' });

  // UU gives every variant the same programme name; only the catalogue title tells
  // them apart, so listing the plain name showed "Masterprogram i fysik" seven times.
  // Scope to programme links: the footer has list links of its own.
  const titles = await page.locator('a[href^="/programs/"]').evaluateAll((els) =>
    els.map((el) => (el.textContent || '').split('\n')[0])
  );
  const physics = titles.filter((t) => t.includes('Masterprogram i fysik'));
  expect(physics.length).toBeGreaterThan(1);
  expect(new Set(physics).size).toBe(physics.length);
});

test('finds a programme by its English name, and forgives a typo', async ({ page }) => {
  await page.goto('/programs', { waitUntil: 'load' });
  const search = page.getByRole('searchbox', { name: /search programmes/i });
  const count = page.locator('p[aria-live]');

  // The site is in English; searching only the Swedish title returned nothing for the
  // name the reader was admitted under.
  await search.fill('engineering physics');
  await expect(count).toContainText('1 of');
  await expect(page.locator('a[href="/programs/ttf2y"]')).toBeVisible();

  // Diacritics are folded in both directions.
  await search.fill('hallbar');
  await expect(page.locator('a[href^="/programs/"]').first()).toBeVisible();

  // And one wrong letter still finds the programme rather than emptying the page.
  await search.fill('sustainble development');
  await expect(page.locator('a[href="/programs/thu2m"]')).toBeVisible();
});

test('names a course we have no detail for rather than 404ing', async ({ page }) => {
  // 1TE609 is on the TTF2Y map but has never been scraped into Firestore; roughly one
  // code in five is in the same position, so the link must not dead-end.
  await page.goto('/explore/1TE609', { waitUntil: 'load' });

  await expect(page.getByRole('heading', { name: '1TE609' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Look up 1TE609 at uu\.se/i })).toHaveAttribute(
    'href',
    'https://www.uu.se/en/study/course?query=1TE609'
  );
  await expect(page.getByRole('link', { name: /Programme catalogue/i })).toBeVisible();

  await page.getByRole('link', { name: /Course finder/i }).click();
  await expect(page).toHaveURL(/\/explore$/);
});

test('finds a programme by name and by code', async ({ page }) => {
  await page.goto('/programs', { waitUntil: 'load' });
  const search = page.getByRole('searchbox', { name: /search programmes/i });
  const count = page.locator('p[aria-live]');
  await expect(count).toContainText(/of \d+ programmes/);

  await search.fill('TTF2Y');
  await expect(count).toContainText('1 of');
  await expect(page.getByRole('link', { name: /teknisk fysik/i }).first()).toBeVisible();

  await search.fill('geofysik');
  await expect(page.locator('a[href^="/programs/"]')).toHaveCount(2);

  await search.fill('zzzz-no-such-programme');
  await expect(page.getByText(/no programme matches/i)).toBeVisible();
});

test('marks the semesters a specialisation hides, rather than skipping them', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  await expect(page.locator('.react-flow__node-programCourse').first()).toBeVisible();

  // Semesters 7-9 are taught only inside the specialisations, so the trunk jumps from
  // semester 6 to the thesis. Unmarked, that reads as data that simply stops.
  const gap = page.locator('.react-flow__node-semesterGap');
  await expect(gap).toHaveCount(1);
  await expect(gap).toContainText('Semester 7–9');
  await expect(gap).toContainText(/specialisation/i);

  // The marker hands the reader to the picker that fills the gap.
  await gap.getByRole('button', { name: /choose a specialisation/i }).dispatchEvent('click');
  await expect(page.locator('#programme-specialisation')).toBeFocused();
});

test('moves the map to the semesters a chosen specialisation adds', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  await expect(page.locator('.react-flow__node-programCourse').first()).toBeVisible();
  const viewport = page.locator('.react-flow__viewport');
  const before = await viewport.evaluate((el) => getComputedStyle(el).transform);

  await page.getByLabel(/Specialisation/i).selectOption('berakningsteknik');

  // The count says something changed; the map has to show it. Everything the choice
  // added sits off the right-hand edge of a map already too wide to fit.
  await expect(page.locator('.react-flow__node-semesterGap')).toHaveCount(0);
  await expect(async () => {
    expect(await viewport.evaluate((el) => getComputedStyle(el).transform)).not.toBe(before);
  }).toPass();

  // And the cards it added say whose they are.
  await expect(page.locator('.react-flow__node-periodBand').filter({ hasText: 'Semester 7' }))
    .toContainText(/beräkningsteknik/i);
  await expect(page.getByText(/from beräkningsteknik/i)).toBeVisible();
});

test.describe('small screens', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens vertical, where the whole degree fits, and never scrolls sideways', async ({
    page,
  }) => {
    await page.goto(PROGRAM, { waitUntil: 'load' });
    await expect(page.locator('.react-flow__node-programCourse').first()).toBeVisible();

    await expect(page.getByRole('button', { name: 'Vertical' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    const widths = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(widths[0]).toBe(widths[1]);

    // A reader who switches back is not overruled by the screen.
    await page.getByRole('button', { name: 'Horizontal' }).click();
    await expect(page.getByRole('button', { name: 'Horizontal' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});

// The card has to serve two input models at once: a mouse that can hover and
// right-click, and a finger that can do neither.
test.describe('course cards by pointer type', () => {
  test.use({ viewport: { width: 1700, height: 1050 }, hasTouch: true });

  test('selects a course on the first tap and opens it on the second', async ({ page }) => {
    await page.goto(PROGRAM, { waitUntil: 'load' });
    const card = page.locator('.react-flow__node-programCourse[data-id="1TE609"]');
    await expect(card).toBeVisible();
    const rules = page.locator('section').filter({ hasText: /rules from the study plan/i }).first();

    // Hover-to-trace and right-click-to-select have no touch equivalent, so the first
    // tap does the selecting rather than leaving the page.
    await card.tap();
    await expect(page).toHaveURL(/\/programs\/ttf2y/);
    await expect(rules).toContainText('1TE609');
    await expect(
      page.locator('.react-flow__node-programCourse div.opacity-25').first()
    ).toBeVisible();

    // Only a second press on the course already selected leaves the page. Dispatched
    // rather than tapped: Chromium's touch emulation withholds the compatibility
    // click on a repeat tap at the same point, which a real finger does not.
    await card.dispatchEvent('click');
    // A first visit to the course route can wait on a dev-server compile.
    await expect(page).toHaveURL(/\/explore\/1TE609/, { timeout: 20_000 });
  });

  test('leaves mouse behaviour alone: a click opens, a right-click selects', async ({ page }) => {
    await page.goto(PROGRAM, { waitUntil: 'load' });
    const card = page.locator('.react-flow__node-programCourse[data-id="1TE609"]');
    await expect(card).toBeVisible();
    const rules = page.locator('section').filter({ hasText: /rules from the study plan/i }).first();

    await card.dispatchEvent('contextmenu');
    await expect(rules).toContainText('1TE609');

    // The course is selected, and a mouse click still navigates rather than waiting
    // for a second one.
    await card.click();
    await expect(page).toHaveURL(/\/explore\/1TE609/, { timeout: 20_000 });
  });
});

test.describe('full screen', () => {
  test.use({ viewport: { width: 1700, height: 1050 } });

  test('opens the map full screen and leaves on Escape', async ({ page }) => {
    await page.goto(PROGRAM, { waitUntil: 'load' });
    await expect(page.locator('.react-flow__node-programCourse').first()).toBeVisible();

    // The control replaces React Flow's own fit-view button, which duplicated
    // "Reset view"; a wide degree map wants more room, not a tighter fit.
    await expect(page.locator('.react-flow__controls-fitview')).toHaveCount(0);

    const pane = page.locator('.react-flow').first();
    const before = await pane.boundingBox();
    if (!before) throw new Error('expected the pane to be laid out');

    await page.getByRole('button', { name: 'Full screen' }).click();

    const dialog = page.getByRole('dialog', { name: /full screen/i });
    await expect(dialog).toBeVisible();
    const after = await pane.boundingBox();
    if (!after) throw new Error('expected the pane to be laid out');
    expect(after.height).toBeGreaterThan(before.height);

    // The map keeps working inside the overlay. Edges are asserted by count, not
    // visibility: any given one may sit outside the panned viewport.
    await expect(page.locator('.react-flow__node-programCourse').first()).toBeVisible();
    expect(await page.locator('.react-flow__edge').count()).toBeGreaterThan(0);

    // The button keeps its slot and becomes the way out.
    await expect(page.getByRole('button', { name: 'Exit full screen' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Full screen' })).toBeVisible();
    expect((await pane.boundingBox())?.height).toBeCloseTo(before.height, 0);
  });

  test('closes from the button as well as the keyboard', async ({ page }) => {
    await page.goto(PROGRAM, { waitUntil: 'load' });
    await expect(page.locator('.react-flow__node-programCourse').first()).toBeVisible();

    await page.getByRole('button', { name: 'Full screen' }).click();
    await expect(page.getByRole('dialog', { name: /full screen/i })).toBeVisible();
    // The page behind must not scroll while the overlay is up.
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

    await page.getByRole('button', { name: 'Exit full screen' }).click();
    await expect(page.getByRole('dialog', { name: /full screen/i })).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  });
});

test('offers a way back to the catalogue from a programme', async ({ page }) => {
  await page.goto(PROGRAM, { waitUntil: 'load' });
  const change = page.getByRole('link', { name: /Change/ });
  await expect(change).toBeVisible();
  await change.click();
  await expect(page).toHaveURL(/\/programs$/);
  await expect(page.getByRole('searchbox', { name: /search programmes/i })).toBeVisible();
});
