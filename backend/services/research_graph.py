"""
GapGuard AI — Research Knowledge Graph Service

Constructs a deterministic, explainable in-memory research knowledge graph
representing core research concepts:
- Research Project
- Research Problem
- Research Objective
- Research Question
- Claimed Research Gap
- Proposed Method
- Dataset / Application Context
- Expected Contribution
- Evaluation Metric
- Research Claim
- Literature Paper
- Finding
- Limitation
- Citation / Reference

And explicit relationships:
- HAS_PROBLEM
- HAS_OBJECTIVE
- HAS_QUESTION
- HAS_GAP
- PROPOSES
- USES_METHOD
- USES_DATASET
- HAS_CONTRIBUTION
- EVALUATED_BY
- SUPPORTED_BY
- CONTRADICTED_BY
- SIMILAR_TO
- HAS_LIMITATION
- HAS_CITATION

IMPORTANT INVARIANT:
This graph is deterministic, explainable, and local. It does NOT use external
graph databases (e.g. Neo4j), dense vector embeddings, or LLM reasoning.
"""

import re
from typing import Any, Dict, List, Optional, Set, Tuple

from services.literature_corpus import literature_corpus
from services.literature_retrieval import literature_retriever


CORPUS_LIMITATION_STATEMENT = (
    "This research knowledge graph is constructed deterministically from the specified "
    "research project formulation and retrieved local literature-corpus records. It does not "
    "represent an exhaustive or complete representation of global scientific literature."
)

NODE_TYPES = {
    "RESEARCH_PROJECT": "Research Project",
    "RESEARCH_PROBLEM": "Research Problem",
    "RESEARCH_OBJECTIVE": "Research Objective",
    "RESEARCH_QUESTION": "Research Question",
    "CLAIMED_RESEARCH_GAP": "Claimed Research Gap",
    "PROPOSED_METHOD": "Proposed Method",
    "DATASET_CONTEXT": "Dataset / Application Context",
    "EXPECTED_CONTRIBUTION": "Expected Contribution",
    "EVALUATION_METRIC": "Evaluation Metric",
    "RESEARCH_CLAIM": "Research Claim",
    "LITERATURE_PAPER": "Literature Paper",
    "FINDING": "Finding",
    "LIMITATION": "Limitation",
    "CITATION_REFERENCE": "Citation / Reference",
}

RELATIONSHIP_TYPES = {
    "HAS_PROBLEM": "HAS_PROBLEM",
    "HAS_OBJECTIVE": "HAS_OBJECTIVE",
    "HAS_QUESTION": "HAS_QUESTION",
    "HAS_GAP": "HAS_GAP",
    "PROPOSES": "PROPOSES",
    "USES_METHOD": "USES_METHOD",
    "USES_DATASET": "USES_DATASET",
    "HAS_CONTRIBUTION": "HAS_CONTRIBUTION",
    "EVALUATED_BY": "EVALUATED_BY",
    "SUPPORTED_BY": "SUPPORTED_BY",
    "CONTRADICTED_BY": "CONTRADICTED_BY",
    "SIMILAR_TO": "SIMILAR_TO",
    "HAS_LIMITATION": "HAS_LIMITATION",
    "HAS_CITATION": "HAS_CITATION",
}

# Standard stop words for tokenization
STOPWORDS = {
    "the", "a", "an", "in", "on", "at", "for", "with", "about", "against", "between",
    "into", "through", "during", "before", "after", "above", "below", "to", "from",
    "up", "down", "is", "are", "was", "were", "be", "been", "being", "have", "has",
    "had", "do", "does", "did", "can", "could", "will", "would", "shall", "should",
    "and", "but", "if", "or", "because", "as", "until", "while", "this", "that",
    "these", "those", "we", "our", "us", "paper", "study", "propose", "method", "using",
}


def _tokenize(text: str) -> Set[str]:
    """Tokenize and remove stop words deterministically."""
    if not text:
        return set()
    tokens = re.findall(r"\b[a-zA-Z0-9_\-]{3,}\b", text.lower())
    return {t for t in tokens if t not in STOPWORDS}


def _lexical_overlap(text1: str, text2: str) -> float:
    """Calculate token-level Dice coefficient overlap score."""
    tokens1 = _tokenize(text1)
    tokens2 = _tokenize(text2)
    if not tokens1 or not tokens2:
        return 0.0
    common = tokens1.intersection(tokens2)
    return round((2.0 * len(common)) / (len(tokens1) + len(tokens2)), 4)


