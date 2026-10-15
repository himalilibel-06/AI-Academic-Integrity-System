"""
LU IV — Concept 4: Forward Reasoning (Forward Chaining)

Implements genuine data-driven forward inference:
- Agenda / Conflict Set tracking
- Pluggable Conflict Resolution Strategies (priority, specificity, recency, fifo)
- Refraction guard against duplicate rule firings
- Complete execution trace with step-by-step derivations until fixpoint
"""

from typing import Any, Dict, List, Optional, Set, Tuple
from .production_system import ProductionRule, get_academic_integrity_rule_catalog


class ForwardChainingEngine:
    """
    Data-driven Forward Inference Engine with explicit Conflict Resolution.
    """

    def __init__(self, rules: Optional[List[ProductionRule]] = None):
        self.rules = rules or get_academic_integrity_rule_catalog()

    def infer(
        self,
        facts: List[str],
        rules: Optional[List[ProductionRule]] = None,
        conflict_strategy: str = "priority",
        max_iterations: int = 100,
    ) -> Dict[str, Any]:
        """
        Executes Forward Chaining from an initial fact set.

        Args:
            facts: List of initial known fact strings.
            rules: Optional custom rule set.
            conflict_strategy: Conflict resolution method ('priority', 'specificity', 'recency', 'fifo').
            max_iterations: Guard against run-away rule firing loops.

        Returns:
            Dictionary with initial facts, derived facts, final facts, fired rules,
            conflict set history, and step-by-step reasoning trace.
        """
        active_rules = rules or self.rules
        working_memory: Set[str] = set(facts)
        derived_facts: List[str] = []
        fired_rules: List[str] = []
        reasoning_trace: List[Dict[str, Any]] = []

        # Recency tracker: map each fact to the step number at which it was added
        fact_recency: Dict[str, int] = {f: 0 for f in facts}

        step = 1
        iteration = 0

        while iteration < max_iterations:
            iteration += 1

            # 1. Match Phase: Find all eligible rules whose premises are satisfied in working memory
            conflict_set: List[ProductionRule] = []
            for r in active_rules:
                if r.rule_id in fired_rules:
                    continue
                if r.matches(working_memory):
                    conflict_set.append(r)

            if not conflict_set:
                # Quiescence reached (fixpoint)
                break

            # 2. Conflict Resolution Phase: Pick a single winner according to selected strategy
            selected_rule = self._resolve_conflict(conflict_set, conflict_strategy, fact_recency)

            # 3. Act Phase: Fire the selected rule
            fired_rules.append(selected_rule.rule_id)
            new_conclusion = selected_rule.conclusion
            is_new_fact = new_conclusion not in working_memory

            working_memory.add(new_conclusion)
            fact_recency[new_conclusion] = step
            if is_new_fact and new_conclusion not in derived_facts:
                derived_facts.append(new_conclusion)

            reasoning_trace.append({
                "step": step,
                "rule_id": selected_rule.rule_id,
                "rule_name": selected_rule.name,
                "conflict_set_size": len(conflict_set),
                "conflict_set_rule_ids": [r.rule_id for r in conflict_set],
                "selected_by_strategy": conflict_strategy,
                "matched_conditions": sorted(list(selected_rule.conditions)),
                "derived_fact": new_conclusion,
                "is_new_fact": is_new_fact,
                "priority": selected_rule.priority,
                "specificity": selected_rule.specificity,
                "certainty_factor": selected_rule.certainty_factor,
                "explanation": selected_rule.explanation,
                "policy_reference": selected_rule.policy_reference,
            })
            step += 1

        return {
            "initial_facts": sorted(list(facts)),
            "conflict_strategy_used": conflict_strategy,
            "fired_rules": fired_rules,
            "derived_facts": derived_facts,
            "final_facts": sorted(list(working_memory)),
            "iterations": iteration,
            "quiescence_reached": iteration < max_iterations,
            "reasoning_trace": reasoning_trace,
        }

    def _resolve_conflict(
        self,
        conflict_set: List[ProductionRule],
        strategy: str,
        recency_map: Dict[str, int],
    ) -> ProductionRule:
        """Applies the selected conflict resolution heuristic."""
        strat = (strategy or "priority").lower()

        if strat == "specificity":
            # Highest number of antecedent conditions
            return max(conflict_set, key=lambda r: (r.specificity, r.priority))

        elif strat == "recency":
            # Rule whose conditions contain the most recently asserted fact
            def rule_max_recency(r: ProductionRule) -> int:
                return max([recency_map.get(c, 0) for c in r.conditions] or [0])

            return max(conflict_set, key=lambda r: (rule_max_recency(r), r.priority))

        elif strat == "fifo":
            # First eligible rule in the rule base definition order
            return conflict_set[0]

        else:
            # Default: Priority / Salience
            return max(conflict_set, key=lambda r: (r.priority, r.specificity))
