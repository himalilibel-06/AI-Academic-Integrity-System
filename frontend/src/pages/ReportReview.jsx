import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getPlagiarismReport,
  getLatestPlagiarismReport,
  updateReportReview,
  downloadSubmissionFile,
  exportPlagiarismReport,
} from "../service/api";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/professor/dashboard" },
  { label: "Submissions", to: "/professor/submissions" },
  { label: "Reports", to: "/professor/reports" },
  { label: "Courses", to: "/professor/courses" },
  { label: "Profile", to: "/professor/profile" },
  { label: "Settings", to: "/professor/settings" },
];

const ANALYSIS_STEPS = [
  { name: "Document Uploaded", detail: "The student's submitted file was received by the system." },
  { name: "Text Extracted", detail: "Readable text was extracted from the submitted document." },
  { name: "Text Preprocessed", detail: "The extracted text was cleaned and normalized for comparison." },
  { name: "TF-IDF Vectorization", detail: "Converts document text into weighted numerical representations." },
  { name: "Similarity Calculation", detail: "Measures cosine similarity between submitted text and reference corpus." },
  { name: "Reference Search", detail: "Identifies potentially relevant documents for comparison." },
  { name: "Rule-Based Evaluation", detail: "Applies academic rules to categorize similarity results and risk." },
  { name: "Report Generated", detail: "The similarity findings and matches were compiled into this report." },
];

const AI_CONCEPTS = [
  { title: "Intelligent Agent", detail: "Coordinates the document analysis workflow and determines processing stages." },
  { title: "Search", detail: "Heuristic search techniques retrieve matching reference passages from academic corpus." },
  { title: "Knowledge Representation", detail: "Encodes academic integrity thresholds, risk rules, and course relationships." },
  { title: "Rule-Based Reasoning", detail: "Evaluates similarity thresholds to determine whether professor review is required." },
  { title: "Expert System", detail: "Augments academic decisions by providing structured evidence and match highlights." },
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
  { label: "Approved (Clean / Safe)", value: "approved" },
  { label: "Reviewed (Acceptable)", value: "reviewed" },
  { label: "Requires Further Investigation", value: "review_required" },
  { label: "Flag for Committee Review", value: "flagged" },
  { label: "Rejected (Policy Violation)", value: "rejected" },
];

const DECISION_OPTIONS = [
  "No Action Required",
  "Discuss With Student",
  "Further Investigation",
  "Refer to Academic Committee",
];

