"""
GapGuard AI — Evidence Coverage Auditor Service

Phase 10A: Deterministic audit of student research claims against the local literature corpus.

IMPORTANT ARCHITECTURAL & ETHICAL INVARIANTS:
1. This module measures EVIDENCE COVERAGE (retrieval match against the available local literature corpus).
2. It does NOT evaluate scientific truth, validity, publication readiness, or global novelty.
3. Allowed claim evidence statuses:
   - "Supported by Available Evidence" (strongest similarity >= 0.50)
   - "Partially Supported" (strongest similarity >= 0.25)
   - "Insufficient Evidence" (strongest similarity < 0.25 or unparseable claim)
4. Empty or unparseable claims return "Insufficient Evidence" safely without crashing.
5. Overall coverage percentage is defined as:
   (supported_claims / usable_claims) * 100, or null when usable claims == 0.
"""

from typing import Any, Dict, List, Optional
import re

from services.literature_retrieval import LiteratureRetrievalService, literature_retriever

# Retrieval Evidence Coverage Thresholds
SUPPORTED_THRESHOLD = 0.50
PARTIAL_THRESHOLD = 0.25

CORPUS_LIMITATION_STATEMENT = (
    "Based on the available literature corpus. Evidence coverage reflects retrieval from "
    "the available corpus. Insufficient evidence does not mean that supporting research "
    "does not exist. Human academic review is required."
)

STATUS_SUPPORTED = "Supported by Available Evidence"
STATUS_PARTIALLY_SUPPORTED = "Partially Supported"
STATUS_INSUFFICIENT = "Insufficient Evidence"


def _clean_claim_text(claim: Any) -> str:
    """Normalize extracted claim into clean plain text."""
    if claim is None:
        return ""
    if isinstance(claim, str):
        return claim.strip()
    if isinstance(claim, dict):
        if "text" in claim and claim["text"]:
            return str(claim["text"]).strip()
        if "claim" in claim and claim["claim"]:
            return str(claim["claim"]).strip()
    return str(claim).strip()


def _extract_excerpt(paper: Dict[str, Any]) -> str:
    """
    Extract a concise, factual excerpt from existing paper fields without hallucination.
    """
    candidates = [
        paper.get("contribution"),
        paper.get("limitations"),
        paper.get("abstract"),
        paper.get("research_problem"),
    ]
    for text in candidates:
        if text and isinstance(text, str) and text.strip():
            clean = re.sub(r"\s+", " ", text.strip())
            return clean[:240] + ("..." if len(clean) > 240 else "")
    return ""


