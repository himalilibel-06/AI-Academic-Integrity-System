import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getStudentDashboard } from "../service/api";

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
};

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getStudentDashboard();
      if (response && response.success) {
        setDashboardData(response);
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
    const name = dashboardData?.student?.name || user?.name || "Student";
    const initials = name
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "ST";
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
      <header className="hidden lg:flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4 shadow-sm sticky top-0 z-30">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
              GapGuard AI
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            AI-Based Plagiarism Detector
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/student/upload"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-sm"
          >
            {icons.upload({ className: "h-4 w-4" })}
            Check Document
          </Link>
          <div className="h-6 w-[1px] bg-slate-200 mx-1" />
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
              {researcherInfo.initials}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{researcherInfo.name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        {error && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        )}

        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-6 sm:p-8 shadow-md border border-emerald-900">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-100 backdrop-blur-sm border border-white/20 mb-4">
              {icons.shield({ className: "h-3.5 w-3.5" })}
              AI-Based Plagiarism Detector
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {researcherInfo.name.split(" ")[0]}!
            </h2>
            <p className="mt-2 text-base text-emerald-100/90 leading-relaxed max-w-xl">
              Check your academic documents for similarity against peer submissions and research literature to ensure academic integrity.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/student/upload"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-emerald-900 hover:bg-emerald-50 transition shadow-sm"
              >
                {icons.upload({ className: "h-4 w-4" })}
                Check Document Now
              </Link>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center p-10">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Account Overview</h3>
                <div className="space-y-4">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase">Documents Checked</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{stats.total_submissions}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                    <p className="text-xs font-medium text-emerald-700 uppercase">Avg. Similarity</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-900">
                      {stats.total_submissions > 0 ? `${stats.average_similarity.toFixed(1)}%` : "0%"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-rose-50 border border-rose-100 p-4">
                    <p className="text-xs font-medium text-rose-700 uppercase">Flagged for Review</p>
                    <p className="mt-1 text-2xl font-bold text-rose-900">{stats.flagged_documents}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm h-full flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Recent Plagiarism Reports</h3>
                  <Link to="/student/submissions" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                    View All {icons.arrowRight({ className: "h-3.5 w-3.5" })}
                  </Link>
                </div>
                <div className="p-6 flex-1">
                  {recentSubmissions.length > 0 ? (
                    <div className="space-y-4">
                      {recentSubmissions.map((sub) => (
                        <div key={sub.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition bg-white">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                              {icons.fileDoc({ className: "h-4 w-4" })}
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900">{sub.title}</h4>
                              <p className="text-xs text-slate-500 mt-0.5">{sub.course} • {sub.date}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/2">
                            <div className="text-right">
                              <p className="text-xs font-medium text-slate-500 uppercase mb-0.5">Similarity</p>
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                                sub.similarity < 15 ? "bg-emerald-100 text-emerald-700" :
                                sub.similarity <= 40 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                              }`}>
                                {sub.similarity !== null ? `${sub.similarity}%` : "Pending"}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-medium text-slate-500 uppercase mb-0.5">Status</p>
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                sub.status === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                sub.status === "Review Required" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}>
                                {sub.status}
                              </span>
                            </div>
                            <Link
                              to={`/student/reports/${sub.report_id}`}
                              className="p-2 rounded-lg bg-slate-50 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition"
                              title="View Report"
                            >
                              {icons.arrowRight({ className: "h-4 w-4" })}
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                      <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4">
                        {icons.fileDoc({ className: "h-8 w-8" })}
                      </div>
                      <h4 className="text-slate-900 font-semibold mb-1">No reports yet</h4>
                      <p className="text-slate-500 text-sm max-w-sm">
                        You haven't checked any documents for plagiarism. Upload a document to get started.
                      </p>
                      <Link
                        to="/student/upload"
                        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
                      >
                        {icons.upload({ className: "h-4 w-4" })}
                        Check Document
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}