import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getPlagiarismReport,
  getLatestPlagiarismReport,
  downloadSubmissionFile,
  exportPlagiarismReport,
} from "../service/api";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/student/dashboard" },
  { label: "Courses", to: "/student/courses" },
  { label: "Upload Submission", to: "/student/upload" },
  { label: "My Submissions", to: "/student/submissions" },
  { label: "Reports", to: "/student/reports" },
  { label: "Profile", to: "/student/profile" },
  { label: "Settings", to: "/student/settings" },
];

const ANALYSIS_STEPS = [
  {
    name: "Document Uploaded",
    detail: "The submitted file was received by the system.",
  },
  {
    name: "Text Extracted",
    detail: "Readable text was extracted from the submitted document.",
  },
  {
    name: "Text Preprocessed",
    detail: "The extracted text was cleaned and normalized for comparison.",
  },
  {
    name: "Reference Documents Searched",
    detail: "Relevant reference material was located within the available corpus.",
  },
  {
    name: "Similarity Calculated",
    detail: "The submitted document was compared against reference sources to identify overlapping content.",
  },
  {
    name: "Report Generated",
    detail: "The similarity findings were compiled into this report.",
  },
];

const REASONING_ITEMS = [
  {
    title: "TF-IDF",
    detail: "Identifies important terms in the documents.",
  },
  {
    title: "Cosine Similarity",
    detail: "Measures similarity between document representations.",
  },
  {
    title: "Search",
    detail: "Search methods can help identify relevant reference documents.",
  },
  {
    title: "Rule-Based Reasoning",
    detail: "Rules can classify results based on defined academic review criteria.",
  },
  {
    title: "Bayesian Reasoning",
    detail: "Probability-based reasoning can help estimate confidence in evidence.",
  },
  {
    title: "Expert System",
    detail: "Knowledge-based rules can support consistent academic review.",
  },
];

function MatchedTextBlock({ label, text, segments }) {
  if (segments && segments.length > 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
        <p className="text-sm text-slate-800 leading-relaxed">
          {segments.map((segment, index) => (
            <span
              key={index}
              className={
                segment.matched
                  ? "bg-amber-100 text-amber-900 rounded px-0.5"
                  : ""
              }
            >
              {segment.text}
              {index < segments.length - 1 ? " " : ""}
            </span>
          ))}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
      <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
    </div>
  );
}

function CircularScore({ percentage }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(percentage, 100) / 100);

  return (
    <svg
      viewBox="0 0 130 130"
      className="w-32 h-32"
      role="img"
      aria-label={`Overall similarity ${percentage} percent`}
    >
      <circle
        cx="65"
        cy="65"
        r={radius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="12"
      />
      <circle
        cx="65"
        cy="65"
        r={radius}
        fill="none"
        stroke="#059669"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 65 65)"
      />
      <text
        x="65"
        y="60"
        textAnchor="middle"
        className="fill-slate-900"
        style={{ fontSize: "24px", fontWeight: 600 }}
      >
        {percentage}%
      </text>
      <text
        x="65"
        y="80"
        textAnchor="middle"
        className="fill-slate-500"
        style={{ fontSize: "10px" }}
      >
        Similarity
      </text>
    </svg>
  );
}

