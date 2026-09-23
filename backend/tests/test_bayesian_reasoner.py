"""
GapGuard AI — Tests for Bayesian Evidence Reasoner

Verifies:
J. Posterior is calculated using actual Bayes calculation.
K. Strong supporting evidence changes posterior in the support direction.
L. Contradictory evidence changes posterior in the opposite direction.
M. Insufficient evidence does not create an unjustifiably strong posterior.
N. Posterior remains in [0,1].
O. Prior and likelihood values are exposed.
"""

import sys
from pathlib import Path
import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.bayesian_reasoner import (
    BayesianEvidenceReasonerService,
    bayesian_reasoner_service,
    CORPUS_LIMITATION_STATEMENT,
)


class TestBayesianReasonerService:
    """Test suite for discrete Bayesian Evidence Reasoning."""

    def test_j_posterior_is_calculated_using_actual_bayes_calculation(self):
        """Test J: Posterior matches exact mathematical Bayes theorem formulation."""
        # For prior = 0.50, strong_support has P(E|H) = 0.85, P(E|~H) = 0.15
        # P(E) = 0.85 * 0.50 + 0.15 * 0.50 = 0.50
        # P(H|E) = (0.85 * 0.50) / 0.50 = 0.85
        result = bayesian_reasoner_service.compute_posterior(
            evidence_category="strong_support",
            prior=0.50,
        )

        assert result["prior"] == 0.50
        assert result["likelihood"] == 0.85
        assert result["likelihood_not_h"] == 0.15
        assert result["marginal_probability"] == 0.50
        assert result["posterior"] == 0.85

        # With an asymmetric prior, e.g. prior = 0.30
        # P(E) = 0.85 * 0.30 + 0.15 * 0.70 = 0.255 + 0.105 = 0.36
        # P(H|E) = 0.255 / 0.36 = 0.7083
        result_asym = bayesian_reasoner_service.compute_posterior(
            evidence_category="strong_support",
            prior=0.30,
        )
        assert abs(result_asym["posterior"] - 0.7083) < 0.005

    def test_k_strong_supporting_evidence_increases_posterior(self):
        """Test K: Strong supporting evidence strictly increases posterior above prior."""
        prior = 0.50
        result = bayesian_reasoner_service.compute_posterior(
            evidence_category="strong_support",
            prior=prior,
        )

        assert result["posterior"] > prior
        assert result["posterior"] >= 0.80
        assert "strong support" in result["interpretation"].lower()

    def test_l_contradictory_evidence_decreases_posterior(self):
        """Test L: Contradictory evidence changes posterior in the opposite (negative) direction."""
        prior = 0.50
        result = bayesian_reasoner_service.compute_posterior(
            evidence_category="contradiction",
            prior=prior,
        )

        assert result["posterior"] < prior
        assert result["posterior"] <= 0.20
        assert "contradiction" in result["interpretation"].lower()

    def test_m_insufficient_evidence_does_not_create_unjustified_posterior(self):
        """Test M: Non-informative / insufficient evidence leaves posterior close to prior."""
        prior = 0.50
        result = bayesian_reasoner_service.compute_posterior(
            evidence_category="insufficient",
            prior=prior,
        )

        # For P(E|H)=0.50 and P(E|~H)=0.50, posterior equals prior exactly
        assert abs(result["posterior"] - prior) < 1e-4
        assert "non-informative" in result["interpretation"].lower()

    def test_n_posterior_strictly_remains_in_unit_interval(self):
        """Test N: Posterior probability is bounded strictly within [0.0, 1.0]."""
        priors = [0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99]
        categories = ["strong_support", "moderate_support", "mixed", "insufficient", "contradiction"]

        for p in priors:
            for cat in categories:
                res = bayesian_reasoner_service.compute_posterior(cat, prior=p)
                post = res["posterior"]
                assert 0.0 <= post <= 1.0, f"Posterior {post} out of bounds for prior {p}, category {cat}"

    def test_o_prior_and_likelihood_values_are_exposed(self):
        """Test O: Prior, likelihood, marginal, and corpus limitation statement are exposed."""
        result = bayesian_reasoner_service.compute_posterior("moderate_support", prior=0.60)

        assert "prior" in result
        assert "prior_not_h" in result
        assert "likelihood" in result
        assert "likelihood_not_h" in result
        assert "marginal_probability" in result
        assert "posterior" in result
        assert "interpretation" in result
        assert "corpus_limitation_statement" in result
        assert result["corpus_limitation_statement"] == CORPUS_LIMITATION_STATEMENT

    def test_audit_a_bayesian_output_explicitly_identifies_estimate_as_model_based(self):
        """Phase 9.1 Audit Test A: Output explicitly identifies posterior as a model-based estimate."""
        categories = ["strong_support", "moderate_support", "mixed", "insufficient", "contradiction"]
        for cat in categories:
            res = bayesian_reasoner_service.compute_posterior(cat, prior=0.50)
            interp = res["interpretation"].lower()
            assert "model-based" in interp, f"Category {cat} missing 'model-based' label in interpretation"
            assert res.get("is_model_based_estimate") is True

    def test_audit_b_bayesian_output_exposes_configured_prior_and_likelihood_assumptions(self):
        """Phase 9.1 Audit Test B: Output exposes configured prior, likelihoods, and assumption notice."""
        res = bayesian_reasoner_service.compute_posterior("strong_support", prior=0.45)

        assert res["prior"] == 0.45
        assert res["evidence_category"] == "strong_support"
        assert res["likelihood_p_e_given_h"] == 0.85
        assert res["likelihood_p_e_given_not_h"] == 0.15
        assert "assumption_notice" in res
        assert "not empirically learned" in res["assumption_notice"].lower()
        assert res.get("configured_assumptions_documented") is True

    def test_audit_c_no_output_claims_scientific_truth_or_global_novelty(self):
        """Phase 9.1 Audit Test C: Verifies that Bayesian output never asserts scientific truth or global novelty."""
        categories = ["strong_support", "moderate_support", "mixed", "insufficient", "contradiction"]
        forbidden_phrases = [
            "scientifically true",
            "scientific truth",
            "global novelty",
            "globally novel",
            "research gap is valid",
            "research gap is proven",
            "absolute truth",
            "guaranteed novel",
        ]

        for cat in categories:
            for p in [0.1, 0.5, 0.9]:
                res = bayesian_reasoner_service.compute_posterior(cat, prior=p)
                interp = res["interpretation"].lower()
                notice = res["assumption_notice"].lower()
                limitation = res["corpus_limitation_statement"].lower()

                # Verify disclaimer explicitly states it does NOT establish scientific truth / global novelty
                assert "does not establish" in limitation or "does not represent" in interp
                assert "does not represent scientific truth" in interp or "does not establish scientific truth" in limitation

                # Ensure it doesn't assert truth or novelty positively
                assert "probability that your research gap is valid" not in interp
                assert "probability that your research gap is true" not in interp

