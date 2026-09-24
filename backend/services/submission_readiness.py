"""
GapGuard AI — Submission Readiness Report Service

Phase 10B: Aggregates existing analysis results into an explainable,
structured research-review dashboard.

IMPORTANT ARCHITECTURAL & ETHICAL GUARDRAILS:
1. This is NOT a prediction of publication acceptance.
2. It does NOT claim:
   - the research is valid
   - the research is novel
   - the research is publication-ready
   - the manuscript will be accepted
   - the research gap is scientifically proven
3. It does NOT compute:
   - a "readiness score"
   - a "publication probability"
   - a "readiness percentage"
   - a "scientific score"
   - a "contribution score"
4. Permitted status vocabulary:
   - "Available"
   - "Not Run"
   - "Insufficient Evidence"
   - "Review Recommended"
5. Always includes the mandatory Corpus Limitation warning.
6. Reuses existing services without duplicating their algorithms.
"""

from typing import Any, Dict, List, Optional
import re

from services.gap_analyzer import gap_analyzer
from services.contribution_differentiator import contribution_differentiator
from services.evidence_coverage import evidence_coverage_service
from services.revision_comparator import revision_comparator_service, REVISION_DISCLAIMER
from services.bayesian_reasoner import bayesian_reasoner_service
from services.rule_engine import rule_engine_service
from services.literature_corpus import literature_corpus
from services.literature_retrieval import literature_retriever


# Mandatory Corpus Limitation Warning (Exact wording required by Phase 10B specification)
CORPUS_LIMITATION_WARNING = (
    "This report is based only on the literature currently available in the GapGuard corpus. "
    "It does not establish global literature coverage, scientific truth, or research novelty. "
    "Human academic review is required."
)

# Allowed Analysis Review Statuses
STATUS_AVAILABLE = "Available"
STATUS_NOT_RUN = "Not Run"
STATUS_INSUFFICIENT = "Insufficient Evidence"
STATUS_REVIEW_RECOMMENDED = "Review Recommended"

# Actionable Review Checklist Template (Educational review tasks, NOT automatic pass/fail)
DEFAULT_REVIEW_CHECKLIST = [
    {
        "id": "chk_gap_literature",
        "task": "Research gap reviewed against available literature",
        "category": "Research Gap Review",
        "default_guidance": "Examine whether the claimed missing area has been addressed in prior published literature.",
    },
    {
        "id": "chk_contradictory_evidence",
        "task": "Potentially contradictory evidence reviewed",
        "category": "Research Gap Review",
        "default_guidance": "Carefully inspect any literature showing overlapping contributions to verify differentiating factors.",
    },
    {
        "id": "chk_contribution_differentiation",
        "task": "Proposed contribution differentiated from relevant literature",
        "category": "Contribution Review",
        "default_guidance": "Confirm that problem scope, methodology, dataset, and evaluation distinctively set this work apart.",
    },
    {
        "id": "chk_major_claims_evidence",
        "task": "Major claims reviewed against available evidence",
        "category": "Evidence Coverage",
        "default_guidance": "Verify that every major research claim has contextual or direct corroboration in literature.",
    },
    {
        "id": "chk_unsupported_claims",
        "task": "Insufficient-evidence claims reviewed",
        "category": "Evidence Coverage",
        "default_guidance": "Gather additional published literature or clarify scope for any claims lacking corpus evidence.",
    },
    {
        "id": "chk_evaluation_metrics",
        "task": "Evaluation metrics reviewed",
        "category": "Methodology & Evaluation",
        "default_guidance": "Check that evaluation metrics align with established benchmarks and standards in the subfield.",
    },
    {
        "id": "chk_references_reviewed",
        "task": "References reviewed",
        "category": "Scholarly Foundation",
        "default_guidance": "Ensure all critical prior works and benchmark baselines are accurately cited.",
    },
    {
        "id": "chk_revision_reanalyzed",
        "task": "Revised manuscript re-analyzed if changes were made",
        "category": "Revision Review",
        "default_guidance": "Re-run gap and contribution analysis if core claims or methods changed between drafts.",
    },
    {
        "id": "chk_human_academic_review",
        "task": "Human academic review completed",
        "category": "Academic Integrity",
        "default_guidance": "Conduct faculty, advisor, or peer review prior to official conference or journal submission.",
    },
]


def _clean_str(val: Any) -> str:
    """Helper to return stripped clean string."""
    if val is None:
        return ""
    if isinstance(val, str):
        return val.strip()
    return str(val).strip()


