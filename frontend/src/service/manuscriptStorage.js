/**
 * GapGuard AI — Manuscript Client Persistence Layer
 *
 * Manages research manuscript versions associated with Research Projects.
 * Strictly separates manuscript metadata from actual file storage.
 * Enforces initial status: "Uploaded" (no fake AI analysis).
 * Supports multi-version history per Research Project without overwriting.
 */

import { getResearchProjects, saveResearchProject } from "./projectStorage";

const STORAGE_KEY = "gapguard_manuscripts";

export const INITIAL_MANUSCRIPTS = [
  {
    id: "manu-01",
    projectId: "proj-01",
    manuscriptTitle: "Explainable Contrastive Learning for Multi-Modal Medical Diagnostics",
    version: "Version 1 — Initial Draft",
    abstract:
      "Vision-language models deployed in clinical workflows suffer from attribution opacity. We introduce an attention-aligned cross-modal contrastive framework connecting visual patch tokens with RadLex ontology terms.",
    keywords: "Contrastive Learning, Clinical Vision-Language, Attribution Maps, Radiography",
    fileName: "contrastive_medical_diagnostics_v1.pdf",
    fileType: "PDF",
    fileSize: "2.4 MB",
    fileReference: "local_blob://contrastive_medical_diagnostics_v1.pdf",
    uploadedAt: "2026-09-21T11:30:00.000Z",
    status: "Uploaded",
    researchInfo: {
      title: "Explainable Contrastive Learning for Multi-Modal Medical Diagnostics",
      abstract: "Vision-language models deployed in clinical workflows suffer from attribution opacity. We introduce an attention-aligned cross-modal contrastive framework connecting visual patch tokens with RadLex ontology terms.",
      keywords: ["Contrastive Learning", "Clinical Vision-Language", "Attribution Maps", "Radiography"],
      research_problem: "Clinical vision-language models lack verifiable patch-level explainability in diagnostic reasoning.",
      research_objective: "To align visual patch tokens with standardized ontological radiology concepts.",
      research_question: "Can cross-modal attention maps guarantee faithfulness to radiologist visual fixations?",
      claimed_research_gap: "Existing clinical multimodal architectures lack ontology-aligned token grounding under label noise.",
      proposed_method: "A contrastive attention alignment framework linking visual feature maps to RadLex terms.",
      dataset_context: "MIMIC-CXR and CheXpert chest radiography benchmark datasets.",
      expected_contribution: "An open benchmark evaluating grounding faithfulness across 10 common thoracic pathologies.",
      evaluation_metrics: ["accuracy", "f1-score", "auc-roc"],
      major_claims: [
        "Attribution alignment improves diagnostic interpretability by 24% without degrading predictive AUC.",
        "Ontology token grounding reduces false-positive pathology detections on out-of-distribution radiographs.",
        "Legacy gradient attribution maps fail radiologist fixation concordance tests."
      ],
      references: ["Vaswani et al., 2017", "Radford et al., 2021", "Rajpurkar et al., 2017"]
    },
  },
  {
    id: "manu-02",
    projectId: "proj-01",
    manuscriptTitle: "Explainable Contrastive Learning for Multi-Modal Medical Diagnostics (Revised)",
    version: "Version 2 — Revised Draft",
    abstract:
      "Extended ablation studies incorporating CheXpert benchmark evaluations and radiologist bounding box IoU validation.",
    keywords: "Contrastive Learning, CheXpert, Attention Grounding, Pathology Attribution",
    fileName: "contrastive_medical_diagnostics_v2_revised.docx",
    fileType: "DOCX",
    fileSize: "3.1 MB",
    fileReference: "local_blob://contrastive_medical_diagnostics_v2_revised.docx",
    uploadedAt: "2026-09-23T09:15:00.000Z",
    status: "Uploaded",
    researchInfo: {
      title: "Explainable Contrastive Learning for Multi-Modal Medical Diagnostics (Revised)",
      abstract: "Extended ablation studies incorporating CheXpert benchmark evaluations and radiologist bounding box IoU validation.",
      keywords: ["Contrastive Learning", "CheXpert", "Attention Grounding", "Pathology Attribution"],
      research_problem: "Clinical vision-language models lack verifiable patch-level explainability in diagnostic reasoning.",
      research_objective: "To align visual patch tokens with standardized ontological radiology concepts and validate against physician fixations.",
      research_question: "Can cross-modal attention maps guarantee faithfulness to radiologist visual fixations under extreme class imbalance?",
      claimed_research_gap: "Existing clinical multimodal architectures lack ontology-aligned token grounding under label noise and severe class imbalance.",
      proposed_method: "A contrastive attention alignment framework linking visual feature maps to RadLex terms with focal loss calibration.",
      dataset_context: "MIMIC-CXR, CheXpert, and PadChest radiography benchmark datasets.",
      expected_contribution: "An open benchmark evaluating grounding faithfulness across 14 common thoracic pathologies with clinical reader study.",
      evaluation_metrics: ["accuracy", "f1-score", "auc-roc", "iou"],
      major_claims: [
        "Attribution alignment improves diagnostic interpretability by 28% without degrading predictive AUC.",
        "Ontology token grounding reduces false-positive pathology detections on out-of-distribution radiographs.",
        "Focal contrastive alignment improves minority thoracic condition detection sensitivity by 12.4%."
      ],
      references: ["Vaswani et al., 2017", "Radford et al., 2021", "Rajpurkar et al., 2017", "Irvin et al., 2019"]
    },
  },
  {
    id: "manu-03",
    projectId: "proj-02",
    manuscriptTitle: "Differential Privacy in Federated Knowledge Graph Embeddings",
    version: "Version 1 — Initial Draft",
    abstract:
      "A topology-aware gradient perturbation mechanism for decentralized knowledge graph embedding under strict differential privacy budgets.",
    keywords: "Differential Privacy, Federated Learning, Knowledge Graphs, Membership Inference",
    fileName: "federated_kg_differential_privacy.pdf",
    fileType: "PDF",
    fileSize: "1.8 MB",
    fileReference: "local_blob://federated_kg_differential_privacy.pdf",
    uploadedAt: "2026-09-22T15:20:00.000Z",
    status: "Uploaded",
  },
  {
    id: "manu-04",
    projectId: "proj-03",
    manuscriptTitle: "Zero-Shot Cross-Lingual Semantic Parsing for Low-Resource Dialects",
    version: "Version 1 — Pre-Print Draft",
    abstract:
      "Grammar-constrained variational autoencoders with dialect-invariant latent anchor tokens for zero-shot logical form execution.",
    keywords: "Semantic Parsing, Cross-Lingual Transfer, Low-Resource NLP, Logical Forms",
    fileName: "cross_lingual_semantic_parsing_draft.txt",
    fileType: "TXT",
    fileSize: "840 KB",
    fileReference: "local_blob://cross_lingual_semantic_parsing_draft.txt",
    uploadedAt: "2026-09-20T14:45:00.000Z",
    status: "Uploaded",
  },
];

