import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getStudentEnrolledCourses,
  getCourses,
  enrollInCourse,
  dropCourse,
} from "../service/api";

const icons = {
  researchAreas: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
      <path d="M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" strokeLinecap="round" />
    </svg>
  ),
  upload: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  ),
  trash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  info: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" strokeLinecap="round" />
      <line x1="12" y1="8" x2="12.01" y2="8" strokeLinecap="round" />
    </svg>
  ),
  book: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinejoin="round" />
    </svg>
  ),
};

export const RESEARCH_CATEGORIES = [
  "All Categories",
  "Artificial Intelligence and Machine Learning",
  "Natural Language Processing",
  "Computer Vision",
  "Data Science and Analytics",
  "Cybersecurity",
  "Software Engineering",
  "Other Research Areas",
];

export function determineResearchCategory(area) {
  const text = `${area.name || ""} ${area.code || ""} ${area.description || ""}`.toLowerCase();
  if (
    text.includes("vision") ||
    text.includes("image") ||
    text.includes("robotics") ||
    text.includes("spatial") ||
    text.includes("agricultural")
  ) {
    return "Computer Vision";
  }
  if (
    text.includes("language") ||
    text.includes("nlp") ||
    text.includes("semantic") ||
    text.includes("text") ||
    text.includes("retrieval") ||
    text.includes("parsing")
  ) {
    return "Natural Language Processing";
  }
  if (
    text.includes("artificial intelligence") ||
    text.includes("machine learning") ||
    text.includes("deep learning") ||
    text.includes("reinforcement") ||
    text.includes("neural") ||
    text.includes("ai")
  ) {
    return "Artificial Intelligence and Machine Learning";
  }
  if (
    text.includes("security") ||
    text.includes("privacy") ||
    text.includes("cyber") ||
    text.includes("ethics") ||
    text.includes("crypt")
  ) {
    return "Cybersecurity";
  }
  if (
    text.includes("data") ||
    text.includes("analytics") ||
    text.includes("database") ||
    text.includes("sql") ||
    text.includes("statist")
  ) {
    return "Data Science and Analytics";
  }
  if (
    text.includes("software") ||
    text.includes("network") ||
    text.includes("distributed") ||
    text.includes("system") ||
    text.includes("cloud") ||
    text.includes("algorithm") ||
    text.includes("comput")
  ) {
    return "Software Engineering";
  }
  return "Other Research Areas";
}

