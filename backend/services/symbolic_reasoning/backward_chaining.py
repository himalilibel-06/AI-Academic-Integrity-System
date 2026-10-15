"""
LU IV — Concept 5: Backward Reasoning (Backward Chaining)

Implements genuine goal-driven backward inference:
- Recursive hypothesis evaluation
- AND-OR Goal Proof Tree construction
- Cycle detection guard against recursive loops
- Backtracking across alternate candidate rules
- Lineage trace with missing vs satisfied prerequisites
"""

from typing import Any, Dict, List, Optional, Set, Tuple
from .production_system import ProductionRule, get_academic_integrity_rule_catalog


class BackwardChainingEngine:
    """
    Goal-driven Backward Inference Engine with recursive AND-OR Proof Trees.
    """

    def __init__(self, rules: Optional[List[ProductionRule]] = None):
        self.rules = rules or get_academic_integrity_rule_catalog()

    def prove(
        self,
        goal: str,
        facts: List[str],
        rules: Optional[List[ProductionRule]] = None,
    ) -> Dict[str, Any]:
        """
        Attempts to prove target goal hypothesis from current fact base.

        Args:
            goal: The target predicate/fact to evaluate.
            facts: Initial list of known facts.
            rules: Optional custom rule base.

        Returns:
            Dictionary with proof status, AND-OR tree, satisfied conditions,
            missing conditions, considered rules, and step trace.
        """
        active_rules = rules or self.rules
        known_facts = set(facts)

        rules_considered: List[str] = []
        satisfied_conditions: Set[str] = set()
        missing_conditions: Set[str] = set()
        proof_trace: List[Dict[str, Any]] = []

        visiting_subgoals: Set[str] = set()

        def evaluate_node(subgoal: str, depth: int = 0) -> Dict[str, Any]:
            node: Dict[str, Any] = {
                "subgoal": subgoal,
                "node_type": "OR_NODE",
                "depth": depth,
                "status": "UNPROVEN",
                "children": [],
            }

            # 1. Base case: Directly present in working memory
            if subgoal in known_facts:
                node["status"] = "PROVEN"
                node["proof_method"] = "DIRECT_FACT_MATCH"
                satisfied_conditions.add(subgoal)
                return node

            # 2. Cycle Detection Guard
            if subgoal in visiting_subgoals:
                node["status"] = "FAILED"
                node["proof_method"] = "CYCLE_DETECTED"
                node["error"] = f"Recursive cycle detected for subgoal '{subgoal}'"
                missing_conditions.add(subgoal)
                return node

            visiting_subgoals.add(subgoal)

            # 3. Find candidate rules concluding this subgoal
            candidate_rules = [r for r in active_rules if r.conclusion == subgoal]

            if not candidate_rules:
                node["status"] = "FAILED"
                node["proof_method"] = "NO_CANDIDATE_RULES"
                missing_conditions.add(subgoal)
                visiting_subgoals.remove(subgoal)
                return node

            goal_proven = False

            # Try candidate rules (OR branch)
            for rule in candidate_rules:
                if rule.rule_id not in rules_considered:
                    rules_considered.append(rule.rule_id)

                rule_node: Dict[str, Any] = {
                    "rule_id": rule.rule_id,
                    "rule_name": rule.name,
                    "node_type": "AND_NODE",
                    "depth": depth + 1,
                    "status": "EVALUATING",
                    "conditions": sorted(list(rule.conditions)),
                    "subgoal_results": [],
                }

                # Evaluate all preconditions (AND branch)
                all_conditions_satisfied = True
                for cond in sorted(list(rule.conditions)):
                    sub_res = evaluate_node(cond, depth + 2)
                    rule_node["subgoal_results"].append(sub_res)
                    if sub_res["status"] != "PROVEN":
                        all_conditions_satisfied = False

                if all_conditions_satisfied:
                    rule_node["status"] = "PROVEN"
                    goal_proven = True
                    satisfied_conditions.add(subgoal)

                    proof_trace.append({
                        "depth": depth,
                        "rule_id": rule.rule_id,
                        "rule_name": rule.name,
                        "proved_subgoal": subgoal,
                        "conditions_met": sorted(list(rule.conditions)),
                        "explanation": rule.explanation,
                    })

                    node["children"].append(rule_node)
                    node["status"] = "PROVEN"
                    node["proof_method"] = f"DERIVED_VIA_{rule.rule_id}"
                    break  # Short-circuit OR node on first verified proof
                else:
                    rule_node["status"] = "FAILED"
                    node["children"].append(rule_node)

            if not goal_proven:
                node["status"] = "FAILED"
                node["proof_method"] = "ALL_CANDIDATE_RULES_FAILED"
                missing_conditions.add(subgoal)

            visiting_subgoals.remove(subgoal)
            return node

        and_or_tree = evaluate_node(goal, depth=0)
        supported = and_or_tree["status"] == "PROVEN"

        if supported:
            explanation = (
                f"Goal '{goal}' is VERIFIED: all recursive antecedent conditions "
                f"were satisfied in the rule base proof tree."
            )
        else:
            missing_str = ", ".join(sorted(list(missing_conditions))) or "unmet dependencies"
            explanation = (
                f"Goal '{goal}' CANNOT BE PROVEN. "
                f"Missing or unsatisfied prerequisite facts: {missing_str}."
            )

        return {
            "goal": goal,
            "supported": supported,
            "status": and_or_tree["status"],
            "satisfied_conditions": sorted(list(satisfied_conditions)),
            "missing_conditions": sorted(list(missing_conditions)),
            "rules_considered": rules_considered,
            "proof_tree": and_or_tree,
            "proof_trace": proof_trace,
            "explanation": explanation,
        }
