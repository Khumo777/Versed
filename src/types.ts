export type HighlightColor = 'gold' | 'olive' | 'lapis' | 'rose';

export type VerseTheme =
  | 'Creation'
  | 'Peace'
  | 'Wisdom'
  | 'Strength'
  | 'Grace'
  | 'Love';

export interface LexiconEntry {
  word: string;
  original: string;
  transliteration: string;
  strongs: string;
  language: 'Hebrew' | 'Greek';
  definition: string;
}

export interface BibleVerse {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  testament: 'Old Testament' | 'New Testament';
  theme: VerseTheme;
  text: string;
  lexicon: LexiconEntry[];
}

export interface VerseHighlight {
  id: string;
  verseId: string;
  color: HighlightColor;
  /** Inclusive word indices; if null, applies to the entire verse */
  startWordIndex: number | null;
  endWordIndex: number | null;
  excerpt: string;
  createdAt: string;
}

export interface VerseComment {
  id: string;
  verseId: string;
  body: string;
  createdAt: string;
  linkedExcerpt?: string;
}

export const HIGHLIGHT_PALETTE: {
  id: HighlightColor;
  label: string;
  meaning: string;
  swatchClass: string;
  lightTextBgClass: string;
  darkTextBgClass: string;
}[] = [
  {
    id: 'gold',
    label: 'Amber Gold',
    meaning: 'Promise',
    swatchClass: 'bg-amber-400',
    lightTextBgClass: 'bg-amber-200/75 text-stone-950 decoration-amber-600/80',
    darkTextBgClass: 'bg-amber-400/25 text-amber-50 decoration-amber-400/80',
  },
  {
    id: 'olive',
    label: 'Olive Leaf',
    meaning: 'Wisdom',
    swatchClass: 'bg-lime-500',
    lightTextBgClass: 'bg-lime-200/70 text-stone-950 decoration-lime-700/80',
    darkTextBgClass: 'bg-lime-500/25 text-lime-50 decoration-lime-400/80',
  },
  {
    id: 'lapis',
    label: 'Deep Lapis',
    meaning: 'Grace',
    swatchClass: 'bg-sky-400',
    lightTextBgClass: 'bg-sky-200/70 text-stone-950 decoration-sky-700/80',
    darkTextBgClass: 'bg-sky-400/25 text-sky-50 decoration-sky-400/80',
  },
  {
    id: 'rose',
    label: 'Clay Rose',
    meaning: 'Love',
    swatchClass: 'bg-rose-400',
    lightTextBgClass: 'bg-rose-200/70 text-stone-950 decoration-rose-700/80',
    darkTextBgClass: 'bg-rose-400/25 text-rose-50 decoration-rose-400/80',
  },
];
