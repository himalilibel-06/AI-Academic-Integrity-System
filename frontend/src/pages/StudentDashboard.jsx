import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getStudentDashboard, getCustomReferences } from "../service/api";

const icons = {
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  upload: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  fileDoc: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  shield: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  arrowRight: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  book: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinejoin="round" />
      <path d="M9 7h6M9 11h4" strokeLinecap="round" />
    </svg>
  ),
  search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [customRefCount, setCustomRefCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const [dashRes, refRes] = await Promise.all([
        getStudentDashboard(),
        getCustomReferences().catch(() => ({ references: [] })),
      ]);

      if (dashRes && dashRes.success) {
        setDashboardData(dashRes);
      }
      if (refRes && refRes.references) {
        setCustomRefCount(refRes.references.length);
      }
    } catch (err) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const researcherInfo = useMemo(() => {
    const name = dashboardData?.student?.name || user?.name || user?.full_name || "Scholar";
    const initials =
      name
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "RS";
    return { name, initials };
  }, [dashboardData, user]);

  const stats = dashboardData?.stats || {
    total_submissions: 0,
    average_similarity: 0,
    flagged_documents: 0,
  };
  const recentSubmissions = dashboardData?.recent_submissions || [];

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-slate-50 min-h-screen">
      {/* Top Header */}
      <header className="hidden lg:flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4 shadow-xs sticky top-0 z-30">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
              GapGuard AI
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            AI-Powered Document Plagiarism &amp; Textual Similarity Detection System
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
            {researcherInfo.initials}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 leading-tight">{researcherInfo.name}</p>
            <p className="text-[11px] text-slate-500 leading-tight">Student / Author</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        {error && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        )}

        {/* Welcome Banner */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-6 sm:p-8 shadow-md border border-blue-900/50">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-200 backdrop-blur-sm border border-blue-400/30 mb-4">
              {icons.shield({ className: "h-3.5 w-3.5 text-blue-300" })}
              AI Plagiarism Engine &bull; TF-IDF &amp; Cosine Similarity
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {researcherInfo.name.split(" ")[0]}!
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-blue-100/90 leading-relaxed">
              Upload your research paper and reference documents to instantly evaluate similarity, detect overlapping passages, and inspect side-by-side evidence.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/student/upload"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition shadow-sm"
              >
                {icons.upload({ className: "h-4 w-4" })}
                Check Similarity
              </Link>
              <Link
                to="/student/submissions"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition backdrop-blur-sm"
              >
                {icons.fileDoc({ className: "h-4 w-4" })}
                My Analyses ({stats.total_submissions})
              </Link>
              <Link
                to="/student/literature"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition backdrop-blur-sm"
              >
                {icons.book({ className: "h-4 w-4" })}
                Reference Library ({customRefCount})
              </Link>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center p-12">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documents Checked</p>
                  <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    {icons.fileDoc({ className: "h-4 w-4" })}
                  </div>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-slate-900">{stats.total_submissions}</p>
                <p className="mt-1 text-xs text-slate-500">Submitted for similarity analysis</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg. Similarity</p>
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    {icons.shield({ className: "h-4 w-4" })}
                  </div>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-slate-900">
                  {stats.total_submissions > 0 ? `${stats.average_similarity.toFixed(1)}%` : "0%"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Across completed analyses</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Requiring Review</p>
                  <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    {icons.shield({ className: "h-4 w-4" })}
                  </div>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-slate-900">{stats.flagged_documents}</p>
                <p className="mt-1 text-xs text-slate-500">High overlap detected</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reference Library</p>
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    {icons.book({ className: "h-4 w-4" })}
                  </div>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-slate-900">{customRefCount}</p>
                <p className="mt-1 text-xs text-slate-500">Saved reference documents</p>
              </div>
            </div>

            {/* Informational Similarity Checking Workflow Card */}
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/60 via-slate-50/80 to-white p-5 sm:p-6 shadow-xs">
              <div className="flex items-start sm:items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  {icons.shield({ className: "h-5 w-5" })}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-900">Start a New Similarity Check</h3>
                  <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                    Upload any research paper (PDF, DOCX, TXT) along with your reference documents from the Welcome banner or the navigation sidebar to generate an instant similarity report with side-by-side passage matching.
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Similarity Analyses Table */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Recent Analyses</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Your recently analyzed documents and reports</p>
                </div>
                <Link
                  to="/student/submissions"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
                >
                  View All Analyses {icons.arrowRight({ className: "h-3.5 w-3.5" })}
                </Link>
              </div>

              <div className="p-6">
                {recentSubmissions.length > 0 ? (
                  <div className="space-y-3">
                    {recentSubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition bg-white"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="mt-0.5 h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                            {icons.fileDoc({ className: "h-4 w-4" })}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-slate-900 truncate">{sub.title}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Analyzed on {sub.date}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-5 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Similarity</p>
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                                sub.similarity < 15
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : sub.similarity <= 40
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {sub.similarity !== null ? `${sub.similarity}%` : "Pending"}
                            </span>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Status</p>
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded text-xs font-medium border ${
                                sub.status === "Approved" || sub.similarity < 15
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : sub.status === "Review Required" || sub.similarity <= 40
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              {sub.status || "Completed"}
                            </span>
                          </div>

                          <Link
                            to={`/student/reports/${sub.report_id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition"
                            title="View Report"
                          >
                            View Report {icons.arrowRight({ className: "h-3.5 w-3.5" })}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-10">
                    <div className="h-14 w-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                      {icons.fileDoc({ className: "h-7 w-7" })}
                    </div>
                    <h4 className="text-slate-900 font-bold mb-1 text-sm">No documents checked yet</h4>
                    <p className="text-slate-500 text-xs max-w-sm mb-5 leading-relaxed">
                      You haven&apos;t submitted any documents for plagiarism checking. Upload a research paper and reference documents to run your first check.
                    </p>
                    <Link
                      to="/student/upload"
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-sm"
                    >
                      {icons.upload({ className: "h-4 w-4" })}
                      Check Document
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}