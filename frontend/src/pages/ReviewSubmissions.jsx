import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

const initialSubmissions = [
  {
    id: 1,
    student: "Arun Kumar",
    assignment: "AI Ethics Assignment",
    course: "CS402 - Artificial Intelligence",
    date: "Sep 10, 2026",
    similarity: 46,
    status: "High Similarity",
    reviewStatus: "Pending",
  },
  {
    id: 2,
    student: "Priya Sharma",
    assignment: "Neural Network Architectures Report",
    course: "CS401 - Machine Learning",
    date: "Sep 9, 2026",
    similarity: 12,
    status: "Completed",
    reviewStatus: "Reviewed",
  },
  {
    id: 3,
    student: "Karthik Raghavan",
    assignment: "Normalization Techniques Essay",
    course: "CS403 - Database Management",
    date: "Sep 8, 2026",
    similarity: 24,
    status: "Review Required",
    reviewStatus: "Pending",
  },
  {
    id: 4,
    student: "Divya Menon",
    assignment: "Routing Protocols Case Study",
    course: "CS404 - Computer Networks",
    date: "Sep 6, 2026",
    similarity: 8,
    status: "Completed",
    reviewStatus: "Reviewed",
  },
  {
    id: 5,
    student: "Rahul Verma",
    assignment: "Knowledge Representation Assignment",
    course: "CS402 - Artificial Intelligence",
    date: "Sep 5, 2026",
    similarity: 52,
    status: "High Similarity",
    reviewStatus: "Pending",
  },
  {
    id: 6,
    student: "Sneha Iyer",
    assignment: "Supervised Learning Models Summary",
    course: "CS401 - Machine Learning",
    date: "Sep 4, 2026",
    similarity: 31,
    status: "Review Required",
    reviewStatus: "Pending",
  },
  {
    id: 7,
    student: "Vikram Nair",
    assignment: "Query Optimization Report",
    course: "CS403 - Database Management",
    date: "Sep 2, 2026",
    similarity: 18,
    status: "Reviewed",
    reviewStatus: "Reviewed",
  },
  {
    id: 8,
    student: "Ananya Das",
    assignment: "Network Security Fundamentals",
    course: "CS404 - Computer Networks",
    date: "Aug 30, 2026",
    similarity: 39,
    status: "Processing",
    reviewStatus: "Pending",
  },
];

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
  Reviewed: "bg-slate-100 text-emerald-700 border border-slate-200",
};

