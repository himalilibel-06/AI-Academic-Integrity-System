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
    manuscriptTitle: "Robust Deep Feature Attribution in Agricultural Disease Detection",
    version: "Version 1 — Initial Draft",
    abstract:
      "Field-deployable crop disease models suffer from uninterpretable spatial attributions and high false-positive rates when tested outside laboratory image distributions. We introduce cross-attention attribution pooling for foliar disease identification on edge hardware.",
    keywords: "Vision Transformers, Feature Attribution, Plant Pathology, Edge AI, Model Interpretability",
    fileName: "feature_attribution_crop_disease_v1.pdf",
    fileType: "PDF",
    fileSize: "2.4 MB",
    fileReference: "local_blob://feature_attribution_crop_disease_v1.pdf",
    uploadedAt: "2026-09-21T11:30:00.000Z",
    status: "Uploaded",
    researchInfo: {
      title: "Robust Deep Feature Attribution in Agricultural Disease Detection",
      abstract: "Field-deployable crop disease models suffer from uninterpretable spatial attributions and high false-positive rates when tested outside laboratory image distributions. We introduce cross-attention attribution pooling for foliar disease identification on edge hardware.",
      keywords: ["Vision Transformers", "Feature Attribution", "Plant Pathology", "Edge AI"],
      research_problem: "Field-deployable crop disease models suffer from uninterpretable spatial attributions and high false-positive rates when tested outside laboratory image distributions.",
      research_objective: "Develop edge-compatible Vision Transformer attribution alignment under severe illumination drift.",
      research_question: "Can attention-aligned token pooling improve spatial attribution fidelity and reduce false positives under severe field illumination drift?",
      claimed_research_gap: "Existing lightweight Vision Transformers fail to provide spatially calibrated feature attribution on underrepresented foliar crop diseases under variable field illumination.",
      proposed_method: "Cross-attention attribution pooling with contrastive token alignment on edge hardware.",
      dataset_context: "PlantVillage benchmark dataset evaluated under simulated illumination variations.",
      expected_contribution: "A hierarchical token attribution alignment method achieving calibrated pixel attribution maps on edge hardware.",
      evaluation_metrics: ["accuracy", "iou", "latency_ms"],
      major_claims: [
        "Attribution alignment improves lesion localization interpretability without sacrificing predictive accuracy.",
        "Cross-attention pooling suppresses spurious background soil and leaf specular reflections.",
        "Standard Grad-CAM baselines produce diffuse attribution masks under intense direct sunlight."
      ],
      references: ["Vaswani et al., 2017", "Dosovitskiy et al., 2020", "Selvaraju et al., 2017"]
    },
  },
  {
    id: "manu-02",
    projectId: "proj-01",
    manuscriptTitle: "Robust Deep Feature Attribution in Agricultural Disease Detection (Revised)",
    version: "Version 2 — Revised Draft",
    abstract:
      "Revised draft incorporating 8-bit post-training quantization, Edge TPU latency validation, and cross-dataset testing on the InFieldCrop-50K benchmark under outdoor illumination shifts.",
    keywords: "Vision Transformers, Feature Attribution, Plant Pathology, Edge TPU, Model Quantization",
    fileName: "feature_attribution_crop_disease_v2_revised.docx",
    fileType: "DOCX",
    fileSize: "3.1 MB",
    fileReference: "local_blob://feature_attribution_crop_disease_v2_revised.docx",
    uploadedAt: "2026-09-23T09:15:00.000Z",
    status: "Uploaded",
    researchInfo: {
      title: "Robust Deep Feature Attribution in Agricultural Disease Detection (Revised)",
      abstract: "Revised draft incorporating 8-bit post-training quantization, Edge TPU latency validation, and cross-dataset testing on the InFieldCrop-50K benchmark under outdoor illumination shifts.",
      keywords: ["Vision Transformers", "Feature Attribution", "Plant Pathology", "Edge TPU", "Model Quantization"],
      research_problem: "Field-deployable crop disease models suffer from uninterpretable spatial attributions and high false-positive rates when tested outside laboratory image distributions.",
      research_objective: "Develop edge-compatible Vision Transformer attribution alignment with hardware quantization under severe illumination drift.",
      research_question: "Can attention-aligned token pooling combined with post-training quantization preserve spatial attribution fidelity on resource-constrained edge accelerators?",
      claimed_research_gap: "Existing lightweight Vision Transformers fail to provide spatially calibrated feature attribution on underrepresented foliar crop diseases under variable field illumination while maintaining edge inference budgets.",
      proposed_method: "Cross-attention attribution pooling with contrastive token alignment and 8-bit integer post-training quantization on edge TPU hardware.",
      dataset_context: "PlantVillage and InFieldCrop-50K foliar disease benchmark datasets under variable field illumination.",
      expected_contribution: "A hierarchical token attribution alignment method with integrated post-training quantization, achieving calibrated pixel attribution maps while reducing model parameter footprint by 45%.",
      evaluation_metrics: ["accuracy", "iou", "latency_ms", "parameter_count"],
      major_claims: [
        "Attribution alignment improves diagnostic interpretability by 24% without degrading predictive accuracy.",
        "Post-training token quantization reduces parameter footprint by 45% on mobile edge accelerators.",
        "Hierarchical token subsampling prevents attention collapse under severe field illumination variations."
      ],
      references: ["Vaswani et al., 2017", "Dosovitskiy et al., 2020", "Selvaraju et al., 2017", "Howard et al., 2019"]
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

