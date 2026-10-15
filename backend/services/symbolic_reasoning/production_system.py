"""
LU IV — Production System & Knowledge Representations
Covers:
- Concept 1: Knowledge Representation Using Rules
- Concept 2: Procedural Knowledge
- Concept 3: Declarative Knowledge
- Concept 11: Rule-Based Systems (Unified Production System)

Academic Integrity Domain:
Integrates declarative assertion facts, procedural verification pipelines,
and deterministic/probabilistic production rules with full explanation facilities.
"""

from typing import Any, Callable, Dict, List, Optional, Set, Tuple
import copy
import time


# ============================================================================
# CONCEPT 1: KNOWLEDGE REPRESENTATION USING RULES
# ============================================================================

class ProductionRule:
    """
    Formal Production Rule Representation:
        IF (c_1 AND c_2 AND ... AND c_m)
        THEN CONCLUDE (conclusion)
        WITH priority, certainty_factor, and explanation.
    """

    def __init__(
        self,
        rule_id: str,
        name: str,
        conditions: List[str],
        conclusion: str,
        explanation: str,
        priority: int = 1,
        certainty_factor: float = 1.0,
        policy_reference: Optional[str] = None,
        category: str = "academic_integrity",
        action: Optional[str] = None,
    ):
        self.rule_id = rule_id
        self.name = name
        self.conditions = set(conditions)
        self.conclusion = conclusion
        self.explanation = explanation
        self.priority = int(priority)  # Salience for conflict resolution (higher = higher priority)
        self.certainty_factor = float(certainty_factor)
        self.policy_reference = policy_reference or "Institutional Academic Ethics Policy §4.1"
        self.category = category
        self.action = action  # Optional procedural action identifier

    @property
    def specificity(self) -> int:
        """Returns the number of antecedent conditions (used in specificity conflict resolution)."""
        return len(self.conditions)

    def matches(self, working_memory: Set[str]) -> bool:
        """Checks if all antecedent conditions are present in the working memory."""
        return self.conditions.issubset(working_memory)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "name": self.name,
            "conditions": sorted(list(self.conditions)),
            "conclusion": self.conclusion,
            "explanation": self.explanation,
            "priority": self.priority,
            "certainty_factor": self.certainty_factor,
            "policy_reference": self.policy_reference,
            "category": self.category,
            "action": self.action,
            "specificity": self.specificity,
        }


