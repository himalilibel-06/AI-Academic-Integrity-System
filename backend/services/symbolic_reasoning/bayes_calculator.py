"""
LU IV — Concept 9: Bayes' Theorem

Implements exact Bayes' Theorem computations:
- Standard formulation: P(H | E) = [ P(E | H) * P(H) ] / P(E)
- Odds formulation: Posterior Odds = Prior Odds * Likelihood Ratio (Bayes Factor)
- Sequential multi-evidence Bayesian updating
- Grounded Demonstration: The Base Rate Fallacy in AI Plagiarism Detection
- Explanatory sensitivity & specificity breakdowns
"""

from typing import Any, Dict, List, Optional, Tuple


class BayesTheoremCalculator:
    """
    Precision Bayes' Theorem and Posterior Odds Calculator.
    """

    @staticmethod
    def calculate(
        prior: float,
        sensitivity: float,
        false_positive_rate: float,
        hypothesis_name: str = "Plagiarism Misconduct Present",
        evidence_name: str = "Detector Flags High Overlap",
    ) -> Dict[str, Any]:
        """
        Calculates exact Bayes' Theorem posterior:
            P(H | E) = [ P(E | H) * P(H) ] / [ P(E | H)*P(H) + P(E | ~H)*P(~H) ]

        Args:
            prior: P(H), prior probability of hypothesis (0.001 to 0.999).
            sensitivity: P(E | H), True Positive Rate.
            false_positive_rate: P(E | ~H), False Alarm Rate.
            hypothesis_name: Label for H.
            evidence_name: Label for E.
        """
        # Clamp inputs into valid open unit interval
        p_h = max(1e-5, min(1.0 - 1e-5, float(prior)))
        p_not_h = 1.0 - p_h
        p_e_given_h = max(0.0, min(1.0, float(sensitivity)))
        p_e_given_not_h = max(1e-6, min(1.0, float(false_positive_rate)))

        # Specificity: True Negative Rate P(~E | ~H)
        specificity = 1.0 - p_e_given_not_h

        # Likelihood terms
        numerator = p_e_given_h * p_h
        denom_false = p_e_given_not_h * p_not_h
        marginal_p_e = numerator + denom_false

        # Posterior probability
        if marginal_p_e > 0.0:
            posterior = numerator / marginal_p_e
        else:
            posterior = p_h

        # Odds Formulation & Bayes Factor (Likelihood Ratio)
        prior_odds = p_h / p_not_h
        bayes_factor = p_e_given_h / p_e_given_not_h
        posterior_odds = prior_odds * bayes_factor
        posterior_from_odds = posterior_odds / (1.0 + posterior_odds)

        # Base Rate Fallacy Diagnostic
        is_fallacy_risk = (p_h < 0.10) and (sensitivity >= 0.90) and (posterior < 0.70)
        fallacy_explanation = (
            f"Notice: Prior P(H)={p_h:.2%} is low. Despite {p_e_given_h:.1%} sensitivity, "
            f"the false alarm pool from the 95%+ honest population dilutes the posterior to {posterior:.1%}. "
            f"Human corroboration is essential."
            if is_fallacy_risk else
            "Posterior is balanced with the prior base rate."
        )

        return {
            "hypothesis": hypothesis_name,
            "evidence": evidence_name,
            "prior_P_H": round(p_h, 4),
            "prior_P_not_H": round(p_not_h, 4),
            "sensitivity_P_E_given_H": round(p_e_given_h, 4),
            "false_positive_rate_P_E_given_not_H": round(p_e_given_not_h, 4),
            "specificity_P_not_E_given_not_H": round(specificity, 4),
            "marginal_P_E": round(marginal_p_e, 6),
            "posterior_P_H_given_E": round(posterior, 4),
            "posterior_percentage": round(posterior * 100, 2),
            "prior_odds": round(prior_odds, 4),
            "bayes_factor_likelihood_ratio": round(bayes_factor, 4),
            "posterior_odds": round(posterior_odds, 4),
            "odds_verified": abs(posterior - posterior_from_odds) < 1e-4,
            "base_rate_fallacy_detected": is_fallacy_risk,
            "explanation": fallacy_explanation,
            "formula_derivation": (
                f"P(H|E) = ({p_e_given_h:.4f} * {p_h:.4f}) / "
                f"[({p_e_given_h:.4f} * {p_h:.4f}) + ({p_e_given_not_h:.4f} * {p_not_h:.4f})] "
                f"= {numerator:.6f} / {marginal_p_e:.6f} = {posterior:.4f}"
            ),
        }

    def sequential_update(
        self,
        initial_prior: float,
        evidence_sequence: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Performs sequential multi-evidence Bayesian updating:
        Each piece of evidence updates the posterior, which then becomes the prior
        for the subsequent observation.

        Args:
            initial_prior: Starting baseline belief P(H).
            evidence_sequence: List of dicts, each with keys:
                - name: str
                - P(E|H): float
                - P(E|~H): float
        """
        current_prior = max(1e-4, min(1.0 - 1e-4, float(initial_prior)))
        steps: List[Dict[str, Any]] = []

        for idx, ev in enumerate(evidence_sequence, start=1):
            p_e_h = float(ev.get("P(E|H)", 0.80))
            p_e_not_h = float(ev.get("P(E|~H)", 0.20))
            step_res = self.calculate(
                prior=current_prior,
                sensitivity=p_e_h,
                false_positive_rate=p_e_not_h,
                evidence_name=ev.get("name", f"Evidence {idx}"),
            )
            step_res["step_number"] = idx
            steps.append(step_res)
            current_prior = step_res["posterior_P_H_given_E"]

        return {
            "initial_prior": initial_prior,
            "final_posterior": current_prior,
            "final_percentage": round(current_prior * 100, 2),
            "total_evidence_steps": len(evidence_sequence),
            "update_steps": steps,
        }

    @classmethod
    def run_base_rate_fallacy_demo(cls) -> Dict[str, Any]:
        """
        Canonical academic demonstration:
        Detector accuracy: 95% TPR, 5% FPR.
        Low Base Rate: 5% of student papers in the department involve plagiarism.
        """
        return cls.calculate(
            prior=0.05,
            sensitivity=0.95,
            false_positive_rate=0.05,
            hypothesis_name="Actual Intentional Plagiarism",
            evidence_name="AI Plagiarism Detector Flags Positive",
        )