/**
 * Retrieve all registered manuscripts across all research projects.
 * Sorted by uploadedAt descending.
 */
export function getManuscripts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MANUSCRIPTS));
      return INITIAL_MANUSCRIPTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MANUSCRIPTS));
      return INITIAL_MANUSCRIPTS;
    }
    return parsed.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  } catch (err) {
    console.error("Error reading manuscripts from storage:", err);
    return INITIAL_MANUSCRIPTS;
  }
}

/**
 * Retrieve all manuscript versions for a specific Research Project.
 */
export function getManuscriptsByProject(projectId) {
  if (!projectId) return [];
  const manuscripts = getManuscripts();
  return manuscripts.filter((m) => m.projectId === projectId);
}

/**
 * Retrieve a single manuscript by ID.
 */
export function getManuscriptById(id) {
  const manuscripts = getManuscripts();
  return manuscripts.find((m) => m.id === id) || null;
}

/**
 * Helper to compute next suggested version label for a project.
 */
export function getNextVersionLabel(projectId) {
  const existing = getManuscriptsByProject(projectId);
  const count = existing.length;
  if (count === 0) return "Version 1 — Initial Draft";
  if (count === 1) return "Version 2 — Revised Draft";
  if (count === 2) return "Version 3 — Final Draft";
  return `Version ${count + 1}`;
}

/**
 * Save a new manuscript version to a Research Project.
 * Validates required associations and fields.
 * Does NOT claim cloud file storage or perform AI analysis.
 */
export function saveManuscript(data) {
  if (!data.projectId) {
    throw new Error("Research Project association is required. Select a research project.");
  }
  if (!data.manuscriptTitle || !data.manuscriptTitle.trim()) {
    throw new Error("Manuscript title is required.");
  }
  if (!data.fileName || !data.fileName.trim()) {
    throw new Error("A manuscript document file (PDF, DOCX, or TXT) must be selected.");
  }

  const now = new Date().toISOString();
  const id = `manu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const cleanManuscript = {
    id,
    projectId: data.projectId,
    projectTitle: data.projectTitle || "",
    projectDomain: data.projectDomain || "",
    manuscriptTitle: data.manuscriptTitle.trim(),
    version: data.version ? data.version.trim() : getNextVersionLabel(data.projectId),
    abstract: data.abstract ? data.abstract.trim() : "",
    keywords: data.keywords ? data.keywords.trim() : "",
    fileName: data.fileName.trim(),
    fileType: data.fileType || "PDF",
    fileSize: data.fileSize || "Unknown",
    fileReference: data.fileReference || `local_blob://${data.fileName.trim()}`,
    uploadedAt: now,
    status: "Uploaded", // Always initial state; no fake analysis
  };

  const all = getManuscripts();
  const updatedList = [cleanManuscript, ...all];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));

    // Also touch the associated Research Project's updatedAt timestamp
    try {
      const projects = getResearchProjects();
      const proj = projects.find((p) => p.id === data.projectId);
      if (proj) {
        saveResearchProject({
          ...proj,
          updatedAt: now,
        });
      }
    } catch {
      // Non-blocking project timestamp sync
    }
  } catch (err) {
    console.error("Error saving manuscript:", err);
    throw new Error("Unable to save manuscript metadata to browser storage. Check quota.");
  }

  return cleanManuscript;
}

/**
 * Delete a manuscript record by ID.
 */
export function deleteManuscript(id) {
  const all = getManuscripts();
  const updated = all.filter((m) => m.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Error deleting manuscript:", err);
  }
  return updated;
}

/**
 * Update an existing manuscript record with partial fields (e.g. extracted research info).
 */
export function updateManuscript(id, partialData) {
  const all = getManuscripts();
  const index = all.findIndex((m) => m.id === id);
  if (index === -1) {
    throw new Error(`Manuscript with ID ${id} not found.`);
  }

  const updated = {
    ...all[index],
    ...partialData,
  };
  all[index] = updated;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.error("Error updating manuscript:", err);
  }

  return updated;
}

