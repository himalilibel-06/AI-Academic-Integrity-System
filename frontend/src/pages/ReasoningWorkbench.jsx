import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { analyzeReasoning } from "../service/api";
import { getResearchProjects } from "../service/projectStorage";

/* ---------------------------------------------------------
   SVG Icons for Academic Reasoning Interface
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
  projects: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeLinejoin="round" />
      <path d="M12 11v6M9 14h6" strokeLinecap="round" />
    </svg>
  ),
  manuscripts: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  literature: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinejoin="round" />
      <path d="M9 7h6M9 11h4" strokeLinecap="round" />
    </svg>
  ),
  gapAnalysis: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" strokeLinecap="round" />
    </svg>
  ),
  contributionAnalysis: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinejoin="round" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  knowledgeGraph: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="12" cy="18" r="3" />
      <path d="M8.5 7.5l7 0M7.5 8.5l3 7M16.5 8.5l-3 7" strokeLinecap="round" />
    </svg>
  ),
  reasoning: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  sparkles: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 3l1.9 4.8L18.7 9.7l-4.8 1.9L12 16.5l-1.9-4.9-4.9-1.9 4.9-1.9L12 3z" strokeLinejoin="round" />
      <path d="M19 16l.9 2.2 2.1.9-2.1.9-.9 2.1-.9-2.1-2.2-.9 2.2-.9.9-2.2z" strokeLinejoin="round" />
    </svg>
  ),
  arrowRight: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" {...p}>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  xMark: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" {...p}>
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  shield: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
    </svg>
  ),
  cpu: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" strokeLinecap="round" />
    </svg>
  ),
  target: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  formula: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 6h16M7 6l4 12M13 18l4-12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const STANDARD_GOALS = [
  { id: "GAP_SUPPORTED_BY_EVIDENCE", label: "Gap Supported by Evidence", desc: "Claims limitation alignment with low collision" },
  { id: "POTENTIAL_GAP_CONTRADICTION", label: "Potential Gap Contradiction", desc: "Collision detected with contextual overlap" },
  { id: "CONTRIBUTION_DIFFERENTIATED", label: "Contribution Differentiated", desc: "Low overlap with limited corpus context" },
  { id: "POTENTIAL_CONTRIBUTION_OVERLAP", label: "Potential Contribution Overlap", desc: "High lexical and conceptual overlap detected" },
  { id: "RESEARCH_DIRECTION_VIABLE", label: "Research Direction Viable", desc: "Composite goal requiring gap support or differentiation" },
];

export default function ReasoningWorkbench() {
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();

  // Project selection & inputs
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get("project_id") || "");
  const [prior, setPrior] = useState(0.50);
  const [selectedGoal, setSelectedGoal] = useState("GAP_SUPPORTED_BY_EVIDENCE");

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reasoningData, setReasoningData] = useState(null);
  const [activeSection, setActiveSection] = useState("all"); // 'all' | 'rules' | 'forward' | 'backward' | 'bayesian'

  // Load existing projects from storage
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

  const activeProject = useMemo(() => {
    return projects.find((p) => String(p.id) === String(selectedProjectId)) || null;
  }, [projects, selectedProjectId]);

  // Execute reasoning analysis
  const executeAnalysis = async (customGoal = null, customPrior = null) => {
    setLoading(true);
    setError(null);
    try {
      const targetGoal = customGoal || selectedGoal;
      const targetPrior = customPrior !== null ? customPrior : prior;

      let payload = {
        project_id: selectedProjectId || undefined,
        prior: targetPrior,
        backward_chaining_goal: targetGoal,
        top_k: 5,
      };

      if (activeProject) {
        payload.research_information = {
          title: activeProject.title || "Research Study",
          domain: activeProject.domain || "Computer Science",
          research_problem: activeProject.research_problem || "",
          research_objective: activeProject.research_objective || "",
          claimed_research_gap: activeProject.claimed_research_gap || activeProject.research_problem || "",
          proposed_method: activeProject.proposed_method || "",
          dataset_context: activeProject.dataset_context || "",
          expected_contribution: activeProject.expected_contribution || activeProject.research_problem || "",
          evaluation_metrics: activeProject.evaluation_metrics || "",
          keywords: activeProject.keywords || [],
        };
      } else {
        // Fallback default demonstration research information
        payload.research_information = {
          title: "Adaptive Graph Reasoning for Academic Integrity",
          domain: "Artificial Intelligence",
          research_problem: "Automated gap verification lacks explainable symbolic proof chains.",
          claimed_research_gap: "Existing literature lacks unified production rules with Bayesian evidence calibration.",
          proposed_method: "Forward and backward chaining over deterministic literature overlap signals.",
          expected_contribution: "Transparent reasoning layer without hallucinated novelty claims.",
          dataset_context: "Peer-reviewed literature corpus",
        };
      }

      const res = await analyzeReasoning(payload);
      setReasoningData(res);
    } catch (err) {
      console.error("Reasoning analysis error:", err);
      setError(err.message || "Failed to execute reasoning engine.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeAnalysis();
  }, [selectedProjectId]);

  // Change backward chaining goal
  const handleGoalChange = (goalId) => {
    setSelectedGoal(goalId);
    if (reasoningData) {
      // Fast switch if already pre-evaluated in response
      executeAnalysis(goalId, prior);
    }
  };

  // Change prior slider
  const handlePriorChange = (e) => {
    const val = parseFloat(e.target.value);
    setPrior(val);
  };

  const handlePriorCommit = () => {
    executeAnalysis(selectedGoal, prior);
  };

  // Helpers for badges
  const getCategoryColor = (cat) => {
    switch (cat) {
      case "strong_support":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "moderate_support":
        return "bg-teal-500/10 text-teal-400 border-teal-500/30";
      case "contradiction":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "mixed":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ---------------- Navigation Bar ---------------- */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <icons.shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight">GapGuard <span className="text-indigo-400">AI</span></span>
              <span className="ml-2 text-xs uppercase px-2 py-0.5 rounded font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Phase 9 • Reasoning
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              to="/student/dashboard"
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              Dashboard
            </Link>
            <Link
              to="/student/gap-analysis"
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              Gap Analysis
            </Link>
            <Link
              to="/student/contribution-analysis"
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              Contribution
            </Link>
            <Link
              to="/student/knowledge-graph"
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              Knowledge Graph
            </Link>
            <Link
              to="/student/evidence-coverage"
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              Evidence Coverage
            </Link>
            <Link
              to="/student/revision-comparison"
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              Revision Comparison
            </Link>
            <div className="h-4 w-px bg-slate-800 mx-1" />
            <span className="text-xs text-slate-300 font-medium px-2 py-1 bg-slate-800/80 rounded-md">
              {user?.full_name || user?.email || "Student"}
            </span>
            <button
              onClick={logout}
              className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-500/10 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- Main Container ---------------- */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Header & Project Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <icons.cpu className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Reasoning Workbench
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-400 max-w-2xl">
              Transparent, explainable inference combining production rules, forward chaining, backward proof search, and discrete Bayesian evidence calibration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-medium text-slate-400">Research Project:</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {projects.length === 0 && <option value="">Default Demonstration Study</option>}
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title || `Project #${p.id}`}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => executeAnalysis()}
              disabled={loading}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md shadow-indigo-600/20 transition"
            >
              <icons.sparkles className="w-4 h-4" />
              <span>{loading ? "Reasoning..." : "Re-evaluate Reasoning"}</span>
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto text-sm">
          {[
            { id: "all", label: "Full Workbench Overview" },
            { id: "rules", label: "1. Rule-Based Reasoning" },
            { id: "forward", label: "2. Forward Chaining" },
            { id: "backward", label: "3. Backward Chaining" },
            { id: "bayesian", label: "4. Bayesian Evidence" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs transition whitespace-nowrap ${
                activeSection === tab.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 font-bold ml-4">
              Dismiss
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && !reasoningData && (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Executing rule deductions and Bayesian evidence calibration...</p>
          </div>
        )}

        {/* Content View */}
        {reasoningData && (
          <div className="space-y-8">
            {/* ========================================================= */}
            {/* SECTION 1: RULE-BASED REASONING                          */}
            {/* ========================================================= */}
            {(activeSection === "all" || activeSection === "rules") && (
              <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                      <icons.shield className="w-5 h-5" />
                    </span>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      1. Rule-Based Reasoning Engine
                    </h2>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {reasoningData.rule_based_reasoning?.initial_facts?.length || 0} Base Facts
                    </span>
                    <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {reasoningData.rule_based_reasoning?.fired_rules?.length || 0} Rules Fired
                    </span>
                    <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {reasoningData.rule_based_reasoning?.derived_facts?.length || 0} Derived Conclusions
                    </span>
                  </div>
                </div>

                {/* Available Facts Badges */}
                <div className="space-y-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                    Established Knowledge Base Facts:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {reasoningData.rule_based_reasoning?.initial_facts?.map((fact, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2.5 py-1 bg-slate-800/80 border border-slate-700 text-slate-200 rounded-md font-mono flex items-center space-x-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span>{fact}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Visual Reasoning Deduction Chain */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Visual Deduction Flow (Facts → Fired Rules → Conclusions)
                  </span>
                  {reasoningData.rule_based_reasoning?.reasoning_trace?.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No rules fired with the available initial facts.</p>
                  ) : (
                    <div className="space-y-3">
                      {reasoningData.rule_based_reasoning?.reasoning_trace?.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col md:flex-row md:items-center gap-3 p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs"
                        >
                          <div className="flex items-center space-x-2 text-blue-400 font-mono font-medium">
                            <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]">
                              {step.step}
                            </span>
                            <span>{step.matched_conditions.join(" + ")}</span>
                          </div>

                          <div className="hidden md:flex items-center text-slate-600">
                            <icons.arrowRight className="w-4 h-4" />
                          </div>

                          <div className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold font-mono">
                            {step.rule_id}: {step.rule_name}
                          </div>

                          <div className="hidden md:flex items-center text-slate-600">
                            <icons.arrowRight className="w-4 h-4" />
                          </div>

                          <div className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold font-mono">
                            {step.derived_fact}
                          </div>

                          <div className="text-[11px] text-slate-400 md:ml-auto">
                            {step.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Production Rule Base Table */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Defined Production Rule Base (Phase 9 Transparent Rules)
                  </span>
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800/60 uppercase text-[10px] text-slate-400 tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Rule</th>
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Conditions (Premises)</th>
                          <th className="py-2.5 px-3">Conclusion</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {reasoningData.rule_based_reasoning?.rules?.map((rule) => {
                          const isFired = reasoningData.rule_based_reasoning?.fired_rules?.includes(rule.rule_id);
                          return (
                            <tr key={rule.rule_id} className={isFired ? "bg-indigo-950/20" : "hover:bg-slate-800/30"}>
                              <td className="py-2 px-3 font-mono font-bold text-indigo-400">{rule.rule_id}</td>
                              <td className="py-2 px-3 font-medium text-white">{rule.name}</td>
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                                {rule.conditions.join(" AND ")}
                              </td>
                              <td className="py-2 px-3 font-mono font-semibold text-emerald-400">
                                {rule.conclusion}
                              </td>
                              <td className="py-2 px-3">
                                {isFired ? (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    <icons.check className="w-3 h-3" />
                                    <span>FIRED</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 font-mono">Not triggered</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* ========================================================= */}
            {/* SECTION 2: FORWARD CHAINING                              */}
            {/* ========================================================= */}
            {(activeSection === "all" || activeSection === "forward") && (
              <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-4">
                  <span className="p-1.5 bg-violet-500/10 text-violet-400 rounded-lg">
                    <icons.arrowRight className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    2. Forward Chaining Inference (Data-Driven Deduction)
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      Starting Fact Assertions
                    </span>
                    <div className="mt-2 space-y-1">
                      {reasoningData.forward_chaining?.initial_facts?.map((f, i) => (
                        <div key={i} className="text-xs font-mono text-blue-300 bg-blue-950/30 border border-blue-900/40 px-2 py-1 rounded">
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      Firing Execution Order
                    </span>
                    <div className="mt-2 space-y-1">
                      {reasoningData.forward_chaining?.fired_rules?.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No rules fired.</p>
                      ) : (
                        reasoningData.forward_chaining?.fired_rules?.map((r, i) => (
                          <div key={i} className="text-xs font-mono text-indigo-300 bg-indigo-950/30 border border-indigo-900/40 px-2 py-1 rounded flex items-center justify-between">
                            <span>Step {i + 1}: Rule {r}</span>
                            <icons.check className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      Final Derived Facts at Fixpoint
                    </span>
                    <div className="mt-2 space-y-1">
                      {reasoningData.forward_chaining?.derived_facts?.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No additional facts inferred.</p>
                      ) : (
                        reasoningData.forward_chaining?.derived_facts?.map((f, i) => (
                          <div key={i} className="text-xs font-mono text-emerald-300 bg-emerald-950/30 border border-emerald-900/40 px-2 py-1 rounded">
                            {f}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Step Trace Details */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Forward Deduction Step-by-Step Proof Trace
                  </span>
                  <div className="space-y-2">
                    {reasoningData.forward_chaining?.reasoning_trace?.map((trace) => (
                      <div
                        key={trace.step}
                        className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="px-2 py-1 bg-violet-500/20 text-violet-300 font-mono font-bold rounded">
                            Step #{trace.step}
                          </span>
                          <div>
                            <span className="font-semibold text-white">{trace.rule_name}</span>
                            <span className="text-slate-500 font-mono ml-2">({trace.rule_id})</span>
                            <p className="text-slate-400 text-[11px] mt-0.5">{trace.explanation}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 font-mono">
                          <span className="text-slate-400">Yields:</span>
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-semibold">
                            {trace.derived_fact}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ========================================================= */}
            {/* SECTION 3: BACKWARD CHAINING                             */}
            {/* ========================================================= */}
            {(activeSection === "all" || activeSection === "backward") && (
              <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
                      <icons.target className="w-5 h-5" />
                    </span>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      3. Backward Chaining Inference (Goal-Driven Proof)
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400">
                    "What conditions must hold for this hypothesis to be proven?"
                  </span>
                </div>

                {/* Target Goal Selector */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Select Target Hypothesis Goal to Evaluate:
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {STANDARD_GOALS.map((g) => {
                      const isSelected = selectedGoal === g.id;
                      const goalEval = reasoningData.backward_chaining?.available_goals_evaluation?.[g.id];
                      const isSupported = goalEval ? goalEval.supported : null;

                      return (
                        <button
                          key={g.id}
                          onClick={() => handleGoalChange(g.id)}
                          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                            isSelected
                              ? "bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10"
                              : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white tracking-tight">{g.label}</span>
                              {isSupported !== null && (
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    isSupported
                                      ? "bg-emerald-500/20 text-emerald-300"
                                      : "bg-slate-800 text-slate-400"
                                  }`}
                                >
                                  {isSupported ? "SUPPORTED" : "UNPROVEN"}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[10px] text-slate-400 line-clamp-2">{g.desc}</p>
                          </div>
                          <span className="mt-2 text-[9px] font-mono text-indigo-400">{g.id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Goal Evaluation Result */}
                {reasoningData.backward_chaining?.result && (
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                          Backward Chaining Evaluation for:
                        </span>
                        <h3 className="text-base font-bold text-white font-mono mt-0.5">
                          {reasoningData.backward_chaining.result.goal}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        {reasoningData.backward_chaining.result.supported ? (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <icons.check className="w-4 h-4" />
                            <span>HYPOTHESIS PROVEN SUPPORTED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <icons.xMark className="w-4 h-4" />
                            <span>HYPOTHESIS NOT SUPPORTED</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                      {reasoningData.backward_chaining.result.explanation}
                    </p>

                    {/* Conditions Breakdown Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Satisfied Conditions */}
                      <div className="p-3.5 bg-emerald-950/10 border border-emerald-900/30 rounded-xl space-y-2">
                        <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs">
                          <icons.check className="w-4 h-4" />
                          <span>Satisfied Conditions ({reasoningData.backward_chaining.result.satisfied_conditions.length})</span>
                        </div>
                        {reasoningData.backward_chaining.result.satisfied_conditions.length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic">No required conditions are currently satisfied.</p>
                        ) : (
                          <div className="space-y-1">
                            {reasoningData.backward_chaining.result.satisfied_conditions.map((c, i) => (
                              <div key={i} className="text-xs font-mono text-emerald-300 bg-emerald-950/30 px-2 py-1 rounded flex items-center space-x-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>{c}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Missing Conditions */}
                      <div className="p-3.5 bg-rose-950/10 border border-rose-900/30 rounded-xl space-y-2">
                        <div className="flex items-center space-x-2 text-rose-400 font-semibold text-xs">
                          <icons.xMark className="w-4 h-4" />
                          <span>Missing / Unsatisfied Conditions ({reasoningData.backward_chaining.result.missing_conditions.length})</span>
                        </div>
                        {reasoningData.backward_chaining.result.missing_conditions.length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic">None! All prerequisite conditions are fully satisfied.</p>
                        ) : (
                          <div className="space-y-1">
                            {reasoningData.backward_chaining.result.missing_conditions.map((c, i) => (
                              <div key={i} className="text-xs font-mono text-rose-300 bg-rose-950/30 px-2 py-1 rounded flex items-center space-x-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                <span>{c}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Proof Trace Path */}
                    {reasoningData.backward_chaining.result.reasoning_trace?.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Backward Search Proof Steps Considered
                        </span>
                        <div className="space-y-1.5">
                          {reasoningData.backward_chaining.result.reasoning_trace.map((step, i) => (
                            <div key={i} className="text-xs p-2 bg-slate-900 border border-slate-800 rounded font-mono flex items-center justify-between text-slate-300">
                              <span>Rule: {step.rule_id} ({step.rule_name})</span>
                              <span className={step.premises_satisfied ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                                {step.premises_satisfied ? "Premises Satisfied" : "Unsatisfied Premises"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* ========================================================= */}
            {/* SECTION 4: BAYESIAN EVIDENCE REASONING                   */}
            {/* ========================================================= */}
            {(activeSection === "all" || activeSection === "bayesian") && (
              <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                      <icons.formula className="w-5 h-5" />
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight">
                        4. Bayesian Evidence Reasoning
                      </h2>
                      <span className="text-xs text-slate-400 font-mono">
                        P(Gap Supported | Available Evidence)
                      </span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getCategoryColor(reasoningData.bayesian_reasoning?.evidence_category)}`}>
                    Category: {reasoningData.bayesian_reasoning?.evidence_category || "insufficient"}
                  </span>
                </div>

                {/* Prior Adjustment Slider */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      Prior Probability P(H = Gap Supported):
                    </span>
                    <span className="font-mono text-sm font-bold text-indigo-400">
                      {prior.toFixed(2)} ({(prior * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.95"
                    step="0.05"
                    value={prior}
                    onChange={handlePriorChange}
                    onMouseUp={handlePriorCommit}
                    onTouchEnd={handlePriorCommit}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0.05 (Skeptical Prior)</span>
                    <span>0.50 (Uninformative / Neutral)</span>
                    <span>0.95 (High Confidence Prior)</span>
                  </div>
                </div>

                {/* Mathematical Bayes Breakdown Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Prior P(H)</span>
                    <div className="text-xl font-bold font-mono text-white">
                      {reasoningData.bayesian_reasoning?.prior?.toFixed(3)}
                    </div>
                    <p className="text-[10px] text-slate-500">Initial belief prior to literature evaluation</p>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Likelihood P(E|H)</span>
                    <div className="text-xl font-bold font-mono text-blue-400">
                      {reasoningData.bayesian_reasoning?.likelihood_p_e_given_h?.toFixed(3)}
                    </div>
                    <p className="text-[10px] text-slate-500">P(Evidence Category | Gap Is Supported)</p>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Neg. Likelihood P(E|~H)</span>
                    <div className="text-xl font-bold font-mono text-amber-400">
                      {reasoningData.bayesian_reasoning?.likelihood_p_e_given_not_h?.toFixed(3)}
                    </div>
                    <p className="text-[10px] text-slate-500">P(Evidence Category | Gap Not Supported)</p>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Marginal P(E)</span>
                    <div className="text-xl font-bold font-mono text-violet-400">
                      {reasoningData.bayesian_reasoning?.marginal_probability?.toFixed(3)}
                    </div>
                    <p className="text-[10px] text-slate-500">Total probability of observing evidence</p>
                  </div>
                </div>

                {/* Posterior Meter & Academic Interpretation */}
                <div className="bg-gradient-to-br from-indigo-950/30 to-slate-950/80 border border-indigo-900/40 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] text-indigo-300 uppercase tracking-wider font-semibold">
                        Model-Based Posterior Estimate P(Gap Supported | Available Evidence)
                      </span>
                      <div className="text-3xl font-extrabold font-mono text-white mt-1">
                        {(reasoningData.bayesian_reasoning?.posterior * 100).toFixed(1)}%
                        <span className="text-sm font-normal text-slate-400 ml-2">
                          (P = {reasoningData.bayesian_reasoning?.posterior?.toFixed(4)})
                        </span>
                      </div>
                      <p className="text-xs text-indigo-300/80 mt-1">
                        Model-based posterior estimate: {(reasoningData.bayesian_reasoning?.posterior * 100).toFixed(1)}% under the configured evidence assumptions
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Shift from Prior:</span>
                      <div className={`text-base font-bold font-mono ${
                        reasoningData.bayesian_reasoning?.posterior >= reasoningData.bayesian_reasoning?.prior
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}>
                        {reasoningData.bayesian_reasoning?.posterior >= reasoningData.bayesian_reasoning?.prior ? "+" : ""}
                        {((reasoningData.bayesian_reasoning?.posterior - reasoningData.bayesian_reasoning?.prior) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Progress Meter Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(2, reasoningData.bayesian_reasoning?.posterior * 100)}%` }}
                    />
                  </div>

                  {/* Interpretation Callout */}
                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-300">
                    <strong className="text-white">Corpus-Grounded Interpretation: </strong>
                    {reasoningData.bayesian_reasoning?.interpretation}
                  </div>

                  {/* Configured Model Assumptions Notice */}
                  {reasoningData.bayesian_reasoning?.assumption_notice && (
                    <div className="p-3 bg-indigo-950/20 border border-indigo-800/40 rounded-lg text-xs text-indigo-300/90 leading-relaxed">
                      <strong className="text-indigo-200">Configured Assumptions: </strong>
                      {reasoningData.bayesian_reasoning?.assumption_notice}
                    </div>
                  )}
                </div>

                {/* Mandatory Academic Notice Guardrail */}
                <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-xl flex items-start space-x-3">
                  <icons.shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-200/90 leading-relaxed">
                    <strong>Mandatory Academic Notice:</strong> Bayesian output is a model-based evidence estimate derived from the available literature corpus under transparent configured prior and likelihood assumptions. It does not establish scientific truth or global research novelty.
                  </div>
                </div>
              </section>
            )}

            {/* Footer Corpus Limitation Statement */}
            <div className="text-center py-4 border-t border-slate-800/80 text-[11px] text-slate-500">
              {reasoningData.corpus_limitation_statement}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
