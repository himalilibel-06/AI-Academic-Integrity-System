"""
GapGuard AI — Manuscript Revision Comparison Service

Phase 10A: Deterministic field-by-field difference analysis between manuscript versions
belonging to the same research project.

IMPORTANT ARCHITECTURAL & ETHICAL INVARIANTS:
1. Compares manuscript versions strictly within the SAME Research Project.
2. Evaluates 13 core academic research fields using deterministic difference metrics.
3. Allowed field change statuses:
   - "Unchanged"
   - "Added"
   - "Modified"
   - "Removed"
   - "Not Available"
4. Identifies itemized list changes (added_items, removed_items, retained_items) for
   major_claims, references, keywords, and evaluation_metrics.
5. Emits neutral descriptive statements only; NEVER claims a revision is "better",
   "worse", "scientifically valid", or "publication ready".
"""

from typing import Any, Dict, List, Optional, Tuple, Set
import difflib
import re


REVISION_DISCLAIMER = (
    "Manuscript revision comparison is descriptive only. It identifies textual and structural "
    "differences between manuscript drafts and does not evaluate scientific validity, "
    "argument quality, or publication readiness."
)

STATUS_UNCHANGED = "Unchanged"
STATUS_ADDED = "Added"
STATUS_MODIFIED = "Modified"
STATUS_REMOVED = "Removed"
STATUS_NOT_AVAILABLE = "Not Available"

CORE_FIELDS = [
    "title",
    "abstract",
    "keywords",
    "research_problem",
    "research_objective",
    "research_question",
    "claimed_research_gap",
    "proposed_method",
    "dataset_context",
    "expected_contribution",
    "evaluation_metrics",
    "major_claims",
    "references",
]

LIST_FIELDS = {
    "keywords",
    "evaluation_metrics",
    "major_claims",
    "references",
}


def _extract_field_content(raw_value: Any) -> Any:
    """Normalize extracted field value into string or list of strings."""
    if raw_value is None:
        return None

    if isinstance(raw_value, dict):
        if "items" in raw_value and isinstance(raw_value["items"], list):
            items = [str(x).strip() for x in raw_value["items"] if x is not None and str(x).strip()]
            return items if items else None
        if "text" in raw_value:
            text = raw_value["text"]
            return str(text).strip() if text is not None and str(text).strip() else None

    if isinstance(raw_value, (list, tuple)):
        items = [str(x).strip() for x in raw_value if x is not None and str(x).strip()]
        return items if items else None

    if isinstance(raw_value, str):
        clean = raw_value.strip()
        return clean if clean else None

    clean = str(raw_value).strip()
    return clean if clean else None


def _normalize_string(val: Optional[str]) -> str:
    """Lowercase and normalize whitespace for deterministic comparison."""
    if not val:
        return ""
    return re.sub(r"\s+", " ", str(val).strip().lower())


def _compare_text_field(prev_val: Optional[str], new_val: Optional[str]) -> Dict[str, Any]:
    """Compare single text field deterministically."""
    prev_str = str(prev_val).strip() if prev_val is not None else ""
    new_str = str(new_val).strip() if new_val is not None else ""

    norm_prev = _normalize_string(prev_str)
    norm_new = _normalize_string(new_str)

    if not norm_prev and not norm_new:
        return {
            "previous_value": None,
            "new_value": None,
            "change_status": STATUS_NOT_AVAILABLE,
            "similarity": 1.0,
            "description": "Field not available in either manuscript version.",
        }

    if not norm_prev and norm_new:
        return {
            "previous_value": None,
            "new_value": new_str,
            "change_status": STATUS_ADDED,
            "similarity": 0.0,
            "description": "Field added in new manuscript version.",
        }

    if norm_prev and not norm_new:
        return {
            "previous_value": prev_str,
            "new_value": None,
            "change_status": STATUS_REMOVED,
            "similarity": 0.0,
            "description": "Field removed in new manuscript version.",
        }

    # Both values present
    if norm_prev == norm_new:
        return {
            "previous_value": prev_str,
            "new_value": new_str,
            "change_status": STATUS_UNCHANGED,
            "similarity": 1.0,
            "description": "Field unchanged between manuscript versions.",
        }

    sim = round(difflib.SequenceMatcher(None, norm_prev, norm_new).ratio(), 4)
    return {
        "previous_value": prev_str,
        "new_value": new_str,
        "change_status": STATUS_MODIFIED,
        "similarity": sim,
        "description": f"Field modified between versions (textual similarity: {sim:.2f}).",
    }


