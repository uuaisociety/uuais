'use client'

import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  drift: number;
}

interface OrbitSymbol {
  text: string;
  angle: number;
  radius: number;
  opacity: number;
  fadeDelay: number;
}

interface FloatingSymbol {
  text: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  opacity: number;
  life: number;
  maxLife: number;
  fromEdge: 'top' | 'bottom' | 'left' | 'right';
  offsetX: number;
  offsetY: number;
  rotation: number;  // in degrees
  createdAt: number;
}

interface Point {
  x: number;
  y: number;
}

const HeroAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const totalTimeRef = useRef<number>(0);
  const [isHovering, setIsHovering] = useState(false);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const clickSymbolsRef = useRef<FloatingSymbol[]>([]);

  // Velocity tracking with history
  const mouseHistoryRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const avgVelocityRef = useRef(0);

  const introDuration = 3000;
  const glitchRef = useRef({ offset: { x: 0, y: 0 }, intensity: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const now = Date.now();

      // Track velocity with history (last 5 positions)
      mouseHistoryRef.current.push({ x, y, time: now });
      if (mouseHistoryRef.current.length > 5) mouseHistoryRef.current.shift();

      if (mouseHistoryRef.current.length >= 2) {
        const first = mouseHistoryRef.current[0];
        const last = mouseHistoryRef.current[mouseHistoryRef.current.length - 1];
        const dt = (last.time - first.time) / 1000; // seconds
        if (dt > 0) {
          const dx = last.x - first.x;
          const dy = last.y - first.y;
          avgVelocityRef.current = Math.sqrt(dx * dx + dy * dy) / dt; // px/sec
        }
      }

      mousePosRef.current = { x, y };

      // Check if mouse is within canvas bounds
      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if click is within canvas bounds
      if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;

      const symbols = ['∇L', '∂f', 'δ', 'Σ', 'λ', 'dx', '∂', 'f(x)', '∫', '∇', '∞', '≈', 'θ', 'π', 'Δ', '∏', '∐', '∑', '∈', '∉', '∩', '∪', '⊂', '⊃', '⇒', '⇔', '≤', '≥', '≠', '≈', '∝', '∽', '∂²', '∇²', '∮'];
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const fromEdge = ['top', 'bottom', 'left', 'right'][Math.floor(Math.random() * 4)] as 'top' | 'bottom' | 'left' | 'right';
        let startX, startY;
        const W = rect.width;
        const H = rect.height;
        switch (fromEdge) {
          case 'top': startX = Math.random() * W; startY = -30; break;
          case 'bottom': startX = Math.random() * W; startY = H + 30; break;
          case 'left': startX = -30; startY = Math.random() * H; break;
          case 'right': startX = W + 30; startY = Math.random() * H; break;
        }
        clickSymbolsRef.current.push({
          text: symbols[Math.floor(Math.random() * symbols.length)],
          x: startX!,
          y: startY!,
          targetX: x + (Math.random() - 0.5) * 100,
          targetY: y + (Math.random() - 0.5) * 100,
          opacity: 0,
          life: 0,
          maxLife: 3000 + Math.random() * 2000,
          fromEdge,
          offsetX: (Math.random() - 0.5) * 30,
          offsetY: (Math.random() - 0.5) * 30,
          rotation: Math.random() * 360, // start angle in degrees
          createdAt: Date.now(),
        });
      }
    };

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    // On small screens, use virtual width to make content more square
    const isSmall = W < 500;
    const virtualW = isSmall ? Math.min(W, H * 0.9) : W;
    const offsetX = isSmall ? (W - virtualW) / 2 : 0;
    
    // Nabla position: responsive - centered on mobile, left column on desktop
    const size = W < 500 ? 100 : 150;

    const safeBottomPadding = size * 0.35;

    const center = {
      x: offsetX + virtualW * 0.5,
      y: Math.min(H / 2, H - size - safeBottomPadding),
    };
    // Responsive scale factor for smaller screens
    const scale = W < 500 ? 0.5 : 1;

    // Initialize particles
    const particles: Particle[] = Array.from({ length: 100 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: (120 + Math.random() * 150) * scale,
      speed: 0.0002 + Math.random() * 0.0004,
      size: 1 + Math.random() * 2,
      drift: Math.random() * 20,
    }));

    // Initialize math symbols
    const symbols = ['∇L', '∂f', 'δ', 'Σ', 'λ', 'dx', '∂', 'f(x)', '∫'];
    const orbitSymbols: OrbitSymbol[] = symbols.map((s) => ({
      text: s,
      angle: Math.random() * Math.PI * 2,
      radius: (170 + Math.random() * 60) * scale,
      opacity: 0,
      fadeDelay: Math.random() * 2000,
    }));

    // Responsive size - smaller on mobile
    //const size = W < 500 ? 100 : 150;
    const leftLineExtraWidth = size * 0.05 * 0.8;

    const getTrianglePoints = (glitchOffset: Point = { x: 0, y: 0 }, forLeftLine = false): [Point, Point, Point] => {
      const offsetX = forLeftLine ? glitchOffset.x : glitchOffset.x + leftLineExtraWidth;
      return [
        { x: center.x - size * 0.86 + offsetX, y: center.y - size * 0.5 + glitchOffset.y },
        { x: center.x + size * 0.86 + offsetX, y: center.y - size * 0.5 + glitchOffset.y },
        { x: center.x + (forLeftLine ? glitchOffset.x : glitchOffset.x + leftLineExtraWidth), y: center.y + size + glitchOffset.y },
      ];
    };


    const drawCompletedNabla = (glow = 1, glitch: Point = { x: 0, y: 0 }) => {
      const [tlThin, tr, bThin] = getTrianglePoints(glitch, false);
      const [tlThick, , bThick] = getTrianglePoints(glitch, true);
      const baseWidth = 24;
      const leftWidth = baseWidth * 1.8;

      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * glow})`;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 35 * glow;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.lineWidth = baseWidth;
      ctx.moveTo(tlThin.x, tlThin.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.lineWidth = baseWidth;
      ctx.moveTo(tr.x, tr.y);
      ctx.lineTo(bThin.x+3, bThin.y + 5);
      ctx.stroke();

      ctx.beginPath();
      ctx.lineWidth = leftWidth;
      ctx.moveTo(bThick.x, bThick.y);
      ctx.lineTo(tlThick.x + 10, tlThick.y + 10);
      ctx.stroke();

      ctx.restore();
    };

    const drawParticles = (t: number, intensity = 1) => {
      particles.forEach((p) => {
        const angle = p.angle + t * p.speed;
        const dynamicRadius = p.radius + Math.sin(t * 0.001 + p.drift) * 8;
        const x = center.x + Math.cos(angle) * dynamicRadius;
        const y = center.y + Math.sin(angle) * dynamicRadius;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.08 * intensity})`;
        ctx.fill();
      });
    };

    const drawPulse = (progress: number) => {
      for (let i = 0; i < 7; i++) {
        const r = (100 + progress * 240 + i * 22) * scale;
        ctx.beginPath();
        ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.14 - i * 0.015})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const drawMathField = (t: number, phaseTime: number) => {
      orbitSymbols.forEach((sym, i) => {
        const fadeProgress = Math.max(0, Math.min(1, (phaseTime - sym.fadeDelay) / 1200));
        if (fadeProgress <= 0) return;

        const angle = sym.angle + t * 0.00012 + Math.sin(i + t * 0.00008) * 0.2;
        const x = center.x + Math.cos(angle) * sym.radius;
        const y = center.y + Math.sin(angle) * sym.radius;

        ctx.save();
        ctx.globalAlpha = fadeProgress * 0.32;
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.font = `${14 + Math.sin(i + t * 0.0002) * 2}px monospace`;
        ctx.fillText(sym.text, x, y);
        ctx.restore();
      });
    };

    const updateGlitch = (t: number, intensityMultiplier = 1) => {
      const glitchSpeed = 0.005;
      const baseIntensity = 0.3;
      const maxGlitch = 1;

      const wobbleX =
        Math.sin(t * glitchSpeed) * baseIntensity +
        Math.sin(t * glitchSpeed * 2.3) * (baseIntensity * 0.3) +
        Math.sin(t * glitchSpeed * 0.7) * (baseIntensity * 0.2);

      const wobbleY =
        Math.cos(t * glitchSpeed * 1.1) * baseIntensity +
        Math.cos(t * glitchSpeed * 1.7) * (baseIntensity * 0.3) +
        Math.sin(t * glitchSpeed * 0.5) * (baseIntensity * 0.2);

      const sharpGlitch = Math.sin(t * 0.01) > 0.98 ? Math.random() * maxGlitch - maxGlitch / 2 : 0;

      // Mouse proximity effect
      let mouseWobbleX = 0;
      let mouseWobbleY = 0;
      if (isHovering) {
        const dx = mousePosRef.current.x - center.x;
        const dy = mousePosRef.current.y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 300 * scale;
        if (dist < maxDist && dist > 0) {
          const influence = (1 - dist / maxDist) * 3;
          mouseWobbleX = Math.sin(t * 0.015) * influence * (dx / dist);
          mouseWobbleY = Math.cos(t * 0.012) * influence * (dy / dist);
        }
      }

      const totalX = (wobbleX + sharpGlitch + mouseWobbleX) * intensityMultiplier;
      const totalY = (wobbleY + sharpGlitch * 0.5 + mouseWobbleY) * intensityMultiplier;

      glitchRef.current = {
        offset: { x: totalX, y: totalY },
        intensity: Math.abs(totalX) + Math.abs(totalY),
      };
    };

    const drawFloatingSymbols = () => {
      const symbols = clickSymbolsRef.current;
      if (symbols.length === 0) return;

      // Cap symbol count to prevent overcrowding
      while (symbols.length > 60) {
        symbols.shift(); // remove oldest
      }

      const velocity = avgVelocityRef.current; // pixels per second
      const isMouseOutside = mousePosRef.current.x < 0 || mousePosRef.current.x > W ||
        mousePosRef.current.y < 0 || mousePosRef.current.y > H;

      for (let i = symbols.length - 1; i >= 0; i--) {
        const sym = symbols[i];
        sym.life += 16; // ~16ms per frame at 60fps
        const lifeRatio = sym.life / sym.maxLife;

        // Force removal if way past lifetime (20% beyond) regardless of mouse
        const isMouseSlow = velocity < 10;
        if (lifeRatio >= 1 && (isMouseSlow || isMouseOutside || lifeRatio >= 1.2)) {
          symbols.splice(i, 1);
          continue;
        }

        // Update rotation - very slow, based on symbol's movement toward cursor
        const dx = mousePosRef.current.x - sym.x;
        const dy = mousePosRef.current.y - sym.y;
        // Rotate at ~5% of approach speed, direction based on side
        // Move towards target (mouse position) with slight tangential orbit ("sucked" effect)
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r > 0) {
          const angle = Math.atan2(dy, dx);
          const tangentialFactor = 0.1; // orbit strength - very subtle
          // Radial movement + tangential orbit
          const radialX = dx * 0.02;
          const radialY = dy * 0.02;
          const tangentX = -dy / r * tangentialFactor * 0.02 * r;
          const tangentY = dx / r * tangentialFactor * 0.02 * r;
          sym.x += radialX + tangentX;
          sym.y += radialY + tangentY;
          // Rotation matches orbit tangent (dependent on movement, very slow & smooth)
          const targetRotation = (angle * 180 / Math.PI) + 90; // desired angle in degrees
          // Smoothly interpolate towards target (5% per frame)
          sym.rotation += (targetRotation - sym.rotation) * 0.05;
        }

        // Opacity: fade in, stay, fade out (max 0.15 to prevent "very white")
        let opacity;
        const fadeInEnd = 0.2;
        const fadeOutStart = 0.5;
        const maxOpacity = 0.15; // reduced from 0.32
        const cappedLifeRatio = Math.min(lifeRatio, 1);
        if (cappedLifeRatio < fadeInEnd) {
          opacity = (cappedLifeRatio / fadeInEnd) * maxOpacity;
        } else if (cappedLifeRatio < fadeOutStart) {
          opacity = maxOpacity;
        } else {
          opacity = maxOpacity * (1 - (cappedLifeRatio - fadeOutStart) / (1 - fadeOutStart));
        }

        ctx.save();
        ctx.translate(Math.round(sym.x + sym.offsetX), Math.round(sym.y + sym.offsetY));
        ctx.rotate((sym.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, Math.min(1, opacity)); // clamp opacity
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sym.text, 0, 0);
        ctx.restore();
      }
    };

    const animate = (ts: number) => {
      const dt = ts - lastTimeRef.current;
      lastTimeRef.current = ts;
      totalTimeRef.current += dt;

      const totalTime = totalTimeRef.current;

      ctx.clearRect(0, 0, W, H);

      drawParticles(totalTime, 1);

      if (totalTime < introDuration) {
        const introProgress = totalTime / introDuration;
        updateGlitch(totalTime, introProgress);
        const { offset } = glitchRef.current;
        drawCompletedNabla(1.25, offset);
        drawPulse(introProgress);
      } else {
        updateGlitch(totalTime, 1);
        const { offset } = glitchRef.current;
        drawCompletedNabla(1.15, offset);
        drawMathField(totalTime, totalTime - introDuration);
      }

      drawFloatingSymbols();

      animationRef.current = requestAnimationFrame(animate);
    };
    // const resizeCanvas = () => {
    //   const rect = canvas.getBoundingClientRect();
    //   canvas.width = rect.width * dpr;
    //   canvas.height = rect.height * dpr;
    //   ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // };

    // document.addEventListener('resize', resizeCanvas);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      // document.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ width: '100%', height: '100%', minHeight: '200px' }}
    />
  );
};

export default HeroAnimation;
