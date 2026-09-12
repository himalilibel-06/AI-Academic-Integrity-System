import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getProfessorSubmissions, updateReportReview } from "../service/api";

const sidebarItems = [
  { label: "Dashboard", href: "/professor/dashboard" },
  { label: "Submissions", href: "/professor/submissions" },
  { label: "Reports", href: "/professor/reports" },
  { label: "Courses", href: "/professor/courses" },
  { label: "Profile", href: "/professor/profile" },
  { label: "Settings", href: "/professor/settings" },
];

const statusStyles = {
  Completed: "bg-green-50 text-green-700 border border-green-200",
  Processing: "bg-blue-50 text-blue-700 border border-blue-200",
  "Review Required": "bg-amber-50 text-amber-700 border border-amber-200",
  "High Similarity": "bg-red-50 text-red-700 border border-red-200",
  Reviewed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

const statusDot = {
  Completed: "bg-green-500",
  Processing: "bg-blue-500",
  "Review Required": "bg-amber-500",
  "High Similarity": "bg-red-500",
  Reviewed: "bg-emerald-500",
};

function StatusBadge({ status }) {
  const badgeClass = statusStyles[status] || "bg-slate-50 text-slate-700 border border-slate-200";
  const dotClass = statusDot[status] || "bg-slate-400";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
      {status}
    </span>
  );
}

function similarityLevel(value) {
  if (value === null || value === undefined) return "Pending";
  if (value < 15) return "Low";
  if (value <= 40) return "Moderate";
  return "High";
}

const similarityBarColor = {
  Low: "bg-green-500",
  Moderate: "bg-amber-500",
  High: "bg-red-500",
  Pending: "bg-slate-300",
};

