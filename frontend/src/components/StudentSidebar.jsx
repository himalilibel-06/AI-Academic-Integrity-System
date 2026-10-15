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
  upload: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  researchAreas: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
      <path d="M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" strokeLinecap="round" />
    </svg>
  ),
};

/* ---------------------------------------------------------
   Core GapGuard AI Document Similarity Checker Navigation
--------------------------------------------------------- */
export const STUDENT_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", to: "/student/dashboard", icon: icons.dashboard },
  { id: "checkDocument", label: "Check Similarity", to: "/student/upload", icon: icons.upload },
  { id: "myDocuments", label: "My Analyses", to: "/student/submissions", icon: icons.manuscripts },
  { id: "reports", label: "Similarity Reports", to: "/student/reports", icon: icons.evidenceReports },
  { id: "referenceSources", label: "My References", to: "/student/literature", icon: icons.literature },
  { id: "settings", label: "Settings", to: "/student/settings", icon: icons.settings },
  { id: "profileInfo", label: "Profile Info", to: "/student/profile", icon: icons.profile },
];

export default function StudentSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const researcherInfo = useMemo(() => {
    const name = user?.name || user?.full_name || "Research Student";
    const email = user?.email || "student@university.edu";
    const firstLetter = (name.trim().charAt(0) || "U").toUpperCase();
    return { name, email, firstLetter };
  }, [user]);

  // Determine active item id based on current path
  const activeItemId = useMemo(() => {
    const { pathname } = location;

    if (pathname === "/student/dashboard" || pathname === "/dashboard") {
      return "dashboard";
    }

    if (pathname.startsWith("/student/upload")) {
      return "checkDocument";
    }

    if (
      pathname.startsWith("/student/submissions") ||
      pathname === "/student/manuscripts" ||
      pathname === "/manuscripts"
    ) {
      return "myDocuments";
    }

    if (pathname.startsWith("/student/reports")) {
      return "reports";
    }

    if (pathname.startsWith("/student/literature") || pathname === "/literature") {
      return "referenceSources";
    }

    if (pathname.startsWith("/student/settings") || pathname === "/settings") {
      return "settings";
    }

    if (pathname.startsWith("/student/profile") || pathname === "/profile") {
      return "profileInfo";
    }

    return "";
  }, [location.pathname]);

  const handleItemClick = (item) => {
    if (onClose) onClose();
  };

  const handleLogout = () => {
    if (onClose) onClose();
    logout();
  };

  return (
    <aside
      className={`fixed z-50 inset-y-0 left-0 w-72 h-screen max-h-screen transform bg-[#0B1120] text-slate-200 px-5 py-6 flex flex-col transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0 lg:flex-shrink-0 border-r border-slate-800 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Brand identity header */}
      <div className="flex items-center justify-between pb-5 border-b border-slate-800/80 flex-shrink-0">
        <Link
          to="/student/dashboard"
          onClick={() => onClose && onClose()}
          className="flex items-center gap-3 group text-left"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5 shadow-md shadow-blue-950/50">
            <div className="w-full h-full bg-[#0B1120] rounded-[10px] flex items-center justify-center text-blue-400 group-hover:text-blue-300 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-white group-hover:text-slate-100 transition-colors">
                Plagiarism Detector
              </span>
            </div>
            <p className="text-[11px] text-blue-300/80 font-medium">Academic Integrity System</p>
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
      <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 flex-shrink-0">
        Student Navigation
      </div>

      {/* Navigation list */}
      <nav className="mt-2 flex-1 min-h-0 space-y-1 overflow-y-auto pr-1">
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
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-900/40 font-semibold"
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
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-900/40 font-semibold"
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

      {/* Bottom User Section */}
      <div className="pt-4 border-t border-slate-800/80 mt-auto flex-shrink-0 space-y-2">
        {/* User Profile Card */}
        <Link
          to="/student/profile"
          id="student-bottom-profile-card"
          onClick={() => onClose && onClose()}
          className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-colors text-left group"
        >
          <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
            {researcherInfo.firstLetter}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
              {researcherInfo.name}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {researcherInfo.email}
            </p>
          </div>
        </Link>

        {/* Sign Out Button */}
        <button
          type="button"
          id="student-sign-out"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors text-left group"
        >
          {icons.logout({ className: "h-4.5 w-4.5 flex-shrink-0 text-slate-400 group-hover:text-white transition-colors" })}
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
