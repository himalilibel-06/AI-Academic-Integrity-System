import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getStudentDashboard } from "../service/api";
import { getResearchProjects, deleteResearchProject } from "../service/projectStorage";
import { getManuscripts } from "../service/manuscriptStorage";

/* ---------------------------------------------------------
   GapGuard AI — Academic Research SVG Icons
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
  evidenceReports: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <path d="M14 2v6h6" strokeLinejoin="round" />
      <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
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
  revisionHistory: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 12h2M12 21a9 9 0 0 1-6.36-2.64" strokeLinecap="round" />
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
  upload: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sparkles: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 3l1.9 4.8L18.7 9.7l-4.8 1.9L12 16.5l-1.9-4.9-4.9-1.9 4.9-1.9L12 3z" strokeLinejoin="round" />
      <path d="M19 16l.9 2.2 2.1.9-2.1.9-.9 2.1-.9-2.1-2.2-.9 2.2-.9.9-2.2z" strokeLinejoin="round" />
    </svg>
  ),
  search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
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
  arrowRight: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  eye: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

/* ---------------------------------------------------------
   Navigation Items — Required GapGuard AI Structure
--------------------------------------------------------- */
const NAV_ITEMS = [
  { label: "Dashboard", icon: icons.dashboard, to: "/student/dashboard", implemented: true },
  { label: "Research Projects", icon: icons.projects, to: "#research-projects-section", implemented: true, isAnchor: true },
  { label: "Manuscripts", icon: icons.manuscripts, to: "/student/submissions", implemented: true },
  { label: "Literature", icon: icons.literature, to: "/student/literature", implemented: true },
  { label: "Gap Analysis", icon: icons.gapAnalysis, to: "/student/gap-analysis", implemented: true },
  { label: "Contribution Analysis", icon: icons.contributionAnalysis, to: "/student/contribution-analysis", implemented: true },
  { label: "Evidence Reports", icon: icons.evidenceReports, to: "/student/reports", implemented: true },
  { label: "Knowledge Graph", icon: icons.knowledgeGraph, to: "/student/knowledge-graph", implemented: true },
  { label: "Reasoning Workbench", icon: icons.sparkles, to: "/student/reasoning", implemented: true },
  { label: "Evidence Coverage", icon: icons.evidenceReports, to: "/student/evidence-coverage", implemented: true },
  { label: "Revision Comparison", icon: icons.revisionHistory, to: "/student/revision-comparison", implemented: true },
  { label: "Profile", icon: icons.profile, to: "/student/profile", implemented: true },
  { label: "Settings", icon: icons.settings, to: "/student/settings", implemented: true },
];

