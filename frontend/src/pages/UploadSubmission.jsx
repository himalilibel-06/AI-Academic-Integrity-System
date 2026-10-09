import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { submitAssignment, getStudentEnrolledCourses } from "../service/api";

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
  close: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
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
  )
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

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [title, setTitle] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [reportId, setReportId] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await getStudentEnrolledCourses();
        if (response.success && response.courses) {
          setCourses(response.courses);
          if (response.courses.length > 0) {
            setSelectedCourseId(response.courses[0].id.toString());
          }
        }
      } catch (err) {
        console.error("Failed to load courses:", err);
      }
    };
    fetchCourses();
  }, []);

  const validateFile = (file) => {
    if (!file) return "Please select a document file.";
    const ext = getFileExtension(file.name);
    const typeIsAccepted = ACCEPTED_EXTENSIONS.includes(ext) || ACCEPTED_TYPES.includes(file.type);

    if (!typeIsAccepted) {
      return "Only PDF (.pdf), DOCX (.docx), and TXT (.txt) files are supported.";
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return "File size must be less than 15 MB.";
    }

    return "";
  };

  const handleFileSelection = (file) => {
    const error = validateFile(file);
    if (error) {
      setFileError(error);
      setSelectedFile(null);
      return;
    }
    setFileError("");
    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleFileSelection(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFileSelection(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFileError("");

    if (!selectedCourseId) {
      setFileError("A course must be selected.");
      return;
    }
    if (!title.trim()) {
      setFileError("Document title is required.");
      return;
    }
    if (!selectedFile) {
      setFileError("Please select a document file (.pdf, .docx, or .txt).");
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("course_id", selectedCourseId);
      formData.append("file", selectedFile);

      const response = await submitAssignment(formData);

      if (response && response.success) {
        setIsSuccess(true);
        setReportId(response.report_id);
      } else {
        setFileError(response.detail || "Failed to submit document for analysis.");
      }
    } catch (err) {
      setFileError(err.message || "Failed to submit document. Please check your connection and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-slate-50 min-h-screen">
      <header className="hidden lg:flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4 shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            to="/student/dashboard"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
          >
            {icons.arrowLeft({ className: "h-4 w-4" })}
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Check Document</h1>
              <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold">
                Plagiarism Detector
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Analyze your document for similarity against peer submissions and research literature.
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-6">
        {fileError && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs font-semibold text-rose-900 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-600 flex-shrink-0" />
              <span>{fileError}</span>
            </div>
            <button type="button" onClick={() => setFileError("")} className="text-rose-700 hover:text-rose-900">
              {icons.close({ className: "h-4 w-4" })}
            </button>
          </div>
        )}

        {isSuccess ? (
          <div className="rounded-2xl border border-emerald-200 bg-white p-6 sm:p-8 shadow-md text-center space-y-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              {icons.checkCircle({ className: "h-8 w-8" })}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Analysis Complete</h2>
              <p className="mt-2 text-slate-600">
                Your document has been successfully checked for plagiarism.
              </p>
            </div>
            <div className="flex justify-center gap-4">
              <Link
                to={`/student/reports/${reportId}`}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                View Plagiarism Report
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-800">
                    Course <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    disabled={isProcessing || courses.length === 0}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-50"
                    required
                  >
                    {courses.length === 0 ? (
                      <option value="">No enrolled courses available</option>
                    ) : (
                      courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} - {c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-800">
                    Document Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isProcessing}
                    placeholder="e.g. Final Essay Draft"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-sm font-bold text-slate-800">
                  Document Upload <span className="text-rose-500">*</span>
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-colors ${
                    isDragActive
                      ? "border-emerald-500 bg-emerald-50/50"
                      : selectedFile
                      ? "border-emerald-300 bg-emerald-50/20"
                      : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    accept=".pdf,.docx,.txt"
                    className="absolute inset-0 z-50 h-full w-full cursor-pointer opacity-0"
                    disabled={isProcessing}
                  />
                  {selectedFile ? (
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-3 rounded-full bg-emerald-100 p-3 text-emerald-600">
                        {icons.fileDoc({ className: "h-8 w-8" })}
                      </div>
                      <p className="text-sm font-bold text-slate-900">{selectedFile.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center pointer-events-none">
                      <div className="mb-4 rounded-full bg-white p-4 shadow-sm text-slate-400 border border-slate-200 group-hover:text-emerald-500 transition-colors">
                        {icons.upload({ className: "h-8 w-8" })}
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        Drag & Drop or <span className="text-emerald-600">Browse Files</span>
                      </p>
                      <p className="mt-2 text-xs font-medium text-slate-500 max-w-xs leading-relaxed">
                        Accepted formats: PDF, DOCX, TXT. <br />
                        Maximum size: 15 MB.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4">
              <Link
                to="/student/dashboard"
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isProcessing || !selectedFile}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    {icons.upload({ className: "h-4 w-4" })}
                    Check Plagiarism
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