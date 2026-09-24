import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getFacultyReview } from "../service/api";
import { getResearchProjects } from "../service/projectStorage";

const icons = {
  clipboardCheck: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  user: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  shield: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
    </svg>
  ),
  alertTriangle: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinejoin="round" />
      <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
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
  rotateCcw: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  ),
};

const SECTION_LABELS = {
  research_problem: "1. Research Problem",
  research_gap: "2. Research Gap",
  proposed_method: "3. Proposed Method",
  expected_contribution: "4. Expected Contribution",
  evidence_literature: "5. Evidence / Literature",
  research_claims: "6. Research Claims",
};

export default function FacultyFeedback() {
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load research projects
  useEffect(() => {
    try {
      const stored = getResearchProjects();
      if (stored && stored.length > 0) {
        setProjects(stored);
        const qProj = searchParams.get("projectId");
        setSelectedProjectId(qProj && stored.some((p) => p.id === qProj) ? qProj : stored[0].id);
      }
    } catch {
      // Default sample fallback
      setProjects([{ id: "proj-01", title: "Medical Diagnostics" }]);
      setSelectedProjectId("proj-01");
    }
  }, [searchParams]);

  // Load faculty review for selected project
  useEffect(() => {
    if (!selectedProjectId) return;

    let isMounted = true;
    async function fetchReview() {
      setLoading(true);
      setError(null);
      try {
        const res = await getFacultyReview(selectedProjectId);
        if (isMounted) setReview(res.review);
      } catch (err) {
        if (isMounted) setError(err?.message || "Failed to load faculty review.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchReview();
    return () => {
      isMounted = false;
    };
  }, [selectedProjectId]);

  const renderStatusBadge = (status) => {
    switch (status) {
      case "Reviewed":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Reviewed
          </span>
        );
      case "Revision Requested":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
            Revision Requested
          </span>
        );
      case "Feedback Provided":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
            Feedback Provided
          </span>
        );
      case "In Review":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            In Review
          </span>
        );
      case "Not Reviewed":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            Not Reviewed
          </span>
        );
    }
  };

  const activeProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ---------------- Navigation Header ---------------- */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <icons.clipboardCheck className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold tracking-tight text-white">GapGuard AI</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded">
                  Faculty Feedback
                </span>
              </div>
              <span className="text-xs text-slate-400">Student Research Review Area</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link to="/student/dashboard" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
              Dashboard
            </Link>
            <Link to="/student/submission-readiness" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
              Readiness Report
            </Link>
            <div className="h-4 w-px bg-slate-800 mx-1" />
            <span className="text-xs text-slate-300 font-medium px-2 py-1 bg-slate-800/80 rounded-md">
              {user?.full_name || user?.name || "Student"}
            </span>
            <button onClick={logout} className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-500/10 transition">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- Main Content ---------------- */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Project Selector Bar */}
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
                <icons.user className="w-6 h-6 text-indigo-400" />
                <span>Faculty Feedback & Review Status</span>
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Academic commentary and recommendations provided by your faculty reviewer.
              </p>
            </div>

            <div className="w-full sm:w-72">
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Select Project:</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title || `Project ${p.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
            <icons.alertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Revision Requested Notice (Specific requirement: "Faculty revision feedback is available.") */}
        {review?.status === "Revision Requested" && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start space-x-3">
            <icons.rotateCcw className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-300 uppercase tracking-wider text-[11px]">
                Revision Guidance
              </div>
              <p className="mt-0.5">
                Faculty revision feedback is available. Review the comments below, revise your manuscript draft, and re-run analysis modules when ready.
              </p>
            </div>
          </div>
        )}

        {/* Review Status Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                {activeProject?.domain || "Computer Science"}
              </span>
              <h2 className="text-lg font-bold text-white mt-0.5">
                {activeProject?.title || review?.project_title || "Research Project"}
              </h2>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <span className="block text-[11px] text-slate-500">Review Status</span>
                {renderStatusBadge(review?.status || "Not Reviewed")}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-500 block">Reviewer</span>
              <span className="font-semibold text-slate-200">
                {review?.reviewer_name || "Faculty Reviewer (Pending)"}
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-500 block">Last Updated</span>
              <span className="font-semibold text-slate-200">
                {review?.updated_at ? new Date(review.updated_at).toLocaleString() : "Not updated"}
              </span>
            </div>
          </div>

          {/* Overall Recommendations */}
          <div className="pt-2">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Overall Academic Recommendations
            </h3>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed">
              {review?.recommendations ? (
                review.recommendations
              ) : (
                <span className="text-slate-500 italic">No overall recommendations recorded yet.</span>
              )}
            </div>
          </div>

          {/* Section-by-Section Comments */}
          <div className="pt-2 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Section-by-Section Faculty Feedback
            </h3>

            <div className="space-y-2.5">
              {Object.entries(SECTION_LABELS).map(([secKey, secLabel]) => {
                const commentText = review?.comments?.[secKey];
                return (
                  <div key={secKey} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                    <span className="font-semibold text-indigo-300 block">{secLabel}</span>
                    {commentText && commentText.trim() ? (
                      <p className="text-slate-200 leading-relaxed pl-2 border-l-2 border-indigo-500/50">
                        {commentText}
                      </p>
                    ) : (
                      <span className="text-slate-500 italic pl-2">No comments recorded for this section.</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Academic Guardrail statement */}
          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
            {review?.academic_guardrail || (
              "Faculty feedback is qualitative and human-advisory. GapGuard AI does not grade or approve research. Review completed indicates human academic review was conducted."
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
