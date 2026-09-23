"""
GapGuard AI — Rule-Based Reasoning Engine (Forward & Backward Chaining)

Phase 9: Adds an explainable reasoning layer on top of existing GapGuard
research information, gap analysis results, and contribution analysis results.

Includes:
- Explicit production rules (R1 to R8)
- Forward chaining: deriver of new facts from known initial facts
- Backward chaining: goal-driven recursive condition evaluation
- Grounded explainability and reasoning traces
"""

from typing import Any, Dict, List, Optional, Set, Tuple


class Rule:
    """Represents a deterministic production rule in the knowledge base."""

    def __init__(
        self,
        rule_id: str,
        name: str,
        conditions: List[str],
        conclusion: str,
        explanation: str,
        evidence_references: Optional[List[str]] = None,
    ):
        self.rule_id = rule_id
        self.name = name
        self.conditions = set(conditions)
        self.conclusion = conclusion
        self.explanation = explanation
        self.evidence_references = evidence_references or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "name": self.name,
            "conditions": sorted(list(self.conditions)),
            "conclusion": self.conclusion,
            "explanation": self.explanation,
            "evidence_references": self.evidence_references,
        }


def get_default_rules() -> List[Rule]:
    """
    Returns the standard GapGuard production rule base aligned with
    Phase 6 (Gap Analysis) and Phase 7 (Contribution Analysis) invariants.
    """
    return [
        Rule(
            rule_id="R1",
            name="Gap Supported by Available Evidence",
            conditions=[
                "GAP_LIMITATION_ALIGNMENT_PRESENT",
                "GAP_CONTRIBUTION_OVERLAP_LOW",
            ],
            conclusion="GAP_SUPPORTED_BY_EVIDENCE",
            explanation=(
                "Literature papers report explicit limitations that align with the claimed "
                "research gap, while paper contributions show low lexical collision."
            ),
            evidence_references=["Phase 6 Gap Contradiction Checker", "Literature Corpus Limitations"],
        ),
        Rule(
            rule_id="R2",
            name="Potential Gap Contradiction",
            conditions=[
                "GAP_CONTRIBUTION_COLLISION_DETECTED",
                "MEANINGFUL_CONTEXTUAL_OVERLAP_PRESENT",
            ],
            conclusion="POTENTIAL_GAP_CONTRADICTION",
            explanation=(
                "A retrieved literature paper addresses the claimed gap while operating in "
                "a closely matching research problem or application context."
            ),
            evidence_references=["Phase 6 Gap Contradiction Checker", "Literature Corpus Contributions"],
        ),
        Rule(
            rule_id="R3",
            name="Contribution Differentiated",
            conditions=[
                "CONTRIBUTION_LEXICAL_OVERLAP_LOW",
                "CONTRIBUTION_CONTEXT_OVERLAP_LIMITED",
            ],
            conclusion="CONTRIBUTION_DIFFERENTIATED",
            explanation=(
                "The proposed contribution demonstrates clear distinction from baseline "
                "literature papers across both contribution claims and application contexts."
            ),
            evidence_references=["Phase 7 Contribution Differentiation Engine"],
        ),
        Rule(
            rule_id="R4",
            name="Potential Contribution Overlap",
            conditions=[
                "CONTRIBUTION_LEXICAL_OVERLAP_HIGH",
                "CONTRIBUTION_CONTEXT_OVERLAP_HIGH",
            ],
            conclusion="POTENTIAL_CONTRIBUTION_OVERLAP",
            explanation=(
                "Substantial lexical overlap in the proposed contribution combined with "
                "overlapping problem, method, or dataset context."
            ),
            evidence_references=["Phase 7 Contribution Differentiation Engine"],
        ),
        Rule(
            rule_id="R5",
            name="Insufficient Corpus Evidence",
            conditions=[
                "EVIDENCE_SIGNAL_INSUFFICIENT",
            ],
            conclusion="INSUFFICIENT_CORPUS_EVIDENCE",
            explanation=(
                "The available literature corpus does not contain enough topical signal "
                "to confirm or contradict the claimed gap."
            ),
            evidence_references=["Local Literature Retrieval"],
        ),
        # Multi-step Chaining Rules
        Rule(
            rule_id="R6",
            name="Research Direction Viable",
            conditions=[
                "GAP_SUPPORTED_BY_EVIDENCE",
                "CONTRIBUTION_DIFFERENTIATED",
            ],
            conclusion="RESEARCH_DIRECTION_VIABLE",
            explanation=(
                "The research project targets a verified literature limitation while "
                "maintaining distinct contributions from baseline papers."
            ),
            evidence_references=["Synthesized Rule R1 & Rule R3"],
        ),
        Rule(
            rule_id="R7",
            name="Peer Review Recommended",
            conditions=[
                "POTENTIAL_GAP_CONTRADICTION",
            ],
            conclusion="PEER_REVIEW_RECOMMENDED",
            explanation=(
                "A potential contradiction was identified in the available corpus; "
                "academic advisor or peer review is recommended before manuscript finalization."
            ),
            evidence_references=["Derived from Rule R2"],
        ),
        Rule(
            rule_id="R8",
            name="Contribution Refinement Recommended",
            conditions=[
                "POTENTIAL_CONTRIBUTION_OVERLAP",
            ],
            conclusion="CONTRIBUTION_REFINEMENT_RECOMMENDED",
            explanation=(
                "Overlap with existing paper contributions suggests explicitly highlighting "
                "the architectural or benchmark distinction of your work."
            ),
            evidence_references=["Derived from Rule R4"],
        ),
    ]


