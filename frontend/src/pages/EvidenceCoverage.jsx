import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { analyzeEvidenceCoverage } from "../service/api";
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
  shield: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
    </svg>
  ),
  search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
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
  sparkles: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 3l1.9 4.8L18.7 9.7l-4.8 1.9L12 16.5l-1.9-4.9-4.9-1.9 4.9-1.9L12 3z" strokeLinejoin="round" />
      <path d="M19 16l.9 2.2 2.1.9-2.1.9-.9 2.1-.9-2.1-2.2-.9 2.2-.9.9-2.2z" strokeLinejoin="round" />
    </svg>
  ),
  target: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
};

const DEFAULT_DEMO_CLAIMS = [
  "Attribution alignment improves diagnostic interpretability by 24% without degrading predictive AUC.",
  "Ontology token grounding reduces false-positive pathology detections on out-of-distribution radiographs.",
  "Hierarchical token subsampling and post-training quantization reduce vision transformer memory budgets by 75%.",
  "Topology-aware gradient perturbation mechanisms ensure differential privacy bounds in decentralized knowledge graphs.",
];

export default function EvidenceCoverage() {
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();

  // State
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get("project_id") || "");
  const [projectManuscripts, setProjectManuscripts] = useState([]);
  const [selectedManuscriptId, setSelectedManuscriptId] = useState(searchParams.get("manuscript_id") || "");

  const [customClaimsText, setCustomClaimsText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [coverageData, setCoverageData] = useState(null);

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
      if (manus && manus.length > 0) {
        setSelectedManuscriptId(manus[0].id);
      } else {
        setSelectedManuscriptId("");
      }
    } else {
      const allManus = getManuscripts();
      setProjectManuscripts(allManus || []);
    }
  }, [selectedProjectId]);

  const activeManuscript = useMemo(() => {
    return projectManuscripts.find((m) => m.id === selectedManuscriptId) || null;
  }, [projectManuscripts, selectedManuscriptId]);

  // Extract claims for audit
  const resolvedClaims = useMemo(() => {
    if (customClaimsText.trim()) {
      return customClaimsText
        .split("\n")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
    }
    if (activeManuscript?.researchInfo?.major_claims) {
      const mc = activeManuscript.researchInfo.major_claims;
      if (Array.isArray(mc) && mc.length > 0) {
        return mc;
      }
    }
    return DEFAULT_DEMO_CLAIMS;
  }, [customClaimsText, activeManuscript]);

  const handleAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        project_id: selectedProjectId || undefined,
        manuscript_id: selectedManuscriptId || undefined,
        claims: resolvedClaims,
        top_k: 5,
      };

      const res = await analyzeEvidenceCoverage(payload);
      setCoverageData(res);
    } catch (err) {
      console.error("Evidence coverage audit error:", err);
      setError(err.message || "Failed to analyze evidence coverage.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleAudit();
  }, [selectedProjectId, selectedManuscriptId]);

  const filteredClaims = useMemo(() => {
    if (!coverageData?.claim_analyses) return [];
    return coverageData.claim_analyses.filter((c) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "SUPPORTED" && c.evidence_status === "Supported by Available Evidence") ||
        (statusFilter === "PARTIAL" && c.evidence_status === "Partially Supported") ||
        (statusFilter === "INSUFFICIENT" && c.evidence_status === "Insufficient Evidence");

      const matchesSearch =
        !searchQuery.trim() ||
        c.claim.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.matched_papers.some((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesStatus && matchesSearch;
    });
  }, [coverageData, statusFilter, searchQuery]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "Supported by Available Evidence":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "Partially Supported":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ---------------- Navigation Bar ---------------- */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <icons.shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight">GapGuard <span className="text-emerald-400">AI</span></span>
              <span className="ml-2 text-xs uppercase px-2 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Phase 10A • Evidence Coverage
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link to="/student/dashboard" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
              Dashboard
            </Link>
            <Link to="/student/revision-comparison" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
              Revision Comparison
            </Link>
            <Link to="/student/submission-readiness" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
              Submission Readiness
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
        {/* Header & Selectors */}
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <icons.target className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Evidence Coverage Auditor
                </h1>
              </div>
              <p className="mt-1 text-sm text-slate-400 max-w-2xl">
                Audits author research claims against the local literature corpus. Determines whether claims have retrieved supporting or contextual evidence.
              </p>
            </div>

            <button
              onClick={handleAudit}
              disabled={loading}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md shadow-emerald-600/20 transition self-start md:self-auto"
            >
              <icons.sparkles className="w-4 h-4" />
              <span>{loading ? "Auditing Claims..." : "Audit Evidence Coverage"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 text-xs">
            <div>
              <label className="font-semibold text-slate-400 block mb-1">Research Project:</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title || `Project #${p.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-400 block mb-1">Manuscript Version:</label>
              <select
                value={selectedManuscriptId}
                onChange={(e) => setSelectedManuscriptId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {projectManuscripts.length === 0 ? (
                  <option value="">No manuscripts uploaded for this project</option>
                ) : (
                  projectManuscripts.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.version || m.fileName} — {m.manuscriptTitle?.slice(0, 35)}...
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-400 block mb-1">Custom Claims Override (Optional):</label>
              <input
                type="text"
                placeholder="Paste semicolon or newline separated claims..."
                value={customClaimsText}
                onChange={(e) => setCustomClaimsText(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-slate-600"
              />
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 font-bold ml-4">Dismiss</button>
          </div>
        )}

        {/* Overall Coverage Summary */}
        {coverageData?.overall_coverage && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total Claims</span>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {coverageData.overall_coverage.total_claims}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{coverageData.overall_coverage.usable_claims} usable</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">Supported</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {coverageData.overall_coverage.supported_claims}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">similarity &ge; 0.50</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] uppercase font-semibold text-amber-400 tracking-wider">Partially Supported</span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {coverageData.overall_coverage.partially_supported_claims}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">similarity &ge; 0.25</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Insufficient</span>
              <div className="text-2xl font-bold font-mono text-slate-400 mt-1">
                {coverageData.overall_coverage.insufficient_evidence_claims}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">similarity &lt; 0.25</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-950/30 to-slate-900/90 border border-emerald-900/40 rounded-xl p-4 col-span-2 md:col-span-1">
              <span className="text-[10px] uppercase font-semibold text-emerald-300 tracking-wider">Coverage Rate</span>
              <div className="text-2xl font-extrabold font-mono text-white mt-1">
                {coverageData.overall_coverage.coverage_percentage !== null
                  ? `${coverageData.overall_coverage.coverage_percentage.toFixed(1)}%`
                  : "N/A"}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {coverageData.overall_coverage.coverage_percentage !== null
                  ? "of usable claims supported"
                  : "Insufficient claim data"}
              </p>
            </div>
          </div>
        )}

        {/* Claim-by-Claim Evidence Cards */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Claim Evidence Audit ({filteredClaims.length})
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Tabs */}
              <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 p-1 rounded-lg text-xs">
                {["ALL", "SUPPORTED", "PARTIAL", "INSUFFICIENT"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                      statusFilter === f
                        ? "bg-slate-800 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <icons.search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter claims..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg pl-8 pr-3 py-1.5 focus:ring-1 focus:ring-emerald-500 outline-none w-44"
                />
              </div>
            </div>
          </div>

          {filteredClaims.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-6 text-center">
              No claims match the selected filter criteria.
            </p>
          ) : (
            <div className="space-y-4">
              {filteredClaims.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 max-w-3xl">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          Claim #{idx + 1}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getStatusBadge(item.evidence_status)}`}>
                          {item.evidence_status}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white leading-relaxed">
                        "{item.claim}"
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Similarity Score</span>
                      <div className="text-lg font-bold font-mono text-emerald-400">
                        {item.strongest_similarity_score.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                    <strong>Coverage Note: </strong>{item.reason}
                  </p>

                  {/* Matched Evidence Papers */}
                  {item.matched_papers?.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-900">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                        Matched Corpus Papers ({item.matched_papers.length})
                      </span>
                      <div className="space-y-2">
                        {item.matched_papers.map((p, pIdx) => (
                          <div
                            key={pIdx}
                            className="p-3 bg-slate-900/40 border border-slate-800/60 rounded-lg text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-200">
                                {p.title} {p.publication_year ? `(${p.publication_year})` : ""}
                              </span>
                              <span className="font-mono text-emerald-400 text-[11px]">
                                sim: {p.similarity_score.toFixed(2)}
                              </span>
                            </div>
                            {p.excerpt && (
                              <p className="text-slate-400 text-[11px] italic bg-slate-950/40 p-2 rounded border border-slate-900">
                                "{p.excerpt}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Mandatory Academic Guardrail Notice */}
        <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-xl flex items-start space-x-3">
          <icons.shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/90 leading-relaxed">
            <strong>Mandatory Academic Notice:</strong> Based on the available literature corpus. Evidence coverage reflects retrieval from the available corpus. Insufficient evidence does not mean that supporting research does not exist. Human academic review is required.
          </p>
        </div>
      </main>
    </div>
  );
}
