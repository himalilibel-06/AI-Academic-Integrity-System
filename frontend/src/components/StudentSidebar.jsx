import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* ---------------------------------------------------------
   GapGuard AI — Academic SVG Icons for Unified Student Sidebar
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
      <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" strokeLinejoin="round" />
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
  sparkles: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 3l1.9 4.8L18.7 9.7l-4.8 1.9L12 16.5l-1.9-4.9-4.9-1.9 4.9-1.9L12 3z" strokeLinejoin="round" />
      <path d="M19 16l.9 2.2 2.1.9-2.1.9-.9 2.1-.9-2.1-2.2-.9 2.2-.9.9-2.2z" strokeLinejoin="round" />
    </svg>
  ),
  target: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  revisionHistory: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3v5h5M12 7v5l4 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  feedback: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinejoin="round" />
      <path d="M8 9h8M8 13h5" strokeLinecap="round" />
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
  close: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  ),
};

/* ---------------------------------------------------------
   Canonical 15-Item GapGuard Student Navigation Structure
--------------------------------------------------------- */
export const STUDENT_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", to: "/student/dashboard", icon: icons.dashboard },
  { id: "projects", label: "Research Projects", to: "/student/dashboard#projects", icon: icons.projects, isAnchor: true },
  { id: "manuscripts", label: "Manuscripts", to: "/student/submissions", icon: icons.manuscripts },
  { id: "literature", label: "Literature", to: "/student/literature", icon: icons.literature },
  { id: "gapAnalysis", label: "Gap Analysis", to: "/student/gap-analysis", icon: icons.gapAnalysis },
  { id: "contributionAnalysis", label: "Contribution Analysis", to: "/student/contribution-analysis", icon: icons.contributionAnalysis },
  { id: "reports", label: "Evidence Reports", to: "/student/reports", icon: icons.evidenceReports },
  { id: "knowledgeGraph", label: "Knowledge Graph", to: "/student/knowledge-graph", icon: icons.knowledgeGraph },
  { id: "reasoning", label: "Reasoning Workbench", to: "/student/reasoning", icon: icons.sparkles },
  { id: "coverage", label: "Evidence Coverage", to: "/student/evidence-coverage", icon: icons.target },
  { id: "revision", label: "Revision Comparison", to: "/student/revision-comparison", icon: icons.revisionHistory },
  { id: "readiness", label: "Submission Readiness", to: "/student/submission-readiness", icon: icons.check },
  { id: "feedback", label: "Faculty Feedback", to: "/student/faculty-feedback", icon: icons.feedback },
  { id: "profile", label: "Profile", to: "/student/profile", icon: icons.profile },
  { id: "settings", label: "Settings", to: "/student/settings", icon: icons.settings },
];

