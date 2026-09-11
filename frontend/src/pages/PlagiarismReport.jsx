import { useState } from "react";
import { Link } from "react-router-dom";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/student/dashboard" },
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
    detail:
      "The extracted text was cleaned and normalized for comparison.",
  },
  {
    name: "Reference Documents Searched",
    detail:
      "Relevant reference material was located within the available corpus.",
  },
  {
    name: "Similarity Calculated",
    detail:
      "The submitted document was compared against reference sources to identify overlapping content.",
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
    detail:
      "Search methods can help identify relevant reference documents.",
  },
  {
    title: "Rule-Based Reasoning",
    detail:
      "Rules can classify results based on defined academic review criteria.",
  },
  {
    title: "Bayesian Reasoning",
    detail:
      "Probability-based reasoning can help estimate confidence in evidence.",
  },
  {
    title: "Expert System",
    detail: "Knowledge-based rules can support consistent academic review.",
  },
];

const reportData = {
  assignment: "Artificial Intelligence Assignment",
  course: "CS402 - Artificial Intelligence",
  student: "Student Name",
  submittedDate: "September 10, 2026",
  fileName: "artificial-intelligence-assignment.pdf",
  status: "Analysis Complete",
  similarity: 28,
  reviewStatus: "Review Required",
  sources: [
    {
      id: 1,
      name: "Reference Paper — Machine Learning in Education",
      type: "Academic Paper",
      similarity: 18,
      submittedSegments: [
        { text: "Artificial intelligence", matched: true },
        { text: "is increasingly being", matched: true },
        { text: "used", matched: false },
        { text: "to improve", matched: true },
        { text: "educational systems.", matched: true },
      ],
      referenceSegments: [
        { text: "Artificial intelligence", matched: true },
        { text: "is increasingly being", matched: true },
        { text: "applied", matched: false },
        { text: "to improve modern", matched: true },
        { text: "educational systems.", matched: true },
      ],
    },
    {
      id: 2,
      name: "Institutional Repository — AI Assignment",
      type: "Repository Submission",
      similarity: 7,
      submittedSegments: [
        { text: "Machine learning models", matched: true },
        { text: "require large amounts of", matched: true },
        { text: "labeled training data", matched: false },
        { text: "to perform accurately.", matched: true },
      ],
      referenceSegments: [
        { text: "Machine learning models", matched: true },
        { text: "typically require large amounts of", matched: true },
        { text: "annotated data", matched: false },
        { text: "to perform accurately.", matched: true },
      ],
    },
    {
      id: 3,
      name: "Academic Research Paper — Artificial Intelligence",
      type: "Research Paper",
      similarity: 3,
      submittedSegments: [
        { text: "AI systems", matched: true },
        { text: "are being explored", matched: false },
        { text: "for use in", matched: true },
        { text: "classroom assessment.", matched: true },
      ],
      referenceSegments: [
        { text: "AI systems", matched: true },
        { text: "have been studied", matched: false },
        { text: "for use in", matched: true },
        { text: "classroom assessment.", matched: true },
      ],
    },
  ],
};

function MatchedTextBlock({ label, segments }) {
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

function CircularScore({ percentage }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage / 100);

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
        stroke="#4f46e5"
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
  const [selectedSourceId, setSelectedSourceId] = useState(
    reportData.sources[0].id
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [downloadRequested, setDownloadRequested] = useState(false);

  const selectedSource =
    reportData.sources.find((s) => s.id === selectedSourceId) ||
    reportData.sources[0];

  const handleDownloadClick = () => {
    setDownloadRequested(true);
    setTimeout(() => setDownloadRequested(false), 2500);
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
          <Link
            to="/"
            className="block rounded-lg px-3.5 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition"
          >
            Logout
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-4 py-8 sm:px-8 lg:px-10">
        <div className="max-w-5xl mx-auto">
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
                  <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 text-xs font-medium">
                    {reportData.reviewStatus}
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  {reportData.similarity}% of the submitted content shows
                  similarity with the available reference material.
                </p>
                <p className="text-sm text-slate-500 mt-3">
                  Similarity scores are indicators of matching content and
                  should be reviewed together with the supporting evidence.
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
                      style={{ width: `${reportData.similarity}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">
                      Original / Unmatched Content
                    </span>
                    <span className="font-medium text-slate-900">
                      {100 - reportData.similarity}%
                    </span>
                  </div>
                  <div
                    className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={100 - reportData.similarity}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Original or unmatched content"
                  >
                    <div
                      className="h-full rounded-full bg-slate-400"
                      style={{ width: `${100 - reportData.similarity}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Risk / Review status */}
          <div className="bg-white rounded-xl border border-amber-200 bg-amber-50/40 shadow-sm p-6 sm:p-8 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-amber-700"
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
                  The detected similarity is within a range that may require
                  academic review.
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Final academic decisions should be made by the instructor
                  or institution.
                </p>
              </div>
            </div>
          </div>

          {/* Matched Sources */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Matched Sources
            </h2>
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
          </div>

          {/* Matched Text */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Matched Text
              </h2>
              <p className="text-xs text-slate-500">
                Showing match from:{" "}
                <span className="font-medium text-slate-700">
                  {selectedSource.name}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <MatchedTextBlock
                label="Submitted Text"
                segments={selectedSource.submittedSegments}
              />
              <MatchedTextBlock
                label="Reference Text"
                segments={selectedSource.referenceSegments}
              />
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Highlighted text indicates wording identified as similar
              between the two documents.
            </p>
          </div>

          {/* Analysis Evidence */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">
              Analysis Evidence
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              The steps below outline the analysis pipeline this system uses
              to generate a report.
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
              A simplified overview of how the system supports this result.
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

          {/* Recommended Action */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
            <h2 className="text-base font-semibold text-slate-900 mb-3">
              Recommended Action
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 text-xs font-medium mb-2">
                  {reportData.reviewStatus}
                </span>
                <p className="text-sm text-slate-600">
                  Review the matched sources and highlighted text before
                  making an academic decision.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadClick}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 flex-shrink-0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 12m0 0l4.5-4.5M12 12V3"
                  />
                </svg>
                Download Report
              </button>
            </div>
            {downloadRequested && (
              <p className="mt-3 text-sm text-emerald-600" role="status">
                Report download is a demo action in this version.
              </p>
            )}
          </div>

          {/* Responsible Use Notice */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 mb-2">
            <h2 className="text-sm font-semibold text-slate-900 mb-1.5">
              Important Academic Integrity Notice
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Similarity detection is an assistive tool. A similarity score
              does not by itself establish plagiarism. Instructors should
              review the matched content, source context, assignment
              requirements and other relevant evidence before making a
              decision.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}