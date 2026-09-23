import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getProjectKnowledgeGraph,
  buildKnowledgeGraph,
  searchKnowledgeGraph,
} from "../service/api";
import { getResearchProjects } from "../service/projectStorage";

/* ---------------------------------------------------------
   Academic SVG Icons
--------------------------------------------------------- */
const icons = {
  dashboard: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  ),
  projects: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeLinejoin="round" />
      <path d="M12 11v6M9 14h6" strokeLinecap="round" />
    </svg>
  ),
  upload: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  manuscripts: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  literature: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinejoin="round" />
      <path d="M9 7h6M9 11h4" strokeLinecap="round" />
    </svg>
  ),
  gapAnalysis: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" strokeLinecap="round" />
    </svg>
  ),
  contributionAnalysis: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinejoin="round" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  knowledgeGraph: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="12" cy="18" r="3" />
      <path d="M8.5 7.5l7 0M7.5 8.5l3 7M16.5 8.5l-3 7" strokeLinecap="round" />
    </svg>
  ),
  evidenceReports: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <path d="M14 2v6h6" strokeLinejoin="round" />
      <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  profile: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
    </svg>
  ),
  settings: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H4a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 5.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H10a1.65 1.65 0 0 0 1-1.51V2a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V8a1.65 1.65 0 0 0 1.51 1H20a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  logout: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sparkles: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 3l1.9 4.8L18.7 9.7l-4.8 1.9L12 16.5l-1.9-4.9-4.9-1.9 4.9-1.9L12 3z" strokeLinejoin="round" />
      <path d="M19 16l.9 2.2 2.1.9-2.1.9-.9 2.1-.9-2.1-2.2-.9 2.2-.9.9-2.2z" strokeLinejoin="round" />
    </svg>
  ),
  info: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M12 12v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  arrowRight: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  checkCircle: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  menu: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  ),
  close: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  ),
  zoomIn: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
      <line x1="11" y1="8" x2="11" y2="14" strokeLinecap="round" />
      <line x1="8" y1="11" x2="14" y2="11" strokeLinecap="round" />
    </svg>
  ),
  zoomOut: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
      <line x1="8" y1="11" x2="14" y2="11" strokeLinecap="round" />
    </svg>
  ),
  refresh: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

/* ---------------------------------------------------------
   Color coding by Node Type
--------------------------------------------------------- */
const NODE_STYLE_MAP = {
  "Research Project": {
    bg: "#4F46E5", // Indigo
    border: "#312E81",
    textColor: "#FFFFFF",
    badge: "bg-indigo-600 text-white",
    group: "project",
  },
  "Research Problem": {
    bg: "#0284C7", // Sky blue
    border: "#075985",
    textColor: "#FFFFFF",
    badge: "bg-sky-600 text-white",
    group: "formulation",
  },
  "Research Objective": {
    bg: "#0D9488", // Teal
    border: "#115E59",
    textColor: "#FFFFFF",
    badge: "bg-teal-600 text-white",
    group: "formulation",
  },
  "Research Question": {
    bg: "#059669", // Emerald
    border: "#064E3B",
    textColor: "#FFFFFF",
    badge: "bg-emerald-600 text-white",
    group: "formulation",
  },
  "Claimed Research Gap": {
    bg: "#D97706", // Amber
    border: "#92400E",
    textColor: "#FFFFFF",
    badge: "bg-amber-600 text-white",
    group: "formulation",
  },
  "Proposed Method": {
    bg: "#7C3AED", // Purple
    border: "#5B21B6",
    textColor: "#FFFFFF",
    badge: "bg-purple-600 text-white",
    group: "formulation",
  },
  "Dataset / Application Context": {
    bg: "#2563EB", // Blue
    border: "#1E40AF",
    textColor: "#FFFFFF",
    badge: "bg-blue-600 text-white",
    group: "formulation",
  },
  "Expected Contribution": {
    bg: "#DB2777", // Pink/Rose
    border: "#9D174D",
    textColor: "#FFFFFF",
    badge: "bg-pink-600 text-white",
    group: "formulation",
  },
  "Evaluation Metric": {
    bg: "#475569", // Slate
    border: "#1E293B",
    textColor: "#FFFFFF",
    badge: "bg-slate-600 text-white",
    group: "formulation",
  },
  "Research Claim": {
    bg: "#9333EA", // Violet
    border: "#6B21A8",
    textColor: "#FFFFFF",
    badge: "bg-violet-600 text-white",
    group: "formulation",
  },
  "Literature Paper": {
    bg: "#10B981", // Emerald green
    border: "#047857",
    textColor: "#FFFFFF",
    badge: "bg-emerald-600 text-white",
    group: "literature",
  },
  "Finding": {
    bg: "#14B8A6", // Teal light
    border: "#0F766E",
    textColor: "#FFFFFF",
    badge: "bg-teal-500 text-white",
    group: "literature",
  },
  "Limitation": {
    bg: "#E11D48", // Rose Red
    border: "#9F1239",
    textColor: "#FFFFFF",
    badge: "bg-rose-600 text-white",
    group: "literature",
  },
  "Citation / Reference": {
    bg: "#64748B", // Slate
    border: "#334155",
    textColor: "#FFFFFF",
    badge: "bg-slate-500 text-white",
    group: "literature",
  },
};

