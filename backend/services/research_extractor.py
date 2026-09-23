"""
GapGuard AI — Research Information Extraction Service

Performs deterministic, rule-based academic structure and information extraction
from clean manuscript text.

Identifies 13 core academic research fields:
1. Title
2. Abstract
3. Keywords
4. Research Problem
5. Research Objective
6. Research Question
7. Claimed Research Gap
8. Proposed Method
9. Dataset / Application Context
10. Expected Contribution
11. Evaluation Metrics
12. Major Claims
13. References

IMPORTANT ARCHITECTURAL INVARIANT:
This service performs EXTRACTION, NOT REASONING.
It identifies text where researchers claim a gap, contribution, or method.
It does NOT validate, verify, contradict, or judge scientific validity.
Extraction confidence (high/medium/low) reflects certainty that text was located,
never scientific truth. Missing fields return null rather than invented content.
"""

import re
from typing import Any, Dict, List, Optional, Tuple


# Canonical section mappings and supported heading variations
HEADING_PATTERNS: Dict[str, List[re.Pattern]] = {
    "title": [
        re.compile(r"^(?:paper\s+)?title\s*[:\-]\s*(.*)$", re.IGNORECASE),
    ],
    "abstract": [
        re.compile(r"^(?:\d+[\.\)]\s*)?(?:abstract|summary|executive\s+summary)\s*[:\-]?\s*$", re.IGNORECASE),
        re.compile(r"^(?:abstract|summary)\s*[:\-]\s*(.+)$", re.IGNORECASE),
    ],
    "keywords": [
        re.compile(r"^(?:keywords?|key\s*words?|index\s+terms?)\s*[:\-—]\s*(.*)$", re.IGNORECASE),
    ],
    "research_problem": [
        re.compile(r"^(?:\d+(?:\.\d+)*[\.\)]\s*)?(?:research\s+problem|problem\s+statement|problem\s+definition|problem\s+formulation|the\s+problem)\s*[:\-]?\s*$", re.IGNORECASE),
        re.compile(r"^(?:research\s+problem|problem\s+statement|problem\s+definition)\s*[:\-]\s*(.+)$", re.IGNORECASE),
    ],
    "research_objective": [
        re.compile(r"^(?:\d+(?:\.\d+)*[\.\)]\s*)?(?:research\s+objectives?|objectives?|aims?|research\s+aims?|purpose\s+of\s+(?:the\s+)?study)\s*[:\-]?\s*$", re.IGNORECASE),
        re.compile(r"^(?:research\s+objectives?|objectives?|aims?)\s*[:\-]\s*(.+)$", re.IGNORECASE),
    ],
    "research_question": [
        re.compile(r"^(?:\d+(?:\.\d+)*[\.\)]\s*)?(?:research\s+questions?|rqs?|research\s+hypothes[ie]s|hypothes[ie]s)\s*[:\-]?\s*$", re.IGNORECASE),
        re.compile(r"^(?:research\s+questions?|rqs?)\s*[:\-]\s*(.+)$", re.IGNORECASE),
    ],
    "claimed_research_gap": [
        re.compile(r"^(?:\d+(?:\.\d+)*[\.\)]\s*)?(?:research\s+gaps?|gap(?:\s+in\s+(?:the\s+)?literature)?|literature\s+gap|limitations\s+and\s+future\s+work|limitations\s+of\s+(?:existing|current)\s+work|limitations|motivation)\s*[:\-]?\s*$", re.IGNORECASE),
        re.compile(r"^(?:research\s+gaps?|gap)\s*[:\-]\s*(.+)$", re.IGNORECASE),
    ],
    "proposed_method": [
        re.compile(r"^(?:\d+(?:\.\d+)*[\.\)]\s*)?(?:methodology|methods?|proposed\s+method(?:ology)?|approach|proposed\s+approach|system\s+architecture|model\s+architecture|proposed\s+framework|framework)\s*[:\-]?\s*$", re.IGNORECASE),
        re.compile(r"^(?:proposed\s+method(?:ology)?|proposed\s+approach)\s*[:\-]\s*(.+)$", re.IGNORECASE),
    ],
    "dataset_context": [
        re.compile(r"^(?:\d+(?:\.\d+)*[\.\)]\s*)?(?:datasets?|data(?:\s+collection)?|experimental\s+setup(?:\s+(?:and|&)\s+datasets?)?|benchmark\s+datasets?|study\s+area|application\s+context|corpus)\s*[:\-]?\s*$", re.IGNORECASE),
        re.compile(r"^(?:datasets?|experimental\s+setup(?:\s+(?:and|&)\s+datasets?)?|study\s+area|application\s+context)\s*[:\-]\s*(.+)$", re.IGNORECASE),
    ],
    "expected_contribution": [
        re.compile(r"^(?:\d+(?:\.\d+)*[\.\)]\s*)?(?:contributions?|proposed\s+contributions?|key\s+contributions?|our\s+contributions?|novelty)\s*[:\-]?\s*$", re.IGNORECASE),
        re.compile(r"^(?:contributions?|key\s+contributions?|our\s+contributions?)\s*[:\-]\s*(.+)$", re.IGNORECASE),
    ],
    "evaluation_metrics": [
        re.compile(r"^(?:\d+(?:\.\d+)*[\.\)]\s*)?(?:evaluation\s+metrics?|performance\s+metrics?|metrics?|evaluation|experimental\s+evaluation)\s*[:\-]?\s*$", re.IGNORECASE),
    ],
    "references": [
        re.compile(r"^(?:\d+(?:\.\d+)*[\.\)]\s*)?(?:references|bibliography|literature\s+cited|works\s+cited)\s*[:\-]?\s*$", re.IGNORECASE),
    ],
    "introduction": [
        re.compile(r"^(?:\d+(?:\.\d+)*[\.\)]\s*)?(?:introduction|background)\s*[:\-]?\s*$", re.IGNORECASE),
    ],
}

