import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getStudentSubmissions } from "../service/api";

const sidebarItems = [
  { label: "Dashboard", href: "/student/dashboard" },
  { label: "Courses", href: "/student/courses" },
  { label: "Upload Submission", href: "/student/upload" },
  { label: "My Submissions", href: "/student/submissions" },
  { label: "Reports", href: "/student/reports" },
  { label: "Profile", href: "/student/profile" },
  { label: "Settings", href: "/student/settings" },
];

const statusStyles = {
  Completed: "bg-green-50 text-green-700 border border-green-200",
  Processing: "bg-blue-50 text-blue-700 border border-blue-200",
  "Review Required": "bg-amber-50 text-amber-700 border border-amber-200",
};

const statusDot = {
  Completed: "bg-green-500",
  Processing: "bg-blue-500",
  "Review Required": "bg-amber-500",
};

function StatusBadge({ status }) {
  const badgeClass = statusStyles[status] || "bg-slate-50 text-slate-700 border border-slate-200";
  const dotClass = statusDot[status] || "bg-slate-400";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dotClass}`}
        aria-hidden="true"
      />
      {status}
    </span>
  );
}

function SummaryCard({ label, value, helper, icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          {helper && <p className="mt-1 text-xs text-slate-400">{helper}</p>}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function MySubmissions() {
  const { user, logout } = useAuth();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All Courses");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const loadSubmissions = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getStudentSubmissions();
      if (data && Array.isArray(data.submissions)) {
        setSubmissions(data.submissions);
      } else {
        setError("Invalid response format received from server.");
      }
    } catch (err) {
      setError(err.message || "Failed to load your submissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  // Compute live summary statistics
  const totalCount = submissions.length;
  const completedCount = submissions.filter((s) => s.status === "Completed").length;
  const processingCount = submissions.filter((s) => s.status === "Processing").length;
  const reviewCount = submissions.filter((s) => s.status === "Review Required").length;

  // Extract unique course names for dropdown
  const courseOptions = useMemo(() => {
    const unique = new Set();
    submissions.forEach((s) => {
      if (s.course) unique.add(s.course);
    });
    return Array.from(unique);
  }, [submissions]);

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        submission.title?.toLowerCase().includes(q) ||
        submission.course?.toLowerCase().includes(q) ||
        submission.course_code?.toLowerCase().includes(q) ||
        submission.filename?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" || submission.status === statusFilter;

      const matchesCourse =
        courseFilter === "All Courses" || submission.course === courseFilter;

      return matchesSearch && matchesStatus && matchesCourse;
    });
  }, [submissions, search, statusFilter, courseFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, courseFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / itemsPerPage));
  const paginatedSubmissions = filteredSubmissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setCourseFilter("All Courses");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        {/* Mobile top bar */}
        <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <span className="text-lg font-semibold text-slate-900">
            Integrity<span className="text-emerald-600">Check</span>
          </span>
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-expanded={sidebarOpen}
            aria-controls="student-sidebar"
            aria-label="Toggle navigation menu"
            className="rounded-md border border-slate-200 p-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Sidebar */}
        <aside
          id="student-sidebar"
          className={`fixed inset-y-0 left-0 z-20 w-64 transform border-r border-slate-800 bg-[#0F172A] transition-transform duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } pt-16 lg:pt-0`}
        >
          <div className="flex h-full flex-col">
            <div className="hidden border-b border-slate-800 px-6 py-5 lg:block">
              <span className="text-lg font-semibold text-white">
                Integrity<span className="text-emerald-400">Check</span>
              </span>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
              {sidebarItems.map((item) => {
                const isActive = item.label === "My Submissions";
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isActive
                        ? "bg-emerald-500 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-slate-800 px-3 py-4">
              <button
                type="button"
                onClick={logout}
                className="w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-10 bg-slate-900/30 lg:hidden"
          />
        )}

        {/* Main content */}
        <main className="min-h-screen w-full flex-1 px-4 pb-12 pt-20 sm:px-6 lg:px-10 lg:pt-10">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-3 text-sm text-slate-500">
            <Link to="/student/dashboard" className="hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded">
              Student Dashboard
            </Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-slate-700">My Submissions</span>
          </nav>

          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">My Submissions</h1>
              <p className="mt-1 text-sm text-slate-500">
                View and track all your submitted assignments and analysis status.
              </p>
            </div>
            <Link
              to="/student/upload"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload New Assignment
            </Link>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p>{error}</p>
              <button
                type="button"
                onClick={loadSubmissions}
                className="ml-4 font-semibold underline hover:text-red-900"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Summary cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Total Submissions"
              value={totalCount}
              helper="All time"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V18a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <SummaryCard
              label="Completed"
              value={completedCount}
              helper="Analysis finished"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75l2.25 2.25 6-6M12 21a9 9 0 100-18 9 9 0 000 18z" />
                </svg>
              }
            />
            <SummaryCard
              label="Processing"
              value={processingCount}
              helper="In progress"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <SummaryCard
              label="Review Required"
              value={reviewCount}
              helper="Needs your attention"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m0 3.75h.007M4.5 4.5h15A2.25 2.25 0 0121.75 6.75v10.5A2.25 2.25 0 0119.5 19.5h-15A2.25 2.25 0 012.25 17.25V6.75A2.25 2.25 0 014.5 4.5z" />
                </svg>
              }
            />
          </div>

          {/* Filter bar */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="submission-search" className="sr-only">
                  Search submissions
                </label>
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                  </svg>
                  <input
                    id="submission-search"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search submissions by title or code..."
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="status-filter" className="sr-only">
                  Filter by status
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value="All">All Statuses</option>
                  <option value="Completed">Completed</option>
                  <option value="Processing">Processing</option>
                  <option value="Review Required">Review Required</option>
                </select>
              </div>

              <div>
                <label htmlFor="course-filter" className="sr-only">
                  Filter by course
                </label>
                <select
                  id="course-filter"
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value="All Courses">All Courses</option>
                  {courseOptions.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Submissions table / content */}
          <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <svg
                  className="h-8 w-8 animate-spin text-emerald-600"
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
                <p className="mt-4 text-sm font-medium text-slate-700">Loading submissions...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V18a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-700">No submissions yet</p>
                <p className="mt-1 text-sm text-slate-400">
                  You haven&apos;t submitted any assignments yet. Submit an academic document to get started.
                </p>
                <Link
                  to="/student/upload"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition"
                >
                  Upload First Assignment
                </Link>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-700">No submissions found</p>
                <p className="mt-1 text-sm text-slate-400">
                  Try adjusting your search query or reset your filters.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                {/* Desktop / tablet table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-5 py-3 font-medium">Assignment</th>
                        <th scope="col" className="px-5 py-3 font-medium">Course</th>
                        <th scope="col" className="px-5 py-3 font-medium">Submitted Date</th>
                        <th scope="col" className="px-5 py-3 font-medium">Status</th>
                        <th scope="col" className="px-5 py-3 font-medium">Similarity</th>
                        <th scope="col" className="px-5 py-3 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedSubmissions.map((submission) => (
                        <tr key={submission.id} className="hover:bg-slate-50">
                          <td className="px-5 py-4 font-medium text-slate-800">
                            <div>{submission.title}</div>
                            {submission.filename && (
                              <div className="text-xs text-slate-400 mt-0.5">{submission.filename}</div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {submission.course_code ? `${submission.course_code} - ` : ""}{submission.course}
                          </td>
                          <td className="px-5 py-4 text-slate-600">{submission.date}</td>
                          <td className="px-5 py-4">
                            <StatusBadge status={submission.status} />
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {submission.similarity !== null && submission.similarity !== undefined
                              ? `${submission.similarity}% Similarity`
                              : "—"}
                          </td>
                          <td className="px-5 py-4">
                            {submission.report_id ? (
                              <Link
                                to={`/student/reports/${submission.report_id}`}
                                className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                View Report
                              </Link>
                            ) : (
                              <span className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400">
                                {submission.status === "Processing" ? "Processing..." : "Pending"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile stacked cards */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {paginatedSubmissions.map((submission) => (
                    <div key={submission.id} className="px-4 py-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {submission.title}
                          </p>
                          {submission.filename && (
                            <p className="text-xs text-slate-400 mt-0.5">{submission.filename}</p>
                          )}
                        </div>
                        <StatusBadge status={submission.status} />
                      </div>
                      <p className="text-xs text-slate-500">
                        {submission.course_code ? `${submission.course_code} - ` : ""}{submission.course}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                          <p>{submission.date}</p>
                          <p className="mt-0.5">
                            {submission.similarity !== null && submission.similarity !== undefined
                              ? `${submission.similarity}% Similarity`
                              : "Similarity pending"}
                          </p>
                        </div>
                        {submission.report_id ? (
                          <Link
                            to={`/student/reports/${submission.report_id}`}
                            className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            View Report
                          </Link>
                        ) : (
                          <span className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400">
                            {submission.status === "Processing" ? "Processing..." : "Pending"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Pagination */}
          {filteredSubmissions.length > itemsPerPage && (
            <div className="mb-6 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  aria-current={currentPage === pageNum ? "page" : undefined}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    currentPage === pageNum
                      ? "border border-emerald-500 bg-emerald-500 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Next
              </button>
            </div>
          )}

          {/* Information box */}
          <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-slate-800">About Similarity Scores</p>
              <p className="mt-1 text-sm text-slate-600">
                Similarity scores indicate the amount of matching content detected against the available reference material. A similarity score alone does not prove plagiarism. Reports are provided to support academic review.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}