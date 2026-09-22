import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getStudentDashboard } from "../service/api";
import NotificationBell from "../components/NotificationBell";

/* ---------------------------------------------------------
   Inline icons (no extra dependency)
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
  upload: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" strokeLinecap="round" strokeLinejoin="round" />
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
  bell: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
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
  docCheck: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8L14 3.5Z" strokeLinejoin="round" />
      <path d="M9.5 13l2 2 3.5-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  clock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  info: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 8v.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  courses: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinejoin="round" />
      <path d="M8 7h8M8 11h5" strokeLinecap="round" />
    </svg>
  ),
};

const navItems = [
  { label: "Dashboard", icon: icons.dashboard, to: "/student/dashboard" },
  { label: "Courses", icon: icons.courses, to: "/student/courses" },
  { label: "Upload Submission", icon: icons.upload, to: "/student/upload" },
  { label: "My Submissions", icon: icons.submissions, to: "/student/submissions" },
  { label: "Reports", icon: icons.reports, to: "/student/reports" },
  { label: "Profile", icon: icons.profile, to: "/student/profile" },
  { label: "Settings", icon: icons.settings, to: "/student/settings" },
];

const quickActions = [
  { label: "Manage Courses", description: "Enroll or view enrolled courses", to: "/student/courses", icon: icons.courses },
  { label: "Upload New Assignment", description: "Submit a new file for review", to: "/student/upload", icon: icons.upload },
  { label: "View My Submissions", description: "See all past submissions", to: "/student/submissions", icon: icons.submissions },
  { label: "View Reports", description: "Open similarity reports", to: "/student/reports", icon: icons.reports },
];

/* ---------------------------------------------------------
   Small presentational helpers
--------------------------------------------------------- */
function StatusBadge({ status }) {
  const styles = {
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Reviewed: "bg-blue-50 text-blue-700 border-blue-200",
    "Review Required": "bg-amber-50 text-amber-700 border-amber-200",
    Flagged: "bg-rose-50 text-rose-700 border-rose-200",
    Rejected: "bg-red-50 text-red-700 border-red-200",
    "Analysis Complete": "bg-green-50 text-green-700 border-green-200",
    Completed: "bg-green-50 text-green-700 border-green-200",
    Processing: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
        styles[status] || "bg-slate-50 text-slate-600 border-slate-200"
      }`}
    >
      {status}
    </span>
  );
}

function SimilarityValue({ value }) {
  if (value === null || value === undefined) {
    return <span className="text-sm text-slate-400">Pending</span>;
  }
  const color =
    value < 20 ? "text-green-600" : value < 40 ? "text-amber-600" : "text-red-600";
  return <span className={`text-sm font-semibold ${color}`}>{value}%</span>;
}

export default function StudentDashboard() {
  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      } else {
        setError("Failed to load dashboard metrics.");
      }
    } catch (err) {
      setError(err.message || "Unable to connect to the academic server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const studentInfo = dashboardData?.student || {
    name: user?.name || "Student",
    email: user?.email || "",
    initials: user?.name
      ? user.name
          .split(" ")
          .filter(Boolean)
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "ST",
  };

  const stats = dashboardData?.stats || {
    total_submissions: 0,
    completed: 0,
    under_review: 0,
    reports_available: 0,
    average_similarity: 0.0,
  };

  const summaryStats = [
    { label: "Total Submissions", value: stats.total_submissions, note: "All-time submissions", icon: icons.submissions },
    { label: "Completed", value: stats.completed, note: "Reviewed & finalized", icon: icons.docCheck },
    { label: "Under Review", value: stats.under_review, note: "Pending instructor review", icon: icons.clock },
    { label: "Reports Available", value: stats.reports_available, note: "Similarity analysis ready", icon: icons.reports },
  ];

  const recentSubmissions = dashboardData?.recent_submissions || [];

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
          className="p-2 text-slate-600 hover:text-slate-900"
        >
          {icons.menu({ className: "h-6 w-6" })}
        </button>
        <span className="text-sm font-semibold text-slate-900">AI Academic Integrity</span>
        <div className="h-8 w-8 rounded-full bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center">
          {studentInfo.initials}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed z-50 inset-y-0 left-0 w-72 transform bg-[#0F172A] text-slate-100 px-5 py-6 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 lg:flex-shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">AI Academic Integrity</p>
            <p className="text-xs text-emerald-400 mt-0.5">Student Portal</p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation menu"
            className="p-1 text-slate-300 hover:text-white lg:hidden"
          >
            {icons.close({ className: "h-5 w-5" })}
          </button>
        </div>

        <nav className="mt-8 flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = item.label === "Dashboard";
            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-emerald-500 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.icon({ className: "h-5 w-5 flex-shrink-0" })}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
        >
          {icons.logout({ className: "h-5 w-5" })}
          Logout
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <header className="hidden lg:flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Student Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              Monitor your academic submissions and integrity reports.
            </p>
          </div>
          <div className="flex items-center gap-5">
            <NotificationBell />
            <div className="flex items-center gap-3 border-l border-slate-200 pl-5">
              <div className="h-9 w-9 rounded-full bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center">
                {studentInfo.initials}
              </div>
              <div className="text-sm">
                <p className="font-medium text-slate-900 leading-tight">{studentInfo.name}</p>
                <p className="text-slate-500 leading-tight">{studentInfo.email}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
              <p>{error}</p>
              <button
                type="button"
                onClick={loadDashboard}
                className="font-semibold underline hover:text-red-800 ml-4"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <svg
                className="mx-auto h-8 w-8 animate-spin text-emerald-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="mt-4 text-sm font-medium text-slate-700">Loading student dashboard...</p>
            </div>
          ) : (
            <>
              {/* Welcome section */}
              <section className="rounded-2xl border border-slate-200 bg-white px-6 py-7 sm:px-8 sm:py-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between shadow-sm">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Welcome back, {studentInfo.name.split(" ")[0]}!
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 max-w-md">
                    Track your assignments and review your academic integrity reports.
                  </p>
                </div>
                <Link
                  to="/student/upload"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors whitespace-nowrap"
                >
                  {icons.upload({ className: "h-4 w-4" })}
                  Upload Assignment
                </Link>
              </section>

              {/* Instructor Action Required Alert */}
              {recentSubmissions.some(
                (item) =>
                  item.review_status === "review_required" ||
                  item.review_status === "flagged" ||
                  item.status === "Review Required" ||
                  item.status === "Flagged"
              ) && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
                  <div className="flex items-start gap-3.5">
                    <div className="rounded-lg bg-amber-100 p-2 text-amber-800 flex-shrink-0 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-amber-950">
                        Instructor Action &amp; Review Required
                      </h3>
                      <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
                        One or more of your submissions have received instructor review decisions requiring discussion or revision.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {recentSubmissions
                          .filter(
                            (item) =>
                              item.review_status === "review_required" ||
                              item.review_status === "flagged" ||
                              item.status === "Review Required" ||
                              item.status === "Flagged"
                          )
                          .map((sub) => (
                            <Link
                              key={sub.id}
                              to={sub.report_id ? `/student/reports/${sub.report_id}` : "/student/reports"}
                              className="inline-flex items-center gap-2 rounded-lg bg-white border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100 transition shadow-xs"
                            >
                              <span className="truncate max-w-[200px]">{sub.title}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold uppercase">
                                {sub.status}
                              </span>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                              </svg>
                            </Link>
                          ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Statistics */}
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {summaryStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-500">{stat.label}</p>
                        <p className="mt-1.5 text-2xl font-semibold text-slate-900">{stat.value}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-2 text-emerald-500">
                        {stat.icon({ className: "h-5 w-5" })}
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">{stat.note}</p>
                  </div>
                ))}
              </section>

              {/* Recent submissions */}
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
                  <h3 className="text-base font-semibold text-slate-900">Recent Submissions</h3>
                  <Link
                    to="/student/submissions"
                    className="text-sm font-medium text-emerald-500 hover:text-emerald-600"
                  >
                    View all
                  </Link>
                </div>

                {recentSubmissions.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                      {icons.submissions({ className: "h-6 w-6" })}
                    </div>
                    <p className="text-sm font-semibold text-slate-900">No submissions yet</p>
                    <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                      You haven&apos;t submitted any assignments yet. Submit an academic document to run plagiarism similarity analysis.
                    </p>
                    <Link
                      to="/student/upload"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition"
                    >
                      {icons.upload({ className: "h-4 w-4" })}
                      Upload First Assignment
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-200 bg-slate-50/50">
                            <th className="px-6 py-3 font-medium">Assignment</th>
                            <th className="px-4 py-3 font-medium">Course</th>
                            <th className="px-4 py-3 font-medium">Submitted Date</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Similarity</th>
                            <th className="px-6 py-3 font-medium text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentSubmissions.map((item) => (
                            <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                              <td className="px-6 py-4 text-slate-900 font-medium">
                                <div>{item.title}</div>
                                {item.professor_feedback && (
                                  <div className="mt-0.5">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                      Instructor Feedback Available
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4 text-slate-600">
                                {item.course_code ? `${item.course_code} - ` : ""}{item.course}
                              </td>
                              <td className="px-4 py-4 text-slate-600">{item.date}</td>
                              <td className="px-4 py-4">
                                <StatusBadge status={item.status} />
                              </td>
                              <td className="px-4 py-4">
                                <SimilarityValue value={item.similarity} />
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Link
                                  to={item.report_id ? `/student/reports/${item.report_id}` : "/student/reports"}
                                  className="text-sm font-medium text-emerald-500 hover:text-emerald-600"
                                >
                                  View Report
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile card list */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {recentSubmissions.map((item) => (
                        <div key={item.id} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium text-slate-900">{item.title}</p>
                            <StatusBadge status={item.status} />
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.course_code ? `${item.course_code} - ` : ""}{item.course}
                          </p>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="text-xs text-slate-500">
                              <span>{item.date}</span>
                              <span className="mx-2">•</span>
                              <SimilarityValue value={item.similarity} />
                            </div>
                            <Link
                              to={item.report_id ? `/student/reports/${item.report_id}` : "/student/reports"}
                              className="text-sm font-medium text-emerald-500 hover:text-emerald-600"
                            >
                              View Report
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>

              {/* Similarity info note */}
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-4 flex gap-3">
                <div className="text-emerald-500 flex-shrink-0">
                  {icons.info({ className: "h-5 w-5" })}
                </div>
                <p className="text-sm text-emerald-900 leading-relaxed">
                  Similarity scores indicate matching content and are intended to support academic
                  review. A similarity score alone does not prove plagiarism.
                </p>
              </section>

              {/* Quick actions */}
              <section>
                <h3 className="text-base font-semibold text-slate-900 mb-3">Quick Actions</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {quickActions.map((action) => (
                    <Link
                      key={action.label}
                      to={action.to}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-5 flex items-start gap-3 hover:border-emerald-400 hover:shadow-sm transition-all shadow-sm"
                    >
                      <div className="rounded-lg bg-emerald-50 p-2 text-emerald-500 flex-shrink-0">
                        {action.icon({ className: "h-5 w-5" })}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{action.label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{action.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}