export default function PlagiarismReport() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const reportId = id || searchParams.get("report_id") || searchParams.get("id");

  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState(null);
  const [selectedSourceId, setSelectedSourceId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingOriginal, setIsDownloadingOriginal] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState("");
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadReport() {
      setLoading(true);
      setError("");

      try {
        let response;
        if (reportId) {
          response = await getPlagiarismReport(reportId);
        } else {
          response = await getLatestPlagiarismReport();
        }

        if (isMounted && response && response.report) {
          const r = response.report;
          const s = r.submission || {};

          // Format sources from matches with sentence-level segments
          const sources = (r.matches || []).map((m, idx) => ({
            id: m.reference_id || idx + 1,
            name: m.title || `Reference Document ${idx + 1}`,
            type: m.type || "Academic Reference Corpus",
            similarity: Math.round(m.similarity_percentage !== undefined ? m.similarity_percentage : (m.similarity || 0)),
            matched_segments: m.matched_segments || [],
          }));

          const formattedDate = s.submitted_at
            ? new Date(s.submitted_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : "Recent";

          const riskLevelDisplay =
            r.risk_level === "safe"
              ? "Safe"
              : r.risk_level === "high_risk"
              ? "High Risk"
              : "Review Required";

          const courseDisplay = s.course_code
            ? `${s.course_code} - ${s.course_name || ""}`.trim()
            : s.course_name || "General Course";

          const data = {
            id: r.id,
            submission_id: s.id || r.submission_id,
            assignment: s.title || "Academic Assignment",
            course: courseDisplay,
            student: s.student_name || user?.name || "Student",
            submittedDate: formattedDate,
            fileName: s.filename || "document",
            status: s.status === "completed" ? "Analysis Complete" : (s.status || "Completed"),
            similarity: Math.round(r.overall_similarity_score !== undefined ? r.overall_similarity_score : (r.similarity_score || 0)),
            riskLevel: r.risk_level,
            reviewStatus: riskLevelDisplay,
            sources: sources,
          };

          setReportData(data);
          if (sources.length > 0) {
            setSelectedSourceId(sources[0].id);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load plagiarism report.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadReport();
    return () => {
      isMounted = false;
    };
  }, [reportId, user]);

  const selectedSource =
    reportData?.sources?.find((s) => s.id === selectedSourceId) ||
    reportData?.sources?.[0] ||
    null;

  const handleExportReport = async () => {
    if (!reportData?.id) return;
    setIsExporting(true);
    setDownloadError("");
    setDownloadSuccess("");
    try {
      await exportPlagiarismReport(reportData.id, "html");
      setDownloadSuccess("Official Academic Integrity Report downloaded successfully.");
      setTimeout(() => setDownloadSuccess(""), 4000);
    } catch (err) {
      setDownloadError(err.message || "Failed to export report.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadOriginal = async () => {
    if (!reportData?.submission_id) {
      setDownloadError("Submission ID not found.");
      return;
    }
    setIsDownloadingOriginal(true);
    setDownloadError("");
    setDownloadSuccess("");
    try {
      await downloadSubmissionFile(reportData.submission_id, reportData.fileName);
      setDownloadSuccess("Original submission file downloaded successfully.");
      setTimeout(() => setDownloadSuccess(""), 4000);
    } catch (err) {
      setDownloadError(err.message || "Failed to download submission file.");
    } finally {
      setIsDownloadingOriginal(false);
    }
  };

  const getRiskBadgeStyles = (risk) => {
    if (risk === "safe") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (risk === "high_risk") {
      return "bg-red-50 text-red-700 border-red-200";
    }
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 lg:flex">
      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5L3 8.25l9 3.75 9-3.75-9-3.75zM3 8.25v7.5l9 3.75m0-11.25l9 3.75m-9-3.75v11.25m9-11.25v7.5l-9 3.75"
              />
            </svg>
          </div>
          <span className="text-sm font-medium">Academic Integrity</span>
        </div>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          aria-label="Open navigation menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
            />
          </svg>
        </button>
      </div>

      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:flex-shrink-0 lg:min-h-screen ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5L3 8.25l9 3.75 9-3.75-9-3.75zM3 8.25v7.5l9 3.75m0-11.25l9 3.75m-9-3.75v11.25m9-11.25v7.5l-9 3.75"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium leading-tight">
                Academic Integrity
              </p>
              <p className="text-xs text-slate-400 leading-tight">
                Student Portal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
            aria-label="Close navigation menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="px-3 py-4" aria-label="Student navigation">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.label === "Reports";
              return (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className={`block rounded-lg px-3.5 py-2.5 text-sm transition ${
                      isActive
                        ? "bg-white/10 text-white font-medium border border-white/20"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-3 py-4 mt-auto border-t border-white/10">
          <button
            type="button"
            onClick={logout}
            className="w-full text-left rounded-lg px-3.5 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-4 py-8 sm:px-8 lg:px-10">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <li>
                  <Link
                    to="/student/dashboard"
                    className="hover:text-emerald-600"
                  >
                    Student Dashboard
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link
                    to="/student/submissions"
                    className="hover:text-emerald-600"
                  >
                    My Submissions
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="text-slate-700 font-medium">Report</li>
              </ol>
            </nav>

            <Link
              to="/student/submissions"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
              Back to Submissions
            </Link>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center my-6">
              <svg
                className="mx-auto h-9 w-9 animate-spin text-emerald-600"
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
              <h2 className="mt-4 text-base font-semibold text-slate-900">
                Loading Plagiarism Report
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Retrieving similarity metrics and analysis results...
              </p>
            </div>
          ) : error || !reportData ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center my-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                No Plagiarism Report Available
              </h2>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                {error ||
                  "You have not submitted any assignments yet. Submit an academic document to generate an automated similarity report."}
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  to="/student/upload"
                  className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 transition"
                >
                  Upload New Assignment
                </Link>
                <Link
                  to="/student/dashboard"
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-slate-900">
                  Plagiarism &amp; Similarity Report
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Review the detected similarities in your submitted assignment.
                </p>
              </div>

              {/* Submission Information */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
                <h2 className="text-base font-semibold text-slate-900 mb-4">
                  Submission Information
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <dt className="text-slate-500">Assignment</dt>
                    <dd className="text-slate-900 font-medium mt-0.5">
                      {reportData.assignment}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Course</dt>
                    <dd className="text-slate-900 font-medium mt-0.5">
                      {reportData.course}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Student</dt>
                    <dd className="text-slate-900 font-medium mt-0.5">
                      {reportData.student}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Submitted</dt>
                    <dd className="text-slate-900 font-medium mt-0.5">
                      {reportData.submittedDate}
                    </dd>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <dt className="text-slate-500">File</dt>
                    <dd className="text-slate-900 font-medium mt-0.5 truncate">
                      {reportData.fileName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Status</dt>
                    <dd className="mt-0.5">
                      <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 border border-green-200 px-2.5 py-0.5 text-xs font-medium">
                        {reportData.status}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Overall Result */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex-shrink-0 mx-auto md:mx-0">
                    <CircularScore percentage={reportData.similarity} />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h2 className="text-lg font-semibold text-slate-900">
                        Overall Similarity
                      </h2>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getRiskBadgeStyles(
                          reportData.riskLevel
                        )}`}
                      >
                        {reportData.reviewStatus}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {reportData.similarity}% of the submitted content shows
                      similarity with the available reference material.
                    </p>
                    <p className="text-sm text-slate-500 mt-3">
                      Similarity scores are indicators of matching content and
                      should be reviewed together with supporting evidence.
                    </p>
                  </div>
                </div>

                {/* Score breakdown */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">
                    Score Breakdown
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-600">Overall Similarity</span>
                        <span className="font-medium text-slate-900">
                          {reportData.similarity}%
                        </span>
                      </div>
                      <div
                        className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden"
                        role="progressbar"
                        aria-valuenow={reportData.similarity}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Overall similarity"
                      >
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(reportData.similarity, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-600">
                          Original / Unmatched Content
                        </span>
                        <span className="font-medium text-slate-900">
                          {Math.max(0, 100 - reportData.similarity)}%
                        </span>
                      </div>
                      <div
                        className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden"
                        role="progressbar"
                        aria-valuenow={Math.max(0, 100 - reportData.similarity)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Original or unmatched content"
                      >
                        <div
                          className="h-full rounded-full bg-slate-400"
                          style={{
                            width: `${Math.max(0, 100 - reportData.similarity)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk / Review status notice */}
              <div
                className={`rounded-xl border shadow-sm p-6 sm:p-8 mb-6 ${
                  reportData.riskLevel === "safe"
                    ? "bg-emerald-50/40 border-emerald-200"
                    : reportData.riskLevel === "high_risk"
                    ? "bg-red-50/40 border-red-200"
                    : "bg-amber-50/40 border-amber-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      reportData.riskLevel === "safe"
                        ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                        : reportData.riskLevel === "high_risk"
                        ? "bg-red-100 border-red-200 text-red-700"
                        : "bg-amber-100 border-amber-200 text-amber-700"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Status: {reportData.reviewStatus}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      {reportData.riskLevel === "safe"
                        ? "Low similarity detected. Document originality appears consistent with academic standards."
                        : reportData.riskLevel === "high_risk"
                        ? "High similarity detected across reference documents. Comprehensive academic review recommended."
                        : "The detected similarity is within a moderate range that may warrant academic review."}
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                      Final academic integrity decisions are made by the course instructor.
                    </p>
                  </div>
                </div>
              </div>

              {/* Matched Sources */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
                <h2 className="text-base font-semibold text-slate-900 mb-4">
                  Matched Sources
                </h2>
                {reportData.sources && reportData.sources.length > 0 ? (
                  <div className="space-y-3">
                    {reportData.sources.map((source) => {
                      const isSelected = source.id === selectedSourceId;
                      return (
                        <div
                          key={source.id}
                          className={`rounded-lg border p-4 transition ${
                            isSelected
                              ? "border-emerald-300 bg-emerald-50/60"
                              : "border-slate-200"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900">
                                {source.name}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {source.type}
                              </p>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0">
                              <div className="w-32">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-slate-500">Similarity</span>
                                  <span className="font-medium text-slate-900">
                                    {source.similarity}%
                                  </span>
                                </div>
                                <div
                                  className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden"
                                  role="progressbar"
                                  aria-valuenow={source.similarity}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-label={`Similarity with ${source.name}`}
                                >
                                  <div
                                    className="h-full rounded-full bg-emerald-500"
                                    style={{ width: `${source.similarity}%` }}
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedSourceId(source.id)}
                                className={`flex-shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 ${
                                  isSelected
                                    ? "bg-emerald-500 text-white"
                                    : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                                }`}
                                aria-pressed={isSelected}
                              >
                                {isSelected ? "Viewing Match" : "View Match"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No matching reference sources identified in the corpus.
                  </p>
                )}
              </div>

              {/* Matched Content Overview & Sentence-Level Evidence */}
              {selectedSource && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        Evidence Inspection: {selectedSource.name}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Source Type: <span className="font-medium text-slate-700">{selectedSource.type}</span> &bull; Source Overlap: <span className="font-semibold text-emerald-700">{selectedSource.similarity}%</span>
                      </p>
                    </div>
                  </div>

                  {selectedSource.matched_segments && selectedSource.matched_segments.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Sentence-Level Matches ({selectedSource.matched_segments.length} segment{selectedSource.matched_segments.length > 1 ? "s" : ""})
                        </h3>
                        <span className="text-xs text-slate-500">
                          Heuristic threshold: &ge; 60% similarity
                        </span>
                      </div>
                      <div className="space-y-3">
                        {selectedSource.matched_segments.map((seg, sIdx) => (
                          <div
                            key={sIdx}
                            className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 transition hover:border-slate-300"
                          >
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/70">
                              <span className="text-xs font-semibold text-slate-700">
                                Segment #{sIdx + 1}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                                {Math.round(seg.similarity || 0)}% Match
                              </span>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                              <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-900 mb-1">
                                  Submitted Document Passage
                                </p>
                                <p className="text-xs text-slate-800 leading-relaxed italic">
                                  &ldquo;{seg.target_snippet}&rdquo;
                                </p>
                              </div>
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                                  Matched Reference Passage
                                </p>
                                <p className="text-xs text-slate-700 leading-relaxed italic">
                                  &ldquo;{seg.source_snippet}&rdquo;
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <MatchedTextBlock
                          label="Submitted Assignment Document"
                          text={`Document: "${reportData.fileName}" shows ${selectedSource.similarity}% similarity with this reference source.`}
                        />
                        <MatchedTextBlock
                          label="Reference Corpus Source"
                          text={`Reference Title: "${selectedSource.name}" — Type: ${selectedSource.type}. Comparison computed via TF-IDF Vectorization & Cosine Similarity.`}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-3">
                        Document-level similarity was detected across this reference source based on TF-IDF representation and cosine proximity. No specific verbatim sentence matches exceeded the individual segment threshold.
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 mt-4">
                    Similarity calculated by measuring TF-IDF n-gram vectors and sentence-level similarity against the academic reference corpus.
                  </p>
                </div>
              )}

              {/* Analysis Evidence */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
                <h2 className="text-base font-semibold text-slate-900 mb-1">
                  Analysis Evidence
                </h2>
                <p className="text-sm text-slate-500 mb-5">
                  The steps below outline the analysis pipeline this system executed to generate this report.
                </p>

                <ol className="space-y-4">
                  {ANALYSIS_STEPS.map((step, index) => (
                    <li key={step.name} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {index + 1}
                        </div>
                        {index < ANALYSIS_STEPS.length - 1 && (
                          <div className="w-px flex-1 bg-slate-200 mt-1" />
                        )}
                      </div>
                      <div className="pb-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">
                            {step.name}
                          </p>
                          <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 text-[11px] font-medium">
                            Completed
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {step.detail}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* AI Reasoning Summary */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
                <h2 className="text-base font-semibold text-slate-900 mb-1">
                  Analysis Reasoning
                </h2>
                <p className="text-sm text-slate-500 mb-5">
                  Methodology utilized by the system to evaluate academic originality.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {REASONING_ITEMS.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-lg border border-slate-200 p-4"
                    >
                      <p className="text-sm font-medium text-slate-900">
                        {item.title}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export & Recommended Action */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
                <h2 className="text-base font-semibold text-slate-900 mb-3">
                  Export & Recommended Action
                </h2>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium mb-2 ${getRiskBadgeStyles(
                        reportData.riskLevel
                      )}`}
                    >
                      {reportData.reviewStatus}
                    </span>
                    <p className="text-sm text-slate-600">
                      Review the matched reference sources before submitting further revisions. You may download the certified integrity report or retrieve your original uploaded file.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
                    <button
                      type="button"
                      disabled={isDownloadingOriginal}
                      onClick={handleDownloadOriginal}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                      {isDownloadingOriginal ? (
                        <svg className="h-4 w-4 animate-spin text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      )}
                      Download Original Document
                    </button>
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={handleExportReport}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                      {isExporting ? (
                        <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 12m0 0l4.5-4.5M12 12V3" />
                        </svg>
                      )}
                      Download Official Report
                    </button>
                  </div>
                </div>
                {downloadSuccess && (
                  <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800" role="status">
                    {downloadSuccess}
                  </div>
                )}
                {downloadError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700" role="alert">
                    {downloadError}
                  </div>
                )}
              </div>

              {/* Responsible Use Notice */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 mb-2">
                <h2 className="text-sm font-semibold text-slate-900 mb-1.5">
                  Important Academic Integrity Notice
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Similarity detection is an assistive tool. A similarity score
                  does not by itself establish plagiarism. Instructors review
                  the matched content, source context, assignment requirements,
                  and citation formatting before making an evaluation.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}