export default function StudentSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const researcherInfo = useMemo(() => {
    const name = user?.name || user?.full_name || "Research Student";
    const email = user?.email || "student@university.edu";
    const initials = name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "RS";
    return { name, email, initials };
  }, [user]);

  // Determine active item id based on current path and hash
  const activeItemId = useMemo(() => {
    const { pathname, hash } = location;

    if (pathname === "/student/dashboard" || pathname === "/dashboard") {
      if (hash === "#projects" || hash === "#research-projects-section") {
        return "projects";
      }
      return "dashboard";
    }

    if (
      pathname === "/student/projects" ||
      pathname === "/research-projects" ||
      pathname === "/student/projects/create"
    ) {
      return "projects";
    }

    if (
      pathname === "/student/submissions" ||
      pathname === "/student/upload" ||
      pathname === "/student/manuscripts" ||
      pathname === "/manuscripts"
    ) {
      return "manuscripts";
    }

    if (pathname.startsWith("/student/literature") || pathname === "/literature") {
      return "literature";
    }

    if (pathname.startsWith("/student/gap-analysis") || pathname === "/gap-analysis") {
      return "gapAnalysis";
    }

    if (pathname.startsWith("/student/contribution-analysis") || pathname === "/contribution-analysis") {
      return "contributionAnalysis";
    }

    if (pathname.startsWith("/student/reports")) {
      return "reports";
    }

    if (pathname.startsWith("/student/knowledge-graph") || pathname === "/knowledge-graph") {
      return "knowledgeGraph";
    }

    if (pathname.startsWith("/student/reasoning") || pathname === "/reasoning") {
      return "reasoning";
    }

    if (pathname.startsWith("/student/evidence-coverage") || pathname === "/evidence-coverage") {
      return "coverage";
    }

    if (pathname.startsWith("/student/revision-comparison") || pathname === "/revision-comparison") {
      return "revision";
    }

    if (pathname.startsWith("/student/submission-readiness") || pathname === "/submission-readiness") {
      return "readiness";
    }

    if (
      pathname.startsWith("/student/faculty-feedback") ||
      pathname.startsWith("/student/revision-history") ||
      pathname === "/faculty-feedback"
    ) {
      return "feedback";
    }

    if (pathname.startsWith("/student/profile")) {
      return "profile";
    }

    if (pathname.startsWith("/student/settings")) {
      return "settings";
    }

    return "dashboard";
  }, [location.pathname, location.hash]);

  const handleItemClick = (item) => {
    if (onClose) onClose();

    if (item.id === "projects") {
      if (location.pathname === "/student/dashboard") {
        const el =
          document.getElementById("research-projects-section") ||
          document.getElementById("projects");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          window.location.hash = "#projects";
        }
      } else {
        navigate("/student/dashboard#projects");
      }
    }
  };

  return (
    <aside
      className={`fixed z-50 inset-y-0 left-0 w-72 transform bg-[#0B1120] text-slate-200 px-5 py-6 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 lg:flex-shrink-0 border-r border-slate-800 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Brand identity header */}
      <div className="flex items-center justify-between pb-5 border-b border-slate-800/80">
        <Link
          to="/student/dashboard"
          onClick={() => onClose && onClose()}
          className="flex items-center gap-3 group text-left"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-emerald-400 p-0.5 shadow-md shadow-indigo-950/50">
            <div className="w-full h-full bg-[#0B1120] rounded-[10px] flex items-center justify-center text-indigo-400 group-hover:text-emerald-400 transition-colors">
              {icons.sparkles({ className: "h-5 w-5" })}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-white group-hover:text-slate-100 transition-colors">
                GapGuard
              </span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Research Gap Intelligence</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => onClose && onClose()}
          aria-label="Close navigation menu"
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 lg:hidden"
        >
          {icons.close({ className: "h-5 w-5" })}
        </button>
      </div>

      {/* Navigation section label */}
      <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2">
        Research Workflow
      </div>

      {/* Navigation list */}
      <nav className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1">
        {STUDENT_NAV_ITEMS.map((item) => {
          const isActive = activeItemId === item.id;

          if (item.isAnchor) {
            return (
              <button
                key={item.id}
                id={`student-nav-${item.id}`}
                data-nav-id={item.id}
                data-active={isActive ? "true" : "false"}
                type="button"
                onClick={() => handleItemClick(item)}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-900/30 font-semibold"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  {typeof item.icon === "function" &&
                    item.icon({
                      className: `h-4.5 w-4.5 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400"}`
                    })}
                  <span>{item.label}</span>
                </div>
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              id={`student-nav-${item.id}`}
              data-nav-id={item.id}
              data-active={isActive ? "true" : "false"}
              to={item.to}
              onClick={() => onClose && onClose()}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-900/30 font-semibold"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                {typeof item.icon === "function" &&
                  item.icon({
                    className: `h-4.5 w-4.5 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400"}`
                  })}
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Researcher Profile / Logout Footer */}
      <div className="pt-4 border-t border-slate-800/80 mt-auto space-y-2">
        <Link
          to="/student/profile"
          onClick={() => onClose && onClose()}
          className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/70 transition-all text-left"
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 shadow-xs">
            {researcherInfo.initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{researcherInfo.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{researcherInfo.email}</p>
          </div>
        </Link>

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
  );
}