def get_academic_integrity_rule_catalog() -> List[ProductionRule]:
    """
    Standard Production Rule Catalog for Academic Integrity Advisory System.
    Includes rules for verbatim copying, paraphrase plagiarism, self-citation,
    unreferenced sources, and fair use educational exceptions.
    """
    return [
        ProductionRule(
            rule_id="R_VERBATIM_PLAGIARISM",
            name="Verbatim Copying Without Attribution",
            conditions=["TEXTUAL_SIMILARITY_HIGH", "QUOTATION_MARKS_ABSENT", "CITATION_ABSENT"],
            conclusion="VERBATIM_PLAGIARISM_CONFIRMED",
            explanation="Substantial identical text strings appear without enclosing quotation marks and without reference citation.",
            priority=10,
            certainty_factor=0.98,
            policy_reference="Ethics Code Section 3.1: Verbatim Copying",
            category="plagiarism_severity",
        ),
        ProductionRule(
            rule_id="R_MOSAIC_PLAGIARISM",
            name="Patchwork / Mosaic Plagiarism",
            conditions=["PARAPHRASE_HIGH", "SOURCE_STRUCTURE_MIRRORED", "CITATION_ABSENT"],
            conclusion="MOSAIC_PLAGIARISM_SUSPECTED",
            explanation="Content is paraphrased from an external source while copying its sentence structure without proper attribution.",
            priority=8,
            certainty_factor=0.85,
            policy_reference="Ethics Code Section 3.2: Mosaic Borrowing",
            category="plagiarism_severity",
        ),
        ProductionRule(
            rule_id="R_UNREFERENCED_SOURCE",
            name="Unreferenced Literature Dependency",
            conditions=["TOPICAL_OVERLAP_HIGH", "BIBLIOGRAPHY_ENTRY_MISSING"],
            conclusion="UNREFERENCED_SOURCE_PRESENT",
            explanation="The manuscript closely relies on ideas or data from a baseline paper absent from its bibliography.",
            priority=5,
            certainty_factor=0.75,
            policy_reference="Ethics Code Section 3.3: Bibliography Completeness",
            category="citation_policy",
        ),
        ProductionRule(
            rule_id="R_FAIR_USE_EXCEPTION",
            name="Educational Fair Use Quota Exemption",
            conditions=["OVERLAP_UNDER_QUOTA", "QUOTATION_MARKS_PRESENT", "PROPER_ATTRIBUTION_PRESENT"],
            conclusion="FAIR_USE_EXEMPTION_GRANTED",
            explanation="Extracted segments are brief, explicitly enclosed in quotes, and formally attributed under educational fair use guidelines.",
            priority=9,
            certainty_factor=0.95,
            policy_reference="Fair Use Doctrine §107 & University Guidelines",
            category="exemption_policy",
        ),
        ProductionRule(
            rule_id="R_AUTHORIZED_SELF_CITATION",
            name="Permitted Self-Citation / Thesis Reuse",
            conditions=["AUTHOR_IDENTITY_MATCHES", "PRIOR_WORK_PROPERLY_DISCLOSED"],
            conclusion="AUTHORIZED_SELF_CITATION_CONFIRMED",
            explanation="The overlapping material originates from the author's prior workshop publication and was formally disclosed to the evaluator.",
            priority=9,
            certainty_factor=0.92,
            policy_reference="Ethics Code Section 4.2: Self-Citation Guidelines",
            category="exemption_policy",
        ),
        ProductionRule(
            rule_id="R_HEARING_RECOMMENDED",
            name="Institutional Integrity Hearing Referral",
            conditions=["VERBATIM_PLAGIARISM_CONFIRMED"],
            conclusion="REQUIRES_ACADEMIC_INTEGRITY_HEARING",
            explanation="Confirmed verbatim plagiarism exceeds automatic penalty threshold; formal disciplinary committee review is mandated.",
            priority=7,
            certainty_factor=0.90,
            policy_reference="University Disciplinary Procedures Art. 12",
            category="administrative_action",
        ),
        ProductionRule(
            rule_id="R_REVISE_CITATIONS",
            name="Citation Refinement Mandate",
            conditions=["UNREFERENCED_SOURCE_PRESENT"],
            conclusion="MANDATORY_CITATION_REVISION",
            explanation="Student must add omitted citations to the bibliography before final grade or degree award.",
            priority=4,
            certainty_factor=0.80,
            policy_reference="University Thesis Submission Standards",
            category="administrative_action",
        ),
        ProductionRule(
            rule_id="R_CLEARANCE_ISSUED",
            name="Academic Integrity Clearance",
            conditions=["FAIR_USE_EXEMPTION_GRANTED"],
            conclusion="INTEGRITY_CLEARANCE_ISSUED",
            explanation="The manuscript satisfies all institutional criteria for ethical citation and academic originality.",
            priority=6,
            certainty_factor=0.95,
            policy_reference="University Clearance Workflow",
            category="clearance",
        ),
    ]


# ============================================================================
# CONCEPT 2: PROCEDURAL KNOWLEDGE
# ============================================================================

class ProceduralStep:
    """
    Represents an executable operational step in a procedural pipeline.
    Specifies 'how' a task is performed through code logic, preconditions,
    and postconditions.
    """

    def __init__(
        self,
        step_id: str,
        name: str,
        description: str,
        action: Callable[[Dict[str, Any]], Dict[str, Any]],
        preconditions: Optional[List[str]] = None,
        postconditions: Optional[List[str]] = None,
    ):
        self.step_id = step_id
        self.name = name
        self.description = description
        self.action = action
        self.preconditions = preconditions or []
        self.postconditions = postconditions or []

    def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Runs the step's action on the mutable state dictionary."""
        return self.action(state)


