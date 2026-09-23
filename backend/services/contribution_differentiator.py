"""
GapGuard AI — Contribution Differentiation Engine Service

Phase 7: Deterministic, Explainable Contribution Differentiation Analysis.

Analyzes how differentiated a student's proposed research contribution is
relative to evidence papers retrieved from the local literature corpus.

IMPORTANT ARCHITECTURAL & ETHICAL INVARIANTS:
1. This module evaluates DIFFERENTIATION against the AVAILABLE literature corpus only.
2. It does NOT assert global novelty, truth, originality, or lack thereof.
3. Classifications strictly use:
   - "Clearly Differentiated"
   - "Partially Differentiated"
   - "Needs Clarification"
   - "Potential Overlap"
4. High contribution overlap ALONE never produces "Potential Overlap";
   meaningful contextual overlap (problem, method, dataset) is strictly required.
5. All explanations are grounded strictly in verified corpus fields without hallucination.
"""

from typing import Any, Dict, List, Optional, Set, Tuple

from services.gap_analyzer import (
    _extract_text,
    compute_overlap,
    tokenize,
    CORPUS_LIMITATION_STATEMENT,
)

# ---------------------------------------------------------
# Explicit Deterministic Threshold Constants
# ---------------------------------------------------------
HIGH_OVERLAP_THRESHOLD = 0.50          # Strong lexical and conceptual alignment
MODERATE_OVERLAP_THRESHOLD = 0.30      # Meaningful partial alignment
CONTEXT_OVERLAP_THRESHOLD = 0.25       # Minimum contextual relevance threshold
LOW_OVERLAP_THRESHOLD = 0.15           # Minor incidental token overlap
MIN_SUBSTANTIVE_WORDS = 3              # Minimum non-stopwords required for evaluation