def _compare_list_field(prev_items: Optional[List[str]], new_items: Optional[List[str]]) -> Dict[str, Any]:
    """Compare list field with itemized added/removed/retained tracking."""
    prev_list = prev_items if isinstance(prev_items, list) else ([str(prev_items)] if prev_items else [])
    new_list = new_items if isinstance(new_items, list) else ([str(new_items)] if new_items else [])

    norm_prev_map = {_normalize_string(x): x for x in prev_list if x and str(x).strip()}
    norm_new_map = {_normalize_string(x): x for x in new_list if x and str(x).strip()}

    prev_keys = set(norm_prev_map.keys())
    new_keys = set(norm_new_map.keys())

    if not prev_keys and not new_keys:
        return {
            "previous_value": [],
            "new_value": [],
            "change_status": STATUS_NOT_AVAILABLE,
            "added_items": [],
            "removed_items": [],
            "retained_items": [],
            "similarity": 1.0,
            "description": "List field not available in either manuscript version.",
        }

    if not prev_keys and new_keys:
        return {
            "previous_value": [],
            "new_value": new_list,
            "change_status": STATUS_ADDED,
            "added_items": new_list,
            "removed_items": [],
            "retained_items": [],
            "similarity": 0.0,
            "description": f"List field added with {len(new_list)} item(s).",
        }

    if prev_keys and not new_keys:
        return {
            "previous_value": prev_list,
            "new_value": [],
            "change_status": STATUS_REMOVED,
            "added_items": [],
            "removed_items": prev_list,
            "retained_items": [],
            "similarity": 0.0,
            "description": f"List field removed ({len(prev_list)} previous item(s)).",
        }

    retained_keys = prev_keys.intersection(new_keys)
    added_keys = new_keys - prev_keys
    removed_keys = prev_keys - new_keys

    added_items = [norm_new_map[k] for k in added_keys]
    removed_items = [norm_prev_map[k] for k in removed_keys]
    retained_items = [norm_new_map[k] for k in retained_keys]

    union_len = len(prev_keys.union(new_keys))
    jaccard_sim = round(len(retained_keys) / union_len, 4) if union_len > 0 else 1.0

    if not added_keys and not removed_keys:
        change_status = STATUS_UNCHANGED
        desc = f"All {len(retained_items)} item(s) retained without modification."
    else:
        change_status = STATUS_MODIFIED
        desc = (
            f"List modified: {len(added_items)} item(s) added, "
            f"{len(removed_items)} removed, {len(retained_items)} retained."
        )

    return {
        "previous_value": prev_list,
        "new_value": new_list,
        "change_status": change_status,
        "added_items": added_items,
        "removed_items": removed_items,
        "retained_items": retained_items,
        "similarity": jaccard_sim,
        "description": desc,
    }


