import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { analyzeContributionDifferentiation } from "../service/api";
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
  shieldAlert: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
      <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
    </svg>
  ),
  info: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M12 12v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  checkCircle: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  alertTriangle: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinejoin="round" />
      <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
    </svg>
  ),
  chevronDown: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chevronUp: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  layers: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
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
};

/* ---------------------------------------------------------
   Classification Badge Styles & Helpers
--------------------------------------------------------- */
function getClassificationBadge(classification) {
  switch (classification) {
    case "Clearly Differentiated":
      return {
        bg: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-500/20",
        dot: "bg-emerald-500",
        icon: icons.checkCircle,
        label: "Clearly Differentiated",
      };
    case "Partially Differentiated":
      return {
        bg: "bg-amber-50 text-amber-800 border-amber-300 ring-amber-500/20",
        dot: "bg-amber-500",
        icon: icons.info,
        label: "Partially Differentiated",
      };
    case "Needs Clarification":
      return {
        bg: "bg-sky-50 text-sky-800 border-sky-300 ring-sky-500/20",
        dot: "bg-sky-500",
        icon: icons.alertTriangle,
        label: "Needs Clarification",
      };
    case "Potential Overlap":
      return {
        bg: "bg-rose-50 text-rose-800 border-rose-300 ring-rose-500/20",
        dot: "bg-rose-600",
        icon: icons.shieldAlert,
        label: "Potential Overlap",
      };
    default:
      return {
        bg: "bg-slate-100 text-slate-700 border-slate-300 ring-slate-400/20",
        dot: "bg-slate-400",
        icon: icons.info,
        label: classification || "Unknown",
      };
  }
}

const DIMENSION_CONFIG = [
  { key: "contribution_overlap", label: "Contribution Overlap", color: "indigo", highlight: true },
  { key: "method_overlap", label: "Method Overlap", color: "blue", highlight: false },
  { key: "problem_overlap", label: "Problem Overlap", color: "teal", highlight: false },
  { key: "dataset_overlap", label: "Dataset Context Overlap", color: "amber", highlight: false },
  { key: "objective_overlap", label: "Objective Overlap", color: "purple", highlight: false },
  { key: "evaluation_overlap", label: "Evaluation Overlap", color: "slate", highlight: false },
];

