"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import type { Course } from "@/lib/courses";

interface EmbeddingPoint {
    courseId: string;
    title: string;
    code: string;
    level: string;
    credits: number;
    x: number;
    y: number;
}

type Props = {
    recommendedIds?: string[];
    onCourseClick?: (courseId: string) => void;
    height?: number;
};

const LEVEL_COLORS: Record<string, string> = {
    "Preparatory": "#6366f1",   // indigo
    "Bachelor's": "#06b6d4",    // cyan
    "Master's": "#f59e0b",      // amber
    "": "#94a3b8",              // gray for unknown
};

const LEVEL_COLORS_MUTED: Record<string, string> = {
    "Preparatory": "rgba(99,102,241,0.25)",
    "Bachelor's": "rgba(6,182,212,0.25)",
    "Master's": "rgba(245,158,11,0.25)",
    "": "rgba(148,163,184,0.2)",
};

export default function EmbeddingMap({ recommendedIds = [], onCourseClick, height = 500 }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [points, setPoints] = useState<EmbeddingPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hoveredPoint, setHoveredPoint] = useState<EmbeddingPoint | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [transform, setTransform] = useState({ offsetX: 0, offsetY: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [resizeTick, setResizeTick] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const animFrameRef = useRef<number>(0);

    const recommendedSet = useMemo(() => new Set(recommendedIds), [recommendedIds]);

    const getCanvasRect = useCallback(() => {
        if (!canvasRef.current) return { width: 800, height: height, left: 0, top: 0 };
        return canvasRef.current.getBoundingClientRect();
    }, [height]);

    // Fetch embedding map data
    useEffect(() => {
        const fetchMap = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await fetch('/api/courses/embedding-map?dimensions=2&algorithm=tsne');
                if (!res.ok) throw new Error('Failed to load embedding map');
                const data = await res.json();
                setPoints(data.points || []);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };
        fetchMap();
    }, []);

    // Resize observer
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const observer = new ResizeObserver(() => setResizeTick(t => t + 1));
        observer.observe(canvas);
        return () => observer.disconnect();
    }, []);

    // Convert data coordinates to canvas coordinates
    const toCanvas = useCallback((x: number, y: number) => {
        const padding = 60;
        const rect = getCanvasRect();
        const plotW = rect.width - padding * 2;
        const plotH = rect.height - padding * 2;
        return {
            cx: (padding + x * plotW) * transform.scale + transform.offsetX,
            cy: (padding + y * plotH) * transform.scale + transform.offsetY,
        };
    }, [getCanvasRect, transform]);

    // Convert canvas coordinates back to data coordinates
    const fromCanvas = useCallback((cx: number, cy: number) => {
        const padding = 60;
        const rect = getCanvasRect();
        const plotW = rect.width - padding * 2;
        const plotH = rect.height - padding * 2;
        return {
            x: ((cx - transform.offsetX) / transform.scale - padding) / plotW,
            y: ((cy - transform.offsetY) / transform.scale - padding) / plotH,
        };
    }, [getCanvasRect, transform]);

    // Find nearest point to mouse
    const findNearest = useCallback((mx: number, my: number): EmbeddingPoint | null => {
        let minDist = 20; // threshold in pixels
        let nearest: EmbeddingPoint | null = null;

        for (const p of points) {
            const { cx, cy } = toCanvas(p.x, p.y);
            const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
            if (dist < minDist) {
                minDist = dist;
                nearest = p;
            }
        }
        return nearest;
    }, [points, toCanvas]);

    // Render canvas
    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = getCanvasRect();
        if (rect.width === 0 || rect.height === 0) return;

        const dpr = window.devicePixelRatio || 1;
        const displayWidth = Math.round(rect.width * dpr);
        const displayHeight = Math.round(rect.height * dpr);

        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform matrix
        ctx.scale(dpr, dpr);

        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, rect.width, rect.height);

        // Draw grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            const { cx, cy } = toCanvas(i / 10, i / 10);
            const { cx: x0 } = toCanvas(0, 0);
            const { cx: x1 } = toCanvas(1, 0);
            const { cy: y0 } = toCanvas(0, 0);
            const { cy: y1 } = toCanvas(0, 1);

            ctx.beginPath();
            ctx.moveTo(cx, y0);
            ctx.lineTo(cx, y1);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x0, cy);
            ctx.lineTo(x1, cy);
            ctx.stroke();
        }

        // Draw non-recommended points first (background)
        for (const p of points) {
            if (recommendedSet.has(p.courseId)) continue;
            const { cx, cy } = toCanvas(p.x, p.y);
            const color = LEVEL_COLORS_MUTED[p.level] || LEVEL_COLORS_MUTED[""];
            const radius = 3 * transform.scale;

            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(1.5, radius), 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        }

        // Draw recommended points (highlighted)
        const time = Date.now();
        for (const p of points) {
            if (!recommendedSet.has(p.courseId)) continue;
            const { cx, cy } = toCanvas(p.x, p.y);
            const color = LEVEL_COLORS[p.level] || LEVEL_COLORS[""];
            const pulseScale = 1 + 0.15 * Math.sin(time / 300);
            const radius = 6 * transform.scale * pulseScale;

            // Glow
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 3);
            gradient.addColorStop(0, color + '60');
            gradient.addColorStop(1, 'transparent');
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 3, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Point
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(3, radius), 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Label
            ctx.font = `${Math.max(9, 11 * transform.scale)}px Inter, system-ui, sans-serif`;
            ctx.fillStyle = '#e2e8f0';
            ctx.textAlign = 'left';
            ctx.fillText(p.title.length > 30 ? p.title.slice(0, 28) + '…' : p.title, cx + radius + 4, cy + 4);
        }

        // Hovered point highlight
        if (hoveredPoint) {
            const { cx, cy } = toCanvas(hoveredPoint.x, hoveredPoint.y);
            const isRec = recommendedSet.has(hoveredPoint.courseId);
            const color = LEVEL_COLORS[hoveredPoint.level] || LEVEL_COLORS[""];
            const radius = isRec ? 8 : 6;

            // Highlight ring
            ctx.beginPath();
            ctx.arc(cx, cy, radius * transform.scale + 4, 0, Math.PI * 2);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Point
            ctx.beginPath();
            ctx.arc(cx, cy, radius * transform.scale, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        }

        // Legend
        const legendX = 16;
        let legendY = rect.height - 80;
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';

        for (const [level, color] of Object.entries(LEVEL_COLORS)) {
            if (!level) continue;
            ctx.beginPath();
            ctx.arc(legendX + 6, legendY, 5, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(level, legendX + 16, legendY + 4);
            legendY += 18;
        }

        if (recommendedSet.size > 0) {
            ctx.fillStyle = '#64748b';
            ctx.fillText(`${recommendedSet.size} recommended highlighted`, legendX, legendY + 4);
        }
    }, [points, recommendedSet, hoveredPoint, getCanvasRect, toCanvas, transform, resizeTick]);

    // Animation loop for pulsing recommended points
    useEffect(() => {
        if (points.length === 0) return;

        let running = true;
        const animate = () => {
            if (!running) return;
            render();
            if (recommendedSet.size > 0) {
                animFrameRef.current = requestAnimationFrame(animate);
            }
        };

        render();
        if (recommendedSet.size > 0) {
            animFrameRef.current = requestAnimationFrame(animate);
        }

        return () => {
            running = false;
            cancelAnimationFrame(animFrameRef.current);
        };
    }, [render, points, recommendedSet]);

    // Mouse events
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        setMousePos({ x: e.clientX, y: e.clientY });

        if (isDragging) {
            setTransform(prev => ({
                ...prev,
                offsetX: prev.offsetX + (mx - dragStart.x),
                offsetY: prev.offsetY + (my - dragStart.y),
            }));
            setDragStart({ x: mx, y: my });
            return;
        }

        const nearest = findNearest(mx, my);
        setHoveredPoint(nearest);
        if (canvasRef.current) {
            canvasRef.current.style.cursor = nearest ? 'pointer' : 'grab';
        }
    }, [isDragging, dragStart, findNearest]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const nearest = findNearest(mx, my);
        if (nearest) return; // Don't start drag if hovering a point

        setIsDragging(true);
        setDragStart({ x: mx, y: my });
        if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    }, [findNearest]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    }, []);

    const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const nearest = findNearest(mx, my);
        if (nearest && onCourseClick) {
            onCourseClick(nearest.courseId);
        }
    }, [findNearest, onCourseClick]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onWheelEvent = (e: WheelEvent) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            if (!rect) return;
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
            setTransform(prev => {
                const newScale = Math.min(10, Math.max(0.5, prev.scale * zoomFactor));
                // Zoom towards mouse position
                const ratio = newScale / prev.scale;
                return {
                    scale: newScale,
                    offsetX: mx - (mx - prev.offsetX) * ratio,
                    offsetY: my - (my - prev.offsetY) * ratio,
                };
            });
        };

        canvas.addEventListener('wheel', onWheelEvent, { passive: false });
        return () => canvas.removeEventListener('wheel', onWheelEvent);
    }, []);

    const handleReset = useCallback(() => {
        setTransform({ offsetX: 0, offsetY: 0, scale: 1 });
    }, []);

    if (loading) {
        return (
            <div
                className="flex items-center justify-center rounded-lg border border-gray-700 bg-[#0f172a]"
                style={{ height }}
            >
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                    <span className="text-sm text-gray-400">Computing embedding projection…</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div
                className="flex items-center justify-center rounded-lg border border-red-800 bg-red-950/30"
                style={{ height }}
            >
                <div className="text-sm text-red-400">
                    Failed to load embedding map: {error}
                </div>
            </div>
        );
    }

    if (points.length === 0) {
        return (
            <div
                className="flex items-center justify-center rounded-lg border border-gray-700 bg-[#0f172a]"
                style={{ height }}
            >
                <div className="text-sm text-gray-400">
                    No course embeddings available. Generate embeddings first from the admin panel.
                </div>
            </div>
        );
    }

    return (
        <div
            className={isFullscreen ? "fixed inset-4 z-50 bg-[#0f172a] rounded-xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden" : "relative rounded-lg border border-gray-700 overflow-hidden"}
            style={{ height: isFullscreen ? undefined : height, touchAction: 'none' }}
            ref={containerRef}
        >
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', touchAction: 'none' }}
                className="cursor-grab bg-[#0f172a]"
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={handleClick}
            />

            {/* Toolbar */}
            <div className="absolute top-3 right-3 flex gap-2">
                <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="px-2.5 py-1 text-xs rounded bg-gray-800/80 text-gray-300 hover:bg-gray-700 border border-gray-600 backdrop-blur-sm transition-colors"
                >
                    {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                </button>
                <button
                    onClick={handleReset}
                    className="px-2.5 py-1 text-xs rounded bg-gray-800/80 text-gray-300 hover:bg-gray-700 border border-gray-600 backdrop-blur-sm transition-colors"
                >
                    Reset View
                </button>
            </div>

            {/* Course count */}
            <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                {points.length} courses plotted
            </div>

            {/* Tooltip */}
            {hoveredPoint && !isDragging && (
                <div
                    className="fixed z-50 pointer-events-none"
                    style={{
                        left: mousePos.x + 14,
                        top: mousePos.y - 10,
                    }}
                >
                    <div className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 shadow-xl max-w-xs">
                        <div className="font-medium text-white text-sm">{hoveredPoint.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{hoveredPoint.code}</div>
                        <div className="flex gap-3 mt-1">
                            {hoveredPoint.level && (
                                <span className="text-xs" style={{ color: LEVEL_COLORS[hoveredPoint.level] }}>
                                    {hoveredPoint.level}
                                </span>
                            )}
                            {hoveredPoint.credits > 0 && (
                                <span className="text-xs text-gray-400">{hoveredPoint.credits} credits</span>
                            )}
                        </div>
                        {recommendedSet.has(hoveredPoint.courseId) && (
                            <div className="text-xs text-indigo-400 mt-1 font-medium">★ Recommended</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