class RevisionComparatorService:
    """
    Compares two manuscript versions belonging to the same Research Project.
    """

    def compare_revisions(
        self,
        previous_info: Optional[Dict[str, Any]],
        new_info: Optional[Dict[str, Any]],
        previous_project_id: Optional[str] = None,
        new_project_id: Optional[str] = None,
        previous_version_label: str = "Version 1",
        new_version_label: str = "Version 2",
    ) -> Dict[str, Any]:
        """
        Compare 13 core academic fields between two manuscript versions.

        Enforces project boundary: previous_project_id and new_project_id
        must match if both are specified.
        """
        # Enforce same-project constraint
        if previous_project_id and new_project_id and str(previous_project_id).strip() != str(new_project_id).strip():
            raise ValueError(
                f"Manuscript revision comparison requires both versions to belong to the same research project. "
                f"Received project '{previous_project_id}' and project '{new_project_id}'."
            )

        prev_dict = previous_info or {}
        new_dict = new_info or {}

        field_comparisons: Dict[str, Dict[str, Any]] = {}
        counts = {
            STATUS_UNCHANGED: 0,
            STATUS_ADDED: 0,
            STATUS_MODIFIED: 0,
            STATUS_REMOVED: 0,
            STATUS_NOT_AVAILABLE: 0,
        }

        changed_research_fields: List[str] = []

        # Execute field comparisons
        for field in CORE_FIELDS:
            raw_prev = _extract_field_content(prev_dict.get(field))
            raw_new = _extract_field_content(new_dict.get(field))

            if field in LIST_FIELDS:
                comp = _compare_list_field(raw_prev, raw_new)
            else:
                comp = _compare_text_field(raw_prev, raw_new)

            field_comparisons[field] = comp
            st = comp["change_status"]
            counts[st] += 1

            if st in (STATUS_MODIFIED, STATUS_ADDED, STATUS_REMOVED):
                changed_research_fields.append(field)

        # Detect specific research field changes
        gap_changed = "claimed_research_gap" in changed_research_fields
        method_changed = "proposed_method" in changed_research_fields
        contrib_changed = "expected_contribution" in changed_research_fields
        problem_changed = "research_problem" in changed_research_fields
        objective_changed = "research_objective" in changed_research_fields
        rq_changed = "research_question" in changed_research_fields
        metrics_changed = "evaluation_metrics" in changed_research_fields
        claims_changed = "major_claims" in changed_research_fields

        # Deterministic Revision Priority Guidance
        guidance: List[str] = []
        if gap_changed:
            guidance.append("Re-run Gap Analysis after reviewing the revised gap formulation.")
        if method_changed:
            guidance.append("Re-run Contribution Differentiation after reviewing the revised method.")
        if contrib_changed:
            guidance.append("Re-run Contribution Differentiation to compare revised contribution boundaries.")
        if claims_changed:
            guidance.append("Re-run Evidence Coverage after reviewing the revised claims.")
        if problem_changed:
            guidance.append("Re-run Literature Retrieval with the updated problem formulation.")
        if not guidance:
            guidance.append("No major research-information changes detected between these manuscript drafts.")

        # Key research changes descriptive summary
        key_change_notes: List[str] = []
        if problem_changed:
            key_change_notes.append("The research problem formulation changed between versions.")
        if objective_changed:
            key_change_notes.append("The stated research objectives changed between versions.")
        if rq_changed:
            key_change_notes.append("The research questions were modified between versions.")
        if gap_changed:
            key_change_notes.append("The claimed research gap changed between versions.")
        if method_changed:
            key_change_notes.append("The proposed methodology changed between versions.")
        if contrib_changed:
            key_change_notes.append("The expected contributions were revised between versions.")
        if metrics_changed:
            key_change_notes.append("Evaluation metrics changed between versions.")
        if claims_changed:
            key_change_notes.append("Major author claims changed between versions.")

        revision_summary = {
            "previous_version": previous_version_label,
            "new_version": new_version_label,
            "total_fields_compared": len(CORE_FIELDS),
            "fields_unchanged": counts[STATUS_UNCHANGED],
            "fields_modified": counts[STATUS_MODIFIED],
            "fields_added": counts[STATUS_ADDED],
            "fields_removed": counts[STATUS_REMOVED],
            "fields_unavailable": counts[STATUS_NOT_AVAILABLE],
            "changed_fields_count": len(changed_research_fields),
            "changed_research_fields": changed_research_fields,
            "key_change_flags": {
                "research_problem_changed": problem_changed,
                "research_objective_changed": objective_changed,
                "research_question_changed": rq_changed,
                "claimed_research_gap_changed": gap_changed,
                "proposed_method_changed": method_changed,
                "expected_contribution_changed": contrib_changed,
                "evaluation_metrics_changed": metrics_changed,
                "major_claims_changed": claims_changed,
            },
            "key_change_notes": key_change_notes,
        }

        return {
            "project_id": previous_project_id or new_project_id,
            "revision_summary": revision_summary,
            "field_comparisons": field_comparisons,
            "priority_guidance": guidance,
            "disclaimer": REVISION_DISCLAIMER,
        }


# Global singleton instance
revision_comparator_service = RevisionComparatorService()
