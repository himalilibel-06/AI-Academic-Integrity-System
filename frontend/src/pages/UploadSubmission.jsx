import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { submitAssignment, getCourses } from "../service/api";

const COURSE_OPTIONS = [
  { value: "CS401", label: "CS401 - Machine Learning" },
  { value: "CS402", label: "CS402 - Artificial Intelligence" },
  { value: "CS403", label: "CS403 - Database Management" },
  { value: "CS404", label: "CS404 - Computer Networks" },
];

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const NAV_ITEMS = [
  { label: "Dashboard", to: "/student/dashboard" },
  { label: "Upload Submission", to: "/student/upload" },
  { label: "My Submissions", to: "/student/submissions" },
  { label: "Reports", to: "/student/reports" },
  { label: "Profile", to: "/student/profile" },
  { label: "Settings", to: "/student/settings" },
];

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(fileName) {
  const parts = fileName.split(".");
  return parts.length > 1 ? `.${parts.pop().toLowerCase()}` : "";
}

function getFileTypeLabel(fileName) {
  const ext = getFileExtension(fileName);
  if (ext === ".pdf") return "PDF";
  if (ext === ".docx") return "DOCX";
  if (ext === ".txt") return "TXT";
  return ext.replace(".", "").toUpperCase() || "FILE";
}

