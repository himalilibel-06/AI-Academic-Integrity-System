import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getCustomReferences,
  addCustomReference,
  deleteCustomReference,
  updateCustomReference,
} from "../service/api";

const icons = {
  edit: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  book: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinejoin="round" />
      <path d="M9 7h6M9 11h4" strokeLinecap="round" />
    </svg>
  ),
  info: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M12 12v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  close: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  ),
  external: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  shield: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  upload: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  trash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  document: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function LiteratureCorpus() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  // Scholar's custom references state
  const [customReferences, setCustomReferences] = useState([]);
  const [isLoadingCustom, setIsLoadingCustom] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [selectedCustomDetails, setSelectedCustomDetails] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add Custom Reference Form State
  const [formTitle, setFormTitle] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formYear, setFormYear] = useState("");
  const [formField, setFormField] = useState("");
  const [inputMode, setInputMode] = useState("upload"); // "upload" | "paste"
  const [selectedFile, setSelectedFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Delete State
  const [deletingId, setDeletingId] = useState(null);

  // Edit Custom Reference State
  const [editingCustomRef, setEditingCustomRef] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editField, setEditField] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    loadCustomReferences();
  }, []);

  const loadCustomReferences = async () => {
    setIsLoadingCustom(true);
    try {
      const data = await getCustomReferences();
      setCustomReferences(data.references || []);
    } catch (err) {
      console.error("Failed to load custom references:", err);
    } finally {
      setIsLoadingCustom(false);
    }
  };

  const handleOpenAddModal = () => {
    setFormTitle("");
    setFormAuthor("");
    setFormYear("");
    setFormField("");
    setInputMode("upload");
    setSelectedFile(null);
    setPastedText("");
    setFormError("");
    setShowAddModal(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = [".pdf", ".docx", ".txt"];
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setFormError(`Unsupported file format '${ext}'. Please choose a PDF, DOCX, or TXT file.`);
      setSelectedFile(null);
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setFormError("File size exceeds 25 MB limit.");
      setSelectedFile(null);
      return;
    }

    setFormError("");
    setSelectedFile(file);
    if (!formTitle.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setFormTitle(baseName);
    }
  };

  const handleSubmitCustomReference = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("Reference title is required.");
      return;
    }

    if (inputMode === "upload" && !selectedFile) {
      setFormError("Please select a document file (PDF, DOCX, or TXT) to upload.");
      return;
    }

    if (inputMode === "paste" && !pastedText.trim()) {
      setFormError("Please paste reference excerpt or manuscript text.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const formData = new FormData();
      formData.append("title", formTitle.trim());
      if (formAuthor.trim()) formData.append("author", formAuthor.trim());
      if (formYear.trim()) formData.append("publication_year", formYear.trim());
      if (formField.trim()) formData.append("research_field", formField.trim());

      if (inputMode === "upload") {
        formData.append("file", selectedFile);
      } else {
        formData.append("text_content", pastedText.trim());
      }

      await addCustomReference(formData);

      setActionSuccess(`Reference "${formTitle.trim()}" added to your comparison library!`);
      setTimeout(() => setActionSuccess(""), 5000);

      setShowAddModal(false);
      await loadCustomReferences();
    } catch (err) {
      console.error("Failed to add reference:", err);
      setFormError(err.message || "Failed to add reference resource.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomReference = async (refId, refTitle) => {
    if (!window.confirm(`Are you sure you want to remove "${refTitle}" from your reference library?`)) {
      return;
    }
    setDeletingId(refId);
    try {
      await deleteCustomReference(refId);
      setActionSuccess(`Removed "${refTitle}" from your reference library.`);
      setTimeout(() => setActionSuccess(""), 5000);
      setCustomReferences((prev) => prev.filter((r) => r.id !== refId));
      if (selectedCustomDetails?.id === refId) {
        setSelectedCustomDetails(null);
      }
    } catch (err) {
      console.error("Failed to delete custom reference:", err);
      alert(err.message || "Failed to remove reference.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenEditModal = (ref) => {
    setEditingCustomRef(ref);
    setEditTitle(ref.title || "");
    setEditAuthor(ref.author || "");
    setEditYear(ref.publication_year || "");
    setEditField(ref.research_field || "");
    setEditError("");
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      setEditError("Title is required.");
      return;
    }
    if (!editingCustomRef) return;

    setIsUpdating(true);
    setEditError("");
    try {
      await updateCustomReference(editingCustomRef.id, {
        title: editTitle.trim(),
        author: editAuthor.trim(),
        publication_year: editYear.trim(),
        research_field: editField.trim(),
      });
      setActionSuccess(`Updated reference "${editTitle.trim()}" successfully.`);
      setTimeout(() => setActionSuccess(""), 5000);
      setEditingCustomRef(null);
      await loadCustomReferences();
    } catch (err) {
      console.error("Failed to update custom reference:", err);
      setEditError(err.message || "Failed to update reference resource.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Filtered Custom References
  const filteredCustomReferences = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customReferences;
    return customReferences.filter((r) => {
      const titleMatch = r.title?.toLowerCase().includes(q);
      const authorMatch = r.author?.toLowerCase().includes(q);
      const yearMatch = r.publication_year?.toString().includes(q);
      const fieldMatch = r.research_field?.toLowerCase().includes(q);
      const previewMatch = r.preview?.toLowerCase().includes(q);
      return titleMatch || authorMatch || yearMatch || fieldMatch || previewMatch;
    });
  }, [customReferences, searchQuery]);

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-slate-50 min-h-screen">
      {/* Top Header */}
      <header className="hidden lg:flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4 shadow-xs sticky top-0 z-30">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">My Custom References</h1>
            <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 text-xs font-semibold">
              Reference Library
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your custom reference documents and papers used for plagiarism similarity comparison.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl font-semibold text-indigo-800">
              <strong>{customReferences.length}</strong> Saved References
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-sm"
          >
            {icons.plus({ className: "h-4 w-4" })}
            Add Reference Resource
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        {actionSuccess && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              {icons.check({ className: "h-4 w-4 text-emerald-600" })}
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess("")}
              className="text-emerald-700 hover:text-emerald-900"
            >
              {icons.close({ className: "h-4 w-4" })}
            </button>
          </div>
        )}

        {/* Informational Transparency Alert */}
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-white p-5 text-xs text-slate-700 shadow-xs flex items-start gap-3.5">
          <div className="h-8 w-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 mt-0.5">
            {icons.info({ className: "h-4.5 w-4.5" })}
          </div>
          <div className="space-y-1.5 leading-relaxed">
            <h4 className="font-bold uppercase tracking-wider text-indigo-900 text-[11px]">
              Custom Reference Library Scope
            </h4>
            <p className="font-medium text-slate-800">
              When you check an academic manuscript, the plagiarism detector compares your work against reference documents uploaded during analysis and documents saved in your custom reference library below.
            </p>
            <p className="text-slate-600">
              Adding custom references allows you to test your paper specifically against target articles, cited preprints, or related manuscripts with sentence-level matching evidence.
            </p>
          </div>
        </div>

        {/* Search Bar & Counter */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span>Showing</span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
              {filteredCustomReferences.length}
            </span>
            <span>of {customReferences.length} custom references</span>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              {icons.search({ className: "h-4 w-4" })}
            </span>
            <input
              type="text"
              placeholder="Search references by title, author, year..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Section: My Custom References */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                My Custom References
              </h3>
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-bold">
                {filteredCustomReferences.length} Active
              </span>
            </div>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 lg:hidden"
            >
              + Add Reference
            </button>
          </div>

          {isLoadingCustom ? (
            <div className="flex justify-center p-8 bg-white rounded-2xl border border-slate-200">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : filteredCustomReferences.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 mb-3 border border-indigo-100">
                {icons.document({ className: "h-6 w-6" })}
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {searchQuery ? "No matching custom references" : "No Custom References Added Yet"}
              </h4>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto mb-4 leading-relaxed">
                {searchQuery
                  ? `No custom references matched "${searchQuery}".`
                  : "Add reference papers or paste excerpt text so the plagiarism engine can check your manuscripts directly against them."}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm"
                >
                  {icons.plus({ className: "h-3.5 w-3.5" })}
                  Add Your First Reference
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCustomReferences.map((ref) => (
                <div
                  key={ref.id}
                  className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-sm transition flex flex-col justify-between space-y-3 relative group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                        My Reference
                      </span>
                      {ref.publication_year && (
                        <span className="text-[11px] text-slate-500 font-semibold">
                          Year: {ref.publication_year}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                      {ref.title}
                    </h4>

                    {ref.author && (
                      <p className="text-[11px] text-slate-600 font-medium">
                        <span className="text-slate-400">Author: </span>
                        {ref.author}
                      </p>
                    )}

                    {ref.research_field && (
                      <p className="text-[11px] text-slate-600">
                        <span className="text-slate-400">Field: </span>
                        <span className="font-semibold text-slate-700">{ref.research_field}</span>
                      </p>
                    )}

                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {ref.preview || "No preview text available."}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div className="text-[10px] text-slate-400">
                      {ref.filename ? `Uploaded: ${ref.filename}` : "Direct text entry"}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomDetails(ref)}
                        className="font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        Inspect Excerpt &rarr;
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(ref)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        title="Edit metadata"
                      >
                        {icons.edit({ className: "h-4 w-4" })}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomReference(ref.id, ref.title)}
                        disabled={deletingId === ref.id}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Remove reference"
                      >
                        {icons.trash({ className: "h-4 w-4" })}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Custom Reference Resource Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="rounded-2xl border border-slate-200 bg-white w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Add Custom Reference Resource
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add reference papers or texts you want the plagiarism detector to compare against your manuscripts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                {icons.close({ className: "h-5 w-5" })}
              </button>
            </div>

            <form onSubmit={handleSubmitCustomReference} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-800">
                  {formError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reference Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Deep Residual Learning for Image Recognition"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  required
                />
              </div>

              {/* Authors & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Author(s) <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kaiming He, Xiangyu Zhang"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Publication Year <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 2024"
                    min="1900"
                    max="2100"
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Research Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Research Field / Subject <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Vision / Deep Learning"
                  value={formField}
                  onChange={(e) => setFormField(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* Input Mode Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Reference Content Source
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setInputMode("upload")}
                    className={`py-2 text-xs font-bold rounded-lg transition ${
                      inputMode === "upload"
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Upload Document File
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("paste")}
                    className={`py-2 text-xs font-bold rounded-lg transition ${
                      inputMode === "paste"
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Paste Text / Excerpt
                  </button>
                </div>
              </div>

              {/* Mode 1: File Upload */}
              {inputMode === "upload" ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
                      selectedFile
                        ? "border-emerald-400 bg-emerald-50/50"
                        : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
                    }`}
                  >
                    <div className="mx-auto w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
                      {icons.upload({ className: "h-5 w-5" })}
                    </div>
                    {selectedFile ? (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-900">{selectedFile.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB &bull; Click to change file
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800">
                          Click to browse reference paper
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Supports PDF, DOCX, or TXT (Max 25 MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Mode 2: Paste Text */
                <div>
                  <textarea
                    rows={6}
                    placeholder="Paste reference paper abstract, excerpt, or full manuscript text here..."
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed font-mono"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                    <span>Text is normalized and vectorised using TF-IDF for plagiarism comparison</span>
                    <span>{pastedText.length} characters</span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {isSubmitting ? "Processing Reference..." : "Add Reference Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Custom Reference Content Modal */}
      {selectedCustomDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="rounded-2xl border border-slate-200 bg-white w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    My Custom Reference
                  </span>
                  {selectedCustomDetails.publication_year && (
                    <span className="text-xs font-medium text-slate-500">
                      Year: {selectedCustomDetails.publication_year}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1 leading-snug">
                  {selectedCustomDetails.title}
                </h3>
                {selectedCustomDetails.author && (
                  <p className="text-xs text-slate-600 mt-0.5">By {selectedCustomDetails.author}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomDetails(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                {icons.close({ className: "h-5 w-5" })}
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
              {selectedCustomDetails.research_field && (
                <div>
                  <h5 className="font-bold uppercase tracking-wider text-slate-600 text-[10px] mb-1">
                    Research Field
                  </h5>
                  <p className="font-semibold text-slate-800">{selectedCustomDetails.research_field}</p>
                </div>
              )}

              <div>
                <h5 className="font-bold uppercase tracking-wider text-slate-600 text-[10px] mb-1">
                  Stored Content Preview (TF-IDF Indexed)
                </h5>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {selectedCustomDetails.preview || "No content available."}
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs">
              <span className="text-slate-400 text-[11px]">
                Added: {selectedCustomDetails.created_at || "Recent"}
              </span>
              <button
                type="button"
                onClick={() => setSelectedCustomDetails(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Custom Reference Metadata Modal */}
      {editingCustomRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="rounded-2xl border border-slate-200 bg-white w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Reference Metadata
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update bibliographic metadata for this custom comparison resource.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomRef(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                {icons.close({ className: "h-5 w-5" })}
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Reference Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Deep Residual Learning for Image Recognition"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Author(s)
                  </label>
                  <input
                    type="text"
                    value={editAuthor}
                    onChange={(e) => setEditAuthor(e.target.value)}
                    placeholder="e.g. K. He, X. Zhang"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Publication Year
                  </label>
                  <input
                    type="text"
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    placeholder="e.g. 2023"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Research Field
                </label>
                <input
                  type="text"
                  value={editField}
                  onChange={(e) => setEditField(e.target.value)}
                  placeholder="e.g. Computer Vision / Deep Learning"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomRef(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-1.5 shadow-xs"
                >
                  {isUpdating ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
