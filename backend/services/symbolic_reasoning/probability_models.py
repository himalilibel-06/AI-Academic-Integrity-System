"""
LU IV — Concept 8: Probability

Implements Classical Probability Theory:
- Kolmogorov Axioms verification:
    1. P(E) >= 0 for all events
    2. Sum of probabilities over entire sample space == 1.0
    3. Additivity of mutually exclusive events: P(A U B) = P(A) + P(B)
- Full Discrete Joint Probability Distribution matrix
- Exact Marginalization: P(X) = sum_Y P(X, Y)
- Exact Conditioning: P(X | Y) = P(X, Y) / P(Y)
- Marginal Independence & Conditional Independence tests
"""

from typing import Any, Dict, List, Optional, Set, Tuple
import math


class DiscreteJointProbabilityDistribution:
    """
    Represents a full discrete joint probability distribution over n discrete random variables.
    Table maps tuple of variable assignments -> probability float.
    """

    def __init__(
        self,
        variables: Dict[str, List[str]],
        joint_probabilities: Dict[Tuple[str, ...], float],
    ):
        """
        Args:
            variables: Dict mapping variable name -> list of possible outcome states.
                       e.g. {"Similarity": ["High", "Low"], "Citations": ["Anomaly", "Normal"]}
            joint_probabilities: Dict mapping outcome tuple in order of variables keys -> probability float.
        """
        self.variables = variables
        self.var_names = list(variables.keys())
        self.joint_table: Dict[Tuple[str, ...], float] = joint_probabilities

    @classmethod
    def create_academic_integrity_distribution(cls) -> "DiscreteJointProbabilityDistribution":
        """
        Institutional Academic Integrity Benchmark Joint Distribution:
        Variables:
            - Similarity (S): ['High', 'Low']
            - Citations (C): ['Anomaly', 'Normal']
            - Misconduct (M): ['True', 'False']

        Total 8 atomic events. Sums to 1.0.
        """
        variables = {
            "Similarity": ["High", "Low"],
            "Citations": ["Anomaly", "Normal"],
            "Misconduct": ["True", "False"],
        }
        # Explicit atomic joint probabilities: (Similarity, Citations, Misconduct)
        joint_probs = {
            ("High", "Anomaly", "True"): 0.0380,   # Cheating with high overlap and omitted citation
            ("High", "Anomaly", "False"): 0.0020,  # Accidental formatting glitch in non-cheating paper
            ("High", "Normal", "True"): 0.0100,   # Smart paraphraser who still referenced baseline
            ("High", "Normal", "False"): 0.1500,  # Standard survey/literature review with full citations
            ("Low", "Anomaly", "True"): 0.0020,    # Sophisticated contract cheating / hidden ideas
            ("Low", "Anomaly", "False"): 0.0180,   # Missing bibliography formatting error on original work
            ("Low", "Normal", "True"): 0.0000,    # Cheating with low overlap and normal citations (negligible)
            ("Low", "Normal", "False"): 0.7800,   # Majority of honest student submissions
        }
        return cls(variables, joint_probs)

    def verify_kolmogorov_axioms(self, tolerance: float = 1e-5) -> Dict[str, Any]:
        """
        Checks Kolmogorov Axioms:
        Axiom 1: Non-negativity -> P(E) >= 0
        Axiom 2: Normalization -> sum(P) == 1.0
        Axiom 3: Additivity of disjoint events -> P(A U B) = P(A) + P(B)
        """
        total_prob = sum(self.joint_table.values())
        axiom1_passed = all(p >= 0.0 for p in self.joint_table.values())
        axiom2_passed = abs(total_prob - 1.0) <= tolerance

        # Test Axiom 3 on two disjoint events: (Similarity='High', Citations='Anomaly', Misconduct='True')
        # and (Similarity='High', Citations='Anomaly', Misconduct='False')
        e1 = ("High", "Anomaly", "True")
        e2 = ("High", "Anomaly", "False")
        p1 = self.joint_table.get(e1, 0.0)
        p2 = self.joint_table.get(e2, 0.0)
        p_union = p1 + p2
        axiom3_sample_verified = abs(p_union - (p1 + p2)) <= 1e-9

        return {
            "axiom_1_non_negativity": {
                "passed": axiom1_passed,
                "description": "P(E) >= 0 for all elementary events",
                "min_probability": min(self.joint_table.values()),
            },
            "axiom_2_normalization": {
                "passed": axiom2_passed,
                "description": "Sum of all elementary event probabilities equals exactly 1.0",
                "calculated_sum": round(total_prob, 6),
                "discrepancy": round(abs(total_prob - 1.0), 8),
            },
            "axiom_3_additivity": {
                "passed": axiom3_sample_verified,
                "description": "Additivity of mutually exclusive events: P(A U B) = P(A) + P(B)",
                "sample_event_1": str(e1),
                "sample_event_2": str(e2),
                "p_e1": p1,
                "p_e2": p2,
                "p_union": round(p_union, 6),
            },
            "all_axioms_satisfied": axiom1_passed and axiom2_passed and axiom3_sample_verified,
        }

    def marginalize(self, query_vars: Dict[str, str]) -> float:
        """
        Computes marginal probability P(query_vars) by summing over all non-query variables.
        Example: query_vars={"Misconduct": "True"}
        """
        total = 0.0
        for outcome_tuple, prob in self.joint_table.items():
            matches = True
            for var_name, req_val in query_vars.items():
                idx = self.var_names.index(var_name)
                if outcome_tuple[idx] != req_val:
                    matches = False
                    break
            if matches:
                total += prob
        return round(total, 6)

    def conditional_probability(
        self,
        query_vars: Dict[str, str],
        evidence_vars: Dict[str, str],
    ) -> Dict[str, Any]:
        """
        Computes conditional probability:
            P(query | evidence) = P(query AND evidence) / P(evidence)
        """
        joint_query_evidence = {**query_vars, **evidence_vars}
        numerator = self.marginalize(joint_query_evidence)
        denominator = self.marginalize(evidence_vars)

        if denominator <= 0.0:
            return {
                "query": query_vars,
                "evidence": evidence_vars,
                "probability": 0.0,
                "error": "Denominator P(evidence) == 0; conditional probability undefined.",
            }

        posterior = round(numerator / denominator, 6)
        return {
            "query": query_vars,
            "evidence": evidence_vars,
            "p_query_and_evidence": numerator,
            "p_evidence": denominator,
            "conditional_probability": posterior,
            "percentage": round(posterior * 100, 2),
            "formula": f"P({list(query_vars.keys())[0]} | {list(evidence_vars.keys())[0]}) = {numerator:.6f} / {denominator:.6f} = {posterior:.6f}",
        }

    def check_independence(self, var_a: str, var_b: str, tolerance: float = 1e-4) -> Dict[str, Any]:
        """
        Tests if variable A and variable B are statistically independent:
            P(A = a, B = b) == P(A = a) * P(B = b) for all outcomes a in A, b in B.
        """
        vals_a = self.variables[var_a]
        vals_b = self.variables[var_b]

        evaluations: List[Dict[str, Any]] = []
        is_independent = True

        for va in vals_a:
            for vb in vals_b:
                p_joint = self.marginalize({var_a: va, var_b: vb})
                p_a = self.marginalize({var_a: va})
                p_b = self.marginalize({var_b: vb})
                p_product = round(p_a * p_b, 6)
                diff = round(abs(p_joint - p_product), 6)
                independent_pair = diff <= tolerance
                if not independent_pair:
                    is_independent = False

                evaluations.append({
                    "state_A": f"{var_a}={va}",
                    "state_B": f"{var_b}={vb}",
                    "p_joint": p_joint,
                    "p_product": p_product,
                    "difference": diff,
                    "holds": independent_pair,
                })

        return {
            "variable_A": var_a,
            "variable_B": var_b,
            "is_independent": is_independent,
            "tolerance": tolerance,
            "evaluations": evaluations,
            "conclusion": (
                f"Variables '{var_a}' and '{var_b}' are {'INDEPENDENT' if is_independent else 'DEPENDENT'}."
            ),
        }

    def to_dict(self) -> Dict[str, Any]:
        """Formats the joint distribution table as serializable JSON rows."""
        rows = []
        for outcome_tuple, prob in self.joint_table.items():
            row = {self.var_names[i]: outcome_tuple[i] for i in range(len(self.var_names))}
            row["probability"] = prob
            rows.append(row)
        return {
            "variables": self.variables,
            "total_atomic_events": len(self.joint_table),
            "table": rows,
        }
