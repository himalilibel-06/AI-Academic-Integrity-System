import { useState } from "react";
import { Link } from "react-router-dom";

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
  alert: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 3.5 21 19H3L12 3.5Z" strokeLinejoin="round" />
      <path d="M12 9.5v4.2M12 16.8v.01" strokeLinecap="round" />
    </svg>
  ),
  flag: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M5 3.5v17" strokeLinecap="round" />
      <path d="M5 4.5h11l-2.5 3.5L16 11.5H5" strokeLinejoin="round" />
    </svg>
  ),
  info: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 8v.01" strokeLinecap="round" />
    </svg>
  ),
};

/* ---------------------------------------------------------
   Mock data — replace with API data once the backend is live
--------------------------------------------------------- */
const professor = {
  name: "Dr. Anitha Kumar",
  email: "professor@example.com",
  initials: "AK",
};

const summaryStats = [
  { label: "Total Submissions", value: 128, note: "Across all courses", icon: icons.submissions },
  { label: "Completed", value: 104, note: "Review finalized", icon: icons.docCheck },
  { label: "Processing", value: 8, note: "Awaiting analysis", icon: icons.clock },
  { label: "Review Required", value: 12, note: "Needs professor input", icon: icons.flag },
  { label: "High Similarity", value: 4, note: "Similarity detected", icon: icons.alert },
];

const reviewRequired = [
  {
    id: 1,
    student: "Arun Kumar",
    assignment: "AI Ethics Assignment",
    course: "CS402 - Artificial Intelligence",
    date: "Sep 10, 2026",
    similarity: 46,
    status: "High Similarity",
  },
  {
    id: 2,
    student: "Priya Sharma",
    assignment: "Neural Networks Report",
    course: "CS420 - Machine Learning",
    date: "Sep 9, 2026",
    similarity: 38,
    status: "Review Required",
  },
  {
    id: 3,
    student: "Rohit Verma",
    assignment: "Database Design Proposal",
    course: "CS305 - Database Systems",
    date: "Sep 8, 2026",
    similarity: 51,
    status: "High Similarity",
  },
  {
    id: 4,
    student: "Sneha Reddy",
    assignment: "Operating Systems Case Study",
    course: "CS310 - Operating Systems",
    date: "Sep 7, 2026",
    similarity: 34,
    status: "Review Required",
  },
];

const recentSubmissions = [
  { id: 1, student: "Arun Kumar", assignment: "AI Ethics Assignment", course: "CS402", date: "Sep 10, 2026", similarity: 46, status: "High Similarity" },
  { id: 2, student: "Meera Nair", assignment: "Search Algorithms Report", course: "CS402", date: "Sep 10, 2026", similarity: 8, status: "Completed" },
  { id: 3, student: "Priya Sharma", assignment: "Neural Networks Report", course: "CS420", date: "Sep 9, 2026", similarity: 38, status: "Review Required" },
  { id: 4, student: "Karthik Iyer", assignment: "Compiler Design Exercise", course: "CS315", date: "Sep 9, 2026", similarity: 14, status: "Completed" },
  { id: 5, student: "Divya Menon", assignment: "Cloud Architecture Report", course: "CS440", date: "Sep 8, 2026", similarity: 21, status: "Completed" },
  { id: 6, student: "Rohit Verma", assignment: "Database Design Proposal", course: "CS305", date: "Sep 8, 2026", similarity: 51, status: "High Similarity" },
];

const courseOverview = [
  { code: "CS402", name: "Artificial Intelligence", students: 42, submissions: 38, pendingReview: 4, similarityReviews: 7 },
  { code: "CS420", name: "Machine Learning", students: 35, submissions: 30, pendingReview: 3, similarityReviews: 5 },
  { code: "CS305", name: "Database Systems", students: 48, submissions: 44, pendingReview: 3, similarityReviews: 4 },
  { code: "CS310", name: "Operating Systems", students: 39, submissions: 33, pendingReview: 2, similarityReviews: 3 },
];

const similarityOverview = [
  { label: "Low Similarity", value: 65, color: "bg-green-500" },
  { label: "Moderate Similarity", value: 20, color: "bg-amber-500" },
  { label: "Review Required", value: 10, color: "bg-amber-500" },
  { label: "High Similarity", value: 5, color: "bg-red-500" },
];

const navItems = [
  { label: "Dashboard", icon: icons.dashboard, to: "/professor/dashboard" },
  { label: "Submissions", icon: icons.submissions, to: "/professor/submissions" },
  { label: "Reports", icon: icons.reports, to: "/professor/reports" },
  { label: "Courses", icon: icons.courses, to: "/professor/courses" },
  { label: "Profile", icon: icons.profile, to: "/professor/profile" },
  { label: "Settings", icon: icons.settings, to: "/professor/settings" },
];

const quickActions = [
  { label: "Review Submissions", description: "Open pending student submissions", to: "/professor/submissions", icon: icons.submissions },
  { label: "View Reports", description: "Open similarity reports", to: "/professor/reports", icon: icons.reports },
  { label: "View Courses", description: "See all courses you teach", to: "/professor/courses", icon: icons.courses },
];