class RuleEngineService:
    """
    Transparent Rule-Based Reasoning Engine with Forward and Backward Chaining.
    """

    def __init__(self, rules: Optional[List[Rule]] = None):
        self.rules = rules or get_default_rules()

    def forward_chain(
        self,
        facts: List[str],
        rules: Optional[List[Rule]] = None,
    ) -> Dict[str, Any]:
        """
        Executes Forward Chaining from an initial set of facts.

        Iteratively checks rule premises against currently known facts, fires
        matching rules, and adds conclusions as new derived facts until fixpoint.

        Args:
            facts: Initial list of string fact identifiers.
            rules: Optional custom rule base. If None, default rules are used.

        Returns:
            Dictionary containing:
            - initial_facts: Starting facts.
            - fired_rules: List of rule IDs that fired.
            - derived_facts: Newly inferred facts.
            - final_facts: Complete union of initial and derived facts.
            - reasoning_trace: Step-by-step trace of each rule firing.
        """
        active_rules = rules or self.rules
        known_facts = set(facts)
        derived_facts: Set[str] = set()
        fired_rules: List[str] = []
        reasoning_trace: List[Dict[str, Any]] = []

        step = 1
        changed = True

        while changed:
            changed = False
            for rule in active_rules:
                if rule.rule_id in fired_rules:
                    continue

                # Check if all rule conditions are satisfied by known facts
                if rule.conditions.issubset(known_facts):
                    # Fire rule
                    fired_rules.append(rule.rule_id)
                    is_new = rule.conclusion not in known_facts
                    known_facts.add(rule.conclusion)
                    derived_facts.add(rule.conclusion)

                    reasoning_trace.append({
                        "step": step,
                        "rule_id": rule.rule_id,
                        "rule_name": rule.name,
                        "matched_conditions": sorted(list(rule.conditions)),
                        "derived_fact": rule.conclusion,
                        "is_new_fact": is_new,
                        "explanation": rule.explanation,
                        "evidence_references": rule.evidence_references,
                    })
                    step += 1
                    changed = True

        return {
            "initial_facts": sorted(list(facts)),
            "fired_rules": fired_rules,
            "derived_facts": sorted(list(derived_facts)),
            "final_facts": sorted(list(known_facts)),
            "reasoning_trace": reasoning_trace,
        }

    def backward_chain(
        self,
        goal: str,
        facts: List[str],
        rules: Optional[List[Rule]] = None,
    ) -> Dict[str, Any]:
        """
        Executes Backward Chaining for a target goal hypothesis.

        Recursively evaluates what conditions are required to support the goal,
        tracks which prerequisites are satisfied vs missing, and prevents cyclic loops.

        Args:
            goal: Target fact to evaluate (e.g. 'GAP_SUPPORTED_BY_EVIDENCE').
            facts: Initial facts currently established.
            rules: Optional custom rule base.

        Returns:
            Dictionary containing:
            - goal: Target goal evaluated.
            - supported: Boolean indicating if goal can be derived.
            - satisfied_conditions: Conditions that are verified.
            - missing_conditions: Required prerequisites not currently met.
            - rules_considered: Rule IDs examined in the backward search.
            - reasoning_trace: Step-by-step proof path.
            - explanation: Textual summary.
        """
        active_rules = rules or self.rules
        known_facts = set(facts)

        rules_considered: List[str] = []
        satisfied_conditions: Set[str] = set()
        missing_conditions: Set[str] = set()
        reasoning_trace: List[Dict[str, Any]] = []

        visiting: Set[str] = set()

        def evaluate_subgoal(subgoal: str, depth: int = 1) -> bool:
            # 1. Base case: directly in known initial facts
            if subgoal in known_facts:
                satisfied_conditions.add(subgoal)
                return True

            # 2. Cycle detection guard
            if subgoal in visiting:
                return False

            visiting.add(subgoal)

            # 3. Find candidate rules that conclude this subgoal
            candidate_rules = [r for r in active_rules if r.conclusion == subgoal]
            if not candidate_rules:
                missing_conditions.add(subgoal)
                visiting.remove(subgoal)
                return False

            goal_proven = False

            for rule in candidate_rules:
                if rule.rule_id not in rules_considered:
                    rules_considered.append(rule.rule_id)

                # Check if all conditions for this rule can be satisfied
                all_conditions_met = True
                rule_satisfied: List[str] = []
                rule_missing: List[str] = []

                for cond in sorted(list(rule.conditions)):
                    if evaluate_subgoal(cond, depth + 1):
                        rule_satisfied.append(cond)
                    else:
                        rule_missing.append(cond)
                        all_conditions_met = False

                if all_conditions_met:
                    goal_proven = True
                    satisfied_conditions.add(subgoal)
                    reasoning_trace.append({
                        "depth": depth,
                        "rule_id": rule.rule_id,
                        "rule_name": rule.name,
                        "proved_goal": subgoal,
                        "conditions_satisfied": rule_satisfied,
                        "explanation": rule.explanation,
                    })
                    break  # One successful derivation rule is sufficient
                else:
                    for m in rule_missing:
                        missing_conditions.add(m)

            visiting.remove(subgoal)
            return goal_proven

        supported = evaluate_subgoal(goal)

        if supported:
            explanation = (
                f"Goal '{goal}' is supported: all required conditions "
                f"were successfully verified via rule derivation."
            )
        else:
            missing_str = ", ".join(sorted(list(missing_conditions))) or "unmet dependencies"
            explanation = (
                f"Goal '{goal}' is currently NOT supported. "
                f"Missing or unsatisfied prerequisites: {missing_str}."
            )

        return {
            "goal": goal,
            "supported": supported,
            "satisfied_conditions": sorted(list(satisfied_conditions)),
            "missing_conditions": sorted(list(missing_conditions)),
            "rules_considered": rules_considered,
            "reasoning_trace": reasoning_trace,
            "explanation": explanation,
        }

    @staticmethod
    def extract_facts_from_analyses(
        gap_analysis: Optional[Dict[str, Any]] = None,
        contribution_analysis: Optional[Dict[str, Any]] = None,
    ) -> List[str]:
        """
        Translates Phase 6 and Phase 7 output structures into symbolic facts
        for the rule engine without altering original analysis outputs.
        """
        facts: Set[str] = set()

        if gap_analysis:
            summary = gap_analysis.get("evidence_summary") or gap_analysis.get("overall_assessment") or {}
            status = gap_analysis.get("overall_status") or summary.get("overall_status") or summary.get("status")
            supp_count = summary.get("supporting_count") or summary.get("supporting") or summary.get("supporting_papers") or 0
            contra_count = summary.get("potentially_contradicted_count") or summary.get("potentially_contradicted") or summary.get("potentially_contradicting_papers") or 0
            partial_count = summary.get("partially_supported_count") or summary.get("partial") or summary.get("partial_papers") or 0

            # Supporting paper count indicates supporting literature exists
            if supp_count > 0:
                facts.add("STRONG_SUPPORTING_EVIDENCE_EXISTS")

            # Phase 9.1 Audit Invariant:
            # STRONG_SUPPORTING_EVIDENCE_EXISTS does NOT automatically imply GAP_LIMITATION_ALIGNMENT_PRESENT.
            # Limitation alignment must be derived from an actual available limitation-alignment signal.
            # If actual limitation evidence is absent, leave GAP_LIMITATION_ALIGNMENT_PRESENT absent.
            has_limitation_alignment = False
            if gap_analysis.get("has_limitation_alignment") or gap_analysis.get("limitation_alignment_present"):
                has_limitation_alignment = True
            elif summary.get("has_limitation_alignment") or summary.get("limitation_alignment_count", 0) > 0:
                has_limitation_alignment = True
            else:
                for p in gap_analysis.get("paper_analyses", []):
                    scores = p.get("scores", {})
                    l_align = scores.get("limitation_alignment", 0.0) or scores.get("limitation_alignment_score", 0.0)
                    # Corresponds to Phase 6 LIMITATION_SUPPORT_THRESHOLD (0.25)
                    if l_align >= 0.25:
                        has_limitation_alignment = True
                        break
                    for ev in p.get("evidence", []):
                        ev_lower = str(ev).lower()
                        if "corroborat" in ev_lower and "limitation" in ev_lower:
                            has_limitation_alignment = True
                            break
                    if has_limitation_alignment:
                        break

            if has_limitation_alignment:
                facts.add("GAP_LIMITATION_ALIGNMENT_PRESENT")

            if contra_count == 0:
                facts.add("GAP_CONTRIBUTION_OVERLAP_LOW")
            else:
                facts.add("GAP_CONTRIBUTION_COLLISION_DETECTED")
                facts.add("MEANINGFUL_CONTEXTUAL_OVERLAP_PRESENT")
                facts.add("CONTRADICTORY_EVIDENCE_EXISTS")

            if status == "Insufficient Evidence" or (supp_count == 0 and contra_count == 0 and partial_count == 0):
                facts.add("EVIDENCE_SIGNAL_INSUFFICIENT")

        if contribution_analysis:
            agg = contribution_analysis.get("aggregate_summary") or contribution_analysis.get("project_summary") or {}
            overlap_count = agg.get("potential_overlap_count", 0)
            diff_count = agg.get("clearly_differentiated_count", 0)
            total = agg.get("total_papers_compared", 0)

            if overlap_count > 0:
                facts.add("CONTRIBUTION_LEXICAL_OVERLAP_HIGH")
                facts.add("CONTRIBUTION_CONTEXT_OVERLAP_HIGH")

            if diff_count > 0 and overlap_count == 0:
                facts.add("CONTRIBUTION_LEXICAL_OVERLAP_LOW")
                facts.add("CONTRIBUTION_CONTEXT_OVERLAP_LIMITED")

            if total == 0:
                facts.add("EVIDENCE_SIGNAL_INSUFFICIENT")

        return sorted(list(facts))


# Singleton service instance
rule_engine_service = RuleEngineService()
