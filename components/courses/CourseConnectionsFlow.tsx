"use client";

import React, { useMemo, useCallback, useState } from "react";
import ReactFlow, { Background, Controls, Node, Edge, Position } from "reactflow";
import "reactflow/dist/style.css";
import type { Course, StructuredRequirement } from "@/lib/courses";
import { useRouter } from "next/navigation";
import dagre from "dagre";

type Props = {
  focus: Course;
  all: Course[];
  height?: number;
  hrefBase?: string; // e.g., "/explore"
};

const nodeWidth = 220;
const nodeHeight = 64;

export default function CourseConnectionsFlow({ focus, all, height = 360, hrefBase = "/explore" }: Props) {
  const router = useRouter();
  const [isFull, setIsFull] = useState(false);

  const { nodes, edges } = useMemo(() => {
    console.log("Starting layout for:", focus.code, "with", all.length, "courses");
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const byId = new Map(all.map((c) => [c.id, c] as const));
    const byCode = new Map(all.map((c) => [c.code.toUpperCase(), c]));

    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', ranksep: 60, nodesep: 60 });
    g.setDefaultEdgeLabel(() => ({}));

    // Generate graph from structured_requirements if available
    if (focus.structured_requirements) {
      let nodeCounter = 0;

      const visitedReqs = new Set<string>();

      const traverseRequirement = (req: StructuredRequirement, parentId: string, depth = 0) => {
      // Safety guards
        if (depth > 5) return; // Prevent too-deep nesting
        
        // Create a unique key for this requirement branch
        const reqKey = JSON.stringify(req); 
        if (visitedReqs.has(reqKey)) return;
        visitedReqs.add(reqKey);

        const id = `req-${nodeCounter++}`;
        
        if (visitedReqs.has(id)) return; // Prevent cycles
        visitedReqs.add(id);
        if (req.type === 'COURSE') {
          // If it's a course, check if we have it in our DB
          let course = req.courseId ? byId.get(req.courseId) : undefined;
          if (!course && req.courseCode) {
            course = byCode.get(req.courseCode.toUpperCase());
          }

          if (course) {
            g.setNode(course.id, { width: nodeWidth, height: nodeHeight, kind: 'course', course });
            g.setEdge(course.id, parentId);
          } else {
            // Missing course node
            g.setNode(id, { width: nodeWidth, height: 48, kind: 'missing_course', label: `${req.courseTitle || req.courseCode}` });
            g.setEdge(id, parentId);
          }
        } else if (req.type === 'AND' || req.type === 'OR') {
          g.setNode(id, { width: 60, height: 40, kind: req.type.toLowerCase(), label: req.type });
          g.setEdge(id, parentId);
          for (const child of req.children) {
            traverseRequirement(child, id, depth + 1);
          }
        } else {
          // Other requirements (CREDITS, TOPIC, LANGUAGE, CUSTOM)
          let label = req.label || req.type;
          if (req.type === 'CREDITS') label = `${req.minCredits} credits required`;
          if (req.type === 'DOMAIN_CREDITS') label = `${req.minCredits} credits in ${req.domain}`;
          if (req.type === 'LANGUAGE') label = `${req.language} level ${req.level}`;
          if (req.type === 'TOPIC') label = `Topic: ${req.topic}`;

          g.setNode(id, { width: 180, height: 48, kind: 'other_req', label });
          g.setEdge(id, parentId);
        }
      };

      g.setNode(focus.id, { width: nodeWidth, height: nodeHeight, kind: 'focus', course: focus });
      traverseRequirement(focus.structured_requirements, focus.id);

    } else {
      // Legacy fallback
      const reqCourseIds = (focus.requirements || []).filter((id) => byId.has(id));
      const generalReqs = (focus.generalRequirements || []).filter(Boolean);

      const codeRegex = /\b[0-9A-Z]{2,}[0-9]{2,}\b/gi;
      const extractedReqCourseIds = new Set<string>();
      const cleanedGeneralReqs: string[] = [];

      generalReqs.forEach((text) => {
        const found = (text.match(codeRegex) || []).map((s) => s.toUpperCase());
        const matchedCourses = all.filter((c) => c.code && found.includes(c.code.toUpperCase()));
        matchedCourses.forEach((c) => extractedReqCourseIds.add(c.id));
        let reduced = text;
        found.forEach((code) => {
          reduced = reduced.replace(new RegExp(code, 'gi'), '').replace(/\s{2,}/g, ' ').trim();
        });
        if (reduced) cleanedGeneralReqs.push(reduced);
      });

      const reqSet = new Set<string>(reqCourseIds);
      extractedReqCourseIds.forEach((id) => reqSet.add(id));
      const mergedReqCourseIds = Array.from(reqSet);

      g.setNode(focus.id, { width: nodeWidth, height: nodeHeight, kind: 'focus', course: focus });

      mergedReqCourseIds.forEach((id) => {
        g.setNode(id, { width: nodeWidth, height: nodeHeight, kind: 'course', course: byId.get(id) });
        g.setEdge(id, focus.id);
      });

      cleanedGeneralReqs.forEach((text, i) => {
        const id = `greq-${i}`;
        g.setNode(id, { width: 260, height: 72, kind: 'text', label: text });
        g.setEdge(id, focus.id);
      });
    }

    // Add dependents
    //const dependents = all.filter((c) => (c.requirements || []).includes(focus.id) || (c.prerequisites || []).includes(focus.id));
    const dependents = all.filter((c) => {
      const isReq = c.requirements?.includes(focus.id);
      const isPrereq = c.prerequisites?.includes(focus.id);
      return isReq || isPrereq;
    });

    dependents.forEach((d) => {
      g.setNode(d.id, { width: nodeWidth, height: nodeHeight, kind: 'course', course: d });
      g.setEdge(focus.id, d.id);
    });
    try {
      dagre.layout(g);
    } catch (e) {
      console.error("Dagre layout failed:", e);
      return { nodes: [], edges: [] }; // Return empty to prevent freeze
    }
    // Convert dagre nodes to React Flow nodes
    g.nodes().forEach((id: string) => {
      const node = g.node(id);
      if (!node) return;

      if (node.kind === 'course' || node.kind === 'focus') {
        const c = node.course as Course;
        const credits = c.tags.find((t) => t.toLowerCase().includes("credits")) || "";
        nodes.push({
          id,
          data: { label: `${c.title}${credits ? ` (${credits})` : ""}` },
          position: { x: node.x - nodeWidth / 2, y: node.y - nodeHeight / 2 },
          targetPosition: Position.Top,
          sourcePosition: Position.Bottom,
          style: {
            borderRadius: 8,
            padding: 8,
            border: node.kind === 'focus' ? "2px solid #990000" : "1px solid #e5e7eb",
            background: node.kind === 'focus' ? "#fff5f5" : "white",
            width: nodeWidth,
          },
        });
      } else if (node.kind === 'and' || node.kind === 'or') {
        nodes.push({
          id,
          data: { label: node.label },
          position: { x: node.x - node.width / 2, y: node.y - node.height / 2 },
          targetPosition: Position.Top,
          sourcePosition: Position.Bottom,
          style: {
            borderRadius: 20,
            padding: 4,
            border: "1px solid #64748b",
            background: "#f8fafc",
            fontSize: 10,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: node.width,
            height: node.height,
          },
        });
      } else if (node.kind === 'missing_course') {
        nodes.push({
          id,
          data: { label: node.label },
          position: { x: node.x - node.width / 2, y: node.y - node.height / 2 },
          targetPosition: Position.Top,
          sourcePosition: Position.Bottom,
          style: {
            borderRadius: 8,
            padding: 8,
            border: "1px dashed #ef4444",
            background: "#fef2f2",
            color: "#b91c1c",
            width: node.width,
            fontSize: 12,
          },
        });
      } else if (node.kind === 'text' || node.kind === 'other_req') {
        nodes.push({
          id,
          data: { label: node.label },
          position: { x: node.x - node.width / 2, y: node.y - node.height / 2 },
          targetPosition: Position.Top,
          sourcePosition: Position.Bottom,
          style: {
            borderRadius: 8,
            padding: 8,
            border: "1px dashed #3b82f6",
            background: "#eff6ff",
            color: "#1d4ed8",
            width: node.width,
            fontSize: 12,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          },
        });
      }
    });

    // Convert edges
    g.edges().forEach((e: { v: string; w: string }) => {
      edges.push({
        id: `edge-${e.v}-${e.w}`,
        source: e.v,
        target: e.w,
        type: 'smoothstep',
        style: { stroke: "#94a3b8", strokeWidth: 1.5 },
      });
    });

    // Add related courses to the right side
    const reqCourseIds = (focus.requirements || []).filter((id) => byId.has(id));
    const related = (focus.relatedCourses || []).filter((id) => byId.has(id) && !reqCourseIds.includes(id) && !dependents.some(d => d.id === id));

    related.forEach((rid, i) => {
      const c = byId.get(rid)!;
      const base = g.node(focus.id);
      const y = base.y - (related.length - 1) * 40 + i * 80;

      nodes.push({
        id: rid,
        data: { label: c.title },
        position: { x: base.x + 320, y: y - nodeHeight / 2 },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        style: {
          borderRadius: 8,
          padding: 8,
          border: "1px solid #e5e7eb",
          background: "white",
          width: nodeWidth,
        },
      });

      edges.push({
        id: `rel-${focus.id}-${rid}`,
        source: focus.id,
        target: rid,
        type: 'straight',
        style: { stroke: "#cbd5e1", strokeDasharray: "4 4" },
        label: "related",
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 4,
        labelStyle: { fill: "#64748b" }
      });
    });

    return { nodes, edges };
  }, [focus, all]);

  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    // Only navigate to actual courses
    if (!node.id.startsWith('req-') && !node.id.startsWith('greq-')) {
      router.push(`${hrefBase}/${node.id}`);
    }
  }, [router, hrefBase]);

  return (
    <div className={isFull ? "fixed inset-0 z-50 p-4 bg-black/60" : "w-full"}>
      <div className={"border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 relative " + (isFull ? "w-full h-full" : "")}>
        <button
          onClick={() => setIsFull(f => !f)}
          className="absolute top-2 right-2 z-10 px-2 py-1 text-xs rounded bg-gray-800 text-white hover:bg-gray-700 hover:shadow-lg transition-all"
        >
          {isFull ? "Exit Fullscreen" : "Fullscreen"}
        </button>
        <div style={{ width: "100%", height: isFull ? "100%" : height }}>
          <ReactFlow nodes={nodes} edges={edges} fitView onNodeClick={onNodeClick} attributionPosition="bottom-right">
            <Background gap={16} color="#cbd5e1" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