export default function ReportReview() {
  const { id: routeId } = useParams();
  const { logout } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedSourceId, setSelectedSourceId] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState("approved");
  const [professorDecision, setProfessorDecision] = useState("No Action Required");
  const [comments, setComments] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingOriginal, setIsDownloadingOriginal] = useState(false);
  const [exportSuccess, setExportSuccess] = useState("");
  const [exportError, setExportError] = useState("");

  const loadReport = async () => {
    setLoading(true);
    setError("");
    try {
      let data = null;
      if (routeId) {
        data = await getPlagiarismReport(routeId);
      } else {
        data = await getLatestPlagiarismReport();
      }

      if (data && data.success && data.report) {
        setReport(data.report);
        const existingStatus = data.report.review_status || "pending";
        setReviewStatus(
          ["approved", "reviewed", "review_required", "flagged", "rejected"].includes(existingStatus)
            ? existingStatus
            : "review_required"
        );
        setComments(data.report.professor_feedback || "");
      } else {
        setError("Report not found or unavailable.");
      }
    } catch (err) {
      setError(err.message || "Failed to load plagiarism report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [routeId]);

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!report) return;

    setIsSaving(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const res = await updateReportReview(report.id, {
        review_status: reviewStatus,
        professor_feedback: comments,
      });

      if (res && res.success) {
        setSaveMessage(res.message || "Review decision saved successfully.");
        setReport((prev) => ({
          ...prev,
          review_status: res.review_status,
          professor_feedback: res.professor_feedback,
          submission: prev?.submission
            ? { ...prev.submission, status: res.submission_status }
            : prev?.submission,
        }));
        setTimeout(() => setSaveMessage(""), 4000);
      }
    } catch (err) {
      setSaveError(err.message || "Failed to save review decision.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportReport = async () => {
    if (!report?.id) return;
    setIsExporting(true);
    setExportError("");
    setExportSuccess("");
    try {
      await exportPlagiarismReport(report.id, "html");
      setExportSuccess("Official Academic Integrity Report downloaded successfully.");
      setTimeout(() => setExportSuccess(""), 4000);
    } catch (err) {
      setExportError(err.message || "Failed to export report.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadOriginal = async () => {
    const subId = report?.submission_id || report?.submission?.id;
    if (!subId) {
      setExportError("Submission ID not found.");
      return;
    }
    setIsDownloadingOriginal(true);
    setExportError("");
    setExportSuccess("");
    try {
      await downloadSubmissionFile(subId, report?.submission?.filename);
      setExportSuccess("Original submission file downloaded successfully.");
      setTimeout(() => setExportSuccess(""), 4000);
    } catch (err) {
      setExportError(err.message || "Failed to download original submission file.");
    } finally {
      setIsDownloadingOriginal(false);
    }
  };

  const matchesList = (report?.matches || []).map((m, idx) => ({
    id: m.reference_id || idx,
    source: m.title || m.source || `Reference Document #${idx + 1}`,
    similarity: Math.round(m.similarity_percentage !== undefined ? m.similarity_percentage : (m.similarity || 0)),
    type: m.type || "Academic Reference Corpus",
    matched_segments: m.matched_segments || [],
    text: m.text,
  }));
  const selectedSource = matchesList[selectedSourceId] || matchesList[0] || null;

  return (
    <div className="min-h-screen w-full bg-slate-50 lg:flex">
      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">IntegrityCheck</span>
          <span className="text-xs text-emerald-400">Professor Portal</span>
        </div>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          aria-label="Open navigation menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
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
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0F172A] text-white transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:flex-shrink-0 lg:min-h-screen ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 py-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-lg font-semibold text-white">
              Integrity<span className="text-emerald-400">Check</span>
            </span>
            <p className="text-xs text-slate-400 mt-0.5">Professor Review</p>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800"
            aria-label="Close navigation menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.label === "Reports";
            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setIsSidebarOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
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

        <div className="px-3 py-4 mt-auto border-t border-slate-800">
          <button
            type="button"
            onClick={logout}
            className="w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-4 py-8 sm:px-8 lg:px-10 min-w-0">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumbs */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <li>
                  <Link to="/professor/dashboard" className="hover:text-emerald-600">
                    Professor Dashboard
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link to="/professor/submissions" className="hover:text-emerald-600">
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to Submissions
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">
              Plagiarism Report Review
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Inspect similarity evidence, matching source passages, and record your formal academic review decision.
            </p>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <svg className="mx-auto h-8 w-8 animate-spin text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="mt-4 text-sm font-medium text-slate-700">Loading plagiarism analysis report...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-red-700">{error}</p>
              <div className="mt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={loadReport}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Retry
                </button>
                <Link
                  to="/professor/submissions"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Return to Submissions
                </Link>
              </div>
            </div>
          ) : !report ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-700">No report selected.</p>
              <Link
                to="/professor/submissions"
                className="mt-4 inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
              >
                Select a Submission to Review
              </Link>
            </div>
          ) : (
            <>
              {/* Submission Details */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Submission Details
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Report ID #{report.id}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">Overall Similarity:</span>
                    <span className={`text-xl font-bold ${
                      (report.similarity_score || report.overall_similarity_score) > 40
                        ? "text-red-600"
                        : (report.similarity_score || report.overall_similarity_score) > 15
                        ? "text-amber-600"
                        : "text-green-600"
                    }`}>
                      {report.similarity_score !== undefined ? report.similarity_score : report.overall_similarity_score}%
                    </span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      report.risk_level === "high_risk"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : report.risk_level === "review_required"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-green-50 text-green-700 border border-green-200"
                    }`}>
                      {report.risk_level === "high_risk" ? "High Risk" : report.risk_level === "review_required" ? "Review Required" : "Safe"}
                    </span>
                  </div>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <dt className="text-slate-500">Student</dt>
                    <dd className="text-slate-900 font-medium mt-0.5">
                      {report.submission?.student_name || "Unknown Student"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Assignment</dt>
                    <dd className="text-slate-900 font-medium mt-0.5">
                      {report.submission?.title || "Untitled Assignment"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Course</dt>
                    <dd className="text-slate-900 font-medium mt-0.5">
                      {report.submission?.course_code ? `${report.submission.course_code} - ` : ""}
                      {report.submission?.course_name || "General Course"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Submitted File</dt>
                    <dd className="text-slate-900 font-medium mt-0.5">
                      {report.submission?.filename || "document.pdf"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Submission Date</dt>
                    <dd className="text-slate-900 font-medium mt-0.5">
                      {report.submission?.submitted_at ? String(report.submission.submitted_at).slice(0, 10) : "Recent"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Current Review Status</dt>
                    <dd className="font-medium mt-0.5 capitalize text-emerald-700">
                      {report.review_status || "Pending"}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Matched Sources / Evidence */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
                <h2 className="text-base font-semibold text-slate-900 mb-2">
                  Matched Reference Sources & Evidence
                </h2>
                <p className="text-sm text-slate-500 mb-5">
                  Sources detected during vector similarity search against reference documents.
                </p>

                {matchesList.length === 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                    No matching reference sources detected. The similarity score is minimal or within acceptable boundaries.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {matchesList.map((m, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedSourceId(idx)}
                          className={`rounded-lg px-3.5 py-2 text-xs font-medium border transition ${
                            selectedSourceId === idx
                              ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {m.source || m.name || `Source #${idx + 1}`} ({m.similarity ? `${m.similarity}%` : "Match"})
                        </button>
                      ))}
                    </div>

                    {selectedSource && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 mt-4 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">
                              {selectedSource.source || "Reference Document"}
                            </p>
                            <p className="text-xs text-slate-500">
                              Type: {selectedSource.type} &bull; Document Overlap: <span className="font-semibold text-slate-800">{selectedSource.similarity}%</span>
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            selectedSource.similarity > 30 ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {selectedSource.similarity}% Overlap
                          </span>
                        </div>

                        {selectedSource.matched_segments && selectedSource.matched_segments.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Highlighted Sentence Matches ({selectedSource.matched_segments.length} segment{selectedSource.matched_segments.length > 1 ? "s" : ""})
                              </p>
                              <span className="text-[11px] text-slate-500">
                                Match criteria: Cosine similarity &ge; 60%
                              </span>
                            </div>
                            {selectedSource.matched_segments.map((seg, sIdx) => (
                              <div key={sIdx} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2.5">
                                <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100">
                                  <span className="font-semibold text-slate-700">Segment #{sIdx + 1}</span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    {Math.round(seg.similarity || 0)}% Similarity
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="rounded border border-amber-200 bg-amber-50/50 p-3 text-xs text-slate-800 leading-relaxed">
                                    <p className="font-semibold text-amber-900 mb-1 text-[11px] uppercase tracking-wider">Submitted Passage</p>
                                    <p className="italic">&ldquo;{seg.target_snippet}&rdquo;</p>
                                  </div>
                                  <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 leading-relaxed">
                                    <p className="font-semibold text-slate-600 mb-1 text-[11px] uppercase tracking-wider">Reference Passage ({selectedSource.source})</p>
                                    <p className="italic">&ldquo;{seg.source_snippet}&rdquo;</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded border border-slate-200 bg-white p-4 text-xs text-slate-600 space-y-2">
                            {selectedSource.text && (
                              <p className="leading-relaxed font-mono bg-slate-50 p-2.5 rounded border border-slate-100">
                                &ldquo;{selectedSource.text}&rdquo;
                              </p>
                            )}
                            <p className="text-slate-500">
                              Document-level similarity was detected across this reference source based on TF-IDF representation and cosine proximity. No specific verbatim sentence matches exceeded the segment threshold.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AI Reasoning Pipeline Summary */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
                <h2 className="text-base font-semibold text-slate-900 mb-2">
                  Academic Reasoning Pipeline
                </h2>
                <p className="text-sm text-slate-500 mb-4">
                  Multi-phase analysis pipeline applied to evaluate this submission.
                </p>
                <div className="flex flex-col lg:flex-row lg:items-center lg:flex-wrap gap-2">
                  {REASONING_FLOW.map((step, index) => (
                    <div key={step} className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
                        {step}
                      </span>
                      {index < REASONING_FLOW.length - 1 && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 flex-shrink-0 lg:rotate-0 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Professor Review Form */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
                <h2 className="text-base font-semibold text-slate-900 mb-1">
                  Professor Review & Decision
                </h2>
                <p className="text-sm text-slate-500 mb-5">
                  Record your evaluation and guidance. The student will see your comments on their report view.
                </p>

                {saveMessage && (
                  <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                    {saveMessage}
                  </div>
                )}
                {saveError && (
                  <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                    {saveError}
                  </div>
                )}

                <form onSubmit={handleSaveReview} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="reviewStatus" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Review Status Decision
                      </label>
                      <select
                        id="reviewStatus"
                        name="reviewStatus"
                        value={reviewStatus}
                        onChange={(e) => setReviewStatus(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        {REVIEW_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="professorDecision" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Recommended Action
                      </label>
                      <select
                        id="professorDecision"
                        name="professorDecision"
                        value={professorDecision}
                        onChange={(e) => setProfessorDecision(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        {DECISION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="comments" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Professor Academic Feedback
                    </label>
                    <textarea
                      id="comments"
                      name="comments"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Add instructor comments, context on overlap, or guidance for the student..."
                      rows={4}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                      {isSaving ? "Saving..." : "Save Review Decision"}
                    </button>
                    <Link
                      to="/professor/submissions"
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                      Cancel & Return
                    </Link>
                  </div>
                </form>
              </div>

              {/* Actions & Official Report Export */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={isDownloadingOriginal}
                      onClick={handleDownloadOriginal}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
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
                      Download Original File
                    </button>
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={handleExportReport}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition"
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
                      Download Audit Report
                    </button>
                  </div>
                  <Link
                    to="/professor/submissions"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    Back to Submissions
                  </Link>
                </div>
                {exportSuccess && (
                  <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800" role="status">
                    {exportSuccess}
                  </div>
                )}
                {exportError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700" role="alert">
                    {exportError}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}