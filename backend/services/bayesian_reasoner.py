"""
GapGuard AI — Transparent Bayesian Evidence Reasoner

Phase 9: Implements a discrete, explainable Bayesian evidence model to calculate:
    P(Gap Supported | Available Evidence)
using signals produced by GapGuard's literature retrieval, gap analysis, and
contribution differentiation modules.

IMPORTANT ARCHITECTURAL & ETHICAL INVARIANT:
The posterior is a MODEL-BASED EVIDENCE ESTIMATE conditioned strictly on the
available local literature corpus. It does NOT assert the real-world scientific
truth or global novelty of the student's research hypothesis.
"""

from typing import Any, Dict, List, Optional


CORPUS_LIMITATION_STATEMENT = (
    "This Bayesian estimate reflects a model-based calculation conditioned strictly "
    "on the available local literature corpus. It does not establish scientific truth "
    "or global research novelty. Human academic peer review is required."
)

# ---------------------------------------------------------------------------
# DEVELOPER-FACING DOCUMENTATION: CONFIGURED LIKELIHOOD MODEL ASSUMPTIONS
# ---------------------------------------------------------------------------
# The conditional likelihood values P(E|H) and P(E|~H) below represent transparent,
# explicitly configured model assumptions for an educational evidence-reasoning layer.
#
# CRITICAL METHODOLOGICAL NOTES:
# 1. These values are NOT empirically learned or calibrated probabilities from a validated
#    scientific dataset. They are heuristic, domain-informed parameters chosen to model
#    how evidence categories (strong_support, moderate_support, mixed, insufficient, contradiction)
#    differentially corroborate or weaken research gap claims.
# 2. H denotes the proposition: "The claimed research gap is supported by the available corpus evidence."
#    ~H denotes the proposition: "The claimed research gap is unsupported or contradicted by available corpus evidence."
# 3. Bayes' Theorem is applied mathematically:
#        P(H|E) = [P(E|H) * P(H)] / [P(E|H)*P(H) + P(E|~H)*P(~H)]
# 4. The resulting posterior P(H|E) is strictly a MODEL-BASED ESTIMATE under these
#    configured assumptions and the available literature corpus. It does NOT assert
#    global novelty, guaranteed correctness, or scientific truth.
# ---------------------------------------------------------------------------
DEFAULT_LIKELIHOOD_TABLE: Dict[str, Dict[str, float]] = {
    "strong_support": {
        "P(E|H)": 0.85,
        "P(E|~H)": 0.15,
        "description": "Multiple papers report explicit limitations aligning with claimed gap, zero contradictions.",
    },
    "moderate_support": {
        "P(E|H)": 0.70,
        "P(E|~H)": 0.30,
        "description": "Some literature limitations align with claimed gap with low contribution collision.",
    },
    "mixed": {
        "P(E|H)": 0.40,
        "P(E|~H)": 0.50,
        "description": "Corpus contains both supporting limitation evidence and competing contribution overlap.",
    },
    "insufficient": {
        "P(E|H)": 0.50,
        "P(E|~H)": 0.50,
        "description": "Retrieved literature contains negligible signal; evidence remains non-informative.",
    },
    "contradiction": {
        "P(E|H)": 0.10,
        "P(E|~H)": 0.80,
        "description": "Substantial literature contribution addresses the gap within a closely matching context.",
    },
}


