import { useState, useMemo, useEffect } from "react";

/**
 * Helper to compute token overlap between submitted passage and reference snippet
 * and generate highlighted segments.
 */
function highlightMatchingPhrases(text, compareText) {
  if (!text || !compareText) return [{ text, match: false }];

  // Extract lowercase words of length >= 3 from comparison text
  const compareWords = new Set(
    (compareText.toLowerCase().match(/\b[a-z0-9]{3,}\b/gi) || [])
  );

  // Split target text into words and punctuation/whitespace
  const tokens = text.split(/(\s+|[.,!?;:"'()\[\]{}]+)/);

  return tokens.map((token) => {
    const clean = token.toLowerCase().trim();
    const isMatch = clean.length >= 3 && compareWords.has(clean);
    return {
      text: token,
      match: isMatch,
    };
  });
}

export default function DocumentComparisonViewer({
  sources = [],
  fileName = "Submitted Document",
  initialSourceIndex = 0,
}) {
  const [activeSourceIndex, setActiveSourceIndex] = useState(
    Math.min(initialSourceIndex, Math.max(0, sources.length - 1))
  );
  const [activePassageIndex, setActivePassageIndex] = useState(0);

  useEffect(() => {
    const validIdx = Math.min(Math.max(0, initialSourceIndex), Math.max(0, sources.length - 1));
    setActiveSourceIndex(validIdx);
    setActivePassageIndex(0);
  }, [initialSourceIndex, sources]);

  const activeSource = sources[activeSourceIndex] || null;

  const passages = useMemo(() => {
    return activeSource?.matched_segments || [];
  }, [activeSource]);

  // Reset passage index if active source changes
  const handleSelectSource = (index) => {
    setActiveSourceIndex(index);
    setActivePassageIndex(0);
  };

  const handlePrevPassage = () => {
    setActivePassageIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextPassage = () => {
    setActivePassageIndex((prev) => Math.min(passages.length - 1, prev + 1));
  };

  const currentPassage = passages[activePassageIndex] || null;

  const targetHighlighted = useMemo(() => {
    if (!currentPassage) return [];
    return highlightMatchingPhrases(
      currentPassage.target_snippet,
      currentPassage.source_snippet
    );
  }, [currentPassage]);

  const sourceHighlighted = useMemo(() => {
    if (!currentPassage) return [];
    return highlightMatchingPhrases(
      currentPassage.source_snippet,
      currentPassage.target_snippet
    );
  }, [currentPassage]);

  if (!sources || sources.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
        <h4 className="text-base font-semibold text-slate-800">
          No Matching Reference Sources
        </h4>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          No comparison sources with overlapping content were identified in the corpus.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Side-by-Side Document Comparison Viewer
            </h3>
            <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold">
              Interactive Evidence
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare passages from the submitted assignment directly against matched reference literature.
          </p>
        </div>

        {activeSource && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-medium text-slate-500">Source Overlap:</span>
            <span className="rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-xs font-bold">
              {activeSource.similarity_percentage !== undefined
                ? `${Math.round(activeSource.similarity_percentage)}%`
                : `${Math.round(activeSource.similarity || 0)}%`}
            </span>
          </div>
        )}
      </div>

      {/* Source Switcher Tabs */}
      <div className="border-b border-slate-200 bg-white px-6 py-2.5 overflow-x-auto flex items-center gap-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0 mr-1">
          Sources:
        </span>
        {sources.map((src, idx) => {
          const isSelected = idx === activeSourceIndex;
          const srcTitle = src.title || src.name || src.source || `Source #${idx + 1}`;
          const srcSimilarity = Math.round(
            src.similarity_percentage !== undefined ? src.similarity_percentage : (src.similarity || 0)
          );
          const passageCount = src.matched_segments?.length || 0;

          return (
            <button
              key={src.id || src.reference_id || idx}
              type="button"
              onClick={() => handleSelectSource(idx)}
              className={`flex-shrink-0 inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition border ${
                isSelected
                  ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span className="max-w-[180px] truncate">{srcTitle}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isSelected ? "bg-blue-700 text-blue-100" : "bg-slate-200 text-slate-800"
                }`}
              >
                {srcSimilarity}%
              </span>
              {passageCount > 0 && (
                <span
                  className={`text-[10px] px-1 py-0.2 rounded font-medium ${
                    isSelected ? "text-blue-100" : "text-slate-400"
                  }`}
                >
                  ({passageCount} {passageCount === 1 ? "passage" : "passages"})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Source Details Bar */}
      {activeSource && (
        <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="min-w-0">
            <span className="font-semibold text-slate-900 truncate">
              {activeSource.title || activeSource.name || activeSource.source}
            </span>
            <span className="text-slate-400 mx-2">&bull;</span>
            <span className="text-slate-500">
              Type: <strong className="text-slate-700 font-semibold">{activeSource.type || "Academic Corpus"}</strong>
            </span>
          </div>

          {passages.length > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Passage {activePassageIndex + 1} of {passages.length}
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white shadow-2xs p-0.5">
                <button
                  type="button"
                  onClick={handlePrevPassage}
                  disabled={activePassageIndex === 0}
                  className="px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent rounded transition"
                  title="Previous matching passage"
                >
                  &larr; Prev
                </button>
                <div className="w-px bg-slate-200 my-0.5" />
                <button
                  type="button"
                  onClick={handleNextPassage}
                  disabled={activePassageIndex >= passages.length - 1}
                  className="px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent rounded transition"
                  title="Next matching passage"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Comparison Body */}
      <div className="p-6">
        {passages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
            <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-slate-800">
              Document-Level Overlap Detected
            </h4>
            <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1 leading-relaxed">
              This reference source shows algorithmic vector similarity ({activeSource?.similarity_percentage !== undefined ? `${activeSource.similarity_percentage}%` : `${activeSource?.similarity || 0}%`}) with your submission via TF-IDF representations.
              No specific verbatim passages exceeded the sentence-level match confidence threshold.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Passage quick selector badges */}
            {passages.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap pb-2 border-b border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 mr-1">
                  Detected Passages:
                </span>
                {passages.map((p, pIdx) => {
                  const isCurrent = pIdx === activePassageIndex;
                  return (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setActivePassageIndex(pIdx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                        isCurrent
                          ? "bg-amber-100 text-amber-900 border-amber-300 shadow-2xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Passage #{pIdx + 1}
                      <span className="ml-1 text-[10px] font-medium opacity-80">
                        ({Math.round(p.similarity || 0)}%)
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Side-by-side passage panels */}
            {currentPassage && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-slate-700">
                    Inspecting Passage #{activePassageIndex + 1}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-3 py-0.5 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Match Confidence: {Math.round(currentPassage.similarity || 0)}%
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column: Submitted Document */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 flex flex-col justify-between shadow-2xs">
                    <div>
                      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-amber-200/60 text-xs">
                        <span className="font-bold text-amber-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Submitted Document
                        </span>
                        <span className="text-[11px] text-amber-800/80 truncate max-w-[200px]" title={fileName}>
                          {fileName}
                        </span>
                      </div>

                      <div className="text-xs text-slate-800 leading-relaxed font-serif bg-white/80 p-3.5 rounded-lg border border-amber-200/70 shadow-inner max-h-60 overflow-y-auto">
                        &ldquo;
                        {targetHighlighted.map((t, idx) => (
                          <span
                            key={idx}
                            className={
                              t.match
                                ? "bg-amber-200/90 text-amber-950 font-medium px-0.5 rounded"
                                : ""
                            }
                          >
                            {t.text}
                          </span>
                        ))}
                        &rdquo;
                      </div>
                    </div>

                    <div className="pt-2.5 mt-2 flex items-center justify-between text-[11px] text-amber-900/70 border-t border-amber-200/40">
                      <span>Original Casing &amp; Punctuation Preserved</span>
                    </div>
                  </div>

                  {/* Right Column: Matched Reference Source */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between shadow-2xs">
                    <div>
                      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200 text-xs">
                        <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          Matched Reference Passage
                        </span>
                        <span className="text-[11px] text-slate-500 truncate max-w-[200px]" title={activeSource.title || activeSource.name || activeSource.source}>
                          {activeSource.title || activeSource.name || activeSource.source}
                        </span>
                      </div>

                      <div className="text-xs text-slate-800 leading-relaxed font-serif bg-white p-3.5 rounded-lg border border-slate-200 shadow-inner max-h-60 overflow-y-auto">
                        &ldquo;
                        {sourceHighlighted.map((s, idx) => (
                          <span
                            key={idx}
                            className={
                              s.match
                                ? "bg-amber-200/90 text-amber-950 font-medium px-0.5 rounded"
                                : ""
                            }
                          >
                            {s.text}
                          </span>
                        ))}
                        &rdquo;
                      </div>
                    </div>

                    <div className="pt-2.5 mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60">
                      <span>Source Type: {activeSource.type || "Academic Reference"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer methodology note */}
      <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-slate-500">
        <div>
          Highlighted words denote overlapping lexical tokens identified via sequence matcher and TF-IDF analysis.
        </div>
        <div className="font-semibold text-slate-600 flex-shrink-0">
          Textual overlap is assistive evidence and does not constitute proof of plagiarism.
        </div>
      </div>
    </div>
  );
}
