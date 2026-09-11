import { useState } from "react";
import { Link } from "react-router-dom";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/professor/dashboard" },
  { label: "Submissions", to: "/professor/submissions" },
  { label: "Reports", to: "/professor/reports" },
  { label: "Courses", to: "/professor/courses" },
  { label: "Profile", to: "/professor/profile" },
  { label: "Settings", to: "/professor/settings" },
];

const ANALYSIS_STEPS = [
  {
    name: "Document Uploaded",
    detail: "The student's submitted file was received by the system.",
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
    name: "TF-IDF Vectorization",
    detail:
      "Converts document text into weighted numerical representations.",
  },
  {
    name: "Similarity Calculation",
    detail:
      "Measures similarity between the submitted document and reference documents.",
  },
  {
    name: "Reference Search",
    detail: "Identifies potentially relevant documents for comparison.",
  },
  {
    name: "Rule-Based Evaluation",
    detail: "Applies predefined review rules to categorize similarity results.",
  },
  {
    name: "Report Generated",
    detail: "The similarity findings were compiled into this report.",
  },
];

const AI_CONCEPTS = [
  {
    title: "Intelligent Agent",
    detail:
      "Coordinates the document analysis workflow and decides which analysis step should be performed.",
  },
  {
    title: "Search",
    detail:
      "Search techniques can help identify relevant documents or evidence from the reference corpus.",
  },
  {
    title: "Knowledge Representation",
    detail:
      "Represents academic integrity rules, document relationships and review knowledge.",
  },
  {
    title: "Rule-Based Reasoning",
    detail:
      "Uses predefined rules to categorize similarity results and determine whether human review may be required.",
  },
  {
    title: "Bayesian Reasoning",
    detail:
      "Can be used to estimate the confidence of evidence using probability-based reasoning.",
  },
  {
    title: "Inductive Learning",
    detail: "Can learn patterns from previously reviewed documents and examples.",
  },
  {
    title: "Expert System",
    detail:
      "Combines domain knowledge and rules to assist professors during academic review.",
  },
];

const REASONING_FLOW = [
  "Document",
  "Extract Evidence",
  "Search References",
  "Calculate Similarity",
  "Apply Rules",
  "Generate Review Recommendation",
  "Professor Decision",
];

const REVIEW_STATUS_OPTIONS = [
  "Pending Review",
  "Reviewed",
  "Requires Further Investigation",
];

const DECISION_OPTIONS = [
  "No Action Required",
  "Discuss With Student",
  "Further Investigation",
  "Refer to Academic Committee",
];

