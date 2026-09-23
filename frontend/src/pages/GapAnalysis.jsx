import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { analyzeResearchGap } from "../service/api";
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

function getStatusBadgeStyle(status) {
  switch (status) {
    case "Supported by Available Evidence":
      return "bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-500/20";
    case "Partially Supported":
      return "bg-amber-50 text-amber-800 border-amber-300 ring-amber-500/20";
    case "Potentially Contradicted":
      return "bg-indigo-50 text-indigo-900 border-indigo-300 ring-indigo-500/20";
    case "Insufficient Evidence":
    default:
      return "bg-slate-100 text-slate-700 border-slate-300 ring-slate-400/20";
  }
}

function getStatusDotColor(status) {
  switch (status) {
    case "Supported by Available Evidence":
      return "bg-emerald-500";
    case "Partially Supported":
      return "bg-amber-500";
    case "Potentially Contradicted":
      return "bg-indigo-600";
    case "Insufficient Evidence":
    default:
      return "bg-slate-400";
  }
}

export default function GapAnalysis() {
  const [searchParams] = useSearchParams();
  const preselectedProjectId = searchParams.get("projectId") || "";

  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectsList, setProjectsList] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Editable/viewable research inputs
  const [customGap, setCustomGap] = useState("");
  const [topK, setTopK] = useState(8);

  // Analysis Execution & Results
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);

  // Filter tabs for paper evidence
  const [activeFilter, setActiveFilter] = useState("all");

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

  // Sync customGap when project changes
  useEffect(() => {
    if (currentProject) {
      const defaultGap =
        currentProject.claimedResearchGap ||
        currentProject.researchProblem ||
        "";
      setCustomGap(defaultGap);
      setAnalysisResult(null);
      setAnalysisError("");
    }
  }, [currentProject]);

  const handleRunAnalysis = async (e) => {
    e?.preventDefault();
    if (!customGap.trim()) {
      setAnalysisError("A claimed research gap is required to evaluate against literature evidence.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError("");

    try {
      const researchInfo = {
        title: currentProject?.title || "Research Project",
        domain: currentProject?.domain || "Computer Vision and Agriculture AI",
        research_problem: currentProject?.researchProblem || customGap.trim(),
        research_objective: currentProject?.researchObjective || "",
        claimed_research_gap: customGap.trim(),
        proposed_method: currentProject?.methodology || "",
        dataset_context: currentProject?.dataset || "",
        expected_contribution: currentProject?.expectedContribution || "",
        keywords: currentProject?.keywords || [],
      };

      const res = await analyzeResearchGap({
        research_information: researchInfo,
        top_k: topK,
      });

      setAnalysisResult(res);
      setActiveFilter("all");
    } catch (err) {
      console.error("Gap analysis error:", err);
      setAnalysisError(err.message || "Failed to complete research gap analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredPapers = useMemo(() => {
    if (!analysisResult?.paper_analyses) return [];
    if (activeFilter === "all") return analysisResult.paper_analyses;
    return analysisResult.paper_analyses.filter((p) => {
      if (activeFilter === "supporting") return p.evidence_relationship === "Supported by Available Evidence";
      if (activeFilter === "partial") return p.evidence_relationship === "Partially Supported";
      if (activeFilter === "contradicted") return p.evidence_relationship === "Potentially Contradicted";
      if (activeFilter === "insufficient") return p.evidence_relationship === "Insufficient Evidence";
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
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-900/30 transition-all"
          >
            {icons.gapAnalysis({ className: "h-4.5 w-4.5 text-white" })}
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
            <span className="text-base font-bold text-slate-900">Research Gap Contradiction Checker</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Phase 6 Reasoning
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-900">{user?.name || "Student Researcher"}</p>
              <p className="text-[11px] text-slate-500">Academic Gap Reasoning</p>
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
                  {icons.gapAnalysis({ className: "h-3.5 w-3.5 text-indigo-300" })}
                  Explainable Gap Evidence Reasoning
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Research Gap Contradiction Checker
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-200 max-w-3xl leading-relaxed">
                  Evaluate your claimed research gap against retrieved literature from the local corpus.
                  Identifies whether existing evidence corroborates, partially covers, or potentially challenges your stated gap.
                </p>
              </div>

              <div className="flex-shrink-0 bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-slate-300 max-w-xs">
                <span className="font-semibold text-white block mb-1">Human Judgment Required</span>
                <p className="text-[11px] text-slate-300 leading-normal">
                  This system provides rule-based evidence relationships, not definitive claims of global novelty or scientific truth.
                </p>
              </div>
            </div>
          </div>

          {/* Project & Gap Input Workspace */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Select Project & Stated Gap
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a registered research project to load its claimed research gap, or refine the text below.
                </p>
              </div>

              {projectsList.length > 0 && (
                <div className="flex items-center gap-2">
                  <label htmlFor="project-select" className="text-xs font-medium text-slate-600">
                    Project:
                  </label>
                  <select
                    id="project-select"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                  >
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.domain || "AI"})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Gap Formulation Form */}
            <form onSubmit={handleRunAnalysis} className="space-y-4">
              <div>
                <label htmlFor="claimed-gap-input" className="block text-xs font-bold text-slate-900 mb-1.5">
                  Claimed Research Gap
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <textarea
                  id="claimed-gap-input"
                  rows={4}
                  value={customGap}
                  onChange={(e) => setCustomGap(e.target.value)}
                  placeholder="Example: Existing Vision Transformer architectures are evaluated primarily on single-leaf closeups; multi-leaf overlapping canopies in dense orchards degrade localization precision and have not been resolved."
                  className="w-full rounded-xl border border-slate-300 p-3.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden leading-relaxed"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Clearly express what current literature lacks, misses, or leaves unresolved.
                </p>
              </div>

              {/* Advanced controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-3">
                  <label htmlFor="top-k-select" className="text-xs font-medium text-slate-600">
                    Literature Evidence Depth (top_k):
                  </label>
                  <select
                    id="top-k-select"
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800"
                  >
                    <option value={5}>Top 5 Evidence Papers</option>
                    <option value={8}>Top 8 Evidence Papers</option>
                    <option value={10}>Top 10 Evidence Papers</option>
                    <option value={15}>Top 15 Evidence Papers</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isAnalyzing || !customGap.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-5 py-2.5 text-xs font-semibold shadow-xs transition hover:translate-y-[-1px] disabled:translate-y-0"
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Evaluating Evidence Papers...
                    </>
                  ) : (
                    <>
                      {icons.gapAnalysis({ className: "h-4 w-4" })}
                      Analyze Research Gap
                    </>
                  )}
                </button>
              </div>

              {analysisError && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
                  {icons.alertTriangle({ className: "h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" })}
                  <span>{analysisError}</span>
                </div>
              )}
            </form>
          </div>

          {/* ---------------- Analysis Results Section ---------------- */}
          {analysisResult && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Mandatory Corpus Limitation Callout */}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4.5 sm:p-5 text-xs text-indigo-950 flex items-start gap-3 shadow-xs">
                {icons.shieldAlert({ className: "h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" })}
                <div className="space-y-1">
                  <span className="font-bold text-indigo-900 block uppercase tracking-wider text-[11px]">
                    Academic Corpus Limitation Notice
                  </span>
                  <p className="text-xs text-indigo-900/90 leading-relaxed font-normal">
                    {analysisResult.corpus_limitation}
                  </p>
                </div>
              </div>

              {/* Overall Assessment Banner */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Overall Evidence Assessment
                    </span>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-bold ring-1 ${getStatusBadgeStyle(
                          analysisResult.overall_assessment?.status
                        )}`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${getStatusDotColor(
                            analysisResult.overall_assessment?.status
                          )}`}
                        />
                        {analysisResult.overall_assessment?.status || "Insufficient Evidence"}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Based on {analysisResult.overall_assessment?.evidence_count || 0} retrieved papers
                      </span>
                    </div>
                  </div>

                  {/* Summary Counters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-1.5 text-center">
                      <span className="block text-xs font-bold text-emerald-800">
                        {analysisResult.overall_assessment?.supporting ?? 0}
                      </span>
                      <span className="text-[10px] font-medium text-emerald-700">Supporting</span>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-1.5 text-center">
                      <span className="block text-xs font-bold text-amber-800">
                        {analysisResult.overall_assessment?.partial ?? 0}
                      </span>
                      <span className="text-[10px] font-medium text-amber-700">Partial</span>
                    </div>
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-1.5 text-center">
                      <span className="block text-xs font-bold text-indigo-900">
                        {analysisResult.overall_assessment?.potentially_contradicted ?? 0}
                      </span>
                      <span className="text-[10px] font-medium text-indigo-700">Potentially Contradicted</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-center">
                      <span className="block text-xs font-bold text-slate-700">
                        {analysisResult.overall_assessment?.insufficient ?? 0}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500">Insufficient</span>
                    </div>
                  </div>
                </div>

                {/* Stated gap reference */}
                <div className="mt-4 pt-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Evaluated Claim
                  </span>
                  <blockquote className="mt-1 border-l-3 border-indigo-500 pl-3.5 text-xs text-slate-800 italic bg-slate-50/60 py-2 rounded-r-lg">
                    &ldquo;{analysisResult.claimed_research_gap}&rdquo;
                  </blockquote>
                </div>
              </div>

              {/* Filter Tabs & Evidence Papers List */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                    Retrieved Evidence Papers ({filteredPapers.length})
                  </h3>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setActiveFilter("all")}
                      className={`px-3 py-1 rounded-lg transition ${
                        activeFilter === "all" ? "bg-white text-slate-900 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      All ({analysisResult.paper_analyses.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter("supporting")}
                      className={`px-3 py-1 rounded-lg transition ${
                        activeFilter === "supporting" ? "bg-white text-emerald-800 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Supporting ({analysisResult.overall_assessment?.supporting ?? 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter("partial")}
                      className={`px-3 py-1 rounded-lg transition ${
                        activeFilter === "partial" ? "bg-white text-amber-800 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Partial ({analysisResult.overall_assessment?.partial ?? 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter("contradicted")}
                      className={`px-3 py-1 rounded-lg transition ${
                        activeFilter === "contradicted" ? "bg-white text-indigo-900 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Potentially Contradicted ({analysisResult.overall_assessment?.potentially_contradicted ?? 0})
                    </button>
                  </div>
                </div>

                {/* Evidence Paper Cards */}
                {filteredPapers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 text-xs">
                    No papers in this category for the current research gap.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPapers.map((paper) => {
                      const scores = paper.scores || {};
                      return (
                        <div
                          key={paper.paper_id}
                          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4 text-left transition hover:border-slate-300"
                        >
                          {/* Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  {paper.paper_id}
                                </span>
                                {paper.publication_year && (
                                  <span className="text-[11px] font-medium text-slate-400">
                                    {paper.publication_year}
                                  </span>
                                )}
                                <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                                  {Math.round((paper.similarity_score || 0) * 100)}% Similarity
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-slate-900 leading-snug">
                                {paper.title}
                              </h4>
                            </div>

                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ring-1 flex-shrink-0 ${getStatusBadgeStyle(
                                paper.evidence_relationship
                              )}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${getStatusDotColor(
                                  paper.evidence_relationship
                                )}`}
                              />
                              {paper.evidence_relationship}
                            </span>
                          </div>

                          {/* Evidence Dimensions Overlap Meters */}
                          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                              Evidence Dimensions
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-[11px]">
                              <div>
                                <div className="flex justify-between text-slate-600 mb-1">
                                  <span>Problem</span>
                                  <span className="font-semibold">{Math.round((scores.problem_overlap || 0) * 100)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-500 rounded-full"
                                    style={{ width: `${Math.min(100, Math.round((scores.problem_overlap || 0) * 100))}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-slate-600 mb-1">
                                  <span>Method</span>
                                  <span className="font-semibold">{Math.round((scores.method_overlap || 0) * 100)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-500 rounded-full"
                                    style={{ width: `${Math.min(100, Math.round((scores.method_overlap || 0) * 100))}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-slate-600 mb-1">
                                  <span>Dataset</span>
                                  <span className="font-semibold">{Math.round((scores.dataset_overlap || 0) * 100)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-500 rounded-full"
                                    style={{ width: `${Math.min(100, Math.round((scores.dataset_overlap || 0) * 100))}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-slate-600 mb-1">
                                  <span>Contribution</span>
                                  <span className="font-semibold">{Math.round((scores.contribution_overlap || 0) * 100)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-600 rounded-full"
                                    style={{ width: `${Math.min(100, Math.round((scores.contribution_overlap || 0) * 100))}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-slate-600 mb-1">
                                  <span>Limitation</span>
                                  <span className="font-semibold">{Math.round((scores.limitation_alignment || 0) * 100)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${Math.min(100, Math.round((scores.limitation_alignment || 0) * 100))}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Grounded Evidence Statements */}
                          {paper.evidence && paper.evidence.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                                Grounded Evidence Statements
                              </span>
                              <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                                {paper.evidence.map((stmt, idx) => (
                                  <li key={idx} className="leading-relaxed">
                                    {stmt}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Reason & Recommendation */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/60">
                              <span className="font-bold text-slate-900 block mb-1">Evidence Reason</span>
                              <p className="text-slate-600 leading-relaxed">{paper.reason}</p>
                            </div>
                            <div className="rounded-xl bg-indigo-50/50 p-3 border border-indigo-200/60">
                              <span className="font-bold text-indigo-900 block mb-1">Academic Recommendation</span>
                              <p className="text-indigo-900/90 leading-relaxed">{paper.recommendation}</p>
                            </div>
                          </div>
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
