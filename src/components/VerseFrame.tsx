import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Highlighter,
  Languages,
  MessageSquareText,
  X,
} from 'lucide-react';
import {
  BibleVerse,
  HIGHLIGHT_PALETTE,
  HighlightColor,
  VerseHighlight,
} from '../types';
import type { BulkActionType, BulkModeState, NavigationMode } from '../App';
import { HighlightToolbar } from './HighlightToolbar';
import { lookupWordLexicon } from '../data/kjvLexicon';

interface VerseFrameProps {
  verse: BibleVerse;
  index: number;
  totalCount: number;
  direction: 1 | -1;
  highlights: VerseHighlight[];
  commentCount: number;
  isBookmarked: boolean;
  isDark: boolean;
  navigationMode: NavigationMode;
  canGoPrev: boolean;
  canGoNext: boolean;
  bulkMode: BulkModeState | null;
  bulkCopiedCount: number | null;
  onStartBulkMode: (action: BulkActionType) => void;
  onCommitBulkMode: () => void;
  onCancelBulkMode: () => void;
  onChangeBulkHighlightColor: (color: HighlightColor) => void;
  onToggleBookmark: () => void;
  onOpenComments: () => void;
  onAddHighlight: (
    color: HighlightColor,
    startWordIndex: number | null,
    endWordIndex: number | null,
    excerpt: string
  ) => void;
  onClearHighlights: () => void;
  onQuoteToComment: (excerpt: string) => void;
  onStepPrev: () => void;
  onStepNext: () => void;
}

const TORCH_EASE = [0.22, 1, 0.36, 1] as const;