# Standard known evaluation metric terms for targeted extraction
KNOWN_METRICS = [
    "accuracy",
    "precision",
    "recall",
    "f1-score",
    "f1 score",
    "f-measure",
    "auc-roc",
    "roc-auc",
    "auc",
    "mean squared error",
    "mse",
    "root mean squared error",
    "rmse",
    "mean absolute error",
    "mae",
    "bleu",
    "rouge-1",
    "rouge-2",
    "rouge-l",
    "rouge",
    "mean average precision",
    "map",
    "mean reciprocal rank",
    "mrr",
    "intersection over union",
    "iou",
    "peak signal-to-noise ratio",
    "psnr",
    "structural similarity index",
    "ssim",
    "perplexity",
    "top-1 accuracy",
    "top-5 accuracy",
    "latency",
    "throughput",
    "exact match",
]

# Major claims indicators (conservative sentence filtering)
CLAIM_INDICATORS = [
    r"\bwe propose\b",
    r"\bwe present\b",
    r"\bwe demonstrate\b",
    r"\bour method\b",
    r"\bour approach\b",
    r"\bachieves\b",
    r"\bimproves\b",
    r"\boutperforms\b",
    r"\bsignificantly\b",
    r"\bstate-of-the-art\b",
    r"\bsota\b",
]