class ProceduralWorkflow:
    """
    Explicit Procedural Pipeline:
    Executes ordered sequences of steps with verified state transitions,
    execution traces, and invariant assertions.
    """

    def __init__(self, workflow_id: str, name: str, description: str):
        self.workflow_id = workflow_id
        self.name = name
        self.description = description
        self.steps: List[ProceduralStep] = []

    def add_step(self, step: ProceduralStep) -> "ProceduralWorkflow":
        self.steps.append(step)
        return self

    def execute(self, initial_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes the procedural workflow step-by-step, recording a full
        audit trace of inputs, state mutations, and outputs.
        """
        state = copy.deepcopy(initial_payload)
        trace: List[Dict[str, Any]] = []
        start_time = time.time()

        for idx, step in enumerate(self.steps, start=1):
            step_start = time.time()
            pre_state_snapshot = {k: repr(v)[:100] for k, v in state.items()}

            # Check preconditions
            for pre in step.preconditions:
                if pre not in state or state[pre] is None:
                    return {
                        "workflow_id": self.workflow_id,
                        "success": False,
                        "error": f"Precondition failed at step {step.step_id}: '{pre}' missing or null",
                        "trace": trace,
                        "final_state": state,
                    }

            # Execute action
            try:
                state = step.execute(state)
            except Exception as ex:
                return {
                    "workflow_id": self.workflow_id,
                    "success": False,
                    "error": f"Error executing step {step.step_id}: {str(ex)}",
                    "trace": trace,
                    "final_state": state,
                }

            post_state_snapshot = {k: repr(v)[:100] for k, v in state.items()}

            # Check postconditions
            for post in step.postconditions:
                if post not in state:
                    return {
                        "workflow_id": self.workflow_id,
                        "success": False,
                        "error": f"Postcondition failed at step {step.step_id}: '{post}' not produced",
                        "trace": trace,
                        "final_state": state,
                    }

            trace.append({
                "step_number": idx,
                "step_id": step.step_id,
                "step_name": step.name,
                "description": step.description,
                "duration_ms": round((time.time() - step_start) * 1000, 3),
                "preconditions_checked": step.preconditions,
                "postconditions_verified": step.postconditions,
                "state_snapshot_keys": list(state.keys()),
            })

        total_time_ms = round((time.time() - start_time) * 1000, 3)
        return {
            "workflow_id": self.workflow_id,
            "workflow_name": self.name,
            "success": True,
            "total_steps": len(self.steps),
            "execution_time_ms": total_time_ms,
            "trace": trace,
            "final_state": state,
        }


def build_academic_sanitization_and_fingerprint_pipeline() -> ProceduralWorkflow:
    """
    Standard Academic Verification Pipeline demonstrating procedural knowledge:
    1. Case normalization & punctuation stripping
    2. Tokenization & stop-word filtration
    3. N-gram k-shingle generation
    4. Winnowing hash fingerprinting
    5. Jaccard & containment index derivation
    """
    pipeline = ProceduralWorkflow(
        workflow_id="PROC_ACADEMIC_FINGERPRINT",
        name="Text Sanitization & Fingerprinting Procedure",
        description="Step-by-step algorithmic pipeline that sanitizes text, extracts k-shingles, and computes hash fingerprints.",
    )

    def step1_normalize(state: Dict[str, Any]) -> Dict[str, Any]:
        text = str(state.get("raw_text", ""))
        import re
        normalized = re.sub(r"[^\w\s]", " ", text.lower())
        normalized = re.sub(r"\s+", " ", normalized).strip()
        state["normalized_text"] = normalized
        return state

    def step2_tokenize(state: Dict[str, Any]) -> Dict[str, Any]:
        stopwords = {"the", "a", "an", "in", "on", "at", "and", "or", "of", "to", "is", "for", "with", "by", "that", "this"}
        tokens = [t for t in state["normalized_text"].split() if t not in stopwords and len(t) > 1]
        state["tokens"] = tokens
        state["token_count"] = len(tokens)
        return state

    def step3_shingles(state: Dict[str, Any]) -> Dict[str, Any]:
        k = int(state.get("shingle_k", 3))
        tokens = state["tokens"]
        if len(tokens) < k:
            shingles = [" ".join(tokens)] if tokens else []
        else:
            shingles = [" ".join(tokens[i : i + k]) for i in range(len(tokens) - k + 1)]
        state["shingles"] = shingles
        state["shingle_count"] = len(shingles)
        return state

    def step4_fingerprint(state: Dict[str, Any]) -> Dict[str, Any]:
        import hashlib
        shingles = state["shingles"]
        hashes = [int(hashlib.md5(s.encode("utf-8")).hexdigest()[:8], 16) for s in shingles]
        # Winnowing-like minimum selection in windows of size w=4
        w = int(state.get("window_size", 4))
        fingerprints = []
        if len(hashes) <= w:
            fingerprints = [min(hashes)] if hashes else []
        else:
            for i in range(len(hashes) - w + 1):
                window = hashes[i : i + w]
                min_val = min(window)
                if not fingerprints or fingerprints[-1] != min_val:
                    fingerprints.append(min_val)
        state["fingerprints"] = fingerprints
        state["fingerprint_count"] = len(fingerprints)
        return state

    def step5_metric(state: Dict[str, Any]) -> Dict[str, Any]:
        reference_hashes = set(state.get("reference_fingerprints", []))
        sample_hashes = set(state["fingerprints"])
        if not sample_hashes and not reference_hashes:
            jaccard = 1.0
        elif not sample_hashes or not reference_hashes:
            jaccard = 0.0
        else:
            intersection = len(sample_hashes.intersection(reference_hashes))
            union = len(sample_hashes.union(reference_hashes))
            jaccard = round(intersection / union, 4) if union > 0 else 0.0

        state["fingerprint_jaccard_similarity"] = jaccard
        state["is_above_threshold"] = bool(jaccard >= float(state.get("similarity_threshold", 0.30)))
        return state

    pipeline.add_step(
        ProceduralStep(
            step_id="STEP_NORMALIZE",
            name="Text Normalization & Case Folding",
            description="Converts text to lowercase and strips non-alphanumeric punctuation.",
            action=step1_normalize,
            preconditions=["raw_text"],
            postconditions=["normalized_text"],
        )
    )
    pipeline.add_step(
        ProceduralStep(
            step_id="STEP_TOKENIZE",
            name="Stopword Removal & Tokenization",
            description="Filters out high-frequency academic stopwords to isolate topical tokens.",
            action=step2_tokenize,
            preconditions=["normalized_text"],
            postconditions=["tokens", "token_count"],
        )
    )
    pipeline.add_step(
        ProceduralStep(
            step_id="STEP_SHINGLES",
            name="K-Shingle Sequence Extraction",
            description="Constructs contiguous n-gram word tuples of length k=3.",
            action=step3_shingles,
            preconditions=["tokens"],
            postconditions=["shingles", "shingle_count"],
        )
    )
    pipeline.add_step(
        ProceduralStep(
            step_id="STEP_FINGERPRINT",
            name="Winnowing Hash Fingerprint Selection",
            description="Computes MD5 integer digests and selects robust structural window minima.",
            action=step4_fingerprint,
            preconditions=["shingles"],
            postconditions=["fingerprints", "fingerprint_count"],
        )
    )
    pipeline.add_step(
        ProceduralStep(
            step_id="STEP_METRICS",
            name="Containment & Similarity Verification",
            description="Computes set-theoretic Jaccard coefficient against baseline literature fingerprints.",
            action=step5_metric,
            preconditions=["fingerprints"],
            postconditions=["fingerprint_jaccard_similarity", "is_above_threshold"],
        )
    )
    return pipeline


# ============================================================================
# CONCEPT 3: DECLARATIVE KNOWLEDGE
# ============================================================================

class Assertion:
    """
    Represents an atomic declarative fact:
        Subject - Predicate - Object
    with optional confidence score and provenance metadata.
    """

    def __init__(
        self,
        subject: str,
        predicate: str,
        obj: Any,
        confidence: float = 1.0,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.subject = str(subject)
        self.predicate = str(predicate)
        self.obj = obj
        self.confidence = float(confidence)
        self.metadata = metadata or {}

    def matches_pattern(self, pattern_subj: Optional[str], pattern_pred: Optional[str], pattern_obj: Optional[Any]) -> Optional[Dict[str, Any]]:
        """
        Pattern matching / unification:
        Variables start with '?' (e.g., '?x', '?paper').
        Returns variable binding dict if pattern matches, else None.
        """
        bindings: Dict[str, Any] = {}

        def match_element(pattern: Any, concrete: Any) -> bool:
            if pattern is None or pattern == "*":
                return True
            if isinstance(pattern, str) and pattern.startswith("?"):
                var_name = pattern[1:]
                if var_name in bindings:
                    return bindings[var_name] == concrete
                bindings[var_name] = concrete
                return True
            return pattern == concrete

        if not match_element(pattern_subj, self.subject):
            return None
        if not match_element(pattern_pred, self.predicate):
            return None
        if not match_element(pattern_obj, self.obj):
            return None

        return bindings

    def to_dict(self) -> Dict[str, Any]:
        return {
            "subject": self.subject,
            "predicate": self.predicate,
            "object": self.obj,
            "confidence": self.confidence,
            "metadata": self.metadata,
        }

    def __repr__(self) -> str:
        return f"Assertion({self.subject}, {self.predicate}, {self.obj})"


class DeclarativeFactBase:
    """
    Declarative Knowledge Store:
    Stores explicit facts independently of inference logic.
    Provides relational querying, unification pattern matching, and indexing.
    """

    def __init__(self, initial_assertions: Optional[List[Assertion]] = None):
        self.assertions: List[Assertion] = []
        if initial_assertions:
            for a in initial_assertions:
                self.assert_fact(a)

    def assert_fact(self, assertion: Assertion) -> bool:
        """Adds a fact to the knowledge base if not already present."""
        for existing in self.assertions:
            if (
                existing.subject == assertion.subject
                and existing.predicate == assertion.predicate
                and existing.obj == assertion.obj
            ):
                existing.confidence = max(existing.confidence, assertion.confidence)
                existing.metadata.update(assertion.metadata)
                return False  # Already exists, updated
        self.assertions.append(assertion)
        return True

    def retract_fact(self, subject: str, predicate: str, obj: Optional[Any] = None) -> int:
        """Removes matching facts from declarative memory."""
        before = len(self.assertions)
        self.assertions = [
            a for a in self.assertions
            if not (a.subject == subject and a.predicate == predicate and (obj is None or a.obj == obj))
        ]
        return before - len(self.assertions)

    def query(
        self,
        subject: Optional[str] = None,
        predicate: Optional[str] = None,
        obj: Optional[Any] = None,
    ) -> List[Dict[str, Any]]:
        """
        Relational pattern matching query.
        Variables starting with '?' will be bound and returned in results.
        """
        results: List[Dict[str, Any]] = []
        for assertion in self.assertions:
            bindings = assertion.matches_pattern(subject, predicate, obj)
            if bindings is not None:
                results.append({
                    "assertion": assertion.to_dict(),
                    "bindings": bindings,
                })
        return results

    def get_all_facts(self) -> List[Dict[str, Any]]:
        return [a.to_dict() for a in self.assertions]


def get_default_declarative_facts() -> DeclarativeFactBase:
    """Returns a rich set of declarative institutional facts."""
    kb = DeclarativeFactBase()
    facts = [
        Assertion("Nature_Paper_2024", "is_peer_reviewed", True, 1.0, {"impact_factor": 64.8}),
        Assertion("Nature_Paper_2024", "has_doi", "10.1038/s41586-024-0001", 1.0),
        Assertion("Nature_Paper_2024", "publication_year", 2024, 1.0),
        Assertion("Vaswani_2017", "is_peer_reviewed", True, 1.0, {"citations": 120000}),
        Assertion("Vaswani_2017", "domain", "natural_language_processing", 1.0),
        Assertion("Student_Submission_A", "cites", "Vaswani_2017", 1.0),
        Assertion("Student_Submission_A", "similarity_score", 0.42, 1.0),
        Assertion("Student_Submission_A", "author", "Alice Johnson", 1.0),
        Assertion("Student_Submission_A", "contains_quotes", False, 1.0),
        Assertion("Workshop_Paper_2023", "author", "Alice Johnson", 1.0),
        Assertion("Workshop_Paper_2023", "is_prior_publication", True, 1.0),
        Assertion("Student_Submission_B", "cites", "Nature_Paper_2024", 1.0),
        Assertion("Student_Submission_B", "similarity_score", 0.08, 1.0),
        Assertion("Student_Submission_B", "author", "Bob Smith", 1.0),
        Assertion("Student_Submission_B", "contains_quotes", True, 1.0),
    ]
    for f in facts:
        kb.assert_fact(f)
    return kb


# ============================================================================
# CONCEPT 11: RULE-BASED SYSTEMS (UNIFIED PRODUCTION SYSTEM)
# ============================================================================

class ProductionSystem:
    """
    Complete Classic Production System uniting:
    1. Working Memory (Fact Base with active assertions & state)
    2. Rule Base (Catalog of Production Rules)
    3. Conflict Resolution Selector (Priority, Specificity, Recency, FIFO)
    4. Inference Engine (Forward Chaining & Backward Chaining hooks)
    5. Explanation Facility ('HOW' and 'WHY' audits)
    6. Rule Base Validator (Detects dead ends, contradictions, cyclic rules)
    """

    def __init__(
        self,
        rules: Optional[List[ProductionRule]] = None,
        working_memory: Optional[Set[str]] = None,
    ):
        self.rules: List[ProductionRule] = rules or get_academic_integrity_rule_catalog()
        self.working_memory: Set[str] = set(working_memory) if working_memory else set()
        self.procedural_pipeline: ProceduralWorkflow = build_academic_sanitization_and_fingerprint_pipeline()
        self.declarative_kb: DeclarativeFactBase = get_default_declarative_facts()

    def reset_working_memory(self, facts: Optional[List[str]] = None) -> None:
        self.working_memory = set(facts) if facts else set()

    def add_fact(self, fact: str) -> None:
        self.working_memory.add(fact)

    def validate_rule_base(self) -> Dict[str, Any]:
        """
        Validates rule integrity:
        - Detects unreachable rules (conditions can never be satisfied)
        - Detects conflicting rules (identical conditions producing opposite conclusions)
        - Detects direct cycle dependencies (A -> B and B -> A)
        """
        all_conclusions = {r.conclusion for r in self.rules}
        unreachable_rules: List[Dict[str, Any]] = []
        contradictory_rules: List[Dict[str, Any]] = []
        cycles_detected: List[Dict[str, Any]] = []

        # 1. Potential dead-end rules (require conditions never asserted as conclusions and not in common fact catalog)
        common_initial_facts = {
            "TEXTUAL_SIMILARITY_HIGH", "QUOTATION_MARKS_ABSENT", "CITATION_ABSENT",
            "PARAPHRASE_HIGH", "SOURCE_STRUCTURE_MIRRORED", "TOPICAL_OVERLAP_HIGH",
            "BIBLIOGRAPHY_ENTRY_MISSING", "OVERLAP_UNDER_QUOTA", "QUOTATION_MARKS_PRESENT",
            "PROPER_ATTRIBUTION_PRESENT", "AUTHOR_IDENTITY_MATCHES", "PRIOR_WORK_PROPERLY_DISCLOSED"
        }
        all_possible_facts = all_conclusions.union(common_initial_facts)

        for r in self.rules:
            unsolvable_conditions = [c for c in r.conditions if c not in all_possible_facts]
            if unsolvable_conditions:
                unreachable_rules.append({
                    "rule_id": r.rule_id,
                    "name": r.name,
                    "unsolvable_conditions": unsolvable_conditions,
                })

        # 2. Conflicting rules (same conditions, differing conclusions)
        for i, r1 in enumerate(self.rules):
            for r2 in self.rules[i + 1 :]:
                if r1.conditions == r2.conditions and r1.conclusion != r2.conclusion:
                    contradictory_rules.append({
                        "rule_1": r1.rule_id,
                        "rule_2": r2.rule_id,
                        "conditions": sorted(list(r1.conditions)),
                        "conclusions": [r1.conclusion, r2.conclusion],
                    })

        # 3. Direct cycles
        for r1 in self.rules:
            for r2 in self.rules:
                if r1.rule_id != r2.rule_id:
                    if r1.conclusion in r2.conditions and r2.conclusion in r1.conditions:
                        cycles_detected.append({
                            "rule_pair": [r1.rule_id, r2.rule_id],
                            "cycle": f"{r1.rule_id} -> {r1.conclusion} -> {r2.rule_id} -> {r2.conclusion}",
                        })

        return {
            "total_rules": len(self.rules),
            "is_valid": len(contradictory_rules) == 0 and len(cycles_detected) == 0,
            "unreachable_rules": unreachable_rules,
            "contradictory_rules": contradictory_rules,
            "cycles_detected": cycles_detected,
        }

    def explain_conclusion_how(self, target_fact: str, history_trace: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Explanation Facility: 'HOW' query.
        Explains how a specific conclusion was derived from working memory.
        """
        matching_steps = [s for s in history_trace if s.get("derived_fact") == target_fact]
        if not matching_steps:
            return {
                "fact": target_fact,
                "proven": False,
                "explanation": f"The fact '{target_fact}' was not derived during the inference session.",
            }

        step = matching_steps[0]
        return {
            "fact": target_fact,
            "proven": True,
            "derived_at_step": step.get("step"),
            "rule_id": step.get("rule_id"),
            "rule_name": step.get("rule_name"),
            "matched_conditions": step.get("matched_conditions"),
            "explanation": step.get("explanation"),
            "policy_reference": step.get("policy_reference"),
        }

    def explain_subgoal_why(self, subgoal: str, parent_goal: str, rule: ProductionRule) -> Dict[str, Any]:
        """
        Explanation Facility: 'WHY' query.
        Explains why the system is asking or checking a particular subgoal.
        """
        return {
            "subgoal": subgoal,
            "parent_goal": parent_goal,
            "rule_id": rule.rule_id,
            "rule_name": rule.name,
            "justification": f"Evaluating '{subgoal}' is required by rule {rule.rule_id} ('{rule.name}') to establish the higher-level goal '{parent_goal}'.",
            "policy_reference": rule.policy_reference,
        }

    def run_advisory_audit(self, observed_facts: List[str], target_goal: Optional[str] = None) -> Dict[str, Any]:
        """
        Runs an end-to-end institutional academic integrity audit using both
        forward deduction and backward goal verification.
        """
        from .forward_chaining import ForwardChainingEngine
        from .backward_chaining import BackwardChainingEngine

        fw_engine = ForwardChainingEngine(self.rules)
        fw_result = fw_engine.infer(observed_facts, conflict_strategy="priority")

        goal = target_goal or "REQUIRES_ACADEMIC_INTEGRITY_HEARING"
        bw_engine = BackwardChainingEngine(self.rules)
        bw_result = bw_engine.prove(goal, observed_facts)

        audit_verdict = "CLEARANCE_OR_MINOR_REVISION"
        if "REQUIRES_ACADEMIC_INTEGRITY_HEARING" in fw_result["derived_facts"]:
            audit_verdict = "FORMAL_HEARING_MANDATED"
        elif "MANDATORY_CITATION_REVISION" in fw_result["derived_facts"]:
            audit_verdict = "MANDATORY_CITATION_REVISION"
        elif "FAIR_USE_EXEMPTION_GRANTED" in fw_result["derived_facts"]:
            audit_verdict = "ETHICAL_FAIR_USE_VERIFIED"

        return {
            "observed_facts": observed_facts,
            "audit_verdict": audit_verdict,
            "forward_derivation": fw_result,
            "backward_proof": bw_result,
            "rule_validation": self.validate_rule_base(),
            "timestamp": time.time(),
        }
