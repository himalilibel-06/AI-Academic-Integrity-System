import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getLiteratureCorpus, searchLiterature, getLiteraturePaper } from "../service/api";
import { getResearchProjects } from "../service/projectStorage";

/* ---------------------------------------------------------
   GapGuard AI — Literature Academic SVG Icons
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
  upload: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" strokeLinecap="round" strokeLinejoin="round" />
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
  evidenceReports: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <path d="M14 2v6h6" strokeLinejoin="round" />
      <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  profile: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
    </svg>
  ),
  settings: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1 2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H4a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 5.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H10a1.65 1.65 0 0 0 1-1.51V2a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V8a1.65 1.65 0 0 0 1.51 1H20a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  logout: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sparkles: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 3l1.9 4.8L18.7 9.7l-4.8 1.9L12 16.5l-1.9-4.9-4.9-1.9 4.9-1.9L12 3z" strokeLinejoin="round" />
      <path d="M19 16l.9 2.2 2.1.9-2.1.9-.9 2.1-.9-2.1-2.2-.9 2.2-.9.9-2.2z" strokeLinejoin="round" />
    </svg>
  ),
  search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  info: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M12 12v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  external: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  close: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  ),
  menu: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  ),
};

export default function LiteratureCorpus() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [corpusMetadata, setCorpusMetadata] = useState(null);
  const [papers, setPapers] = useState([]);
  const [isLoadingCorpus, setIsLoadingCorpus] = useState(true);
  const [corpusError, setCorpusError] = useState("");

  // Search & Retrieval State
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [topK, setTopK] = useState(10);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState("");

  // Registered Projects for quick retrieval
  const [projectsList, setProjectsList] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Selected Paper Modal
  const [selectedPaperDetails, setSelectedPaperDetails] = useState(null);
  const [isLoadingPaper, setIsLoadingPaper] = useState(false);

  const executeSearch = async (queryText, k = 10) => {
    if (!queryText.trim()) {
      setSearchResults(null);
      loadCorpus();
      return;
    }

    setIsSearching(true);
    setSearchError("");
    try {
      const res = await searchLiterature({
        query: queryText.trim(),
        top_k: k,
      });
      setSearchResults(res);
    } catch (err) {
      console.error("Literature search failed:", err);
      setSearchError(err.message || "Search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  // Load Corpus and Projects
  useEffect(() => {
    loadCorpus();
    const storedProjects = getResearchProjects();
    setProjectsList(storedProjects);
    if (storedProjects.length > 0) {
      setSelectedProjectId(storedProjects[0].id);
    }
    if (initialQuery && initialQuery.trim()) {
      executeSearch(initialQuery.trim(), topK);
    }
  }, [initialQuery]);

  const loadCorpus = async (filterText = "") => {
    setIsLoadingCorpus(true);
    setCorpusError("");
    try {
      const data = await getLiteratureCorpus(filterText, 50, 0);
      setCorpusMetadata({
        corpus_type: data.corpus_type,
        domain: data.domain,
        total_papers: data.total_papers,
      });
      setPapers(data.papers || []);
    } catch (err) {
      console.error("Failed to load corpus:", err);
      setCorpusError(err.message || "Failed to load literature corpus.");
    } finally {
      setIsLoadingCorpus(false);
    }
  };

  const handleTextSearch = async (e) => {
    e?.preventDefault();
    executeSearch(searchQuery, topK);
  };

  const handleRetrieveFromProject = async () => {
    const project = projectsList.find((p) => p.id === selectedProjectId);
    if (!project) return;

    setIsSearching(true);
    setSearchError("");
    try {
      const res = await searchLiterature({
        research_information: {
          title: project.title,
          domain: project.domain,
          research_problem: project.problemStatement || "",
          claimed_research_gap: project.claimedGap || "",
          proposed_method: project.methodology || "",
          keywords: project.keywords ? project.keywords.split(",") : [],
        },
        top_k: topK,
      });
      setSearchResults(res);
      setSearchQuery(`[Project] ${project.title}`);
    } catch (err) {
      console.error("Project-based retrieval failed:", err);
      setSearchError(err.message || "Project retrieval failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
    setSearchError("");
    loadCorpus();
  };

  const handleViewPaperDetails = async (paperId) => {
    setIsLoadingPaper(true);
    try {
      const data = await getLiteraturePaper(paperId);
      setSelectedPaperDetails(data.paper);
    } catch (err) {
      console.error("Failed to fetch paper details:", err);
    } finally {
      setIsLoadingPaper(false);
    }
  };

  const researcherInitials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "RS";

  return (
    <div className="min-h-screen bg-slate-900/5 text-slate-900 lg:flex font-sans">
      {/* ---------------- Mobile Top Navigation ---------------- */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden shadow-xs">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
          className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
        >
          {icons.menu({ className: "h-6 w-6" })}
        </button>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white font-bold text-xs shadow-xs">
            G
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-900">GapGuard AI</span>
        </div>
        <div className="h-8 w-8 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center shadow-xs">
          {researcherInitials}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ---------------- Sidebar ---------------- */}
      <aside
        className={`fixed z-50 inset-y-0 left-0 w-72 transform bg-[#0B1120] text-slate-200 px-5 py-6 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 lg:flex-shrink-0 border-r border-slate-800 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between pb-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-emerald-400 p-0.5 shadow-md shadow-indigo-950/50">
              <div className="w-full h-full bg-[#0B1120] rounded-[10px] flex items-center justify-center text-indigo-400">
                {icons.sparkles({ className: "h-5 w-5" })}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-white">GapGuard</span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Research Gap Intelligence</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation menu"
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 lg:hidden"
          >
            {icons.close({ className: "h-5 w-5" })}
          </button>
        </div>

        <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2">
          Research Workflow
        </div>
        <nav className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1">
          <Link
            to="/student/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.dashboard({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Dashboard</span>
          </Link>

          <Link
            to="/student/dashboard#projects"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.projects({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Research Projects</span>
          </Link>

          <Link
            to="/student/upload"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.upload({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Upload Manuscript</span>
          </Link>

          <Link
            to="/student/literature"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-900/30 transition-all"
          >
            {icons.literature({ className: "h-4.5 w-4.5 text-white" })}
            <span>Literature Corpus</span>
          </Link>

          <Link
            to="/student/submissions"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.manuscripts({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Manuscripts</span>
          </Link>

          <Link
            to="/student/reports"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.evidenceReports({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Evidence Reports</span>
          </Link>

          <Link
            to="/student/profile"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.profile({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Profile</span>
          </Link>

          <Link
            to="/student/settings"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.settings({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Settings</span>
          </Link>
        </nav>

        <div className="pt-4 border-t border-slate-800/80 mt-auto">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
          >
            {icons.logout({ className: "h-4 w-4" })}
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ---------------- Main Literature Workspace ---------------- */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="border-b border-slate-200 bg-white px-6 sm:px-8 py-5 shadow-xs">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Local Literature Corpus &amp; Baseline Retrieval
                </h1>
                <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                  Development Sample Corpus
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Deterministic TF-IDF baseline retrieval over local domain literature. Retrieves and ranks relevant
                evidence for research gap contextualization.
              </p>
            </div>

            {corpusMetadata && (
              <div className="flex items-center gap-3 text-xs">
                <span className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl font-semibold text-slate-700">
                  <strong>{corpusMetadata.total_papers}</strong> Indexed Papers
                </span>
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl font-semibold">
                  Status: Online
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-6">
          {/* Informational Scope Alert */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-white p-4.5 text-xs text-indigo-950 flex items-start gap-3 shadow-xs">
            {icons.info({ className: "h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" })}
            <div className="leading-relaxed">
              <span className="font-bold">Retrieval Scope Notice:</span> This system searches the local{" "}
              <strong>development_sample_corpus</strong> and ranks papers by textual similarity. Higher similarity
              indicates topical alignment. It does <strong>NOT</strong> validate, contradict, or judge scientific
              claims.
            </div>
          </div>

          {/* Search & Query Bar Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Literature Search &amp; Evidence Retrieval
              </h2>
              <div className="flex items-center gap-2 text-xs">
                <label className="text-slate-500 font-medium">Top Results:</label>
                <select
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={15}>Top 15</option>
                  <option value={20}>Top 20</option>
                </select>
              </div>
            </div>

            <form onSubmit={handleTextSearch} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  {icons.search({ className: "h-4 w-4" })}
                </span>
                <input
                  type="text"
                  placeholder="Search papers by keyword, problem, method, or gap (e.g., vision transformer edge plant pathology)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs font-medium"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={isSearching}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition disabled:opacity-60"
                >
                  {isSearching ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      {icons.search({ className: "h-4 w-4" })}
                      <span>Search Literature</span>
                    </>
                  )}
                </button>

                {searchResults && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>

            {/* Quick Action: Retrieve from Registered Research Project */}
            {projectsList.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="font-semibold text-slate-800">Or retrieve from Research Project:</span>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 font-medium max-w-xs truncate"
                  >
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleRetrieveFromProject}
                  disabled={isSearching}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition disabled:opacity-60"
                >
                  {icons.sparkles({ className: "h-3.5 w-3.5 text-indigo-400" })}
                  <span>Retrieve Relevant Literature</span>
                </button>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {searchError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-900 flex items-center justify-between shadow-xs">
              <span>{searchError}</span>
              <button type="button" onClick={() => setSearchError("")}>
                {icons.close({ className: "h-4 w-4" })}
              </button>
            </div>
          )}

          {/* ---------------- RETRIEVED RESULTS VIEW ---------------- */}
          {searchResults ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4.5 rounded-2xl border border-indigo-200 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-slate-900">Potentially Relevant Literature</h3>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                      {searchResults.total_retrieved} Papers Ranked
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Query: <strong className="text-slate-800">{searchResults.query}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Back to All Papers
                </button>
              </div>

              {searchResults.results.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                  No matching papers found with significant similarity scores. Try broadening your query terms.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {searchResults.results.map((paper, index) => (
                    <div
                      key={paper.paper_id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 transition space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1 max-w-3xl">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              #{index + 1} • {paper.paper_id}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {paper.publication_year}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">
                            {paper.title}
                          </h4>
                        </div>

                        {/* Similarity Score Meter Badge */}
                        <div className="text-right flex-shrink-0 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl shadow-2xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                            Similarity Score
                          </span>
                          <span className="text-base font-extrabold text-indigo-600 font-mono">
                            {paper.similarity_score.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      {/* Matched Fields Tags */}
                      {paper.matched_fields && paper.matched_fields.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="font-semibold text-slate-600 mr-1">Matched Fields:</span>
                          {paper.matched_fields.map((mf) => (
                            <span
                              key={mf}
                              className="bg-indigo-50 border border-indigo-200/70 text-indigo-700 font-semibold px-2 py-0.5 rounded"
                            >
                              {mf.replace("_", " ")}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {paper.abstract}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        <div className="flex flex-wrap gap-1">
                          {paper.keywords?.slice(0, 4).map((kw, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleViewPaperDetails(paper.paper_id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          <span>View Details</span>
                          {icons.external({ className: "h-3.5 w-3.5" })}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ---------------- FULL CORPUS BROWSER ---------------- */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Corpus Paper Repository ({papers.length} Papers)
                </h3>
              </div>

              {isLoadingCorpus ? (
                <div className="p-12 text-center text-xs text-slate-500">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent inline-block mb-2" />
                  <p>Loading local literature corpus...</p>
                </div>
              ) : papers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                  No literature records found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {papers.map((p) => (
                    <div
                      key={p.paper_id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded">
                            {p.paper_id}
                          </span>
                          <span className="text-[11px] text-slate-600 font-medium">
                            {p.publication_year}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                          {p.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed">
                          {p.abstract}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-600 font-medium truncate max-w-[200px]">
                          {p.keywords?.slice(0, 3).join(", ")}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleViewPaperDetails(p.paper_id)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ---------------- PAPER DETAILS MODAL ---------------- */}
      {selectedPaperDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="rounded-2xl border border-slate-200 bg-white w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    {selectedPaperDetails.paper_id}
                  </span>
                  <span className="text-xs font-medium text-slate-600">
                    Published: {selectedPaperDetails.publication_year}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1 leading-snug">
                  {selectedPaperDetails.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPaperDetails(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                {icons.close({ className: "h-5 w-5" })}
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
              <div>
                <h5 className="font-bold uppercase tracking-wider text-slate-600 text-[10px] mb-1">
                  Abstract
                </h5>
                <p className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  {selectedPaperDetails.abstract}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="border border-slate-200 p-3 rounded-xl">
                  <h5 className="font-bold uppercase tracking-wider text-slate-600 text-[10px] mb-1">
                    Research Problem
                  </h5>
                  <p>{selectedPaperDetails.research_problem}</p>
                </div>

                <div className="border border-slate-200 p-3 rounded-xl">
                  <h5 className="font-bold uppercase tracking-wider text-slate-600 text-[10px] mb-1">
                    Proposed Method
                  </h5>
                  <p>{selectedPaperDetails.method}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="border border-slate-200 p-3 rounded-xl">
                  <h5 className="font-bold uppercase tracking-wider text-slate-600 text-[10px] mb-1">
                    Dataset / Experimental Context
                  </h5>
                  <p>{selectedPaperDetails.dataset}</p>
                </div>

                <div className="border border-slate-200 p-3 rounded-xl">
                  <h5 className="font-bold uppercase tracking-wider text-slate-600 text-[10px] mb-1">
                    Contribution
                  </h5>
                  <p>{selectedPaperDetails.contribution}</p>
                </div>
              </div>

              <div className="border border-amber-200 bg-amber-50/40 p-3.5 rounded-xl">
                <h5 className="font-bold uppercase tracking-wider text-amber-950 text-[10px] mb-1">
                  Acknowledged Limitations
                </h5>
                <p className="text-amber-950">{selectedPaperDetails.limitations}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                <div className="flex flex-wrap gap-1">
                  {selectedPaperDetails.keywords?.map((kw, i) => (
                    <span key={i} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                      {kw}
                    </span>
                  ))}
                </div>

                {selectedPaperDetails.source_url && (
                  <a
                    href={selectedPaperDetails.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>View Publication Source</span>
                    {icons.external({ className: "h-3.5 w-3.5" })}
                  </a>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPaperDetails(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