# Discourse marker patterns for extracting fields when dedicated section headers are absent
DISCOURSE_PATTERNS = {
    "research_problem": [
        re.compile(r"(?:the|a)\s+(?:central|primary|key|main|core)?\s*(?:research\s+)?problem\s+(?:addressed|investigated|studied|tackled|focuses on|is)\s+([^.?!;]+[.?!])", re.IGNORECASE),
        re.compile(r"problem\s+statement\s*[:\-]\s*([^.?!;]+[.?!])", re.IGNORECASE),
        re.compile(r"we\s+address\s+the\s+problem\s+of\s+([^.?!;]+[.?!])", re.IGNORECASE),
    ],
    "research_objective": [
        re.compile(r"(?:the|our)\s+(?:main|primary|overall|central|key)?\s*(?:objective|aim|goal)(?:\s+of\s+this\s+(?:study|paper|work|research|investigation))?\s+(?:is|was)\s+to\s+([^.?!;]+[.?!])", re.IGNORECASE),
        re.compile(r"this\s+(?:paper|work|study|research)\s+aims\s+to\s+([^.?!;]+[.?!])", re.IGNORECASE),
        re.compile(r"our\s+objective\s+is\s+to\s+([^.?!;]+[.?!])", re.IGNORECASE),
        re.compile(r"we\s+aim\s+to\s+([^.?!;]+[.?!])", re.IGNORECASE),
    ],
    "research_question": [
        re.compile(r"(?:RQ\s*\d*|research\s+question\s*\d*)\s*[:\-]\s*([^.?!;]+[.?!]?)", re.IGNORECASE),
        re.compile(r"(?:the|our)\s+(?:central|primary|main)?\s*research\s+question\s+(?:is|asks)\s*[:\-]?\s*([^.?!;]+[.?!]?)", re.IGNORECASE),
        re.compile(r"we\s+investigate\s+(?:the\s+following\s+research\s+question[s:]*|whether)\s+([^.?!;]+[.?!]?)", re.IGNORECASE),
    ],
    "claimed_research_gap": [
        re.compile(r"((?:however|nevertheless|yet|despite\s+[^,\n]+),?\s*(?:existing|previous|current|prior|traditional)\s+[^.\n]+(?:suffer from|fail to|lack|ignore|do not|remain|limit)[^.\n]+[.?!])", re.IGNORECASE),
        re.compile(r"((?:a\s+significant|a\s+critical|an\s+unresolved|the\s+primary)?\s*research\s+gap\s+(?:exists|remains|is)[^.\n]+[.?!])", re.IGNORECASE),
        re.compile(r"((?:remains?|is)\s+(?:insufficiently|scarcely|poorly|rarely|largely)\s+(?:studied|explored|addressed|investigated|resolved)[^.\n]+[.?!])", re.IGNORECASE),
        re.compile(r"(to\s+the\s+best\s+of\s+our\s+knowledge,?[^.\n]+(?:has\s+not\s+been|no\s+prior\s+work|remains\s+unexplored)[^.\n]+[.?!])", re.IGNORECASE),
    ],
    "proposed_method": [
        re.compile(r"(in\s+this\s+(?:paper|work|study),?\s+we\s+propose\s+[^.\n]+[.?!])", re.IGNORECASE),
        re.compile(r"(we\s+propose\s+(?:a|an)\s+(?:novel|new|efficient|framework|method|architecture|model|approach)\s+[^.\n]+[.?!])", re.IGNORECASE),
        re.compile(r"(our\s+proposed\s+(?:method|approach|framework|model|architecture)\s+[^.\n]+[.?!])", re.IGNORECASE),
    ],
    "dataset_context": [
        re.compile(r"((?:we\s+evaluate|experiments\s+are\s+conducted|evaluated\s+on)\s+(?:the|our)?\s*[^.\n]+(?:dataset|benchmark|corpus|data)[^.\n]*[.?!])", re.IGNORECASE),
        re.compile(r"((?:the\s+dataset\s+consists\s+of|data\s+was\s+collected\s+from|we\s+collected\s+a\s+dataset)[^.\n]+[.?!])", re.IGNORECASE),
    ],
    "expected_contribution": [
        re.compile(r"((?:the|our)\s+(?:main|key|primary)?\s*contributions?\s+(?:of\s+this\s+(?:paper|work)|are)[^.\n]+[.?!])", re.IGNORECASE),
        re.compile(r"(our\s+contributions\s+are\s+(?:summarized\s+as\s+follows|threefold|twofold|fourfold)[^.\n]*[:\-]?\s*[^.\n]+[.?!])", re.IGNORECASE),
    ],
}


def _split_into_sentences(text: str) -> List[str]:
    """Split clean text into individual sentences safely."""
    if not text:
        return []
    # Protect common abbreviations: e.g., i.e., et al., Fig., Eq.
    cleaned = re.sub(r"\b(e\.g|i\.e|et\s+al|fig|eq|vol|no|pp|dr|prof)\.", r"\1<DOT>", text, flags=re.IGNORECASE)
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(\[])", cleaned)
    sentences = []
    for p in parts:
        s = p.replace("<DOT>", ".").strip()
        if len(s) > 10:
            sentences.append(s)
    return sentences


