"use client";

import React, { useMemo, useCallback, useState, useEffect } from "react";
import ReactFlow, { Background, Controls, Node, Edge, Position } from "reactflow";
import "reactflow/dist/style.css";
import type { Course, CourseConnection, StructuredRequirement } from "@/lib/courses";
import { useRouter } from "next/navigation";
import dagre from "dagre";
import { fetchCourseConnections, fetchMultipleCourseConnections } from "@/lib/courses";
import { TargetLabelEdge } from "./TargetLabelEdge";

type Props = {
  focus: Course;
  height?: number;
  hrefBase?: string;
  maxConnections?: number; // Cap on connections to prevent overwhelming the server
};

const nodeWidth = 220;
const nodeHeight = 64;
const MAX_CONNECTIONS_DEFAULT = 15; // Default cap on connections

export default function CourseConnectionsFlow({ 
  focus, 
  height = 360, 
  hrefBase = "/explore",
  maxConnections = MAX_CONNECTIONS_DEFAULT 
}: Props) {
  const router = useRouter();
  const [isFull, setIsFull] = useState(false);
  const [prereqCourses, setPrereqCourses] = useState<Map<string, CourseConnection>>(new Map());
  const [prereqOfCourses, setPrereqOfCourses] = useState<Map<string, CourseConnection>>(new Map());
  const [relatedCourses, setRelatedCourses] = useState<CourseConnection[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch prerequisite and dependent course details with caps
  useEffect(() => {
    const loadRelatedCourses = async () => {
      setLoading(true);
      try {
        // Fetch focus course connection data
        const focusConn = await fetchCourseConnections(focus.id, maxConnections);
        
        if (!focusConn) {
          setLoading(false);
          return;
        }

        // Load prerequisite courses (up to maxConnections)
        const prereqIds = focusConn.prerequisites?.slice(0, maxConnections) || [];
        const prereqMap = await fetchMultipleCourseConnections(prereqIds, maxConnections, 3);
        setPrereqCourses(prereqMap);

        // Load prerequisite_of courses (courses that depend on this one) - up to maxConnections
        const prereqOfIds = focusConn.prerequisite_of?.slice(0, maxConnections) || [];
        const prereqOfMap = await fetchMultipleCourseConnections(prereqOfIds, maxConnections, 3);
        setPrereqOfCourses(prereqOfMap);

        // Load related courses - up to maxConnections
        const relatedIds = focusConn.relatedCourses.slice(0, maxConnections);
        const relatedMap = await fetchMultipleCourseConnections(relatedIds, maxConnections, 3);
        setRelatedCourses(Array.from(relatedMap.values()));
      } catch (error) {
        console.error("Failed to load related courses:", error);
      } finally {
        setLoading(false);
      }
    };

    loadRelatedCourses();
  }, [focus, maxConnections]);

  const { nodes, edges } = useMemo(() => {

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const byId = new Map(prereqCourses);
    const byCode = new Map(Array.from(prereqCourses.values()).map((c) => [c.code.toUpperCase(), c]));

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
      // Legacy fallback - use loaded prerequisite courses
      const reqCourseIds = Array.from(prereqCourses.keys());
      const generalReqs = (focus.generalRequirements || []).filter(Boolean);

      const codeRegex = /\b[0-9A-Z]{2,}[0-9]{2,}\b/gi;
      const extractedReqCourseIds = new Set<string>();
      const cleanedGeneralReqs: string[] = [];

      generalReqs.forEach((text) => {
        const found = (text.match(codeRegex) || []).map((s) => s.toUpperCase());
        const matchedCourses = Array.from(prereqCourses.values()).filter((c) => c.code && found.includes(c.code.toUpperCase()));
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
        const course = prereqCourses.get(id);
        if (course) {
          g.setNode(id, { width: nodeWidth, height: nodeHeight, kind: 'course', course });
          g.setEdge(id, focus.id);
        }
      });

      cleanedGeneralReqs.forEach((text, i) => {
        const id = `greq-${i}`;
        g.setNode(id, { width: 260, height: 72, kind: 'text', label: text });
        g.setEdge(id, focus.id);
      });
    }

    // Note: Dependents are not loaded to avoid fetching all courses
    // In a production app, you'd have an API endpoint to query: 
    // "find courses where requirements contains focus.id"
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
        const c = node.course as CourseConnection;
        const credits = c.credits ? `${c.credits} credits` : "";
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
    const reqCourseIds = Array.from(prereqCourses.keys());
    const related = relatedCourses.filter((c) => !reqCourseIds.includes(c.id));

    related.forEach((c, i) => {
      const base = g.node(focus.id);
      const y = base.y - (related.length - 1) * 40 + i * 80;

      nodes.push({
        id: c.id,
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
        id: `rel-${focus.id}-${c.id}`,
        source: focus.id,
        target: c.id,
        type: 'straight',
        style: { stroke: "#cbd5e1", strokeDasharray: "4 4" },
        label: "related",
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 4,
        labelStyle: { fill: "#64748b" }
      });
    });

    // Add prerequisite_of courses (courses that depend on this one) below
    const prereqOfList = Array.from(prereqOfCourses.values());
    const total = prereqOfList.length;
    
    prereqOfList.forEach((c, i) => {
      const base = g.node(focus.id);
      const x = (total/2 - i)*240+ base.x;
      const y = base.y + 240;

      nodes.push({
        id: c.id,
        data: { label: c.title },
        position: { x, y: y - nodeHeight / 2 },
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
        style: {
          borderRadius: 8,
          padding: 8,
          border: "2px solid #22c55e",
          background: "#f0fdf4",
          width: nodeWidth,
        },
      });
      // Move label to end of the line
      edges.push({
        id: `prereqof-${focus.id}-${c.id}`,
        source: focus.id,
        target: c.id,
        type: 'targetLabel',
        style: { stroke: "#22c55e", strokeWidth: 2 },
        label: "required for",
        labelBgPadding: [4, 2], 
        labelBgBorderRadius: 20,
        labelStyle: { fill: "#15803d" }
      });
    });

    return { nodes, edges };
  }, [focus, prereqCourses, relatedCourses, prereqOfCourses]);

  const edgeTypes = {
    targetLabel: TargetLabelEdge,
  };

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
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/80 z-10">
            <span className="text-sm text-gray-500">Loading course connections...</span>
          </div>
        )}
        <div style={{ width: "100%", height: isFull ? "100%" : height }}>
          <ReactFlow nodes={nodes} edges={edges} edgeTypes={edgeTypes} fitView onNodeClick={onNodeClick} attributionPosition="bottom-right">
            <Background gap={16} color="#cbd5e1" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