/* ---------------------------------------------------------
   Helper: Format dates cleanly
--------------------------------------------------------- */
function formatLastUpdated(dateStr) {
  if (!dateStr) return "Recently";
  if (dateStr.includes("ago") || dateStr.includes("Yesterday") || dateStr.includes("Today") || dateStr.includes("Just now")) {
    return dateStr;
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffHours = (now - d) / (1000 * 60 * 60);
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

/* ---------------------------------------------------------
   Status Badge Helper
--------------------------------------------------------- */
function AnalysisStatusBadge({ status }) {
  const styles = {
    "Gap Validated": "bg-emerald-500/10 text-emerald-700 border-emerald-300/60 ring-emerald-500/20",
    "In Analysis": "bg-indigo-500/10 text-indigo-700 border-indigo-300/60 ring-indigo-500/20",
    "Literature Synthesized": "bg-blue-500/10 text-blue-700 border-blue-300/60 ring-blue-500/20",
    "Analysis Complete": "bg-emerald-500/10 text-emerald-700 border-emerald-300/60 ring-emerald-500/20",
    "Evidence Verified": "bg-teal-500/10 text-teal-700 border-teal-300/60 ring-teal-500/20",
    "Review Pending": "bg-amber-500/10 text-amber-700 border-amber-300/60 ring-amber-500/20",
    Uploaded: "bg-emerald-500/10 text-emerald-700 border-emerald-300/60 ring-emerald-500/20",
    Draft: "bg-slate-500/10 text-slate-700 border-slate-300/60 ring-slate-500/20",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ring-1 ${
        styles[status] || "bg-slate-100 text-slate-700 border-slate-200 ring-slate-300"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightedProjectId = searchParams.get("highlight");

  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Research Projects state (backed by projectStorage)
  const [projects, setProjects] = useState(() => getResearchProjects());
  // Manuscripts state (backed by manuscriptStorage)
  const [manuscripts, setManuscripts] = useState(() => getManuscripts());

  // Project search & filtering
  const [projectSearch, setProjectSearch] = useState("");

  // Modals state
  const [startAnalysisModalOpen, setStartAnalysisModalOpen] = useState(false);
  const [phase2NoticeModal, setPhase2NoticeModal] = useState({ open: false, title: "", description: "" });
  const [selectedProjectDossier, setSelectedProjectDossier] = useState(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState("");

  // Selected project for Start Analysis modal
  const [selectedAnalysisProject, setSelectedAnalysisProject] = useState("");
  const [analysisMode, setAnalysisMode] = useState("Full Gap & Contribution Analysis");
  const [analysisTriggered, setAnalysisTriggered] = useState(false);

  // Sync projects, manuscripts, and check session flash notice
  useEffect(() => {
    const flash = sessionStorage.getItem("gapguard_flash_notice");
    if (flash) {
      setActionSuccessNotice(flash);
      sessionStorage.removeItem("gapguard_flash_notice");
    }
    setProjects(getResearchProjects());
    setManuscripts(getManuscripts());

    if (highlightedProjectId) {
      setTimeout(() => {
        const el = document.getElementById(`project-card-${highlightedProjectId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
    }
  }, [highlightedProjectId]);

  // Load existing dashboard data from backend gracefully
  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getStudentDashboard();
      if (response && response.success) {
        setDashboardData(response);
      }
    } catch (err) {
      console.warn("Backend dashboard metrics unavailable, presenting researcher local state:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const researcherInfo = useMemo(() => {
    const name = dashboardData?.student?.name || user?.name || "Researcher";
    const email = dashboardData?.student?.email || user?.email || "researcher@gapguard.ai";
    const initials = name
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "RS";

    return { name, email, initials };
  }, [dashboardData, user]);

  // Handle Start Analysis modal action
  const handleStartAnalysis = (e) => {
    e.preventDefault();
    setAnalysisTriggered(true);
    setTimeout(() => {
      setAnalysisTriggered(false);
      setStartAnalysisModalOpen(false);
      setActionSuccessNotice(
        `Analysis queued for "${selectedAnalysisProject || projects[0]?.title || "Research Project"}". (UI preview mode; full AI analysis engine will run in Phase 4).`
      );
      setTimeout(() => setActionSuccessNotice(""), 7000);
    }, 1200);
  };

  // Filter projects
  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const q = projectSearch.toLowerCase();
    return projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.domain.toLowerCase().includes(q) ||
        (p.status && p.status.toLowerCase().includes(q)) ||
        (p.claimedGap && p.claimedGap.toLowerCase().includes(q))
    );
  }, [projects, projectSearch]);

  // Map recent manuscripts from registered manuscriptStorage
  const recentResearchActivity = useMemo(() => {
    if (manuscripts.length > 0) {
      return manuscripts.slice(0, 5).map((m) => ({
        id: m.id,
        reportId: null,
        title: m.manuscriptTitle,
        version: m.version,
        domain: m.projectDomain || "Interdisciplinary AI",
        date: formatLastUpdated(m.uploadedAt),
        status: m.status || "Uploaded",
        fileName: m.fileName,
        fileSize: m.fileSize,
      }));
    }

    // Default sample manuscripts if none exist
    return [
      {
        id: "manu-01",
        reportId: null,
        title: "Disentangling Representational Shortcuts in Vision-Language Pretraining",
        version: "Version 1 — Initial Draft",
        domain: "Computer Vision & Healthcare AI",
        date: "Today, 11:45 AM",
        status: "Uploaded",
        fileName: "vision_lang_pretraining.pdf",
        fileSize: "2.4 MB",
      },
    ];
  }, [manuscripts]);

  // Manuscripts associated with the currently open dossier modal
  const dossierManuscripts = useMemo(() => {
    if (!selectedProjectDossier) return [];
    return manuscripts.filter((m) => m.projectId === selectedProjectDossier.id);
  }, [selectedProjectDossier, manuscripts]);

  // Handle clicking on future Phase 2 nav items
  const handleNavClick = (item) => {
    setSidebarOpen(false);
    if (!item.implemented) {
      setPhase2NoticeModal({
        open: true,
        title: item.label,
        description: `The "${item.label}" section is part of the forthcoming GapGuard AI literature retrieval & AI reasoning engine. This UI navigation link is established and will activate when the AI service is connected in Phase 4.`,
      });
    } else if (item.isAnchor) {
      const el = document.getElementById("research-projects-section");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

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
          {researcherInfo.initials}
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

      {/* ---------------- Sidebar ---------------- */}
      <aside
        className={`fixed z-50 inset-y-0 left-0 w-72 transform bg-[#0B1120] text-slate-200 px-5 py-6 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 lg:flex-shrink-0 border-r border-slate-800 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand identity header */}
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

        {/* Navigation list */}
        <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2">
          Research Workflow
        </div>
        <nav className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.label === "Dashboard";

            if (item.implemented && !item.isAnchor) {
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-900/30 font-semibold"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon({ className: `h-4.5 w-4.5 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400"}` })}
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleNavClick(item)}
                className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  {item.icon({ className: "h-4.5 w-4.5 flex-shrink-0 text-slate-400 group-hover:text-slate-200" })}
                  <span>{item.label}</span>
                </div>
                {item.tag && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-indigo-500/20">
                    {item.tag}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Researcher Profile / Logout Footer */}
        <div className="pt-4 border-t border-slate-800/80 mt-auto space-y-2">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 shadow-xs">
              {researcherInfo.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{researcherInfo.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{researcherInfo.email}</p>
            </div>
          </div>

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

      {/* ---------------- Main Content Area ---------------- */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4.5 shadow-xs sticky top-0 z-30">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Research Intelligence Dashboard</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-200">
                GapGuard AI
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Explainable research gap validation and contribution differentiation workbench
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/student/projects/create"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs"
            >
              {icons.plus({ className: "h-3.5 w-3.5" })}
              Create Research Project
            </Link>

            <Link
              to="/student/upload"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              {icons.upload({ className: "h-3.5 w-3.5 text-indigo-600" })}
              Upload Manuscript
            </Link>

            <div className="h-6 w-[1px] bg-slate-200 mx-1" />

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white text-xs font-semibold flex items-center justify-center shadow-xs">
                {researcherInfo.initials}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-900">{researcherInfo.name}</p>
                <p className="text-[11px] text-slate-500">Academic Researcher</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Action Success Toast/Banner */}
          {actionSuccessNotice && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3.5 text-xs text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2.5">
                {icons.checkCircle({ className: "h-5 w-5 text-emerald-600 flex-shrink-0" })}
                <span className="font-semibold">{actionSuccessNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionSuccessNotice("")}
                className="text-emerald-700 hover:text-emerald-950 p-1"
              >
                {icons.close({ className: "h-4 w-4" })}
              </button>
            </div>
          )}

          {/* ---------------- 1. WELCOME SECTION ---------------- */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-md border border-slate-800">
            <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
            <div className="absolute right-1/3 -bottom-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-200 backdrop-blur-xs border border-white/10 mb-3">
                  {icons.sparkles({ className: "h-3.5 w-3.5 text-indigo-300" })}
                  Explainable Research Gap Validation
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Welcome back, {researcherInfo.name.split(" ")[0]}!
                </h2>
                <p className="mt-2 text-base text-slate-200 leading-relaxed font-normal">
                  Validate your research gap. Compare your contribution with existing literature.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    {projects.length} Active Research Projects
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
                    <span className="h-2 w-2 rounded-full bg-indigo-400" />
                    {manuscripts.length} Manuscript Revisions Tracked
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
                    <span className="h-2 w-2 rounded-full bg-teal-400" />
                    Corpus Synthesis Ready
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-3 flex-shrink-0">
                <Link
                  to="/student/projects/create"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-950/40 transition hover:translate-y-[-1px]"
                >
                  {icons.plus({ className: "h-4 w-4" })}
                  Create Research Project
                </Link>
                <Link
                  to="/student/upload"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-4 py-3 text-sm font-semibold text-white border border-white/15 transition hover:translate-y-[-1px]"
                >
                  {icons.upload({ className: "h-4 w-4" })}
                  Upload Manuscript
                </Link>
              </div>
            </div>
          </section>

          {/* ---------------- 3. QUICK ACTIONS ---------------- */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Quick Action 1: Create Research Project */}
              <Link
                to="/student/projects/create"
                className="group text-left rounded-2xl border border-slate-200 bg-white p-5 hover:border-indigo-500 hover:shadow-md transition-all shadow-xs block"
              >
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                    {icons.plus({ className: "h-5 w-5" })}
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                    Start {icons.arrowRight({ className: "h-3.5 w-3.5" })}
                  </span>
                </div>
                <h4 className="mt-3.5 text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                  Create Research Project
                </h4>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Establish a new research study with problem, gap, and contribution definitions.
                </p>
              </Link>

              {/* Quick Action 2: Upload Manuscript */}
              <Link
                to="/student/upload"
                className="group text-left rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-500 hover:shadow-md transition-all shadow-xs block"
              >
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                    {icons.upload({ className: "h-5 w-5" })}
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                    Upload {icons.arrowRight({ className: "h-3.5 w-3.5" })}
                  </span>
                </div>
                <h4 className="mt-3.5 text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition">
                  Upload Manuscript
                </h4>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Attach a draft manuscript (.pdf, .docx, .txt) to a research project.
                </p>
              </Link>

              {/* Quick Action 3: Start Analysis */}
              <button
                type="button"
                onClick={() => setStartAnalysisModalOpen(true)}
                className="group text-left rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-500 hover:shadow-md transition-all shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                    {icons.sparkles({ className: "h-5 w-5" })}
                  </div>
                  <span className="text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                    Analyze {icons.arrowRight({ className: "h-3.5 w-3.5" })}
                  </span>
                </div>
                <h4 className="mt-3.5 text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                  Start Analysis
                </h4>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Queue literature synthesis and contribution validation workflows.
                </p>
              </button>

              {/* Quick Action 4: View Reports */}
              <Link
                to="/student/reports"
                className="group text-left rounded-2xl border border-slate-200 bg-white p-5 hover:border-purple-500 hover:shadow-md transition-all shadow-xs block"
              >
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition">
                    {icons.evidenceReports({ className: "h-5 w-5" })}
                  </div>
                  <span className="text-xs font-semibold text-purple-600 opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                    Reports {icons.arrowRight({ className: "h-3.5 w-3.5" })}
                  </span>
                </div>
                <h4 className="mt-3.5 text-sm font-bold text-slate-900 group-hover:text-purple-600 transition">
                  View Reports
                </h4>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Inspect detailed literature evidence dossiers and differentiation matrices.
                </p>
              </Link>
            </div>
          </section>

          {/* ---------------- 4. ANALYSIS OVERVIEW (UI PLACEHOLDERS) ---------------- */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">Analysis Overview</h3>
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                    UI Preview Placeholder
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Core metric indicators configured for the upcoming explainable AI analysis pipeline.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80">
                {icons.info({ className: "h-4 w-4 text-slate-400 flex-shrink-0" })}
                <span>Simulated benchmark metrics • Real AI inference runs in Phase 4</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Card 1: Gap Validation */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4.5 hover:bg-white hover:border-indigo-300 transition-all shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Gap Validation</span>
                  <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600">
                    {icons.gapAnalysis({ className: "h-4 w-4" })}
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">84.6%</span>
                  <span className="text-xs font-semibold text-emerald-600">High Confidence</span>
                </div>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Identifies under-explored problem formulations across indexed research corpora.
                </p>
                <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Engine: Graph-Reasoner</span>
                  <span className="font-semibold text-indigo-600">UI Preview</span>
                </div>
              </div>

              {/* Card 2: Literature Evidence */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4.5 hover:bg-white hover:border-blue-300 transition-all shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Literature Evidence</span>
                  <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600">
                    {icons.literature({ className: "h-4 w-4" })}
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">142</span>
                  <span className="text-xs font-medium text-slate-500">Papers Synthesized</span>
                </div>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Semantic proximity to top-tier proceedings (NeurIPS, ACL, IEEE, ACM).
                </p>
                <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Retrieval: Semantic Scholar</span>
                  <span className="font-semibold text-blue-600">UI Preview</span>
                </div>
              </div>

              {/* Card 3: Contribution Differentiation */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4.5 hover:bg-white hover:border-emerald-300 transition-all shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Contribution Differentiation</span>
                  <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
                    {icons.contributionAnalysis({ className: "h-4 w-4" })}
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">0.79</span>
                  <span className="text-xs font-semibold text-emerald-600">Novelty Index</span>
                </div>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Quantifies distinction in methodology, datasets, and claims from baseline papers.
                </p>
                <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Methodology Variance: High</span>
                  <span className="font-semibold text-emerald-600">UI Preview</span>
                </div>
              </div>

              {/* Card 4: Citation Coverage */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4.5 hover:bg-white hover:border-purple-300 transition-all shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Citation Coverage</span>
                  <div className="rounded-lg bg-purple-50 p-1.5 text-purple-600">
                    {icons.knowledgeGraph({ className: "h-4 w-4" })}
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">96.4%</span>
                  <span className="text-xs font-semibold text-purple-600">Verified</span>
                </div>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Validates direct citations and flags missing seminal references in your problem space.
                </p>
                <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Seminal Graph: Active</span>
                  <span className="font-semibold text-purple-600">UI Preview</span>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------- 2. RESEARCH PROJECTS SECTION ---------------- */}
          <section id="research-projects-section" className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">Research Projects</h3>
                  <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-xs font-semibold">
                    {filteredProjects.length}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Organize your research studies, problem formulations, and manuscript versions.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search input */}
                <div className="relative">
                  {icons.search({ className: "h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" })}
                  <input
                    type="text"
                    placeholder="Search projects or domains..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="w-48 sm:w-60 pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                  {projectSearch && (
                    <button
                      type="button"
                      onClick={() => setProjectSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {icons.close({ className: "h-3 w-3" })}
                    </button>
                  )}
                </div>

                {/* Create Research Project Button */}
                <Link
                  to="/student/projects/create"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs whitespace-nowrap"
                >
                  {icons.plus({ className: "h-3.5 w-3.5" })}
                  Create Research Project
                </Link>
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  {icons.projects({ className: "h-6 w-6" })}
                </div>
                <h4 className="text-sm font-bold text-slate-900">No research projects found</h4>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  {projectSearch
                    ? `No project titles or domains matched "${projectSearch}".`
                    : "Initialize your first research project to track literature evidence and gap validation."}
                </p>
                <Link
                  to="/student/projects/create"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs"
                >
                  {icons.plus({ className: "h-3.5 w-3.5" })}
                  Create Research Project
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredProjects.map((project) => {
                  const isHighlighted = project.id === highlightedProjectId;
                  const projManuscripts = manuscripts.filter((m) => m.projectId === project.id);
                  const latestManuscript = projManuscripts[0]; // sorted by uploadedAt descending

                  return (
                    <div
                      key={project.id}
                      id={`project-card-${project.id}`}
                      className={`p-5 sm:px-6 transition-colors flex flex-col md:flex-row md:items-start md:justify-between gap-4 ${
                        isHighlighted
                          ? "bg-indigo-50/70 border-l-4 border-indigo-600"
                          : "hover:bg-slate-50/70"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md">
                            {project.domain}
                          </span>
                          <AnalysisStatusBadge status={project.status || "Draft"} />
                          {isHighlighted && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md animate-pulse">
                              Newly Created Project
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            Last updated: {formatLastUpdated(project.updatedAt || project.createdAt)}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 hover:text-indigo-600 transition">
                          {project.title}
                        </h4>
                        {project.claimedGap && (
                          <p className="mt-1 text-xs text-slate-600 line-clamp-1">
                            <span className="font-semibold text-amber-900">Claimed Research Gap:</span>{" "}
                            {project.claimedGap}
                          </p>
                        )}

                        {/* Manuscripts metadata indicator for this project */}
                        <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-[11px]">
                          <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                            {icons.manuscripts({ className: "h-3 w-3 text-indigo-600" })}
                            {projManuscripts.length}{" "}
                            {projManuscripts.length === 1 ? "Manuscript Version" : "Manuscript Versions"}
                          </span>
                          {latestManuscript ? (
                            <>
                              <span className="text-slate-600">
                                Latest: <strong className="text-slate-800">{latestManuscript.version}</strong> (
                                {latestManuscript.fileName})
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-400">
                                Uploaded: {formatLastUpdated(latestManuscript.uploadedAt)}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400 italic">No manuscript version uploaded yet</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                        {/* View Dossier Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedProjectDossier(project)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                        >
                          {icons.eye({ className: "h-3.5 w-3.5 text-slate-500" })}
                          View Dossier
                        </button>

                        {/* Upload Manuscript Button (with projectId preselected) */}
                        <Link
                          to={`/student/upload?projectId=${project.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 text-indigo-700 px-3 py-1.5 text-xs font-semibold hover:bg-indigo-100 transition shadow-2xs"
                        >
                          {icons.upload({ className: "h-3.5 w-3.5 text-indigo-600" })}
                          Upload Manuscript
                        </Link>

                        {/* Run Analysis Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAnalysisProject(project.title);
                            setStartAnalysisModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-indigo-700 transition shadow-2xs"
                        >
                          {icons.sparkles({ className: "h-3.5 w-3.5" })}
                          Run Analysis
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ---------------- 5. RECENT RESEARCH ACTIVITY ---------------- */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Research Activity</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recent manuscript draft uploads, project registrations, and version iterations.
                </p>
              </div>
              <Link
                to="/student/submissions"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1"
              >
                View all manuscripts
                {icons.arrowRight({ className: "h-3.5 w-3.5" })}
              </Link>
            </div>

            {recentResearchActivity.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  {icons.manuscripts({ className: "h-6 w-6" })}
                </div>
                <h4 className="text-sm font-bold text-slate-900">No manuscript activity recorded</h4>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Upload a research manuscript to stage documents for literature retrieval and gap validation.
                </p>
                <Link
                  to="/student/upload"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs"
                >
                  {icons.upload({ className: "h-3.5 w-3.5" })}
                  Upload First Manuscript
                </Link>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-200 bg-slate-50/60">
                        <th className="px-6 py-3 font-semibold">Manuscript Title</th>
                        <th className="px-4 py-3 font-semibold">Draft Version</th>
                        <th className="px-4 py-3 font-semibold">Associated Domain</th>
                        <th className="px-4 py-3 font-semibold">Upload Date</th>
                        <th className="px-4 py-3 font-semibold">Document File</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-6 py-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentResearchActivity.map((activity) => (
                        <tr key={activity.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900 max-w-sm truncate">
                              {activity.title}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">ID: {activity.id}</span>
                          </td>
                          <td className="px-4 py-4 font-semibold text-indigo-700">
                            {activity.version || "Version 1"}
                          </td>
                          <td className="px-4 py-4 text-slate-600 font-medium">
                            {activity.domain}
                          </td>
                          <td className="px-4 py-4 text-slate-500 whitespace-nowrap">
                            {activity.date}
                          </td>
                          <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                            {activity.fileName ? `${activity.fileName} (${activity.fileSize})` : "Staged Document"}
                          </td>
                          <td className="px-4 py-4">
                            <AnalysisStatusBadge status={activity.status} />
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <Link
                              to="/student/upload"
                              className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 transition"
                            >
                              New Version
                              {icons.arrowRight({ className: "h-3 w-3" })}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {recentResearchActivity.map((activity) => (
                    <div key={activity.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">{activity.title}</h4>
                        <AnalysisStatusBadge status={activity.status} />
                      </div>
                      <p className="text-[11px] text-indigo-700 font-semibold">{activity.version}</p>
                      <p className="text-[11px] text-slate-500">{activity.domain}</p>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                        <span className="text-slate-400">{activity.date}</span>
                        <Link
                          to="/student/upload"
                          className="font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          New Version →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* ---------------- Academic Rigor Note ---------------- */}
          <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4.5 flex items-start gap-3.5 shadow-2xs">
            <div className="text-indigo-600 flex-shrink-0 mt-0.5">
              {icons.info({ className: "h-5 w-5" })}
            </div>
            <div className="text-xs text-indigo-950 leading-relaxed">
              <span className="font-bold">Explainable AI Architecture Notice:</span> GapGuard AI evaluates
              unaddressed problem spaces and validates contribution differentiation by cross-referencing semantic
              corpora. All evidence citations and novelty indices are traceable to peer-reviewed literature.
            </div>
          </section>
        </main>
      </div>

      {/* ---------------- RESEARCH PROJECT DOSSIER MODAL ---------------- */}
      {selectedProjectDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                    {selectedProjectDossier.domain}
                  </span>
                  <AnalysisStatusBadge status={selectedProjectDossier.status || "Draft"} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{selectedProjectDossier.title}</h3>
                <p className="text-[11px] text-slate-400">
                  Project ID: <span className="font-mono">{selectedProjectDossier.id}</span> • Created:{" "}
                  {formatLastUpdated(selectedProjectDossier.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProjectDossier(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                {icons.close({ className: "h-5 w-5" })}
              </button>
            </div>

            {/* Dossier Fields */}
            <div className="space-y-4 text-xs">
              {/* Research Problem */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                  Research Problem
                </h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedProjectDossier.researchProblem || "No problem statement recorded."}
                </p>
              </div>

              {/* Research Objective */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                  Research Objective
                </h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedProjectDossier.researchObjective || "No objective recorded."}
                </p>
              </div>

              {/* Research Question */}
              {selectedProjectDossier.researchQuestion && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                    Research Question
                  </h4>
                  <p className="text-slate-700 leading-relaxed italic whitespace-pre-wrap">
                    "{selectedProjectDossier.researchQuestion}"
                  </p>
                </div>
              )}

              {/* Claimed Research Gap (Highlighted) */}
              <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-amber-950 uppercase tracking-wider text-[11px]">
                    Claimed Research Gap
                  </h4>
                  <span className="text-[10px] font-bold text-amber-900 uppercase bg-amber-200/80 px-2 py-0.5 rounded">
                    Central Hypothesis
                  </span>
                </div>
                <p className="text-amber-950 leading-relaxed font-medium whitespace-pre-wrap">
                  {selectedProjectDossier.claimedGap || "No claimed research gap recorded."}
                </p>
              </div>

              {/* Proposed Method */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                  Proposed Method
                </h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedProjectDossier.proposedMethod || "No method specified."}
                </p>
              </div>

              {/* Dataset / Context */}
              {selectedProjectDossier.datasetContext && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                    Dataset / Application Context
                  </h4>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedProjectDossier.datasetContext}
                  </p>
                </div>
              )}

              {/* Expected Contribution */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <h4 className="font-bold text-emerald-950 uppercase tracking-wider text-[11px] mb-1">
                  Expected Contribution
                </h4>
                <p className="text-emerald-950 leading-relaxed font-medium whitespace-pre-wrap">
                  {selectedProjectDossier.expectedContribution || "No contribution specified."}
                </p>
              </div>

              {/* Evaluation Metrics */}
              {selectedProjectDossier.evaluationMetrics && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                    Expected Evaluation Metrics
                  </h4>
                  <p className="text-slate-700 leading-relaxed font-mono">
                    {selectedProjectDossier.evaluationMetrics}
                  </p>
                </div>
              )}

              {/* Registered Manuscript Versions & Revisions */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Registered Manuscripts ({dossierManuscripts.length})
                    </h4>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded">
                      Version Evolution
                    </span>
                  </div>
                  <Link
                    to={`/student/upload?projectId=${selectedProjectDossier.id}`}
                    onClick={() => setSelectedProjectDossier(null)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    {icons.upload({ className: "h-3 w-3" })}
                    Upload New Version
                  </Link>
                </div>

                {dossierManuscripts.length === 0 ? (
                  <div className="text-center py-4 bg-white/70 rounded-lg border border-slate-200/60">
                    <p className="text-slate-500 text-xs">No manuscript versions registered for this project yet.</p>
                    <Link
                      to={`/student/upload?projectId=${selectedProjectDossier.id}`}
                      onClick={() => setSelectedProjectDossier(null)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Upload First Manuscript Draft →
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200/60 bg-white/80 rounded-xl border border-slate-200/60 overflow-hidden">
                    {dossierManuscripts.map((manu) => (
                      <div key={manu.id} className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{manu.version}</span>
                            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.2 rounded">
                              {manu.fileType}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px] truncate mt-0.5">
                            {manu.fileName} • {manu.fileSize}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            {manu.status}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">{formatLastUpdated(manu.uploadedAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dossier Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedProjectDossier(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Close Dossier
              </button>

              <div className="flex items-center gap-2">
                <Link
                  to={`/student/upload?projectId=${selectedProjectDossier.id}`}
                  onClick={() => setSelectedProjectDossier(null)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                >
                  {icons.upload({ className: "h-3.5 w-3.5 text-indigo-600" })}
                  Upload Manuscript
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedAnalysisProject(selectedProjectDossier.title);
                    setSelectedProjectDossier(null);
                    setStartAnalysisModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition"
                >
                  {icons.sparkles({ className: "h-3.5 w-3.5" })}
                  Start Gap Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- START ANALYSIS MODAL ---------------- */}
      {startAnalysisModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  {icons.sparkles({ className: "h-5 w-5" })}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Start Research Analysis</h3>
                  <p className="text-xs text-slate-500">Configure gap validation &amp; contribution check</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStartAnalysisModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                {icons.close({ className: "h-5 w-5" })}
              </button>
            </div>

            <form onSubmit={handleStartAnalysis} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Target Research Project
                </label>
                <select
                  value={selectedAnalysisProject || projects[0]?.title}
                  onChange={(e) => setSelectedAnalysisProject(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition bg-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.title}>
                      {p.title} ({p.domain})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Analysis Pipeline Mode
                </label>
                <select
                  value={analysisMode}
                  onChange={(e) => setAnalysisMode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition bg-white"
                >
                  <option value="Full Gap & Contribution Analysis">
                    Full Pipeline: Research Gap Validation &amp; Contribution Differentiation
                  </option>
                  <option value="Literature Synthesis Only">Literature Synthesis &amp; Citation Retrieval Only</option>
                  <option value="Claim Differentiation Audit">Contribution Claims vs SOTA Baselines</option>
                </select>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-950 flex items-start gap-2.5">
                {icons.info({ className: "h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" })}
                <div>
                  <span className="font-bold">Phase 1 Preview Mode:</span> Triggering this queues the research project
                  parameters. Real AI retrieval models (Crossref, Semantic Scholar, LLM reasoning) will execute in Phase 4.
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStartAnalysisModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={analysisTriggered}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition disabled:opacity-70"
                >
                  {analysisTriggered ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Queueing Pipeline...
                    </>
                  ) : (
                    <>
                      {icons.sparkles({ className: "h-3.5 w-3.5" })}
                      Queue Analysis
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- PHASE 2 PREVIEW NOTICE MODAL ---------------- */}
      {phase2NoticeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                {icons.sparkles({ className: "h-5 w-5" })}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Upcoming Module
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{phase2NoticeModal.title}</h3>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-600 leading-relaxed">
              {phase2NoticeModal.description}
            </p>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setPhase2NoticeModal({ open: false, title: "", description: "" })}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}