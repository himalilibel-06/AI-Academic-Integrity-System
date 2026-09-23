import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getManuscripts, deleteManuscript } from "../service/manuscriptStorage";
import { getResearchProjects } from "../service/projectStorage";

/* ---------------------------------------------------------
   GapGuard AI — Academic SVG Icons
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
  sparkles: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 3l1.9 4.8L18.7 9.7l-4.8 1.9L12 16.5l-1.9-4.9-4.9-1.9 4.9-1.9L12 3z" strokeLinejoin="round" />
    </svg>
  ),
  search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  fileDoc: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

function formatLastUpdated(dateStr) {
  if (!dateStr) return "Recently";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function MySubmissions() {
  const { user, logout } = useAuth();

  const [manuscripts, setManuscripts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setManuscripts(getManuscripts());
    setProjects(getResearchProjects());
  }, []);

  // Filter manuscripts
  const filteredManuscripts = useMemo(() => {
    return manuscripts.filter((m) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        m.manuscriptTitle?.toLowerCase().includes(q) ||
        m.fileName?.toLowerCase().includes(q) ||
        m.version?.toLowerCase().includes(q) ||
        m.projectTitle?.toLowerCase().includes(q) ||
        m.projectDomain?.toLowerCase().includes(q);

      const matchesProject =
        projectFilter === "All Projects" || m.projectId === projectFilter;

      return matchesSearch && matchesProject;
    });
  }, [manuscripts, search, projectFilter]);

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
      {/* Mobile Top Navigation */}
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

      {/* Sidebar */}
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
            to="/student/submissions"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-900/30 transition-all"
          >
            {icons.manuscripts({ className: "h-4.5 w-4.5 text-white" })}
            <span>Manuscripts</span>
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

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="hidden lg:flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4.5 shadow-xs sticky top-0 z-30">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Research Manuscripts</h1>
              <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 text-xs font-semibold">
                Version Directory
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and manage manuscript draft iterations across your registered Research Projects.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/student/upload"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs"
            >
              {icons.upload({ className: "h-3.5 w-3.5" })}
              Upload Manuscript
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Manuscripts
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{manuscripts.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Across all research initiatives</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Projects
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{projects.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">With formulated research gaps</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Status
              </span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">Uploaded</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Staged for Phase 4 AI analysis</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              {icons.search({ className: "h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" })}
              <input
                type="text"
                placeholder="Search manuscripts, files, or versions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full sm:w-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
              >
                <option value="All Projects">All Research Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>

              <Link
                to="/student/upload"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs whitespace-nowrap"
              >
                {icons.plus({ className: "h-3.5 w-3.5" })}
                Upload Manuscript
              </Link>
            </div>
          </div>

          {/* Manuscripts List */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {filteredManuscripts.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  {icons.manuscripts({ className: "h-6 w-6" })}
                </div>
                <h4 className="text-sm font-bold text-slate-900">No manuscripts found</h4>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Upload a research manuscript to associate draft documents with your Research Projects.
                </p>
                <Link
                  to="/student/upload"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs"
                >
                  {icons.upload({ className: "h-3.5 w-3.5" })}
                  Upload Manuscript
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200 bg-slate-50/60">
                      <th className="px-6 py-3 font-semibold">Manuscript Title</th>
                      <th className="px-4 py-3 font-semibold">Associated Project</th>
                      <th className="px-4 py-3 font-semibold">Version Iteration</th>
                      <th className="px-4 py-3 font-semibold">Document File</th>
                      <th className="px-4 py-3 font-semibold">Upload Date</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredManuscripts.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 max-w-sm truncate">{m.manuscriptTitle}</div>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {m.id}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-800 max-w-xs truncate">{m.projectTitle}</div>
                          <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.2 rounded">
                            {m.projectDomain}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-bold text-indigo-700">{m.version}</span>
                        </td>
                        <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                          <div className="font-medium text-slate-800">{m.fileName}</div>
                          <span className="text-[10px] text-slate-400">
                            {m.fileType} • {m.fileSize}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-500 whitespace-nowrap">
                          {formatLastUpdated(m.uploadedAt)}
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            {m.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <Link
                            to={`/student/upload?projectId=${m.projectId}`}
                            className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 transition"
                          >
                            New Revision →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}