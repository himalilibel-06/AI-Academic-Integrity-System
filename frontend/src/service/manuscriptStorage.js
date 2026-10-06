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

export const INITIAL_MANUSCRIPTS = [];

const FAKE_PROJECT_IDS = new Set(["proj-01", "proj-02", "proj-03"]);

/**
 * Retrieve all registered manuscripts across all research projects.
 * Filters out legacy demo manuscripts associated with removed fake projects.
 * Sorted by uploadedAt descending.
 */
export function getManuscripts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    // Filter out legacy fake manuscripts associated with removed fake projects
    const userManuscripts = parsed.filter(
      (m) => m && !FAKE_PROJECT_IDS.has(m.projectId) && !m.id?.startsWith("manu-0")
    );
    if (userManuscripts.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userManuscripts));
    }
    return userManuscripts.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  } catch (err) {
    console.error("Error reading manuscripts from storage:", err);
    return [];
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

