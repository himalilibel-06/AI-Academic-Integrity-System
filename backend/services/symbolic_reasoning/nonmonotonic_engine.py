"""
LU IV — Concept 7: Nonmonotonic Reasoning

Implements genuine Default Logic & Defeasible Belief Revision:
- Reiter's Default Rules: (alpha : beta) / gamma
- Truth Maintenance System (TMS) dependency tracking
- Dynamic belief revision: asserting a defeater fact revokes previous conclusions
- Retraction lineage logs showing how beliefs change when new evidence arrives
"""

from typing import Any, Dict, List, Optional, Set, Tuple


class DefaultRule:
    """
    Reiter's Default Rule:
        alpha (Prerequisites) : beta (Justifications / Exceptions) / gamma (Consequent)
    Interpretation:
        If all prerequisites in alpha are known,
        and no defeaters in beta are present in the belief base,
        then conclude gamma.
    """

    def __init__(
        self,
        rule_id: str,
        name: str,
        prerequisites: List[str],  # alpha
        defeaters: List[str],      # exceptions: if ANY of these is present, rule is blocked
        consequent: str,           # gamma
        explanation: str,
    ):
        self.rule_id = rule_id
        self.name = name
        self.prerequisites = set(prerequisites)
        self.defeaters = set(defeaters)
        self.consequent = consequent
        self.explanation = explanation

    def is_applicable(self, facts: Set[str]) -> Tuple[bool, Optional[str]]:
        """
        Checks if prerequisite is satisfied and no defeater is asserted.
        Returns (applicable: bool, reason: str).
        """
        if not self.prerequisites.issubset(facts):
            missing = self.prerequisites.difference(facts)
            return False, f"Missing prerequisite(s): {sorted(list(missing))}"

        present_defeaters = self.defeaters.intersection(facts)
        if present_defeaters:
            return False, f"Blocked by active defeater(s): {sorted(list(present_defeaters))}"

        return True, "All prerequisites met and no defeater present."

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "name": self.name,
            "prerequisites": sorted(list(self.prerequisites)),
            "defeaters": sorted(list(self.defeaters)),
            "consequent": self.consequent,
            "explanation": self.explanation,
        }


def get_default_academic_integrity_defaults() -> List[DefaultRule]:
    """Default rules for academic integrity with explicit defeasible exceptions."""
    return [
        DefaultRule(
            rule_id="DEF_1_PLAGIARISM_PRESUMPTION",
            name="Default Presumption of Plagiarism on High Overlap",
            prerequisites=["HIGH_TEXTUAL_OVERLAP"],
            defeaters=["IS_AUTHORIZED_SELF_CITATION", "IS_STANDARD_BOILERPLATE", "IS_FAIR_USE_QUOTATION"],
            consequent="PRESUMED_PLAGIARISM_VIOLATION",
            explanation=(
                "By default, high lexical overlap without known exceptions leads to a presumption "
                "of academic plagiarism."
            ),
        ),
        DefaultRule(
            rule_id="DEF_2_FORMAL_SANCTION",
            name="Default Administrative Sanction",
            prerequisites=["PRESUMED_PLAGIARISM_VIOLATION"],
            defeaters=["FIRST_TIME_OFFENDER_REMEDIAL_OPTION"],
            consequent="INSTITUTIONAL_DISCIPLINARY_SANCTION",
            explanation="Presumed plagiarism leads to formal institutional disciplinary penalties unless a remedial waiver applies.",
        ),
        DefaultRule(
            rule_id="DEF_3_PERMITTED_REUSE",
            name="Exception for Permitted Self-Citation Reuse",
            prerequisites=["HIGH_TEXTUAL_OVERLAP", "IS_AUTHORIZED_SELF_CITATION"],
            defeaters=["FAILURE_TO_NOTIFY_FACULTY"],
            consequent="PERMITTED_AUTHOR_SELF_REUSE",
            explanation="When the student authored the prior work and disclosed it, overlap is categorized as permitted authorial self-reuse.",
        ),
        DefaultRule(
            rule_id="DEF_4_BOILERPLATE_CLEARANCE",
            name="Exception for Standard Template / Boilerplate",
            prerequisites=["HIGH_TEXTUAL_OVERLAP", "IS_STANDARD_BOILERPLATE"],
            defeaters=[],
            consequent="STANDARD_METHODOLOGY_BOILERPLATE_CLEARED",
            explanation="Overlap consisting of standard IEEE/ACM formatting boilerplate is exempt from violation.",
        ),
    ]


