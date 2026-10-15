import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* ---------------------------------------------------------
   GapGuard AI — Professional SVG Icons for Professor Sidebar
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
  submissions: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1.5-1.5Z" strokeLinejoin="round" />
      <path d="M14 3.5V8h4" strokeLinejoin="round" />
      <path d="M9 13h6M9 16.5h6" strokeLinecap="round" />
    </svg>
  ),
  reports: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 19V5a1.5 1.5 0 0 1 1.5-1.5h9L20 8v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19Z" strokeLinejoin="round" />
      <path d="M8.5 12.5l2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  courses: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 6.5 12 3l8 3.5-8 3.5-8-3.5Z" strokeLinejoin="round" />
      <path d="M6.5 9.8V15c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3V9.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 7.5V14" strokeLinecap="round" />
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

export const PROFESSOR_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", to: "/professor/dashboard", icon: icons.dashboard },
  { id: "submissions", label: "Review Submissions", to: "/professor/submissions", icon: icons.submissions },
  { id: "reports", label: "Plagiarism Reports", to: "/professor/reports", icon: icons.reports },
  { id: "courses", label: "Courses & Research Areas", to: "/professor/courses", icon: icons.courses },
];

export default function ProfessorSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const professorInfo = useMemo(() => {
    const name = user?.name || user?.full_name || "Faculty Reviewer";
    const email = user?.email || "professor@university.edu";
    const initials = name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "PR";
    return { name, email, initials };
  }, [user]);

  const activeItemId = useMemo(() => {
    const { pathname } = location;

    if (pathname === "/professor/dashboard") {
      return "dashboard";
    }
    if (pathname.startsWith("/professor/submissions")) {
      return "submissions";
    }
    if (pathname.startsWith("/professor/reports")) {
      return "reports";
    }
    if (pathname.startsWith("/professor/courses")) {
      return "courses";
    }
    if (pathname.startsWith("/professor/profile")) {
      return "profile";
    }
    if (pathname.startsWith("/professor/settings")) {
      return "settings";
    }
    return "";
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      }
      navigate("/login", { replace: true });
    } catch {
      navigate("/login", { replace: true });
    }
  };

  return (
    <aside
      id="professor-sidebar"
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0B1120] border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between">
        <Link
          to="/professor/dashboard"
          className="flex items-center gap-2.5 focus:outline-none group"
          onClick={() => onClose && onClose()}
        >
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 shadow-sm group-hover:shadow-md transition-shadow">
            <div className="w-full h-full bg-[#0B1120] rounded-[6px] flex items-center justify-center text-emerald-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-white tracking-tight">AI Academic Integrity</div>
            <div className="text-[10px] text-emerald-400 font-medium tracking-wide uppercase">Professor Portal</div>
          </div>
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 lg:hidden transition-colors"
          aria-label="Close navigation menu"
        >
          {icons.close({ className: "h-5 w-5" })}
        </button>
      </div>

      {/* Primary Navigation Section */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Faculty Management
        </div>

        {PROFESSOR_NAV_ITEMS.map((item) => {
          const isActive = activeItemId === item.id;
          return (
            <Link
              key={item.id}
              to={item.to}
              onClick={() => onClose && onClose()}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30 shadow-xs"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "text-slate-400 group-hover:text-slate-200"
                }`}
              >
                {item.icon({ className: "h-4 w-4" })}
              </div>
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm" />
              )}
            </Link>
          );
        })}

        <div className="pt-4 px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Account & Preferences
        </div>

        <Link
          to="/professor/profile"
          onClick={() => onClose && onClose()}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
            activeItemId === "profile"
              ? "bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30"
              : "text-slate-300 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              activeItemId === "profile"
                ? "bg-emerald-500/20 text-emerald-300"
                : "text-slate-400 group-hover:text-slate-200"
            }`}
          >
            {icons.profile({ className: "h-4 w-4" })}
          </div>
          <span className="truncate">Faculty Profile</span>
        </Link>

        <Link
          to="/professor/settings"
          onClick={() => onClose && onClose()}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
            activeItemId === "settings"
              ? "bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30"
              : "text-slate-300 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              activeItemId === "settings"
                ? "bg-emerald-500/20 text-emerald-300"
                : "text-slate-400 group-hover:text-slate-200"
            }`}
          >
            {icons.settings({ className: "h-4 w-4" })}
          </div>
          <span className="truncate">System Settings</span>
        </Link>
      </div>

      {/* Professor Profile Badge & Logout Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-[#090D1A]">
        <div className="px-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
              {professorInfo.initials}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate leading-tight">
                {professorInfo.name}
              </div>
              <div className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                {professorInfo.email}
              </div>
            </div>
          </div>
          <span className="shrink-0 ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
            Faculty
          </span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600/80 border border-rose-500/20 hover:border-transparent transition-all shadow-xs cursor-pointer"
        >
          {icons.logout({ className: "h-3.5 w-3.5" })}
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
