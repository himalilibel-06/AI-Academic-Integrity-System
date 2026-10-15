"""
GapGuard AI — Research Gap Contradiction Checker Service

Phase 6: Transparent, Rule-Based Evidence Relationship Reasoning.

IMPORTANT ARCHITECTURAL & ETHICAL INVARIANTS:
1. This module performs RULE-BASED EVIDENCE ANALYSIS over available corpus literature.
2. It does NOT make claims of global scientific novelty, truth, or gap invalidation.
3. Terminology strictly adheres to:
   - "Claimed Research Gap"
   - "Available Evidence"
   - "Retrieved Evidence"
   - "Evidence Relationship"
   - "Potentially Contradicted"
   - "Partially Supported"
   - "Supported by Available Evidence"
   - "Insufficient Evidence"
   - "Review Recommended"
   - "Based on Available Corpus"
4. NEVER asserts that student research is invalid, unoriginal, or copied.
5. All evidence statements are directly derived from actual corpus fields.
"""

import re
from typing import Any, Dict, List, Optional, Set, Tuple


CORPUS_LIMITATION_STATEMENT = (
    "This analysis is based only on the available literature corpus. "
    "It does not establish global research novelty, complete literature coverage, "
    "or scientific truth. Human academic review is required."
)

# Interpretable Classification Thresholds
CONTRIBUTION_CONTRADICTION_THRESHOLD = 0.45
CONTEXT_RELEVANCE_THRESHOLD = 0.20
LIMITATION_SUPPORT_THRESHOLD = 0.25
CONTRIBUTION_CEILING_FOR_SUPPORT = 0.40
WEAK_SIGNAL_THRESHOLD = 0.15

STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
    "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
    "during", "each", "few", "for", "from", "further", "had", "hadn't", "has",
    "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her",
    "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's",
    "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it",
    "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
    "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
    "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't",
    "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
    "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then",
    "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've",
    "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
    "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what",
    "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's",
    "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd",
    "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves",
    # Academic filler words
    "paper", "study", "propose", "method", "approach", "results", "analysis",
}


