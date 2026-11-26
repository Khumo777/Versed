import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  ArrowUpDown,
  BookOpen,
  Hand,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { SCRIPTURE_VERSES } from './data/scripture';
import {
  HighlightColor,
  VerseComment,
  VerseHighlight,
  VerseTheme,
} from './types';
import { VerseFrame } from './components/VerseFrame';
import { CommentPanel } from './components/CommentPanel';
import { FeedScope, NavigationDrawer } from './components/NavigationDrawer';

export type NavigationMode = 'arrows' | 'gesture';

export type BulkActionType = 'highlight' | 'comment' | 'save' | 'copy';

export interface BulkModeState {
  action: BulkActionType;
  verseIds: string[];
  highlightColor: HighlightColor;
}

const STORAGE_KEYS = {
  highlights: 'selah_highlights_kjv_v1',
  comments: 'selah_comments_v2',
  bookmarks: 'selah_bookmarks_v1',
  theme: 'selah_theme_bw_v1',
  navigation: 'selah_nav_mode_v1',
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() =>
    loadJson<boolean>(STORAGE_KEYS.theme, false)
  );
  const [navigationMode, setNavigationMode] = useState<NavigationMode>(() =>
    loadJson<NavigationMode>(STORAGE_KEYS.navigation, 'arrows')
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const [highlights, setHighlights] = useState<VerseHighlight[]>(() =>
    loadJson<VerseHighlight[]>(STORAGE_KEYS.highlights, [])
  );
  const [comments, setComments] = useState<VerseComment[]>(() =>
    loadJson<VerseComment[]>(STORAGE_KEYS.comments, [])
  );
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() =>
    loadJson<string[]>(STORAGE_KEYS.bookmarks, [])
  );

  // Feed filtering state
  const [scope, setScope] = useState<FeedScope>('all');
  const [selectedTheme, setSelectedTheme] = useState<'All' | VerseTheme>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Active verse & transition direction
  const [activeVerseId, setActiveVerseId] = useState<string>(SCRIPTURE_VERSES[0].id);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [mobileIndexOpen, setMobileIndexOpen] = useState(false);
  const [mobileCommentsOpen, setMobileCommentsOpen] = useState(false);
  const [commentFocusTrigger, setCommentFocusTrigger] = useState(0);
  const [draftQuote, setDraftQuote] = useState('');
  const [bulkMode, setBulkMode] = useState<BulkModeState | null>(null);
  const [bulkCommentVerseIds, setBulkCommentVerseIds] = useState<string[] | null>(null);
  const [bulkCopiedCount, setBulkCopiedCount] = useState<number | null>(null);

  // Sync .dark on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(isDark));
  }, [isDark]);

  // Persist navigation mode
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.navigation, JSON.stringify(navigationMode));
  }, [navigationMode]);

  // Close settings menu on outside click or Escape
  useEffect(() => {
    if (!settingsOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [settingsOpen]);

  // Persist user study data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.highlights, JSON.stringify(highlights));
  }, [highlights]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.comments, JSON.stringify(comments));
  }, [comments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.bookmarks, JSON.stringify(bookmarkedIds));
  }, [bookmarkedIds]);

  const highlightsByVerse = useMemo(() => {
    return highlights.reduce<Record<string, VerseHighlight[]>>((acc, hl) => {
      if (!acc[hl.verseId]) acc[hl.verseId] = [];
      acc[hl.verseId].push(hl);
      return acc;
    }, {});
  }, [highlights]);

  const commentsByVerse = useMemo(() => {
    return comments.reduce<Record<string, VerseComment[]>>((acc, comment) => {
      if (!acc[comment.verseId]) acc[comment.verseId] = [];
      acc[comment.verseId].push(comment);
      return acc;
    }, {});
  }, [comments]);

  const filteredVerses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return SCRIPTURE_VERSES.filter((v) => {
      if (scope === 'saved' && !bookmarkedIds.includes(v.id)) return false;
      if (scope === 'highlighted' && (highlightsByVerse[v.id] || []).length === 0) {
        return false;
      }
      if (selectedTheme !== 'All' && v.theme !== selectedTheme) return false;
      if (query) {
        const ref = `${v.book} ${v.chapter}:${v.verse}`.toLowerCase();
        const body = v.text.toLowerCase();
        return ref.includes(query) || body.includes(query);
      }
      return true;
    });
  }, [scope, selectedTheme, searchQuery, bookmarkedIds, highlightsByVerse]);

  useEffect(() => {
    if (filteredVerses.length === 0) return;
    if (!filteredVerses.some((v) => v.id === activeVerseId)) {
      setDirection(1);
      setActiveVerseId(filteredVerses[0].id);
    }
  }, [filteredVerses, activeVerseId]);

  const activeIndex = useMemo(() => {
    const idx = filteredVerses.findIndex((v) => v.id === activeVerseId);
    return idx >= 0 ? idx : 0;
  }, [filteredVerses, activeVerseId]);

  const activeVerse = filteredVerses[activeIndex];

  // Automatically collect each verse scrolled into view while bulk mode is active
  useEffect(() => {
    if (!bulkMode || !activeVerse) return;
    setBulkMode((prev) => {
      if (!prev || prev.verseIds.includes(activeVerse.id)) return prev;
      return {
        ...prev,
        verseIds: [...prev.verseIds, activeVerse.id],
      };
    });
  }, [activeVerse?.id, bulkMode !== null]);

  const goToIndex = useCallback(
    (nextIdx: number) => {
      if (filteredVerses.length === 0) return;
      const clamped = Math.max(0, Math.min(nextIdx, filteredVerses.length - 1));
      if (clamped === activeIndex) return;
      setDirection(clamped > activeIndex ? 1 : -1);
      setActiveVerseId(filteredVerses[clamped].id);
      setDraftQuote('');
    },
    [filteredVerses, activeIndex]
  );

  const handleSelectVerseById = useCallback(
    (verseId: string) => {
      const idx = filteredVerses.findIndex((v) => v.id === verseId);
      if (idx >= 0) {
        goToIndex(idx);
        return;
      }
      const globalIdx = SCRIPTURE_VERSES.findIndex((v) => v.id === verseId);
      if (globalIdx >= 0) {
        setScope('all');
        setSelectedTheme('All');
        setSearchQuery('');
        setDirection(globalIdx > activeIndex ? 1 : -1);
        setActiveVerseId(verseId);
        setDraftQuote('');
      }
    },
    [filteredVerses, goToIndex, activeIndex]
  );

  // Keyboard navigation (ArrowUp / ArrowDown / j / k)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        goToIndex(activeIndex + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        goToIndex(activeIndex - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, goToIndex]);

  const handleToggleBookmark = (verseId: string) => {
    setBookmarkedIds((prev) =>
      prev.includes(verseId) ? prev.filter((id) => id !== verseId) : [...prev, verseId]
    );
  };

  const handleAddHighlight = (
    verseId: string,
    color: HighlightColor,
    startWordIndex: number | null,
    endWordIndex: number | null,
    excerpt: string
  ) => {
    setHighlights((prev) => {
      const filtered =
        startWordIndex === null
          ? prev.filter((h) => !(h.verseId === verseId && h.startWordIndex === null))
          : prev;

      const newHighlight: VerseHighlight = {
        id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        verseId,
        color,
        startWordIndex,
        endWordIndex,
        excerpt,
        createdAt: new Date().toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
      };
      return [...filtered, newHighlight];
    });
  };

  const handleClearVerseHighlights = (verseId: string) => {
    setHighlights((prev) => prev.filter((h) => h.verseId !== verseId));
  };

  const handleRemoveHighlightById = (highlightId: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
  };

  const handleAddComment = (body: string, linkedExcerpt?: string) => {
    if (!activeVerse) return;
    const targetIds =
      bulkCommentVerseIds && bulkCommentVerseIds.length > 0
        ? bulkCommentVerseIds
        : [activeVerse.id];

    const timestamp = new Date().toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const newComments: VerseComment[] = targetIds.map((vId) => ({
      id: `cmt-${Date.now()}-${vId}-${Math.random().toString(36).slice(2, 6)}`,
      verseId: vId,
      body,
      createdAt: timestamp,
      linkedExcerpt,
    }));

    setComments((prev) => [...newComments, ...prev]);
    setDraftQuote('');
    setBulkCommentVerseIds(null);
  };

  const handleStartBulkMode = (action: BulkActionType) => {
    if (!activeVerse) return;
    setBulkCommentVerseIds(null);
    setBulkMode({
      action,
      verseIds: [activeVerse.id],
      highlightColor: 'gold',
    });
  };

  const handleCancelBulkMode = () => {
    setBulkMode(null);
  };

  const handleChangeBulkHighlightColor = (color: HighlightColor) => {
    setBulkMode((prev) => (prev ? { ...prev, highlightColor: color } : null));
  };

  const handleCommitBulkMode = async () => {
    if (!bulkMode) return;
    const orderedIds = SCRIPTURE_VERSES.filter((v) =>
      bulkMode.verseIds.includes(v.id)
    ).map((v) => v.id);

    const targetIds = orderedIds.length > 0 ? orderedIds : bulkMode.verseIds;

    if (bulkMode.action === 'highlight') {
      const dateLabel = new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      setHighlights((prev) => {
        const remaining = prev.filter(
          (h) => !(targetIds.includes(h.verseId) && h.startWordIndex === null)
        );
        const added: VerseHighlight[] = targetIds
          .map((vId) => {
            const verseObj = SCRIPTURE_VERSES.find((v) => v.id === vId);
            if (!verseObj) return null;
            return {
              id: `hl-${Date.now()}-${vId}-${Math.random().toString(36).slice(2, 6)}`,
              verseId: vId,
              color: bulkMode.highlightColor,
              startWordIndex: null,
              endWordIndex: null,
              excerpt: verseObj.text,
              createdAt: dateLabel,
            } as VerseHighlight;
          })
          .filter((item): item is VerseHighlight => item !== null);
        return [...remaining, ...added];
      });
      setBulkMode(null);
      return;
    }

    if (bulkMode.action === 'save') {
      setBookmarkedIds((prev) => {
        const allAlreadySaved = targetIds.every((id) => prev.includes(id));
        if (allAlreadySaved) {
          return prev.filter((id) => !targetIds.includes(id));
        }
        const next = new Set([...prev, ...targetIds]);
        return Array.from(next);
      });
      setBulkMode(null);
      return;
    }

    if (bulkMode.action === 'copy') {
      const versesToCopy = SCRIPTURE_VERSES.filter((v) => targetIds.includes(v.id));
      const formatted = versesToCopy
        .map((v) => `"${v.text}" — ${v.book} ${v.chapter}:${v.verse} (KJV)`)
        .join('\n\n');
      try {
        await navigator.clipboard.writeText(formatted);
        setBulkCopiedCount(versesToCopy.length);
        window.setTimeout(() => setBulkCopiedCount(null), 2000);
      } catch {
        // Clipboard blocked in restricted contexts
      }
      setBulkMode(null);
      return;
    }

    if (bulkMode.action === 'comment') {
      setBulkCommentVerseIds(targetIds);
      setBulkMode(null);
      setMobileCommentsOpen(true);
      setCommentFocusTrigger((n) => n + 1);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const handleOpenComments = () => {
    setBulkCommentVerseIds(null);
    setMobileCommentsOpen(true);
    setCommentFocusTrigger((n) => n + 1);
  };

  const handleQuoteToComment = (excerpt: string) => {
    setBulkCommentVerseIds(null);
    setDraftQuote(excerpt);
    setMobileCommentsOpen(true);
    setCommentFocusTrigger((n) => n + 1);
  };

  const bulkCommentVerses = useMemo(() => {
    if (!bulkCommentVerseIds || bulkCommentVerseIds.length === 0) return [];
    return SCRIPTURE_VERSES.filter((v) => bulkCommentVerseIds.includes(v.id));
  }, [bulkCommentVerseIds]);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-white text-stone-900 transition-colors duration-300 dark:bg-black dark:text-stone-100">
      {/* Left Rail: Scripture Index & Filters */}
      <NavigationDrawer
        allVerses={SCRIPTURE_VERSES}
        verses={filteredVerses}
        activeVerseId={activeVerse?.id}
        scope={scope}
        selectedTheme={selectedTheme}
        searchQuery={searchQuery}
        bookmarkedIds={bookmarkedIds}
        highlightsByVerse={highlightsByVerse}
        isMobileOpen={mobileIndexOpen}
        onChangeScope={setScope}
        onChangeTheme={setSelectedTheme}
        onChangeSearch={setSearchQuery}
        onSelectVerse={handleSelectVerseById}
        onCloseMobile={() => setMobileIndexOpen(false)}
      />

      {/* Center Stage: Plain White / Plain Black Background with Centered Verse Wording */}
      <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-black">
        {/* Compact Top Bar */}
        <header className="pointer-events-none absolute top-0 right-0 left-0 z-30 flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="pointer-events-auto flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileIndexOpen(true)}
              aria-label="Open scripture index"
              className="flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-800 transition-colors hover:bg-stone-50 lg:hidden dark:border-stone-800 dark:bg-black dark:text-stone-100 dark:hover:bg-stone-900"
            >
              <BookOpen className="h-4 w-4" />
            </button>

            {activeVerse && (
              <MotionConfig reducedMotion="user">
                <h2 className="flex items-baseline font-serif text-xl font-medium tracking-tight text-[#004B7A] whitespace-nowrap sm:text-2xl dark:text-[#6EB5E5]">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={`${activeVerse.book}-${activeVerse.chapter}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.32, ease: 'easeInOut' }}
                      className="leading-8"
                    >
                      {activeVerse.book} {activeVerse.chapter}
                    </motion.span>
                  </AnimatePresence>
                  <span className="leading-8">:</span>
                  <span className="relative inline-flex h-8 overflow-hidden align-baseline">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={`${activeVerse.book}-${activeVerse.chapter}-${activeVerse.verse}`}
                        initial={{ opacity: 0, y: direction * 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: direction * -14 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className="inline-block leading-8 tabular-nums"
                      >
                        {activeVerse.verse}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </h2>
              </MotionConfig>
            )}
          </div>

          <div className="pointer-events-auto flex items-center gap-3">
            <span className="font-mono text-xs font-medium tracking-wide text-stone-500 whitespace-nowrap shrink-0 dark:text-stone-400">
              KJV
            </span>

            {/* Top-Corner Settings Dot Button & Menu */}
            <div ref={settingsRef} className="relative">
              <button
                type="button"
                onClick={() => setSettingsOpen((prev) => !prev)}
                aria-expanded={settingsOpen}
                aria-label="Open reading settings"
                title="Settings"
                className="group flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90"
              >
                <span
                  aria-hidden="true"
                  className={`h-3 w-3 rounded-full transition-all duration-200 ${
                    settingsOpen
                      ? 'scale-125 bg-[#004B7A] ring-4 ring-[#004B7A]/20 dark:bg-[#6EB5E5] dark:ring-[#6EB5E5]/25'
                      : 'bg-[#004B7A]/75 shadow-[0_0_8px_rgba(0,75,122,0.35)] group-hover:scale-125 group-hover:bg-[#004B7A] dark:bg-[#6EB5E5]/80 dark:shadow-[0_0_8px_rgba(110,181,229,0.4)] dark:group-hover:bg-[#6EB5E5]'
                  }`}
                />
              </button>

              {settingsOpen && (
                <div
                  role="dialog"
                  aria-label="Reading settings"
                  className="absolute top-full right-0 mt-2 w-72 rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl dark:border-stone-800 dark:bg-black"
                >
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2.5 dark:border-stone-800">
                    <span className="font-serif text-sm font-medium text-stone-900 dark:text-white">
                      Settings
                    </span>
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(false)}
                      aria-label="Close settings"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Day / Night Mode */}
                  <div className="mt-3.5">
                    <span className="text-[11px] font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
                      Appearance
                    </span>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsDark(false)}
                        className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border text-xs font-medium transition-colors ${
                          !isDark
                            ? 'border-[#004B7A] bg-[#004B7A] text-white'
                            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-800 dark:bg-black dark:text-stone-300 dark:hover:bg-stone-900'
                        }`}
                      >
                        <Sun className="h-3.5 w-3.5" />
                        <span>Day</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDark(true)}
                        className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border text-xs font-medium transition-colors ${
                          isDark
                            ? 'border-[#6EB5E5] bg-[#6EB5E5] text-black'
                            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-800 dark:bg-black dark:text-stone-300 dark:hover:bg-stone-900'
                        }`}
                      >
                        <Moon className="h-3.5 w-3.5" />
                        <span>Night</span>
                      </button>
                    </div>
                  </div>

                  {/* Verse Control: Arrows vs Finger Gesture */}
                  <div className="mt-4 border-t border-stone-200 pt-3.5 dark:border-stone-800">
                    <span className="text-[11px] font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
                      Verse Scroll Control
                    </span>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNavigationMode('arrows')}
                        className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border text-xs font-medium transition-colors ${
                          navigationMode === 'arrows'
                            ? 'border-[#004B7A] bg-[#004B7A] text-white dark:border-[#6EB5E5] dark:bg-[#6EB5E5] dark:text-black'
                            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-800 dark:bg-black dark:text-stone-300 dark:hover:bg-stone-900'
                        }`}
                      >
                        <ArrowUpDown className="h-3.5 w-3.5" />
                        <span>Arrows</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNavigationMode('gesture')}
                        className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border text-xs font-medium transition-colors ${
                          navigationMode === 'gesture'
                            ? 'border-[#004B7A] bg-[#004B7A] text-white dark:border-[#6EB5E5] dark:bg-[#6EB5E5] dark:text-black'
                            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-800 dark:bg-black dark:text-stone-300 dark:hover:bg-stone-900'
                        }`}
                      >
                        <Hand className="h-3.5 w-3.5" />
                        <span>Gesture</span>
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                      {navigationMode === 'arrows'
                        ? 'Use the up and down arrow buttons at the bottom to change verses.'
                        : 'Swipe your finger or scroll up and down anywhere to change verses.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {!activeVerse ? (
          <div className="flex h-full flex-col items-center justify-center bg-white px-6 text-center dark:bg-black">
            <h2 className="font-serif text-2xl font-medium text-stone-800 dark:text-stone-100">
              No verses in this view
            </h2>
            <p className="mt-2 max-w-sm text-sm text-stone-500 dark:text-stone-400">
              {scope === 'highlighted'
                ? 'Highlight a verse or phrase while reading to build your personal study collection.'
                : scope === 'saved'
                  ? 'Bookmark verses while reading to revisit them here anytime.'
                  : 'Try clearing your search or switching back to all themes.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setScope('all');
                setSelectedTheme('All');
                setSearchQuery('');
              }}
              className="mt-5 min-h-[44px] rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-800 dark:bg-white dark:text-black dark:hover:bg-stone-200"
            >
              Return to all verses
            </button>
          </div>
        ) : (
          <VerseFrame
            verse={activeVerse}
            index={activeIndex}
            totalCount={filteredVerses.length}
            direction={direction}
            highlights={highlightsByVerse[activeVerse.id] || []}
            commentCount={(commentsByVerse[activeVerse.id] || []).length}
            isBookmarked={bookmarkedIds.includes(activeVerse.id)}
            isDark={isDark}
            navigationMode={navigationMode}
            canGoPrev={activeIndex > 0}
            canGoNext={activeIndex < filteredVerses.length - 1}
            bulkMode={bulkMode}
            bulkCopiedCount={bulkCopiedCount}
            onStartBulkMode={handleStartBulkMode}
            onCommitBulkMode={handleCommitBulkMode}
            onCancelBulkMode={handleCancelBulkMode}
            onChangeBulkHighlightColor={handleChangeBulkHighlightColor}
            onToggleBookmark={() => handleToggleBookmark(activeVerse.id)}
            onOpenComments={handleOpenComments}
            onAddHighlight={(color, start, end, excerpt) =>
              handleAddHighlight(activeVerse.id, color, start, end, excerpt)
            }
            onClearHighlights={() => handleClearVerseHighlights(activeVerse.id)}
            onQuoteToComment={handleQuoteToComment}
            onStepPrev={() => goToIndex(activeIndex - 1)}
            onStepNext={() => goToIndex(activeIndex + 1)}
          />
        )}
      </main>

      {/* Right Margin: Personal Study Notes & Comments */}
      <CommentPanel
        verse={activeVerse}
        comments={activeVerse ? commentsByVerse[activeVerse.id] || [] : []}
        highlights={activeVerse ? highlightsByVerse[activeVerse.id] || [] : []}
        draftQuote={draftQuote}
        bulkVerses={bulkCommentVerses}
        isMobileOpen={mobileCommentsOpen}
        focusTrigger={commentFocusTrigger}
        onClearDraftQuote={() => setDraftQuote('')}
        onCancelBulkComment={() => setBulkCommentVerseIds(null)}
        onQuoteHighlight={handleQuoteToComment}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
        onRemoveHighlight={handleRemoveHighlightById}
        onCloseMobile={() => setMobileCommentsOpen(false)}
      />
    </div>
  );
}