export default function UploadSubmission() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [course, setCourse] = useState("");
  const [coursesList, setCoursesList] = useState(COURSE_OPTIONS);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedInfo, setSubmittedInfo] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    async function loadCourses() {
      try {
        const response = await getCourses();
        if (isMounted && response && response.courses && response.courses.length > 0) {
          const mapped = response.courses.map((c) => ({
            value: String(c.id),
            label: `${c.code} - ${c.name}`,
            code: c.code,
          }));
          setCoursesList(mapped);
        }
      } catch (err) {
        console.warn("Could not load backend courses list; falling back to default courses.", err);
      }
    }
    loadCourses();
    return () => {
      isMounted = false;
    };
  }, []);

  const validateFile = (file) => {
    if (!file) {
      return "Please select a file.";
    }

    const ext = getFileExtension(file.name);
    const typeIsAccepted =
      ACCEPTED_EXTENSIONS.includes(ext) || ACCEPTED_TYPES.includes(file.type);

    if (!typeIsAccepted) {
      return "Only PDF, DOCX and TXT files are supported.";
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return "File size must be less than 10 MB.";
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
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files && e.target.files[0];
    handleFileSelection(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
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
    handleFileSelection(file);
  };

  const isFormValid =
    course !== "" && title.trim() !== "" && selectedFile !== null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setFileError("Please select a file.");
      return;
    }

    if (!isFormValid || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setFileError("");

    try {
      // Create form data for backend submission
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("course_id", course);
      formData.append("file", selectedFile);

      // Call API service with JWT authentication
      const result = await submitAssignment(formData);

      console.log("Submission successful:", result);

      // Direct redirection to the actual plagiarism report page
      if (result && result.report_id) {
        navigate(`/student/reports/${result.report_id}`);
      } else {
        navigate("/student/reports");
      }
    } catch (error) {
      console.error("Submission error:", error);

      setFileError(
        error.message ||
          "Unable to complete document analysis. Please check your file and try again."
      );

      setIsProcessing(false);
    }
  };

  const handleUploadAnother = () => {
    setCourse("");
    setTitle("");
    setDescription("");
    setSelectedFile(null);
    setFileError("");
    setIsProcessing(false);
    setIsSuccess(false);
    setSubmittedInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-slate-900 text-white flex-shrink-0 lg:min-h-screen">
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5L3 8.25l9 3.75 9-3.75-9-3.75zM3 8.25v7.5l9 3.75m0-11.25l9 3.75m-9-3.75v11.25m9-11.25v7.5l-9 3.75"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium leading-tight">
                Academic Integrity
              </p>
              <p className="text-xs text-slate-400 leading-tight">
                Student Portal
              </p>
            </div>
          </div>
        </div>

        <nav className="px-3 py-4" aria-label="Student navigation">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.label === "Upload Submission";
              return (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className={`block rounded-lg px-3.5 py-2.5 text-sm transition ${
                      isActive
                        ? "bg-white/10 text-white font-medium border border-white/20"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-3 py-4 mt-auto border-t border-white/10">
          <button
            type="button"
            onClick={logout}
            className="w-full text-left rounded-lg px-3.5 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-4 py-8 sm:px-8 lg:px-10">
        <div className="max-w-3xl mx-auto">
          <nav aria-label="Breadcrumb" className="mb-3">
            <ol className="flex items-center gap-2 text-sm text-slate-500">
              <li>
                <Link to="/student/dashboard" className="hover:text-emerald-600">
                  Student Dashboard
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-slate-700 font-medium">Upload Submission</li>
            </ol>
          </nav>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">
              Upload Assignment
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Submit your academic document for similarity analysis.
            </p>
          </div>

          {isProcessing ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
              <svg
                className="mx-auto h-8 w-8 animate-spin text-emerald-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="mt-4 text-sm font-medium text-slate-900">
                Submission received successfully.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Your document is being prepared for similarity analysis.
              </p>
            </div>
          ) : isSuccess && submittedInfo ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Submission Received
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Your assignment has been submitted successfully.
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
                <div className="border border-slate-200 rounded-lg p-3.5">
                  <dt className="text-slate-500">Assignment Title</dt>
                  <dd className="text-slate-900 font-medium mt-0.5">
                    {submittedInfo.title}
                  </dd>
                </div>
                <div className="border border-slate-200 rounded-lg p-3.5">
                  <dt className="text-slate-500">Course</dt>
                  <dd className="text-slate-900 font-medium mt-0.5">
                    {submittedInfo.course}
                  </dd>
                </div>
                <div className="border border-slate-200 rounded-lg p-3.5">
                  <dt className="text-slate-500">File Name</dt>
                  <dd className="text-slate-900 font-medium mt-0.5 truncate">
                    {submittedInfo.fileName}
                  </dd>
                </div>
                <div className="border border-slate-200 rounded-lg p-3.5">
                  <dt className="text-slate-500">Status</dt>
                  <dd className="mt-0.5">
                    <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 text-xs font-medium">
                      Processing
                    </span>
                  </dd>
                </div>
              </dl>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/student/submissions"
                  className="flex-1 text-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  View My Submissions
                </Link>
                <button
                  type="button"
                  onClick={handleUploadAnother}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  Upload Another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* Assignment Information */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
                <h2 className="text-base font-semibold text-slate-900 mb-4">
                  Assignment Information
                </h2>

                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="course"
                      className="block text-sm font-medium text-slate-700 mb-1.5"
                    >
                      Course
                    </label>
                    <select
                      id="course"
                      name="course"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">Select a course</option>
                      {coursesList.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="title"
                      className="block text-sm font-medium text-slate-700 mb-1.5"
                    >
                      Assignment Title
                    </label>
                    <input
                      id="title"
                      name="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter assignment title"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-slate-700 mb-1.5"
                    >
                      Description{" "}
                      <span className="text-slate-400 font-normal">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Briefly describe your assignment"
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
                <h2 className="text-base font-semibold text-slate-900 mb-4">
                  Document Upload
                </h2>

                {!selectedFile ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
                      isDragActive
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-slate-300 bg-slate-50"
                    }`}
                  >
                    <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-emerald-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 8.25L12 3.75m0 0L7.5 8.25M12 3.75v12"
                        />
                      </svg>
                    </div>

                    <p className="text-sm font-medium text-slate-900">
                      Upload your document
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      Drag and drop your file here, or browse from your
                      computer.
                    </p>

                    <button
                      type="button"
                      onClick={handleBrowseClick}
                      className="mt-5 inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                      Browse Files
                    </button>

                    <input
                      ref={fileInputRef}
                      id="fileUpload"
                      name="fileUpload"
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileInputChange}
                      className="sr-only"
                      aria-label="Upload your document"
                    />

                    <p className="text-xs text-slate-400 mt-4">
                      Accepted formats: PDF, DOCX, TXT · Maximum file size: 10
                      MB
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-emerald-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-1.519-3.75L12 12l-1.481 1.5M18.75 21H5.25a2.25 2.25 0 01-2.25-2.25V5.25A2.25 2.25 0 015.25 3h5.379a1.5 1.5 0 011.06.44l5.121 5.121a1.5 1.5 0 01.44 1.06V18.75a2.25 2.25 0 01-2.25 2.25z"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {getFileTypeLabel(selectedFile.name)} ·{" "}
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="flex-shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white hover:text-red-600 hover:border-red-300 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {fileError && (
                  <p className="mt-3 text-sm text-red-600" role="alert">
                    {fileError}
                  </p>
                )}
              </div>

              {/* Informational box */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-4">
                <p className="text-sm text-emerald-900">
                  Your document will be analyzed for content similarity
                  against the available academic reference corpus.
                </p>
                <p className="text-sm text-emerald-800 mt-2">
                  <span className="font-medium">Important:</span> A
                  similarity score does not by itself prove plagiarism.
                  Results are intended to support academic review.
                </p>
              </div>

              {/* Submit */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!isFormValid || isProcessing}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-500"
                >
                  Submit for Analysis
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}