function getNodeStyle(type) {
  return (
    NODE_STYLE_MAP[type] || {
      bg: "#6B7280",
      border: "#374151",
      textColor: "#FFFFFF",
      badge: "bg-slate-600 text-white",
      group: "other",
    }
  );
}

export default function KnowledgeGraph() {
  const [searchParams] = useSearchParams();
  const preselectedProjectId = searchParams.get("projectId") || "";

  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Projects list
  const [projectsList, setProjectsList] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("proj-01");
  const [topK, setTopK] = useState(5);

  // Graph state
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [graphData, setGraphData] = useState(null);
  const [graphError, setGraphError] = useState("");

  // Inspect node modal/card
  const [inspectedNode, setInspectedNode] = useState(null);

  // Search Algorithm Demo state
  const [algorithm, setAlgorithm] = useState("bfs");
  const [startNodeId, setStartNodeId] = useState("");
  const [goalNodeId, setGoalNodeId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");

  // Visualization Pan/Zoom state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Load project list
  useEffect(() => {
    const list = getResearchProjects();
    setProjectsList(list);
    if (preselectedProjectId && list.some((p) => p.id === preselectedProjectId)) {
      setSelectedProjectId(preselectedProjectId);
    } else if (list.length > 0) {
      setSelectedProjectId(list[0].id);
    }
  }, [preselectedProjectId]);

  // Fetch or build graph when selected project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    loadGraph(selectedProjectId, topK);
  }, [selectedProjectId, topK]);

  const loadGraph = async (projId, k) => {
    setIsLoadingGraph(true);
    setGraphError("");
    setSearchResult(null);
    setSearchError("");

    try {
      const data = await getProjectKnowledgeGraph(projId, k);
      setGraphData(data);

      // Default start and goal for immediate ease of search
      if (data.nodes && data.nodes.length >= 2) {
        // Start: Project node
        const projNode = data.nodes.find((n) => n.type === "Research Project") || data.nodes[0];
        setStartNodeId(projNode.id);

        // Goal: Literature Paper or Limitation
        const litNode =
          data.nodes.find((n) => n.type === "Literature Paper") ||
          data.nodes.find((n) => n.type === "Limitation") ||
          data.nodes[1];
        setGoalNodeId(litNode.id);
      }
    } catch (err) {
      console.error("Failed to load knowledge graph:", err);
      setGraphError(err.message || "Failed to load research knowledge graph.");
    } finally {
      setIsLoadingGraph(false);
    }
  };

  // Node position layout calculation (Deterministic Radial / Clustered Layout)
  const layoutNodes = useMemo(() => {
    if (!graphData?.nodes || graphData.nodes.length === 0) return [];

    const nodes = graphData.nodes;
    const width = 960;
    const height = 560;
    const centerX = width / 2;
    const centerY = height / 2;

    const projNode = nodes.find((n) => n.type === "Research Project");
    const formulationNodes = nodes.filter(
      (n) => n.type !== "Research Project" && n.source !== "literature_corpus"
    );
    const literaturePapers = nodes.filter((n) => n.type === "Literature Paper");
    const findingsAndLimits = nodes.filter(
      (n) => n.type === "Finding" || n.type === "Limitation" || n.type === "Citation / Reference"
    );

    const positions = {};

    // Center-left: Project node
    if (projNode) {
      positions[projNode.id] = { x: centerX - 120, y: centerY };
    }

    // Semi-circle on the left for Project Formulation nodes
    formulationNodes.forEach((node, idx) => {
      const total = formulationNodes.length;
      const angle = Math.PI * 0.65 + (Math.PI * 0.7 * idx) / Math.max(1, total - 1);
      const radius = 230;
      positions[node.id] = {
        x: centerX - 120 + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * (radius * 0.9),
      };
    });

    // Right column for Literature Papers
    literaturePapers.forEach((node, idx) => {
      const total = literaturePapers.length;
      const ySpacing = total > 1 ? 380 / (total - 1) : 0;
      const xPos = centerX + 180;
      const yPos = centerY - 190 + idx * ySpacing;
      positions[node.id] = { x: xPos, y: yPos };
    });

    // Outer-right for Findings and Limitations
    findingsAndLimits.forEach((node, idx) => {
      const total = findingsAndLimits.length;
      const ySpacing = total > 1 ? 440 / (total - 1) : 0;
      const xPos = centerX + 340;
      const yPos = centerY - 220 + idx * ySpacing;
      positions[node.id] = { x: xPos, y: yPos };
    });

    // Any remaining nodes
    nodes.forEach((node, idx) => {
      if (!positions[node.id]) {
        positions[node.id] = {
          x: centerX + 100 + (idx % 3) * 60,
          y: centerY + Math.floor(idx / 3) * 60,
        };
      }
    });

    return nodes.map((node) => ({
      ...node,
      x: positions[node.id]?.x || centerX,
      y: positions[node.id]?.y || centerY,
    }));
  }, [graphData]);

  // Layout node map for edge rendering
  const layoutNodeMap = useMemo(() => {
    return layoutNodes.reduce((acc, n) => {
      acc[n.id] = n;
      return acc;
    }, {});
  }, [layoutNodes]);

  // Path nodes and edges set for highlighting
  const highlightedPathNodeIds = useMemo(() => {
    return new Set(searchResult?.path || []);
  }, [searchResult]);

  const highlightedPathEdgeKeys = useMemo(() => {
    if (!searchResult?.path_edges) return new Set();
    const keys = new Set();
    searchResult.path_edges.forEach((pe) => {
      keys.add(`${pe.from_node}_${pe.to_node}`);
      keys.add(`${pe.to_node}_${pe.from_node}`);
    });
    return keys;
  }, [searchResult]);

  // Execute Graph Search
  const handleRunSearch = async (e) => {
    e?.preventDefault();
    if (!startNodeId || !goalNodeId) {
      setSearchError("Please select both a Start Node and a Goal Node.");
      return;
    }

    setIsSearching(true);
    setSearchError("");

    try {
      const res = await searchKnowledgeGraph({
        startNode: startNodeId,
        goalNode: goalNodeId,
        algorithm,
        nodes: graphData?.nodes,
        edges: graphData?.edges,
        projectId: selectedProjectId,
      });
      setSearchResult(res);
    } catch (err) {
      console.error("Search failed:", err);
      setSearchError(err.message || "Failed to execute graph search.");
    } finally {
      setIsSearching(false);
    }
  };

  // Search Presets
  const applySearchPreset = (presetType) => {
    if (!graphData?.nodes) return;
    const nodes = graphData.nodes;

    if (presetType === "project_to_paper") {
      const p = nodes.find((n) => n.type === "Research Project");
      const l = nodes.find((n) => n.type === "Literature Paper");
      if (p && l) {
        setStartNodeId(p.id);
        setGoalNodeId(l.id);
      }
    } else if (presetType === "gap_to_limitation") {
      const g = nodes.find((n) => n.type === "Claimed Research Gap");
      const lim = nodes.find((n) => n.type === "Limitation");
      if (g && lim) {
        setStartNodeId(g.id);
        setGoalNodeId(lim.id);
      }
    } else if (presetType === "method_to_paper") {
      const m = nodes.find((n) => n.type === "Proposed Method");
      const l = nodes.find((n) => n.type === "Literature Paper");
      if (m && l) {
        setStartNodeId(m.id);
        setGoalNodeId(l.id);
      }
    } else if (presetType === "contrib_to_finding") {
      const c = nodes.find((n) => n.type === "Expected Contribution");
      const f = nodes.find((n) => n.type === "Finding");
      if (c && f) {
        setStartNodeId(c.id);
        setGoalNodeId(f.id);
      }
    }
  };

  const researcherInitials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "RS";

  return (
    <div className="min-h-screen bg-slate-900/5 text-slate-900 lg:flex font-sans">
      {/* ---------------- Mobile Top Navigation ---------------- */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden shadow-xs">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
          className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
        >
          {icons.menu({ className: "h-6 w-6" })}
        </button>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white font-bold text-xs shadow-xs">
            G
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-900">GapGuard AI</span>
        </div>
        <div className="h-8 w-8 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center shadow-xs">
          {researcherInitials}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ---------------- Sidebar Navigation ---------------- */}
      <aside
        className={`fixed z-50 inset-y-0 left-0 w-72 transform bg-[#0B1120] text-slate-200 px-5 py-6 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 lg:flex-shrink-0 border-r border-slate-800 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between pb-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-emerald-400 p-0.5 shadow-md shadow-indigo-950/50">
              <div className="w-full h-full bg-[#0B1120] rounded-[10px] flex items-center justify-center text-indigo-400">
                {icons.sparkles({ className: "h-5 w-5" })}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-white">GapGuard</span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Research Gap Intelligence</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation menu"
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 lg:hidden"
          >
            {icons.close({ className: "h-5 w-5" })}
          </button>
        </div>

        <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2">
          Research Workflow
        </div>
        <nav className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1">
          <Link
            to="/student/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.dashboard({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Dashboard</span>
          </Link>

          <Link
            to="/student/dashboard#projects"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.projects({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Research Projects</span>
          </Link>

          <Link
            to="/student/upload"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.upload({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Upload Manuscript</span>
          </Link>

          <Link
            to="/student/submissions"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.manuscripts({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Manuscripts</span>
          </Link>

          <Link
            to="/student/literature"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.literature({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Literature Corpus</span>
          </Link>

          <Link
            to="/student/gap-analysis"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.gapAnalysis({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Gap Analysis</span>
          </Link>

          <Link
            to="/student/contribution-analysis"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.contributionAnalysis({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Contribution Analysis</span>
          </Link>

          <Link
            to="/student/knowledge-graph"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-900/30 transition-all"
          >
            {icons.knowledgeGraph({ className: "h-4.5 w-4.5 text-white" })}
            <span>Knowledge Graph</span>
          </Link>

          <Link
            to="/student/reasoning"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.sparkles({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Reasoning Workbench</span>
          </Link>

          <Link
            to="/student/evidence-coverage"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.evidenceReports({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Evidence Coverage</span>
          </Link>

          <Link
            to="/student/revision-comparison"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.knowledgeGraph({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Revision Comparison</span>
          </Link>

          <Link
            to="/student/reports"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.evidenceReports({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Evidence Reports</span>
          </Link>

          <Link
            to="/student/profile"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.profile({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Profile</span>
          </Link>

          <Link
            to="/student/settings"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.settings({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Settings</span>
          </Link>
        </nav>

        <div className="pt-4 border-t border-slate-800/80 mt-auto">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
          >
            {icons.logout({ className: "h-4 w-4" })}
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ---------------- Main Content Workspace ---------------- */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4.5 shadow-xs sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-slate-900">Research Knowledge Graph &amp; Search Demo</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Phase 8 AI Concept Search
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-900">{user?.name || "Student Researcher"}</p>
              <p className="text-[11px] text-slate-500">Explainable Graph Reasoning</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white text-xs font-semibold flex items-center justify-center shadow-xs">
              {researcherInitials}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Header Banner */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-200 border border-white/10 mb-2.5">
                  {icons.knowledgeGraph({ className: "h-3.5 w-3.5 text-indigo-300" })}
                  Explainable Research Concept Network
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Research Knowledge Graph &amp; AI Search Demo
                </h1>
                <p className="mt-1.5 text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Deterministic graph representation of your research problem, gap, method, dataset, and contribution
                  interconnected with literature papers, findings, and limitations. Demonstrates BFS, DFS, and Best-First Search.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-200 border border-indigo-400/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  BFS / DFS / Best-First Engine
                </span>
              </div>
            </div>
          </div>

          {/* Educational Notice Banner */}
          <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 p-4 text-xs text-blue-900 flex items-start gap-3 shadow-xs">
            {icons.info({ className: "h-5 w-5 text-blue-700 flex-shrink-0 mt-0.5" })}
            <div className="space-y-1">
              <span className="font-semibold text-blue-950">Educational Search &amp; Corpus Grounding Notice:</span>
              <p className="leading-relaxed">
                This workbench serves both as an explainable research navigation tool and as an educational demonstration of AI syllabus
                search algorithms (Breadth-First Search, Depth-First Search, and Greedy Best-First Search). The graph is constructed
                from your local project inputs and local literature corpus. It does <strong>not</strong> represent the complete global scientific literature.
              </p>
            </div>
          </div>

          {/* ---------------- SECTION 1 & 2: CONTROLS & STATISTICS ---------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Section 1: Project Selector */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Section 1 — Research Project Selector</h2>
                <p className="text-xs text-slate-500 mt-0.5">Select a study to construct its knowledge graph.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="proj-select" className="block text-xs font-semibold text-slate-700 mb-1">
                    Active Research Study:
                  </label>
                  <select
                    id="proj-select"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  >
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.domain || "General"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label htmlFor="topk-slider" className="text-xs font-semibold text-slate-600">
                    Literature Papers Depth:
                  </label>
                  <select
                    id="topk-slider"
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
                  >
                    <option value={3}>3 Papers</option>
                    <option value={5}>5 Papers (Recommended)</option>
                    <option value={8}>8 Papers</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => loadGraph(selectedProjectId, topK)}
                  disabled={isLoadingGraph}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white p-2.5 text-xs font-semibold shadow-xs disabled:opacity-50 transition"
                >
                  {isLoadingGraph ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Constructing Graph...</span>
                    </>
                  ) : (
                    <>
                      {icons.refresh({ className: "h-3.5 w-3.5" })}
                      <span>Reconstruct Knowledge Graph</span>
                    </>
                  )}
                </button>
              </div>

              {graphError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                  {graphError}
                </div>
              )}
            </div>

            {/* Section 2: Graph Statistics */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Section 2 — Graph Topology Statistics</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Summary of deterministic nodes and typed relationships.</p>
                </div>
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                  Deterministic Graph
                </span>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-center">
                  <span className="text-[11px] font-semibold text-indigo-900 uppercase tracking-wider block">
                    Total Nodes
                  </span>
                  <p className="text-2xl font-bold text-indigo-950 mt-1">
                    {graphData?.statistics?.node_count || 0}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
                  <span className="text-[11px] font-semibold text-emerald-900 uppercase tracking-wider block">
                    Total Edges
                  </span>
                  <p className="text-2xl font-bold text-emerald-950 mt-1">
                    {graphData?.statistics?.edge_count || 0}
                  </p>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-center">
                  <span className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider block">
                    Literature Papers
                  </span>
                  <p className="text-2xl font-bold text-blue-950 mt-1">
                    {graphData?.statistics?.paper_count || 0}
                  </p>
                </div>

                <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3 text-center">
                  <span className="text-[11px] font-semibold text-purple-900 uppercase tracking-wider block">
                    Relations Types
                  </span>
                  <p className="text-2xl font-bold text-purple-950 mt-1">
                    {graphData?.statistics?.unique_relationship_types || 0}
                  </p>
                </div>
              </div>

              {/* Node Types Distribution Tags */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Active Concept Nodes in Graph:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {graphData?.statistics?.node_types_distribution &&
                    Object.entries(graphData.statistics.node_types_distribution).map(([type, count]) => {
                      const style = getNodeStyle(type);
                      return (
                        <span
                          key={type}
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-md border flex items-center gap-1 ${style.badge}`}
                        >
                          <span>{type}</span>
                          <span className="bg-black/20 px-1 rounded text-[10px]">{count}</span>
                        </span>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>

          {/* ---------------- SECTION 3: GRAPH VISUALIZATION ---------------- */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/60">
              <div>
                <h2 className="text-base font-bold text-slate-900">Section 3 — Interactive Graph Visualization</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nodes represent research concepts and literature entities. Edges represent typed relationships. Click any node to inspect.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.15))}
                  aria-label="Zoom in"
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                >
                  {icons.zoomIn({ className: "h-4 w-4" })}
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
                  aria-label="Zoom out"
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                >
                  {icons.zoomOut({ className: "h-4 w-4" })}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoomLevel(1);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                >
                  Reset View
                </button>
              </div>
            </div>

            {/* SVG Graph Canvas */}
            <div className="relative bg-[#0F172A] w-full h-[520px] overflow-hidden select-none">
              <svg
                viewBox="0 0 960 560"
                className="w-full h-full cursor-grab active:cursor-grabbing"
                style={{
                  transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transformOrigin: "center center",
                  transition: "transform 0.15s ease-out",
                }}
              >
                <defs>
                  {/* Standard Arrow Marker */}
                  <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="22"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748B" />
                  </marker>
                  {/* Highlighted Path Arrow Marker */}
                  <marker
                    id="arrow-highlight"
                    viewBox="0 0 10 10"
                    refX="24"
                    refY="5"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#10B981" />
                  </marker>
                </defs>

                {/* Render Edges */}
                <g>
                  {graphData?.edges?.map((edge) => {
                    const src = layoutNodeMap[edge.source];
                    const tgt = layoutNodeMap[edge.target];
                    if (!src || !tgt) return null;

                    const isPathEdge =
                      highlightedPathEdgeKeys.has(`${edge.source}_${edge.target}`) ||
                      highlightedPathEdgeKeys.has(`${edge.target}_${edge.source}`);

                    // Midpoint for relationship label
                    const midX = (src.x + tgt.x) / 2;
                    const midY = (src.y + tgt.y) / 2;

                    return (
                      <g key={edge.id}>
                        <line
                          x1={src.x}
                          y1={src.y}
                          x2={tgt.x}
                          y2={tgt.y}
                          stroke={isPathEdge ? "#10B981" : "#334155"}
                          strokeWidth={isPathEdge ? 3.5 : 1.5}
                          strokeDasharray={isPathEdge ? "none" : edge.type === "SUPPORTED_BY" ? "4 3" : "none"}
                          markerEnd={isPathEdge ? "url(#arrow-highlight)" : "url(#arrow)"}
                          className="transition-all duration-300"
                        />
                        {/* Edge Label Pill */}
                        <g transform={`translate(${midX}, ${midY})`}>
                          <rect
                            x={-edge.type.length * 3.2 - 4}
                            y="-9"
                            width={edge.type.length * 6.4 + 8}
                            height="16"
                            rx="4"
                            fill="#1E293B"
                            stroke={isPathEdge ? "#10B981" : "#475569"}
                            strokeWidth="1"
                          />
                          <text
                            textAnchor="middle"
                            y="3"
                            fill={isPathEdge ? "#34D399" : "#94A3B8"}
                            fontSize="8"
                            fontWeight="600"
                            fontFamily="monospace"
                          >
                            {edge.type}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </g>

                {/* Render Nodes */}
                <g>
                  {layoutNodes.map((node) => {
                    const style = getNodeStyle(node.type);
                    const isStart = node.id === startNodeId;
                    const isGoal = node.id === goalNodeId;
                    const isPathNode = highlightedPathNodeIds.has(node.id);
                    const isInspected = inspectedNode?.id === node.id;

                    const radius = node.type === "Research Project" ? 28 : node.type === "Literature Paper" ? 22 : 18;

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={() => setInspectedNode(node)}
                        className="cursor-pointer group"
                      >
                        {/* Pulsing halo if Start, Goal, or in Search Path */}
                        {(isStart || isGoal || isPathNode) && (
                          <circle
                            r={radius + 8}
                            fill="none"
                            stroke={isStart ? "#818CF8" : isGoal ? "#F43F5E" : "#34D399"}
                            strokeWidth="2.5"
                            strokeDasharray="4 2"
                            className="animate-spin-slow opacity-80"
                          />
                        )}

                        {/* Node Body */}
                        <circle
                          r={radius}
                          fill={style.bg}
                          stroke={isInspected ? "#FFFFFF" : isPathNode ? "#10B981" : style.border}
                          strokeWidth={isInspected ? 3.5 : isPathNode ? 3 : 1.5}
                          className="transition-transform duration-200 group-hover:scale-110 shadow-lg"
                        />

                        {/* Node Initials or Icon Marker */}
                        <text
                          textAnchor="middle"
                          dy="4"
                          fill={style.textColor}
                          fontSize={node.type === "Research Project" ? "12" : "10"}
                          fontWeight="bold"
                          pointerEvents="none"
                        >
                          {node.type === "Research Project"
                            ? "PROJ"
                            : node.type === "Literature Paper"
                            ? "LIT"
                            : node.type.slice(0, 3).toUpperCase()}
                        </text>

                        {/* Node Label Below */}
                        <text
                          textAnchor="middle"
                          dy={radius + 14}
                          fill="#E2E8F0"
                          fontSize="9.5"
                          fontWeight="600"
                          className="drop-shadow-md"
                          pointerEvents="none"
                        >
                          {node.label.length > 24 ? node.label.slice(0, 22) + "..." : node.label}
                        </text>

                        {/* Node Type Pill Below */}
                        <text
                          textAnchor="middle"
                          dy={radius + 25}
                          fill="#94A3B8"
                          fontSize="8"
                          fontWeight="500"
                          pointerEvents="none"
                        >
                          [{node.type}]
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* Node Inspect Overlay Drawer (if clicked) */}
              {inspectedNode && (
                <div className="absolute top-4 right-4 z-20 w-80 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 p-4 text-white shadow-2xl animate-in fade-in duration-150 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        {inspectedNode.id}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-0.5 leading-snug">
                        {inspectedNode.label}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInspectedNode(null)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      {icons.close({ className: "h-4 w-4" })}
                    </button>
                  </div>

                  <div className="text-xs space-y-2 pt-2 border-t border-slate-800 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Concept Type:</span>
                      <span className="font-semibold text-indigo-300">{inspectedNode.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Origin Source:</span>
                      <span className="font-mono text-slate-300">{inspectedNode.source}</span>
                    </div>
                    {inspectedNode.attributes?.text && (
                      <div className="pt-1">
                        <span className="text-slate-400 block mb-0.5 font-semibold">Content:</span>
                        <p className="bg-slate-800/80 rounded-lg p-2 text-[11px] text-slate-200 max-h-32 overflow-y-auto leading-relaxed">
                          {inspectedNode.attributes.text}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStartNodeId(inspectedNode.id)}
                      className="flex-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 px-2 py-1.5 text-center text-xs font-semibold text-white transition"
                    >
                      Set as Start Node
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoalNodeId(inspectedNode.id)}
                      className="flex-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 px-2 py-1.5 text-center text-xs font-semibold text-white transition"
                    >
                      Set as Goal Node
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ---------------- SECTION 4: SEARCH ALGORITHMS DEMO ---------------- */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Section 4 — AI Search Algorithms Demonstration (BFS / DFS / Best-First)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Explore how AI graph search algorithms navigate between research problem formulation and literature evidence.
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                Classical AI Search Syllabus
              </span>
            </div>

            {/* Presets Shortcuts */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Educational Query Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applySearchPreset("project_to_paper")}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition"
                >
                  Start: Project → Goal: Literature Paper
                </button>
                <button
                  type="button"
                  onClick={() => applySearchPreset("gap_to_limitation")}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition"
                >
                  Start: Claimed Gap → Goal: Limitation
                </button>
                <button
                  type="button"
                  onClick={() => applySearchPreset("method_to_paper")}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition"
                >
                  Start: Proposed Method → Goal: Literature Paper
                </button>
                <button
                  type="button"
                  onClick={() => applySearchPreset("contrib_to_finding")}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition"
                >
                  Start: Proposed Contribution → Goal: Finding
                </button>
              </div>
            </div>

            {/* Algorithm Controls Form */}
            <form onSubmit={handleRunSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
              {/* Algorithm Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  1. Search Algorithm
                </label>
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="bfs">Breadth-First Search (BFS)</option>
                  <option value="dfs">Depth-First Search (DFS)</option>
                  <option value="best_first">Greedy Best-First Search (Heuristic)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {algorithm === "bfs"
                    ? "Guarantees shortest hop path"
                    : algorithm === "dfs"
                    ? "Explores depth along single branch"
                    : "Prioritizes lexical similarity to goal"}
                </span>
              </div>

              {/* Start Node */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  2. Start Node
                </label>
                <select
                  value={startNodeId}
                  onChange={(e) => setStartNodeId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                >
                  {graphData?.nodes?.map((n) => (
                    <option key={n.id} value={n.id}>
                      [{n.type}] {n.label.slice(0, 36)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Goal Node */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  3. Goal Node
                </label>
                <select
                  value={goalNodeId}
                  onChange={(e) => setGoalNodeId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                >
                  {graphData?.nodes?.map((n) => (
                    <option key={n.id} value={n.id}>
                      [{n.type}] {n.label.slice(0, 36)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition"
                >
                  {isSearching ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Traversing Graph...</span>
                    </>
                  ) : (
                    <>
                      {icons.search({ className: "h-4 w-4" })}
                      <span>Execute {algorithm.toUpperCase().replace("_", "-")}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {searchError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                {searchError}
              </div>
            )}

            {/* Search Results Display */}
            {searchResult && (
              <div className="space-y-5 pt-4 border-t border-slate-200">
                {/* Status Bar */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        {searchResult.algorithm} Traversal Result:
                      </span>
                      {searchResult.found ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Path Found ({searchResult.path_length} Hops)
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          No Path Discovered
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {searchResult.explanation}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Nodes Visited</span>
                      <span className="text-lg font-bold text-slate-800">
                        {searchResult.visited_order?.length || 0}
                      </span>
                    </div>
                    <div className="h-7 w-[1px] bg-slate-200" />
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Path Length</span>
                      <span className="text-lg font-bold text-indigo-700">
                        {searchResult.path_length || 0} Hops
                      </span>
                    </div>
                  </div>
                </div>

                {/* Discovered Path Breadcrumbs */}
                {searchResult.found && searchResult.path?.length > 0 && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 block">
                      Discovered Conceptual Path (Start → Goal):
                    </span>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {searchResult.path.map((nodeId, idx) => {
                        const node = layoutNodeMap[nodeId];
                        const edge = searchResult.path_edges?.[idx];
                        return (
                          <div key={nodeId} className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-xs font-semibold text-slate-900 shadow-2xs">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span>{node ? node.label : nodeId}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                [{node?.type || "Node"}]
                              </span>
                            </span>
                            {edge && (
                              <div className="flex items-center gap-1 text-emerald-700 font-mono text-[11px] font-bold">
                                <span>--[{edge.relationship}]--&gt;</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Visited Order Sequence */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Complete Node Exploration Sequence ({searchResult.visited_order?.length} total visited):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {searchResult.visited_order?.map((vId, idx) => {
                      const vNode = layoutNodeMap[vId];
                      const inPath = highlightedPathNodeIds.has(vId);
                      return (
                        <span
                          key={`${vId}_${idx}`}
                          className={`text-xs px-2.5 py-1 rounded-md border font-medium ${
                            inPath
                              ? "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          <span className="text-[10px] text-slate-400 mr-1">#{idx + 1}</span>
                          {vNode ? vNode.label.slice(0, 26) : vId}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Step-by-Step Traversal Trace (with Heuristics for Best-First) */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Detailed Step-by-Step Traversal &amp; Explainability:
                  </span>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                    {searchResult.steps?.map((step) => (
                      <div
                        key={step.step_number}
                        className="rounded-lg border border-slate-200 bg-white p-3 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-2xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400 text-[11px]">
                              Step {step.step_number}:
                            </span>
                            <span className="font-bold text-slate-900">{step.node_label}</span>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {step.node_type}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed">
                            {step.explanation}
                          </p>
                        </div>

                        {step.heuristic_value !== undefined && (
                          <div className="flex items-center gap-3 text-right flex-shrink-0">
                            <div>
                              <span className="text-[10px] text-slate-400 block">Heuristic Distance h(n)</span>
                              <span className="font-mono font-bold text-indigo-700">
                                {step.heuristic_value.toFixed(3)}
                              </span>
                            </div>
                            <div className="h-6 w-[1px] bg-slate-200" />
                            <div>
                              <span className="text-[10px] text-slate-400 block">Relevance</span>
                              <span className="font-mono font-bold text-emerald-700">
                                {Math.round(step.relevance_score * 100)}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