class NonmonotonicReasoningEngine:
    """
    Truth Maintenance System (TMS) maintaining active beliefs, dependency links,
    and executing dynamic belief revision when new facts or defeaters arrive.
    """

    def __init__(self, default_rules: Optional[List[DefaultRule]] = None):
        self.default_rules = default_rules or get_default_academic_integrity_defaults()
        self.base_facts: Set[str] = set()
        self.derived_beliefs: Dict[str, Dict[str, Any]] = {}  # belief -> justification metadata
        self.revision_history: List[Dict[str, Any]] = []

    def set_base_facts(self, facts: List[str]) -> None:
        """Initializes the base facts and performs initial nonmonotonic inference."""
        self.base_facts = set(facts)
        self.derived_beliefs = {}
        self.revision_history = []
        self._recompute_beliefs(trigger_event="INITIAL_SETUP", changed_facts=facts)

    def assert_fact(self, new_fact: str) -> Dict[str, Any]:
        """
        Dynamically asserts a new fact (e.g. Defeater evidence),
        triggering automatic belief revision and retracting invalid assumptions.
        """
        if new_fact in self.base_facts:
            return {"changed": False, "message": f"Fact '{new_fact}' already present."}

        self.base_facts.add(new_fact)
        retracted, added = self._recompute_beliefs(
            trigger_event=f"ASSERT_FACT({new_fact})",
            changed_facts=[new_fact],
        )

        return {
            "changed": True,
            "asserted_fact": new_fact,
            "retracted_beliefs": retracted,
            "newly_derived_beliefs": added,
            "current_active_beliefs": self.get_active_beliefs(),
            "latest_revision": self.revision_history[-1] if self.revision_history else {},
        }

    def retract_fact(self, fact_to_remove: str) -> Dict[str, Any]:
        """
        Removes a previously asserted fact, re-evaluating default rules.
        """
        if fact_to_remove not in self.base_facts:
            return {"changed": False, "message": f"Fact '{fact_to_remove}' not in base facts."}

        self.base_facts.remove(fact_to_remove)
        retracted, added = self._recompute_beliefs(
            trigger_event=f"RETRACT_FACT({fact_to_remove})",
            changed_facts=[fact_to_remove],
        )

        return {
            "changed": True,
            "retracted_base_fact": fact_to_remove,
            "retracted_beliefs": retracted,
            "restored_beliefs": added,
            "current_active_beliefs": self.get_active_beliefs(),
            "latest_revision": self.revision_history[-1] if self.revision_history else {},
        }

    def _recompute_beliefs(
        self,
        trigger_event: str,
        changed_facts: List[str],
    ) -> Tuple[List[str], List[str]]:
        """
        Iteratively computes the fixed-point extension of default beliefs.
        Detects which beliefs must be retracted due to newly active defeaters.
        """
        prev_beliefs = set(self.derived_beliefs.keys())
        all_known = set(self.base_facts)

        new_derived: Dict[str, Dict[str, Any]] = {}
        changed = True

        while changed:
            changed = False
            for rule in self.default_rules:
                if rule.consequent in new_derived:
                    continue

                applicable, reason = rule.is_applicable(all_known)
                if applicable:
                    new_derived[rule.consequent] = {
                        "rule_id": rule.rule_id,
                        "rule_name": rule.name,
                        "prerequisites": sorted(list(rule.prerequisites)),
                        "defeaters_checked": sorted(list(rule.defeaters)),
                        "explanation": rule.explanation,
                    }
                    all_known.add(rule.consequent)
                    changed = True

        current_beliefs = set(new_derived.keys())
        retracted = sorted(list(prev_beliefs.difference(current_beliefs)))
        added = sorted(list(current_beliefs.difference(prev_beliefs)))

        self.derived_beliefs = new_derived

        self.revision_history.append({
            "trigger_event": trigger_event,
            "changed_facts": changed_facts,
            "retracted_beliefs": retracted,
            "added_beliefs": added,
            "active_base_facts": sorted(list(self.base_facts)),
            "active_derived_beliefs": sorted(list(self.derived_beliefs.keys())),
        })

        return retracted, added

    def get_active_beliefs(self) -> List[str]:
        return sorted(list(self.base_facts.union(self.derived_beliefs.keys())))

    def get_status(self) -> Dict[str, Any]:
        return {
            "base_facts": sorted(list(self.base_facts)),
            "derived_beliefs": self.derived_beliefs,
            "active_beliefs": self.get_active_beliefs(),
            "revision_history": self.revision_history,
            "rules_catalog": [r.to_dict() for r in self.default_rules],
        }