export default function ContributionAnalysis() {
  const [searchParams] = useSearchParams();
  const preselectedProjectId = searchParams.get("projectId") || "";

  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectsList, setProjectsList] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Editable Research Input Fields
  const [formData, setFormData] = useState({
    expectedContribution: "",
    researchProblem: "",
    researchObjective: "",
    proposedMethod: "",
    datasetContext: "",
    evaluationMetrics: "",
  });

  const [topK, setTopK] = useState(8);
  const [isInputExpanded, setIsInputExpanded] = useState(false);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);

  // Filter tabs for paper list
  const [activeFilter, setActiveFilter] = useState("all");

  // Expanded paper card IDs
  const [expandedPaperIds, setExpandedPaperIds] = useState(new Set());

  // Load Projects on mount
  useEffect(() => {
    const list = getResearchProjects();
    setProjectsList(list);

    if (list.length > 0) {
      if (preselectedProjectId && list.some((p) => p.id === preselectedProjectId)) {
        setSelectedProjectId(preselectedProjectId);
      } else {
        setSelectedProjectId(list[0].id);
      }
    }
  }, [preselectedProjectId]);

  const currentProject = useMemo(() => {
    return projectsList.find((p) => p.id === selectedProjectId) || null;
  }, [projectsList, selectedProjectId]);

  // Sync form inputs when current project changes
  useEffect(() => {
    if (currentProject) {
      setFormData({
        expectedContribution: currentProject.expectedContribution || "",
        researchProblem: currentProject.researchProblem || "",
        researchObjective: currentProject.researchObjective || "",
        proposedMethod: currentProject.proposedMethod || currentProject.methodology || "",
        datasetContext: currentProject.datasetContext || currentProject.dataset || "",
        evaluationMetrics: currentProject.evaluationMetrics || "",
      });
      setAnalysisResult(null);
      setAnalysisError("");
      setExpandedPaperIds(new Set());
    }
  }, [currentProject]);

  const handleFieldChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
    if (analysisError) setAnalysisError("");
  };

  const togglePaperExpand = (id) => {
    setExpandedPaperIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllPapers = () => {
    if (!analysisResult?.paper_comparisons) return;
    const allIds = new Set(analysisResult.paper_comparisons.map((p) => p.paper_id));
    setExpandedPaperIds(allIds);
  };

  const collapseAllPapers = () => {
    setExpandedPaperIds(new Set());
  };

  const handleRunAnalysis = async (e) => {
    e?.preventDefault();
    if (!formData.expectedContribution.trim() && !formData.researchProblem.trim()) {
      setAnalysisError("Expected contribution or research problem is required to evaluate against the literature corpus.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError("");

    try {
      const payload = {
        research_information: {
          title: currentProject?.title || "Research Study",
          domain: currentProject?.domain || "Computer Science",
          expected_contribution: formData.expectedContribution.trim(),
          research_problem: formData.researchProblem.trim(),
          research_objective: formData.researchObjective.trim(),
          proposed_method: formData.proposedMethod.trim(),
          dataset_context: formData.datasetContext.trim(),
          evaluation_metrics: formData.evaluationMetrics.trim(),
          claimed_research_gap: currentProject?.claimedGap || "",
          keywords: currentProject?.keywords || [],
        },
        top_k: topK,
      };

      const res = await analyzeContributionDifferentiation(payload);
      setAnalysisResult(res);
      setActiveFilter("all");
      // Auto expand the top 2 papers for convenience
      if (res.paper_comparisons && res.paper_comparisons.length > 0) {
        const initialExpanded = new Set(res.paper_comparisons.slice(0, 2).map((p) => p.paper_id));
        setExpandedPaperIds(initialExpanded);
      }
    } catch (err) {
      console.error("Contribution analysis error:", err);
      setAnalysisError(err.message || "Failed to execute contribution differentiation.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredPapers = useMemo(() => {
    if (!analysisResult?.paper_comparisons) return [];
    if (activeFilter === "all") return analysisResult.paper_comparisons;
    return analysisResult.paper_comparisons.filter((p) => {
      if (activeFilter === "clearly") return p.classification === "Clearly Differentiated";
      if (activeFilter === "partially") return p.classification === "Partially Differentiated";
      if (activeFilter === "overlap") return p.classification === "Potential Overlap";
      if (activeFilter === "clarification") return p.classification === "Needs Clarification";
      return true;
    });
  }, [analysisResult, activeFilter]);

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
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-900/30 transition-all"
          >
            {icons.contributionAnalysis({ className: "h-4.5 w-4.5 text-white" })}
            <span>Contribution Analysis</span>
          </Link>

          <Link
            to="/student/knowledge-graph"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.knowledgeGraph({ className: "h-4.5 w-4.5 text-slate-400" })}
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
        {/* Header */}
        <header className="hidden lg:flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4.5 shadow-xs sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-slate-900">Contribution Differentiation Engine</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Phase 7 Deterministic Engine
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-900">{user?.name || "Student Researcher"}</p>
              <p className="text-[11px] text-slate-500">Academic Differentiation</p>
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
                  {icons.contributionAnalysis({ className: "h-3.5 w-3.5 text-indigo-300" })}
                  Explainable Multi-Dimensional Comparison
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Contribution Differentiation Engine
                </h1>
                <p className="mt-1.5 text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Compares your proposed research contribution against the retrieved literature corpus across six distinct dimensions:
                  problem, objective, method, dataset, contribution, and evaluation.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Corpus-Grounded Baseline
                </span>
              </div>
            </div>
          </div>

          {/* Scope & Grounding Notice Banner */}
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
            {icons.info({ className: "h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" })}
            <div className="space-y-1">
              <span className="font-semibold text-amber-950">Corpus Scope & Objective Reminder:</span>
              <p className="leading-relaxed">
                This engine answers: <span className="italic font-medium">"How differentiated is this proposed contribution from the available literature corpus?"</span>{" "}
                It does <strong>not</strong> determine global research novelty, complete literature exhaustiveness, or scientific truth.
                High contribution overlap alone is never flagged as Potential Overlap without contextual overlap in problem, method, or dataset.
              </p>
            </div>
          </div>

          {/* ---------------- Configuration & Inputs Card ---------------- */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">1. Research Project & Contribution Inputs</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a research project to load its proposed contribution and contextual attributes.
                </p>
              </div>

              {/* Project Picker */}
              <div className="flex items-center gap-2">
                <label htmlFor="project-picker" className="text-xs font-semibold text-slate-600">
                  Project:
                </label>
                <select
                  id="project-picker"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 max-w-xs truncate"
                >
                  {projectsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.domain || "General"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Core Contribution Fields */}
            <div className="space-y-4">
              {/* Expected Contribution (Primary Focus) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-600" />
                    Expected Contribution (Required for Comparison)
                  </label>
                  <span className="text-[11px] text-slate-400">Lexical anchor for contribution dimension</span>
                </div>
                <textarea
                  rows={3}
                  value={formData.expectedContribution}
                  onChange={(e) => handleFieldChange("expectedContribution", e.target.value)}
                  placeholder="Detail your primary expected research contribution, novel formulation, theoretical proof, or architectural mechanism..."
                  className="w-full rounded-xl border border-indigo-200 bg-indigo-50/20 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>

              {/* Contextual Toggle */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setIsInputExpanded(!isInputExpanded)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                >
                  {isInputExpanded ? icons.chevronUp({ className: "h-4 w-4" }) : icons.chevronDown({ className: "h-4 w-4" })}
                  <span>{isInputExpanded ? "Hide contextual dimensions" : "Review / edit all 5 contextual dimensions (problem, objective, method, dataset, evaluation)"}</span>
                </button>
                <div className="text-[11px] text-slate-400 hidden sm:block">
                  {isInputExpanded ? "All 6 comparison dimensions editable" : "Using project record defaults"}
                </div>
              </div>

              {/* Expandable Contextual Dimensions Grid */}
              {isInputExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Research Problem
                    </label>
                    <textarea
                      rows={2}
                      value={formData.researchProblem}
                      onChange={(e) => handleFieldChange("researchProblem", e.target.value)}
                      placeholder="The underlying academic or practical problem being tackled..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Research Objective
                    </label>
                    <textarea
                      rows={2}
                      value={formData.researchObjective}
                      onChange={(e) => handleFieldChange("researchObjective", e.target.value)}
                      placeholder="The target scientific objective or goal..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Proposed Method / Architecture
                    </label>
                    <textarea
                      rows={2}
                      value={formData.proposedMethod}
                      onChange={(e) => handleFieldChange("proposedMethod", e.target.value)}
                      placeholder="Algorithms, architectures, mathematical frameworks, or pipelines used..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Dataset / Application Context
                    </label>
                    <textarea
                      rows={2}
                      value={formData.datasetContext}
                      onChange={(e) => handleFieldChange("datasetContext", e.target.value)}
                      placeholder="Benchmark datasets, operational domains, or experimental conditions..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Evaluation Metrics / Validation
                    </label>
                    <input
                      type="text"
                      value={formData.evaluationMetrics}
                      onChange={(e) => handleFieldChange("evaluationMetrics", e.target.value)}
                      placeholder="e.g. AUROC, F1-score, IoU, Hits@10, Mean Reciprocal Rank, Perplexity..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <label htmlFor="topk-select" className="text-xs font-semibold text-slate-600">
                    Corpus Comparison Depth:
                  </label>
                  <select
                    id="topk-select"
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={5}>Top 5 retrieved papers</option>
                    <option value={8}>Top 8 retrieved papers (Default)</option>
                    <option value={10}>Top 10 retrieved papers</option>
                    <option value={15}>Top 15 retrieved papers</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Computing 6-D Differentiation...</span>
                    </>
                  ) : (
                    <>
                      {icons.sparkles({ className: "h-4 w-4" })}
                      <span>Run Contribution Differentiation</span>
                    </>
                  )}
                </button>
              </div>

              {analysisError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
                  {icons.alertTriangle({ className: "h-4 w-4 text-rose-600 flex-shrink-0" })}
                  <span>{analysisError}</span>
                </div>
              )}
            </div>
          </div>

          {/* ---------------- Results Section ---------------- */}
          {analysisResult && (
            <div className="space-y-6">
              {/* Aggregate Summary Overview Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Project-Level Differentiation Summary</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ground truth corpus evaluation for "{analysisResult.project_title}"
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    {analysisResult.aggregate_summary?.total_papers_compared || 0} local papers evaluated
                  </span>
                </div>

                {/* 4 Classification Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  {/* Clearly Differentiated */}
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-800">Clearly Differentiated</span>
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    </div>
                    <p className="mt-2 text-2xl sm:text-3xl font-bold text-emerald-950">
                      {analysisResult.aggregate_summary?.clearly_differentiated_count || 0}
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-700/80">Low overlap across all 6 dimensions</p>
                  </div>

                  {/* Partially Differentiated */}
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-800">Partially Differentiated</span>
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                    </div>
                    <p className="mt-2 text-2xl sm:text-3xl font-bold text-amber-950">
                      {analysisResult.aggregate_summary?.partially_differentiated_count || 0}
                    </p>
                    <p className="mt-1 text-[11px] text-amber-700/80">Meaningful differentiation in key areas</p>
                  </div>

                  {/* Needs Clarification */}
                  <div className="rounded-xl border border-sky-200/80 bg-sky-50/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-sky-800">Needs Clarification</span>
                      <span className="h-2 w-2 rounded-full bg-sky-500" />
                    </div>
                    <p className="mt-2 text-2xl sm:text-3xl font-bold text-sky-950">
                      {analysisResult.aggregate_summary?.needs_clarification_count || 0}
                    </p>
                    <p className="mt-1 text-[11px] text-sky-700/80">Missing details or ambiguous phrasing</p>
                  </div>

                  {/* Potential Overlap */}
                  <div className="rounded-xl border border-rose-200/80 bg-rose-50/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-rose-800">Potential Overlap</span>
                      <span className="h-2 w-2 rounded-full bg-rose-600" />
                    </div>
                    <p className="mt-2 text-2xl sm:text-3xl font-bold text-rose-950">
                      {analysisResult.aggregate_summary?.potential_overlap_count || 0}
                    </p>
                    <p className="mt-1 text-[11px] text-rose-700/80">High contribution + contextual overlap</p>
                  </div>
                </div>

                {/* Strongest Overlapping Dimensions & Highest Overlap Papers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  {/* Strongest Dimensions */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      {icons.layers({ className: "h-4 w-4 text-indigo-600" })}
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Strongest Overlapping Dimensions in Corpus
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {analysisResult.aggregate_summary?.strongest_overlapping_dimensions?.length > 0 ? (
                        analysisResult.aggregate_summary.strongest_overlapping_dimensions.map((dim) => (
                          <div key={dim.dimension} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium text-slate-700 capitalize">
                                {dim.dimension.replace("_", " ")}
                              </span>
                              <span className="font-semibold text-slate-900">{dim.average_overlap_pct}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{ width: `${Math.min(100, dim.average_overlap_pct)}%` }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic">No significant overlap recorded across dimensions.</p>
                      )}
                    </div>
                  </div>

                  {/* Highest-Overlap Papers */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      {icons.literature({ className: "h-4 w-4 text-indigo-600" })}
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Highest-Overlap Papers in Available Corpus
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {analysisResult.aggregate_summary?.highest_overlap_papers?.length > 0 ? (
                        analysisResult.aggregate_summary.highest_overlap_papers.slice(0, 3).map((item) => (
                          <div
                            key={item.paper_id}
                            className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 text-xs"
                          >
                            <div className="truncate mr-3">
                              <span className="font-semibold text-slate-800 block truncate">{item.title}</span>
                              <span className="text-[11px] text-slate-400">ID: {item.paper_id}</span>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="inline-block px-2 py-0.5 rounded font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {item.contribution_overlap_pct}%
                              </span>
                              <span className="block text-[10px] text-slate-400">contrib.</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic">No matching papers returned.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Corpus Limitation Guardrail Callout */}
                <div className="rounded-xl border border-slate-300 bg-slate-100/70 p-3.5 text-xs text-slate-700 flex items-start gap-2.5">
                  {icons.shieldAlert({ className: "h-4.5 w-4.5 text-slate-500 flex-shrink-0 mt-0.5" })}
                  <p className="leading-relaxed">
                    <strong className="text-slate-900">Corpus Scope Limitation:</strong>{" "}
                    {analysisResult.corpus_limitation_statement ||
                      "This analysis is based only on the available literature corpus. It does not establish global research novelty, complete literature coverage, or scientific truth. Human academic review is required."}
                  </p>
                </div>
              </div>

              {/* ---------------- Paper-by-Paper Comparison List ---------------- */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Paper-by-Paper Comparison & Evidence</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ground truth dimensional evidence extracted directly from each retrieved literature paper.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={expandAllPapers}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      Expand All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={collapseAllPapers}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                  <button
                    type="button"
                    onClick={() => setActiveFilter("all")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      activeFilter === "all"
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    All Papers ({analysisResult.paper_comparisons?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("clearly")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      activeFilter === "clearly"
                        ? "bg-emerald-700 text-white"
                        : "bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200"
                    }`}
                  >
                    Clearly Differentiated ({analysisResult.aggregate_summary?.clearly_differentiated_count || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("partially")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      activeFilter === "partially"
                        ? "bg-amber-600 text-white"
                        : "bg-white text-amber-800 hover:bg-amber-50 border border-amber-200"
                    }`}
                  >
                    Partially Differentiated ({analysisResult.aggregate_summary?.partially_differentiated_count || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("overlap")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      activeFilter === "overlap"
                        ? "bg-rose-700 text-white"
                        : "bg-white text-rose-800 hover:bg-rose-50 border border-rose-200"
                    }`}
                  >
                    Potential Overlap ({analysisResult.aggregate_summary?.potential_overlap_count || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("clarification")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      activeFilter === "clarification"
                        ? "bg-sky-700 text-white"
                        : "bg-white text-sky-800 hover:bg-sky-50 border border-sky-200"
                    }`}
                  >
                    Needs Clarification ({analysisResult.aggregate_summary?.needs_clarification_count || 0})
                  </button>
                </div>

                {/* Filtered Papers List */}
                {filteredPapers.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-xs">
                    No papers found matching the "{activeFilter}" filter.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPapers.map((paper) => {
                      const badge = getClassificationBadge(paper.classification);
                      const isExpanded = expandedPaperIds.has(paper.paper_id);

                      return (
                        <div
                          key={paper.paper_id}
                          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 transition hover:border-slate-300"
                        >
                          {/* Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  {paper.paper_id}
                                </span>
                                {paper.publication_year && (
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    Published: {paper.publication_year}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                {paper.title}
                              </h3>
                            </div>

                            <div className="flex items-center gap-2 self-start">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ring-1 ${badge.bg}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                                {paper.classification}
                              </span>
                            </div>
                          </div>

                          {/* Grounded Explanation */}
                          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 text-xs text-slate-800 leading-relaxed">
                            <strong className="text-slate-900 block mb-1">Engine Reasoning:</strong>
                            {paper.explanation}
                          </div>

                          {/* Matched Dimensions Chips */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-500">Matched Dimensions:</span>
                            {paper.matched_dimensions && paper.matched_dimensions.length > 0 ? (
                              paper.matched_dimensions.map((m) => (
                                <span
                                  key={m}
                                  className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 capitalize"
                                >
                                  {m}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">None exceeding threshold</span>
                            )}
                          </div>

                          {/* Expand/Collapse Toggle */}
                          <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                            <button
                              type="button"
                              onClick={() => togglePaperExpand(paper.paper_id)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                            >
                              {isExpanded ? icons.chevronUp({ className: "h-4 w-4" }) : icons.chevronDown({ className: "h-4 w-4" })}
                              <span>{isExpanded ? "Hide detailed 6-dimension breakdown & evidence" : "Show 6-dimension scores & grounded corpus evidence"}</span>
                            </button>
                            <span className="text-[11px] text-slate-400">
                              Contrib. Overlap: {Math.round((paper.dimension_scores?.contribution_overlap || 0) * 100)}%
                            </span>
                          </div>

                          {/* Expanded Details: 6 Dimension Scores & Corpus Evidence */}
                          {isExpanded && (
                            <div className="pt-4 border-t border-slate-100 space-y-5">
                              {/* 6 Dimension Score Bars */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                  Six Dimension Overlap Breakdown
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {DIMENSION_CONFIG.map(({ key, label, highlight }) => {
                                    const score = paper.dimension_scores?.[key] || 0;
                                    const pct = Math.round(score * 100);
                                    return (
                                      <div
                                        key={key}
                                        className={`rounded-xl p-3 border ${
                                          highlight
                                            ? "bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-500/20"
                                            : "bg-slate-50/50 border-slate-200"
                                        }`}
                                      >
                                        <div className="flex justify-between items-center text-xs mb-1.5">
                                          <span className={`font-semibold ${highlight ? "text-indigo-950 font-bold" : "text-slate-700"}`}>
                                            {label}
                                          </span>
                                          <span className={`font-bold ${highlight ? "text-indigo-700" : "text-slate-800"}`}>
                                            {pct}%
                                          </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all duration-300 ${
                                              highlight
                                                ? "bg-indigo-600"
                                                : pct >= 50
                                                ? "bg-amber-500"
                                                : "bg-slate-400"
                                            }`}
                                            style={{ width: `${Math.min(100, pct)}%` }}
                                          />
                                        </div>
                                        <p className="mt-1 text-[10px] text-slate-400">
                                          Score: {score.toFixed(3)}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Grounded Literature Corpus Evidence Fields */}
                              {paper.relevant_corpus_evidence && (
                                <div className="space-y-3">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Actual Grounded Literature Evidence (From Corpus)
                                  </h4>
                                  <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4 space-y-3 text-xs">
                                    {paper.relevant_corpus_evidence.contribution && (
                                      <div>
                                        <span className="font-bold text-slate-800 block">Corpus Contribution:</span>
                                        <p className="text-slate-600 mt-0.5 leading-relaxed">
                                          {paper.relevant_corpus_evidence.contribution}
                                        </p>
                                      </div>
                                    )}

                                    {paper.relevant_corpus_evidence.problem && (
                                      <div>
                                        <span className="font-bold text-slate-800 block">Corpus Research Problem:</span>
                                        <p className="text-slate-600 mt-0.5 leading-relaxed">
                                          {paper.relevant_corpus_evidence.problem}
                                        </p>
                                      </div>
                                    )}

                                    {paper.relevant_corpus_evidence.method && (
                                      <div>
                                        <span className="font-bold text-slate-800 block">Corpus Method:</span>
                                        <p className="text-slate-600 mt-0.5 leading-relaxed">
                                          {paper.relevant_corpus_evidence.method}
                                        </p>
                                      </div>
                                    )}

                                    {paper.relevant_corpus_evidence.dataset && (
                                      <div>
                                        <span className="font-bold text-slate-800 block">Corpus Dataset Context:</span>
                                        <p className="text-slate-600 mt-0.5 leading-relaxed">
                                          {paper.relevant_corpus_evidence.dataset}
                                        </p>
                                      </div>
                                    )}

                                    {paper.relevant_corpus_evidence.evaluation && (
                                      <div>
                                        <span className="font-bold text-slate-800 block">Corpus Evaluation:</span>
                                        <p className="text-slate-600 mt-0.5 leading-relaxed">
                                          {paper.relevant_corpus_evidence.evaluation}
                                        </p>
                                      </div>
                                    )}

                                    {paper.relevant_corpus_evidence.abstract && (
                                      <div>
                                        <span className="font-bold text-slate-800 block">Corpus Abstract:</span>
                                        <p className="text-slate-600 mt-0.5 leading-relaxed italic">
                                          "{paper.relevant_corpus_evidence.abstract}"
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
