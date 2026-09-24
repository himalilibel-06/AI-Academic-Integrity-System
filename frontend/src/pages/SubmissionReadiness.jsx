import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { analyzeSubmissionReadiness } from "../service/api";
import { getResearchProjects } from "../service/projectStorage";
import { getManuscriptsByProject, getManuscripts } from "../service/manuscriptStorage";

/* ---------------------------------------------------------
   Academic SVG Icons
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
  clipboardCheck: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  shield: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" {...p}>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  alertTriangle: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinejoin="round" />
      <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
    </svg>
  ),
  info: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" strokeLinecap="round" />
      <line x1="12" y1="8" x2="12.01" y2="8" strokeLinecap="round" />
    </svg>
  ),
  sparkles: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 3l1.9 4.8L18.7 9.7l-4.8 1.9L12 16.5l-1.9-4.9-4.9-1.9 4.9-1.9L12 3z" strokeLinejoin="round" />
      <path d="M19 16l.9 2.2 2.1.9-2.1.9-.9 2.1-.9-2.1-2.2-.9 2.2-.9.9-2.2z" strokeLinejoin="round" />
    </svg>
  ),
  layers: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  fileText: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  gitCommit: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="4" />
      <line x1="1.05" y1="12" x2="7" y2="12" />
      <line x1="17.01" y1="12" x2="22.96" y2="12" />
    </svg>
  ),
};

const DEFAULT_DEMO_PROJECT = {
  id: "demo-project-1",
  title: "Robust Deep Feature Attribution in Agricultural Disease Detection",
  domain: "Computer Vision & Agriculture AI",
  claimed_research_gap: "Existing lightweight Vision Transformers fail to provide spatially calibrated feature attribution on underrepresented sub-Saharan foliar crop diseases under variable lighting.",
  expected_contribution: "A hierarchical token attribution alignment method with integrated post-training quantization, achieving calibrated pixel attribution maps while reducing model parameter footprint by 45%.",
  research_problem: "Field-deployable crop disease models suffer from uninterpretable spatial attributions and high false-positive rates when tested outside laboratory image distributions.",
  proposed_method: "Cross-attention attribution pooling with contrastive token alignment on edge TPU hardware.",
  evaluation_metrics: "Attribution Intersection-over-Union (IoU), Top-1 Accuracy, Inference Latency (ms), Parameter Count.",
  major_claims: [
    "Attribution alignment improves diagnostic interpretability by 24% without degrading predictive AUC.",
    "Post-training token quantization reduces parameter footprint by 45% on mobile edge accelerators.",
    "Hierarchical token subsampling prevents attention collapse in severe field illumination variations.",
  ],
};

export default function SubmissionReadiness() {
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();

  // Storage & Selector state
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectManuscripts, setProjectManuscripts] = useState([]);
  const [selectedManuscriptId, setSelectedManuscriptId] = useState("");
  const [previousManuscriptId, setPreviousManuscriptId] = useState("");

  // Report state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  // Interactive Checklist check-states
  const [completedTasks, setCompletedTasks] = useState({});

  // Active section filter/tab
  const [activeTab, setActiveTab] = useState("all");

  // Load projects from local storage
  useEffect(() => {
    try {
      const stored = getResearchProjects();
      if (stored && stored.length > 0) {
        setProjects(stored);
        const queryProj = searchParams.get("projectId");
        const initProj = queryProj && stored.some((p) => p.id === queryProj) ? queryProj : stored[0].id;
        setSelectedProjectId(initProj);
      } else {
        setProjects([DEFAULT_DEMO_PROJECT]);
        setSelectedProjectId(DEFAULT_DEMO_PROJECT.id);
      }
    } catch {
      setProjects([DEFAULT_DEMO_PROJECT]);
      setSelectedProjectId(DEFAULT_DEMO_PROJECT.id);
    }
  }, [searchParams]);

  // Load manuscripts for selected project
  useEffect(() => {
    if (!selectedProjectId) return;
    try {
      let docs = getManuscriptsByProject(selectedProjectId);
      if (!docs || docs.length === 0) {
        docs = getManuscripts();
      }
      setProjectManuscripts(docs || []);
      if (docs && docs.length > 0) {
        setSelectedManuscriptId(docs[docs.length - 1].id);
        if (docs.length > 1) {
          setPreviousManuscriptId(docs[0].id);
        } else {
          setPreviousManuscriptId("");
        }
      } else {
        setSelectedManuscriptId("");
        setPreviousManuscriptId("");
      }
    } catch {
      setProjectManuscripts([]);
    }
  }, [selectedProjectId]);

  // Active project data
  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || DEFAULT_DEMO_PROJECT;
  }, [projects, selectedProjectId]);

  // Handle generation of submission readiness report
  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);

    try {
      // Find manuscript objects
      const currentDoc = projectManuscripts.find((m) => m.id === selectedManuscriptId);
      const prevDoc = projectManuscripts.find((m) => m.id === previousManuscriptId);

      const researchInfo = currentDoc?.research_information || {
        title: currentProject.title,
        domain: currentProject.domain,
        claimed_research_gap: currentProject.claimed_research_gap,
        expected_contribution: currentProject.expected_contribution,
        research_problem: currentProject.research_problem,
        proposed_method: currentProject.proposed_method,
        evaluation_metrics: currentProject.evaluation_metrics,
        major_claims: currentProject.major_claims,
      };

      const prevInfo = prevDoc?.research_information || null;

      const res = await analyzeSubmissionReadiness({
        projectId: selectedProjectId,
        manuscriptId: selectedManuscriptId || undefined,
        previousManuscriptId: previousManuscriptId || undefined,
        researchInformation: researchInfo,
        previousResearchInfo: prevInfo,
        claims: researchInfo.major_claims || undefined,
        topK: 5,
      });

      setReport(res);
    } catch (err) {
      setError(err?.message || "Failed to generate Submission Readiness Report. Please check local services.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate initial report when project changes
  useEffect(() => {
    if (selectedProjectId) {
      handleGenerateReport();
    }
  }, [selectedProjectId]);

  // Toggle checklist item
  const toggleChecklist = (id) => {
    setCompletedTasks((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Helper for analysis status badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case "Available":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Available
          </span>
        );
      case "Review Recommended":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
            Review Recommended
          </span>
        );
      case "Insufficient Evidence":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
            Insufficient Evidence
          </span>
        );
      case "Not Run":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            Not Run
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ---------------- Navigation Header ---------------- */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <icons.clipboardCheck className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold tracking-tight text-white">GapGuard AI</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded">
                  Readiness
                </span>
              </div>
              <span className="text-xs text-slate-400">Explainable Pre-Submission Review Dashboard</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link to="/student/dashboard" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
              Dashboard
            </Link>
            <Link to="/student/gap-analysis" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
              Gap Analysis
            </Link>
            <Link to="/student/contribution-analysis" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
              Contribution
            </Link>
            <Link to="/student/evidence-coverage" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
              Evidence Coverage
            </Link>
            <Link to="/student/revision-comparison" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
              Revision
            </Link>
            <Link to="/student/faculty-feedback" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
              Faculty Feedback
            </Link>
            <div className="h-4 w-px bg-slate-800 mx-1" />
            <span className="text-xs text-slate-300 font-medium px-2 py-1 bg-slate-800/80 rounded-md">
              {user?.full_name || user?.email || "Student"}
            </span>
            <button onClick={logout} className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-500/10 transition">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- Main Content ---------------- */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Header & Project Selectors */}
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <icons.clipboardCheck className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Submission Readiness Report
                </h1>
              </div>
              <p className="mt-1 text-sm text-slate-400 max-w-2xl">
                Aggregates existing Research Gap, Contribution Differentiation, Evidence Coverage, Reasoning, and Revision analyses into an explainable review dashboard.
              </p>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md shadow-indigo-600/20 transition self-start md:self-auto"
            >
              <icons.sparkles className="w-4 h-4" />
              <span>{loading ? "Aggregating Analyses..." : "Refresh Readiness Review"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 text-xs">
            <div>
              <label className="font-semibold text-slate-400 block mb-1">Research Project:</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title || `Project ${p.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-400 block mb-1">Current Manuscript Version:</label>
              <select
                value={selectedManuscriptId}
                onChange={(e) => setSelectedManuscriptId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {projectManuscripts.length > 0 ? (
                  projectManuscripts.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.file_name || `Manuscript ${m.id}`} (v{m.version || 1})
                    </option>
                  ))
                ) : (
                  <option value="">Default Project Information</option>
                )}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-400 block mb-1">Previous Version (Optional):</label>
              <select
                value={previousManuscriptId}
                onChange={(e) => setPreviousManuscriptId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">None (Initial Submission)</option>
                {projectManuscripts.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.file_name || `Manuscript ${m.id}`} (v{m.version || 1})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
            <icons.alertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Mandatory Corpus Limitation Warning (Always Visible Banner) */}
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start space-x-3 text-xs text-amber-200">
          <icons.shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-300 uppercase tracking-wider text-[11px]">
              Academic Guardrail & Corpus Scope
            </div>
            <p className="leading-relaxed">
              {report?.corpus_limitation?.warning || (
                "This report is based only on the literature currently available in the GapGuard corpus. " +
                "It does not establish global literature coverage, scientific truth, or research novelty. " +
                "Human academic review is required."
              )}
            </p>
          </div>
        </div>

        {/* Overall Summary Cards (Without a Single Score) */}
        {report && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <span>Overall Review Status</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Multi-module status breakdown. This dashboard does not produce a publication probability or readiness score.
                  </p>
                </div>
                <div className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  {report.overall_summary?.overall_guidance}
                </div>
              </div>

              {/* Status grid across all 5 analyses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Gap Review</div>
                  <div>{renderStatusBadge(report.overall_summary?.analyses_status?.research_gap_review)}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {report.gap_review?.current_status || "Not Run"}
                  </div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Contribution</div>
                  <div>{renderStatusBadge(report.overall_summary?.analyses_status?.contribution_differentiation_review)}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {report.contribution_review?.current_status || "Not Run"}
                  </div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Evidence Coverage</div>
                  <div>{renderStatusBadge(report.overall_summary?.analyses_status?.evidence_coverage_review)}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {report.evidence_coverage_review?.coverage_percentage !== null
                      ? `${report.evidence_coverage_review?.coverage_percentage}% Coverage`
                      : "No usable claims"}
                  </div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reasoning</div>
                  <div>{renderStatusBadge(report.overall_summary?.analyses_status?.reasoning_review)}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {report.reasoning_review?.bayesian_evidence_category
                      ? `Category: ${report.reasoning_review.bayesian_evidence_category}`
                      : "Not Run"}
                  </div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Revision Review</div>
                  <div>{renderStatusBadge(report.overall_summary?.analyses_status?.revision_review)}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {report.revision_review?.has_revision
                      ? `${report.revision_review.changed_fields_count} field(s) changed`
                      : "Initial draft"}
                  </div>
                </div>
              </div>

              {/* Status tally pill bar */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <span className="text-slate-400">Aggregated Status Counts:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {report.overall_summary?.status_counts?.available || 0} Available
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {report.overall_summary?.status_counts?.review_recommended || 0} Review Recommended
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {report.overall_summary?.status_counts?.insufficient_evidence || 0} Insufficient Evidence
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {report.overall_summary?.status_counts?.not_run || 0} Not Run
                </span>
              </div>
            </div>

            {/* Section Filter Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-lg border font-medium transition ${
                  activeTab === "all"
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800"
                }`}
              >
                All Sections
              </button>
              <button
                onClick={() => setActiveTab("gap")}
                className={`px-3 py-1.5 rounded-lg border font-medium transition ${
                  activeTab === "gap"
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800"
                }`}
              >
                A. Research Gap Review
              </button>
              <button
                onClick={() => setActiveTab("contrib")}
                className={`px-3 py-1.5 rounded-lg border font-medium transition ${
                  activeTab === "contrib"
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800"
                }`}
              >
                B. Contribution Differentiation
              </button>
              <button
                onClick={() => setActiveTab("coverage")}
                className={`px-3 py-1.5 rounded-lg border font-medium transition ${
                  activeTab === "coverage"
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800"
                }`}
              >
                C. Evidence Coverage
              </button>
              <button
                onClick={() => setActiveTab("claims")}
                className={`px-3 py-1.5 rounded-lg border font-medium transition ${
                  activeTab === "claims"
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800"
                }`}
              >
                D. Research Claims
              </button>
              <button
                onClick={() => setActiveTab("revision")}
                className={`px-3 py-1.5 rounded-lg border font-medium transition ${
                  activeTab === "revision"
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800"
                }`}
              >
                E. Revision Review
              </button>
              <button
                onClick={() => setActiveTab("checklist")}
                className={`px-3 py-1.5 rounded-lg border font-medium transition ${
                  activeTab === "checklist"
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800"
                }`}
              >
                Review Checklist
              </button>
            </div>

            {/* ---------------- SECTION A: Research Gap Review ---------------- */}
            {(activeTab === "all" || activeTab === "gap") && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-md">
                      <icons.fileText className="w-4 h-4" />
                    </span>
                    <h3 className="text-base font-bold text-white">A. Research Gap Review</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Analysis Status:</span>
                    {renderStatusBadge(report.gap_review?.analysis_status)}
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                      {report.gap_review?.current_status}
                    </span>
                  </div>
                </div>

                {/* Evidence metric counts */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
                    <div className="text-slate-400 text-[11px]">Supporting</div>
                    <div className="text-base font-bold text-emerald-400">
                      {report.gap_review?.supporting_evidence_count || 0}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
                    <div className="text-slate-400 text-[11px]">Partial</div>
                    <div className="text-base font-bold text-indigo-300">
                      {report.gap_review?.partial_evidence_count || 0}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
                    <div className="text-slate-400 text-[11px]">Contradictory</div>
                    <div className="text-base font-bold text-amber-400">
                      {report.gap_review?.potentially_contradictory_evidence_count || 0}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
                    <div className="text-slate-400 text-[11px]">Insufficient</div>
                    <div className="text-base font-bold text-slate-400">
                      {report.gap_review?.insufficient_evidence_count || 0}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg col-span-2 sm:col-span-1">
                    <div className="text-slate-400 text-[11px]">Total Papers</div>
                    <div className="text-base font-bold text-white">
                      {report.gap_review?.evidence_count || 0}
                    </div>
                  </div>
                </div>

                {/* Important Findings */}
                {report.gap_review?.important_findings?.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-300">Important Literature Findings:</div>
                    <ul className="space-y-1 text-xs text-slate-400 pl-4 list-disc">
                      {report.gap_review.important_findings.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Reason */}
                <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <span className="font-semibold text-slate-300">Reason: </span>
                  {report.gap_review?.reason}
                </div>

                {/* Recommended Next Action */}
                <div className="bg-indigo-950/30 border border-indigo-800/40 p-3.5 rounded-xl text-xs flex items-start space-x-2.5">
                  <icons.sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-indigo-300">Recommended Action: </span>
                    <span className="text-indigo-200">{report.gap_review?.recommended_action}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- SECTION B: Contribution Review ---------------- */}
            {(activeTab === "all" || activeTab === "contrib") && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-md">
                      <icons.layers className="w-4 h-4" />
                    </span>
                    <h3 className="text-base font-bold text-white">B. Contribution Differentiation Review</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Analysis Status:</span>
                    {renderStatusBadge(report.contribution_review?.analysis_status)}
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                      {report.contribution_review?.current_status}
                    </span>
                  </div>
                </div>

                {/* Contribution counts */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
                    <div className="text-slate-400 text-[11px]">Papers Analyzed</div>
                    <div className="text-base font-bold text-white">
                      {report.contribution_review?.number_of_papers_analyzed || 0}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
                    <div className="text-slate-400 text-[11px]">Clearly Differentiated</div>
                    <div className="text-base font-bold text-emerald-400">
                      {report.contribution_review?.clearly_differentiated_count || 0}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
                    <div className="text-slate-400 text-[11px]">Partially Differentiated</div>
                    <div className="text-base font-bold text-indigo-300">
                      {report.contribution_review?.partially_differentiated_count || 0}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
                    <div className="text-slate-400 text-[11px]">Needs Clarification</div>
                    <div className="text-base font-bold text-amber-400">
                      {report.contribution_review?.needs_clarification_count || 0}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg col-span-2 sm:col-span-1">
                    <div className="text-slate-400 text-[11px]">Potential Overlap</div>
                    <div className="text-base font-bold text-rose-400">
                      {report.contribution_review?.potential_overlap_count || 0}
                    </div>
                  </div>
                </div>

                {/* Dimensional Overlaps */}
                {report.contribution_review?.important_dimensional_overlaps?.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-300">Strongest Overlapping Dimensions:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {report.contribution_review.important_dimensional_overlaps.map((dim, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1">
                          <div className="flex justify-between text-slate-400">
                            <span className="capitalize">{dim.dimension.replace("_", " ")}</span>
                            <span>{(dim.average_score * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, dim.average_score * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Important Findings */}
                {report.contribution_review?.important_findings?.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-300">Findings:</div>
                    <ul className="space-y-1 text-xs text-slate-400 pl-4 list-disc">
                      {report.contribution_review.important_findings.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Reason */}
                <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <span className="font-semibold text-slate-300">Reason: </span>
                  {report.contribution_review?.reason}
                </div>

                {/* Recommended Next Action */}
                <div className="bg-indigo-950/30 border border-indigo-800/40 p-3.5 rounded-xl text-xs flex items-start space-x-2.5">
                  <icons.sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-indigo-300">Recommended Action: </span>
                    <span className="text-indigo-200">{report.contribution_review?.recommended_action}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- SECTION C: Evidence Coverage Review ---------------- */}
            {(activeTab === "all" || activeTab === "coverage") && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-md">
                      <icons.shield className="w-4 h-4" />
                    </span>
                    <h3 className="text-base font-bold text-white">C. Evidence Coverage Review</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Analysis Status:</span>
                    {renderStatusBadge(report.evidence_coverage_review?.analysis_status)}
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                      {report.evidence_coverage_review?.current_status}
                    </span>
                  </div>
                </div>

                {/* Metric pill bar */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
                    <div className="text-slate-400 text-[11px]">Total Claims</div>
                    <div className="text-base font-bold text-white">
                      {report.evidence_coverage_review?.total_claims || 0}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
                    <div className="text-slate-400 text-[11px]">Usable Claims</div>
                    <div className="text-base font-bold text-white">
                      {report.evidence_coverage_review?.usable_claims || 0}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
                    <div className="text-slate-400 text-[11px]">Supported</div>
                    <div className="text-base font-bold text-emerald-400">
                      {report.evidence_coverage_review?.supported_claims || 0}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
                    <div className="text-slate-400 text-[11px]">Partially Supported</div>
                    <div className="text-base font-bold text-indigo-300">
                      {report.evidence_coverage_review?.partially_supported_claims || 0}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg col-span-2 sm:col-span-1">
                    <div className="text-slate-400 text-[11px]">Insufficient Evidence</div>
                    <div className="text-base font-bold text-amber-400">
                      {report.evidence_coverage_review?.insufficient_evidence_claims || 0}
                    </div>
                  </div>
                </div>

                {/* Evidence Coverage percentage display */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-300">Evidence Coverage Calculation: </span>
                    <span className="text-slate-400">
                      {report.evidence_coverage_review?.coverage_percentage !== null
                        ? `${report.evidence_coverage_review.coverage_percentage}% of usable claims supported by available corpus evidence`
                        : report.evidence_coverage_review?.coverage_display}
                    </span>
                  </div>
                  {report.evidence_coverage_review?.coverage_percentage !== null && (
                    <span className="px-3 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 rounded-lg font-bold">
                      {report.evidence_coverage_review.coverage_percentage}%
                    </span>
                  )}
                </div>

                {/* Reason */}
                <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <span className="font-semibold text-slate-300">Reason: </span>
                  {report.evidence_coverage_review?.reason}
                </div>

                {/* Recommended Next Action */}
                <div className="bg-indigo-950/30 border border-indigo-800/40 p-3.5 rounded-xl text-xs flex items-start space-x-2.5">
                  <icons.sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-indigo-300">Recommended Action: </span>
                    <span className="text-indigo-200">{report.evidence_coverage_review?.recommended_action}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- SECTION D: Research Claim Review ---------------- */}
            {(activeTab === "all" || activeTab === "claims") && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-md">
                      <icons.fileText className="w-4 h-4" />
                    </span>
                    <span>D. Research Claim Review</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Evaluates individual author claims against available corpus literature. Statements reflect retrieval evidence, not scientific truth.
                  </p>
                </div>

                {report.research_claim_review?.length > 0 ? (
                  <div className="space-y-3">
                    {report.research_claim_review.map((claimItem, idx) => (
                      <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="font-semibold text-slate-200 flex items-start space-x-2">
                            <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] mt-0.5">
                              #{idx + 1}
                            </span>
                            <span>{claimItem.claim_text}</span>
                          </div>
                          <div>{renderStatusBadge(claimItem.evidence_status)}</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                          <div>
                            <span className="text-slate-500">Strongest Corpus Similarity: </span>
                            <span className="font-medium text-slate-300">
                              {(claimItem.strongest_similarity * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Matched Literature Count: </span>
                            <span className="font-medium text-slate-300">
                              {claimItem.matched_literature_count} paper(s)
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-900/60 rounded-lg text-slate-300">
                          <span className="font-semibold text-indigo-300">Review Guidance: </span>
                          <span>{claimItem.review_recommendation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
                    No major claims extracted to evaluate. Provide manuscript text with extracted claims to view claim-by-claim evidence.
                  </div>
                )}
              </div>
            )}

            {/* ---------------- SECTION E: Revision Review ---------------- */}
            {(activeTab === "all" || activeTab === "revision") && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-md">
                      <icons.gitCommit className="w-4 h-4" />
                    </span>
                    <h3 className="text-base font-bold text-white">E. Revision Review</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Analysis Status:</span>
                    {renderStatusBadge(report.revision_review?.analysis_status)}
                  </div>
                </div>

                {report.revision_review?.has_revision ? (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block text-[11px]">Previous Version</span>
                        <span className="font-semibold text-slate-200">
                          {report.revision_review.previous_version}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block text-[11px]">Current Version</span>
                        <span className="font-semibold text-slate-200">
                          {report.revision_review.current_version}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <div className="font-semibold text-slate-300">
                        Changed Research Fields ({report.revision_review.changed_fields_count}):
                      </div>
                      {report.revision_review.changed_research_fields?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {report.revision_review.changed_research_fields.map((f, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                              {f.replace("_", " ")}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-500">No field modifications detected between drafts.</div>
                      )}
                    </div>

                    {report.revision_review.revision_priority_guidance?.length > 0 && (
                      <div className="p-3.5 bg-indigo-950/20 border border-indigo-800/40 rounded-xl space-y-1.5">
                        <div className="font-semibold text-indigo-300">Revision Priority Guidance:</div>
                        <ul className="space-y-1 text-indigo-200 pl-4 list-disc">
                          {report.revision_review.revision_priority_guidance.map((g, i) => (
                            <li key={i}>{g}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 italic">
                      {report.revision_review.disclaimer}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="text-slate-300 font-medium">
                      {report.revision_review?.message || "Revision comparison is not available because a previous manuscript version was not selected."}
                    </div>
                    <p className="text-slate-500">
                      Initial manuscript draft. No penalty is applied for not having a previous draft version.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ---------------- SECTION F & G: Review Checklist ---------------- */}
            {(activeTab === "all" || activeTab === "checklist") && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center space-x-2">
                      <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-md">
                        <icons.check className="w-4 h-4" />
                      </span>
                      <span>Actionable Review Checklist</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Checklist tasks are academic review prompts, NOT automatic pass/fail requirements.
                    </p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-medium">
                    {Object.values(completedTasks).filter(Boolean).length} of {report.review_checklist?.length || 9} tasks reviewed
                  </span>
                </div>

                <div className="space-y-2">
                  {report.review_checklist?.map((taskItem) => {
                    const isChecked = !!completedTasks[taskItem.id];
                    return (
                      <div
                        key={taskItem.id}
                        onClick={() => toggleChecklist(taskItem.id)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start space-x-3 text-xs ${
                          isChecked
                            ? "bg-slate-950/40 border-slate-800 opacity-75"
                            : "bg-slate-950 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleChecklist(taskItem.id)}
                          className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`font-semibold ${isChecked ? "line-through text-slate-500" : "text-slate-200"}`}>
                              {taskItem.task}
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider px-2 py-0.5 bg-slate-900 rounded">
                              {taskItem.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {taskItem.guidance}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ---------------- SECTION F: Corpus Details ---------------- */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3 text-xs">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <icons.info className="w-4 h-4 text-indigo-400" />
                <span>Corpus & Evaluation Context</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-slate-400">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[11px]">Corpus Size</span>
                  <span className="font-semibold text-slate-200">{report.corpus_limitation?.corpus_size || 0} papers</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[11px]">Corpus Domain</span>
                  <span className="font-semibold text-slate-200">{report.corpus_limitation?.corpus_domain}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[11px]">Retrieval Method</span>
                  <span className="font-semibold text-slate-200">{report.corpus_limitation?.retrieval_method}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[11px]">Publication Year Range</span>
                  <span className="font-semibold text-slate-200">{report.corpus_limitation?.date_year_range}</span>
                </div>
              </div>
              <ul className="text-slate-500 text-[11px] list-disc pl-4 space-y-0.5">
                {report.corpus_limitation?.disclaimer_notes?.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
