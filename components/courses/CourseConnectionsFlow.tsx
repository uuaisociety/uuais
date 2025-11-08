"use client";

import React, { useMemo, useCallback, useState } from "react";
import ReactFlow, { Background, Controls, Node, Edge } from "reactflow";
import "reactflow/dist/style.css";
import type { Course } from "@/lib/courses";
import { useRouter } from "next/navigation";
import dagre from "dagre";

type Props = {
  focus: Course;
  all: Course[];
  height?: number;
  hrefBase?: string; // e.g., "/explore"
};

export default function CourseConnectionsFlow({ focus, all, height = 360, hrefBase = "/explore" }: Props) {
  const router = useRouter();
  const [isFull, setIsFull] = useState(false);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const byId = new Map(all.map((c) => [c.id, c] as const));

    // Partition data
    const reqCourseIds = (focus.requirements || []).filter((id) => byId.has(id));
    const generalReqs = (focus.generalRequirements || []).filter(Boolean);
    const dependents = all.filter((c) => (c.requirements || []).includes(focus.id));
    const related = (focus.relatedCourses || []).filter((id) => byId.has(id) && !reqCourseIds.includes(id) && !dependents.some(d => d.id === id));

    // Build nodes
    const addCourseNode = (c: Course, pos: { x: number; y: number }) => {
      const credits = c.tags.find((t) => t.toLowerCase().includes("credits")) || "";
      nodes.push({
        id: c.id,
        data: { label: `${c.title}${credits ? ` (${credits})` : ""}`, kind: 'course' },
        position: pos,
        style: {
          borderRadius: 8,
          padding: 8,
          border: c.id === focus.id ? "2px solid #990000" : "1px solid #e5e7eb",
          background: c.id === focus.id ? "#fff5f5" : "white",
        },
      });
    };

    // Helper to extract possible course codes from free text (e.g., 2FE032, 1DL034, etc.)
    const codeRegex = /\b[0-9A-Z]{2,}[0-9]{2,}\b/gi;
    const extractedReqCourseIds = new Set<string>();
    const cleanedGeneralReqs: string[] = [];
    generalReqs.forEach((text) => {
      const found = (text.match(codeRegex) || []).map((s) => s.toUpperCase());
      // Map found codes to course IDs in our dataset by comparing to c.code (uppercased)
      const matchedCourses = all.filter((c) => c.code && found.includes(c.code.toUpperCase()));
      matchedCourses.forEach((c) => extractedReqCourseIds.add(c.id));
      // Remove matched codes from the text to keep text nodes concise
      let reduced = text;
      found.forEach((code) => {
        reduced = reduced.replace(new RegExp(code, 'gi'), '').replace(/\s{2,}/g, ' ').trim();
      });
      if (reduced) cleanedGeneralReqs.push(reduced);
    });

    // Merge extracted requirement courses into reqCourseIds
    const reqSet = new Set<string>(reqCourseIds);
    extractedReqCourseIds.forEach((id) => reqSet.add(id));
    const mergedReqCourseIds = Array.from(reqSet);

    // Create dagre graph for auto layout
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', ranksep: 90, nodesep: 60 });
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes to dagre (course nodes only)
    const courseNodeIds = new Set<string>([focus.id, ...mergedReqCourseIds, ...dependents.map(d => d.id)]);
    courseNodeIds.forEach((id) => {
      g.setNode(id, { width: 220, height: 64 });
    });

    // Edges: requirements -> focus, focus -> dependents
    mergedReqCourseIds.forEach((id) => g.setEdge(id, focus.id));
    dependents.forEach((d) => g.setEdge(focus.id, d.id));

    // Add general textual requirements as nodes in dagre (before layout) to avoid overlap
    const textNodeIds: string[] = [];
    cleanedGeneralReqs.forEach((text, i) => {
      const id = `greq-${i}`;
      g.setNode(id, { width: 260, height: 72 });
      g.setEdge(id, focus.id); // ensures they are ranked above focus (as predecessors)
      textNodeIds.push(id);
    });

    // Run layout once after all nodes/edges are added
    dagre.layout(g);

    // Add positioned course nodes
    courseNodeIds.forEach((id) => {
      const c = byId.get(id) || focus;
      const pos = g.node(id);
      addCourseNode(c!, { x: pos.x, y: pos.y });
    });

    // Add positioned text nodes
    textNodeIds.forEach((id, i) => {
      const pos = g.node(id);
      nodes.push({
        id,
        data: { label: cleanedGeneralReqs[i], kind: 'text' },
        position: { x: pos.x, y: pos.y },
        style: {
          borderRadius: 8,
          padding: 8,
          border: "1px dashed #93c5fd",
          background: "#eff6ff",
          color: "#1d4ed8",
          maxWidth: 280,
        },
      });
      edges.push({ id: `greq-edge-${id}->${focus.id}`, source: id, target: focus.id, style: { stroke: "#1d4ed8", strokeDasharray: "4 2" }, label: "requirement", labelBgPadding: [4,2], labelBgBorderRadius: 4, labelStyle: { fill: "#1d4ed8" } });
    });

    // Related on right side relative to focus
    related.forEach((rid, i) => {
      const c = byId.get(rid)!;
      const base = g.node(focus.id);
      const y = base.y - (related.length - 1) * 40 + i * 80;
      addCourseNode(c, { x: base.x + 320, y });
      edges.push({ id: `rel-${focus.id}-${rid}`, source: focus.id, target: rid, style: { stroke: "#9ca3af" }, label: "related", labelBgPadding: [4,2], labelBgBorderRadius: 4, labelStyle: { fill: "#6b7280" } });
    });

    return { nodes, edges };
  }, [focus, all]);

  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    const kind = (node.data as { kind?: string } | undefined)?.kind;
    if (kind === 'course') router.push(`${hrefBase}/${node.id}`);
  }, [router, hrefBase]);

  return (
    <div className={isFull ? "fixed inset-0 z-50 p-4 bg-black/60" : "w-full"}>
      <div className={"border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 relative " + (isFull ? "w-full h-full" : "") }>
        <button
          onClick={() => setIsFull(f => !f)}
          className="absolute top-2 right-2 z-10 px-2 py-1 text-xs rounded bg-gray-800 text-white hover:bg-gray-700"
        >
          {isFull ? "Exit Fullscreen" : "Fullscreen"}
        </button>
        <div style={{ width: "100%", height: isFull ? "100%" : height }}>
          <ReactFlow nodes={nodes} edges={edges} fitView onNodeClick={onNodeClick}>
            <Background gap={16} color="#eee" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
