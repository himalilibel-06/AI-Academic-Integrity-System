"""
GapGuard AI — Tests for Research Knowledge Graph Service

Verifies:
A. Project creates expected core nodes.
B. Literature papers become graph nodes.
C. Expected relationships are created.
D. Duplicate nodes/edges are avoided.
E. Empty/incomplete project data is handled safely.
F. Graph statistics match actual nodes/edges.
"""

import sys
from pathlib import Path
import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.research_graph import (
    ResearchKnowledgeGraphService,
    research_graph_service,
    NODE_TYPES,
    RELATIONSHIP_TYPES,
)


@pytest.fixture
def sample_project():
    return {
        "id": "test-proj-01",
        "title": "Explainable Contrastive Learning for Multi-Modal Medical Diagnostics",
        "domain": "Healthcare AI",
        "research_problem": "Clinical models produce opaque attribution maps that radiologists cannot verify.",
        "research_objective": "Develop an explainable cross-modal contrastive framework.",
        "research_question": "Can attention alignment resolve attribution opacity?",
        "claimed_research_gap": "Existing contrastive pretraining methods align global representation vectors without localized grounding.",
        "proposed_method": "Dual-encoder architecture with a localized cross-attention attribution layer.",
        "dataset_context": "MIMIC-CXR and CheXpert benchmark datasets.",
        "expected_contribution": "A novel ontology-grounded cross-modal contrastive learning formulation.",
        "evaluation_metrics": "Intersection-over-Union (IoU) and AUROC across pathologies.",
        "claims": ["Localization bounds guaranteed", "No performance penalty on classification"],
        "citations": ["Smith et al., Nature Medicine 2022", "Chen et al., CVPR 2023"],
    }