function formatDate(dateStr) {
  if (!dateStr) return "Recently";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function StudentCourses() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Data states
  const [enrolledAreas, setEnrolledAreas] = useState([]);
  const [catalogAreas, setCatalogAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Tabs: 'myAreas' | 'explore'
  const [activeTab, setActiveTab] = useState("myAreas");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");

  // Action states
  const [joiningId, setJoiningId] = useState(null);
  const [leavingArea, setLeavingArea] = useState(null);
  const [isLeaving, setIsLeaving] = useState(false);

  // Load registered research areas and catalog areas
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [enrolledRes, catalogRes] = await Promise.all([
        getStudentEnrolledCourses(),
        getCourses(),
      ]);

      setEnrolledAreas(enrolledRes?.courses || []);
      setCatalogAreas(catalogRes?.courses || []);
    } catch (err) {
      setError(err.message || "Failed to load research area information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick lookup set of joined research area IDs
  const joinedAreaIds = useMemo(() => new Set(enrolledAreas.map((a) => a.id)), [enrolledAreas]);

  // Handle Join Research Area
  const handleJoin = async (area) => {
    setJoiningId(area.id);
    setError(null);
    setSuccessMessage(null);
    try {
      await enrollInCourse(area.id);
      setSuccessMessage(`Successfully joined research area ${area.code} - ${area.name}!`);
      await loadData();
    } catch (err) {
      setError(err.message || `Failed to join research area ${area.code}.`);
    } finally {
      setJoiningId(null);
    }
  };

  // Handle Leave / Disassociate Confirmation
  const confirmLeave = async () => {
    if (!leavingArea) return;
    setIsLeaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await dropCourse(leavingArea.id);
      setSuccessMessage(`Disassociated from research area ${leavingArea.code} - ${leavingArea.name}.`);
      setLeavingArea(null);
      await loadData();
    } catch (err) {
      setError(err.message || `Failed to leave ${leavingArea.code}.`);
    } finally {
      setIsLeaving(false);
    }
  };

  // Filter helper
  const filterList = (list) => {
    return list.filter((a) => {
      // Category filter
      if (selectedCategory !== "All Categories") {
        const itemCat = determineResearchCategory(a);
        if (itemCat !== selectedCategory) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const codeMatch = a.code?.toLowerCase().includes(q);
        const nameMatch = a.name?.toLowerCase().includes(q);
        const descMatch = a.description?.toLowerCase().includes(q);
        const profMatch = a.professor_name?.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !descMatch && !profMatch) return false;
      }

      return true;
    });
  };

  const filteredMyAreas = useMemo(() => filterList(enrolledAreas), [enrolledAreas, selectedCategory, searchQuery]);
  const filteredCatalogAreas = useMemo(() => filterList(catalogAreas), [catalogAreas, selectedCategory, searchQuery]);

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-slate-50 text-slate-900 font-sans min-h-screen">
      <div className="flex-1 min-w-0">
        {/* Top desktop header */}
        <header className="hidden lg:flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4 shadow-xs sticky top-0 z-30">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Research Areas</h1>
              <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold">
                Scholar Domains
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your research areas and organise plagiarism checks for your academic work.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/student/upload"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition shadow-sm"
            >
              {icons.upload({ className: "h-3.5 w-3.5" })}
              Check Document
            </Link>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Notifications */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 flex items-center justify-between shadow-xs">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700 ml-4 font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-xs">
              <span>{successMessage}</span>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-600 hover:text-emerald-800 ml-4 font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Research Scholar Context Alert */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-slate-50 to-white p-5 text-xs text-slate-700 shadow-xs flex items-start gap-3.5">
            <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              {icons.info({ className: "h-4.5 w-4.5" })}
            </div>
            <div className="space-y-1 leading-relaxed">
              <h4 className="font-bold uppercase tracking-wider text-blue-900 text-[11px]">
                Research Scholar Workflow
              </h4>
              <p>
                Research areas organize your manuscripts and doctoral or scholarly investigations. Unlike ordinary undergraduate courses, research areas categorize academic papers to ensure focused similarity analysis and peer comparison within your discipline.
              </p>
            </div>
          </div>

          {/* Research Categories Filter Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Filter by Research Category:
              </span>
              {selectedCategory !== "All Categories" && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory("All Categories")}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Reset Category
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {RESEARCH_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Navigation & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("myAreas")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "myAreas"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-900/20"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 font-semibold"
                }`}
              >
                <span>My Research Areas</span>
                <span
                  className={`inline-flex items-center justify-center px-2 py-0.5 text-[11px] rounded-full font-bold ${
                    activeTab === "myAreas"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {enrolledAreas.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("explore")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "explore"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-900/20"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 font-semibold"
                }`}
              >
                <span>Explore Research Areas</span>
                <span
                  className={`inline-flex items-center justify-center px-2 py-0.5 text-[11px] rounded-full font-bold ${
                    activeTab === "explore"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {catalogAreas.length}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                {icons.search({ className: "h-4 w-4" })}
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search area code, title, or topic..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-4"
                >
                  <div className="h-5 bg-slate-200 rounded w-1/3" />
                  <div className="h-6 bg-slate-200 rounded w-3/4" />
                  <div className="h-12 bg-slate-100 rounded" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Tab 1: My Research Areas */}
          {!loading && activeTab === "myAreas" && (
            <div>
              {enrolledAreas.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
                    {icons.researchAreas({ className: "h-6 w-6" })}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">No Research Areas Yet</h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Create or join a research area to organise your academic documents and plagiarism checks.
                  </p>
                  <p className="mt-2 text-[11px] text-slate-400 max-w-sm mx-auto">
                    Institutional research areas are established by departmental research supervisors and faculty. You can join any available research area to associate your manuscripts.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("explore")}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
                  >
                    {icons.plus({ className: "h-4 w-4" })}
                    Explore Available Research Areas
                  </button>
                </div>
              ) : filteredMyAreas.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                  <p className="text-xs text-slate-500">
                    No joined research areas match the category &ldquo;{selectedCategory}&rdquo;
                    {searchQuery ? ` or query "${searchQuery}"` : ""}.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("All Categories");
                      setSearchQuery("");
                    }}
                    className="mt-3 text-xs font-bold text-blue-600 hover:underline"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredMyAreas.map((area) => {
                    const category = determineResearchCategory(area);

                    return (
                      <div
                        key={area.id}
                        className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between hover:border-blue-300 hover:shadow-sm transition"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80 font-mono">
                              {area.code}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                              {category}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-slate-900 mt-3 leading-snug">
                            {area.name}
                          </h3>

                          <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                            {area.description || "Active departmental research domain for scholarly investigation and integrity analysis."}
                          </p>

                          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Research Lead:</span>
                              <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                                {area.professor_name || "Faculty Advisor"}
                              </span>
                            </div>
                            {area.professor_email && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Contact:</span>
                                <span className="text-slate-600 truncate max-w-[180px]">
                                  {area.professor_email}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Analyses:</span>
                              <span className="font-bold text-blue-600">
                                {area.submission_count} document(s) checked
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                          <Link
                            to={`/student/upload?area=${area.id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
                          >
                            {icons.upload({ className: "h-3.5 w-3.5" })}
                            Check Document
                          </Link>
                          <button
                            type="button"
                            onClick={() => setLeavingArea(area)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                          >
                            {icons.trash({ className: "h-3.5 w-3.5" })}
                            Leave Area
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Explore Research Areas */}
          {!loading && activeTab === "explore" && (
            <div>
              {catalogAreas.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-4">
                    {icons.search({ className: "h-6 w-6" })}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">No Institutional Research Areas Found</h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    No research areas have been configured in the institution yet. Contact your department advisor or research supervisor to establish research areas.
                  </p>
                </div>
              ) : filteredCatalogAreas.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                  <p className="text-xs text-slate-500">
                    No institutional research areas match the category &ldquo;{selectedCategory}&rdquo;
                    {searchQuery ? ` or query "${searchQuery}"` : ""}.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("All Categories");
                      setSearchQuery("");
                    }}
                    className="mt-3 text-xs font-bold text-blue-600 hover:underline"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredCatalogAreas.map((area) => {
                    const isJoined = joinedAreaIds.has(area.id);
                    const isSubmitting = joiningId === area.id;
                    const category = determineResearchCategory(area);

                    return (
                      <div
                        key={area.id}
                        className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between hover:border-blue-300 hover:shadow-sm transition"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                              {area.code}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                {category}
                              </span>
                              {isJoined ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {icons.check({ className: "h-3 w-3" })}
                                  Joined
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                                  Available
                                </span>
                              )}
                            </div>
                          </div>

                          <h3 className="text-base font-bold text-slate-900 mt-3 leading-snug">
                            {area.name}
                          </h3>

                          <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                            {area.description || "Departmental research discipline focused on scholarly investigation, peer analysis, and integrity verification."}
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100">
                          {isJoined ? (
                            <button
                              type="button"
                              disabled
                              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-400 cursor-default"
                            >
                              {icons.check({ className: "h-3.5 w-3.5 text-emerald-600" })}
                              Already Associated
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleJoin(area)}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
                            >
                              {isSubmitting ? (
                                <span>Joining...</span>
                              ) : (
                                <>
                                  {icons.plus({ className: "h-3.5 w-3.5" })}
                                  Join Research Area
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Confirmation Modal for Leaving Research Area */}
      {leavingArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              {icons.trash({ className: "h-5 w-5" })}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Leave Research Area</h3>
              <p className="mt-1 text-sm text-slate-500">
                Are you sure you want to disassociate from{" "}
                <span className="font-semibold text-slate-800">
                  {leavingArea.code} - {leavingArea.name}
                </span>
                ? You can rejoin this research area at any time from the Explore tab.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isLeaving}
                onClick={() => setLeavingArea(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLeaving}
                onClick={confirmLeave}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
              >
                {isLeaving ? "Disassociating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
