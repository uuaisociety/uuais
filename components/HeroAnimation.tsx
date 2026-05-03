'use client'

import React, { useEffect, useRef, useState } from 'react';

// === Types ===

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

interface Point {
  x: number;
  y: number;
}

// === Main Component ===

const HeroAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const totalTimeRef = useRef<number>(0);
  const [isHovering, setIsHovering] = useState(false);
  const mousePosRef = useRef({ x: 0, y: 0 });

  const introDuration = 3000;
  const glitchRef = useRef({ offset: { x: 0, y: 0 }, intensity: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // === Canvas Setup ===
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const isSmall = W < 500;
    const virtualW = isSmall ? Math.min(W, H * 0.9) : W;
    const offsetX = isSmall ? (W - virtualW) / 2 : 0;
    const size = W < 500 ? 100 : 150;
    const scale = W < 500 ? 0.5 : 1;
    const center = {
      x: offsetX + virtualW * 0.5,
      y: Math.min(H / 2, H - size * 1.35),
    };

    // === Mouse Tracking ===
    const handleMouseMove = (e: MouseEvent) => {
      const rc = canvas.getBoundingClientRect();
      const x = e.clientX - rc.left;
      const y = e.clientY - rc.top;
      mousePosRef.current = { x, y };
      setIsHovering(x >= 0 && x <= rc.width && y >= 0 && y <= rc.height);
    };

    // === Initialize Particles ===
    const particles: Particle[] = Array.from({ length: 100 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: (120 + Math.random() * 150) * scale,
      speed: 0.0002 + Math.random() * 0.0004,
      size: 1 + Math.random() * 2,
      drift: Math.random() * 20,
    }));

    // === Initialize Math Symbols ===
    const symbols = ['∇L', '∂f', 'δ', 'Σ', 'λ', 'dx', '∂', 'f(x)', '∫'];
    const orbitSymbols: OrbitSymbol[] = symbols.map((s) => ({
      text: s,
      angle: Math.random() * Math.PI * 2,
      radius: (170 + Math.random() * 60) * scale,
      opacity: 0,
      fadeDelay: Math.random() * 2000,
    }));

    // === Drawing Functions ===

    const drawNabla = (glow: number, glitch: Point) => {
      const gx = glitch.x;
      const gy = glitch.y;
      const cx = center.x;
      const cy = center.y;

      // Corner positions
      const tlX = cx - size * 0.86 + gx;
      const tlY = cy - size * 0.5 + gy;
      const trX = cx + size * 0.86 + gx;
      const trY = cy - size * 0.5 + gy;
      const bX = cx + gx;
      const bY = cy + size + gy;

      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * glow})`;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 15 * glow;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Top line (from left to right, shortened slightly at right for cleaner join)
      ctx.beginPath();
      ctx.lineWidth = size * 0.38;
      ctx.moveTo(tlX, tlY);
      ctx.lineTo(trX - size * 0.08, trY);
      ctx.stroke();

      // Right line (from top-right to bottom)
      ctx.beginPath();
      ctx.lineWidth = size * 0.24;
      ctx.moveTo(trX, trY);
      ctx.lineTo(bX + size * 0.05, bY+ size*0.15);
      ctx.stroke();

      // Left line (thicker, from bottom to top-left)
      ctx.beginPath();
      ctx.lineWidth = size * 0.50;
      ctx.moveTo(bX - size * 0.05, bY + size*0.06);
      ctx.lineTo(tlX + size * 0.05, tlY + size*0.06);
      ctx.stroke();

      ctx.restore();
    };

    const drawParticles = (t: number) => {
      particles.forEach((p) => {
        const angle = p.angle + t * p.speed;
        const r = p.radius + Math.sin(t * 0.001 + p.drift) * 8;
        ctx.beginPath();
        ctx.arc(center.x + Math.cos(angle) * r, center.y + Math.sin(angle) * r, p.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fill();
      });
    };

    const drawPulse = (progress: number, fade = 1) => {
      for (let i = 0; i < 7; i++) {
        const r = (100 + progress * 120 + i * 22) * scale;
        ctx.beginPath();
        ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.14 - i * 0.015) * fade})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const drawMathSymbols = (t: number, phaseTime: number) => {
      orbitSymbols.forEach((sym, i) => {
        const fade = Math.max(0, Math.min(1, (phaseTime - sym.fadeDelay) / 1200));
        if (fade <= 0) return;

        const angle = sym.angle + t * 0.00012 + Math.sin(i + t * 0.00008) * 0.2;
        ctx.save();
        ctx.globalAlpha = fade * 0.32;
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.font = `${14 + Math.sin(i + t * 0.0002) * 2}px monospace`;
        ctx.fillText(sym.text, center.x + Math.cos(angle) * sym.radius, center.y + Math.sin(angle) * sym.radius);
        ctx.restore();
      });
    };

    const updateGlitch = (t: number, intensity: number) => {
      const speed = 0.005;
      const base = 0.3;

      const wobbleX = Math.sin(t * speed) * base + Math.sin(t * speed * 2.3) * base * 0.3 + Math.sin(t * speed * 0.7) * base * 0.2;
      const wobbleY = Math.cos(t * speed * 1.1) * base + Math.cos(t * speed * 1.7) * base * 0.3 + Math.sin(t * speed * 0.5) * base * 0.2;
      const sharp = Math.sin(t * 0.01) > 0.98 ? Math.random() - 0.5 : 0;

      // Mouse proximity effect
      let mouseX = 0, mouseY = 0;
      if (isHovering) {
        const dx = mousePosRef.current.x - center.x;
        const dy = mousePosRef.current.y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 300 * scale && dist > 0) {
          const influence = (1 - dist / (300 * scale)) * 3;
          mouseX = Math.sin(t * 0.015) * influence * (dx / dist);
          mouseY = Math.cos(t * 0.012) * influence * (dy / dist);
        }
      }

      glitchRef.current = {
        offset: { x: (wobbleX + sharp + mouseX) * intensity, y: (wobbleY + sharp * 0.5 + mouseY) * intensity },
        intensity: Math.abs(wobbleX + sharp + mouseX) + Math.abs(wobbleY + sharp * 0.5 + mouseY),
      };
    };

    // === Animation Loop ===
    const animate = (ts: number) => {
      const dt = ts - lastTimeRef.current;
      lastTimeRef.current = ts;
      totalTimeRef.current += dt;
      const t = totalTimeRef.current;

      ctx.clearRect(0, 0, W, H);
      drawParticles(t);

      if (t < introDuration) {
        // Intro phase: show nabla with pulse expanding
        const progress = t / introDuration;
        updateGlitch(t, progress);
        drawNabla(1.25, glitchRef.current.offset);
        drawPulse(progress);
      } else {
        // Post-intro: show nabla and math symbols
        updateGlitch(t, 1);
        drawNabla(1.15, glitchRef.current.offset);
        drawMathSymbols(t, t - introDuration);

        // Fade out pulse over 750ms
        const fadeTime = t - introDuration;
        const fade = Math.max(0, 1 - fadeTime / 750);
        if (fade > 0) drawPulse(t / introDuration, fade);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    // === Event Listeners ===
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    document.addEventListener('resize', resize);
    document.addEventListener('mousemove', handleMouseMove);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      document.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', handleMouseMove);
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