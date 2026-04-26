"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getProgramById, getProgramCoursesWithPrereqs } from "@/lib/program/programs";
import { Program, ProgramCourse, ProgramTrack } from "@/lib/types/program";
import { fetchCoursesByIds } from "@/lib/courses";
import ReactFlow, {
  Handle,
  Background,
  Controls,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Position,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
//import dagre from "dagre";
import { Network, AlertCircle, Maximize2, Minimize2, Info, ExternalLink } from "lucide-react";
import Link from "next/link";
import ELK from "elkjs/lib/elk.bundled.js";


const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;
const GHOST_NODE_WIDTH = 180;
const GHOST_NODE_HEIGHT = 60;


// Track colors for program courses (matching CourseConnectionsFlow course style)
const TRACK_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "computational-engineering": { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af" },
  "electrification": { bg: "#fef2f2", border: "#ef4444", text: "#991b1b" },
  "sustainable-energy": { bg: "#f0fdf4", border: "#22c55e", text: "#166534" },
  "embedded-systems": { bg: "#fffbeb", border: "#f59e0b", text: "#92400e" },
  "applied-physics": { bg: "#faf5ff", border: "#a855f7", text: "#6b21a8" },
  core: { bg: "#f8fafc", border: "#94a3b8", text: "#475569" },
};

// Ghost node styling (matching CourseConnectionsFlow missing_course style)
const GHOST_NODE_STYLE = {
  background: "#fef2f2",
  border: "2px dashed #ef4444",
  borderRadius: "8px",
  color: "#b91c1c",
};

// Course node styling (matching CourseConnectionsFlow course style)
const COURSE_NODE_STYLE = {
  background: "#eff6ff",
  border: "2px solid #3b82f6",
  borderRadius: "8px",
  color: "#1e40af",
};

// Mandatory course style (red border like focus in CourseConnectionsFlow)
const MANDATORY_NODE_STYLE = {
  background: "#fff5f5",
  border: "2px solid #990000",
  borderRadius: "8px",
  color: "#7f1d1d",
};

function computeNodeDepths(
  nodes: Node<NodeData>[],
  edges: Edge[]
): Map<string, number> {
  const incoming = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    incoming.set(node.id, 0);
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1);
    adj.get(edge.source)?.push(edge.target);
  }

  const queue: string[] = [];
  const depth = new Map<string, number>();

  // roots = no prerequisites
  for (const [id, count] of incoming) {
    if (count === 0) {
      queue.push(id);
      depth.set(id, 0);
    }
  }

  while (queue.length > 0) {
    const node = queue.shift()!;
    const d = depth.get(node)!;

    for (const neighbor of adj.get(node) || []) {
      incoming.set(neighbor, incoming.get(neighbor)! - 1);

      if (incoming.get(neighbor) === 0) {
        depth.set(neighbor, d + 1);
        queue.push(neighbor);
      } else {
        // take max depth (important for multiple prereqs)
        depth.set(neighbor, Math.max(depth.get(neighbor) || 0, d + 1));
      }
    }
  }

  return depth;
}



type NodeKind = "program-course" | "ghost-course";

interface NodeData {
  kind: NodeKind;
  code: string;
  title?: string;
  credits?: number;
  isMandatory?: boolean;
  trackId?: string;
  isExternal?: boolean;
}

function getCourseTrack(course: ProgramCourse, tracks: ProgramTrack[]): string {
  // Use courseId (Firestore ID) for matching, fallback to code for backward compatibility
  const courseId = course.courseId || course.code;
  for (const track of tracks) {
    if (track.id === "general") continue;
    // Support both new (requiredCourseIds) and old (requiredCourses) property names
    const requiredIds = track.requiredCourseIds || track.requiredCourses || [];
    const electiveIds = track.electiveCourseIds || track.electiveCourses || [];
    if (requiredIds.includes(courseId)) return track.id;
    if (electiveIds.includes(courseId)) return track.id;
  }
  return "core";
}

