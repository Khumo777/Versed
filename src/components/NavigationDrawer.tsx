import { useMemo, useState } from 'react';
import { Bookmark, ChevronRight, Highlighter, Search, X } from 'lucide-react';
import { BibleVerse, VerseHighlight, VerseTheme } from '../types';

export type FeedScope = 'all' | 'saved' | 'highlighted';
type BrowseMode = 'books' | 'verses';
type TestamentTab = 'all' | 'Old Testament' | 'New Testament';

const THEMES: ('All' | VerseTheme)[] = [
  'All',
  'Peace',
  'Wisdom',
  'Strength',
  'Grace',
  'Love',
  'Creation',
];

const OT_SECTIONS: { label: string; books: string[] }[] = [
  {
    label: 'Law',
    books: ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'],
  },
  {
    label: 'History',
    books: [
      'Joshua',
      'Judges',
      'Ruth',
      '1 Samuel',
      '2 Samuel',
      '1 Kings',
      '2 Kings',
      '1 Chronicles',
      '2 Chronicles',
      'Ezra',
      'Nehemiah',
      'Esther',
    ],
  },
  {
    label: 'Poetry & Wisdom',
    books: ['Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon'],
  },
  {
    label: 'Major Prophets',
    books: ['Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel'],
  },
  {
    label: 'Minor Prophets',
    books: [
      'Hosea',
      'Joel',
      'Amos',
      'Obadiah',
      'Jonah',
      'Micah',
      'Nahum',
      'Habakkuk',
      'Zephaniah',
      'Haggai',
      'Zechariah',
      'Malachi',
    ],
  },
];

const NT_BOOKS = [
  'Matthew',
  'John',
  'Romans',
  '1 Corinthians',
  'Philippians',
  'Revelation',
];

interface NavigationDrawerProps {
  allVerses: BibleVerse[];
  verses: BibleVerse[];
  activeVerseId: string | undefined;
  scope: FeedScope;
  selectedTheme: 'All' | VerseTheme;
  searchQuery: string;
  bookmarkedIds: string[];
  highlightsByVerse: Record<string, VerseHighlight[]>;
  isMobileOpen: boolean;
  onChangeScope: (scope: FeedScope) => void;
  onChangeTheme: (theme: 'All' | VerseTheme) => void;
  onChangeSearch: (q: string) => void;
  onSelectVerse: (verseId: string) => void;
  onCloseMobile: () => void;
}

