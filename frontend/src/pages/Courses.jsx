import { useState, useMemo } from "react";
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

/* ---------------------------------------------------------
   Mock data — replace with API data once the backend is live
--------------------------------------------------------- */
const professor = { name: "Dr. Anitha Kumar", initials: "AK" };

const initialCourses = [
  {
    id: 1,
    code: "CS402",
    name: "Artificial Intelligence",
    description: "Introduction to artificial intelligence, intelligent agents and machine learning.",
    students: 42,
    submissions: 38,
    pendingReviews: 4,
    averageSimilarity: 18,
    status: "Active",
  },
  {
    id: 2,
    code: "CS420",
    name: "Machine Learning",
    description: "Supervised and unsupervised learning techniques with applied case studies.",
    students: 35,
    submissions: 30,
    pendingReviews: 3,
    averageSimilarity: 22,
    status: "Active",
  },
  {
    id: 3,
    code: "CS305",
    name: "Database Systems",
    description: "Relational database design, normalization and query optimization.",
    students: 48,
    submissions: 44,
    pendingReviews: 3,
    averageSimilarity: 11,
    status: "Active",
  },
  {
    id: 4,
    code: "CS310",
    name: "Operating Systems",
    description: "Process management, memory management and file systems fundamentals.",
    students: 39,
    submissions: 33,
    pendingReviews: 2,
    averageSimilarity: 9,
    status: "Completed",
  },
];

const navItems = [
  { label: "Dashboard", icon: icons.dashboard, to: "/professor/dashboard" },
  { label: "Submissions", icon: icons.submissions, to: "/professor/submissions" },
  { label: "Reports", icon: icons.reports, to: "/professor/reports" },
  { label: "Courses", icon: icons.courses, to: "/professor/courses" },
  { label: "Profile", icon: icons.profile, to: "/professor/profile" },
  { label: "Settings", icon: icons.settings, to: "/professor/settings" },
];

