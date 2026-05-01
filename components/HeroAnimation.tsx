'use client'

import React, { useEffect, useRef } from 'react';

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

const HeroAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const totalTimeRef = useRef<number>(0);

  const introDuration = 3000; // Logo shown with pulse building + wobble ramping up
  const glitchRef = useRef({ offset: { x: 0, y: 0 }, intensity: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
    const center = { x: W / 2, y: H / 2 };

    // Initialize particles
    const particles: Particle[] = Array.from({ length: 100 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: 120 + Math.random() * 150,
      speed: 0.0002 + Math.random() * 0.0004,
      size: 1 + Math.random() * 2,
      drift: Math.random() * 20,
    }));

    // Initialize math symbols
    const symbols = ['∇L', '∂f', 'δ', 'Σ', 'λ', 'dx', '∂', 'f(x)', '∫'];
    const orbitSymbols: OrbitSymbol[] = symbols.map((s) => ({
      text: s,
      angle: Math.random() * Math.PI * 2,
      radius: 170 + Math.random() * 60,
      opacity: 0,
      fadeDelay: Math.random() * 2000,
    }));

    // Fixed size for consistent aspect ratio regardless of window size
    const size = 150;
    const leftLineExtraWidth = size * 0.05 * 0.8; // Half of extra thickness (1.8x - 1x = 0.8x extra, half on each side)

    // Get triangle points: top-left, top-right, bottom
    // Offset left points to account for thicker left line so it doesn't stick out
    const getTrianglePoints = (glitchOffset: Point = { x: 0, y: 0 }, forLeftLine = false): [Point, Point, Point] => {
      const offsetX = forLeftLine ? glitchOffset.x : glitchOffset.x + leftLineExtraWidth;
      return [
        { x: center.x - size * 0.86 + offsetX, y: center.y - size * 0.5 + glitchOffset.y }, // top-left (offset right for thinner lines)
        { x: center.x + size * 0.86 + glitchOffset.x, y: center.y - size * 0.5 + glitchOffset.y }, // top-right
        { x: center.x + (forLeftLine ? glitchOffset.x : glitchOffset.x + leftLineExtraWidth), y: center.y + size + glitchOffset.y }, // bottom (offset right for thinner lines)
      ];
    };

    // Draw a single line segment with progress
    const drawSegment = (
      from: Point,
      to: Point,
      progress: number,
      lineWidth: number,
      glow: number
    ) => {
      const currX = from.x + (to.x - from.x) * progress;
      const currY = from.y + (to.y - from.y) * progress;

      ctx.save();
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = `rgba(220, 38, 38, ${0.95 * glow})`;
      ctx.shadowColor = 'rgba(220, 38, 38, 0.9)';
      ctx.shadowBlur = 35 * glow;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(currX, currY);
      ctx.stroke();
      ctx.restore();
    };

    // Draw the nabla with new animation order: top-left -> top-right -> bottom -> top-left
    // Segments: 0->1 (top), 1->2 (right side), 2->0 (left side - thicker)
    const drawNabla = (progress: number, glow = 1, glitch: Point = { x: 0, y: 0 }) => {
      const [tlThin, tr, bThin] = getTrianglePoints(glitch, false);
      const [tlThick, , bThick] = getTrianglePoints(glitch, true);

      const baseWidth = 24;
      const leftWidth = baseWidth * 1.8; // Left line is thicker like the logo

      // Animation order: top-left -> top-right (seg 1), top-right -> bottom (seg 2), bottom -> top-left (seg 3)
      const seg1Progress = Math.min(Math.max(progress * 3, 0), 1); // top line
      const seg2Progress = Math.min(Math.max(progress * 3 - 1, 0), 1); // right side
      const seg3Progress = Math.min(Math.max(progress * 3 - 2, 0), 1); // left side

      // Draw segment 1: top-left to top-right (top line)
      if (seg1Progress > 0) {
        drawSegment(tlThin, tr, seg1Progress, baseWidth, glow);
      }

      // Draw segment 2: top-right to bottom (right side)
      if (seg2Progress > 0) {
        drawSegment(tr, bThin, seg2Progress, baseWidth, glow);
      }

      // Draw segment 3: bottom to top-left (left side - thicker)
      if (seg3Progress > 0) {
        drawSegment(bThick, tlThick, seg3Progress, leftWidth, glow);
      }
    };

    // Draw completed nabla (for phases after drawing)
    const drawCompletedNabla = (glow = 1, glitch: Point = { x: 0, y: 0 }) => {
      const [tlThin, tr, bThin] = getTrianglePoints(glitch, false);
      const [tlThick, , bThick] = getTrianglePoints(glitch, true);
      const baseWidth = 24;
      const leftWidth = baseWidth * 1.8;

      ctx.save();
      ctx.strokeStyle = `rgba(220, 38, 38, ${0.95 * glow})`;
      ctx.shadowColor = 'rgba(220, 38, 38, 0.9)';
      ctx.shadowBlur = 35 * glow;
      ctx.lineCap = 'round';

      // Top line (thinner)
      ctx.beginPath();
      ctx.lineWidth = baseWidth;
      ctx.moveTo(tlThin.x, tlThin.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.stroke();

      // Right side (thinner)
      ctx.beginPath();
      ctx.lineWidth = baseWidth;
      ctx.moveTo(tr.x, tr.y);
      ctx.lineTo(bThin.x, bThin.y + 5);
      ctx.stroke();

      // Left side (thicker like logo)
      ctx.beginPath();
      ctx.lineWidth = leftWidth;
      ctx.moveTo(bThick.x, bThick.y);
      ctx.lineTo(tlThick.x + baseWidth / 2, tlThick.y + (baseWidth / 2) - 2);
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
        ctx.fillStyle = `rgba(220, 38, 38, ${0.08 * intensity})`;
        ctx.fill();
      });
    };

    const drawPulse = (progress: number) => {
      for (let i = 0; i < 7; i++) {
        const r = 100 + progress * 240 + i * 22;
        ctx.beginPath();
        ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(220, 38, 38, ${0.14 - i * 0.015})`;
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
        ctx.fillStyle = 'rgba(220, 38, 38, 1)';
        ctx.font = `${14 + Math.sin(i + t * 0.0002) * 2}px monospace`;
        ctx.fillText(sym.text, x, y);
        ctx.restore();
      });
    };

    // Generate random glitch offset - much more subtle
    const updateGlitch = (t: number, intensityMultiplier = 1) => {
      const glitchSpeed = 0.005; // Slower, more subtle
      const baseIntensity = 0.3; // Much less noticeable
      const maxGlitch = 1; // Reduced sharp glitches

      // Use multiple sine waves with different frequencies for organic wobble
      const wobbleX =
        Math.sin(t * glitchSpeed) * baseIntensity +
        Math.sin(t * glitchSpeed * 2.3) * (baseIntensity * 0.3) +
        Math.sin(t * glitchSpeed * 0.7) * (baseIntensity * 0.2);

      const wobbleY =
        Math.cos(t * glitchSpeed * 1.1) * baseIntensity +
        Math.cos(t * glitchSpeed * 1.7) * (baseIntensity * 0.3) +
        Math.sin(t * glitchSpeed * 0.5) * (baseIntensity * 0.2);

      // Rare, subtle sharp glitches
      const sharpGlitch = Math.sin(t * 0.01) > 0.98 ? Math.random() * maxGlitch - maxGlitch / 2 : 0;

      const totalX = (wobbleX + sharpGlitch) * intensityMultiplier;
      const totalY = (wobbleY + sharpGlitch * 0.5) * intensityMultiplier;

      glitchRef.current = {
        offset: { x: totalX, y: totalY },
        intensity: Math.abs(totalX) + Math.abs(totalY),
      };
    };

    const animate = (ts: number) => {
      const dt = ts - lastTimeRef.current;
      lastTimeRef.current = ts;
      totalTimeRef.current += dt;

      const totalTime = totalTimeRef.current;

      ctx.clearRect(0, 0, W, H);

      drawParticles(totalTime, 1);

      // Logo shown from start - wobble and pulse build up during intro
      if (totalTime < introDuration) {
        const introProgress = totalTime / introDuration;

        // Wobble intensity ramps up from 0 to 1 during intro
        updateGlitch(totalTime, introProgress);
        const { offset } = glitchRef.current;
        drawCompletedNabla(1.25, offset);
        drawPulse(introProgress);
      } else {
        // Steady state with subtle wobble and math symbols
        updateGlitch(totalTime, 1);
        const { offset } = glitchRef.current;
        drawCompletedNabla(1.15, offset);
        drawMathField(totalTime, totalTime - introDuration);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default HeroAnimation;
