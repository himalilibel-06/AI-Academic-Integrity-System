import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveResearchProject, DOMAIN_OPTIONS } from "../service/projectStorage";

/* ---------------------------------------------------------
   GapGuard AI — Academic SVG Icons
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
      <path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H4a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 5.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H10a1.65 1.65 0 0 0 1-1.51V2a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V8a1.65 1.65 0 0 0 1.51 1H20a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  logout: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  menu: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  ),
  close: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  ),
  sparkles: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 3l1.9 4.8L18.7 9.7l-4.8 1.9L12 16.5l-1.9-4.9-4.9-1.9 4.9-1.9L12 3z" strokeLinejoin="round" />
      <path d="M19 16l.9 2.2 2.1.9-2.1.9-.9 2.1-.9-2.1-2.2-.9 2.2-.9.9-2.2z" strokeLinejoin="round" />
    </svg>
  ),
  info: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M12 12v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  arrowLeft: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function CreateResearchProject() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Domain selection mode: preset dropdown or custom input
  const [selectedDomainPreset, setSelectedDomainPreset] = useState("Machine Learning");
  const [customDomain, setCustomDomain] = useState("");
  const isCustomDomain = selectedDomainPreset === "CUSTOM";

  // 10 Research Project Fields
  const [formData, setFormData] = useState({
    title: "",
    researchProblem: "",
    researchObjective: "",
    researchQuestion: "",
    claimedGap: "",
    proposedMethod: "",
    datasetContext: "",
    expectedContribution: "",
    evaluationMetrics: "",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errorMsg) setErrorMsg("");
  };

  const handleDomainPresetChange = (e) => {
    const val = e.target.value;
    setSelectedDomainPreset(val);
    if (val !== "CUSTOM") {
      setCustomDomain("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    const finalDomain = isCustomDomain ? customDomain.trim() : selectedDomainPreset;

    // Basic Validation
    if (!formData.title.trim()) {
      setErrorMsg("Research Project Title is required.");
      return;
    }
    if (!finalDomain) {
      setErrorMsg("Research Domain is required.");
      return;
    }
    if (!formData.researchProblem.trim()) {
      setErrorMsg("Research Problem is required.");
      return;
    }
    if (!formData.researchObjective.trim()) {
      setErrorMsg("Research Objective is required.");
      return;
    }
    if (!formData.claimedGap.trim()) {
      setErrorMsg("Claimed Research Gap is required. This is the core hypothesis GapGuard AI evaluates.");
      return;
    }
    if (!formData.proposedMethod.trim()) {
      setErrorMsg("Proposed Method is required.");
      return;
    }
    if (!formData.expectedContribution.trim()) {
      setErrorMsg("Expected Contribution is required.");
      return;
    }

    setSubmitting(true);

    try {
      const savedProject = saveResearchProject({
        title: formData.title,
        domain: finalDomain,
        researchProblem: formData.researchProblem,
        researchObjective: formData.researchObjective,
        researchQuestion: formData.researchQuestion,
        claimedGap: formData.claimedGap,
        proposedMethod: formData.proposedMethod,
        datasetContext: formData.datasetContext,
        expectedContribution: formData.expectedContribution,
        evaluationMetrics: formData.evaluationMetrics,
        status: "Draft",
      });

      // Save notification to sessionStorage so dashboard displays it immediately
      sessionStorage.setItem(
        "gapguard_flash_notice",
        `Research Project "${savedProject.title}" successfully created and saved as Draft.`
      );

      navigate(`/student/dashboard?highlight=${savedProject.id}`);
    } catch (err) {
      setErrorMsg(err.message || "Failed to create research project.");
      setSubmitting(false);
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
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-900/30 transition-all"
          >
            {icons.projects({ className: "h-4.5 w-4.5 text-white" })}
            <span>Research Projects</span>
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

      {/* ---------------- Main Form Workspace ---------------- */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="hidden lg:flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4.5 shadow-xs sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Link
              to="/student/dashboard"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
              title="Return to Dashboard"
            >
              {icons.arrowLeft({ className: "h-4 w-4" })}
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Create Research Project</h1>
                <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 text-xs font-semibold">
                  Study Setup
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Define the problem formulation, claimed gap, and expected contribution for GapGuard AI analysis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/student/dashboard")}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving Project...
                </>
              ) : (
                <>
                  {icons.check({ className: "h-3.5 w-3.5" })}
                  Save Research Project
                </>
              )}
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-6">
          {/* Breadcrumb navigation */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/student/dashboard" className="hover:text-indigo-600 transition">
              Dashboard
            </Link>
            <span>/</span>
            <Link to="/student/dashboard#projects" className="hover:text-indigo-600 transition">
              Research Projects
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">New Project Formulation</span>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs font-semibold text-rose-900 flex items-center justify-between shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-600 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg("")}
                className="text-rose-700 hover:text-rose-900"
              >
                {icons.close({ className: "h-4 w-4" })}
              </button>
            </div>
          )}

          {/* Academic Context Notice */}
          <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-slate-50 to-white p-5 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="rounded-xl bg-indigo-600 text-white p-2.5 flex-shrink-0 mt-0.5 shadow-xs">
                {icons.sparkles({ className: "h-5 w-5" })}
              </div>
              <div className="text-xs leading-relaxed text-slate-700">
                <h3 className="font-bold text-slate-900 text-sm">
                  Explainable Research Gap Validation Protocol
                </h3>
                <p className="mt-1 text-slate-600">
                  This form establishes the foundational research study that GapGuard AI will benchmark against
                  published scientific literature. Clearly articulated problems and claimed gaps produce the most
                  accurate literature evidence retrieval and contribution differentiation reports.
                </p>
              </div>
            </div>
          </section>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ---------------- SECTION 1: CORE IDENTIFICATION ---------------- */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  Section 1 of 4
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1.5">Core Identification</h2>
                <p className="text-xs text-slate-500">Provide the primary title and domain classification for this study.</p>
              </div>

              {/* 1. Research Project Title */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  1. Research Project Title <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Deep Learning Based Crop Disease Detection in Resource-Constrained Edge Environments"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  A concise, informative title reflecting your core research inquiry.
                </p>
              </div>

              {/* 2. Research Domain */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  2. Research Domain / Field <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <select
                      value={selectedDomainPreset}
                      onChange={handleDomainPresetChange}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
                    >
                      {DOMAIN_OPTIONS.map((domain) => (
                        <option key={domain} value={domain}>
                          {domain}
                        </option>
                      ))}
                      <option value="CUSTOM">+ Enter Custom Domain...</option>
                    </select>
                  </div>

                  {isCustomDomain && (
                    <div className="animate-in fade-in duration-150">
                      <input
                        type="text"
                        required
                        placeholder="e.g., Computational Neuroscience & Neuromorphic Hardware"
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
                        className="w-full rounded-xl border border-indigo-300 bg-indigo-50/20 px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
                      />
                    </div>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Select a standardized academic domain or input an interdisciplinary specialty.
                </p>
              </div>
            </div>

            {/* ---------------- SECTION 2: PROBLEM FORMULATION & RESEARCH GAP ---------------- */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  Section 2 of 4
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1.5">Problem Formulation &amp; Claimed Gap</h2>
                <p className="text-xs text-slate-500">Define the exact shortcoming or unaddressed challenge in existing literature.</p>
              </div>

              {/* 3. Research Problem */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  3. Research Problem <span className="text-rose-500 font-bold">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain the technical, empirical, or theoretical problem you want to solve (e.g., Existing convolutional crop disease models fail under diverse real-world illumination and background foliage variability)..."
                  value={formData.researchProblem}
                  onChange={(e) => handleChange("researchProblem", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs leading-relaxed"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Clearly describe the failure mode or limitation of current approaches.
                </p>
              </div>

              {/* 4. Research Objective */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  4. Research Objective <span className="text-rose-500 font-bold">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain what the research intends to achieve (e.g., Design a lightweight, illumination-invariant attention backbone that operates with sub-50ms inference latency on low-power IoT microcontrollers)..."
                  value={formData.researchObjective}
                  onChange={(e) => handleChange("researchObjective", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs leading-relaxed"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  State the concrete goal, milestone, or performance threshold of your study.
                </p>
              </div>

              {/* 5. Research Question (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  5. Research Question <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Can spectral-domain contrastive augmentation decouple leaf lesion features from ambient chromatic distortion without increasing parameters?"
                  value={formData.researchQuestion}
                  onChange={(e) => handleChange("researchQuestion", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs leading-relaxed"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Formal investigative inquiry guiding your experiment design.
                </p>
              </div>

              {/* 6. Claimed Research Gap (VERY IMPORTANT) */}
              <div className="rounded-xl border border-amber-300/80 bg-amber-50/50 p-4.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider">
                    6. Claimed Research Gap <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded">
                    Central Hypothesis for GapGuard AI
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder="State what you believe is missing or under-explored in existing literature (e.g., While existing literature achieves high classification accuracy on curated studio datasets like PlantVillage, zero prior works evaluate cross-farm field transfer under acute illumination shifts without requiring labeled target-domain re-training)..."
                  value={formData.claimedGap}
                  onChange={(e) => handleChange("claimedGap", e.target.value)}
                  className="w-full rounded-xl border border-amber-300 bg-white p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition shadow-2xs leading-relaxed"
                />
                <div className="flex items-start gap-2 text-[11px] text-amber-900 leading-normal pt-1">
                  {icons.info({ className: "h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" })}
                  <span>
                    <strong>Why this matters:</strong> GapGuard AI cross-references this statement against
                    retrieved academic corpora to verify whether this gap is genuinely unaddressed or if prior
                    publications have already resolved it.
                  </span>
                </div>
              </div>
            </div>

            {/* ---------------- SECTION 3: PROPOSED METHODOLOGY & CONTEXT ---------------- */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  Section 3 of 4
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1.5">Proposed Methodology &amp; Context</h2>
                <p className="text-xs text-slate-500">Explain the technical approach and practical implementation setting.</p>
              </div>

              {/* 7. Proposed Method */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  7. Proposed Method <span className="text-rose-500 font-bold">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain your proposed technical approach (e.g., A multi-frequency wavelet attention branch combined with self-supervised contrastive consistency regularization to isolate pathogen symptoms from environmental noise)..."
                  value={formData.proposedMethod}
                  onChange={(e) => handleChange("proposedMethod", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs leading-relaxed"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Outline algorithms, architectural designs, protocols, or theoretical frameworks.
                </p>
              </div>

              {/* 8. Dataset / Application Context */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  8. Dataset / Application Context <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., In-field cassava leaf imagery from Makerere AI Lab, PlantVillage benchmark, deployed on Raspberry Pi 4 edge accelerator."
                  value={formData.datasetContext}
                  onChange={(e) => handleChange("datasetContext", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs leading-relaxed"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Target datasets, benchmark repositories, or hardware/domain settings.
                </p>
              </div>
            </div>

            {/* ---------------- SECTION 4: CONTRIBUTIONS & EVALUATION ---------------- */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  Section 4 of 4
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1.5">Expected Contribution &amp; Evaluation</h2>
                <p className="text-xs text-slate-500">Clarify the novelty boundary and quantitative verification criteria.</p>
              </div>

              {/* 9. Expected Contribution */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  9. Expected Contribution <span className="text-rose-500 font-bold">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain what you believe is your novel contribution (e.g., The first frequency-aware spatial attention mechanism capable of outperforming standard Vision Transformers on in-field crop disease diagnosis while using 68% fewer FLOPs)..."
                  value={formData.expectedContribution}
                  onChange={(e) => handleChange("expectedContribution", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs leading-relaxed"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  How your work extends, diverges from, or outperforms existing SOTA baselines.
                </p>
              </div>

              {/* 10. Expected Evaluation Metrics */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  10. Expected Evaluation Metrics <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Top-1 Accuracy, Macro F1-score, Inference Latency (ms), FLOPs, Parameter Count"
                  value={formData.evaluationMetrics}
                  onChange={(e) => handleChange("evaluationMetrics", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Empirical benchmarks used to substantiate your claims.
                </p>
              </div>
            </div>

            {/* ---------------- FORM ACTION BAR ---------------- */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Initial project status will be saved as <strong>Draft</strong>.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigate("/student/dashboard")}
                  className="flex-1 sm:flex-initial rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-950/20 transition disabled:opacity-70 text-center"
                >
                  {submitting ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving Project...
                    </>
                  ) : (
                    <>
                      {icons.check({ className: "h-4 w-4" })}
                      Save Research Project
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
