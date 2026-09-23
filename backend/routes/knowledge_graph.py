"""
GapGuard AI — Research Knowledge Graph & Search API Endpoints

Provides REST endpoints to:
1. Build and retrieve the research knowledge graph for a research project (GET / POST).
2. Execute explainable AI search algorithms (BFS, DFS, Best-First Search) across graph concepts.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from services.research_graph import (
    ResearchKnowledgeGraphService,
    research_graph_service,
    CORPUS_LIMITATION_STATEMENT,
)
from services.graph_search import (
    GraphSearchService,
    graph_search_service,
)

router = APIRouter(prefix="/api/knowledge-graph", tags=["Knowledge Graph"])

# Default project presets for preloaded demonstration
PRESET_PROJECTS = {
    "proj-01": {
        "id": "proj-01",
        "title": "Explainable Contrastive Learning for Multi-Modal Medical Diagnostics",
        "domain": "Healthcare AI & Bioinformatics",
        "research_problem": "Current clinical vision-language models produce opaque attribution maps, preventing radiologists from verifying if diagnoses stem from true pathology or spurious background artifacts.",
        "research_objective": "Develop an explainable cross-modal contrastive framework that aligns localized visual attention tokens directly with structured diagnostic ontology terms.",
        "research_question": "Can attention-aligned latent projection resolve clinical feature attribution opacity without sacrificing diagnostic sensitivity?",
        "claimed_research_gap": "Existing contrastive pretraining methods align global representation vectors without localized grounding, failing to guarantee token-level clinical interpretability across divergent radiographic modalities.",
        "proposed_method": "We introduce a dual-encoder architecture with a localized cross-attention attribution layer that projects patch-level image tokens onto concept-specific medical ontologies (RadLex/UMLS), supervised via a contrastive alignment loss.",
        "dataset_context": "MIMIC-CXR and CheXpert datasets containing 377,000+ chest radiographs paired with free-text radiological reports.",
        "expected_contribution": "A novel ontology-grounded cross-modal contrastive learning formulation providing pixel-level explainable attribution bounds with provable clinical alignment.",
        "evaluation_metrics": "Intersection-over-Union (IoU) with radiologist-annotated bounding boxes, Pointing Game accuracy, and AUROC across 14 thoracic pathologies.",
        "keywords": ["Explainable AI", "Contrastive Learning", "Medical Imaging", "Attribution Maps"],
    },
    "proj-02": {
        "id": "proj-02",
        "title": "Differential Privacy in Federated Knowledge Graph Embeddings",
        "domain": "Cybersecurity & Privacy-Preserving ML",
        "research_problem": "Decentralized knowledge graph completion algorithms risk membership inference attacks, exposing sensitive relationship links across participating edge nodes.",
        "research_objective": "Formulate an efficient differential privacy mechanism for asynchronous federated knowledge graph embedding updates.",
        "research_question": "What noise calibration bound preserves entity-relation transitivity while guaranteeing differential privacy?",
        "claimed_research_gap": "Prior privacy-preserving federated embedding techniques inject noise uniformly across all gradients, degrading entity ranking precision and destroying topological link semantics.",
        "proposed_method": "We propose Topology-Aware Gradient Perturbation (TAGP), which adaptively scales Laplacian noise inversely proportional to entity graph centrality while clipping relational gradient norms.",
        "dataset_context": "FB15k-237 and WN18RR benchmark knowledge graphs distributed across 50 simulated decentralized edge institutions.",
        "expected_contribution": "The first topology-adaptive differential privacy mechanism for federated relational embedding that maintains SOTA Hits@10 while satisfying strict privacy budgets.",
        "evaluation_metrics": "MRR, Hits@1, Hits@10, empirical privacy leakage under shadow-model attacks.",
        "keywords": ["Differential Privacy", "Federated Learning", "Knowledge Graphs", "Embedding"],
    },
    "proj-03": {
        "id": "proj-03",
        "title": "Zero-Shot Cross-Lingual Semantic Parsing for Low-Resource Dialects",
        "domain": "Natural Language Processing",
        "research_problem": "Semantic parsers perform poorly on low-resource indigenous language varieties where annotated logical form treebanks are nonexistent.",
        "research_objective": "Enable accurate logical form synthesis in low-resource target dialects without requiring target-language training utterances.",
        "research_question": "Can latent syntactic anchors align disparate dialect semantics onto invariant executable intermediate representations?",
        "claimed_research_gap": "State-of-the-art cross-lingual transfer models rely on high-resource pivot languages and exhibit significant syntactic drift when evaluated on dialectal varieties lacking parallel lexicons.",
        "proposed_method": "We propose a grammar-constrained variational cross-lingual autoencoder with dialect-invariant latent anchor tokens that decouples intent semantics from surface syntax.",
        "dataset_context": "MultiATIS++ and dialect-extended GeoQuery corpora covering 9 low-resource and vernacular regional languages.",
        "expected_contribution": "A dialect-invariant anchor representation that improves execution accuracy on zero-shot target dialects by 22.4% over multilingual transformer baselines.",
        "evaluation_metrics": "Exact Match Logical Form Accuracy, Execution Accuracy, and Cross-Lingual Semantic Drift Distance.",
        "keywords": ["Semantic Parsing", "Zero-Shot Learning", "Cross-Lingual", "Low-Resource NLP"],
    },
}


class ResearchInformationModel(BaseModel):
    title: Optional[str] = None
    domain: Optional[str] = None
    research_problem: Optional[str] = None
    research_objective: Optional[str] = None
    research_question: Optional[str] = None
    claimed_research_gap: Optional[str] = None
    proposed_method: Optional[str] = None
    dataset_context: Optional[str] = None
    expected_contribution: Optional[str] = None
    evaluation_metrics: Optional[str] = None
    keywords: Optional[List[str]] = None
    claims: Optional[List[str]] = None
    citations: Optional[List[str]] = None


class BuildGraphRequest(BaseModel):
    project_id: Optional[str] = None
    research_information: Optional[ResearchInformationModel] = None
    top_k: int = Field(5, ge=1, le=20)


class GraphSearchRequest(BaseModel):
    project_id: Optional[str] = None
    research_information: Optional[ResearchInformationModel] = None
    start_node: str = Field(..., description="ID of start node in knowledge graph")
    goal_node: str = Field(..., description="ID of goal node in knowledge graph")
    algorithm: str = Field("bfs", description="Search algorithm: bfs, dfs, or best_first")
    nodes: Optional[List[Dict[str, Any]]] = None
    edges: Optional[List[Dict[str, Any]]] = None


@router.get("/{project_id}")
async def get_project_knowledge_graph(
    project_id: str,
    top_k: int = Query(5, ge=1, le=20),
):
    """
    Build and return the deterministic knowledge graph for a given project ID.
    Reuses preset project formulation if present, or initializes default representation.
    """
    if not project_id or not project_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project ID must not be empty.",
        )

    clean_id = project_id.strip()
    project_data = PRESET_PROJECTS.get(clean_id)
    if not project_data:
        # Fallback to general project representation
        project_data = {
            "id": clean_id,
            "title": f"Research Study {clean_id}",
            "domain": "Computer Science & Engineering",
            "research_problem": "Addressing real-time computational constraints in specialized research environments.",
            "research_objective": "Develop an explainable and reliable automated baseline.",
            "claimed_research_gap": "Lack of empirical validation across diverse baseline conditions.",
            "proposed_method": "Deterministic feature extraction and comparative analysis framework.",
            "dataset_context": "Standard open benchmark datasets.",
            "expected_contribution": "A structured and explainable algorithmic formulation.",
            "evaluation_metrics": "Accuracy, precision, latency, and empirical stability.",
        }

    graph = research_graph_service.build_graph(
        project_data=project_data,
        top_k=top_k,
    )
    return graph


@router.post("/build")
async def build_knowledge_graph(request: BuildGraphRequest):
    """
    Build and return the deterministic knowledge graph from provided research information.
    """
    project_dict: Dict[str, Any] = {}

    if request.project_id and request.project_id in PRESET_PROJECTS:
        project_dict.update(PRESET_PROJECTS[request.project_id])

    if request.research_information:
        info_dict = request.research_information.dict(exclude_none=True)
        project_dict.update(info_dict)

    if not project_dict.get("title") and not project_dict.get("research_problem") and not request.project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either project_id or research_information with title/problem must be provided.",
        )

    if not project_dict.get("id"):
        project_dict["id"] = request.project_id or "custom_proj"

    graph = research_graph_service.build_graph(
        project_data=project_dict,
        top_k=request.top_k,
    )
    return graph


@router.post("/search")
async def execute_graph_search(request: GraphSearchRequest):
    """
    Execute BFS, DFS, or Best-First Search across the research knowledge graph.
    """
    start_node = request.start_node.strip() if request.start_node else ""
    goal_node = request.goal_node.strip() if request.goal_node else ""

    if not start_node or not goal_node:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both start_node and goal_node are required to run graph search.",
        )

    valid_algos = {"bfs", "dfs", "best_first", "best-first", "greedy"}
    if request.algorithm.lower().strip() not in valid_algos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported search algorithm '{request.algorithm}'. Supported: bfs, dfs, best_first.",
        )

    # Use provided nodes & edges, or build graph dynamically
    nodes = request.nodes
    edges = request.edges

    if not nodes or not edges:
        project_dict: Dict[str, Any] = {}
        if request.project_id and request.project_id in PRESET_PROJECTS:
            project_dict.update(PRESET_PROJECTS[request.project_id])
        if request.research_information:
            project_dict.update(request.research_information.dict(exclude_none=True))

        if not project_dict:
            # Default to proj-01 if unspecified
            project_dict = PRESET_PROJECTS["proj-01"]

        graph = research_graph_service.build_graph(project_data=project_dict, top_k=5)
        nodes = graph["nodes"]
        edges = graph["edges"]

    # Verify start and goal exist in the graph
    node_ids = {n["id"] for n in nodes}
    if start_node not in node_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Start node '{start_node}' not found in the current knowledge graph.",
        )
    if goal_node not in node_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal node '{goal_node}' not found in the current knowledge graph.",
        )

    try:
        search_result = graph_search_service.search(
            nodes=nodes,
            edges=edges,
            start_node_id=start_node,
            goal_node_id=goal_node,
            algorithm=request.algorithm,
        )
        search_result["corpus_limitation_statement"] = CORPUS_LIMITATION_STATEMENT
        return search_result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
