"""
LU IV — Concept 6: Symbolic Reasoning Under Uncertainty (Certainty Factors)

Implements genuine Shortliffe / MYCIN Certainty Factor (CF) calculus:
- Measure of Belief MB(h, e) and Measure of Disbelief MD(h, e)
- CF = MB - MD in [-1.0, 1.0]
- Conjunction min() and Disjunction max() rules
- Rule propagation: CF(conclusion) = CF(rule) * max(0, CF(evidence))
- Classical MYCIN combination formulas for positive, negative, and mixed evidence
- Step-by-step mathematical combination trace
"""

from typing import Any, Dict, List, Optional, Tuple


class CertaintyFactorEngine:
    """
    MYCIN Certainty Factor (CF) Inference Engine.
    """

    @staticmethod
    def calculate_cf_from_belief(mb: float, md: float) -> float:
        """
        Computes CF = MB - MD.
        MB: Measure of Belief in [0.0, 1.0]
        MD: Measure of Disbelief in [0.0, 1.0]
        """
        clamped_mb = max(0.0, min(1.0, float(mb)))
        clamped_md = max(0.0, min(1.0, float(md)))
        return round(clamped_mb - clamped_md, 4)

    @staticmethod
    def combine_conjunction(evidence_cfs: List[float]) -> float:
        """
        Computes CF of conjunction E1 AND E2 AND ... En:
            CF(E1 AND E2) = min(CF(E1), CF(E2))
        """
        if not evidence_cfs:
            return 0.0
        return min(evidence_cfs)

    @staticmethod
    def combine_disjunction(evidence_cfs: List[float]) -> float:
        """
        Computes CF of disjunction E1 OR E2 OR ... En:
            CF(E1 OR E2) = max(CF(E1), CF(E2))
        """
        if not evidence_cfs:
            return 0.0
        return max(evidence_cfs)

    @staticmethod
    def apply_rule(rule_cf: float, evidence_cf: float) -> float:
        """
        Propagates certainty through an IF-THEN rule:
            CF(conclusion) = CF(rule) * max(0.0, CF(evidence))
        """
        eff_evidence = max(0.0, float(evidence_cf))
        return round(float(rule_cf) * eff_evidence, 4)

    @staticmethod
    def combine_pair(cf1: float, cf2: float) -> Tuple[float, str]:
        """
        Combines two independent certainty factors concluding the same hypothesis:
        Case 1: cf1 >= 0 and cf2 >= 0:
            CF_comb = cf1 + cf2 * (1 - cf1)
        Case 2: cf1 < 0 and cf2 < 0:
            CF_comb = cf1 + cf2 * (1 + cf1)
        Case 3: cf1 and cf2 have opposite signs:
            CF_comb = (cf1 + cf2) / (1 - min(|cf1|, |cf2|))
        """
        cf1 = max(-1.0, min(1.0, float(cf1)))
        cf2 = max(-1.0, min(1.0, float(cf2)))

        if cf1 >= 0 and cf2 >= 0:
            res = cf1 + cf2 * (1.0 - cf1)
            formula = f"Positive formula: {cf1:.4f} + {cf2:.4f} * (1 - {cf1:.4f}) = {res:.4f}"
            return round(res, 4), formula

        elif cf1 < 0 and cf2 < 0:
            res = cf1 + cf2 * (1.0 + cf1)
            formula = f"Negative formula: {cf1:.4f} + {cf2:.4f} * (1 + {cf1:.4f}) = {res:.4f}"
            return round(res, 4), formula

        else:
            # Opposite signs
            denom = 1.0 - min(abs(cf1), abs(cf2))
            if abs(denom) < 1e-9:
                # Direct contradiction (+1.0 and -1.0)
                return 0.0, f"Direct contradictory evidence extremes ({cf1:.2f}, {cf2:.2f}) canceled out to 0.0"
            res = (cf1 + cf2) / denom
            formula = f"Mixed signs formula: ({cf1:.4f} + {cf2:.4f}) / (1 - min(|{cf1:.4f}|, |{cf2:.4f}|)) = {res:.4f}"
            return round(res, 4), formula

    def combine_multiple(self, cf_list: List[float]) -> Dict[str, Any]:
        """
        Sequentially combines an arbitrary list of independent CFs for a hypothesis.
        Returns the final combined CF and step-by-step mathematical trace.
        """
        if not cf_list:
            return {
                "input_cfs": [],
                "combined_cf": 0.0,
                "confidence_percentage": 0.0,
                "interpretation": "No certainty factors provided (Uncertain).",
                "steps": [],
            }

        if len(cf_list) == 1:
            val = round(cf_list[0], 4)
            return {
                "input_cfs": cf_list,
                "combined_cf": val,
                "confidence_percentage": round(val * 100, 2),
                "interpretation": self._interpret_cf(val),
                "steps": [{"step": 1, "cf1": val, "cf2": 0.0, "resulting_cf": val, "formula": "Single input identity"}],
            }

        steps: List[Dict[str, Any]] = []
        current_cf = cf_list[0]

        for idx, next_cf in enumerate(cf_list[1:], start=2):
            prev_cf = current_cf
            current_cf, formula = self.combine_pair(current_cf, next_cf)
            steps.append({
                "step": idx - 1,
                "prior_cf": prev_cf,
                "added_cf": next_cf,
                "resulting_cf": current_cf,
                "formula": formula,
            })

        final_cf = max(-1.0, min(1.0, current_cf))
        return {
            "input_cfs": [round(c, 4) for c in cf_list],
            "combined_cf": final_cf,
            "confidence_percentage": round(final_cf * 100, 2),
            "interpretation": self._interpret_cf(final_cf),
            "steps": steps,
        }

    def evaluate_academic_plagiarism_signals(
        self,
        lexical_similarity_cf: float,
        citation_anomaly_cf: float,
        stylistic_variation_cf: float,
        author_disclaimer_cf: float = 0.0,
    ) -> Dict[str, Any]:
        """
        Real Academic Integrity Scenario:
        Combines 3 detection signals supporting plagiarism with an optional mitigating disclaimer.
        - Detector 1: N-Gram Jaccard Overlap (e.g. CF = +0.70)
        - Detector 2: Missing Citations Flag (e.g. CF = +0.60)
        - Detector 3: Stylistic / Sentence Embeddings Anomaly (e.g. CF = +0.40)
        - Mitigating Evidence: Author self-disclosure / thesis excerpt (e.g. CF = -0.50)
        """
        evidence_list = [lexical_similarity_cf, citation_anomaly_cf, stylistic_variation_cf]
        if author_disclaimer_cf != 0.0:
            evidence_list.append(author_disclaimer_cf)

        result = self.combine_multiple(evidence_list)
        result["scenario"] = "Academic Integrity Multi-Detector CF Fusion"
        result["signal_breakdown"] = {
            "lexical_similarity_cf": lexical_similarity_cf,
            "citation_anomaly_cf": citation_anomaly_cf,
            "stylistic_variation_cf": stylistic_variation_cf,
            "author_disclaimer_cf": author_disclaimer_cf,
        }
        return result

    @staticmethod
    def _interpret_cf(cf: float) -> str:
        if cf >= 0.80:
            return "Definitive Strong Confirmation (Practically Certain)"
        elif cf >= 0.60:
            return "Marked Evidence in Support (Probable)"
        elif cf >= 0.20:
            return "Weak Corroborative Evidence (Slight Suggestion)"
        elif cf > -0.20:
            return "Indeterminate / Equivocal Evidence"
        elif cf > -0.60:
            return "Weak Evidence of Absence (Doubtful)"
        elif cf > -0.80:
            return "Marked Evidence Against (Improbable)"
        else:
            return "Definitive Rejection (Practically False)"