class ContributionDifferentiatorService:
    """
    Deterministic rule-based Contribution Differentiation Engine.
    Compares student proposed contribution against corpus evidence papers across 6 dimensions.
    """

    def compute_dimension_scores(
        self,
        research_info: Dict[str, Any],
        paper: Dict[str, Any],
    ) -> Dict[str, float]:
        """
        Compute separate overlap scores for all six comparison dimensions:
        1. problem_overlap
        2. objective_overlap
        3. method_overlap
        4. dataset_overlap
        5. contribution_overlap
        6. evaluation_overlap
        """
        student_problem = _extract_text(research_info.get("research_problem", ""))
        student_objective = _extract_text(research_info.get("research_objective", ""))
        student_method = _extract_text(research_info.get("proposed_method", ""))
        student_dataset = _extract_text(research_info.get("dataset_context", "") or research_info.get("dataset", ""))
        student_contribution = _extract_text(research_info.get("expected_contribution", ""))
        student_eval = _extract_text(research_info.get("evaluation_metrics", ""))

        paper_title = paper.get("title", "")
        paper_problem = paper.get("research_problem", "")
        paper_method = paper.get("method", "")
        paper_dataset = paper.get("dataset", "")
        paper_contribution = paper.get("contribution", "")
        paper_abstract = paper.get("abstract", "")
        paper_limitations = paper.get("limitations", "")

        # 1. Problem Overlap
        problem_target = f"{paper_problem} {paper_title}".strip()
        problem_overlap = max(
            compute_overlap(student_problem, problem_target),
            compute_overlap(student_problem, paper_abstract) * 0.85
        ) if student_problem else 0.0

        # 2. Objective Overlap
        # Uses research_objective if present; fall back to research_problem/title
        obj_query = student_objective if student_objective else student_problem
        objective_overlap = max(
            compute_overlap(obj_query, f"{paper_title} {paper_abstract}"),
            compute_overlap(obj_query, paper_problem)
        ) if obj_query else 0.0

        # 3. Method Overlap
        method_target = f"{paper_method} {paper_abstract}".strip()
        method_overlap = max(
            compute_overlap(student_method, paper_method),
            compute_overlap(student_method, method_target) * 0.90
        ) if student_method else 0.0

        # 4. Dataset / Context Overlap
        dataset_overlap = compute_overlap(student_dataset, paper_dataset) if student_dataset else 0.0

        # 5. Contribution Overlap
        # Compares student's expected contribution with paper's contribution and abstract
        contrib_target = f"{paper_contribution} {paper_title}".strip()
        contribution_overlap = max(
            compute_overlap(student_contribution, paper_contribution),
            compute_overlap(student_contribution, contrib_target) * 0.90,
            compute_overlap(student_contribution, paper_abstract) * 0.75
        ) if student_contribution else 0.0

        # 6. Evaluation Overlap
        # Compares proposed evaluation metrics against paper's abstract, contribution, and limitations
        eval_target = f"{paper_abstract} {paper_contribution} {paper_limitations}".strip()
        evaluation_overlap = compute_overlap(student_eval, eval_target) if student_eval else 0.0

        return {
            "problem_overlap": round(problem_overlap, 4),
            "objective_overlap": round(objective_overlap, 4),
            "method_overlap": round(method_overlap, 4),
            "dataset_overlap": round(dataset_overlap, 4),
            "contribution_overlap": round(contribution_overlap, 4),
            "evaluation_overlap": round(evaluation_overlap, 4),
        }

    def classify_paper(
        self,
        scores: Dict[str, float],
        student_contribution: str,
        paper: Dict[str, Any],
    ) -> Tuple[str, List[str], str]:
        """
        Classifies relationship into one of four deterministic categories:
        - "Needs Clarification"
        - "Potential Overlap"
        - "Clearly Differentiated"
        - "Partially Differentiated"

        Returns: (classification, matched_dimensions, explanation)
        """
        # Identify matched dimensions with substantive overlap (>= 0.20)
        matched_dims = [
            dim for dim, score in scores.items()
            if score >= 0.20
        ]

        c_overlap = scores["contribution_overlap"]
        p_overlap = scores["problem_overlap"]
        m_overlap = scores["method_overlap"]
        d_overlap = scores["dataset_overlap"]
        e_overlap = scores["evaluation_overlap"]
        o_overlap = scores["objective_overlap"]

        # Check if student input is incomplete or ambiguous
        contrib_tokens = tokenize(student_contribution)
        if len(contrib_tokens) < MIN_SUBSTANTIVE_WORDS:
            explanation = (
                "The proposed contribution statement is too brief or incomplete to reliably assess "
                "differentiation against this paper. Further elaboration is recommended."
            )
            return ("Needs Clarification", matched_dims, explanation)

        # Contextual relevance requires meaningful alignment in problem, method, or dataset
        has_context = (
            p_overlap >= CONTEXT_OVERLAP_THRESHOLD
            or m_overlap >= CONTEXT_OVERLAP_THRESHOLD
            or d_overlap >= CONTEXT_OVERLAP_THRESHOLD
        )

        # Rule 1: Potential Overlap
        # Requires high contribution overlap AND strong contextual relevance
        # (Similar words alone != Potential Overlap)
        if c_overlap >= HIGH_OVERLAP_THRESHOLD and has_context:
            context_reasons = []
            if p_overlap >= CONTEXT_OVERLAP_THRESHOLD:
                context_reasons.append("similar research problem")
            if m_overlap >= CONTEXT_OVERLAP_THRESHOLD:
                context_reasons.append("comparable methodology")
            if d_overlap >= CONTEXT_OVERLAP_THRESHOLD:
                context_reasons.append("overlapping dataset context")

            context_str = ", ".join(context_reasons) if context_reasons else "shared research context"
            explanation = (
                f"Potential overlap is indicated because the proposed contribution shares key terms "
                f"with this paper ({round(c_overlap * 100)}% overlap), while also addressing a {context_str}. "
                "Review this paper to clarify boundaries and unique methodological aspects."
            )
            return ("Potential Overlap", matched_dims, explanation)

        # Rule 1B: Multi-dimensional convergence
        # If at least 3 core dimensions simultaneously exceed moderate overlap
        core_overlaps = [s >= 0.40 for s in (p_overlap, m_overlap, d_overlap, c_overlap)]
        if sum(core_overlaps) >= 3 and c_overlap >= 0.35:
            explanation = (
                "Potential overlap is indicated due to concurrent alignment across multiple dimensions "
                "(problem, methodology, and reported contribution). Clear differentiation in scope is advised."
            )
            return ("Potential Overlap", matched_dims, explanation)

        # Rule 2: Partially Differentiated
        # Meaningful overlap in some dimensions (problem, method, dataset, or contribution),
        # but clear differences in others.
        if (
            p_overlap >= CONTEXT_OVERLAP_THRESHOLD
            or m_overlap >= CONTEXT_OVERLAP_THRESHOLD
            or d_overlap >= CONTEXT_OVERLAP_THRESHOLD
            or c_overlap >= CONTEXT_OVERLAP_THRESHOLD
            or o_overlap >= CONTEXT_OVERLAP_THRESHOLD
        ):
            partial_factors = []
            if p_overlap >= CONTEXT_OVERLAP_THRESHOLD:
                partial_factors.append("addresses a similar research problem")
            if m_overlap >= CONTEXT_OVERLAP_THRESHOLD:
                partial_factors.append("employs related techniques")
            if d_overlap >= CONTEXT_OVERLAP_THRESHOLD:
                partial_factors.append("targets comparable data contexts")
            if c_overlap >= CONTEXT_OVERLAP_THRESHOLD:
                partial_factors.append("shares some contribution terminology")

            factors_str = "; ".join(partial_factors) if partial_factors else "contextual similarities"
            explanation = (
                f"The proposed research is partially differentiated: while it {factors_str}, "
                "it demonstrates divergence in other dimensions. Clarifying specific experimental differences is recommended."
            )
            return ("Partially Differentiated", matched_dims, explanation)

        # Rule 3: Clearly Differentiated
        # Low overlap across all evaluated dimensions
        explanation = (
            "The proposed contribution is clearly differentiated from this paper across all evaluated dimensions. "
            "The available literature evidence does not conflict with this project's stated direction."
        )
        return ("Clearly Differentiated", matched_dims, explanation)

    def generate_relevant_evidence(
        self,
        scores: Dict[str, float],
        paper: Dict[str, Any],
        classification: str,
    ) -> List[str]:
        """
        Generate grounded explainable evidence statements directly from actual corpus fields.
        """
        evidence: List[str] = []

        if paper.get("contribution") and scores["contribution_overlap"] >= 0.20:
            evidence.append(f"Reported paper contribution: {paper['contribution'].strip()}")

        if paper.get("research_problem") and scores["problem_overlap"] >= 0.20:
            evidence.append(f"Paper research problem: {paper['research_problem'].strip()}")

        if paper.get("method") and scores["method_overlap"] >= 0.20:
            evidence.append(f"Paper methodology: {paper['method'].strip()}")

        if paper.get("dataset") and scores["dataset_overlap"] >= 0.20:
            evidence.append(f"Paper dataset / context: {paper['dataset'].strip()}")

        if paper.get("limitations") and (scores["problem_overlap"] >= 0.20 or scores["contribution_overlap"] >= 0.20):
            evidence.append(f"Paper noted limitation: {paper['limitations'].strip()}")

        # Fallback if no specific high dimension was reached
        if not evidence:
            abstract_snip = paper.get("abstract", "")[:130]
            if abstract_snip:
                evidence.append(f"Paper overview: {abstract_snip}...")
            else:
                evidence.append(f"Paper title: {paper.get('title', 'Unknown paper')}")

        return evidence

    def analyze_paper(
        self,
        research_info: Dict[str, Any],
        paper: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Perform complete differentiation analysis for a single retrieved paper.
        """
        scores = self.compute_dimension_scores(research_info, paper)
        student_contrib = _extract_text(research_info.get("expected_contribution", ""))

        classification, matched_dims, explanation = self.classify_paper(
            scores=scores,
            student_contribution=student_contrib,
            paper=paper,
        )

        relevant_evidence = self.generate_relevant_evidence(
            scores=scores,
            paper=paper,
            classification=classification,
        )

        return {
            "paper_id": paper.get("paper_id", "UNKNOWN"),
            "title": paper.get("title", "Untitled Research Paper"),
            "publication_year": paper.get("publication_year"),
            "similarity_score": paper.get("similarity_score", 0.0),
            "scores": scores,
            "classification": classification,
            "matched_dimensions": matched_dims,
            "explanation": explanation,
            "relevant_corpus_evidence": relevant_evidence,
        }

    def analyze_project_differentiation(
        self,
        research_info: Dict[str, Any],
        evidence_papers: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Analyze differentiation across all retrieved evidence papers and produce
        project-level aggregate summary metrics.
        """
        student_contrib = _extract_text(research_info.get("expected_contribution", ""))
        student_problem = _extract_text(research_info.get("research_problem", ""))

        if not student_contrib and not student_problem:
            raise ValueError(
                "Either 'expected_contribution' or 'research_problem' must be provided "
                "to analyze research contribution differentiation."
            )

        total_compared = len(evidence_papers)
        if total_compared == 0:
            return {
                "project_summary": {
                    "total_papers_compared": 0,
                    "clearly_differentiated_count": 0,
                    "partially_differentiated_count": 0,
                    "needs_clarification_count": 0,
                    "potential_overlap_count": 0,
                    "highest_overlap_papers": [],
                    "strongest_overlapping_dimensions": [],
                    "summary_text": "No evidence papers retrieved from the local corpus to compare against.",
                },
                "proposed_contribution": student_contrib,
                "paper_analyses": [],
                "corpus_limitation": CORPUS_LIMITATION_STATEMENT,
            }

        paper_analyses: List[Dict[str, Any]] = []
        counts = {
            "Clearly Differentiated": 0,
            "Partially Differentiated": 0,
            "Needs Clarification": 0,
            "Potential Overlap": 0,
        }

        dimension_totals = {
            "problem_overlap": 0.0,
            "objective_overlap": 0.0,
            "method_overlap": 0.0,
            "dataset_overlap": 0.0,
            "contribution_overlap": 0.0,
            "evaluation_overlap": 0.0,
        }

        for paper in evidence_papers:
            analysis = self.analyze_paper(research_info, paper)
            paper_analyses.append(analysis)
            cls = analysis["classification"]
            if cls in counts:
                counts[cls] += 1
            else:
                counts["Partially Differentiated"] += 1

            for dim, score in analysis["scores"].items():
                if dim in dimension_totals:
                    dimension_totals[dim] += score

        # Compute strongest overlapping dimensions across the corpus
        strongest_dimensions = sorted(
            [
                {
                    "dimension": dim,
                    "average_score": round(total / total_compared, 4),
                }
                for dim, total in dimension_totals.items()
            ],
            key=lambda x: x["average_score"],
            reverse=True,
        )

        # Identify highest-overlap papers (by contribution + problem composite)
        highest_overlap = sorted(
            [
                {
                    "paper_id": p["paper_id"],
                    "title": p["title"],
                    "classification": p["classification"],
                    "contribution_overlap": p["scores"]["contribution_overlap"],
                    "composite_overlap": round(
                        (p["scores"]["contribution_overlap"] * 0.6) +
                        (p["scores"]["problem_overlap"] * 0.4),
                        4
                    ),
                }
                for p in paper_analyses
            ],
            key=lambda x: x["composite_overlap"],
            reverse=True,
        )[:3]

        # Generate academic neutral summary text
        c_diff = counts["Clearly Differentiated"]
        c_part = counts["Partially Differentiated"]
        c_over = counts["Potential Overlap"]
        c_clar = counts["Needs Clarification"]

        if c_over > 0:
            summary_text = (
                f"Potential overlap identified with {c_over} paper(s) in the available corpus. "
                f"Concurrently, {c_diff} paper(s) show clear differentiation and {c_part} show partial differentiation. "
                "Academic review is recommended to distinguish specific contribution boundaries."
            )
        elif c_diff >= (total_compared // 2):
            summary_text = (
                f"The proposed contribution is clearly differentiated from majority of compared corpus literature "
                f"({c_diff} of {total_compared} papers). {c_part} paper(s) share partial contextual overlap."
            )
        else:
            summary_text = (
                f"The proposed contribution demonstrates partial differentiation across the available corpus "
                f"({c_part} partially differentiated, {c_diff} clearly differentiated). "
                "Refining specific methodological differentiators is recommended."
            )

        project_summary = {
            "total_papers_compared": total_compared,
            "clearly_differentiated_count": c_diff,
            "partially_differentiated_count": c_part,
            "needs_clarification_count": c_clar,
            "potential_overlap_count": c_over,
            "highest_overlap_papers": highest_overlap,
            "strongest_overlapping_dimensions": strongest_dimensions,
            "summary_text": summary_text,
        }

        return {
            "project_summary": project_summary,
            "proposed_contribution": student_contrib,
            "paper_analyses": paper_analyses,
            "corpus_limitation": CORPUS_LIMITATION_STATEMENT,
        }


# Module singleton instance
contribution_differentiator = ContributionDifferentiatorService()
