import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getProfessorCourses,
  createCourse,
  getCourseRoster,
  removeStudentFromRoster,
} from "../service/api";

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
  search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  ),
  plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  ),
  info: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 8v.01" strokeLinecap="round" />
    </svg>
  ),
  folder: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h4l2 2.5h7A1.5 1.5 0 0 1 20 9v8.5A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-11Z" strokeLinejoin="round" />
    </svg>
  ),
  emptyBox: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
      <path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z" strokeLinejoin="round" />
      <path d="M4 8.5V16l8 4.5 8-4.5V8.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 13v7.5" strokeLinecap="round" />
    </svg>
  ),
};

const navItems = [
  { label: "Dashboard", icon: icons.dashboard, to: "/professor/dashboard" },
  { label: "Submissions", icon: icons.submissions, to: "/professor/submissions" },
  { label: "Reports", icon: icons.reports, to: "/professor/reports" },
  { label: "Courses", icon: icons.courses, to: "/professor/courses" },
  { label: "Profile", icon: icons.profile, to: "/professor/profile" },
  { label: "Settings", icon: icons.settings, to: "/professor/settings" },
];

const filterOptions = ["All", "Active"];

function StatusBadge({ status }) {
  const styles = {
    Active: "bg-green-50 text-green-700 border-green-200",
    Completed: "bg-slate-100 text-slate-600 border-slate-200",
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
  const color = value < 20 ? "text-green-600" : value < 40 ? "text-amber-600" : "text-red-600";
  return <span className={`font-semibold ${color}`}>{value}%</span>;
}

export default function Courses() {
  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [formValues, setFormValues] = useState({ code: "", name: "", description: "" });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const loadCourses = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getProfessorCourses();
      if (data && Array.isArray(data.courses)) {
        setCourses(data.courses);
      } else {
        setError("Failed to load courses from server.");
      }
    } catch (err) {
      setError(err.message || "Failed to load courses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const professorInitials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "PR";

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesQuery =
        !query ||
        course.code?.toLowerCase().includes(query) ||
        course.name?.toLowerCase().includes(query) ||
        course.description?.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All" || course.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [courses, searchQuery, statusFilter]);

  const totals = useMemo(
    () => ({
      totalCourses: courses.length,
      totalStudents: courses.reduce((sum, c) => sum + (c.students || 0), 0),
      totalSubmissions: courses.reduce((sum, c) => sum + (c.submissions || 0), 0),
      pendingReviews: courses.reduce((sum, c) => sum + (c.pendingReviews || 0), 0),
    }),
    [courses]
  );

  const summaryStats = [
    { label: "Total Courses", value: totals.totalCourses, icon: icons.courses },
    { label: "Total Students", value: totals.totalStudents, icon: icons.profile },
    { label: "Total Submissions", value: totals.totalSubmissions, icon: icons.submissions },
    { label: "Pending Reviews", value: totals.pendingReviews, icon: icons.reports },
  ];

  const openModal = () => {
    setFormValues({ code: "", name: "", description: "" });
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormErrors({});
  };

  const handleFormChange = (field) => (e) => {
    setFormValues((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();

    const nextErrors = {};
    if (!formValues.code.trim()) {
      nextErrors.code = "Course code is required (e.g. CS405).";
    }
    if (!formValues.name.trim()) {
      nextErrors.name = "Course name is required.";
    }
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const res = await createCourse({
        code: formValues.code.trim(),
        name: formValues.name.trim(),
        description: formValues.description.trim(),
      });

      if (res && res.success) {
        setModalOpen(false);
        setSuccessMessage(res.message || "Course created successfully!");
        await loadCourses();
        setTimeout(() => setSuccessMessage(""), 4000);
      }
    } catch (err) {
      setFormErrors({ form: err.message || "Failed to create course." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Roster states and actions
  const [rosterModalCourse, setRosterModalCourse] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");
  const [rosterActionSuccess, setRosterActionSuccess] = useState("");
  const [studentToRemove, setStudentToRemove] = useState(null);
  const [isRemovingStudent, setIsRemovingStudent] = useState(false);

  const openRosterModal = async (course) => {
    setRosterModalCourse(course);
    setRosterLoading(true);
    setRosterError("");
    setRosterActionSuccess("");
    setStudentToRemove(null);
    try {
      const res = await getCourseRoster(course.id);
      setRoster(res?.roster || []);
    } catch (err) {
      setRosterError(err.message || "Failed to load course roster.");
    } finally {
      setRosterLoading(false);
    }
  };

  const closeRosterModal = () => {
    setRosterModalCourse(null);
    setRoster([]);
    setRosterError("");
    setRosterActionSuccess("");
    setStudentToRemove(null);
  };

  const confirmRemoveStudent = async () => {
    if (!studentToRemove || !rosterModalCourse) return;
    setIsRemovingStudent(true);
    setRosterError("");
    setRosterActionSuccess("");
    try {
      await removeStudentFromRoster(rosterModalCourse.id, studentToRemove.student_id);
      setRosterActionSuccess(`Removed ${studentToRemove.student_name} from course roster.`);
      setStudentToRemove(null);
      const res = await getCourseRoster(rosterModalCourse.id);
      setRoster(res?.roster || []);
      await loadCourses();
    } catch (err) {
      setRosterError(err.message || "Failed to remove student from course.");
    } finally {
      setIsRemovingStudent(false);
    }
  };

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
          {professorInitials}
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
            <span className="text-lg font-semibold text-white">
              Integrity<span className="text-emerald-400">Check</span>
            </span>
            <p className="text-xs text-slate-400 mt-0.5">Professor Courses</p>
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
        {/* Header */}
        <header className="hidden lg:flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Course Management</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your academic courses and view submission and enrollment analytics.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={openModal}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 shadow-sm transition"
            >
              {icons.plus({ className: "h-4 w-4" })}
              Add New Course
            </button>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6">
          {/* Success banner */}
          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
              {successMessage}
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p>{error}</p>
              <button
                type="button"
                onClick={loadCourses}
                className="ml-4 font-semibold underline hover:text-red-900"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Summary stats */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <p className="mt-1.5 text-2xl font-semibold text-slate-900">{stat.value}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-500">
                    {stat.icon({ className: "h-5 w-5" })}
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Controls bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                {icons.search({ className: "h-4 w-4" })}
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses by code or title..."
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openModal}
                className="lg:hidden inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 shadow-sm"
              >
                {icons.plus({ className: "h-4 w-4" })}
                Add Course
              </button>
            </div>
          </div>

          {/* Courses list */}
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <svg className="mx-auto h-8 w-8 animate-spin text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="mt-4 text-sm font-medium text-slate-700">Loading courses...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                {icons.courses({ className: "h-6 w-6" })}
              </div>
              <p className="text-sm font-semibold text-slate-900">No courses created yet</p>
              <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                Create your first academic course so students can select it when submitting assignments.
              </p>
              <button
                type="button"
                onClick={openModal}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition"
              >
                {icons.plus({ className: "h-4 w-4" })}
                Create First Course
              </button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-700">No courses match your search.</p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 text-sm font-medium text-emerald-600 hover:underline"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        {course.code}
                      </span>
                      <StatusBadge status={course.status} />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">{course.name}</h3>
                    <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {course.description || "No course description provided."}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-500 mb-4">
                      <span>Enrolled Students:</span>
                      <span className="text-right font-semibold text-slate-800">{course.students || 0}</span>
                      <span>Total Submissions:</span>
                      <span className="text-right font-semibold text-slate-800">{course.submissions || 0}</span>
                      <span>Pending Reviews:</span>
                      <span className="text-right font-semibold text-slate-800">{course.pendingReviews || 0}</span>
                      <span>Avg Similarity:</span>
                      <span className="text-right font-semibold text-slate-800">
                        <SimilarityValue value={course.averageSimilarity || 0} />
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to={`/professor/submissions?course_id=${course.id}`}
                        className="text-center rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                      >
                        Submissions
                      </Link>
                      <button
                        type="button"
                        onClick={() => openRosterModal(course)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        View Roster
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Course Roster Modal */}
          {rosterModalCourse && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
              <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Roster Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                        {rosterModalCourse.code}
                      </span>
                      <h3 className="text-base font-semibold text-slate-900">
                        {rosterModalCourse.name} — Course Roster
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Enrolled students, submission frequency, and academic integrity metrics.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeRosterModal}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                  >
                    {icons.close({ className: "h-5 w-5" })}
                  </button>
                </div>

                {/* Status Messages */}
                {rosterError && (
                  <div className="mx-6 mt-4 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200 flex items-center justify-between">
                    <span>{rosterError}</span>
                    <button
                      type="button"
                      onClick={() => setRosterError("")}
                      className="text-red-500 hover:text-red-700 font-bold"
                    >
                      &times;
                    </button>
                  </div>
                )}

                {rosterActionSuccess && (
                  <div className="mx-6 mt-4 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-800 border border-emerald-200 flex items-center justify-between">
                    <span>{rosterActionSuccess}</span>
                    <button
                      type="button"
                      onClick={() => setRosterActionSuccess("")}
                      className="text-emerald-600 hover:text-emerald-800 font-bold"
                    >
                      &times;
                    </button>
                  </div>
                )}

                {/* Roster Table Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {rosterLoading ? (
                    <div className="py-12 text-center">
                      <svg className="mx-auto h-8 w-8 animate-spin text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="mt-3 text-xs font-medium text-slate-600">Loading student roster...</p>
                    </div>
                  ) : roster.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">No students enrolled</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Students must enroll in this course from their student portal before submitting work.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                          <tr>
                            <th className="py-3 px-3 font-semibold">Student</th>
                            <th className="py-3 px-3 font-semibold">Enrollment Date</th>
                            <th className="py-3 px-3 font-semibold text-center">Submissions</th>
                            <th className="py-3 px-3 font-semibold text-center">Avg Similarity</th>
                            <th className="py-3 px-3 font-semibold text-center">Integrity Risk</th>
                            <th className="py-3 px-3 font-semibold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {roster.map((student) => {
                            const riskBadge =
                              student.risk_level === "high_risk"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : student.risk_level === "review_required"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200";

                            const riskLabel =
                              student.risk_level === "high_risk"
                                ? "High Risk"
                                : student.risk_level === "review_required"
                                ? "Review Required"
                                : "Safe";

                            return (
                              <tr key={student.student_id} className="hover:bg-slate-50 transition">
                                <td className="py-3 px-3 font-medium text-slate-900">
                                  <div>{student.student_name}</div>
                                  <div className="text-[11px] text-slate-400 font-normal">
                                    {student.student_email}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-slate-500">
                                  {student.enrollment_date
                                    ? new Date(student.enrollment_date).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })
                                    : "Recent"}
                                </td>
                                <td className="py-3 px-3 text-center font-semibold text-slate-800">
                                  {student.total_submissions}
                                </td>
                                <td className="py-3 px-3 text-center font-semibold">
                                  <span
                                    className={
                                      student.average_similarity > 40
                                        ? "text-red-600"
                                        : student.average_similarity >= 20
                                        ? "text-amber-600"
                                        : "text-emerald-600"
                                    }
                                  >
                                    {student.average_similarity}%
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span
                                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${riskBadge}`}
                                  >
                                    {riskLabel}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setStudentToRemove(student)}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-800 hover:underline"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Roster Footer */}
                <div className="border-t border-slate-200 px-6 py-3 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                  <span>Total Enrolled: {roster.length}</span>
                  <button
                    type="button"
                    onClick={closeRosterModal}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Remove Student Confirmation Dialog */}
          {studentToRemove && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
                <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="18" y1="8" x2="23" y2="13" />
                    <line x1="23" y1="8" x2="18" y2="13" />
                  </svg>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Remove Student from Course?
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Are you sure you want to remove{" "}
                    <span className="font-semibold text-slate-800">
                      {studentToRemove.student_name}
                    </span>{" "}
                    ({studentToRemove.student_email}) from{" "}
                    <span className="font-semibold text-slate-800">
                      {rosterModalCourse?.code} - {rosterModalCourse?.name}
                    </span>
                    ? The student will be unenrolled and will not be able to submit further assignments without re-enrolling.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isRemovingStudent}
                    onClick={() => setStudentToRemove(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isRemovingStudent}
                    onClick={confirmRemoveStudent}
                    className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
                  >
                    {isRemovingStudent ? "Removing..." : "Remove Student"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}