function getTrackColor(trackId: string) {
  return TRACK_COLORS[trackId] || TRACK_COLORS.core;
}

interface GraphCourse {
  id: string;
  code: string;
  title: string;
  credits?: number;
  prerequisites?: string[] | null;
}


async function layoutWithElk(
  nodes: Node<NodeData>[],
  edges: Edge[]
): Promise<Node<NodeData>[]> {
  const elk = new ELK({
    defaultLayoutOptions: {
      connectionLineType: "smoothstep",
      defaultEdgeOptions: {
        type: "smoothstep",
        style: { opacity: 0.7 },
      },
    },
  });

  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",

      // spacing
      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
      "elk.spacing.nodeNode": "80",

      // THIS is critical for readable trees
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",

      // keeps branches tighter
      "elk.layered.considerModelOrder": "true",

      // edge routing
      "elk.edgeRouting": "ORTHOGONAL",
    },
    children: nodes.map((node) => ({
      id: node.id,
      width:
        node.data.kind === "ghost-course"
          ? GHOST_NODE_WIDTH
          : NODE_WIDTH,
      height:
        node.data.kind === "ghost-course"
          ? GHOST_NODE_HEIGHT
          : NODE_HEIGHT,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layout = await elk.layout(elkGraph);

  const positionMap = new Map<string, { x: number; y: number }>();

  layout.children?.forEach((n: any) => {
    positionMap.set(n.id, { x: n.x, y: n.y });
  });

  return nodes.map((node) => {
    const pos = positionMap.get(node.id);
    if (!pos) return node;

    return {
      ...node,
      position: {
        x: pos.x,
        y: pos.y,
      },
    };
  });
}

async function buildProgramGraph(
  program: Program,
  programCourses: ProgramCourse[],
  coursesById: Map<string, GraphCourse>
): Promise<{ nodes: Node<NodeData>[]; edges: Edge[]; hasGhostNodes: boolean }> {
  const nodes: Node<NodeData>[] = [];
  const edges: Edge[] = [];
  const edgeSet = new Set<string>();
  
  // Build a set of program course IDs (Firestore IDs that we found)
  const programCourseIds = new Set<string>();
  const programCodeToId = new Map<string, string>(); // code -> firestore ID
  
  for (const [id, course] of coursesById) {
    programCourseIds.add(id);
    programCodeToId.set(course.code.trim().toUpperCase(), id);
  }
  
  // Map to track which ghost nodes we've already created (to avoid duplicates)
  const ghostNodeMap = new Map<string, string>(); // id -> nodeId
  
  // Create program course nodes
  const idToNodeId = new Map<string, string>(); // firestore ID -> graph node ID
  
  for (const pc of programCourses) {
    const normCode = pc.code.trim().toUpperCase();
    const firestoreId = programCodeToId.get(normCode);
    if (!firestoreId) continue; // Skip if not found in Firestore
    
    const course = coursesById.get(firestoreId);
    if (!course) continue;
    
    const trackId = getCourseTrack(pc, program.tracks);
    const nodeId = `course-${firestoreId}`;
    idToNodeId.set(firestoreId, nodeId);
    
    const style = pc.isMandatory 
      ? MANDATORY_NODE_STYLE 
      : { ...COURSE_NODE_STYLE, ...getTrackColor(trackId) };
    
    nodes.push({
      id: nodeId,
      type: "default",
      data: {
        kind: "program-course",
        code: pc.code,
        title: course.title || pc.title,
        credits: pc.credits,
        isMandatory: pc.isMandatory,
        trackId,
        onHover: (id: string | null) => {}
      },
      position: { x: 0, y: 0 },
      style: {
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        ...style,
        padding: "10px 12px",
        fontSize: "12px",
        cursor: "pointer",
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });
  }
  
  // First pass: identify all external prerequisites and create ghost nodes
  const externalPrereqIds = new Set<string>();
  for (const pc of programCourses) {
    const normCode = pc.code.trim().toUpperCase();
    const firestoreId = programCodeToId.get(normCode);
    if (!firestoreId) continue;
    
    const course = coursesById.get(firestoreId);
    if (!course?.prerequisites) continue;
    
    for (const prereqId of course.prerequisites) {
      // If prerequisite is not a program course (no node created for it), it's external
      if (!idToNodeId.has(prereqId)) {
        externalPrereqIds.add(prereqId);
      }
    }
  }
  
  // Create ghost nodes for all external prerequisites
  for (const prereqId of externalPrereqIds) {
    const sourceNodeId = `ghost-${prereqId}`;
    ghostNodeMap.set(prereqId, sourceNodeId);
    
    const prereqCourse = coursesById.get(prereqId);
    
    nodes.push({
      id: sourceNodeId,
      type: "default",
      data: {
        kind: "ghost-course",
        code: prereqCourse?.code || "",
        title: prereqCourse?.title || "External prerequisite",
        isExternal: true,
        onHover: (id: string | null) => {}
      },
      position: { x: 0, y: 0 },
      style: {
        width: GHOST_NODE_WIDTH,
        height: GHOST_NODE_HEIGHT,
        ...GHOST_NODE_STYLE,
        padding: "8px 10px",
        fontSize: "11px",
        cursor: "default",
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });
  }
  
  // Second pass: build edges from prerequisites
  for (const pc of programCourses) {
    const normCode = pc.code.trim().toUpperCase();
    const firestoreId = programCodeToId.get(normCode);
    if (!firestoreId) continue;
    
    const targetNodeId = idToNodeId.get(firestoreId);
    if (!targetNodeId) continue;
    
    const course = coursesById.get(firestoreId);
    if (!course?.prerequisites) continue;
    
    for (const prereqId of course.prerequisites) {
      let sourceNodeId: string;
      
      // Check if prerequisite is in the program (has a node created)
      if (idToNodeId.has(prereqId)) {
        // Internal prerequisite - use program course node
        sourceNodeId = idToNodeId.get(prereqId)!;
      } else if (ghostNodeMap.has(prereqId)) {
        // External prerequisite - use ghost node
        sourceNodeId = ghostNodeMap.get(prereqId)!;
      } else {
        // Unknown prerequisite - skip
        continue;
      }
      
      if (sourceNodeId === targetNodeId) continue;
      
      const edgeId = `${sourceNodeId}->${targetNodeId}`;
      if (edgeSet.has(edgeId)) continue;
      edgeSet.add(edgeId);

      edges.push({
        id: edgeId,
        source: sourceNodeId,
        target: targetNodeId,
        sourceHandle: "out",
        targetHandle: "in",
        type: "smoothstep",
        animated: false,
        style: { 
          strokeWidth: 2 + Math.min(2, edges.filter((e) => e.source === sourceNodeId).length),
        },
      });
    }
  }
  return layoutWithElk(nodes, edges).then((layoutedNodes) => ({
    nodes: layoutedNodes,
    edges,
    hasGhostNodes: ghostNodeMap.size > 0,
  }));
  // Layout with dagre (top-bottom tree structure)
  // const g = new dagre.graphlib.Graph();
  // g.setGraph({ 
  //   rankdir: "TB", 
  //   ranksep: 100, 
  //   nodesep: 40, 
  //   edgesep: 20,
  //   ranker: "network-simplex",
  // });
  // g.setDefaultEdgeLabel(() => ({}));
  
  // const depthMap = computeNodeDepths(nodes, edges);

  // const levels = new Map<number, Node<NodeData>[]>();

  // for (const node of nodes) {
  //   const d = depthMap.get(node.id) ?? 0;
  //   if (!levels.has(d)) levels.set(d, []);
  //   levels.get(d)!.push(node);
  // }

  // const HORIZONTAL_SPACING = 260;
  // const VERTICAL_SPACING = 140;

  // for (const [level, levelNodes] of levels) {
  //   const width = levelNodes.length;
  //   //levelNodes.sort((a, b) => a.id.localeCompare(b.id));

  //   levelNodes.forEach((node, i) => {
  //     node.position = {
  //       x: (i - width / 2) * HORIZONTAL_SPACING,
  //       y: level * VERTICAL_SPACING,
  //     };
  //   });
  // }
  // // for (const node of nodes) {
  // //   const width = node.data.kind === "ghost-course" ? GHOST_NODE_WIDTH : NODE_WIDTH;
  // //   const height = node.data.kind === "ghost-course" ? GHOST_NODE_HEIGHT : NODE_HEIGHT;
  // //   g.setNode(node.id, { width, height });
  // // }

  // for (const edge of edges) {
  //   g.setEdge(edge.source, edge.target);
  // }
  
  // try {
  //   dagre.layout(g);
  // } catch (e) {
  //   console.warn("Dagre layout failed:", e);
  // }
  
  // // Apply positions from dagre
  // for (const node of nodes) {
  //   const dagreNode = g.node(node.id);
  //   if (dagreNode) {
  //     node.position = { 
  //       x: dagreNode.x - (node.data.kind === "ghost-course" ? GHOST_NODE_WIDTH/2 : NODE_WIDTH/2), 
  //       y: dagreNode.y - (node.data.kind === "ghost-course" ? GHOST_NODE_HEIGHT/2 : NODE_HEIGHT/2) 
  //     };
  //   }
  // }
  
  // return { nodes, edges, hasGhostNodes: ghostNodeMap.size > 0 };
}


const nodeTypes = {
  default: ({ data, id }: { data: NodeData, id: string }) => {
      if (data.kind === "ghost-course") {
      return (
        <div 
          onMouseEnter={() => data.onHover?.(id)}
          onMouseLeave={() => data.onHover?.(null)}
          className="h-full flex flex-col justify-center text-left"
        >
          {/* TARGET (incoming edges) */}
          <Handle type="target" position={Position.Top} />
          <div className="flex items-center gap-1 mb-0.5">
            <span className="font-mono text-[10px] opacity-70 truncate">{data.code}</span>
            <span className="text-[8px] px-1 py-0 bg-red-100 text-red-700 rounded font-medium shrink-0">External</span>
          </div>
          <div className="font-medium text-xs leading-tight line-clamp-2 opacity-80">
            {data.title || "External prerequisite"}
          </div>
          <Handle type="source" position={Position.Bottom} />
        </div>
      );
    }
    
    // Program course node
    const isClickable = !data.isExternal;
    const content = (
        <div 
          onMouseEnter={() => data.onHover?.(id)}
          onMouseLeave={() => data.onHover?.(null)}
          className="h-full flex flex-col justify-center text-left"
        >
          {/* TARGET (incoming edges) */}
          <Handle type="target" position={Position.Top} />
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="font-mono text-[10px] opacity-70">{data.code}</span>
            {data.isMandatory && (
              <span className="text-[9px] px-1 py-0 bg-red-100 text-red-700 rounded font-medium">Req</span>
            )}
          </div>
          <div className="font-medium text-xs leading-tight line-clamp-2">
            {data.title}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] opacity-60">{data.credits} hp</span>
            {data.trackId && data.trackId !== "core" && (
              <span className="text-[9px] opacity-50 truncate max-w-[80px]">
                {data.trackId.replace(/-/g, " ")}
              </span>
            )}
          </div>
          <Handle type="source" position={Position.Bottom} />
        </div>
    );
    
    if (isClickable) {
      return (
        <Link href={`/explore/${data.code}`} className="block no-underline h-full">
          {content}
        </Link>
      );
    }
    
    return content;

  }
}

function getConnected(nodeId: string, edges: Edge[]) {
  const forward = new Set<string>();
  const backward = new Set<string>();

  function dfsForward(id: string) {
    edges.forEach((e) => {
      if (e.source === id && !forward.has(e.target)) {
        forward.add(e.target);
        dfsForward(e.target);
      }
    });
  }

  function dfsBackward(id: string) {
    edges.forEach((e) => {
      if (e.target === id && !backward.has(e.source)) {
        backward.add(e.source);
        dfsBackward(e.source);
      }
    });
  }

  dfsForward(nodeId);
  dfsBackward(nodeId);

  return new Set([nodeId, ...forward, ...backward]);
}


export default function GraphPage() {
  const params = useParams();
  const programId = params.id as string;
  
  const [program, setProgram] = useState<Program | null>(null);
  const [progCourses, setProgCourses] = useState<ProgramCourse[]>([]);
  const [coursesById, setCoursesById] = useState<Map<string, GraphCourse>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    
  // Load program data using ID-based functions
  useEffect(() => {
    let cancelled = false;
    
    async function loadData() {
      setLoading(true);
      setError(null);
      
      try {
        const prog = await getProgramById(programId);
        if (!prog) {
          if (!cancelled) setError("Program not found");
          return;
        }
        
        // Use the new ID-based function to get program courses with prereqs
        const { courses, courseIds: programCourseIds } = await getProgramCoursesWithPrereqs(prog);
        
        if (cancelled) return;
        
        setProgram(prog);
        // Convert back to ProgramCourse[] for compatibility with existing code
        setProgCourses(courses.map(c => ({
          code: c.code,
          title: c.title,
          credits: c.credits || 0,
          isMandatory: false, // Will be determined by track matching in buildProgramGraph
          courseId: c.id,
        })));
        
        // Collect all prerequisite IDs from program courses
        const allPrereqIds: string[] = [];
        for (const course of courses) {
          if (course.prerequisites) {
            allPrereqIds.push(...course.prerequisites);
          }
        }
        
        // Fetch external prerequisite courses by ID (only the ones not in program)
        const externalPrereqIds = allPrereqIds.filter(id => !programCourseIds.has(id));
        
        const externalCoursesById = new Map<string, GraphCourse>();
        if (externalPrereqIds.length > 0) {
          const { byId } = await fetchCoursesByIds(externalPrereqIds);
          // Convert to GraphCourse format
          for (const [id, course] of byId) {
            externalCoursesById.set(id, {
              id: course.id,
              code: course.code,
              title: course.title,
              credits: course.credits,
              prerequisites: course.prerequisites,
            });
          }
        }
        
        if (cancelled) return;
        
        // Merge program courses and external prerequisites
        const mergedCourses = new Map<string, GraphCourse>();
        
        // Add program courses
        for (const course of courses) {
          mergedCourses.set(course.id, {
            id: course.id,
            code: course.code,
            title: course.title,
            credits: course.credits,
            prerequisites: course.prerequisites,
          });
        }
        
        // Add external prerequisites
        for (const [id, course] of externalCoursesById) {
          mergedCourses.set(id, course);
        }
        
        setCoursesById(mergedCourses);
      } catch (err) {
        console.error("Error loading program graph data:", err);
        if (!cancelled) setError("Failed to load program data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    
    loadData();
    
    return () => { cancelled = true; };
  }, [programId]);

  // const { nodes: initialNodes, edges: initialEdges, hasGhostNodes } = useMemo(() => {
  //   if (!program || progCourses.length === 0 || coursesById.size === 0) {
  //     return { nodes: [] as Node<NodeData>[], edges: [] as Edge[], hasGhostNodes: false };
  //   }
  //   return buildProgramGraph(program, progCourses, coursesById);
  // }, [program, progCourses, coursesById]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [hasGhostNodes, setHasGhostNodes] = useState(false);
  useEffect(() => {
    if (!program || progCourses.length === 0 || coursesById.size === 0) {
      return;
    }
    buildProgramGraph(program, progCourses, coursesById).then((result) => {
      const nodesWithHandlers = result.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onHover: setHoveredNodeId,
        },
      }));
      setNodes(nodesWithHandlers);
      setEdges(result.edges);
      setHasGhostNodes(result.hasGhostNodes);
    });
  }, [program, progCourses, coursesById, setNodes, setEdges, setHasGhostNodes]);  


  useEffect(() => {
    if (!hoveredNodeId) {
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          style: { stroke: "#94a3b8", strokeWidth: 1.5 },
          animated: false,
        }))
      );
      return;
    }

    const connected = getConnected(hoveredNodeId, edges);

    setEdges((eds) =>
      eds.map((edge) => {
        const isConnected =
          connected.has(edge.source) && connected.has(edge.target);

        return {
          ...edge,
          style: {
            stroke: isConnected ? "#f59e0b" : "#94a3b8",
            strokeWidth: isConnected ? 3 : 1.5,
            opacity: isConnected ? 1 : 0.1,
          },
          animated: isConnected,
        };
      })
    );
  }, [hoveredNodeId]);
  
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);
  
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        <div className="h-[600px] bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      </div>
    );
  }
  
  if (error || !program) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{error || "Program not found"}</h2>
        <p className="text-gray-600 dark:text-gray-300">Please try again later or select a different program.</p>
      </div>
    );
  }
  
  const hasEdges = edges.length > 0;
  
  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 p-4' : ''}`}>
      {/* Header */}
      <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-2">
          <Network className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Course Prerequisites</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          Tree structure showing prerequisite relationships between all program courses. 
          Prerequisites flow from top to bottom. 
          <span className="text-red-600 dark:text-red-400 font-medium"> Dashed red nodes</span> are external prerequisites not part of this program.
        </p>
      </div>
      
      {!hasEdges && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">No prerequisite connections found</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              The courses in this program do not have prerequisite data populated in the database yet.
            </p>
          </div>
        </div>
      )}
      
      {/* Graph Container */}
      <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${isFullscreen ? 'h-full' : ''}`}>
        <div className={`relative ${isFullscreen ? 'h-full' : 'h-[700px]'}`}>
          {nodes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <AlertCircle className="h-12 w-12 mb-4" />
              <p>No courses to display</p>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.1 }}
              minZoom={0.1}
              maxZoom={1.5}
              defaultEdgeOptions={{
                type: "smoothstep",
                style: { stroke: "#3b82f6", strokeWidth: 2 },
              }}
            >
              <Background color="#e5e7eb" gap={20} />
              <Controls />
              
              {/* Fullscreen Toggle Panel */}
              <Panel position="top-right">
                <button
                  onClick={toggleFullscreen}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  ) : (
                    <Maximize2 className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  )}
                </button>
              </Panel>
            </ReactFlow>
          )}
        </div>
      </div>
      
      {!isFullscreen && (
        /* Legend */
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Legend</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border-2 border-[#3b82f6] bg-[#eff6ff]"></div>
              <span className="text-gray-600 dark:text-gray-300 text-xs">Program Course</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border-2 border-[#990000] bg-[#fff5f5]"></div>
              <span className="text-gray-600 dark:text-gray-300 text-xs">Mandatory Course</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border-2 border-dashed border-[#ef4444] bg-[#fef2f2]"></div>
              <span className="text-gray-600 dark:text-gray-300 text-xs">External Prerequisite</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-[#3b82f6]"></div>
              <span className="text-gray-600 dark:text-gray-300 text-xs">Prerequisite Relationship</span>
            </div>
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300 text-xs">Click course to view details</span>
            </div>
          </div>
          
          {hasGhostNodes && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium text-red-600 dark:text-red-400">External prerequisites</span> are courses required by program courses but not included in this program. They appear as dashed red nodes and are not clickable.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