const statusDot = {
  Completed: "bg-green-500",
  Processing: "bg-blue-500",
  "Review Required": "bg-amber-500",
  "High Similarity": "bg-red-500",
  Reviewed: "bg-emerald-500",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${statusDot[status]}`} aria-hidden="true" />
      {status}
    </span>
  );
}

function similarityLevel(value) {
  if (value < 15) return "Low";
  if (value <= 40) return "Moderate";
  return "High";
}

const similarityBarColor = {
  Low: "bg-green-500",
  Moderate: "bg-amber-500",
  High: "bg-red-500",
};

function SimilarityIndicator({ value }) {
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
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All Courses");
  const [similarityFilter, setSimilarityFilter] = useState("All Similarity Levels");
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const totalCount = submissions.length;
  const pendingCount = submissions.filter((s) => s.reviewStatus === "Pending").length;
  const highSimilarityCount = submissions.filter((s) => s.status === "High Similarity").length;
  const reviewedCount = submissions.filter((s) => s.reviewStatus === "Reviewed").length;

  const filteredSubmissions = useMemo(() => {
    const filtered = submissions.filter((submission) => {
      const query = search.toLowerCase();
      const matchesSearch =
        submission.student.toLowerCase().includes(query) ||
        submission.assignment.toLowerCase().includes(query) ||
        submission.course.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "All" || submission.status === statusFilter;

      const matchesCourse = courseFilter === "All Courses" || submission.course === courseFilter;

      const level = similarityLevel(submission.similarity);
      const matchesSimilarity =
        similarityFilter === "All Similarity Levels" ||
        (similarityFilter === "Low (<15%)" && level === "Low") ||
        (similarityFilter === "Moderate (15–40%)" && level === "Moderate") ||
        (similarityFilter === "High (>40%)" && level === "High");

      return matchesSearch && matchesStatus && matchesCourse && matchesSimilarity;
    });

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        comparison = new Date(a.date) - new Date(b.date);
      } else if (sortField === "similarity") {
        comparison = a.similarity - b.similarity;
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

  function markSelectedAsReviewed() {
    setSubmissions((prev) =>
      prev.map((s) =>
        selectedIds.includes(s.id)
          ? { ...s, reviewStatus: "Reviewed", status: s.status === "High Similarity" ? "Reviewed" : s.status }
          : s
      )
    );
    setSelectedIds([]);
  }

  function toggleSort(field) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
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
              <p className="mt-0.5 text-xs text-slate-400">Professor Portal</p>
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
              <Link
                to="/logout"
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Logout
              </Link>
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
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Review Submissions</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Review student assignments and identify submissions that may require academic integrity review.
              </p>
            </div>
            <Link
              to="/professor/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Dashboard
            </Link>
          </div>

          {/* Summary cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Total Submissions"
              value={128}
              helper="All courses"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V18a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <SummaryCard
              label="Pending Review"
              value={12}
              helper="Awaiting action"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <SummaryCard
              label="High Similarity"
              value={4}
              helper="Flagged for review"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m0 3.75h.007M4.5 4.5h15A2.25 2.25 0 0121.75 6.75v10.5A2.25 2.25 0 0119.5 19.5h-15A2.25 2.25 0 012.25 17.25V6.75A2.25 2.25 0 014.5 4.5z" />
                </svg>
              }
            />
            <SummaryCard
              label="Completed Review"
              value={89}
              helper="Reviewed by faculty"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75l2.25 2.25 6-6M12 21a9 9 0 100-18 9 9 0 000 18z" />
                </svg>
              }
            />
          </div>

          {/* Filter bar */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
              <div className="lg:col-span-1">
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
                    placeholder="Search by student, assignment or course..."
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
                  <option value="Processing">Processing</option>
                  <option value="Completed">Completed</option>
                  <option value="Review Required">Review Required</option>
                  <option value="High Similarity">High Similarity</option>
                  <option value="Reviewed">Reviewed</option>
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
                  <option value="CS401 - Machine Learning">CS401 - Machine Learning</option>
                  <option value="CS402 - Artificial Intelligence">CS402 - Artificial Intelligence</option>
                  <option value="CS403 - Database Management">CS403 - Database Management</option>
                  <option value="CS404 - Computer Networks">CS404 - Computer Networks</option>
                </select>
              </div>

              <div>
                <label htmlFor="similarity-filter" className="sr-only">
                  Filter by similarity level
                </label>
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

          {/* Selection toolbar */}
          {selectedIds.length > 0 && (
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-emerald-800">
                {selectedIds.length} submission{selectedIds.length > 1 ? "s" : ""} selected
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={markSelectedAsReviewed}
                  className="inline-flex items-center rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  Mark as Reviewed
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Submissions table */}
          <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {filteredSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-700">No submissions found</p>
                <p className="mt-1 text-sm text-slate-400">Try changing your search or filters.</p>
              </div>
            ) : (
              <>
                {/* Desktop / tablet table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-medium">
                          <label className="sr-only" htmlFor="select-all">
                            Select all submissions
                          </label>
                          <input
                            id="select-all"
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                          />
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">Student</th>
                        <th scope="col" className="px-4 py-3 font-medium">Assignment</th>
                        <th scope="col" className="px-4 py-3 font-medium">Course</th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          <SortButton field="date">Submitted Date</SortButton>
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          <SortButton field="similarity">Similarity</SortButton>
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">Status</th>
                        <th scope="col" className="px-4 py-3 font-medium">Review</th>
                        <th scope="col" className="px-4 py-3 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSubmissions.map((submission) => (
                        <tr key={submission.id} className="hover:bg-slate-50">
                          <td className="px-4 py-4">
                            <label className="sr-only" htmlFor={`select-${submission.id}`}>
                              Select submission by {submission.student}
                            </label>
                            <input
                              id={`select-${submission.id}`}
                              type="checkbox"
                              checked={selectedIds.includes(submission.id)}
                              onChange={() => toggleSelectOne(submission.id)}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-4 font-medium text-slate-800">{submission.student}</td>
                          <td className="px-4 py-4 text-slate-600">{submission.assignment}</td>
                          <td className="px-4 py-4 text-slate-600">{submission.course}</td>
                          <td className="px-4 py-4 text-slate-600">{submission.date}</td>
                          <td className="px-4 py-4">
                            <SimilarityIndicator value={submission.similarity} />
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge status={submission.status} />
                          </td>
                          <td className="px-4 py-4 text-slate-600">{submission.reviewStatus}</td>
                          <td className="px-4 py-4">
                            <Link
                              to={`/professor/reports/${submission.id}`}
                              className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                              View Report
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile stacked cards */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {filteredSubmissions.map((submission) => (
                    <div key={submission.id} className="px-4 py-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <label className="sr-only" htmlFor={`select-m-${submission.id}`}>
                            Select submission by {submission.student}
                          </label>
                          <input
                            id={`select-m-${submission.id}`}
                            type="checkbox"
                            checked={selectedIds.includes(submission.id)}
                            onChange={() => toggleSelectOne(submission.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-800">{submission.student}</p>
                            <p className="text-xs text-slate-500">{submission.assignment}</p>
                          </div>
                        </div>
                        <StatusBadge status={submission.status} />
                      </div>
                      <p className="text-xs text-slate-500">{submission.course}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                          <p>{submission.date}</p>
                          <div className="mt-1">
                            <SimilarityIndicator value={submission.similarity} />
                          </div>
                          <p className="mt-1">Review: {submission.reviewStatus}</p>
                        </div>
                        <Link
                          to={`/professor/reports/${submission.id}`}
                          className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          View Report
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Pagination */}
          {filteredSubmissions.length > 0 && (
            <div className="mb-6 flex items-center justify-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Previous
              </button>
              <button
                type="button"
                aria-current="page"
                className="rounded-lg border border-emerald-500 bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                1
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                2
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Next
              </button>
            </div>
          )}

          {/* Academic review guidance */}
          <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-slate-800">Academic Review Guidance</p>
              <p className="mt-1 text-sm text-slate-600">
                Similarity scores are indicators of matching content. They should be reviewed together with the matched sources, context and assignment requirements. A similarity score alone does not prove plagiarism.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}