function SimilarityIndicator({ value }) {
  if (value === null || value === undefined) {
    return <span className="text-sm text-slate-400">Pending</span>;
  }
  const level = similarityLevel(value);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div
          className={`h-full rounded-full ${similarityBarColor[level]}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-sm text-slate-600">{value}% Similarity</span>
    </div>
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

export default function ReviewSubmissions() {
  const { logout } = useAuth();
  const [searchParams] = useSearchParams();
  const urlCourseId = searchParams.get("course_id");

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All Courses");
  const [similarityFilter, setSimilarityFilter] = useState("All Similarity Levels");
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadSubmissions = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getProfessorSubmissions(urlCourseId);
      if (data && Array.isArray(data.submissions)) {
        setSubmissions(data.submissions);
      } else {
        setError("Failed to load submissions from server.");
      }
    } catch (err) {
      setError(err.message || "Failed to load student submissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [urlCourseId]);

  const totalCount = submissions.length;
  const pendingCount = submissions.filter((s) => s.reviewStatus === "Pending" || s.raw_review_status === "pending" || s.raw_review_status === "review_required").length;
  const highSimilarityCount = submissions.filter((s) => s.status === "High Similarity" || (s.similarity && s.similarity > 40)).length;
  const reviewedCount = submissions.filter((s) => s.reviewStatus === "Reviewed" || s.raw_review_status === "reviewed" || s.raw_review_status === "approved").length;

  const courseOptions = useMemo(() => {
    const unique = new Set();
    submissions.forEach((s) => {
      if (s.course_display) unique.add(s.course_display);
      else if (s.course) unique.add(s.course);
    });
    return Array.from(unique);
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    const filtered = submissions.filter((submission) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        submission.student?.toLowerCase().includes(query) ||
        submission.assignment?.toLowerCase().includes(query) ||
        submission.course?.toLowerCase().includes(query) ||
        submission.course_code?.toLowerCase().includes(query) ||
        submission.filename?.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "All" || submission.status === statusFilter;

      const courseNameMatch =
        courseFilter === "All Courses" ||
        submission.course_display === courseFilter ||
        submission.course === courseFilter;

      const level = similarityLevel(submission.similarity);
      const matchesSimilarity =
        similarityFilter === "All Similarity Levels" ||
        (similarityFilter === "Low (<15%)" && level === "Low") ||
        (similarityFilter === "Moderate (15–40%)" && level === "Moderate") ||
        (similarityFilter === "High (>40%)" && level === "High");

      return matchesSearch && matchesStatus && courseNameMatch && matchesSimilarity;
    });

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        comparison = new Date(a.submitted_at || a.date) - new Date(b.submitted_at || b.date);
      } else if (sortField === "similarity") {
        const valA = a.similarity || 0;
        const valB = b.similarity || 0;
        comparison = valA - valB;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [submissions, search, statusFilter, courseFilter, similarityFilter, sortField, sortDirection]);

  const allVisibleSelected =
    filteredSubmissions.length > 0 &&
    filteredSubmissions.every((s) => selectedIds.includes(s.id));

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredSubmissions.some((s) => s.id === id)));
    } else {
      const visibleIds = filteredSubmissions.map((s) => s.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  }

  function toggleSelectOne(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  }

  async function markSelectedAsReviewed() {
    if (selectedIds.length === 0) return;
    setIsBulkUpdating(true);
    setActionMessage("");
    try {
      const selectedSubs = submissions.filter((s) => selectedIds.includes(s.id) && s.report_id);
      for (const item of selectedSubs) {
        await updateReportReview(item.report_id, {
          review_status: "reviewed",
          professor_feedback: "Bulk reviewed and acknowledged by instructor.",
        });
      }
      setActionMessage(`Successfully marked ${selectedSubs.length} submission(s) as reviewed.`);
      setSelectedIds([]);
      await loadSubmissions();
    } catch (err) {
      setError(err.message || "Failed to update review status.");
    } finally {
      setIsBulkUpdating(false);
      setTimeout(() => setActionMessage(""), 4000);
    }
  }

  function toggleSort(field) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setCourseFilter("All Courses");
    setSimilarityFilter("All Similarity Levels");
  }

  function SortButton({ field, children }) {
    const isActive = sortField === field;
    return (
      <button
        type="button"
        onClick={() => toggleSort(field)}
        className="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
      >
        {children}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3.5 w-3.5 transition-transform ${
            isActive && sortDirection === "asc" ? "rotate-180" : ""
          } ${isActive ? "text-emerald-600" : "text-slate-300"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    );
  }

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
            aria-controls="professor-sidebar"
            aria-label="Toggle navigation menu"
            className="rounded-md border border-slate-200 p-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Sidebar */}
        <aside
          id="professor-sidebar"
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
                const isActive = item.label === "Submissions";
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
            <Link to="/professor/dashboard" className="hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded">
              Professor Dashboard
            </Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-slate-700">Submissions</span>
          </nav>

          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Review Submissions</h1>
              <p className="mt-1 text-sm text-slate-500">
                View, analyze, and manage student submissions across your courses.
              </p>
            </div>
            {selectedIds.length > 0 && (
              <button
                type="button"
                disabled={isBulkUpdating}
                onClick={markSelectedAsReviewed}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50 transition"
              >
                {isBulkUpdating ? "Updating..." : `Mark ${selectedIds.length} Selected as Reviewed`}
              </button>
            )}
          </div>

          {/* Action / Error Banner */}
          {actionMessage && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              {actionMessage}
            </div>
          )}
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
              helper="Across your courses"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V18a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <SummaryCard
              label="Pending Review"
              value={pendingCount}
              helper="Awaiting review"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <SummaryCard
              label="High Similarity"
              value={highSimilarityCount}
              helper="Similarity > 40%"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m0 3.75h.007M4.5 4.5h15A2.25 2.25 0 0121.75 6.75v10.5A2.25 2.25 0 0119.5 19.5h-15A2.25 2.25 0 012.25 17.25V6.75A2.25 2.25 0 014.5 4.5z" />
                </svg>
              }
            />
            <SummaryCard
              label="Reviewed"
              value={reviewedCount}
              helper="Evaluated by instructor"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75l2.25 2.25 6-6M12 21a9 9 0 100-18 9 9 0 000 18z" />
                </svg>
              }
            />
          </div>

          {/* Filter bar */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="search-input" className="sr-only">Search submissions</label>
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                  </svg>
                  <input
                    id="search-input"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search student or assignment..."
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="status-filter" className="sr-only">Filter by status</label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value="All">All Statuses</option>
                  <option value="Processing">Processing</option>
                  <option value="Review Required">Review Required</option>
                  <option value="High Similarity">High Similarity</option>
                  <option value="Reviewed">Reviewed</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label htmlFor="course-filter" className="sr-only">Filter by course</label>
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

              <div>
                <label htmlFor="similarity-filter" className="sr-only">Filter by similarity</label>
                <select
                  id="similarity-filter"
                  value={similarityFilter}
                  onChange={(e) => setSimilarityFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value="All Similarity Levels">All Similarity Levels</option>
                  <option value="Low (<15%)">Low (&lt;15%)</option>
                  <option value="Moderate (15–40%)">Moderate (15–40%)</option>
                  <option value="High (>40%)">High (&gt;40%)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submissions table */}
          <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <svg className="h-8 w-8 animate-spin text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
                <p className="text-sm font-medium text-slate-700">No submissions found</p>
                <p className="mt-1 text-sm text-slate-400">
                  No students have submitted assignments for your courses yet.
                </p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-700">No matching submissions</p>
                <p className="mt-1 text-sm text-slate-400">
                  Try adjusting your search query or reset the filters.
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
                        <th scope="col" className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={toggleSelectAll}
                            aria-label="Select all visible submissions"
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </th>
                        <th scope="col" className="px-5 py-3 font-medium">Student</th>
                        <th scope="col" className="px-5 py-3 font-medium">Assignment</th>
                        <th scope="col" className="px-5 py-3 font-medium">Course</th>
                        <th scope="col" className="px-5 py-3 font-medium">
                          <SortButton field="date">Date</SortButton>
                        </th>
                        <th scope="col" className="px-5 py-3 font-medium">
                          <SortButton field="similarity">Similarity</SortButton>
                        </th>
                        <th scope="col" className="px-5 py-3 font-medium">Status</th>
                        <th scope="col" className="px-5 py-3 font-medium">Review</th>
                        <th scope="col" className="px-5 py-3 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSubmissions.map((submission) => {
                        const isSelected = selectedIds.includes(submission.id);
                        return (
                          <tr
                            key={submission.id}
                            className={`hover:bg-slate-50 ${isSelected ? "bg-emerald-50/40" : ""}`}
                          >
                            <td className="w-10 px-4 py-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectOne(submission.id)}
                                aria-label={`Select submission for ${submission.student}`}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-medium text-slate-800">{submission.student}</div>
                              {submission.student_email && (
                                <div className="text-xs text-slate-400">{submission.student_email}</div>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-medium text-slate-800">{submission.assignment}</div>
                              {submission.filename && (
                                <div className="text-xs text-slate-400">{submission.filename}</div>
                              )}
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {submission.course_display || submission.course}
                            </td>
                            <td className="px-5 py-4 text-slate-600">{submission.date}</td>
                            <td className="px-5 py-4">
                              <SimilarityIndicator value={submission.similarity} />
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge status={submission.status} />
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                submission.reviewStatus === "Reviewed"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}>
                                {submission.reviewStatus}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <Link
                                to={submission.report_id ? `/professor/reports/${submission.report_id}` : "/professor/reports"}
                                className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                View Report
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile stacked cards */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {filteredSubmissions.map((submission) => {
                    const isSelected = selectedIds.includes(submission.id);
                    return (
                      <div
                        key={submission.id}
                        className={`p-4 ${isSelected ? "bg-emerald-50/40" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(submission.id)}
                            aria-label={`Select submission for ${submission.student}`}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-slate-800">{submission.student}</p>
                                <p className="text-xs text-slate-500">{submission.assignment}</p>
                              </div>
                              <StatusBadge status={submission.status} />
                            </div>
                            <p className="mt-1 text-xs text-slate-400">
                              {submission.course_display || submission.course}
                            </p>
                            <div className="mt-3 flex items-center justify-between">
                              <SimilarityIndicator value={submission.similarity} />
                              <Link
                                to={submission.report_id ? `/professor/reports/${submission.report_id}` : "/professor/reports"}
                                className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                              >
                                View Report
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}