def _clean_id(raw_id: str) -> str:
    """Produce a safe, lowercase identifier with only alphanumeric and underscore."""
    if not raw_id:
        return "default"
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "_", str(raw_id).strip().lower())
    return re.sub(r"_+", "_", cleaned).strip("_") or "default"


class ResearchKnowledgeGraphService:
    """
    Deterministic Knowledge Graph builder for GapGuard AI research projects
    and retrieved literature papers.
    """

    def __init__(self):
        self.corpus_service = literature_corpus
        self.retriever = literature_retriever

    def build_graph(
        self,
        project_data: Dict[str, Any],
        literature_papers: Optional[List[Dict[str, Any]]] = None,
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """
        Build an in-memory knowledge graph from a research project and relevant literature papers.

        Args:
            project_data: Dictionary containing research project fields:
                title, domain, research_problem, research_objective, research_question,
                claimed_research_gap, proposed_method, dataset_context,
                expected_contribution, evaluation_metrics, keywords, claims, citations.
            literature_papers: Optional pre-retrieved papers. If None, top_k papers
                are retrieved using TF-IDF from the local corpus.
            top_k: Number of papers to retrieve if literature_papers is None.

        Returns:
            Dictionary with nodes, edges, statistics, and corpus limitation statement.
        """
        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []

        seen_node_ids: Set[str] = set()
        seen_edge_keys: Set[Tuple[str, str, str]] = set()

        def add_node(
            node_id: str,
            label: str,
            node_type: str,
            source: str = "project",
            attributes: Optional[Dict[str, Any]] = None,
        ) -> bool:
            if not node_id or node_id in seen_node_ids:
                return False
            seen_node_ids.add(node_id)
            nodes.append({
                "id": node_id,
                "label": label[:120] if label else node_type,
                "type": node_type,
                "source": source,
                "attributes": attributes or {},
            })
            return True

        def add_edge(
            source_id: str,
            target_id: str,
            relationship_type: str,
            label: Optional[str] = None,
            weight: float = 1.0,
            provenance: str = "project_formulation",
            attributes: Optional[Dict[str, Any]] = None,
        ) -> bool:
            if not source_id or not target_id:
                return False
            # Ensure both source and target nodes exist in the graph
            if source_id not in seen_node_ids or target_id not in seen_node_ids:
                return False

            edge_key = (source_id, target_id, relationship_type)
            if edge_key in seen_edge_keys:
                return False
            seen_edge_keys.add(edge_key)

            edge_id = f"edge_{source_id}_{target_id}_{relationship_type.lower()}"
            edges.append({
                "id": edge_id,
                "source": source_id,
                "target": target_id,
                "type": relationship_type,
                "label": label or relationship_type,
                "weight": round(weight, 3),
                "provenance": provenance,
                "attributes": attributes or {},
            })
            return True

        # -------------------------------------------------------------
        # 1. Build Research Project & Core Formulation Nodes
        # -------------------------------------------------------------
        raw_proj_id = project_data.get("id") or project_data.get("project_id") or "proj_1"
        clean_proj_id = _clean_id(raw_proj_id)
        proj_node_id = f"proj_{clean_proj_id}"

        proj_title = str(project_data.get("title") or "Research Project").strip()
        proj_domain = str(project_data.get("domain") or "General Research").strip()

        add_node(
            node_id=proj_node_id,
            label=proj_title,
            node_type=NODE_TYPES["RESEARCH_PROJECT"],
            source="student_project",
            attributes={
                "title": proj_title,
                "domain": proj_domain,
                "project_id": raw_proj_id,
            },
        )

        # 1a. Research Problem
        raw_problem = str(
            project_data.get("research_problem") or project_data.get("researchProblem") or ""
        ).strip()
        if raw_problem:
            prob_node_id = f"prob_{clean_proj_id}"
            add_node(
                node_id=prob_node_id,
                label=raw_problem[:100] + ("..." if len(raw_problem) > 100 else ""),
                node_type=NODE_TYPES["RESEARCH_PROBLEM"],
                source="student_project",
                attributes={"text": raw_problem},
            )
            add_edge(proj_node_id, prob_node_id, RELATIONSHIP_TYPES["HAS_PROBLEM"])

        # 1b. Research Objective
        raw_objective = str(
            project_data.get("research_objective") or project_data.get("researchObjective") or ""
        ).strip()
        if raw_objective:
            obj_node_id = f"obj_{clean_proj_id}"
            add_node(
                node_id=obj_node_id,
                label=raw_objective[:100] + ("..." if len(raw_objective) > 100 else ""),
                node_type=NODE_TYPES["RESEARCH_OBJECTIVE"],
                source="student_project",
                attributes={"text": raw_objective},
            )
            add_edge(proj_node_id, obj_node_id, RELATIONSHIP_TYPES["HAS_OBJECTIVE"])

        # 1c. Research Question
        raw_question = str(
            project_data.get("research_question") or project_data.get("researchQuestion") or ""
        ).strip()
        if raw_question:
            ques_node_id = f"ques_{clean_proj_id}"
            add_node(
                node_id=ques_node_id,
                label=raw_question[:100] + ("..." if len(raw_question) > 100 else ""),
                node_type=NODE_TYPES["RESEARCH_QUESTION"],
                source="student_project",
                attributes={"text": raw_question},
            )
            add_edge(proj_node_id, ques_node_id, RELATIONSHIP_TYPES["HAS_QUESTION"])

        # 1d. Claimed Research Gap
        raw_gap = str(
            project_data.get("claimed_research_gap")
            or project_data.get("claimedResearchGap")
            or project_data.get("claimedGap")
            or ""
        ).strip()
        if raw_gap:
            gap_node_id = f"gap_{clean_proj_id}"
            add_node(
                node_id=gap_node_id,
                label=raw_gap[:100] + ("..." if len(raw_gap) > 100 else ""),
                node_type=NODE_TYPES["CLAIMED_RESEARCH_GAP"],
                source="student_project",
                attributes={"text": raw_gap},
            )
            add_edge(proj_node_id, gap_node_id, RELATIONSHIP_TYPES["HAS_GAP"])

        # 1e. Proposed Method
        raw_method = str(
            project_data.get("proposed_method")
            or project_data.get("proposedMethod")
            or project_data.get("methodology")
            or ""
        ).strip()
        if raw_method:
            method_node_id = f"method_{clean_proj_id}"
            add_node(
                node_id=method_node_id,
                label=raw_method[:100] + ("..." if len(raw_method) > 100 else ""),
                node_type=NODE_TYPES["PROPOSED_METHOD"],
                source="student_project",
                attributes={"text": raw_method},
            )
            add_edge(proj_node_id, method_node_id, RELATIONSHIP_TYPES["USES_METHOD"])

        # 1f. Dataset Context
        raw_dataset = str(
            project_data.get("dataset_context")
            or project_data.get("datasetContext")
            or project_data.get("dataset")
            or ""
        ).strip()
        if raw_dataset:
            dataset_node_id = f"dataset_{clean_proj_id}"
            add_node(
                node_id=dataset_node_id,
                label=raw_dataset[:100] + ("..." if len(raw_dataset) > 100 else ""),
                node_type=NODE_TYPES["DATASET_CONTEXT"],
                source="student_project",
                attributes={"text": raw_dataset},
            )
            add_edge(proj_node_id, dataset_node_id, RELATIONSHIP_TYPES["USES_DATASET"])

        # 1g. Expected Contribution
        raw_contribution = str(
            project_data.get("expected_contribution")
            or project_data.get("expectedContribution")
            or ""
        ).strip()
        if raw_contribution:
            contrib_node_id = f"contrib_{clean_proj_id}"
            add_node(
                node_id=contrib_node_id,
                label=raw_contribution[:100] + ("..." if len(raw_contribution) > 100 else ""),
                node_type=NODE_TYPES["EXPECTED_CONTRIBUTION"],
                source="student_project",
                attributes={"text": raw_contribution},
            )
            add_edge(proj_node_id, contrib_node_id, RELATIONSHIP_TYPES["HAS_CONTRIBUTION"])

        # 1h. Evaluation Metrics
        raw_metrics = str(
            project_data.get("evaluation_metrics")
            or project_data.get("evaluationMetrics")
            or ""
        ).strip()
        if raw_metrics:
            eval_node_id = f"eval_{clean_proj_id}"
            add_node(
                node_id=eval_node_id,
                label=raw_metrics[:100] + ("..." if len(raw_metrics) > 100 else ""),
                node_type=NODE_TYPES["EVALUATION_METRIC"],
                source="student_project",
                attributes={"text": raw_metrics},
            )
            add_edge(proj_node_id, eval_node_id, RELATIONSHIP_TYPES["EVALUATED_BY"])

        # 1i. Optional Research Claims (e.g. from manuscript extraction)
        raw_claims = project_data.get("claims") or project_data.get("major_claims") or []
        if isinstance(raw_claims, list):
            for idx, claim in enumerate(raw_claims[:4]):
                claim_text = str(claim).strip()
                if claim_text:
                    claim_node_id = f"claim_{clean_proj_id}_{idx+1}"
                    add_node(
                        node_id=claim_node_id,
                        label=claim_text[:90] + ("..." if len(claim_text) > 90 else ""),
                        node_type=NODE_TYPES["RESEARCH_CLAIM"],
                        source="student_manuscript",
                        attributes={"text": claim_text},
                    )
                    add_edge(proj_node_id, claim_node_id, RELATIONSHIP_TYPES["PROPOSES"])

        # 1j. Optional Citations / References from project
        raw_citations = project_data.get("citations") or project_data.get("references") or []
        if isinstance(raw_citations, list):
            for idx, cite in enumerate(raw_citations[:4]):
                cite_text = str(cite).strip()
                if cite_text:
                    cite_node_id = f"cite_proj_{clean_proj_id}_{idx+1}"
                    add_node(
                        node_id=cite_node_id,
                        label=cite_text[:90] + ("..." if len(cite_text) > 90 else ""),
                        node_type=NODE_TYPES["CITATION_REFERENCE"],
                        source="student_manuscript",
                        attributes={"text": cite_text},
                    )
                    add_edge(proj_node_id, cite_node_id, RELATIONSHIP_TYPES["HAS_CITATION"])

        # -------------------------------------------------------------
        # 2. Retrieve & Build Literature Paper Nodes & Evidence
        # -------------------------------------------------------------
        papers_to_use = literature_papers
        if papers_to_use is None:
            # Query retrieval using available problem or contribution
            query_parts = [
                proj_title,
                raw_gap,
                raw_problem,
                raw_contribution,
                raw_method,
            ]
            query = " ".join([p for p in query_parts if p]).strip()
            if query:
                papers_to_use = self.retriever.retrieve(query=query, top_k=top_k)
            else:
                papers_to_use = self.corpus_service.get_all_papers()[:top_k]

        paper_count = 0
        for paper in papers_to_use:
            paper_id_raw = paper.get("paper_id") or f"P{paper_count+1}"
            paper_clean = _clean_id(paper_id_raw)
            lit_node_id = f"lit_{paper_clean}"

            paper_title = str(paper.get("title") or f"Literature Paper {paper_id_raw}").strip()
            pub_year = paper.get("publication_year")

            added = add_node(
                node_id=lit_node_id,
                label=paper_title[:90] + ("..." if len(paper_title) > 90 else ""),
                node_type=NODE_TYPES["LITERATURE_PAPER"],
                source="literature_corpus",
                attributes={
                    "paper_id": paper_id_raw,
                    "title": paper_title,
                    "publication_year": pub_year,
                    "abstract": paper.get("abstract", ""),
                    "keywords": paper.get("keywords", []),
                },
            )
            if added:
                paper_count += 1

            # 2a. Literature Finding (from contribution or findings)
            paper_contrib = str(paper.get("contribution") or "").strip()
            if paper_contrib:
                finding_id = f"finding_{paper_clean}"
                add_node(
                    node_id=finding_id,
                    label=paper_contrib[:90] + ("..." if len(paper_contrib) > 90 else ""),
                    node_type=NODE_TYPES["FINDING"],
                    source="literature_corpus",
                    attributes={"text": paper_contrib, "paper_id": paper_id_raw},
                )
                add_edge(lit_node_id, finding_id, RELATIONSHIP_TYPES["HAS_CONTRIBUTION"])

            # 2b. Literature Limitation
            paper_limit = str(paper.get("limitations") or "").strip()
            if paper_limit:
                limit_id = f"limit_{paper_clean}"
                add_node(
                    node_id=limit_id,
                    label=paper_limit[:90] + ("..." if len(paper_limit) > 90 else ""),
                    node_type=NODE_TYPES["LIMITATION"],
                    source="literature_corpus",
                    attributes={"text": paper_limit, "paper_id": paper_id_raw},
                )
                add_edge(lit_node_id, limit_id, RELATIONSHIP_TYPES["HAS_LIMITATION"])

            # 2c. Direct project reference edge
            add_edge(
                proj_node_id,
                lit_node_id,
                RELATIONSHIP_TYPES["HAS_CITATION"],
                label="RETRIEVED_EVIDENCE",
                weight=round(float(paper.get("similarity_score", 0.5)), 3),
                provenance="literature_retrieval",
            )

            # ---------------------------------------------------------
            # 3. Inter-Entity Conceptual Relationships (GapGuard Logic)
            # ---------------------------------------------------------
            # 3a. SUPPORTED_BY:
            # If claimed gap aligns with this paper's stated limitations:
            if raw_gap and paper_limit:
                gap_node_id = f"gap_{clean_proj_id}"
                limit_id = f"limit_{paper_clean}"
                overlap = _lexical_overlap(raw_gap, paper_limit)
                if overlap >= 0.12:
                    add_edge(
                        gap_node_id,
                        limit_id,
                        RELATIONSHIP_TYPES["SUPPORTED_BY"],
                        weight=overlap,
                        provenance="gap_limitation_alignment",
                    )
                # Also link gap to the literature paper itself if relevant
                if overlap >= 0.15:
                    add_edge(
                        gap_node_id,
                        lit_node_id,
                        RELATIONSHIP_TYPES["SUPPORTED_BY"],
                        weight=overlap,
                        provenance="gap_evidence_grounding",
                    )

            # 3b. CONTRADICTED_BY:
            # If claimed gap is already directly addressed by paper's contribution:
            if raw_gap and paper_contrib:
                gap_node_id = f"gap_{clean_proj_id}"
                c_overlap = _lexical_overlap(raw_gap, paper_contrib)
                if c_overlap >= 0.35:
                    add_edge(
                        gap_node_id,
                        lit_node_id,
                        RELATIONSHIP_TYPES["CONTRADICTED_BY"],
                        weight=c_overlap,
                        provenance="gap_contribution_collision",
                    )

            # 3c. SIMILAR_TO:
            # Method similarity between project proposed method and paper method
            paper_method = str(paper.get("method") or "").strip()
            if raw_method and paper_method:
                m_overlap = _lexical_overlap(raw_method, paper_method)
                if m_overlap >= 0.15:
                    method_node_id = f"method_{clean_proj_id}"
                    add_edge(
                        method_node_id,
                        lit_node_id,
                        RELATIONSHIP_TYPES["SIMILAR_TO"],
                        weight=m_overlap,
                        provenance="methodological_affinity",
                    )

            # Problem similarity between project problem and paper problem
            paper_prob = str(paper.get("research_problem") or "").strip()
            if raw_problem and paper_prob:
                p_overlap = _lexical_overlap(raw_problem, paper_prob)
                if p_overlap >= 0.15:
                    prob_node_id = f"prob_{clean_proj_id}"
                    add_edge(
                        prob_node_id,
                        lit_node_id,
                        RELATIONSHIP_TYPES["SIMILAR_TO"],
                        weight=p_overlap,
                        provenance="topical_affinity",
                    )

            # Contribution similarity between project expected contribution and paper contribution
            if raw_contribution and paper_contrib:
                c_sim = _lexical_overlap(raw_contribution, paper_contrib)
                if c_sim >= 0.20:
                    contrib_node_id = f"contrib_{clean_proj_id}"
                    finding_id = f"finding_{paper_clean}"
                    add_edge(
                        contrib_node_id,
                        finding_id,
                        RELATIONSHIP_TYPES["SIMILAR_TO"],
                        weight=c_sim,
                        provenance="contribution_comparison",
                    )

        # -------------------------------------------------------------
        # 4. Compute Graph Statistics
        # -------------------------------------------------------------
        node_types_dist: Dict[str, int] = {}
        for n in nodes:
            t = n["type"]
            node_types_dist[t] = node_types_dist.get(t, 0) + 1

        rel_types_dist: Dict[str, int] = {}
        for e in edges:
            t = e["type"]
            rel_types_dist[t] = rel_types_dist.get(t, 0) + 1

        statistics = {
            "node_count": len(nodes),
            "edge_count": len(edges),
            "paper_count": paper_count,
            "relationship_count": len(edges),
            "unique_relationship_types": len(rel_types_dist),
            "node_types_distribution": node_types_dist,
            "relationship_types_distribution": rel_types_dist,
        }

        return {
            "project_id": raw_proj_id,
            "project_title": proj_title,
            "nodes": nodes,
            "edges": edges,
            "statistics": statistics,
            "corpus_limitation_statement": CORPUS_LIMITATION_STATEMENT,
        }


# Singleton service instance
research_graph_service = ResearchKnowledgeGraphService()