const reportData = {
  submissionId: "SUB-2026-001",
  student: "Arun Kumar",
  assignment: "Artificial Intelligence Assignment",
  course: "CS402 - Artificial Intelligence",
  submittedDate: "September 10, 2026",
  fileName: "ai-assignment.pdf",
  status: "Review Required",
  similarity: 46,
  similarityStatus: "High Similarity",
  sources: [
    {
      id: 1,
      name: "Machine Learning in Education",
      type: "Academic Reference",
      similarity: 24,
      submittedSegments: [
        { text: "Artificial intelligence", matched: true },
        { text: "is increasingly being used in", matched: true },
        { text: "modern", matched: false },
        { text: "educational systems to improve", matched: true },
        { text: "personalized learning and academic support.", matched: true },
      ],
      referenceSegments: [
        { text: "Artificial intelligence", matched: true },
        { text: "is increasingly being used in", matched: true },
        { text: "educational systems to improve", matched: true },
        { text: "personalized learning and academic support.", matched: true },
      ],
    },
    {
      id: 2,
      name: "Institutional Assignment Repository",
      type: "Previous Submission",
      similarity: 15,
      submittedSegments: [
        { text: "Machine learning algorithms", matched: true },
        { text: "can be trained on", matched: true },
        { text: "large labeled datasets", matched: false },
        { text: "to make accurate predictions.", matched: true },
      ],
      referenceSegments: [
        { text: "Machine learning algorithms", matched: true },
        { text: "are typically trained on", matched: true },
        { text: "large annotated datasets", matched: false },
        { text: "to make accurate predictions.", matched: true },
      ],
    },
    {
      id: 3,
      name: "Artificial Intelligence Research Paper",
      type: "Research Document",
      similarity: 7,
      submittedSegments: [
        { text: "Expert systems", matched: true },
        { text: "apply", matched: false },
        { text: "rule-based reasoning", matched: true },
        { text: "to support decision making.", matched: true },
      ],
      referenceSegments: [
        { text: "Expert systems", matched: true },
        { text: "use", matched: false },
        { text: "rule-based reasoning", matched: true },
        { text: "to support decision making.", matched: true },
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

export default function ReportReview() {
  const [selectedSourceId, setSelectedSourceId] = useState(
    reportData.sources[0].id
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState("Pending Review");
  const [professorDecision, setProfessorDecision] = useState(
    "No Action Required"
  );
  const [comments, setComments] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [downloadRequested, setDownloadRequested] = useState(false);

  const selectedSource =
    reportData.sources.find((s) => s.id === selectedSourceId) ||
    reportData.sources[0];

  const handleSaveReview = (e) => {
    e.preventDefault();
    setSaveMessage("Review saved successfully (demo mode).");
    setTimeout(() => setSaveMessage(""), 3000);
  };

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
                Professor Portal
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

        <nav className="px-3 py-4" aria-label="Professor navigation">
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
                    to="/professor/dashboard"
                    className="hover:text-emerald-600"
                  >
                    Professor Dashboard
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link
                    to="/professor/submissions"
                    className="hover:text-emerald-600"
                  >
                    Submissions
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="text-slate-700 font-medium">Report Review</li>
              </ol>
            </nav>

            <Link
              to="/professor/submissions"
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
              Report Review
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Review similarity evidence for this student submission.
            </p>
          </div>

          {/* Submission Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Submission Details
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Student</dt>
                <dd className="text-slate-900 font-medium mt-0.5">
                  {reportData.student}
                </dd>
              </div>
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
                <dt className="text-slate-500">Submitted</dt>
                <dd className="text-slate-900 font-medium mt-0.5">
                  {reportData.submittedDate}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">File</dt>
                <dd className="text-slate-900 font-medium mt-0.5 truncate">
                  {reportData.fileName}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Submission ID</dt>
                <dd className="text-slate-900 font-medium mt-0.5">
                  {reportData.submissionId}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="mt-0.5">
                  <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 text-xs font-medium">
                    {reportData.status}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Overall Similarity */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Overall Similarity
              </h2>
              <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 text-xs font-medium">
                {reportData.similarityStatus}
              </span>
            </div>

            <p className="text-4xl font-semibold text-slate-900 mb-2">
              {reportData.similarity}%
            </p>

            <p className="text-sm text-slate-600">
              Several sections of the submitted document show similarity
              with available reference material.
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Similarity is an indicator of matching content and should be
              evaluated together with the supporting evidence.
            </p>

            {/* Similarity breakdown */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h3 className="text-sm font-medium text-slate-700 mb-3">
                Similarity Breakdown
              </h3>
              <div className="space-y-3 mb-5">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">Matched Content</span>
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
                    aria-label="Matched content"
                  >
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${reportData.similarity}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">Unmatched Content</span>
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
                    aria-label="Unmatched content"
                  >
                    <div
                      className="h-full rounded-full bg-slate-400"
                      style={{ width: `${100 - reportData.similarity}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-200 px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-slate-900">
                      Low Similarity
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Under 15%</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-sm font-medium text-slate-900">
                      Moderate Similarity
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">15% – 40%</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-sm font-medium text-slate-900">
                      High Similarity
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Above 40%</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                These categories are system-defined review indicators, not
                automatic plagiarism decisions.
              </p>
            </div>
          </div>

          {/* Reference Sources */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Reference Sources
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
                          {isSelected ? "Viewing Evidence" : "View Evidence"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Matched Text Evidence */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Matched Text Evidence
              </h2>
              <p className="text-xs text-slate-500">
                Showing evidence from:{" "}
                <span className="font-medium text-slate-700">
                  {selectedSource.name}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <MatchedTextBlock
                label="Student Submission"
                segments={selectedSource.submittedSegments}
              />
              <MatchedTextBlock
                label="Reference Source"
                segments={selectedSource.referenceSegments}
              />
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Highlighted text indicates wording identified as similar
              between the two documents.
            </p>
          </div>

          {/* Analysis Pipeline */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">
              Analysis Pipeline
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

          {/* AI Analysis Components */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">
              AI Analysis Components
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              These concepts are planned components of the AI system's
              syllabus and are not all implemented in this frontend demo.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {AI_CONCEPTS.map((item) => (
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

          {/* Reasoning Summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Reasoning Summary
            </h2>
            <div className="flex flex-col lg:flex-row lg:items-center lg:flex-wrap gap-2">
              {REASONING_FLOW.map((step, index) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {step}
                  </span>
                  {index < REASONING_FLOW.length - 1 && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-slate-400 flex-shrink-0 lg:rotate-0 rotate-90"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Professor Review */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Professor Review
            </h2>

            <form onSubmit={handleSaveReview} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="reviewStatus"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Review Status
                  </label>
                  <select
                    id="reviewStatus"
                    name="reviewStatus"
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {REVIEW_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="professorDecision"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Professor Decision
                  </label>
                  <select
                    id="professorDecision"
                    name="professorDecision"
                    value={professorDecision}
                    onChange={(e) => setProfessorDecision(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {DECISION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="comments"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Professor Comments
                </label>
                <textarea
                  id="comments"
                  name="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Enter your review comments..."
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  Save Review
                </button>
                {saveMessage && (
                  <p className="text-sm text-green-700" role="status">
                    {saveMessage}
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* Report Actions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={handleDownloadClick}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
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
              <Link
                to="/professor/submissions"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Back to Submissions
              </Link>
            </div>
            {downloadRequested && (
              <p className="mt-3 text-sm text-emerald-600" role="status">
                Report download is a demo action in this version.
              </p>
            )}
          </div>

          {/* Academic Review Notice */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 mb-2">
            <h2 className="text-sm font-semibold text-slate-900 mb-1.5">
              Important Academic Integrity Notice
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              This system is an assistive tool for identifying potentially
              matching content. Similarity scores and AI-generated
              recommendations should not be treated as automatic proof of
              plagiarism. The final academic decision must be made by the
              responsible professor or institution after reviewing the
              evidence and context.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}