/* ---------------------------------------------------------
   Small presentational helpers
--------------------------------------------------------- */
function StatusBadge({ status }) {
  const styles = {
    Completed: "bg-green-50 text-green-700 border-green-200",
    Processing: "bg-blue-50 text-blue-700 border-blue-200",
    "Review Required": "bg-amber-50 text-amber-700 border-amber-200",
    "High Similarity": "bg-red-50 text-red-700 border-red-200",
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
  const color =
    value < 20 ? "text-green-600" : value < 40 ? "text-amber-600" : "text-red-600";
  return <span className={`text-sm font-semibold ${color}`}>{value}%</span>;
}

export default function ProfessorDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          {professor.initials}
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
            <p className="text-xs text-emerald-400 mt-0.5">Professor Portal</p>
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
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
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
            <h1 className="text-xl font-semibold text-slate-900">Professor Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              Monitor student submissions and review academic integrity results.
            </p>
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              aria-label="Notifications"
              className="relative p-2 text-slate-500 hover:text-slate-800"
            >
              {icons.bell({ className: "h-5 w-5" })}
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-5">
              <div className="h-9 w-9 rounded-full bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center">
                {professor.initials}
              </div>
              <div className="text-sm">
                <p className="font-medium text-slate-900 leading-tight">{professor.name}</p>
                <p className="text-slate-500 leading-tight">{professor.email}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6">
          {/* Welcome section */}
          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-7 sm:px-8 sm:py-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Welcome back, Professor</h2>
              <p className="mt-1 text-sm text-slate-500 max-w-md">
                Review your students&apos; submissions and monitor similarity results.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-sm font-medium text-slate-600 whitespace-nowrap">
              Semester: 2026
            </span>
          </section>

          {/* Statistics */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {summaryStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-5">
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

          {/* Submissions requiring review */}
          <section className="rounded-2xl border border-amber-200 bg-amber-50/40">
            <div className="flex items-center justify-between px-6 py-5 border-b border-amber-200/70">
              <div className="flex items-center gap-2">
                {icons.flag({ className: "h-5 w-5 text-amber-600" })}
                <h3 className="text-base font-semibold text-slate-900">
                  Submissions Requiring Review
                </h3>
              </div>
              <Link
                to="/professor/submissions"
                className="text-sm font-medium text-emerald-500 hover:text-emerald-600"
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2 xl:grid-cols-4">
              {reviewRequired.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-4 flex flex-col gap-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.student}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.assignment}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{item.course}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <SimilarityValue value={item.similarity} />
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-slate-400">Submitted {item.date}</p>
                  <Link
                    to={`/professor/reports/${item.id}`}
                    className="mt-1 inline-flex items-center justify-center rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
                  >
                    Review Report
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* Recent submissions */}
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">Recent Submissions</h3>
              <Link
                to="/professor/submissions"
                className="text-sm font-medium text-emerald-500 hover:text-emerald-600"
              >
                View all
              </Link>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="px-6 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Assignment</th>
                    <th className="px-4 py-3 font-medium">Course</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium">Similarity</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSubmissions.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-6 py-4 text-slate-900 font-medium">{item.student}</td>
                      <td className="px-4 py-4 text-slate-600">{item.assignment}</td>
                      <td className="px-4 py-4 text-slate-600">{item.course}</td>
                      <td className="px-4 py-4 text-slate-600">{item.date}</td>
                      <td className="px-4 py-4">
                        <SimilarityValue value={item.similarity} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/professor/reports/${item.id}`}
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
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.student}</p>
                      <p className="text-xs text-slate-500">{item.assignment}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{item.course}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      <span>{item.date}</span>
                      <span className="mx-2">•</span>
                      <SimilarityValue value={item.similarity} />
                    </div>
                    <Link
                      to={`/professor/reports/${item.id}`}
                      className="text-sm font-medium text-emerald-500 hover:text-emerald-600"
                    >
                      View Report
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Course overview + Similarity overview */}
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white px-6 py-5">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Course Overview</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {courseOverview.map((course) => (
                  <div
                    key={course.code}
                    className="rounded-xl border border-slate-200 px-4 py-4 flex flex-col gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{course.code}</p>
                      <p className="text-xs text-slate-500">{course.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1.5 text-xs text-slate-500">
                      <span>Students</span>
                      <span className="text-right font-medium text-slate-800">{course.students}</span>
                      <span>Submissions</span>
                      <span className="text-right font-medium text-slate-800">{course.submissions}</span>
                      <span>Pending Review</span>
                      <span className="text-right font-medium text-slate-800">{course.pendingReview}</span>
                      <span>Similarity Reviews</span>
                      <span className="text-right font-medium text-slate-800">{course.similarityReviews}</span>
                    </div>
                    <Link
                      to="/professor/courses"
                      className="mt-1 text-sm font-medium text-emerald-500 hover:text-emerald-600"
                    >
                      View Course
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Similarity Overview</h3>
              <div className="space-y-4">
                {similarityOverview.map((row) => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-slate-600">{row.label}</span>
                      <span className="font-medium text-slate-800">{row.value}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${row.color}`}
                        style={{ width: `${row.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Academic review guidance */}
          <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-4 flex gap-3">
            <div className="text-emerald-500 flex-shrink-0">
              {icons.info({ className: "h-5 w-5" })}
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">Academic Review Guidance</p>
              <p className="mt-1 text-sm text-emerald-900/80 leading-relaxed">
                Similarity scores are indicators of matching content and should not be treated as
                automatic proof of plagiarism. Review the matched sources, context and assignment
                requirements before making an academic decision.
              </p>
            </div>
          </section>

          {/* Quick actions */}
          <section>
            <h3 className="text-base font-semibold text-slate-900 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  to={action.to}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-5 flex items-start gap-3 hover:border-emerald-400 hover:shadow-sm transition-all"
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
        </main>
      </div>
    </div>
  );
}