import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getFacultyReviewHistory, getFacultyReview } from "../service/api";
import { getResearchProjects, getResearchProjectById } from "../service/projectStorage";

const icons = {
  history: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 14 14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.05 11a9 9 0 0 1 .5-2m.5-2a9 9 0 0 1 1.5-1.5" strokeLinecap="round" />
    </svg>
  ),
  shield: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
    </svg>
  ),
  gitCompare: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7M6 9v12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  clipboardCheck: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  fileText: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  arrowRight: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  refresh: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  alertCircle: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  chevronLeft: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  sparkles: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  ),
};

export default function FacultyReviewHistory() {
  const { projectId } = useParams();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isFacultyView = location.pathname.startsWith("/faculty") || user?.role === "professor";

  const [historyData, setHistoryData] = useState(null);
  const [project, setProject] = useState(null);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch project info from storage
      const proj = getResearchProjectById(projectId) || {
        id: projectId,
        title: `Research Project (${projectId})`,
      };
      setProject(proj);

      // 2. Fetch faculty review history
      const history = await getFacultyReviewHistory(projectId);
      setHistoryData(history);

      // 3. Fetch latest review details for feedback summary
      try {
        const rev = await getFacultyReview(projectId);
        setReview(rev.review);
      } catch {
        // Safe fallback
      }
    } catch (err) {
      console.error("Error loading review history:", err);
      setError("Unable to load faculty review history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [projectId]);

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

  const getCycleStatusBadge = (status) => {
    switch (status) {
      case "Review Completed":
        return "bg-emerald-950/70 border-emerald-800 text-emerald-400";
      case "Revision Requested":
        return "bg-orange-950/70 border-orange-800 text-orange-400";
      case "Revision Submitted":
        return "bg-indigo-950/70 border-indigo-800 text-indigo-300";
      case "Follow-up Review":
        return "bg-amber-950/70 border-amber-800 text-amber-300";
      case "Re-analysis Available":
        return "bg-teal-950/70 border-teal-800 text-teal-300";
      case "Review Started":
      default:
        return "bg-sky-950/70 border-sky-800 text-sky-400";
    }
  };

  const getFacultyStatusBadge = (status) => {
    switch (status) {
      case "Reviewed":
        return "bg-emerald-950/70 border-emerald-800 text-emerald-400";
      case "Revision Requested":
        return "bg-orange-950/70 border-orange-800 text-orange-400";
      case "Feedback Provided":
        return "bg-amber-950/70 border-amber-800 text-amber-300";
      case "In Review":
        return "bg-sky-950/70 border-sky-800 text-sky-400";
      case "Not Reviewed":
      default:
        return "bg-slate-800 border-slate-700 text-slate-300";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              to={isFacultyView ? "/faculty/reviews" : "/student/dashboard"}
              className="flex items-center space-x-2 text-slate-400 hover:text-slate-200 transition"
              title="Return"
            >
              <icons.shield className="w-6 h-6 text-indigo-400" />
              <span className="font-bold text-base text-white tracking-tight">GapGuard AI</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800 text-indigo-300">
              Review History
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to={isFacultyView ? "/faculty/reviews" : "/student/dashboard"}
              className="text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition flex items-center space-x-1.5"
            >
              <icons.chevronLeft className="w-3.5 h-3.5" />
              <span>{isFacultyView ? "Review Dashboard" : "Student Dashboard"}</span>
            </Link>
            {user && (
              <div className="text-xs text-slate-400 flex items-center space-x-2 border-l border-slate-800 pl-3">
                <span className="font-medium text-slate-200">{user.name || "User"}</span>
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

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {projectId}
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400">Chronological Evolution</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
              <icons.history className="w-7 h-7 text-indigo-400" />
              <span>Faculty Review History</span>
            </h1>
            <p className="text-sm text-slate-300 font-medium max-w-3xl">
              {project?.title || historyData?.project_title}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {isFacultyView && (
              <Link
                to={`/faculty/review/${encodeURIComponent(projectId)}`}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm"
              >
                <icons.clipboardCheck className="w-3.5 h-3.5" />
                <span>Open Review Workspace</span>
              </Link>
            )}
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-medium transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              <icons.refresh className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Review Cycles
            </span>
            <div className="text-2xl font-bold text-white mt-1">
              {historyData?.total_cycles || 0}
            </div>
            <span className="text-[11px] text-slate-500 mt-1">
              Recorded review rounds
            </span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Latest Review Status
            </span>
            <div className="text-base font-bold text-indigo-300 mt-1">
              {historyData?.latest_review_status || "Not Reviewed"}
            </div>
            <span className="text-[11px] text-slate-500 mt-1">
              Human academic feedback status
            </span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Current Manuscript Version
            </span>
            <div className="text-base font-bold text-slate-200 mt-1 truncate" title={historyData?.latest_manuscript_version}>
              {historyData?.latest_manuscript_version || "None"}
            </div>
            <span className="text-[11px] text-slate-500 mt-1">
              Active manuscript draft
            </span>
          </div>
        </div>

        {/* Academic Guardrail Notice */}
        <div className="p-3.5 bg-indigo-950/30 border border-indigo-900/60 rounded-xl flex items-start space-x-3 text-xs text-indigo-300">
          <icons.shield className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-indigo-200">Revision Cycle Tracking Safeguard: </span>
            This history records chronological manuscript iterations and qualitative faculty feedback.
            It tracks revisions without generating numerical quality scores, novelty ratings, or automated publication decisions.
          </div>
        </div>

        {/* Timeline Content */}
        {loading ? (
          <div className="py-20 text-center space-y-3 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
            <div className="inline-block animate-spin text-indigo-400">
              <icons.refresh className="w-8 h-8" />
            </div>
            <p className="text-xs text-slate-400">Loading revision cycle timeline...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-rose-950/20 border border-rose-900/40 rounded-2xl space-y-3">
            <icons.alertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <p className="text-sm font-semibold text-rose-200">{error}</p>
            <button
              onClick={fetchHistory}
              className="text-xs px-4 py-2 bg-slate-900 border border-slate-800 text-slate-200 rounded-xl hover:bg-slate-800 transition"
            >
              Retry
            </button>
          </div>
        ) : !historyData || historyData.cycles.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
            <icons.fileText className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">
              No revision history recorded yet.
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Once manuscript drafts are submitted and reviewed by faculty, chronological revision cycles will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-semibold uppercase tracking-wider text-slate-400">
                Chronological Revision Timeline
              </span>
              <span>
                {historyData.cycles.length} cycle(s) in sequence
              </span>
            </div>

            <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-8">
              {historyData.cycles.map((cycle, index) => {
                const cycleNum = index + 1;
                const canCompare = Boolean(
                  cycle.previous_manuscript_id && cycle.current_manuscript_id
                );

                return (
                  <div key={cycle.cycle_id} className="relative group">
                    {/* Timeline Node Icon */}
                    <div className="absolute -left-[35px] top-1.5 w-6 h-6 rounded-full bg-slate-900 border-2 border-indigo-500 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                      {cycleNum}
                    </div>

                    {/* Cycle Card */}
                    <div className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 transition">
                      {/* Top Bar of Cycle */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800/80 pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            Review Cycle {cycleNum}
                          </span>
                          <span className="text-xs text-slate-600">•</span>
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border text-[11px] bg-slate-800 border-slate-700 text-slate-300">
                            {cycle.current_version_label}
                          </span>
                          <span
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getCycleStatusBadge(
                              cycle.cycle_status
                            )}`}
                          >
                            {cycle.cycle_status}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400">
                          {formatDate(cycle.created_at)}
                        </div>
                      </div>

                      {/* Content Overview */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Left: Versions & Reviewer */}
                        <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-semibold uppercase text-[10px]">
                              Manuscript Flow:
                            </span>
                            <span className="text-slate-300 font-mono text-[11px]">
                              {cycle.previous_manuscript_id ? (
                                <>
                                  {cycle.previous_version_label || "V1"}
                                  {" → "}
                                  {cycle.current_version_label || "V2"}
                                </>
                              ) : (
                                cycle.current_version_label || "Initial Draft"
                              )}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-semibold uppercase text-[10px]">
                              Faculty Review Status:
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getFacultyStatusBadge(
                                cycle.faculty_status
                              )}`}
                            >
                              {cycle.faculty_status}
                            </span>
                          </div>

                          {cycle.reviewer_name && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-semibold uppercase text-[10px]">
                                Faculty Reviewer:
                              </span>
                              <span className="text-slate-300 font-medium">
                                {cycle.reviewer_name}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Right: Notes & Guidance */}
                        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                          <div>
                            <span className="text-slate-500 font-semibold uppercase text-[10px] block mb-1">
                              Cycle Description & Context:
                            </span>
                            <p className="text-slate-300 leading-relaxed text-xs">
                              {cycle.notes ||
                                "Revision tracking event recorded in accordance with human academic feedback."}
                            </p>
                          </div>

                          {review?.recommendations && (
                            <div className="mt-2 pt-2 border-t border-slate-800/80">
                              <span className="text-indigo-400 font-semibold text-[10px] block">
                                Latest Recommendations:
                              </span>
                              <p className="text-slate-300 text-[11px] line-clamp-2">
                                {review.recommendations}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Compare Versions Action */}
                          {canCompare ? (
                            <Link
                              to={`/student/revision-comparison?project_id=${encodeURIComponent(
                                projectId
                              )}&prev_id=${encodeURIComponent(
                                cycle.previous_manuscript_id
                              )}&new_id=${encodeURIComponent(
                                cycle.current_manuscript_id
                              )}`}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition flex items-center space-x-1.5 shadow-sm"
                            >
                              <icons.gitCompare className="w-3.5 h-3.5" />
                              <span>Compare Versions</span>
                            </Link>
                          ) : (
                            <span
                              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 text-[11px] cursor-not-allowed"
                              title="Comparison requires both previous and revised drafts"
                            >
                              Initial Draft (No Prior Version)
                            </span>
                          )}

                          {/* View Readiness / Re-analysis */}
                          <Link
                            to={`/student/submission-readiness?project_id=${encodeURIComponent(
                              projectId
                            )}`}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-medium transition flex items-center space-x-1.5"
                          >
                            <icons.sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <span>View Analysis</span>
                          </Link>

                          {/* View Faculty Feedback (Student & Faculty) */}
                          <Link
                            to={
                              isFacultyView
                                ? `/faculty/review/${encodeURIComponent(projectId)}`
                                : `/student/faculty-feedback?projectId=${encodeURIComponent(
                                    projectId
                                  )}`
                            }
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-medium transition flex items-center space-x-1.5"
                          >
                            <icons.clipboardCheck className="w-3.5 h-3.5 text-amber-400" />
                            <span>
                              {isFacultyView ? "Open Review Workspace" : "View Faculty Feedback"}
                            </span>
                          </Link>
                        </div>

                        <span className="text-[11px] text-slate-500">
                          Cycle ID: <code className="font-mono text-slate-400">{cycle.cycle_id}</code>
                        </span>
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
        <p>GapGuard AI — Revision Cycle Tracking & Academic Review History.</p>
      </footer>
    </div>
  );
}
