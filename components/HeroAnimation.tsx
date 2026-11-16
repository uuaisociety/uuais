'use client';

import React, { useEffect, useRef } from 'react';
import { useTheme } from '@/providers/ThemeProvider';

// === Orbit layers ===
// The particles and math symbols orbit as plain elements rotated by CSS
// (globals.css, .hero-orbit). The browser composites those rotations on the
// GPU, so they cost no script or repaint per frame, unlike redrawing a canvas.
// A seeded PRNG keeps the layout identical on the server and the client.

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = seeded(7);
const round = (n: number) => Math.round(n * 10) / 10;
const polar = (r: number) => {
  const a = rand() * Math.PI * 2;
  return { x: round(Math.cos(a) * r), y: round(Math.sin(a) * r) };
};

// Seconds per lap. Rotation advances in steps, ORBIT_STEPS_PER_SECOND times a
// second on every layer at once; the drift is slow enough that this reads as
// smooth while the compositor only produces a frame on each step.
const ORBIT_STEPS_PER_SECOND = 15;
const PARTICLE_LAYERS = [30, 42, 56].map((period) => ({
  period,
  dots: Array.from({ length: 34 }, () => ({
    ...polar(120 + rand() * 150),
    size: round(1 + rand() * 2),
  })),
}));
const SYMBOL_PERIOD = 64;
const ORBIT_SYMBOLS = ['∇L', '∂f', 'δ', 'Σ', 'λ', 'dx', '∂', 'f(x)', '∫'].map(
  (text) => ({
    text,
    ...polar(170 + rand() * 60),
  }),
);

const orbitStyle = (period: number): React.CSSProperties => ({
  animationDuration: `${period}s`,
  animationTimingFunction: `steps(${period * ORBIT_STEPS_PER_SECOND})`,
});

interface Point {
  x: number;
  y: number;
}

// === Main Component ===

const HeroAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const symbolRingRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const totalTimeRef = useRef<number>(0);
  const isHoveringRef = useRef(false);
  const mousePosRef = useRef({ x: 0, y: 0 });

  const introDuration = 3000;
  const glitchRef = useRef({ offset: { x: 0, y: 0 }, intensity: 0 });
  const layoutRef = useRef({
    W: 0,
    H: 0,
    center: { x: 0, y: 0 },
    size: 0,
    scale: 1,
    isSmall: false,
    virtualW: 0,
    offsetX: 0,
  });
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // White strokes on the ink slab; on the paper slab the nabla is the brand
    // red while the pulse rings stay near-ink (the orbits are themed in CSS).
    const rgb = theme === 'dark' ? '255, 255, 255' : '30, 28, 27';
    const nablaRgb = theme === 'dark' ? '255, 255, 255' : '213, 39, 38';

    const dpr = window.devicePixelRatio || 1;

    // Restart the intro timeline if the theme changed so colours stay in sync.
    totalTimeRef.current = 0;
    lastTimeRef.current = 0;
    canvas.style.transform = '';

    // The glowing nabla is the expensive part of a frame (a 15px shadow blur
    // over three thick strokes), yet it only ever moves by a sub-pixel wobble.
    // Render it once per glow level into an offscreen sprite and blit that.
    const sprites = new Map<
      number,
      { img: HTMLCanvasElement; x: number; y: number; w: number; h: number }
    >();

    const updateLayout = () => {
      const rect = canvas.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      const isSmall = W < 500;
      const virtualW = isSmall ? Math.min(W, H * 0.9) : W;
      const offsetX = isSmall ? (W - virtualW) / 2 : 0;
      const size = Math.min(W < 500 ? 100 : 150, Math.max(50, (H - 40) * 0.42));
      const scale = W < 500 ? 0.5 : 1;
      const center = {
        x: offsetX + virtualW * 0.5,
        y: isSmall
          ? Math.min(H * 0.42, H - size * 1.35)
          : Math.min(H / 2, H - size * 1.35),
      };
      layoutRef.current = {
        W,
        H,
        center,
        size,
        scale,
        isSmall,
        virtualW,
        offsetX,
      };
      sprites.clear();
      // Centre the orbit layers on the nabla.
      const orbit = orbitRef.current;
      if (orbit) {
        orbit.style.left = `${center.x}px`;
        orbit.style.top = `${center.y}px`;
        orbit.style.setProperty('--orbit-scale', String(scale));
      }
    };
    // === Event Listeners ===
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      updateLayout();
    };
    resize();

    // === Mouse Tracking ===
    const handleMouseMove = (e: MouseEvent) => {
      const rc = canvas.getBoundingClientRect();
      const x = e.clientX - rc.left;
      const y = e.clientY - rc.top;
      mousePosRef.current = { x, y };
      isHoveringRef.current =
        x >= 0 && x <= rc.width && y >= 0 && y <= rc.height;
    };

    // === Drawing Functions ===

    // Strokes the nabla at (cx, cy) on any context; used to build the sprites.
    const strokeNabla = (
      c: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      size: number,
      glow: number,
    ) => {
      // Corner positions
      const tlX = cx - size * 0.86;
      const tlY = cy - size * 0.5;
      const trX = cx + size * 0.86;
      const trY = cy - size * 0.5;
      const bX = cx;
      const bY = cy + size;

      c.save();
      c.strokeStyle = `rgba(${nablaRgb}, ${0.95 * glow})`;
      c.shadowColor = `rgba(${nablaRgb}, 0.9)`;
      c.shadowBlur = 15 * glow;
      c.lineCap = 'round';
      c.lineJoin = 'round';

      // Top line (from left to right, shortened slightly at right for cleaner join)
      c.beginPath();
      c.lineWidth = size * 0.38;
      c.moveTo(tlX, tlY);
      c.lineTo(trX - size * 0.08, trY);
      c.stroke();

      // Right line (from top-right to bottom)
      c.beginPath();
      c.lineWidth = size * 0.24;
      c.moveTo(trX, trY);
      c.lineTo(bX + size * 0.05, bY + size * 0.15);
      c.stroke();

      // Left line (thicker, from bottom to top-left)
      c.beginPath();
      c.lineWidth = size * 0.5;
      c.moveTo(bX - size * 0.05, bY + size * 0.06);
      c.lineTo(tlX + size * 0.05, tlY + size * 0.06);
      c.stroke();

      c.restore();
    };

    const getSprite = (glow: number) => {
      let sprite = sprites.get(glow);
      if (sprite) return sprite;
      const { size } = layoutRef.current;
      // Room for the round caps (half the thickest stroke) plus the shadow.
      const pad = size * 0.3 + 15 * glow * 2;
      const x = -size * 0.86 - pad;
      const y = -size * 0.5 - pad;
      const w = size * 1.72 + pad * 2;
      const h = size * 1.65 + pad * 2;
      const img = document.createElement('canvas');
      img.width = Math.ceil(w * dpr);
      img.height = Math.ceil(h * dpr);
      const c = img.getContext('2d');
      if (c) {
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        strokeNabla(c, -x, -y, size, glow);
      }
      sprite = { img, x, y, w, h };
      sprites.set(glow, sprite);
      return sprite;
    };

    const drawNabla = (glow: number, glitch: Point) => {
      const { center } = layoutRef.current;
      const sprite = getSprite(glow);
      ctx.drawImage(
        sprite.img,
        center.x + glitch.x + sprite.x,
        center.y + glitch.y + sprite.y,
        sprite.w,
        sprite.h,
      );
    };

    const drawPulse = (progress: number, fade = 1) => {
      const { center, scale } = layoutRef.current;
      for (let i = 0; i < 7; i++) {
        const r = (100 + progress * 120 + i * 22) * scale;
        ctx.beginPath();
        ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb}, ${(0.14 - i * 0.015) * fade})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const updateGlitch = (t: number, intensity: number) => {
      const { center, scale } = layoutRef.current;
      const speed = 0.005;
      const base = 0.3;

      const wobbleX =
        Math.sin(t * speed) * base +
        Math.sin(t * speed * 2.3) * base * 0.3 +
        Math.sin(t * speed * 0.7) * base * 0.2;
      const wobbleY =
        Math.cos(t * speed * 1.1) * base +
        Math.cos(t * speed * 1.7) * base * 0.3 +
        Math.sin(t * speed * 0.5) * base * 0.2;
      const sharp = Math.sin(t * 0.01) > 0.98 ? Math.random() - 0.5 : 0;

      // Mouse proximity effect
      let mouseX = 0,
        mouseY = 0;
      if (isHoveringRef.current) {
        const dx = mousePosRef.current.x - center.x;
        const dy = mousePosRef.current.y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 300 * scale && dist > 0) {
          const influence = (1 - dist / (300 * scale)) * 0.5;
          mouseX = Math.sin(t * 0.015) * influence * (dx / dist);
          mouseY = Math.cos(t * 0.012) * influence * (dy / dist);
        }
      }

      glitchRef.current = {
        offset: {
          x: (wobbleX + sharp + mouseX) * intensity,
          y: (wobbleY + sharp * 0.5 + mouseY) * intensity,
        },
        intensity:
          Math.abs(wobbleX + sharp + mouseX) +
          Math.abs(wobbleY + sharp * 0.5 + mouseY),
      };
    };

    // === Animation Loop ===
    // Plays the intro, then freezes once it has settled (pulse faded, symbols
    // in), so an idle hero costs nothing. It wakes again only after a click in
    // the hero, while the pointer is over it and moving. Always paused when
    // off-screen, in a hidden tab, or with reduced motion.
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const settleTime = introDuration + 750;
    const idleTimeout = 3000;
    const hero = canvas.closest('section') ?? canvas.parentElement ?? canvas;
    let running = false;
    let armed = false;
    let pointerInside = false;
    let lastMove = 0;
    let isIntersecting = true;
    // Everything here drifts slowly, so 30fps looks the same as 60-144fps on a
    // high refresh display and costs a fraction of the CPU/GPU.
    const frameInterval = 1000 / 30;

    const shouldRun = () =>
      !reducedMotion.matches &&
      isIntersecting &&
      !document.hidden &&
      (totalTimeRef.current < settleTime ||
        (armed && pointerInside && performance.now() - lastMove < idleTimeout));

    // The symbol ring fades in once the intro pulse is done, and stays.
    const revealSymbols = () => {
      if (symbolRingRef.current) symbolRingRef.current.style.opacity = '1';
    };

    const drawFrame = (t: number) => {
      const { W, H } = layoutRef.current;
      ctx.clearRect(0, 0, W, H);

      if (t < introDuration) {
        // Intro phase: show nabla with pulse expanding
        const progress = t / introDuration;
        updateGlitch(t, progress);
        drawNabla(1.25, glitchRef.current.offset);
        drawPulse(progress);
      } else {
        // Post-intro: the nabla settles and the orbiting symbols appear
        updateGlitch(t, 1);
        drawNabla(1.15, glitchRef.current.offset);
        revealSymbols();

        // Fade out pulse over 750ms
        const fadeTime = t - introDuration;
        const fade = Math.max(0, 1 - fadeTime / 750);
        if (fade > 0) drawPulse(t / introDuration, fade);
      }
    };

    // Once settled the canvas holds a still nabla. The pointer wobble then
    // moves the whole canvas with a transform (GPU only) instead of redrawing
    // and re-uploading it every frame.
    let settledDrawn = false;
    const drawSettled = () => {
      const { W, H } = layoutRef.current;
      ctx.clearRect(0, 0, W, H);
      drawNabla(1.15, { x: 0, y: 0 });
      revealSymbols();
      settledDrawn = true;
    };

    const animate = (ts: number) => {
      if (!running) return;
      if (lastTimeRef.current && ts - lastTimeRef.current < frameInterval - 2) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      if (!lastTimeRef.current) lastTimeRef.current = ts;
      const dt = Math.min(ts - lastTimeRef.current, 50);
      lastTimeRef.current = ts;
      totalTimeRef.current += dt;
      const t = totalTimeRef.current;
      if (t < settleTime) {
        drawFrame(t);
      } else {
        if (!settledDrawn) drawSettled();
        updateGlitch(t, 1);
        const { x, y } = glitchRef.current.offset;
        canvas.style.transform = `translate(${x}px, ${y}px)`;
      }

      if (!shouldRun()) {
        stopLoop();
        return;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    const startLoop = () => {
      if (running || !shouldRun()) return;
      running = true;
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    };

    const stopLoop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(animationRef.current);
    };

    // Resizing clears the canvas; repaint the frozen frame.
    const onResize = () => {
      resize();
      settledDrawn = false;
      if (!running) {
        if (reducedMotion.matches) drawNabla(1.25, { x: 0, y: 0 });
        else if (totalTimeRef.current >= settleTime) drawSettled();
        else drawFrame(totalTimeRef.current);
      }
    };

    // Clicks arm the pointer interaction (the click also spawns the floating
    // symbols); after that the loop runs while the pointer moves over the hero.
    const onPointerEnter = () => {
      pointerInside = true;
    };
    const onPointerLeave = () => {
      pointerInside = false;
    };
    const onPointerMove = () => {
      lastMove = performance.now();
      startLoop();
    };
    const onHeroClick = () => {
      armed = true;
      pointerInside = true;
      lastMove = performance.now();
      startLoop();
    };

    // Stop animating (canvas and orbits) when the hero scrolls out of view or
    // the tab is hidden.
    const setOrbitsPaused = (paused: boolean) => {
      if (orbitRef.current)
        orbitRef.current.toggleAttribute('data-paused', paused);
    };
    const onIntersect = (entries: IntersectionObserverEntry[]) => {
      isIntersecting = entries[entries.length - 1].isIntersecting;
      setOrbitsPaused(!isIntersecting);
      if (isIntersecting && !document.hidden) startLoop();
      else stopLoop();
    };
    const onVisibilityChange = () => {
      if (document.hidden) stopLoop();
      else if (isIntersecting) startLoop();
    };
    const io = new IntersectionObserver(onIntersect);
    io.observe(canvas);
    document.addEventListener('visibilitychange', onVisibilityChange);

    window.addEventListener('resize', onResize);
    document.addEventListener('mousemove', handleMouseMove);
    hero.addEventListener('pointerenter', onPointerEnter);
    hero.addEventListener('pointerleave', onPointerLeave);
    hero.addEventListener('pointermove', onPointerMove);
    hero.addEventListener('click', onHeroClick);

    if (!reducedMotion.matches) {
      startLoop();
    } else {
      // Render a single static frame of the glyph so the hero still has form.
      ctx.clearRect(0, 0, layoutRef.current.W, layoutRef.current.H);
      drawNabla(1.25, { x: 0, y: 0 });
      revealSymbols();
    }

    return () => {
      stopLoop();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousemove', handleMouseMove);
      hero.removeEventListener('pointerenter', onPointerEnter);
      hero.removeEventListener('pointerleave', onPointerLeave);
      hero.removeEventListener('pointermove', onPointerMove);
      hero.removeEventListener('click', onHeroClick);
    };
  }, [theme]);

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ minHeight: '200px' }}
    >
      {/* Orbits sit behind the nabla; positioned on its centre by updateLayout. */}
      <div
        ref={orbitRef}
        aria-hidden="true"
        className="hero-orbits absolute left-1/2 top-1/2 pointer-events-none text-[rgb(30,28,27)] dark:text-white"
      >
        {PARTICLE_LAYERS.map(({ period, dots }) => (
          <div key={period} className="hero-orbit" style={orbitStyle(period)}>
            {dots.map((d, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-current/[0.08]"
                style={{
                  left: `calc(${d.x}px * var(--orbit-scale, 1) - ${d.size / 2}px)`,
                  top: `calc(${d.y}px * var(--orbit-scale, 1) - ${d.size / 2}px)`,
                  width: `${d.size}px`,
                  height: `${d.size}px`,
                }}
              />
            ))}
          </div>
        ))}
        <div
          ref={symbolRingRef}
          // Above the canvas, as the glyphs were drawn over the nabla; particles stay behind it.
          className="hero-orbit z-[2] transition-opacity duration-500"
          style={{ ...orbitStyle(SYMBOL_PERIOD), opacity: 0 }}
        >
          {ORBIT_SYMBOLS.map((sym) => (
            // Counter-rotates at the same rate so each glyph stays upright.
            <span
              key={sym.text}
              className="hero-orbit-glyph absolute font-mono text-sm leading-none opacity-[0.32] whitespace-nowrap"
              style={{
                ...orbitStyle(SYMBOL_PERIOD),
                left: `calc(${sym.x}px * var(--orbit-scale, 1))`,
                top: `calc(${sym.y}px * var(--orbit-scale, 1))`,
              }}
            >
              {sym.text}
            </span>
          ))}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 z-[1] w-full h-full will-change-transform"
      />
    </div>
  );
};

export default HeroAnimation;