def _clean_field_text(text: Optional[str]) -> Optional[str]:
    """Normalize whitespace and strip extraneous leading/trailing artifacts."""
    if not text:
        return None
    cleaned = re.sub(r"[ \t]+", " ", text).strip()
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned if len(cleaned) > 0 else None


def _match_heading_line(line: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Check if a line matches any known academic heading.
    Returns (canonical_name, inline_content) or (None, None).
    """
    stripped = line.strip()
    # Strip markdown header hashes or bullets
    stripped = re.sub(r"^[#*>\-\s]+", "", stripped).strip()

    if not stripped or len(stripped) > 90:
        return None, None

    for canon, patterns in HEADING_PATTERNS.items():
        for pat in patterns:
            m = pat.match(stripped)
            if m:
                inline = m.group(1).strip() if m.lastindex and m.group(1) else ""
                return canon, inline
    return None, None


def _extract_sections_by_headings(text: str) -> Dict[str, Dict[str, Any]]:
    """
    Parse manuscript text by identifying heading boundaries.
    Returns dict: { canonical_key: { "text": str, "confidence": "high" } }.
    """
    sections: Dict[str, List[str]] = {}
    lines = text.split("\n")

    current_canon: Optional[str] = None
    first_heading_seen = False
    pre_heading_lines: List[str] = []

    for line in lines:
        canon, inline = _match_heading_line(line)
        if canon:
            first_heading_seen = True
            current_canon = canon
            if current_canon not in sections:
                sections[current_canon] = []
            if inline:
                sections[current_canon].append(inline)
        else:
            if not first_heading_seen:
                if line.strip():
                    pre_heading_lines.append(line.strip())
            elif current_canon:
                sections[current_canon].append(line)

    results: Dict[str, Dict[str, Any]] = {}
    for canon, line_list in sections.items():
        joined = _clean_field_text("\n".join(line_list))
        if joined:
            results[canon] = {
                "text": joined,
                "confidence": "high",
            }

    # If title wasn't an explicit heading, inspect pre-heading lines
    if "title" not in results and pre_heading_lines:
        candidate_title = None
        for cand in pre_heading_lines[:3]:
            # Filter out author emails, URLs, page numbers
            if "@" not in cand and "http" not in cand and not cand.isdigit() and len(cand) > 5:
                candidate_title = cand
                break
        if candidate_title:
            results["title"] = {
                "text": candidate_title,
                "confidence": "medium",
            }

    return results


def _extract_keywords(raw_text: Optional[str]) -> Tuple[List[str], Optional[str]]:
    """
    Parse keywords line/section into a deduplicated list of strings.
    """
    if not raw_text:
        return [], None

    # Strip prefixes like Keywords: or Index Terms -
    cleaned = re.sub(r"^(?:keywords?|key\s*words?|index\s+terms?)\s*[:\-—]\s*", "", raw_text, flags=re.IGNORECASE).strip()
    
    # Split on comma, semicolon, bullet, or newline
    raw_tokens = re.split(r"[,;•\n\t]+", cleaned)
    tokens: List[str] = []
    for t in raw_tokens:
        tok = t.strip().strip(".-\"'")
        if tok and len(tok) > 1 and len(tok) < 80 and not tok.lower().startswith("and "):
            tokens.append(tok)

    if tokens:
        return tokens, "high"
    return [], None


def _extract_references(raw_text: Optional[str]) -> Tuple[List[str], Optional[str]]:
    """
    Extract individual reference citations from references section.
    """
    if not raw_text:
        return [], None

    lines = raw_text.split("\n")
    entries: List[str] = []
    current_entry: List[str] = []

    numbered_pattern = re.compile(r"^(?:\[\d+\]|\d+[\.\)])\s+")

    for line in lines:
        s = line.strip()
        if not s:
            if current_entry:
                entries.append(" ".join(current_entry))
                current_entry = []
            continue

        if numbered_pattern.match(s):
            if current_entry:
                entries.append(" ".join(current_entry))
                current_entry = []
            current_entry.append(s)
        else:
            if current_entry:
                current_entry.append(s)
            else:
                current_entry.append(s)

    if current_entry:
        entries.append(" ".join(current_entry))

    # Clean and filter
    final_entries = [e for e in entries if len(e.strip()) > 15]
    if final_entries:
        return final_entries, "high"
    return [], None


def _extract_evaluation_metrics(full_text: str, eval_section_text: Optional[str]) -> Tuple[List[str], Optional[str]]:
    """
    Locate academic evaluation metrics in evaluation section or full text.
    """
    target_scope = eval_section_text if eval_section_text else full_text
    found_metrics = set()

    lower_scope = target_scope.lower()
    for metric in KNOWN_METRICS:
        # Use boundary-aware search
        escaped = re.escape(metric)
        if re.search(r"\b" + escaped + r"\b", lower_scope):
            found_metrics.add(metric)

    if found_metrics:
        # Sort canonically
        sorted_metrics = sorted(list(found_metrics))
        confidence = "high" if eval_section_text else "medium"
        return sorted_metrics, confidence

    return [], None


def _extract_major_claims(full_text: str) -> Tuple[List[str], Optional[str]]:
    """
    Conservatively identify major claims containing explicit author declaration indicators.
    """
    sentences = _split_into_sentences(full_text)
    combined_pat = re.compile("|".join(CLAIM_INDICATORS), re.IGNORECASE)

    extracted_claims: List[str] = []
    seen = set()

    for s in sentences:
        clean_s = s.strip()
        # Filter reasonable length bounds for an academic claim sentence
        if 35 <= len(clean_s) <= 350:
            if combined_pat.search(clean_s):
                normalized = clean_s.lower()
                if normalized not in seen:
                    seen.add(normalized)
                    extracted_claims.append(clean_s)
                    if len(extracted_claims) >= 8:
                        break

    if extracted_claims:
        return extracted_claims, "medium"
    return [], None


def _search_discourse_fallback(field: str, full_text: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Search full manuscript for target discourse markers if no dedicated heading was found.
    """
    patterns = DISCOURSE_PATTERNS.get(field, [])
    for pat in patterns:
        m = pat.search(full_text)
        if m:
            extracted = m.group(1).strip() if m.lastindex else m.group(0).strip()
            # Clean punctuation
            extracted = re.sub(r"\s+", " ", extracted)
            if len(extracted) > 15:
                return extracted, "medium"
    return None, None


def extract_research_information(
    text: str,
    file_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Extract structured research information from manuscript plain text.

    Returns deterministic baseline extraction containing 13 core academic fields,
    extraction confidences, and summary metadata.
    """
    if not text or not text.strip():
        # Empty text returns clean empty baseline without errors or hallucinations
        return {
            "title": {"text": None, "confidence": None},
            "abstract": {"text": None, "confidence": None},
            "keywords": {"items": [], "confidence": None},
            "research_problem": {"text": None, "confidence": None},
            "research_objective": {"text": None, "confidence": None},
            "research_question": {"text": None, "confidence": None},
            "claimed_research_gap": {"text": None, "confidence": None},
            "proposed_method": {"text": None, "confidence": None},
            "dataset_context": {"text": None, "confidence": None},
            "expected_contribution": {"text": None, "confidence": None},
            "evaluation_metrics": {"items": [], "confidence": None},
            "major_claims": {"items": [], "confidence": None},
            "references": {"items": [], "confidence": None},
            "extraction_metadata": {
                "method": "rule_based_baseline",
                "file_name": file_name,
                "fields_found": 0,
                "fields_missing": 13,
                "confidence_distribution": {"high": 0, "medium": 0, "low": 0},
            },
        }

    # 1. Parse sections using heading patterns
    heading_sections = _extract_sections_by_headings(text)

    # 2. Extract Title
    title_data = heading_sections.get("title")
    if not title_data:
        # Fallback: check first non-empty lines before Abstract / Introduction
        cand_lines = [l.strip() for l in text.split("\n") if l.strip()]
        if cand_lines and not any(_match_heading_line(cand_lines[0])):
            title_text = cand_lines[0]
            if len(title_text) > 5 and len(title_text) < 250:
                title_data = {"text": title_text, "confidence": "medium"}
    title_val = title_data["text"] if title_data else None
    title_conf = title_data["confidence"] if title_data else None

    # 3. Extract Abstract
    abstract_data = heading_sections.get("abstract")
    abstract_val = abstract_data["text"] if abstract_data else None
    abstract_conf = abstract_data["confidence"] if abstract_data else None

    # 4. Extract Keywords
    raw_kw_text = None
    if "keywords" in heading_sections:
        raw_kw_text = heading_sections["keywords"]["text"]
    else:
        # Check inline keyword match in text
        m_kw = re.search(r"(?:keywords?|index\s+terms?)\s*[:\-—]\s*([^\n]+)", text, re.IGNORECASE)
        if m_kw:
            raw_kw_text = m_kw.group(1)
    kw_items, kw_conf = _extract_keywords(raw_kw_text)

    # Helper for extracting single-text fields with heading preference + discourse fallback
    def get_text_field(field_key: str) -> Tuple[Optional[str], Optional[str]]:
        if field_key in heading_sections:
            return heading_sections[field_key]["text"], heading_sections[field_key]["confidence"]
        return _search_discourse_fallback(field_key, text)

    # 5. Research Problem
    problem_val, problem_conf = get_text_field("research_problem")

    # 6. Research Objective
    objective_val, objective_conf = get_text_field("research_objective")

    # 7. Research Question
    question_val, question_conf = get_text_field("research_question")

    # 8. Claimed Research Gap
    gap_val, gap_conf = get_text_field("claimed_research_gap")

    # 9. Proposed Method
    method_val, method_conf = get_text_field("proposed_method")

    # 10. Dataset Context
    dataset_val, dataset_conf = get_text_field("dataset_context")

    # 11. Expected Contribution
    contribution_val, contribution_conf = get_text_field("expected_contribution")

    # 12. Evaluation Metrics
    eval_text = heading_sections.get("evaluation_metrics", {}).get("text")
    metrics_items, metrics_conf = _extract_evaluation_metrics(text, eval_text)

    # 13. Major Claims
    claims_items, claims_conf = _extract_major_claims(text)

    # 14. References
    raw_refs_text = heading_sections.get("references", {}).get("text")
    if not raw_refs_text:
        # Check if references appear at the tail after a references marker
        m_ref = re.search(r"\n\s*(?:references|bibliography)\s*\n(.*)$", text, re.IGNORECASE | re.DOTALL)
        if m_ref:
            raw_refs_text = m_ref.group(1)
    refs_items, refs_conf = _extract_references(raw_refs_text)

    # Compile structured dictionary
    result: Dict[str, Any] = {
        "title": {"text": title_val, "confidence": title_conf},
        "abstract": {"text": abstract_val, "confidence": abstract_conf},
        "keywords": {"items": kw_items, "confidence": kw_conf},
        "research_problem": {"text": problem_val, "confidence": problem_conf},
        "research_objective": {"text": objective_val, "confidence": objective_conf},
        "research_question": {"text": question_val, "confidence": question_conf},
        "claimed_research_gap": {"text": gap_val, "confidence": gap_conf},
        "proposed_method": {"text": method_val, "confidence": method_conf},
        "dataset_context": {"text": dataset_val, "confidence": dataset_conf},
        "expected_contribution": {"text": contribution_val, "confidence": contribution_conf},
        "evaluation_metrics": {"items": metrics_items, "confidence": metrics_conf},
        "major_claims": {"items": claims_items, "confidence": claims_conf},
        "references": {"items": refs_items, "confidence": refs_conf},
    }

    # Calculate metadata and confidence distribution
    conf_dist = {"high": 0, "medium": 0, "low": 0}
    found_count = 0

    field_keys = [
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

    for fk in field_keys:
        f_data = result[fk]
        is_found = False
        if "text" in f_data:
            if f_data["text"] is not None and len(f_data["text"].strip()) > 0:
                is_found = True
        elif "items" in f_data:
            if len(f_data["items"]) > 0:
                is_found = True

        if is_found:
            found_count += 1
            conf = f_data.get("confidence")
            if conf in conf_dist:
                conf_dist[conf] += 1

    missing_count = len(field_keys) - found_count

    result["extraction_metadata"] = {
        "method": "rule_based_baseline",
        "file_name": file_name,
        "fields_found": found_count,
        "fields_missing": missing_count,
        "confidence_distribution": conf_dist,
    }

    return result