export function VerseFrame({
  verse,
  index: _index,
  totalCount: _totalCount,
  direction,
  highlights,
  commentCount,
  isBookmarked,
  isDark,
  navigationMode,
  canGoPrev,
  canGoNext,
  bulkMode,
  bulkCopiedCount,
  onStartBulkMode,
  onCommitBulkMode,
  onCancelBulkMode,
  onChangeBulkHighlightColor,
  onToggleBookmark,
  onOpenComments,
  onAddHighlight,
  onClearHighlights,
  onQuoteToComment,
  onStepPrev,
  onStepNext,
}: VerseFrameProps) {
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [isPhraseMode, setIsPhraseMode] = useState(false);
  const [anchorWord, setAnchorWord] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<[number, number] | null>(null);
  const [showLexicon, setShowLexicon] = useState(false);
  const [inspectedWordIdx, setInspectedWordIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const lastWheelStepRef = useRef<number>(0);
  const touchStartYRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef<BulkActionType | null>(null);

  const clearHoldTimer = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearHoldTimer();
  }, []);

  useEffect(() => {
    if (!bulkMode) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelBulkMode();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [bulkMode, onCancelBulkMode]);

  const makeBulkButtonHandlers = (
    action: BulkActionType,
    onNormalTap: () => void
  ) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      longPressFiredRef.current = null;
      clearHoldTimer();
      holdTimerRef.current = window.setTimeout(() => {
        longPressFiredRef.current = action;
        setHighlightOpen(false);
        setIsPhraseMode(false);
        setShowLexicon(false);
        setInspectedWordIdx(null);
        onStartBulkMode(action);
        navigator.vibrate?.(16);
      }, 460);
    },
    onPointerUp: clearHoldTimer,
    onPointerLeave: clearHoldTimer,
    onPointerCancel: clearHoldTimer,
    onContextMenu: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
    },
    onClick: () => {
      if (longPressFiredRef.current === action) {
        longPressFiredRef.current = null;
        return;
      }
      if (bulkMode?.action === action) {
        onCommitBulkMode();
        return;
      }
      if (bulkMode) {
        onCancelBulkMode();
      }
      onNormalTap();
    },
  });

  const verseText = verse.text;
  const words = useMemo(() => verseText.split(/\s+/), [verseText]);
  const lexiconInspectActive = showLexicon && !highlightOpen && !isPhraseMode;

  const wordStagger = useMemo(
    () => Math.min(0.036, 0.55 / Math.max(words.length, 1)),
    [words.length]
  );

  // Reset transient selection state when verse changes
  useEffect(() => {
    setHighlightOpen(false);
    setIsPhraseMode(false);
    setAnchorWord(null);
    setSelectedRange(null);
    setInspectedWordIdx((prev) => (prev !== null ? 0 : null));
  }, [verse.id]);

  const wholeVerseHighlight = useMemo(
    () => highlights.find((h) => h.startWordIndex === null),
    [highlights]
  );

  const selectedExcerpt = useMemo(() => {
    if (!selectedRange) return '';
    return words.slice(selectedRange[0], selectedRange[1] + 1).join(' ');
  }, [selectedRange, words]);

  const inspectedLexiconEntry = useMemo(() => {
    if (!lexiconInspectActive || inspectedWordIdx === null) return null;
    const rawWord = words[inspectedWordIdx];
    if (!rawWord) return null;
    return lookupWordLexicon(rawWord, verse);
  }, [lexiconInspectActive, inspectedWordIdx, words, verse]);

  const inspectWordFromPoint = (clientX: number, clientY: number) => {
    if (!lexiconInspectActive) return;
    const hit = document.elementFromPoint(clientX, clientY);
    const wordEl = hit?.closest<HTMLElement>('[data-word-idx]');
    if (!wordEl) return;
    const parsed = Number(wordEl.dataset.wordIdx);
    if (!Number.isNaN(parsed)) {
      setInspectedWordIdx((prev) => (prev === parsed ? prev : parsed));
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLElement>) => {
    if (navigationMode !== 'gesture' || highlightOpen) return;
    if (Math.abs(e.deltaY) < 24) return;
    const now = Date.now();
    if (now - lastWheelStepRef.current < 620) return;

    if (e.deltaY > 0 && canGoNext) {
      lastWheelStepRef.current = now;
      onStepNext();
    } else if (e.deltaY < 0 && canGoPrev) {
      lastWheelStepRef.current = now;
      onStepPrev();
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (navigationMode !== 'gesture' || highlightOpen || showLexicon) return;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    if (
      navigationMode !== 'gesture' ||
      highlightOpen ||
      showLexicon ||
      touchStartYRef.current === null
    ) {
      return;
    }
    const deltaY = touchStartYRef.current - e.changedTouches[0].clientY;
    touchStartYRef.current = null;
    if (Math.abs(deltaY) < 42) return;

    if (deltaY > 0 && canGoNext) {
      onStepNext();
    } else if (deltaY < 0 && canGoPrev) {
      onStepPrev();
    }
  };

  const handleWordClick = (wordIdx: number) => {
    if (!isPhraseMode && !highlightOpen) return;

    if (!isPhraseMode && highlightOpen) {
      setIsPhraseMode(true);
      setAnchorWord(wordIdx);
      setSelectedRange([wordIdx, wordIdx]);
      return;
    }

    if (anchorWord === null) {
      setAnchorWord(wordIdx);
      setSelectedRange([wordIdx, wordIdx]);
    } else {
      const start = Math.min(anchorWord, wordIdx);
      const end = Math.max(anchorWord, wordIdx);
      setSelectedRange([start, end]);
      setAnchorWord(null);
    }
  };

  const handleApplyColor = (color: HighlightColor) => {
    if (selectedRange) {
      const excerpt = words.slice(selectedRange[0], selectedRange[1] + 1).join(' ');
      onAddHighlight(color, selectedRange[0], selectedRange[1], excerpt);
      setSelectedRange(null);
      setAnchorWord(null);
      setIsPhraseMode(false);
    } else {
      onAddHighlight(color, null, null, verseText);
      setHighlightOpen(false);
    }
  };

  const handleCopy = async () => {
    const formatted = `"${verseText}" — ${verse.book} ${verse.chapter}:${verse.verse} (KJV)`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked in restricted contexts
    }
  };

  const getWordStyle = (wordIdx: number): string => {
    const isSelected =
      selectedRange !== null && wordIdx >= selectedRange[0] && wordIdx <= selectedRange[1];

    if (isSelected) {
      return 'bg-stone-900/10 text-stone-950 underline decoration-amber-600 decoration-2 underline-offset-4 rounded-sm px-0.5 dark:bg-white/25 dark:text-white dark:decoration-amber-300';
    }

    const isLexiconInspected = lexiconInspectActive && inspectedWordIdx === wordIdx;

    const phraseMatch = [...highlights]
      .reverse()
      .find(
        (h) =>
          h.startWordIndex !== null &&
          h.endWordIndex !== null &&
          wordIdx >= h.startWordIndex &&
          wordIdx <= h.endWordIndex
      );

    const effective = phraseMatch || wholeVerseHighlight;
    if (!effective) {
      if (isLexiconInspected) {
        return 'bg-[#004B7A]/12 text-[#004B7A] underline decoration-[#004B7A] decoration-2 underline-offset-4 rounded-sm px-0.5 dark:bg-[#6EB5E5]/20 dark:text-[#6EB5E5] dark:decoration-[#6EB5E5]';
      }
      return '';
    }

    const paletteItem = HIGHLIGHT_PALETTE.find((p) => p.id === effective.color);
    if (!paletteItem) return '';

    const baseHighlight = `${isDark ? paletteItem.darkTextBgClass : paletteItem.lightTextBgClass} underline decoration-2 underline-offset-4 rounded-sm px-0.5`;
    if (isLexiconInspected) {
      return `${baseHighlight} ring-1 ring-[#004B7A] dark:ring-[#6EB5E5]`;
    }
    return baseHighlight;
  };

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-label={`${verse.book} ${verse.chapter}:${verse.verse}`}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative flex h-full w-full items-center justify-center overflow-hidden bg-white transition-colors duration-300 select-none dark:bg-black"
      >
        {/* Main scripture stage — full centered width with bottom dock */}
        <div className="relative z-10 mx-auto flex h-full w-full max-w-3xl flex-col px-5 pt-16 pb-5 sm:px-10 sm:pt-20 sm:pb-7">
          {/* Centered Verse Wording Stage — unobstructed horizontal span */}
          <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto py-2 sm:py-4">
            <div className="relative my-auto w-full py-2 sm:py-4">
              {/* Subtle warm hovering torchlight glow drifting softly across the centered text */}
              <motion.div
                aria-hidden="true"
                animate={{
                  x: [-24, 32, -10, -24],
                  y: [-14, 12, -6, -14],
                  opacity: isDark ? [0.45, 0.75, 0.55, 0.45] : [0.35, 0.6, 0.4, 0.35],
                }}
                transition={{
                  duration: 11,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="pointer-events-none absolute -inset-x-12 -inset-y-8 -z-10 rounded-full blur-3xl"
                style={{
                  background: isDark
                    ? 'radial-gradient(circle at 45% 45%, rgba(251, 191, 36, 0.14), rgba(217, 119, 6, 0.04) 45%, transparent 72%)'
                    : 'radial-gradient(circle at 45% 45%, rgba(245, 158, 11, 0.14), rgba(217, 119, 6, 0.04) 45%, transparent 72%)',
                }}
              />

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={verse.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, filter: 'blur(4px)' }}
                  transition={{ duration: 0.42, ease: TORCH_EASE }}
                >
                  <blockquote
                    onTouchStart={
                      lexiconInspectActive
                        ? (e) => {
                            const touch = e.touches[0];
                            if (touch) inspectWordFromPoint(touch.clientX, touch.clientY);
                          }
                        : undefined
                    }
                    onTouchMove={
                      lexiconInspectActive
                        ? (e) => {
                            const touch = e.touches[0];
                            if (touch) inspectWordFromPoint(touch.clientX, touch.clientY);
                          }
                        : undefined
                    }
                    className={`text-center font-serif text-[clamp(1.3rem,2.6vw,2.15rem)] leading-[1.45] font-normal text-stone-900 text-balance dark:text-stone-50 ${
                      lexiconInspectActive
                        ? 'touch-none select-none'
                        : isPhraseMode || highlightOpen
                          ? 'select-none'
                          : 'select-text'
                    }`}
                  >
                    {words.map((word, wordIdx) => {
                      const highlightStyle = getWordStyle(wordIdx);
                      const highlightInteractive = isPhraseMode || highlightOpen;
                      return (
                        <span key={`${verse.id}-${wordIdx}`}>
                          <motion.span
                            data-word-idx={wordIdx}
                            initial={{
                              opacity: 0,
                              filter: 'blur(5px)',
                              y: direction * 4,
                            }}
                            animate={{
                              opacity: 1,
                              filter: 'blur(0px)',
                              y: 0,
                            }}
                            transition={{
                              duration: 0.65,
                              delay: wordIdx * wordStagger,
                              ease: TORCH_EASE,
                            }}
                            onMouseEnter={
                              lexiconInspectActive
                                ? () => setInspectedWordIdx(wordIdx)
                                : undefined
                            }
                            onPointerEnter={
                              lexiconInspectActive
                                ? () => setInspectedWordIdx(wordIdx)
                                : undefined
                            }
                            onClick={
                              highlightInteractive
                                ? () => handleWordClick(wordIdx)
                                : lexiconInspectActive
                                  ? () => setInspectedWordIdx(wordIdx)
                                  : undefined
                            }
                            className={`inline-block ${highlightStyle} ${
                              highlightInteractive
                                ? 'cursor-pointer transition-colors hover:bg-amber-200/50 dark:hover:bg-amber-400/20'
                                : lexiconInspectActive
                                  ? 'cursor-pointer rounded-sm transition-colors hover:bg-[#004B7A]/8 dark:hover:bg-[#6EB5E5]/15'
                                  : ''
                            }`}
                          >
                            {word}
                          </motion.span>
                          {wordIdx < words.length - 1 ? ' ' : ''}
                        </span>
                      );
                    })}
                  </blockquote>

                  {/* Highlight color dots when verse has highlights and toolbar is closed */}
                  {highlights.length > 0 && !highlightOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="mt-4 flex flex-wrap items-center justify-center gap-2"
                    >
                      {highlights.map((hl) => {
                        const palette = HIGHLIGHT_PALETTE.find((p) => p.id === hl.color);
                        if (!palette) return null;
                        return (
                          <button
                            key={hl.id}
                            type="button"
                            onClick={() => setHighlightOpen(true)}
                            aria-label={`Modify ${palette.label} highlight`}
                            title={`${palette.label} (${palette.meaning})`}
                            className="flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-125 active:scale-95"
                          >
                            <span className={`h-3 w-3 rounded-full ${palette.swatchClass}`} />
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Interactive Highlight Toolbar */}
              <HighlightToolbar
                isOpen={highlightOpen}
                isPhraseMode={isPhraseMode}
                selectedRange={selectedRange}
                selectedExcerpt={selectedExcerpt}
                existingHighlights={highlights}
                onTogglePhraseMode={() => {
                  setIsPhraseMode((prev) => !prev);
                  setAnchorWord(null);
                  setSelectedRange(null);
                }}
                onApplyColor={handleApplyColor}
                onClearAllHighlights={() => {
                  onClearHighlights();
                  setSelectedRange(null);
                  setAnchorWord(null);
                  setIsPhraseMode(false);
                }}
                onQuoteToComment={(excerpt) => {
                  onQuoteToComment(excerpt);
                  setHighlightOpen(false);
                }}
                onClose={() => {
                  setHighlightOpen(false);
                  setIsPhraseMode(false);
                  setAnchorWord(null);
                  setSelectedRange(null);
                }}
              />
            </div>
          </div>

          {/* Unified Bottom Dock — Bulk Banner, Lexicon Card, Utility Row & Action Bar */}
          <div className="shrink-0 pt-2">
            {bulkMode && (
              <div className="mx-auto mb-3 flex w-full max-w-md flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#004B7A]/35 bg-[#004B7A]/10 px-3.5 py-2.5 text-xs backdrop-blur-2xl shadow-[0_10px_28px_-8px_rgba(0,75,122,0.22),inset_0_1px_0_rgba(255,255,255,0.5)] dark:border-[#6EB5E5]/35 dark:bg-[#6EB5E5]/12 dark:shadow-[0_12px_30px_-8px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium text-[#004B7A] dark:text-[#6EB5E5]">
                    <span>
                      {bulkMode.action === 'highlight'
                        ? 'Bulk Highlight'
                        : bulkMode.action === 'comment'
                          ? 'Bulk Note'
                          : bulkMode.action === 'save'
                            ? 'Bulk Save'
                            : 'Bulk Copy'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {bulkMode.verseIds.length}{' '}
                      {bulkMode.verseIds.length === 1 ? 'verse' : 'verses'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-stone-600 dark:text-stone-300">
                    Scroll to select verses, then press{' '}
                    {bulkMode.action === 'highlight'
                      ? 'Highlight'
                      : bulkMode.action === 'comment'
                        ? 'Comment'
                        : bulkMode.action === 'save'
                          ? 'Save'
                          : 'Copy'}{' '}
                    again to apply.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {bulkMode.action === 'highlight' && (
                    <div className="flex items-center gap-1.5 pr-1">
                      {HIGHLIGHT_PALETTE.map((swatch) => {
                        const activeColor = bulkMode.highlightColor === swatch.id;
                        return (
                          <button
                            key={swatch.id}
                            type="button"
                            onClick={() => onChangeBulkHighlightColor(swatch.id)}
                            aria-label={`Select ${swatch.label} highlight color`}
                            className={`h-5 w-5 rounded-full transition-transform ${swatch.swatchClass} ${
                              activeColor
                                ? 'scale-110 ring-2 ring-[#004B7A] ring-offset-2 ring-offset-white dark:ring-[#6EB5E5] dark:ring-offset-black'
                                : 'opacity-70 hover:opacity-100'
                            }`}
                          />
                        );
                      })}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onCancelBulkMode}
                    aria-label="Cancel multi-verse selection"
                    className="flex min-h-[32px] items-center gap-1 rounded-xl px-2.5 text-[11px] font-medium text-stone-600 transition-colors hover:bg-stone-200/60 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            )}

            {showLexicon && (
              <div className="mx-auto mb-3 w-full max-w-md rounded-2xl border border-stone-200/80 bg-white/80 p-3.5 backdrop-blur-2xl shadow-[0_12px_32px_-8px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.85)] dark:border-white/12 dark:bg-zinc-900/75 dark:shadow-[0_16px_38px_-8px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="flex items-center justify-between gap-3 border-b border-stone-200/80 pb-2 text-xs font-medium text-stone-500 dark:border-white/10 dark:text-stone-400">
                  <span>
                    {verse.testament === 'Old Testament' ? 'Hebrew Lexicon' : 'Greek Lexicon'} ·{' '}
                    {verse.book} {verse.chapter}:{verse.verse}
                  </span>
                  <span className="text-[11px] text-stone-400 dark:text-stone-500">
                    Hover or slide finger on any word
                  </span>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  {inspectedLexiconEntry ? (
                    <motion.div
                      key={`inspected-${verse.id}-${inspectedWordIdx}`}
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12, ease: 'easeOut' }}
                      className="mt-2.5 text-xs"
                    >
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-serif text-base font-medium text-[#004B7A] dark:text-[#6EB5E5]">
                          “{inspectedLexiconEntry.word}”
                        </span>
                        <span className="text-sm text-stone-800 dark:text-stone-200">
                          {inspectedLexiconEntry.original}
                        </span>
                        <span className="italic text-stone-500 dark:text-stone-400">
                          ({inspectedLexiconEntry.transliteration})
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-stone-400 dark:text-stone-500">
                          {inspectedLexiconEntry.language} · {inspectedLexiconEntry.strongs}
                        </span>
                      </div>
                      <p className="mt-1.5 leading-relaxed text-stone-700 dark:text-stone-300">
                        {inspectedLexiconEntry.definition}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.p
                      key={`prompt-${verse.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12, ease: 'easeOut' }}
                      className="mt-2.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400"
                    >
                      Hover or slide your finger over any word in the verse above to view its lexicon definition.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Lexicon Toggle + Floating Arrow Stepper Row */}
            <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2 pb-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowLexicon((prev) => {
                    const next = !prev;
                    setInspectedWordIdx(next ? 0 : null);
                    return next;
                  });
                }}
                className={`group inline-flex min-h-[40px] items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-medium tracking-tight backdrop-blur-2xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${
                  showLexicon
                    ? 'border-[#004B7A]/40 bg-[#004B7A]/10 text-[#004B7A] shadow-[0_0_20px_-4px_rgba(0,75,122,0.28),inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-[#6EB5E5]/45 dark:bg-[#6EB5E5]/15 dark:text-[#6EB5E5] dark:shadow-[0_0_22px_-4px_rgba(110,181,229,0.32),inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'border-stone-200/80 bg-white/80 text-stone-700 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,0.85)] hover:text-stone-950 dark:border-white/12 dark:bg-zinc-900/75 dark:text-zinc-200 dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)] dark:hover:text-white'
                }`}
              >
                <Languages
                  strokeWidth={1.75}
                  className="h-3.5 w-3.5 text-[#004B7A] transition-transform duration-200 group-hover:scale-110 dark:text-[#6EB5E5]"
                />
                <span>{showLexicon ? 'Hide lexicon' : 'See lexicon'}</span>
                {showLexicon && (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-[#004B7A] shadow-[0_0_6px_rgba(0,75,122,0.7)] dark:bg-[#6EB5E5] dark:shadow-[0_0_6px_rgba(110,181,229,0.8)]"
                  />
                )}
              </button>

              {navigationMode === 'arrows' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onStepPrev}
                    disabled={!canGoPrev}
                    aria-label="Previous verse"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/80 bg-white/85 text-stone-700 backdrop-blur-2xl shadow-[0_8px_22px_-6px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:text-stone-950 active:scale-90 disabled:opacity-25 disabled:hover:translate-y-0 dark:border-white/14 dark:bg-zinc-900/80 dark:text-zinc-200 dark:shadow-[0_12px_26px_-6px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.1)] dark:hover:text-white"
                  >
                    <ChevronUp strokeWidth={2} className="h-4.5 w-4.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onStepNext}
                    disabled={!canGoNext}
                    aria-label="Next verse"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/80 bg-white/85 text-stone-700 backdrop-blur-2xl shadow-[0_8px_22px_-6px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:text-stone-950 active:scale-90 disabled:opacity-25 disabled:hover:translate-y-0 dark:border-white/14 dark:bg-zinc-900/80 dark:text-zinc-200 dark:shadow-[0_12px_26px_-6px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.1)] dark:hover:text-white"
                  >
                    <ChevronDown strokeWidth={2} className="h-4.5 w-4.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Standalone Floating Personal Study Icons (no dock box, no words) */}
            <div className="mx-auto flex w-fit items-center justify-center gap-3.5 pt-0.5 sm:gap-4">
              {/* Highlight Trigger (Long-press for multi-verse bulk highlight) */}
              <button
                type="button"
                {...makeBulkButtonHandlers('highlight', () =>
                  setHighlightOpen((prev) => !prev)
                )}
                title={
                  bulkMode?.action === 'highlight'
                    ? `Apply bulk highlight (${bulkMode.verseIds.length})`
                    : 'Highlight (hold for multiple verses)'
                }
                aria-label={
                  bulkMode?.action === 'highlight'
                    ? `Apply bulk highlight to ${bulkMode.verseIds.length} verses`
                    : 'Highlight verse or phrase (hold for multiple verses)'
                }
                className={`group relative flex h-12 w-12 touch-none items-center justify-center rounded-full border backdrop-blur-2xl transition-all duration-200 active:scale-90 ${
                  bulkMode?.action === 'highlight'
                    ? 'border-[#004B7A] bg-gradient-to-b from-[#004B7A] to-[#00395E] text-white shadow-[0_10px_26px_-4px_rgba(0,75,122,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] dark:border-[#6EB5E5] dark:from-[#6EB5E5] dark:to-[#4A9BD1] dark:text-black dark:shadow-[0_10px_26px_-4px_rgba(110,181,229,0.5)]'
                    : highlightOpen || highlights.length > 0
                      ? 'border-amber-400/50 bg-amber-500/15 text-amber-700 shadow-[0_10px_26px_-6px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.65)] hover:-translate-y-1 dark:border-amber-400/40 dark:bg-amber-400/18 dark:text-amber-300 dark:shadow-[0_10px_26px_-6px_rgba(251,191,36,0.3)]'
                      : 'border-stone-200/80 bg-white/85 text-stone-700 shadow-[0_10px_26px_-6px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.9)] hover:-translate-y-1 hover:text-stone-950 hover:shadow-[0_14px_30px_-6px_rgba(15,23,42,0.2)] dark:border-white/14 dark:bg-zinc-900/80 dark:text-zinc-200 dark:shadow-[0_14px_30px_-6px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.1)] dark:hover:text-white'
                }`}
              >
                <Highlighter
                  strokeWidth={1.85}
                  className="h-5 w-5 transition-transform duration-200 group-hover:scale-110"
                />
                {bulkMode?.action === 'highlight' && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-white px-1 font-mono text-[10px] font-semibold text-[#004B7A] shadow-sm dark:bg-black dark:text-[#6EB5E5]">
                    {bulkMode.verseIds.length}
                  </span>
                )}
              </button>

              {/* Personal Comment / Note Trigger (Long-press for multi-verse bulk note) */}
              <button
                type="button"
                {...makeBulkButtonHandlers('comment', onOpenComments)}
                title={
                  bulkMode?.action === 'comment'
                    ? `Add bulk note (${bulkMode.verseIds.length})`
                    : commentCount > 0
                      ? `Notes (${commentCount})`
                      : 'Comment (hold for multiple verses)'
                }
                aria-label={
                  bulkMode?.action === 'comment'
                    ? `Add note across ${bulkMode.verseIds.length} verses`
                    : 'Open personal notes and comments (hold for multiple verses)'
                }
                className={`group relative flex h-12 w-12 touch-none items-center justify-center rounded-full border backdrop-blur-2xl transition-all duration-200 active:scale-90 ${
                  bulkMode?.action === 'comment'
                    ? 'border-[#004B7A] bg-gradient-to-b from-[#004B7A] to-[#00395E] text-white shadow-[0_10px_26px_-4px_rgba(0,75,122,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] dark:border-[#6EB5E5] dark:from-[#6EB5E5] dark:to-[#4A9BD1] dark:text-black dark:shadow-[0_10px_26px_-4px_rgba(110,181,229,0.5)]'
                    : commentCount > 0
                      ? 'border-amber-400/50 bg-amber-500/15 text-amber-700 shadow-[0_10px_26px_-6px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.65)] hover:-translate-y-1 dark:border-amber-400/40 dark:bg-amber-400/18 dark:text-amber-300 dark:shadow-[0_10px_26px_-6px_rgba(251,191,36,0.3)]'
                      : 'border-stone-200/80 bg-white/85 text-stone-700 shadow-[0_10px_26px_-6px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.9)] hover:-translate-y-1 hover:text-stone-950 hover:shadow-[0_14px_30px_-6px_rgba(15,23,42,0.2)] dark:border-white/14 dark:bg-zinc-900/80 dark:text-zinc-200 dark:shadow-[0_14px_30px_-6px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.1)] dark:hover:text-white'
                }`}
              >
                <MessageSquareText
                  strokeWidth={1.85}
                  className="h-5 w-5 transition-transform duration-200 group-hover:scale-110"
                />
                {(bulkMode?.action === 'comment' || commentCount > 0) && (
                  <span
                    className={`absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full px-1 font-mono text-[10px] font-semibold shadow-sm ${
                      bulkMode?.action === 'comment'
                        ? 'bg-white text-[#004B7A] dark:bg-black dark:text-[#6EB5E5]'
                        : 'bg-amber-500 text-white dark:bg-amber-400 dark:text-black'
                    }`}
                  >
                    {bulkMode?.action === 'comment' ? bulkMode.verseIds.length : commentCount}
                  </span>
                )}
              </button>

              {/* Bookmark / Save (Long-press for multi-verse bulk save) */}
              <button
                type="button"
                {...makeBulkButtonHandlers('save', onToggleBookmark)}
                title={
                  bulkMode?.action === 'save'
                    ? `Save selected (${bulkMode.verseIds.length})`
                    : isBookmarked
                      ? 'Saved (hold for multiple verses)'
                      : 'Save (hold for multiple verses)'
                }
                aria-label={
                  bulkMode?.action === 'save'
                    ? `Save ${bulkMode.verseIds.length} selected verses`
                    : isBookmarked
                      ? 'Remove bookmark (hold for multiple verses)'
                      : 'Bookmark verse (hold for multiple verses)'
                }
                className={`group relative flex h-12 w-12 touch-none items-center justify-center rounded-full border backdrop-blur-2xl transition-all duration-200 active:scale-90 ${
                  bulkMode?.action === 'save'
                    ? 'border-[#004B7A] bg-gradient-to-b from-[#004B7A] to-[#00395E] text-white shadow-[0_10px_26px_-4px_rgba(0,75,122,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] dark:border-[#6EB5E5] dark:from-[#6EB5E5] dark:to-[#4A9BD1] dark:text-black dark:shadow-[0_10px_26px_-4px_rgba(110,181,229,0.5)]'
                    : isBookmarked
                      ? 'border-amber-400/50 bg-amber-500/15 text-amber-700 shadow-[0_10px_26px_-6px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.65)] hover:-translate-y-1 dark:border-amber-400/40 dark:bg-amber-400/18 dark:text-amber-300 dark:shadow-[0_10px_26px_-6px_rgba(251,191,36,0.3)]'
                      : 'border-stone-200/80 bg-white/85 text-stone-700 shadow-[0_10px_26px_-6px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.9)] hover:-translate-y-1 hover:text-stone-950 hover:shadow-[0_14px_30px_-6px_rgba(15,23,42,0.2)] dark:border-white/14 dark:bg-zinc-900/80 dark:text-zinc-200 dark:shadow-[0_14px_30px_-6px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.1)] dark:hover:text-white'
                }`}
              >
                <Bookmark
                  strokeWidth={1.85}
                  className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                    isBookmarked || bulkMode?.action === 'save' ? 'fill-current' : ''
                  }`}
                />
                {bulkMode?.action === 'save' && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-white px-1 font-mono text-[10px] font-semibold text-[#004B7A] shadow-sm dark:bg-black dark:text-[#6EB5E5]">
                    {bulkMode.verseIds.length}
                  </span>
                )}
              </button>

              {/* Copy Verse (Long-press for multi-verse bulk copy) */}
              <button
                type="button"
                {...makeBulkButtonHandlers('copy', handleCopy)}
                title={
                  bulkMode?.action === 'copy'
                    ? `Copy selected (${bulkMode.verseIds.length})`
                    : copied || bulkCopiedCount !== null
                      ? 'Copied'
                      : 'Copy (hold for multiple verses)'
                }
                aria-label={
                  bulkMode?.action === 'copy'
                    ? `Copy ${bulkMode.verseIds.length} selected verses`
                    : 'Copy verse (hold for multiple verses)'
                }
                className={`group relative flex h-12 w-12 touch-none items-center justify-center rounded-full border backdrop-blur-2xl transition-all duration-200 active:scale-90 ${
                  bulkMode?.action === 'copy'
                    ? 'border-[#004B7A] bg-gradient-to-b from-[#004B7A] to-[#00395E] text-white shadow-[0_10px_26px_-4px_rgba(0,75,122,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] dark:border-[#6EB5E5] dark:from-[#6EB5E5] dark:to-[#4A9BD1] dark:text-black dark:shadow-[0_10px_26px_-4px_rgba(110,181,229,0.5)]'
                    : copied || bulkCopiedCount !== null
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-700 shadow-[0_10px_26px_-6px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.65)] hover:-translate-y-1 dark:border-emerald-400/40 dark:bg-emerald-400/18 dark:text-emerald-300'
                      : 'border-stone-200/80 bg-white/85 text-stone-700 shadow-[0_10px_26px_-6px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.9)] hover:-translate-y-1 hover:text-stone-950 hover:shadow-[0_14px_30px_-6px_rgba(15,23,42,0.2)] dark:border-white/14 dark:bg-zinc-900/80 dark:text-zinc-200 dark:shadow-[0_14px_30px_-6px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.1)] dark:hover:text-white'
                }`}
              >
                {copied || bulkCopiedCount !== null ? (
                  <Check
                    strokeWidth={2}
                    className="h-5 w-5 transition-transform duration-200 group-hover:scale-110"
                  />
                ) : (
                  <Copy
                    strokeWidth={1.85}
                    className="h-5 w-5 transition-transform duration-200 group-hover:scale-110"
                  />
                )}
                {(bulkMode?.action === 'copy' || bulkCopiedCount !== null) && (
                  <span
                    className={`absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full px-1 font-mono text-[10px] font-semibold shadow-sm ${
                      bulkMode?.action === 'copy'
                        ? 'bg-white text-[#004B7A] dark:bg-black dark:text-[#6EB5E5]'
                        : 'bg-emerald-500 text-white dark:bg-emerald-400 dark:text-black'
                    }`}
                  >
                    {bulkMode?.action === 'copy' ? bulkMode.verseIds.length : bulkCopiedCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