export function NavigationDrawer({
  allVerses,
  verses,
  activeVerseId,
  scope,
  selectedTheme,
  searchQuery,
  bookmarkedIds,
  highlightsByVerse,
  isMobileOpen,
  onChangeScope,
  onChangeTheme,
  onChangeSearch,
  onSelectVerse,
  onCloseMobile,
}: NavigationDrawerProps) {
  const [browseMode, setBrowseMode] = useState<BrowseMode>('books');
  const [testamentTab, setTestamentTab] = useState<TestamentTab>('all');
  const [versesBookOnly, setVersesBookOnly] = useState<boolean>(true);
  const [selectedChapter, setSelectedChapter] = useState<number | 'All'>('All');

  const activeVerse = useMemo(
    () => allVerses.find((v) => v.id === activeVerseId) ?? allVerses[0],
    [allVerses, activeVerseId]
  );

  // Map each book name -> its verses for instant lookup & stats
  const versesByBook = useMemo(() => {
    const map = new Map<string, BibleVerse[]>();
    for (const v of allVerses) {
      const list = map.get(v.book);
      if (list) {
        list.push(v);
      } else {
        map.set(v.book, [v]);
      }
    }
    return map;
  }, [allVerses]);

  const query = searchQuery.trim().toLowerCase();
  const isFilteredVerseList =
    scope !== 'all' || selectedTheme !== 'All' || query.length > 0;

  // Matching book shortcuts when user types in search bar
  const matchingBooks = useMemo(() => {
    if (!query) return [];
    const results: { book: string; firstVerseId: string; testament: string; count: number }[] = [];
    for (const [book, list] of versesByBook.entries()) {
      if (book.toLowerCase().includes(query) && list.length > 0) {
        results.push({
          book,
          firstVerseId: list[0].id,
          testament: list[0].testament,
          count: list.length,
        });
      }
    }
    return results;
  }, [query, versesByBook]);

  // Verses displayed in Verses mode (scoped to active book if toggled, or full filtered list)
  const displayedVerses = useMemo(() => {
    if (isFilteredVerseList || !versesBookOnly || !activeVerse) {
      return verses;
    }
    const bookVerses = verses.filter((v) => v.book === activeVerse.book);
    if (selectedChapter === 'All') return bookVerses;
    return bookVerses.filter((v) => v.chapter === selectedChapter);
  }, [isFilteredVerseList, versesBookOnly, activeVerse, verses, selectedChapter]);

  const activeBookChapters = useMemo(() => {
    if (!activeVerse) return [];
    const list = versesByBook.get(activeVerse.book) || [];
    return Array.from(new Set(list.map((v) => v.chapter)));
  }, [activeVerse, versesByBook]);

  const handleJumpToBook = (bookName: string, openVersesList = false) => {
    const list = versesByBook.get(bookName);
    if (!list || list.length === 0) return;
    setSelectedChapter('All');
    onSelectVerse(list[0].id);
    if (openVersesList) {
      setVersesBookOnly(true);
      setBrowseMode('verses');
    } else {
      onCloseMobile();
    }
  };

  const renderBookButton = (bookName: string) => {
    const bookVerses = versesByBook.get(bookName) || [];
    if (bookVerses.length === 0) return null;
    const isActiveBook = activeVerse?.book === bookName;
    const chapterCount = new Set(bookVerses.map((v) => v.chapter)).size;
    const hasStudyMarks = bookVerses.some(
      (v) =>
        bookmarkedIds.includes(v.id) || (highlightsByVerse[v.id] || []).length > 0
    );

    return (
      <button
        key={bookName}
        type="button"
        onClick={() => handleJumpToBook(bookName)}
        className={`group flex min-h-[42px] items-center justify-between gap-1.5 rounded-xl border px-2.5 py-2 text-left transition-all ${
          isActiveBook
            ? 'border-[#004B7A] bg-[#004B7A] text-white shadow-sm dark:border-[#6EB5E5] dark:bg-[#6EB5E5] dark:text-black'
            : 'border-stone-200/80 bg-stone-50/70 text-stone-800 hover:border-stone-300 hover:bg-white dark:border-stone-800/90 dark:bg-zinc-950 dark:text-stone-200 dark:hover:border-stone-700 dark:hover:bg-zinc-900'
        }`}
      >
        <span className="min-w-0 truncate text-xs font-medium">{bookName}</span>
        <span className="flex shrink-0 items-center gap-1">
          {hasStudyMarks && !isActiveBook && (
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400"
            />
          )}
          <span
            className={`font-mono text-[10px] tabular-nums ${
              isActiveBook
                ? 'text-white/85 dark:text-black/75'
                : 'text-stone-400 dark:text-stone-500'
            }`}
          >
            {chapterCount > 1 ? `${chapterCount}c` : `${bookVerses.length}v`}
          </span>
        </span>
      </button>
    );
  };

  const content = (
    <div className="flex h-full flex-col bg-white text-stone-900 dark:bg-black dark:text-stone-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3.5 dark:border-stone-800">
        <div>
          <span className="font-serif text-lg font-medium tracking-tight text-stone-900 dark:text-stone-100">
            Scripture Index
          </span>
          {activeVerse && (
            <p className="text-[11px] font-medium text-[#004B7A] dark:text-[#6EB5E5]">
              Reading {activeVerse.book} {activeVerse.chapter}:{activeVerse.verse}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close scripture index"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 lg:hidden dark:text-stone-400 dark:hover:bg-stone-900"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Search & Controls */}
      <div className="space-y-2.5 border-b border-stone-200 p-3.5 dark:border-stone-800">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onChangeSearch(e.target.value)}
            placeholder="Jump to book or search verse..."
            className="min-h-[40px] w-full rounded-xl border border-stone-200 bg-stone-50 pr-3 pl-9 text-xs text-stone-900 placeholder:text-stone-400 focus:border-[#004B7A] focus:bg-white focus:outline-none dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-[#6EB5E5] dark:focus:bg-black"
          />
        </div>

        {/* Scope Segmented Control */}
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-900">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'highlighted', label: 'Highlighted' },
              { id: 'saved', label: 'Saved' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeScope(tab.id)}
              className={`min-h-[32px] rounded-lg px-2 text-xs font-medium transition-colors whitespace-nowrap ${
                scope === tab.id
                  ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-800 dark:text-stone-100'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Primary Books vs Verses Switcher when viewing All */}
        {scope === 'all' && !query && (
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-900">
            <button
              type="button"
              onClick={() => {
                onChangeTheme('All');
                setBrowseMode('books');
              }}
              className={`min-h-[32px] rounded-lg px-2 text-xs font-medium transition-colors ${
                browseMode === 'books' && selectedTheme === 'All'
                  ? 'bg-[#004B7A] text-white shadow-sm dark:bg-[#6EB5E5] dark:text-black'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              All Books (45)
            </button>
            <button
              type="button"
              onClick={() => setBrowseMode('verses')}
              className={`min-h-[32px] rounded-lg px-2 text-xs font-medium transition-colors ${
                browseMode === 'verses' || selectedTheme !== 'All'
                  ? 'bg-[#004B7A] text-white shadow-sm dark:bg-[#6EB5E5] dark:text-black'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              Verses{activeVerse && versesBookOnly ? ` · ${activeVerse.book}` : ''}
            </button>
          </div>
        )}

        {/* Testament quick filter when in Books mode */}
        {!isFilteredVerseList && browseMode === 'books' && (
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                { id: 'all', label: 'All (45)' },
                { id: 'Old Testament', label: 'Old Test. (39)' },
                { id: 'New Testament', label: 'New Test. (6)' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTestamentTab(t.id)}
                className={`min-h-[30px] rounded-lg px-2 text-[11px] font-medium transition-colors whitespace-nowrap ${
                  testamentTab === t.id
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-black'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Theme filters when browsing Verses */}
        {(isFilteredVerseList || browseMode === 'verses') && (
          <div className="flex flex-wrap gap-1.5">
            {THEMES.map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => onChangeTheme(theme)}
                className={`min-h-[28px] rounded-lg px-2.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedTheme === theme
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-black'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Search book quick-jump matches */}
        {query && matchingBooks.length > 0 && (
          <div className="mb-3 border-b border-stone-200 pb-3 dark:border-stone-800">
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
              Jump to Book
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {matchingBooks.map((item) => (
                <button
                  key={item.book}
                  type="button"
                  onClick={() => handleJumpToBook(item.book)}
                  className="flex min-h-[38px] items-center justify-between gap-1.5 rounded-xl border border-[#004B7A]/30 bg-[#004B7A]/8 px-2.5 py-1.5 text-left text-xs font-medium text-[#004B7A] transition-colors hover:bg-[#004B7A]/15 dark:border-[#6EB5E5]/35 dark:bg-[#6EB5E5]/12 dark:text-[#6EB5E5] dark:hover:bg-[#6EB5E5]/20"
                >
                  <span className="truncate">{item.book}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {!isFilteredVerseList && browseMode === 'books' ? (
          <div className="space-y-4 pb-4">
            {(testamentTab === 'all' || testamentTab === 'Old Testament') && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wider text-[#004B7A] uppercase dark:text-[#6EB5E5]">
                    Old Testament · 39 Books
                  </span>
                </div>

                {OT_SECTIONS.map((section) => (
                  <div key={section.label} className="space-y-1.5">
                    <h3 className="px-0.5 text-[11px] font-medium text-stone-500 dark:text-stone-400">
                      {section.label}
                    </h3>
                    <div className="grid grid-cols-2 gap-1.5">
                      {section.books.map((book) => renderBookButton(book))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(testamentTab === 'all' || testamentTab === 'New Testament') && (
              <div className="space-y-2 border-t border-stone-200 pt-3.5 dark:border-stone-800">
                <span className="block text-[11px] font-semibold tracking-wider text-stone-500 uppercase dark:text-stone-400">
                  New Testament · {NT_BOOKS.length} Books
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {NT_BOOKS.map((book) => renderBookButton(book))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Active Book vs All Books header + Chapter chips in Verses mode */}
            {!isFilteredVerseList && activeVerse && (
              <div className="space-y-2 border-b border-stone-200 pb-2.5 dark:border-stone-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-serif text-sm font-medium text-stone-900 dark:text-stone-100">
                    {versesBookOnly ? activeVerse.book : 'All Books'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setVersesBookOnly((prev) => !prev);
                      setSelectedChapter('All');
                    }}
                    className="rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-700 transition-colors hover:bg-stone-200 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    {versesBookOnly ? 'Show all books' : `Only ${activeVerse.book}`}
                  </button>
                </div>

                {versesBookOnly && activeBookChapters.length > 1 && (
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedChapter('All')}
                      className={`min-h-[28px] rounded-lg px-2 text-[11px] font-medium transition-colors ${
                        selectedChapter === 'All'
                          ? 'bg-[#004B7A] text-white dark:bg-[#6EB5E5] dark:text-black'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-900 dark:text-stone-300'
                      }`}
                    >
                      All Ch
                    </button>
                    {activeBookChapters.map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setSelectedChapter(ch)}
                        className={`min-h-[28px] min-w-[28px] rounded-lg px-2 font-mono text-[11px] font-medium transition-colors ${
                          selectedChapter === ch
                            ? 'bg-[#004B7A] text-white dark:bg-[#6EB5E5] dark:text-black'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-900 dark:text-stone-300'
                        }`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {displayedVerses.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                  No verses match your current filter. Try switching back to All books.
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {displayedVerses.map((v) => {
                  const isSelected = v.id === activeVerseId;
                  const isSaved = bookmarkedIds.includes(v.id);
                  const hasHighlight = (highlightsByVerse[v.id] || []).length > 0;

                  return (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectVerse(v.id);
                          onCloseMobile();
                        }}
                        className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                          isSelected
                            ? 'bg-stone-100 text-stone-950 dark:bg-stone-900 dark:text-white'
                            : 'text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-950'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-serif text-sm font-medium">
                            {v.book} {v.chapter}:{v.verse}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {hasHighlight && (
                              <Highlighter className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            )}
                            {isSaved && (
                              <Bookmark className="h-3.5 w-3.5 fill-amber-600 text-amber-600 dark:fill-amber-400 dark:text-amber-400" />
                            )}
                          </div>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                          {v.text}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Left Rail */}
      <aside className="hidden h-full w-[290px] shrink-0 border-r border-stone-200 lg:block dark:border-stone-800">
        {content}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        >
          <div
            className="h-full w-[86vw] max-w-[330px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      )}
    </>
  );
}