class SubmissionReadinessService:
    """
    Focused aggregation service that compiles existing GapGuard AI analyses
    into an explainable, structured Submission Readiness Report.
    """

    def __init__(self):
        self.corpus_service = literature_corpus
        self.retriever = literature_retriever
        self.gap_service = gap_analyzer
        self.contrib_service = contribution_differentiator
        self.coverage_service = evidence_coverage_service
        self.revision_service = revision_comparator_service
        self.bayesian_service = bayesian_reasoner_service
        self.rule_service = rule_engine_service

    def build_report(
        self,
        research_information: Optional[Dict[str, Any]] = None,
        gap_analysis: Optional[Dict[str, Any]] = None,
        contribution_analysis: Optional[Dict[str, Any]] = None,
        evidence_coverage: Optional[Dict[str, Any]] = None,
        reasoning_analysis: Optional[Dict[str, Any]] = None,
        revision_comparison: Optional[Dict[str, Any]] = None,
        previous_research_info: Optional[Dict[str, Any]] = None,
        claims: Optional[List[Any]] = None,
        project_id: Optional[str] = None,
        manuscript_id: Optional[str] = None,
        previous_manuscript_id: Optional[str] = None,
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """
        Aggregate existing analyses into an explainable, unified Submission Readiness Report.
        Reuses existing services; does not duplicate algorithms.
        """
        info = research_information or {}
        prev_info = previous_research_info

        # -------------------------------------------------------------
        # Part 3: Aggregate / Execute Research Gap Review
        # -------------------------------------------------------------
        gap_review = self._aggregate_gap_review(
            gap_analysis=gap_analysis,
            research_info=info,
            top_k=top_k,
        )

        # -------------------------------------------------------------
        # Part 4: Aggregate / Execute Contribution Differentiation Review
        # -------------------------------------------------------------
        contrib_review = self._aggregate_contribution_review(
            contribution_analysis=contribution_analysis,
            research_info=info,
            top_k=top_k,
        )

        # -------------------------------------------------------------
        # Part 5: Aggregate / Execute Evidence Coverage Review
        # -------------------------------------------------------------
        coverage_review, claim_review_items = self._aggregate_evidence_coverage_and_claims(
            evidence_coverage=evidence_coverage,
            claims=claims,
            research_info=info,
            top_k=top_k,
        )

        # -------------------------------------------------------------
        # Part 7: Aggregate / Execute Revision Review
        # -------------------------------------------------------------
        revision_review = self._aggregate_revision_review(
            revision_comparison=revision_comparison,
            previous_info=prev_info,
            current_info=info,
            project_id=project_id,
        )

        # -------------------------------------------------------------
        # Rule-Based / Bayesian Reasoning Aggregation
        # -------------------------------------------------------------
        reasoning_review = self._aggregate_reasoning_review(
            reasoning_analysis=reasoning_analysis,
            gap_result=gap_review.get("raw_result"),
            contrib_result=contrib_review.get("raw_result"),
            research_info=info,
        )

        # -------------------------------------------------------------
        # Part 8: Corpus / Evidence Limitations
        # -------------------------------------------------------------
        corpus_limitations = self._build_corpus_limitations()

        # -------------------------------------------------------------
        # Part 9: Review Checklist
        # -------------------------------------------------------------
        review_checklist = self._build_review_checklist(
            gap_review=gap_review,
            contrib_review=contrib_review,
            coverage_review=coverage_review,
            revision_review=revision_review,
        )

        # -------------------------------------------------------------
        # Overall Review Summary (Status summary without a single score)
        # -------------------------------------------------------------
        overall_summary = self._build_overall_summary(
            gap_review=gap_review,
            contrib_review=contrib_review,
            coverage_review=coverage_review,
            revision_review=revision_review,
            reasoning_review=reasoning_review,
        )

        # Clean internal raw result references before returning JSON
        gap_clean = {k: v for k, v in gap_review.items() if k != "raw_result"}
        contrib_clean = {k: v for k, v in contrib_review.items() if k != "raw_result"}

        return {
            "success": True,
            "project_id": project_id,
            "manuscript_id": manuscript_id,
            "previous_manuscript_id": previous_manuscript_id,
            "overall_summary": overall_summary,
            "gap_review": gap_clean,
            "contribution_review": contrib_clean,
            "evidence_coverage_review": coverage_review,
            "research_claim_review": claim_review_items,
            "revision_review": revision_review,
            "reasoning_review": reasoning_review,
            "corpus_limitation": corpus_limitations,
            "review_checklist": review_checklist,
            "academic_guardrail": (
                "This report provides structured pre-submission academic review guidance. "
                "It does not evaluate scientific validity or predict publication outcomes. "
                "No readiness score or publication likelihood estimate is generated."
            ),
        }

    # -------------------------------------------------------------------------
    # PART 3: Research Gap Review Aggregation
    # -------------------------------------------------------------------------
    def _aggregate_gap_review(
        self,
        gap_analysis: Optional[Dict[str, Any]],
        research_info: Dict[str, Any],
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """Aggregate or run Phase 6 Research Gap Contradiction Checker."""
        res = gap_analysis

        # Attempt to run gap analysis if not pre-computed but gap information is present
        if not res and research_info:
            claimed_gap = _clean_str(research_info.get("claimed_research_gap"))
            if claimed_gap:
                try:
                    evidence_papers = self.retriever.retrieve(
                        research_information=research_info,
                        top_k=top_k,
                    )
                    res = self.gap_service.analyze_gap(
                        research_info=research_info,
                        evidence_papers=evidence_papers,
                    )
                except Exception:
                    res = None

        if not res or not isinstance(res, dict):
            return {
                "analysis_status": STATUS_NOT_RUN,
                "current_status": "Not Run",
                "supporting_evidence_count": 0,
                "partial_evidence_count": 0,
                "potentially_contradictory_evidence_count": 0,
                "insufficient_evidence_count": 0,
                "evidence_count": 0,
                "important_findings": [],
                "reason": "Gap contradiction analysis was not executed because claimed research gap data was not provided.",
                "recommended_action": "Provide a claimed research gap to execute research gap contradiction analysis.",
                "raw_result": None,
            }

        overall_ass = res.get("overall_assessment", {})
        raw_status = (
            overall_ass.get("status")
            or overall_ass.get("overall_status")
            or "Insufficient Evidence"
        )

        supporting = int(overall_ass.get("supporting", overall_ass.get("supporting_papers", 0)))
        partial = int(overall_ass.get("partial", overall_ass.get("partial_papers", 0)))
        contradicted = int(overall_ass.get("potentially_contradicted", overall_ass.get("potentially_contradicting_papers", 0)))
        insufficient = int(overall_ass.get("insufficient", overall_ass.get("insufficient_papers", 0)))
        total_ev = int(overall_ass.get("evidence_count", len(res.get("paper_analyses", []))))

        # Preserve existing "Partially Supported" status when mixed supporting and contradictory evidence exists
        current_status = raw_status
        if contradicted > 0 and supporting > 0:
            current_status = "Partially Supported"

        # Deterministic Recommended Action based on exact specifications
        if contradicted > 0 and supporting == 0:
            recommended_action = "Review the potentially contradictory literature before finalizing the claimed gap."
            analysis_status = STATUS_REVIEW_RECOMMENDED
        elif contradicted > 0 and supporting > 0:
            recommended_action = "Review both supporting and potentially contradictory evidence."
            analysis_status = STATUS_REVIEW_RECOMMENDED
        elif current_status == "Insufficient Evidence" or total_ev == 0:
            recommended_action = "Expand or review the available literature corpus."
            analysis_status = STATUS_INSUFFICIENT
        elif current_status == "Supported by Available Evidence":
            recommended_action = "Review the cited evidence and confirm the interpretation academically."
            analysis_status = STATUS_AVAILABLE
        else:
            # Partially Supported
            recommended_action = "Review both supporting and potentially contradictory evidence."
            analysis_status = STATUS_REVIEW_RECOMMENDED

        # Extract important findings from paper analyses
        important_findings: List[str] = []
        paper_analyses = res.get("paper_analyses", [])
        for p in paper_analyses:
            rel = p.get("evidence_relationship")
            title = p.get("title", "Untitled Paper")
            if rel == "Potentially Contradicted":
                important_findings.append(f"Potentially contradictory evidence in '{title}': {p.get('reason', '')[:180]}")
            elif rel == "Supported by Available Evidence" and len(important_findings) < 3:
                important_findings.append(f"Corroborating limitation documented in '{title}': {p.get('reason', '')[:180]}")

        if not important_findings and total_ev > 0:
            important_findings.append(f"Evaluated {total_ev} literature paper(s) from the available corpus.")

        reason = (
            f"Gap analysis identified {supporting} supporting, {partial} partial, and {contradicted} "
            f"potentially contradictory paper(s) out of {total_ev} retrieved corpus paper(s)."
        )

        return {
            "analysis_status": analysis_status,
            "current_status": current_status,
            "supporting_evidence_count": supporting,
            "partial_evidence_count": partial,
            "potentially_contradictory_evidence_count": contradicted,
            "insufficient_evidence_count": insufficient,
            "evidence_count": total_ev,
            "important_findings": important_findings[:4],
            "reason": reason,
            "recommended_action": recommended_action,
            "raw_result": res,
        }

    # -------------------------------------------------------------------------
    # PART 4: Contribution Differentiation Review Aggregation
    # -------------------------------------------------------------------------
    def _aggregate_contribution_review(
        self,
        contribution_analysis: Optional[Dict[str, Any]],
        research_info: Dict[str, Any],
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """Aggregate or run Phase 7 Contribution Differentiation."""
        res = contribution_analysis

        if not res and research_info:
            has_contrib = bool(_clean_str(research_info.get("expected_contribution")))
            has_prob = bool(_clean_str(research_info.get("research_problem")))
            if has_contrib or has_prob:
                try:
                    evidence_papers = self.retriever.retrieve(
                        research_information=research_info,
                        top_k=top_k,
                    )
                    res = self.contrib_service.analyze_project_differentiation(
                        research_info=research_info,
                        evidence_papers=evidence_papers,
                    )
                except Exception:
                    res = None

        if not res or not isinstance(res, dict):
            return {
                "analysis_status": STATUS_NOT_RUN,
                "current_status": "Not Run",
                "number_of_papers_analyzed": 0,
                "clearly_differentiated_count": 0,
                "partially_differentiated_count": 0,
                "needs_clarification_count": 0,
                "potential_overlap_count": 0,
                "relevant_overlap_dimensions": [],
                "important_dimensional_overlaps": [],
                "important_findings": [],
                "reason": "Contribution differentiation was not executed because contribution data was not provided.",
                "recommended_action": "Provide expected contribution or research problem to execute contribution differentiation.",
                "raw_result": None,
            }

        proj_summary = res.get("project_summary", {})
        total_compared = int(proj_summary.get("total_papers_compared", len(res.get("paper_analyses", []))))
        c_diff = int(proj_summary.get("clearly_differentiated_count", 0))
        c_part = int(proj_summary.get("partially_differentiated_count", 0))
        c_clar = int(proj_summary.get("needs_clarification_count", 0))
        c_over = int(proj_summary.get("potential_overlap_count", 0))

        # Derive overall contribution status preserving existing statuses:
        # "Clearly Differentiated", "Partially Differentiated", "Needs Clarification", "Potential Overlap"
        if total_compared == 0:
            current_status = "Insufficient Evidence"
            recommended_action = "Expand or review the available literature corpus."
            analysis_status = STATUS_INSUFFICIENT
        elif c_over > 0:
            current_status = "Potential Overlap"
            recommended_action = "Review the overlapping literature and clarify how the proposed contribution differs."
            analysis_status = STATUS_REVIEW_RECOMMENDED
        elif c_clar > 0:
            current_status = "Needs Clarification"
            recommended_action = "Complete the missing research contribution information."
            analysis_status = STATUS_REVIEW_RECOMMENDED
        elif c_part > 0 and c_diff < (total_compared // 2):
            current_status = "Partially Differentiated"
            recommended_action = "Clarify the dimensions where overlap was detected."
            analysis_status = STATUS_REVIEW_RECOMMENDED
        else:
            current_status = "Clearly Differentiated"
            recommended_action = "Review the comparison evidence and confirm the distinction academically."
            analysis_status = STATUS_AVAILABLE

        # Extract dimensional overlaps
        strongest_dims = proj_summary.get("strongest_overlapping_dimensions", [])
        important_dimensional_overlaps = [
            {
                "dimension": d.get("dimension", ""),
                "average_score": d.get("average_score", 0.0),
            }
            for d in strongest_dims[:3]
        ]
        relevant_overlap_dims = [d.get("dimension", "") for d in strongest_dims if d.get("average_score", 0) > 0.15]

        # Extract important findings (highest overlap papers)
        important_findings: List[str] = []
        for p in proj_summary.get("highest_overlap_papers", []):
            title = p.get("title", "Literature Paper")
            cls = p.get("classification", "")
            important_findings.append(f"{cls} detected with '{title}' (composite overlap: {p.get('composite_overlap', 0):.2f})")

        reason = proj_summary.get("summary_text") or (
            f"Compared against {total_compared} corpus paper(s): {c_diff} clearly differentiated, "
            f"{c_part} partially differentiated, {c_over} potential overlap(s)."
        )

        return {
            "analysis_status": analysis_status,
            "current_status": current_status,
            "number_of_papers_analyzed": total_compared,
            "clearly_differentiated_count": c_diff,
            "partially_differentiated_count": c_part,
            "needs_clarification_count": c_clar,
            "potential_overlap_count": c_over,
            "relevant_overlap_dimensions": relevant_overlap_dims,
            "important_dimensional_overlaps": important_dimensional_overlaps,
            "important_findings": important_findings,
            "reason": reason,
            "recommended_action": recommended_action,
            "raw_result": res,
        }

    # -------------------------------------------------------------------------
    # PART 5 & PART 6: Evidence Coverage & Research Claim Review
    # -------------------------------------------------------------------------
    def _aggregate_evidence_coverage_and_claims(
        self,
        evidence_coverage: Optional[Dict[str, Any]],
        claims: Optional[List[Any]],
        research_info: Dict[str, Any],
        top_k: int = 5,
    ) -> (Dict[str, Any], List[Dict[str, Any]]):
        """
        Aggregate or run Phase 10A Evidence Coverage and produce Research Claim Review.
        Named strictly 'Evidence Coverage', NEVER 'Research Validity'.
        """
        res = evidence_coverage

        if not res and (claims or research_info):
            try:
                res = self.coverage_service.audit_claims(
                    claims=claims,
                    research_information=research_info,
                    top_k=top_k,
                )
            except Exception:
                res = None

        if not res or not isinstance(res, dict):
            coverage_review = {
                "analysis_status": STATUS_NOT_RUN,
                "current_status": "Not Run",
                "total_claims": 0,
                "usable_claims": 0,
                "supported_claims": 0,
                "partially_supported_claims": 0,
                "insufficient_evidence_claims": 0,
                "coverage_percentage": None,
                "coverage_display": "Evidence coverage could not be calculated because there are no usable extracted claims.",
                "reason": "Evidence coverage was not executed.",
                "recommended_action": "Extract or specify research claims to evaluate evidence coverage.",
                "important_findings": [],
            }
            return coverage_review, []

        overall_cov = res.get("overall_coverage", {})
        total_claims = int(overall_cov.get("total_claims", 0))
        usable_claims = int(overall_cov.get("usable_claims", 0))
        supported = int(overall_cov.get("supported_claims", 0))
        partial = int(overall_cov.get("partially_supported_claims", 0))
        insufficient = int(overall_cov.get("insufficient_evidence_claims", 0))
        cov_pct = overall_cov.get("coverage_percentage")

        if usable_claims == 0 or cov_pct is None:
            coverage_display = "Evidence coverage could not be calculated because there are no usable extracted claims."
            recommended_action = "Review unsupported claims and identify appropriate literature evidence."
            current_status = "Insufficient Evidence"
            analysis_status = STATUS_INSUFFICIENT
        elif insufficient > 0:
            coverage_display = f"{cov_pct:.1f}%"
            recommended_action = "Review unsupported claims and identify appropriate literature evidence."
            current_status = "Needs Review"
            analysis_status = STATUS_REVIEW_RECOMMENDED
        elif partial > 0:
            coverage_display = f"{cov_pct:.1f}%"
            recommended_action = "Review the evidence associated with partially supported claims."
            current_status = "Partially Supported"
            analysis_status = STATUS_REVIEW_RECOMMENDED
        else:
            coverage_display = f"{cov_pct:.1f}%"
            recommended_action = "Review each claim-evidence relationship before submission."
            current_status = "Supported by Available Evidence"
            analysis_status = STATUS_AVAILABLE

        important_findings: List[str] = []
        if usable_claims > 0:
            important_findings.append(
                f"{supported} of {usable_claims} claim(s) supported by corpus literature evidence."
            )
            if insufficient > 0:
                important_findings.append(
                    f"{insufficient} claim(s) have insufficient matching evidence in the available corpus."
                )
            if partial > 0:
                important_findings.append(
                    f"{partial} claim(s) show partial contextual corroboration."
                )

        reason = overall_cov.get("status_message") or (
            f"Evidence coverage evaluated across {usable_claims} usable research claim(s)."
        )

        coverage_review = {
            "analysis_status": analysis_status,
            "current_status": current_status,
            "total_claims": total_claims,
            "usable_claims": usable_claims,
            "supported_claims": supported,
            "partially_supported_claims": partial,
            "insufficient_evidence_claims": insufficient,
            "coverage_percentage": cov_pct,
            "coverage_display": coverage_display,
            "reason": reason,
            "recommended_action": recommended_action,
            "important_findings": important_findings,
        }

        # Build Part 6: Research Claim Review itemized list
        claim_analyses = res.get("claim_analyses", [])
        claim_review_items: List[Dict[str, Any]] = []

        for ca in claim_analyses:
            claim_text = ca.get("claim", "")
            ev_status = ca.get("evidence_status", STATUS_INSUFFICIENT)
            sim = float(ca.get("strongest_similarity_score", 0.0))
            matched_count = int(ca.get("number_of_relevant_papers", len(ca.get("matched_papers", []))))

            # Formulate explainable recommendation using neutral wording
            # Do NOT say claim is true or false
            if ev_status == "Supported by Available Evidence":
                review_rec = "Available corpus evidence was found. Review each claim-evidence relationship before submission."
            elif ev_status == "Partially Supported":
                review_rec = "Limited matching evidence was found. Review contextual literature to reinforce this claim."
            else:
                review_rec = "No sufficient matching evidence was found in the available corpus. Review unsupported claims and identify appropriate literature evidence."

            claim_review_items.append({
                "claim_text": claim_text,
                "evidence_status": ev_status,
                "strongest_similarity": sim,
                "matched_literature_count": matched_count,
                "matched_papers": ca.get("matched_papers", []),
                "review_recommendation": review_rec,
                "reason": ca.get("reason", ""),
            })

        return coverage_review, claim_review_items

    # -------------------------------------------------------------------------
    # PART 7: Revision Review Aggregation
    # -------------------------------------------------------------------------
    def _aggregate_revision_review(
        self,
        revision_comparison: Optional[Dict[str, Any]],
        previous_info: Optional[Dict[str, Any]],
        current_info: Dict[str, Any],
        project_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Aggregate or run Phase 10A Revision Comparison.
        If no previous version exists, handles safely without penalty.
        """
        res = revision_comparison

        if not res and previous_info and current_info:
            try:
                res = self.revision_service.compare_revisions(
                    previous_info=previous_info,
                    new_info=current_info,
                    previous_project_id=project_id,
                    new_project_id=project_id,
                )
            except Exception:
                res = None

        if not res or not isinstance(res, dict):
            # Safe handling for first manuscript without previous version (Part 7 & H requirement)
            return {
                "has_revision": False,
                "analysis_status": STATUS_NOT_RUN,
                "current_status": "Not Run",
                "message": "Revision comparison is not available because a previous manuscript version was not selected.",
                "previous_version": None,
                "current_version": "Current Manuscript",
                "changed_research_fields": [],
                "changed_fields_count": 0,
                "added_claims": [],
                "removed_claims": [],
                "retained_claims": [],
                "revision_priority_guidance": [
                    "First manuscript draft selected; comparison against a prior draft was not requested."
                ],
                "recommended_action": "Select a previous manuscript draft if you wish to track changes across revisions.",
                "reason": "Initial manuscript submission or no comparison version selected.",
                "disclaimer": REVISION_DISCLAIMER,
            }

        rev_sum = res.get("revision_summary", {})
        changed_fields = rev_sum.get("changed_research_fields", [])
        changed_count = int(rev_sum.get("changed_fields_count", len(changed_fields)))
        guidance = res.get("priority_guidance", [])
        field_comps = res.get("field_comparisons", {})

        # Extract claim changes from major_claims comparison if available
        claims_comp = field_comps.get("major_claims", {})
        added_claims = claims_comp.get("added_items", [])
        removed_claims = claims_comp.get("removed_items", [])
        retained_claims = claims_comp.get("retained_items", [])

        if changed_count > 0:
            analysis_status = STATUS_REVIEW_RECOMMENDED
            current_status = "Review Recommended"
            recommended_action = "Review identified field changes and re-run corresponding analysis modules as guided."
        else:
            analysis_status = STATUS_AVAILABLE
            current_status = "Unchanged"
            recommended_action = "Review the manuscript version consistency."

        reason = (
            f"Compared versions: {changed_count} field(s) modified, added, or removed "
            f"between {rev_sum.get('previous_version', 'Version 1')} and {rev_sum.get('new_version', 'Version 2')}."
        )

        return {
            "has_revision": True,
            "analysis_status": analysis_status,
            "current_status": current_status,
            "message": f"Revision comparison active: {changed_count} changed field(s) detected.",
            "previous_version": rev_sum.get("previous_version", "Version 1"),
            "current_version": rev_sum.get("new_version", "Version 2"),
            "changed_research_fields": changed_fields,
            "changed_fields_count": changed_count,
            "added_claims": added_claims,
            "removed_claims": removed_claims,
            "retained_claims": retained_claims,
            "revision_priority_guidance": guidance,
            "key_change_notes": rev_sum.get("key_change_notes", []),
            "recommended_action": recommended_action,
            "reason": reason,
            "disclaimer": res.get("disclaimer", REVISION_DISCLAIMER),
        }

    # -------------------------------------------------------------------------
    # Rule-Based / Bayesian Reasoning Aggregation
    # -------------------------------------------------------------------------
    def _aggregate_reasoning_review(
        self,
        reasoning_analysis: Optional[Dict[str, Any]],
        gap_result: Optional[Dict[str, Any]],
        contrib_result: Optional[Dict[str, Any]],
        research_info: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Aggregate or evaluate Rule-Based and Bayesian Reasoning."""
        res = reasoning_analysis

        if not res and (gap_result or contrib_result):
            try:
                # Derive facts and execute rule engine
                title = research_info.get("title", "Research Study")
                rule_out = self.rule_service.evaluate_reasoning(
                    project_title=title,
                    gap_analysis=gap_result,
                    contribution_analysis=contrib_result,
                )
                bayesian_out = self.bayesian_service.reason_evidence(
                    gap_analysis=gap_result,
                    contribution_analysis=contrib_result,
                    prior=0.50,
                )
                res = {
                    "rule_reasoning": rule_out,
                    "bayesian_reasoning": bayesian_out,
                }
            except Exception:
                res = None

        if not res or not isinstance(res, dict):
            return {
                "analysis_status": STATUS_NOT_RUN,
                "current_status": "Not Run",
                "bayesian_evidence_category": None,
                "model_posterior_gap_supported": None,
                "fired_rules_count": 0,
                "fired_rules": [],
                "reason": "Rule-based and Bayesian evidence reasoning was not executed.",
                "recommended_action": "Execute gap and contribution analyses to evaluate rule-based and Bayesian evidence reasoning.",
                "limitation": (
                    "Bayesian estimates are model-based calculations conditioned strictly on the "
                    "available local literature corpus. They do not assert scientific truth."
                ),
            }

        bayesian_data = res.get("bayesian_reasoning", {})
        rule_data = res.get("rule_reasoning", {})

        ev_cat = bayesian_data.get("evidence_category", "insufficient")
        posterior = bayesian_data.get("posterior_probability")
        fired_rules = rule_data.get("fired_rules", [])

        if ev_cat == "contradiction" or ev_cat == "mixed":
            analysis_status = STATUS_REVIEW_RECOMMENDED
            current_status = "Review Recommended"
            recommended_action = "Review the literature evidence contradicting or competing with the research gap."
        elif ev_cat == "insufficient":
            analysis_status = STATUS_INSUFFICIENT
            current_status = "Insufficient Evidence"
            recommended_action = "Expand local literature corpus coverage."
        else:
            analysis_status = STATUS_AVAILABLE
            current_status = "Supported by Available Evidence"
            recommended_action = "Review grounded evidence references before submission."

        reason = (
            f"Evidence category classified as '{ev_cat}' with {len(fired_rules)} rule(s) fired. "
            f"Model posterior P(Gap Supported | Available Evidence) = {posterior if posterior is not None else 'N/A'}."
        )

        return {
            "analysis_status": analysis_status,
            "current_status": current_status,
            "bayesian_evidence_category": ev_cat,
            "model_posterior_gap_supported": posterior,
            "prior": bayesian_data.get("prior_probability", 0.50),
            "fired_rules_count": len(fired_rules),
            "fired_rules": [r.get("name", "") for r in fired_rules],
            "reason": reason,
            "recommended_action": recommended_action,
            "limitation": bayesian_data.get("corpus_limitation", (
                "Bayesian estimate reflects a model-based calculation conditioned strictly on the "
                "available local literature corpus. It does not establish scientific truth."
            )),
        }

    # -------------------------------------------------------------------------
    # PART 8: Corpus / Evidence Limitations
    # -------------------------------------------------------------------------
    def _build_corpus_limitations(self) -> Dict[str, Any]:
        """Compile verified corpus information and mandatory warning."""
        metadata = self.corpus_service.get_metadata()
        all_papers = getattr(self.corpus_service, "_papers", [])

        years = [p.get("publication_year") for p in all_papers if p.get("publication_year")]
        if years:
            year_range = f"{min(years)} - {max(years)}"
        else:
            year_range = "Literature corpus publication year range not specified"

        return {
            "warning": CORPUS_LIMITATION_WARNING,
            "corpus_size": metadata.get("total_papers", len(all_papers)),
            "corpus_domain": metadata.get("domain", "Computer Vision and Agriculture AI"),
            "corpus_type": metadata.get("corpus_type", "development_sample_corpus"),
            "corpus_version": metadata.get("version", "1.0.0"),
            "retrieval_method": "TF-IDF Vector Space Model (Cosine Similarity over Paper Content)",
            "date_year_range": year_range,
            "disclaimer_notes": [
                "Corpus retrieval is limited to locally indexed research papers.",
                "Lack of contradictory literature does not prove scientific novelty or correctness.",
                "Human academic review and external database cross-referencing remain mandatory.",
            ],
        }

    # -------------------------------------------------------------------------
    # PART 9: Review Checklist
    # -------------------------------------------------------------------------
    def _build_review_checklist(
        self,
        gap_review: Dict[str, Any],
        contrib_review: Dict[str, Any],
        coverage_review: Dict[str, Any],
        revision_review: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """
        Produce actionable academic review tasks.
        These are review tasks, NOT automatic pass/fail requirements.
        """
        checklist: List[Dict[str, Any]] = []

        for item in DEFAULT_REVIEW_CHECKLIST:
            item_id = item["id"]
            guidance = item["default_guidance"]

            # Contextualize guidance deterministically based on analysis results
            if item_id == "chk_contradictory_evidence":
                c_cnt = gap_review.get("potentially_contradictory_evidence_count", 0)
                if c_cnt > 0:
                    guidance = f"{c_cnt} paper(s) show potential contradiction. Verify distinguishing context before submission."
                elif gap_review.get("analysis_status") == STATUS_NOT_RUN:
                    guidance = "Run research gap analysis to screen for potentially contradictory literature."
            elif item_id == "chk_contribution_differentiation":
                if contrib_review.get("potential_overlap_count", 0) > 0:
                    guidance = "Potential dimensional overlap detected. Clearly specify differentiating aspects."
            elif item_id == "chk_unsupported_claims":
                ins_cnt = coverage_review.get("insufficient_evidence_claims", 0)
                if ins_cnt > 0:
                    guidance = f"{ins_cnt} claim(s) have insufficient corpus evidence. Review or cite supporting literature."
            elif item_id == "chk_revision_reanalyzed":
                if revision_review.get("changed_fields_count", 0) > 0:
                    guidance = f"{revision_review['changed_fields_count']} field(s) changed across revisions. Ensure analyses are up to date."

            checklist.append({
                "id": item_id,
                "task": item["task"],
                "category": item["category"],
                "status": "Pending Review",
                "guidance": guidance,
            })

        return checklist

    # -------------------------------------------------------------------------
    # Overall Review Summary (Without single scientific score)
    # -------------------------------------------------------------------------
    def _build_overall_summary(
        self,
        gap_review: Dict[str, Any],
        contrib_review: Dict[str, Any],
        coverage_review: Dict[str, Any],
        revision_review: Dict[str, Any],
        reasoning_review: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Build review dashboard summary showing analysis availability and
        review recommendations. Does NOT compute a single scientific score.
        """
        analyses_status = {
            "research_gap_review": gap_review.get("analysis_status", STATUS_NOT_RUN),
            "contribution_differentiation_review": contrib_review.get("analysis_status", STATUS_NOT_RUN),
            "evidence_coverage_review": coverage_review.get("analysis_status", STATUS_NOT_RUN),
            "revision_review": revision_review.get("analysis_status", STATUS_NOT_RUN),
            "reasoning_review": reasoning_review.get("analysis_status", STATUS_NOT_RUN),
        }

        # Status counts across modules
        counts = {
            STATUS_AVAILABLE: 0,
            STATUS_REVIEW_RECOMMENDED: 0,
            STATUS_INSUFFICIENT: 0,
            STATUS_NOT_RUN: 0,
        }

        for st in analyses_status.values():
            if st in counts:
                counts[st] += 1
            else:
                counts[STATUS_REVIEW_RECOMMENDED] += 1

        # Summary guidance text
        if counts[STATUS_REVIEW_RECOMMENDED] > 0:
            overall_guidance = (
                f"{counts[STATUS_REVIEW_RECOMMENDED]} analysis module(s) flagged specific findings "
                "for academic review prior to submission."
            )
        elif counts[STATUS_INSUFFICIENT] > 0:
            overall_guidance = (
                "Insufficient corpus evidence was retrieved for one or more analyses. "
                "Review broader literature to verify research grounding."
            )
        elif counts[STATUS_AVAILABLE] > 0:
            overall_guidance = (
                "Corpus-based analyses are available for review. Confirm all findings "
                "academically with faculty or peer reviewers."
            )
        else:
            overall_guidance = (
                "Provide manuscript information to execute research gap, contribution, and evidence analyses."
            )

        return {
            "title": "Submission Readiness Report",
            "dashboard_type": "Academic Pre-Submission Review Dashboard",
            "analyses_status": analyses_status,
            "status_counts": {
                "available": counts[STATUS_AVAILABLE],
                "review_recommended": counts[STATUS_REVIEW_RECOMMENDED],
                "insufficient_evidence": counts[STATUS_INSUFFICIENT],
                "not_run": counts[STATUS_NOT_RUN],
                "total_modules": len(analyses_status),
            },
            "overall_guidance": overall_guidance,
            "academic_notice": (
                "This report aggregates existing GapGuard analysis outputs into a research-review dashboard. "
                "It does not assert scientific validity, global novelty, or publication outcomes. "
                "All assessments reflect the available local corpus."
            ),
        }


# Global singleton instance
submission_readiness_service = SubmissionReadinessService()
