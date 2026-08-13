/** Run `fn` after the critical render path (default 3.5s past LCP; first interaction short-circuits, `delay = 0` starts next task, Jest runs synchronously). */
export function scheduleIdle(fn: () => void, delay = 3500): void {
  if (process.env.NODE_ENV === 'test') {
    fn();
    return;
  }
  if (typeof window === 'undefined') return;
  if (delay <= 0) {
    setTimeout(fn, 0);
    return;
  }

  let timer = 0;

  const cleanup = () => {
    window.clearTimeout(timer);
    window.removeEventListener('pointerdown', early);
    window.removeEventListener('keydown', early);
    window.removeEventListener('touchstart', early);
  };

  const early = () => {
    cleanup();
    setTimeout(fn, 0);
  };

  timer = window.setTimeout(() => {
    cleanup();
    fn();
  }, delay);
  window.addEventListener('pointerdown', early, { once: true });
  window.addEventListener('keydown', early, { once: true });
  window.addEventListener('touchstart', early, { once: true });
}
