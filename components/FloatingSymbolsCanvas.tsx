'use client'

import React, { useEffect, useRef } from 'react';

// === Types ===

interface FloatingSymbol {
  text: string;
  x: number;
  y: number;
  opacity: number;
  life: number;
  maxLife: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

// === Main Component ===

const FloatingSymbolsCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const symbolsRef = useRef<FloatingSymbol[]>([]);
  const mousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // === Mouse Tracking ===
    const handleMouseMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mousePosRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    // === Click Handler - Spawn Math Symbols ===
    const handleClick = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;

      if (x < 0 || x > r.width || y < 0 || y > r.height) return;

      const mathSymbols = ['∇L', '∂f', 'δ', 'Σ', 'λ', 'dx', '∂', 'f(x)', '∫', '∇', '∞', '≈', 'θ', 'π', 'Δ', '∏', '∐', '∑', '∈', '∉', '∩', '∪', '⊂', '⊃', '⇒', '⇔', '≤', '≥', '≠', '≈', '∝', '∽', '∂²', '∇²', '∮'];
      const count = 3 + Math.floor(Math.random() * 3);

      for (let i = 0; i < count; i++) {
        const edge = ['top', 'bottom', 'left', 'right'][Math.floor(Math.random() * 4)];
        let sx: number, sy: number;

        switch (edge) {
          case 'top': sx = Math.random() * r.width; sy = -30; break;
          case 'bottom': sx = Math.random() * r.width; sy = r.height + 30; break;
          case 'left': sx = -30; sy = Math.random() * r.height; break;
          case 'right': sx = r.width + 30; sy = Math.random() * r.height; break;
        }

        symbolsRef.current.push({
          text: mathSymbols[Math.floor(Math.random() * mathSymbols.length)],
          x: sx,
          y: sy,
          opacity: 0,
          life: 0,
          maxLife: 3000 + Math.random() * 2000,
          offsetX: (Math.random() - 0.5) * 30,
          offsetY: (Math.random() - 0.5) * 30,
          rotation: Math.random() * 360,
        });
      }
    };

    // === Draw Symbols ===
    const draw = () => {
      const symbols = symbolsRef.current;
      if (symbols.length === 0) return;

      // Limit max symbols
      while (symbols.length > 60) symbols.shift();

      for (let i = symbols.length - 1; i >= 0; i--) {
        const sym = symbols[i];
        sym.life += 16;
        const life = sym.life / sym.maxLife;

        // Remove dead symbols
        if (life >= 1) {
          symbols.splice(i, 1);
          continue;
        }

        // Spring attraction toward mouse
        const dx = mousePosRef.current.x - sym.x;
        const dy = mousePosRef.current.y - sym.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
          const angle = Math.atan2(dy, dx);
          const radial = 0.01;
          const tangent = 0.002;

          sym.x += dx * radial + (-dy / dist) * tangent * dist;
          sym.y += dy * radial + (dx / dist) * tangent * dist;

          // Rotation toward mouse
          sym.rotation += ((angle * 180 / Math.PI) + 90 - sym.rotation) * 0.05;
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

        ctx.save();
        ctx.translate(Math.round(sym.x + sym.offsetX), Math.round(sym.y + sym.offsetY));
        ctx.rotate((sym.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sym.text, 0, 0);
        ctx.restore();
      }
    };

    // === Animation Loop ===
    const animate = () => {
      const r = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default FloatingSymbolsCanvas;