class EvidenceCoverageService:
    """
    Deterministic Evidence Coverage Auditor.
    Evaluates extracted manuscript claims against the local literature corpus.
    """

    def __init__(self, retriever: Optional[LiteratureRetrievalService] = None):
        self.retriever = retriever or literature_retriever

    def audit_claim(
        self,
        claim: Any,
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """
        Audit a single research claim against the literature corpus.

        Returns explainable record:
        - claim: text
        - is_usable: bool
        - evidence_status: status string
        - strongest_similarity_score: float
        - number_of_relevant_papers: int
        - matched_paper_ids: list of IDs
        - matched_papers: list of matched paper summaries with excerpts
        - reason: explanation
        """
        clean_text = _clean_claim_text(claim)

        # Handle empty, unusable, or trivial claims
        if not clean_text or len(clean_text) < 5 or clean_text.lower() in ("null", "none", "n/a"):
            return {
                "claim": clean_text if clean_text else "(empty claim)",
                "is_usable": False,
                "evidence_status": STATUS_INSUFFICIENT,
                "strongest_similarity_score": 0.0,
                "number_of_relevant_papers": 0,
                "matched_paper_ids": [],
                "matched_papers": [],
                "reason": "No usable claim text extracted.",
            }

        # Query local literature corpus
        results = self.retriever.retrieve(query=clean_text, top_k=top_k)

        if not results:
            return {
                "claim": clean_text,
                "is_usable": True,
                "evidence_status": STATUS_INSUFFICIENT,
                "strongest_similarity_score": 0.0,
                "number_of_relevant_papers": 0,
                "matched_paper_ids": [],
                "matched_papers": [],
                "reason": "No relevant evidence papers found in the available local corpus.",
            }

        strongest_sim = max(float(p.get("similarity_score", 0.0)) for p in results)
        strongest_sim = round(strongest_sim, 4)

        # Status determination based on deterministic transparent thresholds
        if strongest_sim >= SUPPORTED_THRESHOLD:
            evidence_status = STATUS_SUPPORTED
            reason = (
                f"Retrieved corpus literature demonstrates strong similarity ({strongest_sim:.2f}) "
                "supporting the claimed research premise."
            )
        elif strongest_sim >= PARTIAL_THRESHOLD:
            evidence_status = STATUS_PARTIALLY_SUPPORTED
            reason = (
                f"Retrieved corpus literature shows moderate topical similarity ({strongest_sim:.2f}) "
                "providing partial contextual corroboration."
            )
        else:
            evidence_status = STATUS_INSUFFICIENT
            reason = (
                f"Topical similarity ({strongest_sim:.2f}) is below the minimum evidence threshold (0.25). "
                "Insufficient evidence in the available corpus."
            )

        matched_papers = []
        matched_ids = []

        for p in results:
            pid = p.get("id") or p.get("paper_id") or "unknown"
            matched_ids.append(pid)
            matched_papers.append({
                "paper_id": pid,
                "title": p.get("title", "Untitled Literature Paper"),
                "publication_year": p.get("publication_year"),
                "similarity_score": round(float(p.get("similarity_score", 0.0)), 4),
                "matched_fields": p.get("matched_fields", []),
                "excerpt": _extract_excerpt(p),
            })

        return {
            "claim": clean_text,
            "is_usable": True,
            "evidence_status": evidence_status,
            "strongest_similarity_score": strongest_sim,
            "number_of_relevant_papers": len(results),
            "matched_paper_ids": matched_ids,
            "matched_papers": matched_papers,
            "reason": reason,
        }

    def audit_claims(
        self,
        claims: Optional[List[Any]] = None,
        research_information: Optional[Dict[str, Any]] = None,
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """
        Audit a collection of research claims and compute overall coverage.

        Claims can be provided directly or extracted from research_information["major_claims"].
        """
        raw_claims: List[Any] = []

        if claims is not None and isinstance(claims, list):
            raw_claims = claims
        elif research_information and isinstance(research_information, dict):
            mc = research_information.get("major_claims")
            if isinstance(mc, dict) and "items" in mc and isinstance(mc["items"], list):
                raw_claims = mc["items"]
            elif isinstance(mc, list):
                raw_claims = mc
            elif research_information.get("expected_contribution") or research_information.get("claimed_research_gap"):
                # Fallback to key claims if major_claims was empty
                if research_information.get("expected_contribution"):
                    raw_claims.append(str(research_information["expected_contribution"]))
                if research_information.get("claimed_research_gap"):
                    raw_claims.append(str(research_information["claimed_research_gap"]))

        # Execute claim-by-claim audits
        claim_analyses: List[Dict[str, Any]] = []
        supported_count = 0
        partial_count = 0
        insufficient_count = 0
        usable_count = 0

        for c in raw_claims:
            analysis = self.audit_claim(claim=c, top_k=top_k)
            claim_analyses.append(analysis)

            if analysis["is_usable"]:
                usable_count += 1

            status = analysis["evidence_status"]
            if status == STATUS_SUPPORTED:
                supported_count += 1
            elif status == STATUS_PARTIALLY_SUPPORTED:
                partial_count += 1
            else:
                insufficient_count += 1

        total_count = len(claim_analyses)

        # Transparent coverage calculation:
        # coverage_percentage = (number of claims with Supported by Available Evidence) / (total usable claims) * 100
        if usable_count > 0:
            coverage_pct = round((supported_count / usable_count) * 100.0, 2)
            status_message = (
                f"Evidence Coverage: {coverage_pct:.1f}% across {usable_count} usable claim(s) "
                f"({supported_count} supported, {partial_count} partially supported, {insufficient_count} insufficient)."
            )
        else:
            coverage_pct = None
            status_message = "Insufficient claim data: no usable research claims extracted to evaluate."

        overall_summary = {
            "total_claims": total_count,
            "usable_claims": usable_count,
            "supported_claims": supported_count,
            "partially_supported_claims": partial_count,
            "insufficient_evidence_claims": insufficient_count,
            "coverage_percentage": coverage_pct,
            "status_message": status_message,
        }

        return {
            "overall_coverage": overall_summary,
            "claim_analyses": claim_analyses,
            "corpus_limitation_statement": CORPUS_LIMITATION_STATEMENT,
        }


# Global singleton instance
evidence_coverage_service = EvidenceCoverageService()
