/**
 * GapGuard AI — Research Project Client Persistence Layer
 *
 * Manages research project records for GapGuard AI students/researchers.
 * Persists project problem formulations, claimed research gaps, objectives,
 * methodologies, and expected contributions using localStorage until backend
 * research project endpoints are introduced.
 */

const STORAGE_KEY = "gapguard_research_projects";

export const DOMAIN_OPTIONS = [
  "Machine Learning",
  "Natural Language Processing",
  "Computer Vision",
  "Deep Learning & Neural Architectures",
  "Healthcare AI & Bioinformatics",
  "Distributed Systems & Cloud Computing",
  "Cybersecurity & Privacy-Preserving ML",
  "Human-AI Interaction & Robotics",
  "Knowledge Graphs & Semantic Web",
  "Quantum Computing & Information Theory",
  "Software Engineering & Code Intelligence",
  "Information Retrieval & Search Systems",
];

export const INITIAL_RESEARCH_PROJECTS = [];

const FAKE_PROJECT_IDS = new Set(["proj-01", "proj-02", "proj-03"]);

/**
 * Retrieve all research projects from localStorage.
 * Filters out legacy hardcoded demo/seed projects while preserving genuine
 * user-created research projects.
 * Sorted by updatedAt descending.
 */
export function getResearchProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    // Filter out legacy hardcoded demo/seed projects while preserving real user projects
    const userProjects = parsed.filter((p) => p && !FAKE_PROJECT_IDS.has(p.id));
    if (userProjects.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userProjects));
    }
    return userProjects.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  } catch (err) {
    console.error("Error reading research projects from storage:", err);
    return [];
  }
}

/**
 * Retrieve a single research project by ID.
 */
export function getResearchProjectById(id) {
  const projects = getResearchProjects();
  return projects.find((p) => p.id === id) || null;
}

/**
 * Save a new or existing research project to localStorage.
 * Performs validation for required fields.
 */
export function saveResearchProject(projectData) {
  // Validate required fields
  const requiredFields = [
    { key: "title", label: "Research Project Title" },
    { key: "domain", label: "Research Domain" },
    { key: "researchProblem", label: "Research Problem" },
    { key: "researchObjective", label: "Research Objective" },
    { key: "claimedGap", label: "Claimed Research Gap" },
    { key: "proposedMethod", label: "Proposed Method" },
    { key: "expectedContribution", label: "Expected Contribution" },
  ];

  for (const field of requiredFields) {
    if (!projectData[field.key] || !projectData[field.key].toString().trim()) {
      throw new Error(`${field.label} is required.`);
    }
  }

  const now = new Date().toISOString();
  const projects = getResearchProjects();

  let targetId = projectData.id;
  const isNew = !targetId;

  if (isNew) {
    targetId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  const cleanProject = {
    id: targetId,
    title: projectData.title.trim(),
    domain: projectData.domain.trim(),
    researchProblem: projectData.researchProblem.trim(),
    researchObjective: projectData.researchObjective.trim(),
    researchQuestion: projectData.researchQuestion ? projectData.researchQuestion.trim() : "",
    claimedGap: projectData.claimedGap.trim(),
    proposedMethod: projectData.proposedMethod.trim(),
    datasetContext: projectData.datasetContext ? projectData.datasetContext.trim() : "",
    expectedContribution: projectData.expectedContribution.trim(),
    evaluationMetrics: projectData.evaluationMetrics ? projectData.evaluationMetrics.trim() : "",
    createdAt: projectData.createdAt || now,
    updatedAt: now,
    status: projectData.status || "Draft",
  };

  let updatedList;
  if (isNew) {
    updatedList = [cleanProject, ...projects];
  } else {
    updatedList = projects.map((p) => (p.id === targetId ? cleanProject : p));
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
  } catch (err) {
    console.error("Error saving research project to storage:", err);
    throw new Error("Unable to save research project to browser storage. Check storage quota.");
  }

  return cleanProject;
}

/**
 * Remove a research project by ID.
 */
export function deleteResearchProject(id) {
  const projects = getResearchProjects();
  const updatedList = projects.filter((p) => p.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
  } catch (err) {
    console.error("Error deleting research project:", err);
  }
  return updatedList;
}
