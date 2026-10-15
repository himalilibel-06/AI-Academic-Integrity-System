import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  createFacultyReview,
  getFacultyReview,
  saveFacultyFeedback,
  requestFacultyRevision,
  completeFacultyReview,
  analyzeSubmissionReadiness,
} from "../service/api";
import { getResearchProjects, getResearchProjectById } from "../service/projectStorage";
import { getManuscriptsByProject } from "../service/manuscriptStorage";

const icons = {
  clipboardCheck: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  user: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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
  fileText: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  save: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  rotateCcw: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  ),
};

const DEFAULT_COMMENTS = {
  research_problem: "",
  research_gap: "",
  proposed_method: "",
  expected_contribution: "",
  evidence_literature: "",
  research_claims: "",
};

export default function FacultyReview() {
  const { projectId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Project & Manuscript State
  const [project, setProject] = useState(null);
  const [manuscripts, setManuscripts] = useState([]);

  // Review State
  const [review, setReview] = useState(null);
  const [comments, setComments] = useState(DEFAULT_COMMENTS);
  const [recommendations, setRecommendations] = useState("");
  const [reviewerName, setReviewerName] = useState(user?.full_name || user?.name || "Faculty Reviewer");

  // Read-only analysis summary from existing services
  const [readinessSummary, setReadinessSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Load project & initialize review session
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        // 1. Load project from local storage or preset
        let proj = getResearchProjectById(projectId);
        if (!proj) {
          const all = getResearchProjects();
          proj = all.find((p) => p.id === projectId) || {
            id: projectId,
            title: `Research Project ${projectId}`,
            domain: "Computer Science",
            researchProblem: "Research problem formulation.",
            researchObjective: "Research objective.",
            claimedGap: "Claimed gap in prior literature.",
            proposedMethod: "Proposed methodology.",
            expectedContribution: "Expected scholarly contribution.",
          };
        }
        if (isMounted) setProject(proj);

        // 2. Load manuscripts
        const docs = getManuscriptsByProject(projectId);
        if (isMounted) setManuscripts(docs || []);

        // 3. Initialize or fetch review from backend
        let revData;
        try {
          const revRes = await getFacultyReview(projectId);
          revData = revRes.review;
        } catch {
          // If no review exists yet, initialize it
          const createRes = await createFacultyReview({
            projectId: projectId,
            reviewerName: user?.full_name || user?.name || "Faculty Reviewer",
            reviewerId: user?.id ? String(user.id) : "prof-01",
          });
          revData = createRes.review;
        }

        if (isMounted) {
          setReview(revData);
          setComments({
            ...DEFAULT_COMMENTS,
            ...(revData.comments || {}),
          });
          setRecommendations(revData.recommendations || "");
          if (revData.reviewer_name) {
            setReviewerName(revData.reviewer_name);
          }
        }

        // 4. Fetch existing analysis summary without recomputing algorithms
        try {
          const readinessRes = await analyzeSubmissionReadiness({
            projectId: projectId,
            researchInformation: {
              title: proj.title,
              claimed_research_gap: proj.claimedGap || proj.claimed_research_gap,
              expected_contribution: proj.expectedContribution || proj.expected_contribution,
              research_problem: proj.researchProblem || proj.research_problem,
            },
          });
          if (isMounted) setReadinessSummary(readinessRes);
        } catch (e) {
          console.warn("Could not fetch readiness summary:", e);
        }
      } catch (err) {
        if (isMounted) setError(err?.message || "Failed to load project or review data.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (projectId) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [projectId, user]);

  // Handle comment field changes
  const handleCommentChange = (section, value) => {
    setComments((prev) => ({
      ...prev,
      [section]: value,
    }));
  };

  // Action: Save Feedback
  const handleSaveFeedback = async () => {
    if (!review?.review_id) return;
    setActionLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await saveFacultyFeedback({
        reviewId: review.review_id,
        comments,
        recommendations,
        reviewerName,
      });
      setReview(res.review);
      setMessage("Faculty feedback saved successfully.");
    } catch (err) {
      setError(err?.message || "Failed to save feedback.");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Request Revision
  const handleRequestRevision = async () => {
    if (!review?.review_id) return;

    // Check that at least one field has text
    const hasText = Object.values(comments).some((v) => v && v.trim().length > 0) || (recommendations && recommendations.trim().length > 0);
    if (!hasText) {
      setError("Request Revision requires at least one feedback or recommendation field to contain text.");
      return;
    }

    setActionLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await requestFacultyRevision({
        reviewId: review.review_id,
        comments,
        recommendations,
        reviewerName,
      });
      setReview(res.review);
      setMessage("Status updated to 'Revision Requested'. Student will be notified that faculty feedback is available.");
    } catch (err) {
      setError(err?.message || "Failed to request revision.");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Mark Reviewed
  const handleCompleteReview = async () => {
    if (!review?.review_id) return;
    setActionLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await completeFacultyReview({
        reviewId: review.review_id,
        comments,
        recommendations,
        reviewerName,
      });
      setReview(res.review);
      setMessage("Review completed. Status updated to 'Reviewed'.");
    } catch (err) {
      setError(err?.message || "Failed to mark review as completed.");
    } finally {
      setActionLoading(false);
    }
  };

  // Status badge styling
  const renderStatusBadge = (status) => {
    switch (status) {
      case "Reviewed":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Reviewed
          </span>
        );
      case "Revision Requested":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
            Revision Requested
          </span>
        );
      case "Feedback Provided":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
            Feedback Provided
          </span>
        );
      case "In Review":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            In Review
          </span>
        );
      case "Not Reviewed":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            Not Reviewed
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading research project and faculty review session...</div>
      </div>
    );
  }

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
                  Faculty Review
                </span>
              </div>
              <span className="text-xs text-slate-400">Structured Academic Feedback & Advisory Workspace</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link to="/professor/dashboard" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
              Professor Dashboard
            </Link>
            <Link to="/professor/submissions" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
              Review Submissions
            </Link>
            <div className="h-4 w-px bg-slate-800 mx-1" />
            <span className="text-xs text-slate-300 font-medium px-2 py-1 bg-slate-800/80 rounded-md">
              {reviewerName}
            </span>
            <button onClick={logout} className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-500/10 transition">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- Main Container ---------------- */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Banner Alert Messages */}
        {message && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
            <icons.check className="w-4 h-4 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
            <icons.alertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Header: Project & Review Status */}
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                <span>Project ID: {project?.id}</span>
                <span>•</span>
                <span>{project?.domain || "General Computer Science"}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
                {project?.title || "Research Project Review"}
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Reviewing student research project. Provide qualitative feedback and academic recommendations.
              </p>
            </div>

            <div className="flex items-center space-x-3 self-start md:self-auto">
              <div className="text-right">
                <span className="block text-[11px] text-slate-500 font-medium">Review Status</span>
                {renderStatusBadge(review?.status || "Not Reviewed")}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
            <div>
              <span className="font-semibold text-slate-300">Reviewer Name:</span>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="Reviewer display name"
                className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <span className="font-semibold text-slate-300">Associated Manuscripts:</span>
              <div className="mt-1 text-slate-300">
                {manuscripts.length > 0
                  ? `${manuscripts.length} draft version(s) uploaded`
                  : "No drafts attached yet"}
              </div>
            </div>
            <div>
              <span className="font-semibold text-slate-300">Last Review Update:</span>
              <div className="mt-1 text-slate-300">
                {review?.updated_at ? new Date(review.updated_at).toLocaleString() : "Not updated"}
              </div>
            </div>
          </div>
        </div>

        {/* Academic Guardrail Notice */}
        <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex items-start space-x-3 text-xs text-indigo-200">
          <icons.shield className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold text-indigo-300 uppercase tracking-wider text-[11px]">
              Academic Advisory Scope
            </div>
            <p className="leading-relaxed">
              Faculty feedback is qualitative and human-advisory. GapGuard AI does not grade or approve research.
              Marking a review completed indicates human academic review was conducted, not that research is guaranteed publication or scientifically proven.
            </p>
          </div>
        </div>

        {/* 2-Column Layout: Left = Project & Analyses, Right = Feedback Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Research Overview & Existing Analysis Summaries */}
          <div className="lg:col-span-6 space-y-6">
            {/* Research Overview */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
                <icons.fileText className="w-4 h-4 text-indigo-400" />
                <span>Research Project Overview</span>
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-400 block mb-0.5 uppercase tracking-wider text-[10px]">
                    Research Problem
                  </span>
                  <p className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 leading-relaxed">
                    {project?.researchProblem || project?.research_problem || "No problem formulation specified."}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-slate-400 block mb-0.5 uppercase tracking-wider text-[10px]">
                    Claimed Research Gap
                  </span>
                  <p className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 leading-relaxed">
                    {project?.claimedGap || project?.claimed_research_gap || "No research gap specified."}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-slate-400 block mb-0.5 uppercase tracking-wider text-[10px]">
                    Proposed Method
                  </span>
                  <p className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 leading-relaxed">
                    {project?.proposedMethod || project?.proposed_method || "No methodology specified."}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-slate-400 block mb-0.5 uppercase tracking-wider text-[10px]">
                    Expected Contribution
                  </span>
                  <p className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 leading-relaxed">
                    {project?.expectedContribution || project?.expected_contribution || "No contribution specified."}
                  </p>
                </div>
              </div>
            </div>

            {/* Analysis Summary (Reused existing analyses without recomputing) */}
            {readinessSummary && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">Existing Analysis Summary</h2>
                  <Link
                    to={`/student/submission-readiness?projectId=${projectId}`}
                    className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                  >
                    View Full Readiness Report
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Gap Analysis</span>
                    <div className="font-bold text-slate-200">
                      {readinessSummary.gap_review?.current_status || "Not Run"}
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      {readinessSummary.gap_review?.supporting_evidence_count || 0} supporting, {readinessSummary.gap_review?.potentially_contradictory_evidence_count || 0} contradictory
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Contribution</span>
                    <div className="font-bold text-slate-200">
                      {readinessSummary.contribution_review?.current_status || "Not Run"}
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      {readinessSummary.contribution_review?.clearly_differentiated_count || 0} clearly differentiated
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Evidence Coverage</span>
                    <div className="font-bold text-slate-200">
                      {readinessSummary.evidence_coverage_review?.coverage_percentage !== null
                        ? `${readinessSummary.evidence_coverage_review?.coverage_percentage}%`
                        : "No usable claims"}
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      {readinessSummary.evidence_coverage_review?.supported_claims || 0} of {readinessSummary.evidence_coverage_review?.usable_claims || 0} claims supported
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Revision Review</span>
                    <div className="font-bold text-slate-200">
                      {readinessSummary.revision_review?.has_revision ? "Revision Draft" : "Initial Draft"}
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      {readinessSummary.revision_review?.changed_fields_count || 0} field(s) changed
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Faculty Feedback Form & Action Buttons */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <icons.user className="w-4 h-4 text-indigo-400" />
                  <span>Faculty Feedback Form</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Qualitative commentary on core sections. Empty sections are permitted.
                </p>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* 1. Research Problem */}
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    1. Research Problem Feedback:
                  </label>
                  <textarea
                    rows={2}
                    value={comments.research_problem}
                    onChange={(e) => handleCommentChange("research_problem", e.target.value)}
                    placeholder="Comments on problem articulation, clarity, or clinical/domain context..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 2. Research Gap */}
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    2. Research Gap Feedback:
                  </label>
                  <textarea
                    rows={2}
                    value={comments.research_gap}
                    onChange={(e) => handleCommentChange("research_gap", e.target.value)}
                    placeholder="Comments on gap novelty, missing literature, or potential contradictions..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 3. Proposed Method */}
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    3. Proposed Method Feedback:
                  </label>
                  <textarea
                    rows={2}
                    value={comments.proposed_method}
                    onChange={(e) => handleCommentChange("proposed_method", e.target.value)}
                    placeholder="Comments on architectural soundess, baselines, or ablation design..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 4. Expected Contribution */}
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    4. Expected Contribution Feedback:
                  </label>
                  <textarea
                    rows={2}
                    value={comments.expected_contribution}
                    onChange={(e) => handleCommentChange("expected_contribution", e.target.value)}
                    placeholder="Comments on contribution differentiation, boundaries, or novelty..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 5. Evidence / Literature */}
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    5. Evidence / Literature Feedback:
                  </label>
                  <textarea
                    rows={2}
                    value={comments.evidence_literature}
                    onChange={(e) => handleCommentChange("evidence_literature", e.target.value)}
                    placeholder="Suggestions for cited literature, benchmark papers, or missing citations..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 6. Research Claims */}
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    6. Research Claims Feedback:
                  </label>
                  <textarea
                    rows={2}
                    value={comments.research_claims}
                    onChange={(e) => handleCommentChange("research_claims", e.target.value)}
                    placeholder="Comments on claim scope, empirical backing, or metric alignment..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 7. Overall Recommendations */}
                <div className="pt-2 border-t border-slate-800">
                  <label className="font-semibold text-indigo-300 block mb-1">
                    7. Overall Academic Recommendations:
                  </label>
                  <textarea
                    rows={3}
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                    placeholder="Overall guidance, next research steps, or prioritized revision items..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <button
                  onClick={handleSaveFeedback}
                  disabled={actionLoading}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition border border-slate-700"
                >
                  <icons.save className="w-4 h-4 text-slate-400" />
                  <span>{actionLoading ? "Saving..." : "Save Feedback"}</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleRequestRevision}
                    disabled={actionLoading}
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 font-semibold transition border border-amber-500/40"
                  >
                    <icons.rotateCcw className="w-4 h-4 text-amber-400" />
                    <span>Request Revision</span>
                  </button>

                  <button
                    onClick={handleCompleteReview}
                    disabled={actionLoading}
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-md shadow-indigo-600/20"
                  >
                    <icons.check className="w-4 h-4 text-white" />
                    <span>Mark Reviewed</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
