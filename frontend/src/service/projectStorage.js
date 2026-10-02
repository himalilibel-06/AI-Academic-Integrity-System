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

export const INITIAL_RESEARCH_PROJECTS = [
  {
    id: "proj-01",
    title: "Robust Deep Feature Attribution in Agricultural Disease Detection",
    domain: "Computer Vision",
    researchProblem:
      "Field-deployable crop disease models suffer from uninterpretable spatial attributions and high false-positive rates when tested outside laboratory image distributions.",
    researchObjective:
      "Develop edge-compatible Vision Transformer attribution alignment under severe illumination drift.",
    researchQuestion:
      "Can attention-aligned token pooling improve spatial attribution fidelity and reduce false positives under severe field illumination drift without inflating edge inference latency?",
    claimedGap:
      "Existing lightweight Vision Transformers fail to provide spatially calibrated feature attribution on underrepresented foliar crop diseases under variable field illumination.",
    proposedMethod:
      "Cross-attention attribution pooling with contrastive token alignment on edge hardware.",
    datasetContext:
      "PlantVillage and InFieldCrop-50K foliar disease benchmark datasets under variable field illumination.",
    expectedContribution:
      "A hierarchical token attribution alignment method with integrated post-training quantization, achieving calibrated pixel attribution maps while reducing model parameter footprint by 45%.",
    evaluationMetrics:
      "Attribution Intersection-over-Union (IoU), Top-1 Accuracy, Inference Latency (ms), Parameter Count.",
    createdAt: "2026-09-20T10:15:00.000Z",
    updatedAt: "2026-09-23T14:20:00.000Z",
    status: "Draft",
  },
  {
    id: "proj-02",
    title: "Differential Privacy in Federated Knowledge Graph Embeddings",
    domain: "Cybersecurity & Privacy-Preserving ML",
    researchProblem:
      "Decentralized knowledge graph completion algorithms risk membership inference attacks, exposing sensitive relationship links across participating edge nodes.",
    researchObjective:
      "Formulate an efficient differential privacy mechanism for asynchronous federated knowledge graph embedding updates.",
    researchQuestion:
      "What noise calibration bound preserves entity-relation transitivity while guaranteeing (epsilon, delta)-differential privacy?",
    claimedGap:
      "Prior privacy-preserving federated embedding techniques inject noise uniformly across all gradients, degrading entity ranking precision and destroying topological link semantics.",
    proposedMethod:
      "We propose Topology-Aware Gradient Perturbation (TAGP), which adaptively scales Laplacian noise inversely proportional to entity graph centrality while clipping relational gradient norms.",
    datasetContext:
      "FB15k-237 and WN18RR benchmark knowledge graphs distributed across 50 simulated decentralized edge institutions.",
    expectedContribution:
      "The first topology-adaptive differential privacy mechanism for federated relational embedding that maintains SOTA Hits@10 while satisfying strict privacy budgets.",
    evaluationMetrics:
      "MRR (Mean Reciprocal Rank), Hits@1, Hits@10, empirical privacy leakage under shadow-model membership inference attacks.",
    createdAt: "2026-09-21T09:30:00.000Z",
    updatedAt: "2026-09-22T16:45:00.000Z",
    status: "Draft",
  },
  {
    id: "proj-03",
    title: "Zero-Shot Cross-Lingual Semantic Parsing for Low-Resource Dialects",
    domain: "Natural Language Processing",
    researchProblem:
      "Semantic parsers perform poorly on low-resource indigenous language varieties where annotated logical form treebanks are nonexistent.",
    researchObjective:
      "Enable accurate logical form synthesis in low-resource target dialects without requiring target-language training utterances.",
    researchQuestion:
      "Can latent syntactic anchors align disparate dialect semantics onto invariant executable intermediate representations?",
    claimedGap:
      "State-of-the-art cross-lingual transfer models rely on high-resource pivot languages and exhibit significant syntactic drift when evaluated on dialectal varieties lacking parallel lexicons.",
    proposedMethod:
      "We propose a grammar-constrained variational cross-lingual autoencoder with dialect-invariant latent anchor tokens that decouples intent semantics from surface syntax.",
    datasetContext:
      "MultiATIS++ and dialect-extended GeoQuery corpora covering 9 low-resource and vernacular regional languages.",
    expectedContribution:
      "A dialect-invariant anchor representation that improves execution accuracy on zero-shot target dialects by 22.4% over multilingual transformer baselines.",
    evaluationMetrics:
      "Exact Match Logical Form Accuracy, Execution Accuracy, and Cross-Lingual Semantic Drift Distance.",
    createdAt: "2026-09-19T14:10:00.000Z",
    updatedAt: "2026-09-20T11:00:00.000Z",
    status: "Draft",
  },
];

/**
 * Retrieve all research projects from localStorage (or initialize with defaults).
 * Sorted by updatedAt descending.
 */
export function getResearchProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_RESEARCH_PROJECTS));
      return INITIAL_RESEARCH_PROJECTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_RESEARCH_PROJECTS));
      return INITIAL_RESEARCH_PROJECTS;
    }
    return parsed.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  } catch (err) {
    console.error("Error reading research projects from storage:", err);
    return INITIAL_RESEARCH_PROJECTS;
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
