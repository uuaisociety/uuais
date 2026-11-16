'use client';

import React, { useEffect, useRef } from 'react';

// Clicking the hero spawns a few math symbols that drift in from the edges and
// spring toward the pointer. Each symbol is a small element moved with a CSS
// transform, so a frame only updates a handful of transforms for the
// compositor; a canvas the size of the hero would have to be cleared, redrawn
// and re-uploaded every frame instead. The colour follows the theme via CSS.

// === Types ===

interface FloatingSymbol {
  el: HTMLSpanElement;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

const MATH_SYMBOLS = [
  '∇L',
  '∂f',
  'δ',
  'Σ',
  'λ',
  'dx',
  '∂',
  'f(x)',
  '∫',
  '∇',
  '∞',
  '≈',
  'θ',
  'π',
  'Δ',
  '∏',
  '∐',
  '∑',
  '∈',
  '∉',
  '∩',
  '∪',
  '⊂',
  '⊃',
  '⇒',
  '⇔',
  '≤',
  '≥',
  '≠',
  '≈',
  '∝',
  '∽',
  '∂²',
  '∇²',
  '∮',
];

// Physics steps are per frame, so a fixed 30fps keeps the motion the same on
// 60Hz and 144Hz screens, and halves the work on the fast ones.
const FRAME_INTERVAL = 1000 / 30;
const MAX_SYMBOLS = 60;

// === Main Component ===

const FloatingSymbolsCanvas: React.FC = () => {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const symbols: FloatingSymbol[] = [];
    const mouse = { x: 0, y: 0 };
    let raf = 0;
    let running = false;
    let lastTs = 0;
    let isIntersecting = true;

    // === Mouse Tracking ===
    const handleMouseMove = (e: MouseEvent) => {
      const r = layer.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };

    // === Click Handler - Spawn Math Symbols ===
    const handleClick = (e: MouseEvent) => {
      if (reducedMotion.matches) return;
      const r = layer.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;

      if (x < 0 || x > r.width || y < 0 || y > r.height) return;

      const count = 3 + Math.floor(Math.random() * 3);

      for (let i = 0; i < count; i++) {
        const edge = ['top', 'bottom', 'left', 'right'][
          Math.floor(Math.random() * 4)
        ];
        let sx: number, sy: number;

        switch (edge) {
          case 'top':
            sx = Math.random() * r.width;
            sy = -30;
            break;
          case 'bottom':
            sx = Math.random() * r.width;
            sy = r.height + 30;
            break;
          case 'left':
            sx = -30;
            sy = Math.random() * r.height;
            break;
          case 'right':
            sx = r.width + 30;
            sy = Math.random() * r.height;
            break;
          default:
            sx = Math.random() * r.width;
            sy = -30;
            break;
        }

        const el = document.createElement('span');
        el.className =
          'absolute left-0 top-0 font-mono text-base leading-none whitespace-nowrap opacity-0 will-change-transform';
        el.textContent =
          MATH_SYMBOLS[Math.floor(Math.random() * MATH_SYMBOLS.length)];
        layer.appendChild(el);

        symbols.push({
          el,
          x: sx,
          y: sy,
          life: 0,
          maxLife: 3000 + Math.random() * 2000,
          offsetX: (Math.random() - 0.5) * 30,
          offsetY: (Math.random() - 0.5) * 30,
          rotation: Math.random() * 360,
        });
      }

      // Limit max symbols
      while (symbols.length > MAX_SYMBOLS) symbols.shift()?.el.remove();

      // The loop is started on demand — kick it off now that there's something to move.
      startLoop();
    };

    // === Move Symbols ===
    const update = (dt: number) => {
      for (let i = symbols.length - 1; i >= 0; i--) {
        const sym = symbols[i];
        sym.life += dt;
        const life = sym.life / sym.maxLife;

        // Remove dead symbols
        if (life >= 1) {
          sym.el.remove();
          symbols.splice(i, 1);
          continue;
        }

        // Spring attraction toward mouse
        const dx = mouse.x - sym.x;
        const dy = mouse.y - sym.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
          const angle = Math.atan2(dy, dx);
          const radial = 0.01;
          const tangent = 0.002;

          sym.x += dx * radial + (-dy / dist) * tangent * dist;
          sym.y += dy * radial + (dx / dist) * tangent * dist;

          // Rotation toward mouse
          sym.rotation += ((angle * 180) / Math.PI + 90 - sym.rotation) * 0.05;
        }

        // Calculate opacity with fade in/out
        let opacity: number;
        if (life < 0.2) {
          opacity = (life / 0.2) * 0.15;
        } else if (life < 0.5) {
          opacity = 0.15;
        } else {
          opacity = 0.15 * (1 - (life - 0.5) / 0.5);
        }

        sym.el.style.transform = `translate(${sym.x + sym.offsetX}px, ${sym.y + sym.offsetY}px) translate(-50%, -50%) rotate(${sym.rotation}deg)`;
        sym.el.style.opacity = String(Math.max(0, Math.min(1, opacity)));
      }
    };

    // === Animation Loop ===
    // Runs only while symbols exist, on-screen, in a visible tab.
    const animate = (ts: number) => {
      if (!running) return;
      if (lastTs && ts - lastTs < FRAME_INTERVAL - 2) {
        raf = requestAnimationFrame(animate);
        return;
      }
      const dt = lastTs ? Math.min(ts - lastTs, 50) : 0;
      lastTs = ts;
      update(dt);
      // Stop once the last symbol has faded out.
      if (symbols.length === 0) {
        stopLoop();
        return;
      }
      raf = requestAnimationFrame(animate);
    };

    const startLoop = () => {
      if (
        running ||
        reducedMotion.matches ||
        symbols.length === 0 ||
        !isIntersecting ||
        document.hidden
      )
        return;
      running = true;
      lastTs = 0;
      raf = requestAnimationFrame(animate);
    };

    const stopLoop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    };

    // Stop animating when the hero scrolls out of view or the tab is hidden.
    const onIntersect = (entries: IntersectionObserverEntry[]) => {
      isIntersecting = entries[entries.length - 1].isIntersecting;
      if (isIntersecting) startLoop();
      else stopLoop();
    };
    const onVisibilityChange = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };
    const io = new IntersectionObserver(onIntersect);
    io.observe(layer);
    document.addEventListener('visibilitychange', onVisibilityChange);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    return () => {
      stopLoop();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      symbols.forEach((s) => s.el.remove());
    };
  }, []);

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none text-[rgb(30,28,27)] dark:text-white"
    />
  );
};

export default FloatingSymbolsCanvas;