class TestKnowledgeGraphService:
    """Test suite for deterministic Research Knowledge Graph construction."""

    def test_a_project_creates_expected_core_nodes(self, sample_project):
        """Test A: Research project creates all expected core concept nodes."""
        graph = research_graph_service.build_graph(sample_project, top_k=2)

        node_types = {n["type"] for n in graph["nodes"]}
        node_ids = {n["id"] for n in graph["nodes"]}

        # Verify essential research project nodes exist
        assert NODE_TYPES["RESEARCH_PROJECT"] in node_types
        assert NODE_TYPES["RESEARCH_PROBLEM"] in node_types
        assert NODE_TYPES["RESEARCH_OBJECTIVE"] in node_types
        assert NODE_TYPES["RESEARCH_QUESTION"] in node_types
        assert NODE_TYPES["CLAIMED_RESEARCH_GAP"] in node_types
        assert NODE_TYPES["PROPOSED_METHOD"] in node_types
        assert NODE_TYPES["DATASET_CONTEXT"] in node_types
        assert NODE_TYPES["EXPECTED_CONTRIBUTION"] in node_types
        assert NODE_TYPES["EVALUATION_METRIC"] in node_types
        assert NODE_TYPES["RESEARCH_CLAIM"] in node_types
        assert NODE_TYPES["CITATION_REFERENCE"] in node_types

        assert "proj_test_proj_01" in node_ids
        assert "prob_test_proj_01" in node_ids
        assert "gap_test_proj_01" in node_ids
        assert "method_test_proj_01" in node_ids

    def test_b_literature_papers_become_graph_nodes(self, sample_project):
        """Test B: Retrieved literature papers become nodes with findings and limitations."""
        mock_papers = [
            {
                "paper_id": "P099",
                "title": "Visual Attention Mapping for Chest X-Rays",
                "publication_year": 2023,
                "research_problem": "Opaque attribution in medical imaging.",
                "method": "Grad-CAM attention rollout.",
                "dataset": "CheXpert dataset.",
                "contribution": "Evaluated gradient-weighted class activation mapping.",
                "limitations": "Suffers from low localization precision in dense opacity fields.",
            }
        ]
        graph = research_graph_service.build_graph(sample_project, literature_papers=mock_papers)

        node_ids = {n["id"] for n in graph["nodes"]}
        node_types = {n["type"] for n in graph["nodes"]}

        assert "lit_p099" in node_ids
        assert "finding_p099" in node_ids
        assert "limit_p099" in node_ids

        assert NODE_TYPES["LITERATURE_PAPER"] in node_types
        assert NODE_TYPES["FINDING"] in node_types
        assert NODE_TYPES["LIMITATION"] in node_types

    def test_c_expected_relationships_are_created(self, sample_project):
        """Test C: Expected typed relationships are created between core concepts."""
        mock_papers = [
            {
                "paper_id": "P088",
                "title": "Contrastive Pretraining without Grounding",
                "publication_year": 2022,
                "research_problem": "Lack of localized grounding in contrastive representation models.",
                "method": "Dual-encoder architecture with cross-attention.",
                "dataset": "MIMIC-CXR dataset.",
                "contribution": "Global representation alignment.",
                "limitations": "Existing contrastive pretraining methods align global representation vectors without localized grounding.",
            }
        ]
        graph = research_graph_service.build_graph(sample_project, literature_papers=mock_papers)

        edge_types = {e["type"] for e in graph["edges"]}

        # Core project formulation edges
        assert RELATIONSHIP_TYPES["HAS_PROBLEM"] in edge_types
        assert RELATIONSHIP_TYPES["HAS_OBJECTIVE"] in edge_types
        assert RELATIONSHIP_TYPES["HAS_QUESTION"] in edge_types
        assert RELATIONSHIP_TYPES["HAS_GAP"] in edge_types
        assert RELATIONSHIP_TYPES["USES_METHOD"] in edge_types
        assert RELATIONSHIP_TYPES["USES_DATASET"] in edge_types
        assert RELATIONSHIP_TYPES["HAS_CONTRIBUTION"] in edge_types
        assert RELATIONSHIP_TYPES["EVALUATED_BY"] in edge_types

        # Literature edges
        assert RELATIONSHIP_TYPES["HAS_LIMITATION"] in edge_types
        assert RELATIONSHIP_TYPES["HAS_CITATION"] in edge_types

        # Grounding / Alignment relationship
        # High overlap between sample_project's claimed_research_gap and paper limitation
        assert (
            RELATIONSHIP_TYPES["SUPPORTED_BY"] in edge_types
            or RELATIONSHIP_TYPES["SIMILAR_TO"] in edge_types
        )

    def test_d_duplicate_nodes_and_edges_are_avoided(self, sample_project):
        """Test D: Re-running or building with redundant records produces strictly unique nodes and edges."""
        graph = research_graph_service.build_graph(sample_project, top_k=3)

        node_ids = [n["id"] for n in graph["nodes"]]
        assert len(node_ids) == len(set(node_ids)), "Duplicate node IDs detected in knowledge graph!"

        edge_signatures = [(e["source"], e["target"], e["type"]) for e in graph["edges"]]
        assert len(edge_signatures) == len(set(edge_signatures)), "Duplicate edges detected in knowledge graph!"

    def test_e_empty_or_incomplete_project_data_handled_safely(self):
        """Test E: Empty/minimal project fields are handled gracefully without exceptions."""
        minimal_project = {"id": "min-01", "title": "Minimal Study"}
        graph = research_graph_service.build_graph(minimal_project, literature_papers=[])

        assert len(graph["nodes"]) >= 1
        assert graph["nodes"][0]["id"] == "proj_min_01"
        assert graph["statistics"]["node_count"] == len(graph["nodes"])
        assert graph["statistics"]["edge_count"] == 0

    def test_f_graph_statistics_match_actual_nodes_and_edges(self, sample_project):
        """Test F: Summary statistics accurately reflect the graph structure."""
        graph = research_graph_service.build_graph(sample_project, top_k=3)
        stats = graph["statistics"]

        assert stats["node_count"] == len(graph["nodes"])
        assert stats["edge_count"] == len(graph["edges"])
        assert stats["paper_count"] >= 1
        assert sum(stats["node_types_distribution"].values()) == len(graph["nodes"])
        assert sum(stats["relationship_types_distribution"].values()) == len(graph["edges"])
        assert "corpus_limitation_statement" in graph