class BayesianEvidenceReasonerService:
    """
    Computes P(Gap Supported | Available Evidence) using Bayes' Theorem.
    """

    def __init__(self, likelihood_table: Optional[Dict[str, Dict[str, float]]] = None):
        self.likelihood_table = likelihood_table or DEFAULT_LIKELIHOOD_TABLE

    def classify_evidence_category(
        self,
        supporting_count: int,
        contradicting_count: int,
        partial_count: int = 0,
        total_papers: int = 0,
        max_limitation_alignment: float = 0.0,
        max_contribution_overlap: float = 0.0,
    ) -> str:
        """
        Deterministically maps GapGuard evidence signals into a discrete evidence category.
        """
        if total_papers == 0 or (supporting_count == 0 and contradicting_count == 0 and partial_count == 0):
            return "insufficient"

        if contradicting_count > 0 and supporting_count == 0:
            return "contradiction"

        if contradicting_count > 0 and supporting_count > 0:
            return "mixed"

        if supporting_count >= 2 and max_limitation_alignment >= 0.30 and max_contribution_overlap < 0.35:
            return "strong_support"

        if supporting_count >= 1 or partial_count > 0:
            return "moderate_support"

        return "insufficient"

    def compute_posterior(
        self,
        evidence_category: str,
        prior: float = 0.50,
        evidence_signals: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Applies Bayes' Theorem:
            P(H | E) = [ P(E | H) * P(H) ] / P(E)
        where:
            P(E) = P(E | H) * P(H) + P(E | ~H) * P(~H)

        Args:
            evidence_category: One of 'strong_support', 'moderate_support', 'mixed', 'insufficient', 'contradiction'.
            prior: Prior probability P(H). Default is 0.50 (neutral/uninformative prior).
            evidence_signals: Optional dictionary recording raw supporting numbers and overlap metrics.

        Returns:
            Dictionary with prior, likelihoods, marginal probability, posterior probability,
            and grounded interpretation.
        """
        # Clamp prior into (0, 1) bounds
        clamped_prior = max(0.01, min(0.99, float(prior)))
        prior_h = clamped_prior
        prior_not_h = round(1.0 - prior_h, 4)

        cat = (evidence_category or "insufficient").lower().strip()
        if cat not in self.likelihood_table:
            cat = "insufficient"

        lh_entry = self.likelihood_table[cat]
        p_e_given_h = lh_entry["P(E|H)"]
        p_e_given_not_h = lh_entry["P(E|~H)"]

        # Marginal probability: P(E)
        marginal_p_e = round(
            (p_e_given_h * prior_h) + (p_e_given_not_h * prior_not_h), 6
        )

        # Posterior probability: P(H | E)
        if marginal_p_e > 0:
            posterior = round((p_e_given_h * prior_h) / marginal_p_e, 4)
        else:
            posterior = prior_h

        # Ensure posterior is strictly in [0.0, 1.0]
        posterior = max(0.0, min(1.0, posterior))

        # Grounded Academic Interpretation
        assumption_guardrail = (
            "This is a model-based evidence estimate conditional on the configured prior "
            "and likelihood assumptions. It does not represent scientific truth or global research novelty."
        )

        if cat == "strong_support":
            interpretation = (
                f"Model-based posterior estimate: {posterior * 100:.1f}% under the configured evidence assumptions "
                f"(prior: {prior_h:.2f}, category: 'strong_support'). Corpus shows strong support: multiple literature limitations "
                f"align with the claimed gap with low contribution collision. {assumption_guardrail}"
            )
        elif cat == "moderate_support":
            interpretation = (
                f"Model-based posterior estimate: {posterior * 100:.1f}% under the configured evidence assumptions "
                f"(prior: {prior_h:.2f}, category: 'moderate_support'). Moderate support: partial literature limitations or "
                f"supportive context observed in the retrieved corpus. {assumption_guardrail}"
            )
        elif cat == "mixed":
            interpretation = (
                f"Model-based posterior estimate: {posterior * 100:.1f}% under the configured evidence assumptions "
                f"(prior: {prior_h:.2f}, category: 'mixed'). The available corpus presents mixed evidence with both supporting limitations "
                f"and competing contribution overlap, yielding an attenuated estimate. {assumption_guardrail}"
            )
        elif cat == "contradiction":
            interpretation = (
                f"Model-based posterior estimate: {posterior * 100:.1f}% under the configured evidence assumptions "
                f"(prior: {prior_h:.2f}, category: 'contradiction'). Available literature contributions demonstrate potential "
                f"overlap in a matching context, decreasing the posterior estimate. {assumption_guardrail}"
            )
        else:
            interpretation = (
                f"Model-based posterior estimate: {posterior * 100:.1f}% under the configured evidence assumptions "
                f"(prior: {prior_h:.2f}, category: 'insufficient'). Non-informative: retrieved literature contains negligible topical signal, "
                f"leaving the posterior near the baseline prior. {assumption_guardrail}"
            )

        return {
            "prior": prior_h,
            "prior_not_h": prior_not_h,
            "evidence_category": cat,
            "likelihood": p_e_given_h,
            "likelihood_not_h": p_e_given_not_h,
            "likelihood_p_e_given_h": p_e_given_h,
            "likelihood_p_e_given_not_h": p_e_given_not_h,
            "marginal_probability": marginal_p_e,
            "posterior": posterior,
            "is_model_based_estimate": True,
            "configured_assumptions_documented": True,
            "assumption_notice": (
                "Likelihood values are transparent configured model assumptions for an educational "
                "evidence-reasoning layer, not empirically learned probabilities from a validated scientific "
                "benchmark. The posterior represents a model-based estimate conditional on these assumptions "
                "and available corpus evidence, not scientific truth or global novelty."
            ),
            "evidence_signals": evidence_signals or {},
            "interpretation": interpretation,
            "corpus_limitation_statement": CORPUS_LIMITATION_STATEMENT,
        }

    def evaluate_from_analyses(
        self,
        gap_analysis: Optional[Dict[str, Any]] = None,
        contribution_analysis: Optional[Dict[str, Any]] = None,
        prior: float = 0.50,
    ) -> Dict[str, Any]:
        """
        Derives evidence category from Gap Analysis and Contribution Analysis summaries,
        then calculates the Bayesian posterior probability.
        """
        supporting_count = 0
        contradicting_count = 0
        partial_count = 0
        total_papers = 0
        max_limitation_alignment = 0.0
        max_contribution_overlap = 0.0

        if gap_analysis:
            summary = gap_analysis.get("evidence_summary") or gap_analysis.get("overall_assessment") or {}
            supporting_count = summary.get("supporting_count") or summary.get("supporting") or summary.get("supporting_papers") or 0
            contradicting_count = summary.get("potentially_contradicted_count") or summary.get("potentially_contradicted") or summary.get("potentially_contradicting_papers") or 0
            partial_count = summary.get("partially_supported_count") or summary.get("partial") or summary.get("partial_papers") or 0
            total_papers = summary.get("total_papers_analyzed") or summary.get("evidence_count") or len(gap_analysis.get("paper_analyses", [])) or 0

            # Find max limitation and contribution overlap from paper analyses
            for p in gap_analysis.get("paper_analyses", []):
                scores = p.get("scores", {})
                lim_score = scores.get("limitation_alignment_score", 0.0)
                con_score = scores.get("contribution_overlap_score", 0.0)
                if lim_score > max_limitation_alignment:
                    max_limitation_alignment = lim_score
                if con_score > max_contribution_overlap:
                    max_contribution_overlap = con_score

        if contribution_analysis:
            agg = contribution_analysis.get("aggregate_summary") or contribution_analysis.get("project_summary") or {}
            if total_papers == 0:
                total_papers = agg.get("total_papers_compared", 0)
            all_papers = contribution_analysis.get("paper_analyses", []) + contribution_analysis.get("paper_comparisons", [])
            for p in all_papers:
                scores = p.get("scores") or p.get("dimension_scores") or {}
                con_dim = scores.get("contribution_overlap", 0.0)
                if con_dim > max_contribution_overlap:
                    max_contribution_overlap = con_dim

        cat = self.classify_evidence_category(
            supporting_count=supporting_count,
            contradicting_count=contradicting_count,
            partial_count=partial_count,
            total_papers=total_papers,
            max_limitation_alignment=max_limitation_alignment,
            max_contribution_overlap=max_contribution_overlap,
        )

        signals = {
            "supporting_count": supporting_count,
            "contradicting_count": contradicting_count,
            "partial_count": partial_count,
            "total_papers_analyzed": total_papers,
            "max_limitation_alignment": round(max_limitation_alignment, 3),
            "max_contribution_overlap": round(max_contribution_overlap, 3),
        }

        return self.compute_posterior(
            evidence_category=cat,
            prior=prior,
            evidence_signals=signals,
        )


# Singleton service instance
bayesian_reasoner_service = BayesianEvidenceReasonerService()
