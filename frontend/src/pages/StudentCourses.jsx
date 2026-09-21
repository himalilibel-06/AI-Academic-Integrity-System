import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getStudentEnrolledCourses,
  getCourses,
  enrollInCourse,
  dropCourse,
} from "../service/api";

const icons = {
  dashboard: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  ),
  courses: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinejoin="round" />
      <path d="M8 7h8M8 11h5" strokeLinecap="round" />
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
  search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  ),
  trash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
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

function formatDate(dateStr) {
  if (!dateStr) return "Recently";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function StudentCourses() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data states
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [catalogCourses, setCatalogCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Tabs: 'enrolled' | 'browse'
  const [activeTab, setActiveTab] = useState("enrolled");
  const [searchQuery, setSearchQuery] = useState("");

  // Action states
  const [enrollingId, setEnrollingId] = useState(null);
  const [droppingCourse, setDroppingCourse] = useState(null);
  const [isDropping, setIsDropping] = useState(false);

  const initials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "ST";

  // Load enrolled courses and catalog courses
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [enrolledRes, catalogRes] = await Promise.all([
        getStudentEnrolledCourses(),
        getCourses(),
      ]);

      setEnrolledCourses(enrolledRes?.courses || []);
      setCatalogCourses(catalogRes?.courses || []);
    } catch (err) {
      setError(err.message || "Failed to load course information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick lookup set of enrolled course IDs
  const enrolledCourseIds = new Set(enrolledCourses.map((c) => c.id));

  // Handle Enroll
  const handleEnroll = async (course) => {
    setEnrollingId(course.id);
    setError(null);
    setSuccessMessage(null);
    try {
      await enrollInCourse(course.id);
      setSuccessMessage(`Successfully enrolled in ${course.code} - ${course.name}!`);
      await loadData();
    } catch (err) {
      setError(err.message || `Failed to enroll in ${course.code}.`);
    } finally {
      setEnrollingId(null);
    }
  };

  // Handle Drop Confirmation
  const confirmDrop = async () => {
    if (!droppingCourse) return;
    setIsDropping(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await dropCourse(droppingCourse.id);
      setSuccessMessage(`Successfully dropped course ${droppingCourse.code} - ${droppingCourse.name}.`);
      setDroppingCourse(null);
      await loadData();
    } catch (err) {
      setError(err.message || `Failed to drop ${droppingCourse.code}.`);
    } finally {
      setIsDropping(false);
    }
  };

  // Filter catalog courses
  const filteredCatalog = catalogCourses.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.code?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  });

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
          {initials}
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
            const isActive = item.label === "Courses";
            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-emerald-500 text-white font-medium"
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
        {/* Top desktop header */}
        <header className="hidden lg:flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Course Management</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your enrolled courses or browse institutional offerings to enroll.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center">
              {initials}
            </div>
            <div className="text-sm">
              <p className="font-medium text-slate-900 leading-tight">{user?.name || "Student"}</p>
              <p className="text-slate-500 leading-tight">{user?.email}</p>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6">
          {/* Notifications */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700 ml-4 font-semibold"
              >
                Dismiss
              </button>
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center justify-between">
              <span>{successMessage}</span>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-600 hover:text-emerald-800 ml-4 font-semibold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Tab navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("enrolled")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "enrolled"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>My Enrolled Courses</span>
                <span
                  className={`inline-flex items-center justify-center px-2 py-0.5 text-xs rounded-full font-semibold ${
                    activeTab === "enrolled"
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {enrolledCourses.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("browse")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "browse"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>Browse Catalog</span>
                <span
                  className={`inline-flex items-center justify-center px-2 py-0.5 text-xs rounded-full font-semibold ${
                    activeTab === "browse"
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {catalogCourses.length}
                </span>
              </button>
            </div>

            {/* Browse Search Input */}
            {activeTab === "browse" && (
              <div className="relative max-w-xs w-full">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  {icons.search({ className: "h-4 w-4" })}
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search course code or name..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse space-y-4"
                >
                  <div className="h-5 bg-slate-200 rounded w-1/3" />
                  <div className="h-6 bg-slate-200 rounded w-3/4" />
                  <div className="h-12 bg-slate-100 rounded" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Tab 1: My Enrolled Courses */}
          {!loading && activeTab === "enrolled" && (
            <div>
              {enrolledCourses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                    {icons.courses({ className: "h-6 w-6" })}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">No Enrolled Courses</h3>
                  <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                    You have not enrolled in any academic courses yet. Browse the course catalog to enroll and submit assignments.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("browse")}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                  >
                    {icons.plus({ className: "h-4 w-4" })}
                    Browse Course Catalog
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {enrolledCourses.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-slate-300 transition"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {c.code}
                          </span>
                          <span className="text-xs text-slate-400">
                            Enrolled {formatDate(c.enrolled_at)}
                          </span>
                        </div>

                        <h3 className="text-lg font-semibold text-slate-900 mt-3 leading-snug">
                          {c.name}
                        </h3>

                        <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                          {c.description || "No description provided."}
                        </p>

                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Instructor:</span>
                            <span className="font-medium text-slate-800 truncate max-w-[180px]">
                              {c.professor_name || "Faculty Instructor"}
                            </span>
                          </div>
                          {c.professor_email && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Email:</span>
                              <span className="text-slate-600 truncate max-w-[180px]">
                                {c.professor_email}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Submissions:</span>
                            <span className="font-semibold text-emerald-600">
                              {c.submission_count} submitted
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                        <Link
                          to="/student/upload"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          {icons.upload({ className: "h-3.5 w-3.5" })}
                          Upload Work
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDroppingCourse(c)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                        >
                          {icons.trash({ className: "h-3.5 w-3.5" })}
                          Drop Course
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Browse Catalog */}
          {!loading && activeTab === "browse" && (
            <div>
              {filteredCatalog.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-4">
                    {icons.search({ className: "h-6 w-6" })}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">No Courses Found</h3>
                  <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                    {searchQuery
                      ? `No courses matched your search for "${searchQuery}".`
                      : "There are currently no courses available in the catalog."}
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="mt-4 text-xs font-semibold text-emerald-600 hover:underline"
                    >
                      Clear search filter
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredCatalog.map((c) => {
                    const isEnrolled = enrolledCourseIds.has(c.id);
                    const isSubmitting = enrollingId === c.id;

                    return (
                      <div
                        key={c.id}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-slate-300 transition"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {c.code}
                            </span>
                            {isEnrolled ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {icons.check({ className: "h-3 w-3" })}
                                Enrolled
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                Available
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg font-semibold text-slate-900 mt-3 leading-snug">
                            {c.name}
                          </h3>

                          <p className="text-xs text-slate-500 mt-2 line-clamp-3">
                            {c.description || "Comprehensive academic syllabus and learning objectives."}
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100">
                          {isEnrolled ? (
                            <button
                              type="button"
                              disabled
                              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400 cursor-default"
                            >
                              {icons.check({ className: "h-3.5 w-3.5 text-emerald-500" })}
                              Already Enrolled
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleEnroll(c)}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
                            >
                              {isSubmitting ? (
                                <span>Enrolling...</span>
                              ) : (
                                <>
                                  {icons.plus({ className: "h-3.5 w-3.5" })}
                                  Enroll in Course
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Confirmation Modal for Dropping Course */}
      {droppingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              {icons.trash({ className: "h-5 w-5" })}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Drop Course</h3>
              <p className="mt-1 text-sm text-slate-500">
                Are you sure you want to drop{" "}
                <span className="font-semibold text-slate-800">
                  {droppingCourse.code} - {droppingCourse.name}
                </span>
                ? You will not be able to submit new assignments for this course unless you re-enroll.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDropping}
                onClick={() => setDroppingCourse(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDropping}
                onClick={confirmDrop}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
              >
                {isDropping ? "Dropping..." : "Confirm Drop"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
