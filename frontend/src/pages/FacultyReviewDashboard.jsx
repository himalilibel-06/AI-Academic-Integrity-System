import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getFacultyReviewProjects } from "../service/api";

const icons = {
  dashboard: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  ),
  clipboardCheck: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
    </svg>
  ),
  filter: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  externalLink: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  shield: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
    </svg>
  ),
  clock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  alertCircle: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  refresh: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  user: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

const STATUS_FILTERS = [
  "All",
  "Not Reviewed",
  "In Review",
  "Feedback Provided",
  "Revision Requested",
  "Reviewed",
];

export default function FacultyReviewDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    not_reviewed: 0,
    in_review: 0,
    feedback_provided: 0,
    revision_requested: 0,
    reviewed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await getFacultyReviewProjects();
      if (resp && resp.projects) {
        setProjects(resp.projects);
        if (resp.counts) {
          setCounts(resp.counts);
        }
      } else {
        setProjects([]);
      }
    } catch (err) {
      console.error("Failed to load faculty review projects:", err);
      setError("Unable to load faculty review data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Filtered Projects computation (Client-side filtering for fast interactive search)
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // 1. Status Filter
      if (selectedStatus !== "All") {
        if (p.review_status !== selectedStatus) {
          return false;
        }
      }

      // 2. Search Query matching title, domain, or student_id
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = (p.project_title || "").toLowerCase().includes(query);
        const domainMatch = (p.domain || "").toLowerCase().includes(query);
        const studentMatch = (p.student_id || "").toLowerCase().includes(query);
        const idMatch = (p.project_id || "").toLowerCase().includes(query);

        if (!titleMatch && !domainMatch && !studentMatch && !idMatch) {
          return false;
        }
      }

      return true;
    });
  }, [projects, selectedStatus, searchQuery]);

  // Helper for Status Badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case "Reviewed":
        return {
          bg: "bg-emerald-950/70 border-emerald-800 text-emerald-400",
          dot: "bg-emerald-400",
          label: "Reviewed (Completed)",
        };
      case "Revision Requested":
        return {
          bg: "bg-orange-950/70 border-orange-800 text-orange-400",
          dot: "bg-orange-400",
          label: "Revision Requested",
        };
      case "Feedback Provided":
        return {
          bg: "bg-amber-950/70 border-amber-800 text-amber-400",
          dot: "bg-amber-400",
          label: "Feedback Provided",
        };
      case "In Review":
        return {
          bg: "bg-sky-950/70 border-sky-800 text-sky-400",
          dot: "bg-sky-400",
          label: "In Review",
        };
      case "Not Reviewed":
      default:
        return {
          bg: "bg-slate-800/80 border-slate-700 text-slate-300",
          dot: "bg-slate-400",
          label: "Not Reviewed",
        };
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "Recently";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              to="/professor/dashboard"
              className="flex items-center space-x-2 text-slate-400 hover:text-slate-200 transition"
              title="Return to Professor Dashboard"
            >
              <icons.shield className="w-6 h-6 text-indigo-400" />
              <span className="font-bold text-base text-white tracking-tight">GapGuard AI</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800 text-indigo-300">
              Faculty Review
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/professor/dashboard"
              className="text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition flex items-center space-x-1.5"
            >
              <icons.dashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            {user && (
              <div className="text-xs text-slate-400 flex items-center space-x-2 border-l border-slate-800 pl-3">
                <span className="font-medium text-slate-200">{user.name || "Faculty Reviewer"}</span>
                <button
                  onClick={logout}
                  className="text-xs text-rose-400 hover:text-rose-300 transition"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
              <icons.clipboardCheck className="w-7 h-7 text-indigo-400" />
              <span>Faculty Review Dashboard</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Review and manage student research projects with structured academic feedback,
              identifying gap alignments and evidence coverage without automated grading.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchProjects}
              disabled={loading}
              className="text-xs font-medium px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              <icons.refresh className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Projects</span>
            </button>
          </div>
        </div>

        {/* Summary Count Cards (Strictly Counts Only - No Scores/Ratings) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Total Projects */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Projects</span>
              <icons.clipboardCheck className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-1">{counts.total}</div>
            <span className="text-[11px] text-slate-500 mt-1">Available for review</span>
          </div>

          {/* Not Reviewed */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Not Reviewed</span>
              <span className="w-2 h-2 rounded-full bg-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-200 mt-1">{counts.not_reviewed}</div>
            <span className="text-[11px] text-slate-500 mt-1">Awaiting review start</span>
          </div>

          {/* In Review */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-sky-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">In Review</span>
              <span className="w-2 h-2 rounded-full bg-sky-400" />
            </div>
            <div className="text-2xl font-bold text-sky-300 mt-1">{counts.in_review}</div>
            <span className="text-[11px] text-slate-500 mt-1">Currently open</span>
          </div>

          {/* Revision Requested */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-orange-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Revision Req.</span>
              <span className="w-2 h-2 rounded-full bg-orange-400" />
            </div>
            <div className="text-2xl font-bold text-orange-300 mt-1">{counts.revision_requested}</div>
            <span className="text-[11px] text-slate-500 mt-1">Guidance provided</span>
          </div>

          {/* Reviewed */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Reviewed</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-300 mt-1">{counts.reviewed}</div>
            <span className="text-[11px] text-slate-500 mt-1">Review completed</span>
          </div>
        </div>

        {/* Academic Guardrail Advisory Note */}
        <div className="p-3.5 bg-indigo-950/30 border border-indigo-900/60 rounded-xl flex items-start space-x-3 text-xs text-indigo-300">
          <icons.shield className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-indigo-200">Human Academic Review Workflow: </span>
            This dashboard manages qualitative review workflows. Counts represent progress statuses only.
            GapGuard does not evaluate research quality, predict publication likelihood, or produce automated acceptance decisions.
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <icons.search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by project title, domain, or student ID..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 flex items-center space-x-1 mr-1">
              <icons.filter className="w-3.5 h-3.5" />
              <span>Status:</span>
            </span>
            {STATUS_FILTERS.map((st) => {
              const active = selectedStatus === st;
              return (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                    active
                      ? "bg-indigo-600 border-indigo-500 text-white font-medium shadow-sm"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>

        {/* Projects Listing Area */}
        {loading ? (
          <div className="py-20 text-center space-y-3 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
            <div className="inline-block animate-spin text-indigo-400">
              <icons.refresh className="w-8 h-8" />
            </div>
            <p className="text-xs text-slate-400">Loading research projects for review...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-rose-950/20 border border-rose-900/40 rounded-2xl space-y-3">
            <icons.alertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <p className="text-sm font-semibold text-rose-200">{error}</p>
            <button
              onClick={fetchProjects}
              className="text-xs px-4 py-2 bg-slate-900 border border-slate-800 text-slate-200 rounded-xl hover:bg-slate-800 transition"
            >
              Retry
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
            <icons.clipboardCheck className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">
              {projects.length === 0
                ? "No research projects are currently available for review."
                : "No projects match this filter."}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {projects.length === 0
                ? "Registered student research manuscripts will appear here once submitted."
                : "Try resetting your search query or selecting a different status filter."}
            </p>
            {(searchQuery || selectedStatus !== "All") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStatus("All");
                }}
                className="text-xs px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                Showing <strong className="text-slate-200">{filteredProjects.length}</strong> of {projects.length} research projects
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredProjects.map((proj) => {
                const badge = getStatusBadge(proj.review_status);

                return (
                  <div
                    key={proj.project_id}
                    className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition duration-200 space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {proj.project_id}
                          </span>

                          {proj.domain && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/80">
                              {proj.domain}
                            </span>
                          )}

                          <span
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center space-x-1.5 ${badge.bg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            <span>{badge.label}</span>
                          </span>
                        </div>

                        <h2 className="text-base font-bold text-white tracking-tight hover:text-indigo-300 transition">
                          <Link to={`/faculty/review/${encodeURIComponent(proj.project_id)}`}>
                            {proj.project_title}
                          </Link>
                        </h2>
                      </div>

                      {/* Action Button */}
                      <div className="flex items-center space-x-2 self-start md:self-center">
                        <Link
                          to={`/faculty/review/${encodeURIComponent(proj.project_id)}`}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center space-x-1.5 shadow-md shadow-indigo-900/20"
                        >
                          <span>Open Review</span>
                          <icons.externalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Metadata & Research Context Preview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-0.5">
                          Research Problem
                        </span>
                        <p className="text-slate-300 line-clamp-2 leading-relaxed">
                          {proj.research_problem || "No problem statement recorded."}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-0.5">
                          Claimed Research Gap
                        </span>
                        <p className="text-slate-300 line-clamp-2 leading-relaxed">
                          {proj.claimed_research_gap || "No explicit gap claim recorded."}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Metadata Info */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/60 pt-3">
                      <div className="flex items-center space-x-4">
                        {/* Student ID only if safely available; no fabricated names */}
                        <span className="flex items-center space-x-1">
                          <icons.user className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            Student:{" "}
                            <strong className="text-slate-300">
                              {proj.student_id ? proj.student_id : "Not Specified"}
                            </strong>
                          </span>
                        </span>

                        {proj.reviewer_name && (
                          <span className="text-slate-400">
                            Reviewer: <strong className="text-slate-300">{proj.reviewer_name}</strong>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 text-slate-400">
                        <icons.clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Updated: {formatDate(proj.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/30 py-6 text-center text-xs text-slate-500">
        <p>
          GapGuard AI — Human Academic Review & Qualitative Research Advisory System.
        </p>
      </footer>
    </div>
  );
}
