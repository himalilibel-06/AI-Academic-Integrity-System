import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { compareManuscriptRevisions } from "../service/api";
import { getResearchProjects } from "../service/projectStorage";
import { getManuscriptsByProject, getManuscriptById } from "../service/manuscriptStorage";

/* ---------------------------------------------------------
   SVG Icons
   --------------------------------------------------------- */
const icons = {
  shield: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
    </svg>
  ),
  diff: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  gitCompare: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7M6 9v12" strokeLinecap="round" strokeLinejoin="round" />
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
  plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  minus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  equal: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <line x1="5" y1="9" x2="19" y2="9" />
      <line x1="5" y1="15" x2="19" y2="15" />
    </svg>
  ),
  chevronDown: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chevronUp: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const FIELD_LABELS = {
  title: "Manuscript Title",
  abstract: "Abstract",
  keywords: "Keywords",
  research_problem: "Research Problem",
  research_objective: "Research Objective",
  research_questions: "Research Questions",
  claimed_gap: "Claimed Research Gap",
  proposed_method: "Proposed Method",
  dataset_context: "Dataset / Context",
  expected_contribution: "Expected Contribution",
  evaluation_metrics: "Evaluation Metrics",
  major_claims: "Major Claims",
  references: "References / Citations",
};

export default function RevisionComparison() {
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();

  // State
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get("project_id") || "");
  const [projectManuscripts, setProjectManuscripts] = useState([]);
  const [prevManuscriptId, setPrevManuscriptId] = useState(searchParams.get("prev_id") || "");
  const [newManuscriptId, setNewManuscriptId] = useState(searchParams.get("new_id") || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);

  // Field filter & search
  const [fieldFilter, setFieldFilter] = useState("ALL");
  const [expandedFields, setExpandedFields] = useState({});

  // Load Projects
  useEffect(() => {
    try {
      const stored = getResearchProjects();
      setProjects(stored || []);
      if (!selectedProjectId && stored && stored.length > 0) {
        setSelectedProjectId(stored[0].id);
      }
    } catch {
      // Fallback
    }
  }, [selectedProjectId]);

  // Load Manuscripts when project changes
  useEffect(() => {
    if (selectedProjectId) {
      const manus = getManuscriptsByProject(selectedProjectId);
      setProjectManuscripts(manus || []);

      if (manus && manus.length >= 2) {
        // Pre-select first two if not explicitly selected
        if (!prevManuscriptId) setPrevManuscriptId(manus[0].id);
        if (!newManuscriptId) setNewManuscriptId(manus[1].id);
      } else if (manus && manus.length === 1) {
        if (!prevManuscriptId) setPrevManuscriptId(manus[0].id);
      }
    }
  }, [selectedProjectId, prevManuscriptId, newManuscriptId]);

  const toggleExpand = (fieldName) => {
    setExpandedFields((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  };

  const handleCompare = async () => {
    if (!selectedProjectId) {
      setError("Please select a research project.");
      return;
    }
    if (!prevManuscriptId || !newManuscriptId) {
      setError("Please select both a Previous Manuscript and a New Manuscript to compare.");
      return;
    }
    if (prevManuscriptId === newManuscriptId) {
      setError("Please select two distinct manuscript drafts to perform a revision comparison.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const prevDoc = getManuscriptById(prevManuscriptId);
      const newDoc = getManuscriptById(newManuscriptId);

      const payload = {
        project_id: selectedProjectId,
        previous_manuscript: {
          id: prevDoc?.id || prevManuscriptId,
          version: prevDoc?.version || "Draft 1",
          research_info: prevDoc?.researchInfo || {},
        },
        new_manuscript: {
          id: newDoc?.id || newManuscriptId,
          version: newDoc?.version || "Draft 2",
          research_info: newDoc?.researchInfo || {},
        },
      };

      const data = await compareManuscriptRevisions(payload);
      setComparisonResult(data);
      // Expand modified, added, removed fields by default
      const defaultExpanded = {};
      if (data?.field_comparisons) {
        Object.entries(data.field_comparisons).forEach(([field, comp]) => {
          if (comp.status !== "Unchanged" && comp.status !== "Not Available") {
            defaultExpanded[field] = true;
          }
        });
      }
      setExpandedFields(defaultExpanded);
    } catch (err) {
      console.error("Revision comparison failed:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to compare manuscript revisions.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger comparison on load if two manuscripts available
  useEffect(() => {
    if (selectedProjectId && prevManuscriptId && newManuscriptId && prevManuscriptId !== newManuscriptId) {
      handleCompare();
    }
  }, [selectedProjectId, prevManuscriptId, newManuscriptId]);

  // Filtered field list
  const filteredFields = useMemo(() => {
    if (!comparisonResult?.field_comparisons) return [];
    return Object.entries(comparisonResult.field_comparisons).filter(([_, comp]) => {
      if (fieldFilter === "ALL") return true;
      if (fieldFilter === "MODIFIED") return comp.status === "Modified";
      if (fieldFilter === "ADDED") return comp.status === "Added";
      if (fieldFilter === "REMOVED") return comp.status === "Removed";
      if (fieldFilter === "UNCHANGED") return comp.status === "Unchanged";
      if (fieldFilter === "NOT_AVAILABLE") return comp.status === "Not Available";
      return true;
    });
  }, [comparisonResult, fieldFilter]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "Unchanged":
        return "bg-slate-800 text-slate-300 border-slate-700";
      case "Modified":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "Added":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
      case "Removed":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      default:
        return "bg-slate-900 text-slate-500 border-slate-800";
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "HIGH":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "MEDIUM":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  const summary = comparisonResult?.summary;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ---------------- Navigation Bar ---------------- */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <icons.shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight">
                GapGuard <span className="text-sky-400">AI</span>
              </span>
              <span className="ml-2 text-xs uppercase px-2 py-0.5 rounded font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Phase 10A • Revision Comparison
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link to="/student/dashboard" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
              Dashboard
            </Link>
            <Link to="/student/evidence-coverage" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
              Evidence Coverage
            </Link>
            <Link to="/student/gap-analysis" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
              Gap Analysis
            </Link>
            <Link to="/student/reasoning" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
              Reasoning Workbench
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

      {/* ---------------- Main Container ---------------- */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Header & Comparison Selectors */}
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
                  <icons.gitCompare className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Manuscript Revision Comparison
                </h1>
              </div>
              <p className="mt-1 text-sm text-slate-400 max-w-2xl">
                Compare structured research fields across manuscript versions within the same project. Identify what changed in research gaps, methods, and claims.
              </p>
            </div>

            <button
              onClick={handleCompare}
              disabled={loading || !prevManuscriptId || !newManuscriptId}
              className="inline-flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md shadow-sky-600/20 transition self-start md:self-auto"
            >
              <icons.diff className="w-4 h-4" />
              <span>{loading ? "Comparing..." : "Compare Revisions"}</span>
            </button>
          </div>

          {/* Selectors Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-800/80">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Research Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Previous Version (Base Draft)
              </label>
              <select
                value={prevManuscriptId}
                onChange={(e) => setPrevManuscriptId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="">Select Base Draft</option>
                {projectManuscripts.map((m) => (
                  <option key={`prev-${m.id}`} value={m.id}>
                    {m.version || "Draft"} — {m.title || m.filename || m.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                New Version (Revised Draft)
              </label>
              <select
                value={newManuscriptId}
                onChange={(e) => setNewManuscriptId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="">Select Revised Draft</option>
                {projectManuscripts.map((m) => (
                  <option key={`new-${m.id}`} value={m.id}>
                    {m.version || "Draft"} — {m.title || m.filename || m.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg text-xs">
              <icons.alertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ---------------- Summary Cards ---------------- */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Overall Status</span>
              <div className="mt-2 text-lg font-bold text-white tracking-tight">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(summary.overall_status)}`}>
                  {summary.overall_status}
                </span>
              </div>
              <span className="mt-1 text-[11px] text-slate-500">
                {summary.key_research_fields_changed ? "Core fields altered" : "Core fields stable"}
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Fields</span>
              <div className="mt-2 text-2xl font-bold text-white">{summary.total_fields_compared}</div>
              <span className="text-[11px] text-slate-500">13 academic fields</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-400 font-medium uppercase tracking-wider">Modified</span>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-300">{summary.fields_modified}</div>
              <span className="text-[11px] text-slate-500">Content revised</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-cyan-400 font-medium uppercase tracking-wider">Added</span>
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-cyan-300">{summary.fields_added}</div>
              <span className="text-[11px] text-slate-500">Newly provided</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-rose-400 font-medium uppercase tracking-wider">Removed</span>
                <span className="w-2 h-2 rounded-full bg-rose-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-rose-300">{summary.fields_removed}</div>
              <span className="text-[11px] text-slate-500">Omitted in new</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Unchanged</span>
                <span className="w-2 h-2 rounded-full bg-slate-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-200">{summary.fields_unchanged}</div>
              <span className="text-[11px] text-slate-500">Exact match</span>
            </div>
          </div>
        )}

        {/* ---------------- Key Research Fields Changed Alert ---------------- */}
        {summary?.key_change_notes && summary.key_change_notes.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center space-x-2 text-amber-300 font-semibold text-sm">
              <icons.alertTriangle className="w-4 h-4 shrink-0" />
              <span>Key Research Fields Changed in this Revision</span>
            </div>
            <ul className="text-xs text-amber-200/90 list-disc list-inside space-y-1 pl-1">
              {summary.key_change_notes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ---------------- Priority Guidance Banner ---------------- */}
        {comparisonResult?.priority_guidance && comparisonResult.priority_guidance.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span className="p-1.5 bg-sky-500/10 text-sky-400 rounded-md">
                  <icons.gitCompare className="w-4 h-4" />
                </span>
                <span>Deterministic Revision Priority Guidance</span>
              </h2>
              <span className="text-xs text-slate-400">
                {comparisonResult.priority_guidance.length} Actionable Items
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Deterministic recommendations based on which research fields changed, ensuring related downstream modules (gap analysis, retrieval, metrics) remain aligned.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {comparisonResult.priority_guidance.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">
                      {FIELD_LABELS[item.field] || item.field}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getPriorityBadge(
                        item.priority
                      )}`}
                    >
                      {item.priority} Priority
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{item.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------- Detailed Field Comparisons ---------------- */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Academic Fields Comparison ({filteredFields.length} of 13)
              </h2>
              <p className="text-xs text-slate-400">
                Detailed side-by-side comparison of structured research representations.
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: "All (13)", val: "ALL" },
                { label: "Modified", val: "MODIFIED" },
                { label: "Added", val: "ADDED" },
                { label: "Removed", val: "REMOVED" },
                { label: "Unchanged", val: "UNCHANGED" },
              ].map((btn) => (
                <button
                  key={btn.val}
                  onClick={() => setFieldFilter(btn.val)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${
                    fieldFilter === btn.val
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                      : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Field Cards */}
          <div className="space-y-3 pt-2">
            {filteredFields.map(([fieldName, comp]) => {
              const isExpanded = !!expandedFields[fieldName];
              const isList = ["major_claims", "references", "keywords", "evaluation_metrics"].includes(fieldName);

              return (
                <div
                  key={fieldName}
                  className="border border-slate-800/80 rounded-xl bg-slate-950/40 overflow-hidden transition"
                >
                  {/* Card Header */}
                  <div
                    onClick={() => toggleExpand(fieldName)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition select-none"
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadge(comp.status)}`}>
                        {comp.status}
                      </span>
                      <span className="font-semibold text-sm text-slate-100">
                        {FIELD_LABELS[fieldName] || fieldName}
                      </span>
                      {comp.similarity_score !== null && comp.similarity_score !== undefined && (
                        <span className="text-xs text-slate-400">
                          (Similarity: {(comp.similarity_score * 100).toFixed(1)}%)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-500">
                        {isExpanded ? "Collapse" : "Expand"}
                      </span>
                      {isExpanded ? (
                        <icons.chevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <icons.chevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Card Expanded Content */}
                  {isExpanded && (
                    <div className="p-4 pt-1 border-t border-slate-800/60 space-y-3 bg-slate-950/60">
                      {isList ? (
                        /* List Diff View (Major Claims, References, etc.) */
                        <div className="space-y-3">
                          {comp.added_items && comp.added_items.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="inline-flex items-center space-x-1 text-xs font-semibold text-cyan-400">
                                <icons.plus className="w-3.5 h-3.5" />
                                <span>Added Items ({comp.added_items.length}):</span>
                              </span>
                              <div className="space-y-1 pl-3 border-l-2 border-cyan-500/40">
                                {comp.added_items.map((it, idx) => (
                                  <div key={idx} className="text-xs text-cyan-200/90 font-mono bg-cyan-950/20 p-1.5 rounded">
                                    + {it}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {comp.removed_items && comp.removed_items.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="inline-flex items-center space-x-1 text-xs font-semibold text-rose-400">
                                <icons.minus className="w-3.5 h-3.5" />
                                <span>Removed Items ({comp.removed_items.length}):</span>
                              </span>
                              <div className="space-y-1 pl-3 border-l-2 border-rose-500/40">
                                {comp.removed_items.map((it, idx) => (
                                  <div key={idx} className="text-xs text-rose-300/80 font-mono bg-rose-950/20 p-1.5 rounded line-through">
                                    - {it}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {comp.retained_items && comp.retained_items.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-400">
                                <icons.equal className="w-3.5 h-3.5" />
                                <span>Retained Unchanged ({comp.retained_items.length}):</span>
                              </span>
                              <div className="space-y-1 pl-3 border-l-2 border-slate-700">
                                {comp.retained_items.map((it, idx) => (
                                  <div key={idx} className="text-xs text-slate-400 font-mono bg-slate-900/40 p-1.5 rounded">
                                    = {it}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Text/Scalar Diff View */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                              Previous Version ({comparisonResult.previous_manuscript?.version || "Draft 1"})
                            </span>
                            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                              {comp.previous_value !== null && comp.previous_value !== undefined && comp.previous_value !== ""
                                ? String(comp.previous_value)
                                : "<Not Provided>"}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
                              New Version ({comparisonResult.new_manuscript?.version || "Draft 2"})
                            </span>
                            <div
                              className={`p-3 rounded-lg border text-xs leading-relaxed font-mono whitespace-pre-wrap ${
                                comp.status === "Modified"
                                  ? "bg-amber-950/20 border-amber-500/30 text-amber-200"
                                  : comp.status === "Added"
                                  ? "bg-cyan-950/20 border-cyan-500/30 text-cyan-200"
                                  : "bg-slate-900/80 border-slate-800 text-slate-300"
                              }`}
                            >
                              {comp.new_value !== null && comp.new_value !== undefined && comp.new_value !== ""
                                ? String(comp.new_value)
                                : "<Not Provided>"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------------- Academic Disclaimer Guardrail ---------------- */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-1 text-center">
          <p className="font-semibold text-slate-300">
            Phase 10A Academic Integrity Guardrail & Disclaimer
          </p>
          <p>
            This manuscript revision comparison evaluates textual and structured differences across versions within the same project. It does not measure scientific truth, empirical validity, or publication readiness.
          </p>
        </div>
      </main>
    </div>
  );
}