const filterOptions = ["All", "Active", "Completed"];

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [courses, setCourses] = useState(initialCourses);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [formValues, setFormValues] = useState({ code: "", name: "", description: "" });
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesQuery =
        !query ||
        course.code.toLowerCase().includes(query) ||
        course.name.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All" || course.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [courses, searchQuery, statusFilter]);

  const totals = useMemo(
    () => ({
      totalCourses: courses.length,
      totalStudents: courses.reduce((sum, c) => sum + c.students, 0),
      totalSubmissions: courses.reduce((sum, c) => sum + c.submissions, 0),
      pendingReviews: courses.reduce((sum, c) => sum + c.pendingReviews, 0),
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

  const handleCreateCourse = (e) => {
    e.preventDefault();

    const nextErrors = {};
    if (!formValues.code.trim()) {
      nextErrors.code = "Course code is required.";
    }
    if (!formValues.name.trim()) {
      nextErrors.name = "Course name is required.";
    }
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    // NOTE: local state only — no backend call. Replace with a POST to
    // FastAPI's /courses endpoint once the backend is connected.
    const newCourse = {
      id: courses.length ? Math.max(...courses.map((c) => c.id)) + 1 : 1,
      code: formValues.code.trim(),
      name: formValues.name.trim(),
      description: formValues.description.trim() || "No description provided.",
      students: 0,
      submissions: 0,
      pendingReviews: 0,
      averageSimilarity: 0,
      status: "Active",
    };

    setCourses((prev) => [...prev, newCourse]);
    setModalOpen(false);
    setSuccessMessage("Course created successfully (demo mode).");
    setTimeout(() => setSuccessMessage(""), 3000);
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
            const isActive = item.label === "Courses";
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
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6">
          {/* Breadcrumb + header */}
          <div>
            <p className="text-xs text-slate-500">
              Professor Dashboard <span className="mx-1">/</span> Courses
            </p>
            <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">My Courses</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Manage your courses and monitor student submission activity.
                </p>
              </div>
              <button
                type="button"
                onClick={openModal}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors whitespace-nowrap"
              >
                {icons.plus({ className: "h-4 w-4" })}
                Create Course
              </button>
            </div>
          </div>

          {/* Success message */}
          {successMessage && (
            <div
              role="status"
              className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700"
            >
              {successMessage}
            </div>
          )}

          {/* Statistics */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              </div>
            ))}
          </section>

          {/* Similarity explanation */}
          <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-4 flex gap-3">
            <div className="text-emerald-500 flex-shrink-0">
              {icons.info({ className: "h-5 w-5" })}
            </div>
            <p className="text-sm text-emerald-900 leading-relaxed">
              Average similarity represents the average matching-content score across submitted
              documents. It does not indicate confirmed plagiarism.
            </p>
          </section>

          {/* Search + filter */}
          <section className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                {icons.search({ className: "h-4 w-4" })}
              </span>
              <label htmlFor="course-search" className="sr-only">
                Search courses
              </label>
              <input
                id="course-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
              {filterOptions.map((option) => {
                const isActive = statusFilter === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setStatusFilter(option)}
                    aria-pressed={isActive}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-emerald-500 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Course cards */}
          {filteredCourses.length > 0 ? (
            <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-5 flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-emerald-50 p-2 text-emerald-500 flex-shrink-0">
                        {icons.folder({ className: "h-5 w-5" })}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{course.code}</p>
                        <p className="text-xs text-slate-500">{course.name}</p>
                      </div>
                    </div>
                    <StatusBadge status={course.status} />
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">{course.description}</p>

                  <div className="grid grid-cols-2 gap-y-2 text-sm border-t border-slate-100 pt-3">
                    <span className="text-slate-500">Students</span>
                    <span className="text-right font-medium text-slate-800">{course.students}</span>
                    <span className="text-slate-500">Submissions</span>
                    <span className="text-right font-medium text-slate-800">{course.submissions}</span>
                    <span className="text-slate-500">Pending Reviews</span>
                    <span className="text-right font-medium text-slate-800">{course.pendingReviews}</span>
                    <span className="text-slate-500">Average Similarity</span>
                    <span className="text-right">
                      <SimilarityValue value={course.averageSimilarity} />
                    </span>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-500 hover:bg-emerald-50 transition-colors"
                  >
                    View Course
                  </button>
                </div>
              ))}
            </section>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white px-6 py-16 flex flex-col items-center text-center">
              <div className="rounded-full bg-slate-100 p-3 text-slate-400">
                {icons.emptyBox({ className: "h-7 w-7" })}
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900">No courses found</p>
              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or filters.
              </p>
            </section>
          )}
        </main>
      </div>

      {/* Create Course modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-course-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white px-6 py-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 id="create-course-title" className="text-lg font-semibold text-slate-900">
                Create Course
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close create course dialog"
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                {icons.close({ className: "h-5 w-5" })}
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleCreateCourse} noValidate>
              <div>
                <label htmlFor="course-code" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Course Code
                </label>
                <input
                  id="course-code"
                  type="text"
                  value={formValues.code}
                  onChange={handleFormChange("code")}
                  placeholder="e.g. CS405"
                  aria-invalid={Boolean(formErrors.code)}
                  aria-describedby={formErrors.code ? "course-code-error" : undefined}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${
                    formErrors.code ? "border-red-400" : "border-slate-300 focus:border-emerald-500"
                  }`}
                />
                {formErrors.code && (
                  <p id="course-code-error" className="mt-1.5 text-sm text-red-600">
                    {formErrors.code}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="course-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Course Name
                </label>
                <input
                  id="course-name"
                  type="text"
                  value={formValues.name}
                  onChange={handleFormChange("name")}
                  placeholder="e.g. Natural Language Processing"
                  aria-invalid={Boolean(formErrors.name)}
                  aria-describedby={formErrors.name ? "course-name-error" : undefined}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${
                    formErrors.name ? "border-red-400" : "border-slate-300 focus:border-emerald-500"
                  }`}
                />
                {formErrors.name && (
                  <p id="course-name-error" className="mt-1.5 text-sm text-red-600">
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="course-description" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  id="course-description"
                  rows={3}
                  value={formValues.description}
                  onChange={handleFormChange("description")}
                  placeholder="Enter a short course description"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}