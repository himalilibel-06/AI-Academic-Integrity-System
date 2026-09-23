import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getResearchProjects } from "../service/projectStorage";
import { saveManuscript, getManuscriptsByProject, getNextVersionLabel } from "../service/manuscriptStorage";
import { extractManuscriptText, extractResearchInfo } from "../service/api";

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

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
  upload: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" strokeLinecap="round" strokeLinejoin="round" />
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
  checkCircle: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
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
  trash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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
  arrowLeft: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

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

function getFileTypeLabel(fileName) {
  const ext = getFileExtension(fileName);
  if (ext === ".pdf") return "PDF";
  if (ext === ".docx") return "DOCX";
  if (ext === ".txt") return "TXT";
  return ext.replace(".", "").toUpperCase() || "DOCUMENT";
}

function ResearchInformationPreview({ result }) {
  if (!result) return null;
  const meta = result.extraction_metadata || {};
  const fields = [
    { key: "title", label: "Title", type: "text" },
    { key: "abstract", label: "Abstract", type: "text" },
    { key: "keywords", label: "Keywords", type: "items" },
    { key: "research_problem", label: "Research Problem", type: "text" },
    { key: "research_objective", label: "Research Objective", type: "text" },
    { key: "research_question", label: "Research Question", type: "text" },
    { key: "claimed_research_gap", label: "Claimed Research Gap", type: "text", highlight: true },
    { key: "proposed_method", label: "Proposed Method", type: "text" },
    { key: "dataset_context", label: "Dataset / Application Context", type: "text" },
    { key: "expected_contribution", label: "Extracted Contribution", type: "text", highlight: true },
    { key: "evaluation_metrics", label: "Evaluation Metrics", type: "items" },
    { key: "major_claims", label: "Major Claims", type: "items" },
    { key: "references", label: "References", type: "items" },
  ];

  return (
    <div className="mt-5 rounded-2xl border border-indigo-200 bg-white p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-200 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
              Research Information Extraction
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              Method: {meta.method || "rule_based_baseline"}
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-1">
            Research Information
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Structured representation extracted from manuscript text. Extraction confidence indicates text location certainty, NOT scientific validation or literature verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-lg">
            {meta.fields_found ?? 0} Extracted
          </span>
          <span className="bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-1 rounded-lg">
            {meta.fields_missing ?? 0} Not detected
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 text-xs">
        {fields.map(({ key, label, type, highlight }) => {
          const fieldData = result[key] || {};
          const isText = type === "text";
          const hasContent = isText
            ? Boolean(fieldData.text && fieldData.text.trim())
            : Boolean(fieldData.items && fieldData.items.length > 0);
          const confidence = fieldData.confidence;

          return (
            <div
              key={key}
              className={`rounded-xl border p-4 transition-colors ${
                hasContent
                  ? highlight
                    ? "border-indigo-300 bg-indigo-50/20"
                    : "border-slate-200 bg-slate-50/50"
                  : "border-slate-100 bg-slate-50/20 opacity-80"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{label}</span>
                  {hasContent ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                      Extracted
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      Not detected
                    </span>
                  )}
                </div>

                {hasContent && confidence && (
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                      confidence === "high"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {confidence === "high" ? "High Confidence" : "Medium Confidence"} (Location)
                  </span>
                )}
              </div>

              {hasContent ? (
                isText ? (
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                    {fieldData.text}
                  </p>
                ) : key === "keywords" || key === "evaluation_metrics" ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {fieldData.items.map((item, idx) => (
                      <span
                        key={idx}
                        className="bg-white border border-slate-200 text-slate-800 text-[11px] font-medium px-2.5 py-0.5 rounded-md shadow-2xs"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : key === "major_claims" ? (
                  <ul className="space-y-1.5 pt-1 list-disc list-inside text-slate-700">
                    {fieldData.items.map((claim, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {claim}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ol className="space-y-1 pt-1 list-decimal list-inside text-slate-600 font-mono text-[11px]">
                    {fieldData.items.map((ref, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {ref}
                      </li>
                    ))}
                  </ol>
                )
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  Not detected in manuscript text.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick retrieval CTA */}
      <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
        <div>
          <p className="text-xs font-semibold text-slate-800">
            Literature Retrieval Ready
          </p>
          <p className="text-[11px] text-slate-500">
            Query the local research-paper corpus using the extracted manuscript information.
          </p>
        </div>
        <Link
          to={`/student/literature?q=${encodeURIComponent(
            result.title?.text || result.research_problem?.text || ""
          )}`}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-semibold shadow-xs transition"
        >
          {icons.literature({ className: "h-4 w-4" })}
          Retrieve Relevant Literature
        </Link>
      </div>
    </div>
  );
}

export default function UploadSubmission() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedProjectId = searchParams.get("projectId");

  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectsList, setProjectsList] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Manuscript Metadata & Version
  const [manuscriptTitle, setManuscriptTitle] = useState("");
  const [versionName, setVersionName] = useState("Version 1 — Initial Draft");
  const [abstract, setAbstract] = useState("");
  const [keywords, setKeywords] = useState("");

  // File State
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);

  // Plain Text Extraction State (Foundation Step: File -> Text, No AI Analysis)
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);
  const [extractionError, setExtractionError] = useState("");

  // Research Information Extraction State (Foundation Step: Text -> Research Representation)
  const [isExtractingResearchInfo, setIsExtractingResearchInfo] = useState(false);
  const [researchInfoResult, setResearchInfoResult] = useState(null);
  const [researchInfoError, setResearchInfoError] = useState("");

  // Submission State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploadedRecord, setUploadedRecord] = useState(null);

  const fileInputRef = useRef(null);

  // Load existing Research Projects
  useEffect(() => {
    const projects = getResearchProjects();
    setProjectsList(projects);

    if (projects.length > 0) {
      if (preselectedProjectId && projects.some((p) => p.id === preselectedProjectId)) {
        setSelectedProjectId(preselectedProjectId);
      } else {
        setSelectedProjectId(projects[0].id);
      }
    }
  }, [preselectedProjectId]);

  // When selected project changes, update default manuscript title & suggested version
  const currentProject = useMemo(() => {
    return projectsList.find((p) => p.id === selectedProjectId) || null;
  }, [projectsList, selectedProjectId]);

  useEffect(() => {
    if (currentProject) {
      // Auto-prefill manuscript title if not already modified
      setManuscriptTitle(currentProject.title);
      // Auto-suggest next version label
      const nextVer = getNextVersionLabel(currentProject.id);
      setVersionName(nextVer);
    }
  }, [currentProject]);

  // Count existing manuscript versions for selected project
  const existingProjectManuscripts = useMemo(() => {
    if (!selectedProjectId) return [];
    return getManuscriptsByProject(selectedProjectId);
  }, [selectedProjectId, isSuccess]);

  const validateFile = (file) => {
    if (!file) return "Please select a manuscript document file.";
    const ext = getFileExtension(file.name);
    const typeIsAccepted = ACCEPTED_EXTENSIONS.includes(ext) || ACCEPTED_TYPES.includes(file.type);

    if (!typeIsAccepted) {
      return "Only PDF (.pdf), DOCX (.docx), and TXT (.txt) manuscript files are supported.";
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
      setExtractionResult(null);
      setExtractionError("");
      setResearchInfoResult(null);
      setResearchInfoError("");
      return;
    }
    setFileError("");
    setSelectedFile(file);
    setExtractionResult(null);
    setExtractionError("");
    setResearchInfoResult(null);
    setResearchInfoError("");
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleFileSelection(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileError("");
    setExtractionResult(null);
    setExtractionError("");
    setResearchInfoResult(null);
    setResearchInfoError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExtractText = async () => {
    if (!selectedFile) {
      setFileError("Please select a document file first.");
      return;
    }
    setIsExtracting(true);
    setExtractionError("");
    setExtractionResult(null);
    setResearchInfoResult(null);
    setResearchInfoError("");

    try {
      const result = await extractManuscriptText(selectedFile);
      setExtractionResult(result);
    } catch (err) {
      console.error("Text extraction failed:", err);
      setExtractionError(err.message || "Failed to extract text from document.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtractResearchInfo = async () => {
    if (!extractionResult?.text) {
      setResearchInfoError("Please extract manuscript text first.");
      return;
    }
    setIsExtractingResearchInfo(true);
    setResearchInfoError("");
    setResearchInfoResult(null);

    try {
      const result = await extractResearchInfo({
        text: extractionResult.text,
        file_name: extractionResult.file_name || selectedFile?.name,
      });
      setResearchInfoResult(result);
    } catch (err) {
      console.error("Research information extraction failed:", err);
      setResearchInfoError(err.message || "Failed to extract research information.");
    } finally {
      setIsExtractingResearchInfo(false);
    }
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

  const handleSubmit = (e) => {
    e.preventDefault();
    setFileError("");

    if (!selectedProjectId) {
      setFileError("A Research Project must be selected to upload a manuscript.");
      return;
    }
    if (!manuscriptTitle.trim()) {
      setFileError("Manuscript title is required.");
      return;
    }
    if (!selectedFile) {
      setFileError("Please select a document file (.pdf, .docx, or .txt).");
      return;
    }

    setIsProcessing(true);

    try {
      // Create local file reference (metadata layer separate from actual storage)
      const mockFileRef = `local_blob://${encodeURIComponent(selectedFile.name)}`;

      const newRecord = saveManuscript({
        projectId: selectedProjectId,
        projectTitle: currentProject?.title || "Research Project",
        projectDomain: currentProject?.domain || "Interdisciplinary AI",
        manuscriptTitle: manuscriptTitle.trim(),
        version: versionName.trim() || "Version 1 — Initial Draft",
        abstract: abstract.trim(),
        keywords: keywords.trim(),
        fileName: selectedFile.name,
        fileType: getFileTypeLabel(selectedFile.name),
        fileSize: formatFileSize(selectedFile.size),
        fileReference: mockFileRef,
        status: "Uploaded", // Always initial state; no fake analysis
      });

      setUploadedRecord(newRecord);
      setIsSuccess(true);
      setIsProcessing(false);
    } catch (err) {
      console.error("Upload error:", err);
      setFileError(err.message || "Failed to register manuscript.");
      setIsProcessing(false);
    }
  };

  const handleResetForNewUpload = () => {
    setIsSuccess(false);
    setUploadedRecord(null);
    setSelectedFile(null);
    setFileError("");
    setExtractionResult(null);
    setExtractionError("");
    setIsExtracting(false);
    setResearchInfoResult(null);
    setResearchInfoError("");
    setIsExtractingResearchInfo(false);
    setAbstract("");
    setKeywords("");
    if (currentProject) {
      setManuscriptTitle(currentProject.title);
      setVersionName(getNextVersionLabel(currentProject.id));
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
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-900/30 transition-all"
          >
            {icons.upload({ className: "h-4.5 w-4.5 text-white" })}
            <span>Upload Manuscript</span>
          </Link>

          <Link
            to="/student/submissions"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.manuscripts({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Manuscripts</span>
          </Link>

          <Link
            to="/student/literature"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.literature({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Literature Corpus</span>
          </Link>

          <Link
            to="/student/gap-analysis"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.gapAnalysis({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Gap Analysis</span>
          </Link>

          <Link
            to="/student/contribution-analysis"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.contributionAnalysis({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Contribution Analysis</span>
          </Link>

          <Link
            to="/student/knowledge-graph"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            {icons.knowledgeGraph({ className: "h-4.5 w-4.5 text-slate-400" })}
            <span>Knowledge Graph</span>
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
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Upload Research Manuscript</h1>
                <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 text-xs font-semibold">
                  Manuscript Workspace
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Associate draft manuscripts with registered Research Projects for GapGuard AI analysis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/student/dashboard"
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              Back to Dashboard
            </Link>
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
            <span className="font-semibold text-slate-800">Upload Manuscript</span>
          </div>

          {/* Error Banner */}
          {fileError && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs font-semibold text-rose-900 flex items-center justify-between shadow-xs animate-in fade-in duration-150">
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

          {/* ---------------- SUCCESS VIEW ---------------- */}
          {isSuccess && uploadedRecord ? (
            <div className="rounded-2xl border border-emerald-200 bg-white p-6 sm:p-8 shadow-md space-y-6 animate-in zoom-in-95 duration-200">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  {icons.checkCircle({ className: "h-7 w-7" })}
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Registration Confirmed
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">
                    Manuscript Successfully Uploaded
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Your manuscript has been registered to the Research Project and staged for literature gap
                    evaluation.
                  </p>
                </div>
              </div>

              {/* Upload Details Dossier Grid */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Associated Research Project
                    </span>
                    <p className="font-bold text-slate-900 mt-0.5">{uploadedRecord.projectTitle}</p>
                    <span className="inline-block mt-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded">
                      {uploadedRecord.projectDomain}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Manuscript Version
                    </span>
                    <p className="font-bold text-slate-900 mt-0.5">{uploadedRecord.version}</p>
                    <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      Status: {uploadedRecord.status}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-200/60 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Document File
                    </span>
                    <p className="font-medium text-slate-800 truncate mt-0.5">{uploadedRecord.fileName}</p>
                    <span className="text-[11px] text-slate-500">
                      {uploadedRecord.fileType} • {uploadedRecord.fileSize}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Registration Timestamp
                    </span>
                    <p className="font-medium text-slate-800 mt-0.5">
                      {new Date(uploadedRecord.uploadedAt).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Manuscript ID
                    </span>
                    <p className="font-mono text-[11px] text-slate-600 mt-0.5">{uploadedRecord.id}</p>
                  </div>
                </div>
              </div>

              {/* Informational Architecture Callout */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs text-indigo-950 flex items-start gap-3">
                {icons.info({ className: "h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" })}
                <div className="leading-relaxed">
                  <span className="font-bold">Explainable Validation Notice:</span> Initial status is{" "}
                  <strong>Uploaded</strong>. No AI gap reasoning or literature synthesis has executed yet. In
                  subsequent phases, GapGuard AI will extract claims and cross-reference your claimed research gap
                  against peer-reviewed literature.
                </div>
              </div>

              {/* Document Processing Foundation Preview (File -> Text) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Document Processing Foundation
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                      Manuscript Plain Text Extraction Test
                    </h3>
                    <p className="text-xs text-slate-500">
                      Verify that GapGuard can parse and stream clean text from this uploaded manuscript ({uploadedRecord.fileType}).
                    </p>
                  </div>
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={handleExtractText}
                      disabled={isExtracting}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-white shadow-xs transition disabled:opacity-60"
                    >
                      {isExtracting ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Extracting Text...</span>
                        </>
                      ) : (
                        <>
                          {icons.fileDoc({ className: "h-4 w-4 text-emerald-400" })}
                          <span>Extract Text</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {extractionError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <strong className="font-semibold">Text Extraction Error:</strong> {extractionError}
                    </div>
                  </div>
                )}

                {extractionResult && (
                  <div className="rounded-xl border border-emerald-300 bg-white p-4.5 space-y-3 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                          Extracted Text Preview
                        </h4>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Status: Extraction Completed
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                        <span className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800">
                          <strong>{extractionResult.word_count.toLocaleString()}</strong> words
                        </span>
                        <span className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800">
                          <strong>{extractionResult.character_count.toLocaleString()}</strong> characters
                        </span>
                        <span className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800">
                          Format: <strong>{extractionResult.file_type}</strong>
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Raw document stream converted to plain text. No AI analysis, research gap detection, or literature matching executed.
                    </p>

                    <div className="rounded-lg border border-slate-800 bg-[#090D16] p-3.5 shadow-inner">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2 text-[10px] text-slate-400 font-mono">
                        <span>{extractionResult.file_name}</span>
                        <span>Plain Text Buffer Preview</span>
                      </div>
                      <pre className="max-h-60 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-200 whitespace-pre-wrap select-all">
                        {extractionResult.text}
                      </pre>
                    </div>

                    {/* Research Information Extraction Action */}
                    <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                          Research Information
                        </span>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Extract structured academic fields (Title, Problem, Claimed Gap, Objectives, Method, Metrics, Claims).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleExtractResearchInfo}
                        disabled={isExtractingResearchInfo}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition disabled:opacity-60"
                      >
                        {isExtractingResearchInfo ? (
                          <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>Extracting Research Information...</span>
                          </>
                        ) : (
                          <>
                            {icons.sparkles({ className: "h-4 w-4" })}
                            <span>Extract Research Information</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Research Information Extraction Error */}
                    {researchInfoError && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                        <div>
                          <strong className="font-semibold">Research Extraction Error:</strong> {researchInfoError}
                        </div>
                      </div>
                    )}

                    {/* Research Information Extraction Preview Card */}
                    {researchInfoResult && (
                      <ResearchInformationPreview result={researchInfoResult} />
                    )}
                  </div>
                )}
              </div>

              {/* Post-Upload Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetForNewUpload}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
                >
                  Upload Another Manuscript Version
                </button>

                <div className="flex items-center gap-3">
                  <Link
                    to={`/student/dashboard?highlight=${uploadedRecord.projectId}`}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition"
                  >
                    View Project in Dashboard
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* ---------------- UPLOAD FORM ---------------- */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Context Notice */}
              <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-slate-50 to-white p-5 shadow-xs">
                <div className="flex items-start gap-3.5">
                  <div className="rounded-xl bg-indigo-600 text-white p-2.5 flex-shrink-0 mt-0.5 shadow-xs">
                    {icons.upload({ className: "h-5 w-5" })}
                  </div>
                  <div className="text-xs leading-relaxed text-slate-700">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Research Project &amp; Manuscript Staging
                    </h3>
                    <p className="mt-1 text-slate-600">
                      Manuscripts must be associated with an existing Research Project. Every upload is versioned
                      (e.g., Initial Draft, Revised Draft) to preserve your research evolution without overwriting
                      historical versions.
                    </p>
                  </div>
                </div>
              </section>

              {/* ---------------- 1. SELECT RESEARCH PROJECT ---------------- */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      Step 1 of 4
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-1.5">Select Research Project</h2>
                  </div>
                  <Link
                    to="/student/projects/create"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    {icons.plus({ className: "h-3.5 w-3.5" })}
                    New Project
                  </Link>
                </div>

                {projectsList.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
                    <p className="text-xs font-semibold text-amber-900">
                      No research projects found. You must establish a Research Project before uploading a manuscript.
                    </p>
                    <Link
                      to="/student/projects/create"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                    >
                      {icons.plus({ className: "h-3.5 w-3.5" })}
                      Create Research Project First
                    </Link>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                        Target Research Project <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs font-medium"
                      >
                        {projectsList.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.title} — [{project.domain}]
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Manuscripts inherit problem formulations and claimed gaps from the selected research project.
                      </p>
                    </div>

                    {/* Project Anchor Summary Card */}
                    {currentProject && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 text-xs animate-in fade-in duration-150">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded text-[11px]">
                            {currentProject.domain}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {existingProjectManuscripts.length}{" "}
                            {existingProjectManuscripts.length === 1 ? "version" : "versions"} currently registered
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900">{currentProject.title}</h4>
                        {currentProject.claimedGap && (
                          <p className="text-[11px] text-slate-600 line-clamp-2">
                            <strong className="text-amber-950">Claimed Research Gap:</strong>{" "}
                            {currentProject.claimedGap}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ---------------- 2. MANUSCRIPT VERSION ---------------- */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Step 2 of 4
                  </span>
                  <h2 className="text-base font-bold text-slate-900 mt-1.5">Manuscript Version</h2>
                  <p className="text-xs text-slate-500">
                    Specify the draft iteration. Existing versions will be preserved for comparative revision tracking.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                      Version Label <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Version 1 — Initial Draft"
                      value={versionName}
                      onChange={(e) => setVersionName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Quick Suggestions
                    </label>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {["Version 1 — Initial Draft", "Version 2 — Revised Draft", "Version 3 — Final Draft"].map(
                        (preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setVersionName(preset)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition"
                          >
                            {preset}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ---------------- 3. FILE UPLOAD ---------------- */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Step 3 of 4
                  </span>
                  <h2 className="text-base font-bold text-slate-900 mt-1.5">Document File Upload</h2>
                  <p className="text-xs text-slate-500">
                    Upload your research manuscript in PDF, DOCX, or TXT format (max 15 MB).
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {!selectedFile ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                      isDragActive
                        ? "border-indigo-500 bg-indigo-50/50"
                        : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                      {icons.upload({ className: "h-6 w-6" })}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Drag &amp; drop manuscript file here, or{" "}
                      <span className="text-indigo-600 underline">browse files</span>
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Supported formats: <strong>.pdf</strong>, <strong>.docx</strong>, <strong>.txt</strong> (Up
                      to 15 MB)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                          {icons.fileDoc({ className: "h-5 w-5" })}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-900 truncate">{selectedFile.name}</p>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded">
                              {getFileTypeLabel(selectedFile.name)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">{formatFileSize(selectedFile.size)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                          title="Remove file"
                        >
                          {icons.trash({ className: "h-4 w-4" })}
                        </button>
                      </div>
                    </div>

                    {/* Text Extraction Foundation Test & Preview */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Text Extraction Foundation
                          </span>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Extract readable text from this {getFileTypeLabel(selectedFile.name)} before downstream processing.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleExtractText}
                          disabled={isExtracting}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-white shadow-xs transition disabled:opacity-60"
                        >
                          {isExtracting ? (
                            <>
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              <span>Extracting Text...</span>
                            </>
                          ) : (
                            <>
                              {icons.fileDoc({ className: "h-4 w-4 text-emerald-400" })}
                              <span>Extract Text</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Extraction Error Notice */}
                      {extractionError && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
                          <span className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                          <div>
                            <strong className="font-semibold">Text Extraction Error:</strong> {extractionError}
                          </div>
                        </div>
                      )}

                      {/* Extracted Text Preview Card */}
                      {extractionResult && (
                        <div className="rounded-xl border border-emerald-300 bg-white p-4.5 space-y-3 shadow-xs animate-in fade-in duration-200">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                                Extracted Text Preview
                              </h4>
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                Status: Extraction Completed
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                              <span className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800">
                                <strong>{extractionResult.word_count.toLocaleString()}</strong> words
                              </span>
                              <span className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800">
                                <strong>{extractionResult.character_count.toLocaleString()}</strong> characters
                              </span>
                              <span className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800">
                                Format: <strong>{extractionResult.file_type}</strong>
                              </span>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500">
                            Raw document text stream parsed cleanly. Paragraph boundaries preserved. This is a text extraction preview — no AI analysis, literature search, or research-gap detection has been performed.
                          </p>

                          <div className="rounded-lg border border-slate-800 bg-[#090D16] p-3.5 shadow-inner">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2 text-[10px] text-slate-400 font-mono">
                              <span>{extractionResult.file_name}</span>
                              <span>Plain Text Buffer Preview</span>
                            </div>
                            <pre className="max-h-56 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-200 whitespace-pre-wrap select-all">
                              {extractionResult.text}
                            </pre>
                          </div>

                          {/* Research Information Extraction Action */}
                          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                                Research Information
                              </span>
                              <p className="text-xs text-slate-600 mt-0.5">
                                Extract structured academic fields (Title, Problem, Claimed Gap, Objectives, Method, Metrics, Claims).
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleExtractResearchInfo}
                              disabled={isExtractingResearchInfo}
                              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition disabled:opacity-60"
                            >
                              {isExtractingResearchInfo ? (
                                <>
                                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  <span>Extracting Research Information...</span>
                                </>
                              ) : (
                                <>
                                  {icons.sparkles({ className: "h-4 w-4" })}
                                  <span>Extract Research Information</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Research Information Extraction Error */}
                          {researchInfoError && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
                              <span className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                              <div>
                                <strong className="font-semibold">Research Extraction Error:</strong> {researchInfoError}
                              </div>
                            </div>
                          )}

                          {/* Research Information Extraction Preview Card */}
                          {researchInfoResult && (
                            <ResearchInformationPreview result={researchInfoResult} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ---------------- 4. MANUSCRIPT METADATA ---------------- */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Step 4 of 4
                  </span>
                  <h2 className="text-base font-bold text-slate-900 mt-1.5">Manuscript Metadata</h2>
                  <p className="text-xs text-slate-500">Provide document titles and optional abstract / keywords.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Manuscript Title <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Deep Learning Based Crop Disease Detection in Resource-Constrained Edge Environments"
                    value={manuscriptTitle}
                    onChange={(e) => setManuscriptTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs font-medium"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Prefilled from the selected Research Project; adjust if this specific revision uses a refined
                    title.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Abstract <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Paste or summarize the manuscript abstract to expedite literature gap extraction..."
                    value={abstract}
                    onChange={(e) => setAbstract(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Keywords <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Attention Mechanism, Vision Transformer, Crop Pathology, Edge Inference"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Comma-separated domain keywords.</p>
                </div>
              </div>

              {/* ---------------- SUBMIT ACTION BAR ---------------- */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>
                    Initial status will be registered as <strong>Uploaded</strong>.
                  </span>
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
                    disabled={isProcessing || !selectedFile || projectsList.length === 0}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-950/20 transition disabled:opacity-70 text-center"
                  >
                    {isProcessing ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Registering Manuscript...
                      </>
                    ) : (
                      <>
                        {icons.upload({ className: "h-4 w-4" })}
                        Upload Manuscript
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}