def _extract_text(value: Any) -> str:
    """Normalize plain text from raw string or structured research-info dictionaries."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        if "text" in value and value["text"]:
            return str(value["text"]).strip()
        if "items" in value and isinstance(value["items"], list):
            return " ".join([str(item).strip() for item in value["items"] if item])
    if isinstance(value, (list, tuple)):
        return " ".join([str(item).strip() for item in value if item])
    return str(value).strip()


def tokenize(text: str) -> Set[str]:
    """Extract normalized word tokens excluding short words and stopwords."""
    if not text:
        return set()
    raw_tokens = re.findall(r"[a-z0-9\-]+", text.lower())
    return {
        t for t in raw_tokens
        if len(t) > 2 and t not in STOPWORDS
    }


def compute_overlap(query_text: str, target_text: str) -> float:
    """
    Computes a normalized overlap score between 0.0 and 1.0.
    Uses a blend of asymmetric containment and harmonic token overlap (Dice).
    """
    q_tokens = tokenize(query_text)
    t_tokens = tokenize(target_text)

    if not q_tokens or not t_tokens:
        return 0.0

    common = q_tokens.intersection(t_tokens)
    if not common:
        return 0.0

    containment = len(common) / len(q_tokens)
    dice = (2.0 * len(common)) / (len(q_tokens) + len(t_tokens))

    # Balanced blend: containment ensures short specific queries match rich text,
    # while Dice penalizes overly divergent vocabularies.
    score = 0.65 * containment + 0.35 * dice
    return round(min(1.0, max(0.0, score)), 4)


class ResearchGapAnalyzer:
    """
    Deterministic rule-based research gap contradiction and support analyzer.
    Analyzes student research gap claims against retrieved literature evidence.
    """

    def analyze_paper_evidence(
        self,
        research_info: Dict[str, Any],
        paper: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Evaluate how a single retrieved paper relates to the student's claimed research gap.
        """
        claimed_gap = _extract_text(research_info.get("claimed_research_gap", ""))
        problem = _extract_text(research_info.get("research_problem", "")) or claimed_gap
        objective = _extract_text(research_info.get("research_objective", ""))
        proposed_method = _extract_text(research_info.get("proposed_method", ""))
        dataset_ctx = _extract_text(research_info.get("dataset_context", ""))
        contribution = _extract_text(research_info.get("expected_contribution", ""))

        paper_id = paper.get("paper_id", "UNKNOWN")
        paper_title = paper.get("title", "Untitled Research Paper")
        paper_problem = paper.get("research_problem", "")
        paper_method = paper.get("method", "")
        paper_dataset = paper.get("dataset", "")
        paper_contribution = paper.get("contribution", "")
        paper_limitations = paper.get("limitations", "")
        paper_abstract = paper.get("abstract", "")

        # 1. Problem overlap
        problem_target = f"{paper_problem} {paper_title}".strip()
        problem_overlap = max(
            compute_overlap(problem, problem_target),
            compute_overlap(f"{problem} {objective}".strip(), paper_abstract) * 0.85
        )

        # 2. Method overlap
        method_overlap = compute_overlap(proposed_method, paper_method) if proposed_method else 0.0

        # 3. Dataset / context overlap
        dataset_overlap = compute_overlap(dataset_ctx, paper_dataset) if dataset_ctx else 0.0

        # 4. Contribution overlap: does the paper report a contribution that directly addresses what student claims is missing?
        gap_and_contrib_query = f"{claimed_gap} {contribution}".strip() if contribution else claimed_gap
        contribution_overlap = max(
            compute_overlap(claimed_gap, paper_contribution),
            compute_overlap(gap_and_contrib_query, paper_contribution) * 0.90,
            compute_overlap(claimed_gap, paper_abstract) * 0.75
        )

        # 5. Limitation alignment: does the paper's stated limitation corroborate the student's claimed gap?
        limitation_alignment = compute_overlap(claimed_gap, paper_limitations) if paper_limitations else 0.0

        scores = {
            "problem_overlap": round(problem_overlap, 4),
            "method_overlap": round(method_overlap, 4),
            "dataset_overlap": round(dataset_overlap, 4),
            "contribution_overlap": round(contribution_overlap, 4),
            "limitation_alignment": round(limitation_alignment, 4),
        }

        # 6. Apply deterministic evidence relationship rules
        # Maximum signal
        max_signal = max(scores.values())

        evidence_relationship, reason, recommendation = self._classify_relationship(
            scores=scores,
            max_signal=max_signal,
            paper=paper,
            claimed_gap=claimed_gap,
        )

        # 7. Generate explainable evidence statements directly citing paper fields
        evidence_statements = self._generate_evidence_statements(
            scores=scores,
            paper=paper,
            evidence_relationship=evidence_relationship,
            claimed_gap=claimed_gap,
        )

        return {
            "paper_id": paper_id,
            "title": paper_title,
            "publication_year": paper.get("publication_year"),
            "similarity_score": paper.get("similarity_score", 0.0),
            "evidence_relationship": evidence_relationship,
            "scores": scores,
            "evidence": evidence_statements,
            "reason": reason,
            "recommendation": recommendation,
        }

    def _classify_relationship(
        self,
        scores: Dict[str, float],
        max_signal: float,
        paper: Dict[str, Any],
        claimed_gap: str = "",
    ) -> Tuple[str, str, str]:
        """
        Classifies relationship based on transparent, deterministic threshold rules.

        Deterministic Rules:
        1. Insufficient Evidence:
           Triggered if max_signal < WEAK_SIGNAL_THRESHOLD (0.15).
        2. Potentially Contradicted:
           Requires BOTH:
           - contribution_overlap >= CONTRIBUTION_CONTRADICTION_THRESHOLD (0.45)
           AND
           - has_context (problem_overlap >= 0.20 OR dataset_overlap >= 0.20 OR limitation_alignment >= 0.20).
           Lexical contribution overlap alone WITHOUT relevant research context NEVER qualifies.
        3. Supported by Available Evidence:
           Triggered IF:
           - limitation_alignment >= LIMITATION_SUPPORT_THRESHOLD (0.25)
           AND
           - contribution_overlap < CONTRIBUTION_CEILING_FOR_SUPPORT (0.40)
           AND
           - (problem_overlap >= 0.15 OR limitation_alignment >= 0.35)
        4. Partially Supported:
           Triggered IF:
           - problem_overlap >= CONTEXT_RELEVANCE_THRESHOLD (0.20)
           OR
           - limitation_alignment >= 0.15
           OR
           - (has_context AND contribution_overlap >= 0.20)
        5. Insufficient Evidence (Fallback):
           Triggered if contribution words exist without any domain or context relevance,
           or if signals remain below actionable thresholds.
        """
        c_overlap = scores["contribution_overlap"]
        l_align = scores["limitation_alignment"]
        p_overlap = scores["problem_overlap"]
        d_overlap = scores["dataset_overlap"]

        # Context relevance is established when the paper addresses the problem, dataset, or limitation context
        has_context = (
            p_overlap >= CONTEXT_RELEVANCE_THRESHOLD
            or d_overlap >= CONTEXT_RELEVANCE_THRESHOLD
            or l_align >= CONTEXT_RELEVANCE_THRESHOLD
        )

        # Rule 1: Insufficient Evidence
        if max_signal < WEAK_SIGNAL_THRESHOLD:
            return (
                "Insufficient Evidence",
                "The available corpus evidence does not contain sufficient topical or methodological overlap with the claimed research gap.",
                "Review broader literature or expand query terms to identify closer contextual evidence."
            )

        # Rule 2: Potentially Contradicted
        # Both high contribution overlap AND relevant research context are strictly required.
        # Similar words alone != Potential contradiction.
        if c_overlap >= CONTRIBUTION_CONTRADICTION_THRESHOLD and has_context:
            context_field = (
                f"research problem ('{paper.get('research_problem', '').strip()[:80]}...')" if p_overlap >= CONTEXT_RELEVANCE_THRESHOLD
                else f"dataset context ('{paper.get('dataset', '').strip()[:80]}...')" if d_overlap >= CONTEXT_RELEVANCE_THRESHOLD
                else f"stated limitations ('{paper.get('limitations', '').strip()[:80]}...')"
            )
            paper_contrib = paper.get("contribution", "").strip()
            gap_snippet = f" '{claimed_gap[:90]}...'" if claimed_gap else ""
            reason = (
                f"The paper reports a contribution addressing '{paper_contrib}', "
                f"which overlaps with the stated missing area{gap_snippet}. "
                f"The paper also addresses the related research context through its {context_field}."
            )
            recommendation = (
                "Review this paper and clarify how the proposed research differs or extends "
                "the existing work in scope, dataset, assumptions, or methodology."
            )
            return ("Potentially Contradicted", reason, recommendation)

        # Rule 3: Supported by Available Evidence
        # Evidence paper explicitly documents a limitation aligned with the student's claimed gap,
        # while its own contribution does not claim to have resolved it.
        if (
            l_align >= LIMITATION_SUPPORT_THRESHOLD
            and c_overlap < CONTRIBUTION_CEILING_FOR_SUPPORT
            and (p_overlap >= 0.15 or l_align >= 0.35)
        ):
            return (
                "Supported by Available Evidence",
                "The author's documented limitations in the available literature corroborate the need for research addressing this specific gap.",
                "Cite this paper as motivating literature that acknowledges this unresolved limitation."
            )

        # Rule 4: Partially Supported
        # Paper overlaps with the domain/problem or partially covers aspects of the gap within context,
        # leaving room for contribution differentiation.
        if (
            p_overlap >= CONTEXT_RELEVANCE_THRESHOLD
            or l_align >= 0.15
            or (has_context and c_overlap >= 0.20)
        ):
            return (
                "Partially Supported",
                "The available paper addresses a related problem context or partial subset of the claimed gap, leaving differentiation possible.",
                "Examine the specific scope and assumptions of this paper to delineate your contribution boundaries."
            )

        # Fallback default: Insufficient Evidence
        # (e.g. high contribution lexical overlap without any problem/dataset/limitation context)
        return (
            "Insufficient Evidence",
            "Available corpus fields do not provide conclusive contextual overlap with the claimed research gap.",
            "Review adjacent publications to assess literature coverage."
        )

    def _generate_evidence_statements(
        self,
        scores: Dict[str, float],
        paper: Dict[str, Any],
        evidence_relationship: str,
        claimed_gap: str = "",
    ) -> List[str]:
        """
        Generate grounded explainable evidence statements using only verified corpus fields.
        """
        statements: List[str] = []

        if evidence_relationship == "Potentially Contradicted":
            # 1. Overlapping contribution
            contrib_text = paper.get('contribution', '').strip()
            gap_snippet = f" '{claimed_gap[:90]}...'" if claimed_gap else ""
            statements.append(
                f"The paper reports a contribution addressing '{contrib_text}', "
                f"which overlaps with the stated missing area{gap_snippet}."
            )
            # 2 & 3. Contextual evidence and source field
            if scores["problem_overlap"] >= CONTEXT_RELEVANCE_THRESHOLD and paper.get("research_problem"):
                statements.append(
                    f"The paper also addresses the related research context through field 'research_problem': {paper['research_problem'].strip()}"
                )
            elif scores["dataset_overlap"] >= CONTEXT_RELEVANCE_THRESHOLD and paper.get("dataset"):
                statements.append(
                    f"The paper also addresses the related research context through field 'dataset': {paper['dataset'].strip()}"
                )
            elif scores["limitation_alignment"] >= CONTEXT_RELEVANCE_THRESHOLD and paper.get("limitations"):
                statements.append(
                    f"The paper also addresses the related research context through field 'limitations': {paper['limitations'].strip()}"
                )
            return statements

        # Problem field
        if scores["problem_overlap"] >= 0.15 and paper.get("research_problem"):
            statements.append(f"The paper addresses a related research problem: {paper['research_problem'].strip()}")

        # Contribution field
        if scores["contribution_overlap"] >= 0.20 and paper.get("contribution"):
            statements.append(f"The paper reports a relevant contribution: {paper['contribution'].strip()}")

        # Limitation field
        if scores["limitation_alignment"] >= 0.15 and paper.get("limitations"):
            statements.append(f"The paper explicitly notes an unresolved limitation: {paper['limitations'].strip()}")

        # Method field
        if scores["method_overlap"] >= 0.25 and paper.get("method"):
            statements.append(f"The paper investigates a comparable method: {paper['method'].strip()}")

        # Dataset field
        if scores["dataset_overlap"] >= 0.25 and paper.get("dataset"):
            statements.append(f"The paper evaluates on dataset context: {paper['dataset'].strip()}")

        # Fallback if no specific high overlap field was triggered
        if not statements:
            if evidence_relationship == "Insufficient Evidence":
                statements.append(
                    f"The paper focuses on '{paper.get('title', 'general domain topics')}', "
                    "showing low specific overlap with the claimed gap."
                )
            else:
                abstract_snip = paper.get("abstract", "")[:140]
                if abstract_snip:
                    statements.append(f"Paper summary context: {abstract_snip}...")

        return statements

    def analyze_gap(
        self,
        research_info: Dict[str, Any],
        evidence_papers: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Analyze a research gap claim across all retrieved evidence papers.
        Produces paper-level analyses and a transparent overall gap assessment.
        """
        claimed_gap = _extract_text(research_info.get("claimed_research_gap", ""))
        if not claimed_gap:
            raise ValueError("Claimed research gap is required for gap contradiction analysis.")

        if not evidence_papers:
            return {
                "overall_assessment": {
                    "status": "Insufficient Evidence",
                    "overall_status": "Insufficient Evidence",
                    "evidence_count": 0,
                    "supporting": 0,
                    "supporting_papers": 0,
                    "partial": 0,
                    "partial_papers": 0,
                    "potentially_contradicted": 0,
                    "potentially_contradicting_papers": 0,
                    "insufficient": 0,
                    "insufficient_papers": 0,
                },
                "claimed_research_gap": claimed_gap,
                "paper_analyses": [],
                "corpus_limitation": CORPUS_LIMITATION_STATEMENT,
            }

        paper_analyses: List[Dict[str, Any]] = []
        counts = {
            "Supported by Available Evidence": 0,
            "Partially Supported": 0,
            "Potentially Contradicted": 0,
            "Insufficient Evidence": 0,
        }

        for paper in evidence_papers:
            analysis = self.analyze_paper_evidence(research_info, paper)
            paper_analyses.append(analysis)
            rel = analysis["evidence_relationship"]
            if rel in counts:
                counts[rel] += 1
            else:
                counts["Insufficient Evidence"] += 1

        supporting = counts["Supported by Available Evidence"]
        partial = counts["Partially Supported"]
        contradicted = counts["Potentially Contradicted"]
        insufficient = counts["Insufficient Evidence"]
        total_evidence = len(paper_analyses)

        # Transparent overall status determination rules:
        # 1. Contradicted evidence present without supporting papers -> Potentially Contradicted
        # 2. Contradicted evidence present AND supporting papers present -> Partially Supported (mixed)
        # 3. No contradicted evidence AND at least one supporting paper -> Supported by Available Evidence
        # 4. Partial evidence only -> Partially Supported
        # 5. Otherwise (e.g. only insufficient evidence) -> Insufficient Evidence
        if contradicted > 0 and supporting == 0:
            overall_status = "Potentially Contradicted"
        elif contradicted > 0 and supporting > 0:
            overall_status = "Partially Supported"
        elif contradicted == 0 and supporting > 0:
            overall_status = "Supported by Available Evidence"
        elif partial > 0:
            overall_status = "Partially Supported"
        else:
            overall_status = "Insufficient Evidence"

        overall_assessment = {
            "status": overall_status,
            "overall_status": overall_status,
            "evidence_count": total_evidence,
            "supporting": supporting,
            "supporting_papers": supporting,
            "partial": partial,
            "partial_papers": partial,
            "potentially_contradicted": contradicted,
            "potentially_contradicting_papers": contradicted,
            "insufficient": insufficient,
            "insufficient_papers": insufficient,
        }

        return {
            "overall_assessment": overall_assessment,
            "claimed_research_gap": claimed_gap,
            "paper_analyses": paper_analyses,
            "corpus_limitation": CORPUS_LIMITATION_STATEMENT,
        }


# Module-level analyzer singleton
gap_analyzer = ResearchGapAnalyzer()
