import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { submitAssignment, getCustomReferences } from "../service/api";

const icons = {
  upload: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  fileDoc: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  referenceDoc: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinejoin="round" />
      <path d="M9 7h6M9 11h4" strokeLinecap="round" />
    </svg>
  ),
  close: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  arrowLeft: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  checkCircle: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
    </svg>
  ),
  shield: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(fileName) {
  const parts = fileName.split(".");
  return parts.length > 1 ? `.${parts.pop().toLowerCase()}` : "";
}

export default function UploadSubmission() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState("");

  // Target paper to check
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isDragActiveTarget, setIsDragActiveTarget] = useState(false);

  // Reference documents for current check
  const [referenceFiles, setReferenceFiles] = useState([]);
  const [isDragActiveRefs, setIsDragActiveRefs] = useState(false);

  const [customReferences, setCustomReferences] = useState([]);
  const [selectedCustomIds, setSelectedCustomIds] = useState([]);
  const [useAllCustomRefs, setUseAllCustomRefs] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [reportId, setReportId] = useState(null);

  const targetFileInputRef = useRef(null);
  const refFileInputRef = useRef(null);

  useEffect(() => {
    // Load saved reference documents if available
    const loadSavedReferences = async () => {
      try {
        const refRes = await getCustomReferences();
        if (refRes && refRes.success && refRes.references) {
          setCustomReferences(refRes.references);
        }
      } catch (refErr) {
        console.error("Failed to load saved references:", refErr);
      }
    };
    loadSavedReferences();
  }, []);

  const validateFile = (file) => {
    if (!file) return "Please select a valid document file.";
    const ext = getFileExtension(file.name);
    const typeIsAccepted = ACCEPTED_EXTENSIONS.includes(ext) || ACCEPTED_TYPES.includes(file.type);

    if (!typeIsAccepted) {
      return `File '${file.name}' has an unsupported format. Please upload PDF, DOCX, or TXT.`;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File '${file.name}' exceeds the 15 MB size limit.`;
    }

    return "";
  };

  const handleTargetFileSelection = (file) => {
    const error = validateFile(file);
    if (error) {
      setFileError(error);
      setSelectedFile(null);
      return;
    }
    setFileError("");
    setSelectedFile(file);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleTargetInputChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleTargetFileSelection(file);
    if (e.target) e.target.value = "";
  };

  const handleReferenceFilesAdd = (files) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    const errors = [];
    const validToAdd = [];

    newFiles.forEach((file) => {
      const err = validateFile(file);
      if (err) {
        errors.push(err);
      } else {
        // Prevent duplicate files by name and size
        const alreadyExists = referenceFiles.some(
          (rf) => rf.name === file.name && rf.size === file.size
        );
        if (!alreadyExists) {
          validToAdd.push(file);
        }
      }
    });

    if (errors.length > 0) {
      setFileError(errors[0]);
    } else {
      setFileError("");
    }

    if (validToAdd.length > 0) {
      setReferenceFiles((prev) => [...prev, ...validToAdd]);
    }
  };

  const handleRemoveReferenceFile = (indexToRemove) => {
    setReferenceFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const toggleCustomRef = (id) => {
    setSelectedCustomIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFileError("");

    if (!selectedFile) {
      setFileError("Please select a research paper to check (.pdf, .docx, or .txt).");
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      const resolvedTitle = (
        title.trim() ||
        (selectedFile && selectedFile.name ? selectedFile.name.replace(/\.[^/.]+$/, "") : "Research Paper")
      ).trim() || "Research Paper";
      formData.append("title", resolvedTitle);
      formData.append("file", selectedFile);

      // Append reference files uploaded for this comparison
      if (referenceFiles && referenceFiles.length > 0) {
        referenceFiles.forEach((refFile) => {
          if (refFile) {
            formData.append("reference_files", refFile);
          }
        });
      }

      // Optional: saved custom references
      if (useAllCustomRefs) {
        formData.append("custom_reference_ids", "all");
      } else if (selectedCustomIds.length > 0) {
        formData.append("custom_reference_ids", selectedCustomIds.join(","));
      } else {
        formData.append("custom_reference_ids", "none");
      }

      const response = await submitAssignment(formData);

      if (response && response.success) {
        setIsSuccess(true);
        setReportId(response.report_id);
      } else {
        setFileError(response.detail || "Failed to analyze document.");
      }
    } catch (err) {
      setFileError(err.message || "Failed to analyze document. Please check your connection and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-slate-50 min-h-screen">
      {/* Top Header */}
      <header className="hidden lg:flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4 shadow-xs sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            to="/student/dashboard"
            className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
          >
            {icons.arrowLeft({ className: "h-4 w-4" })}
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Check Document Similarity</h1>
              <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold">
                GapGuard AI
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload your research paper and reference documents for instant similarity analysis.
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-6">
        {fileError && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs font-semibold text-rose-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-600 flex-shrink-0" />
              <span>{fileError}</span>
            </div>
            <button
              type="button"
              onClick={() => setFileError("")}
              className="text-rose-700 hover:text-rose-900"
            >
              {icons.close({ className: "h-4 w-4" })}
            </button>
          </div>
        )}

        {isSuccess ? (
          <div className="rounded-2xl border border-blue-200 bg-white p-6 sm:p-10 shadow-sm text-center space-y-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              {icons.checkCircle({ className: "h-9 w-9 text-blue-600" })}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Similarity Check Complete!</h2>
              <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                Your research paper has been preprocessed and compared against the selected reference documents.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                to={`/student/reports/${reportId}`}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition"
              >
                View Similarity Report
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsSuccess(false);
                  setSelectedFile(null);
                  setReferenceFiles([]);
                  setTitle("");
                  setReportId(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Check Another Document
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Research Paper to Check */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
                    1
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Research Paper to Check</h2>
                    <p className="text-xs text-slate-500">Upload the primary document you want to evaluate</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">PDF, DOCX, TXT</span>
              </div>

              {/* Document Title (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Document Title <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isProcessing}
                  placeholder="e.g. Comparative Analysis of Neural Attention Draft"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 transition"
                />
              </div>

              {/* Primary File Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragActiveTarget(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragActiveTarget(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragActiveTarget(false);
                  const file = e.dataTransfer.files && e.dataTransfer.files[0];
                  if (file) handleTargetFileSelection(file);
                }}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-colors ${
                  isDragActiveTarget
                    ? "border-blue-500 bg-blue-50/50"
                    : selectedFile
                    ? "border-blue-300 bg-blue-50/20"
                    : "border-slate-300 bg-slate-50/50 hover:bg-slate-100 hover:border-blue-300"
                }`}
              >
                <input
                  type="file"
                  ref={targetFileInputRef}
                  onChange={handleTargetInputChange}
                  accept=".pdf,.docx,.txt"
                  className="absolute inset-0 z-50 h-full w-full cursor-pointer opacity-0"
                  disabled={isProcessing}
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-3 rounded-xl bg-blue-100 p-3 text-blue-600">
                      {icons.fileDoc({ className: "h-8 w-8" })}
                    </div>
                    <p className="text-sm font-bold text-slate-900">{selectedFile.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="mt-3 text-xs font-semibold text-rose-600 hover:text-rose-800"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center pointer-events-none">
                    <div className="mb-4 rounded-xl bg-white p-3.5 shadow-xs text-slate-400 border border-slate-200">
                      {icons.upload({ className: "h-8 w-8 text-blue-600" })}
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      Drag &amp; drop research paper or <span className="text-blue-600 font-semibold">browse files</span>
                    </p>
                    <p className="mt-1.5 text-xs text-slate-500 max-w-xs leading-relaxed">
                      Supported formats: <strong>PDF (.pdf)</strong>, <strong>DOCX (.docx)</strong>, <strong>TXT (.txt)</strong>.
                      <br />Max size: <strong>15 MB</strong>.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Reference Documents for Comparison */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                    2
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Reference Documents for Comparison</h2>
                    <p className="text-xs text-slate-500">
                      Upload one or more reference papers, articles, or source files to check against
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 text-xs font-semibold">
                  {referenceFiles.length} file{referenceFiles.length === 1 ? "" : "s"} added
                </span>
              </div>

              {/* Reference Files Multi-Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragActiveRefs(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragActiveRefs(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragActiveRefs(false);
                  if (e.dataTransfer.files) {
                    handleReferenceFilesAdd(e.dataTransfer.files);
                  }
                }}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-colors ${
                  isDragActiveRefs
                    ? "border-indigo-500 bg-indigo-50/50"
                    : "border-slate-300 bg-slate-50/50 hover:bg-slate-100 hover:border-indigo-300"
                }`}
              >
                <input
                  type="file"
                  ref={refFileInputRef}
                  onChange={(e) => {
                    if (e.target.files) handleReferenceFilesAdd(e.target.files);
                    if (e.target) e.target.value = "";
                  }}
                  accept=".pdf,.docx,.txt"
                  multiple
                  className="absolute inset-0 z-50 h-full w-full cursor-pointer opacity-0"
                  disabled={isProcessing}
                />
                <div className="flex flex-col items-center text-center pointer-events-none">
                  <div className="mb-3 rounded-xl bg-white p-3 shadow-xs text-slate-400 border border-slate-200">
                    {icons.referenceDoc({ className: "h-6 w-6 text-indigo-600" })}
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    Drop reference documents here or <span className="text-indigo-600 font-semibold">select multiple files</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    You can add multiple reference files (PDF, DOCX, TXT) in a single check.
                  </p>
                </div>
              </div>

              {/* List of Uploaded Reference Files */}
              {referenceFiles.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Uploaded Reference Files ({referenceFiles.length})
                  </h3>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                    {referenceFiles.map((refFile, index) => (
                      <div
                        key={`${refFile.name}-${index}`}
                        className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                            {icons.fileDoc({ className: "h-4 w-4" })}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {refFile.name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {formatFileSize(refFile.size)} &bull; Reference Document
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveReferenceFile(index)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="Remove reference file"
                        >
                          {icons.close({ className: "h-4 w-4" })}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Saved References Option (if user has any saved) */}
              {customReferences.length > 0 && (
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        {icons.referenceDoc({ className: "h-3.5 w-3.5 text-indigo-600" })}
                        Also Compare With Saved Reference Library
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Include your previously uploaded reference resources from your library.
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={useAllCustomRefs}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setUseAllCustomRefs(val);
                          if (val) {
                            setSelectedCustomIds(customReferences.map((r) => r.id));
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>Include all saved references</span>
                    </label>
                  </div>

                  {!useAllCustomRefs && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      {customReferences.map((ref) => {
                        const isChecked = selectedCustomIds.includes(ref.id);
                        return (
                          <label
                            key={ref.id}
                            className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition ${
                              isChecked
                                ? "bg-white border-blue-300 shadow-2xs"
                                : "bg-slate-100/60 border-slate-200 opacity-60"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleCustomRef(ref.id)}
                              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                            />
                            <div className="min-w-0 text-xs">
                              <p className="font-semibold text-slate-900 truncate">
                                {ref.title}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {ref.author || "Saved Reference"} {ref.publication_year ? `(${ref.publication_year})` : ""}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3.5 pt-2">
              <Link
                to="/student/dashboard"
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isProcessing || !selectedFile}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Analyzing Document...</span>
                  </>
                ) : (
                  <>
                    {icons.upload({ className: "h-4 w-4" })}
                    Check Similarity
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}