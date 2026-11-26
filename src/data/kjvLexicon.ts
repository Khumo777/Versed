import { BibleVerse, LexiconEntry } from '../types';
import { GREEK_DICTIONARY } from './greekDictionary';
import { HEBREW_DICTIONARY } from './hebrewDictionary';

function cleanToken(raw: string): string {
  return raw.toLowerCase().replace(/^[^a-z']+|[^a-z']+$/gi, '');
}

export function lookupWordLexicon(rawWord: string, verse: BibleVerse): LexiconEntry {
  const cleaned = cleanToken(rawWord);
  const displayWord = rawWord.replace(/^[^a-zA-Z0-9']+|[^a-zA-Z0-9']+$/g, '') || rawWord;
  const language: 'Hebrew' | 'Greek' =
    verse.testament === 'Old Testament' ? 'Hebrew' : 'Greek';

  // 1. Check verse's own curated lexicon entries when the word matches cleanly
  const directMatch = verse.lexicon.find((entry) => {
    const entryLower = entry.word.toLowerCase();
    if (entryLower === cleaned) return true;
    // Match multi-word curated entries only on distinctive content tokens (>= 4 chars)
    const entryTokens = entryLower.split(/\s+/);
    return (
      cleaned.length >= 4 &&
      entryTokens.some((t) => t === cleaned)
    );
  });

  if (directMatch) {
    return {
      ...directMatch,
      word: displayWord,
    };
  }

  // 2. Look up in complete Hebrew / Greek KJV dictionaries
  const dict = language === 'Hebrew' ? HEBREW_DICTIONARY : GREEK_DICTIONARY;
  const dictMatch = dict[cleaned];
  if (dictMatch) {
    return {
      word: displayWord,
      language,
      ...dictMatch,
    };
  }

  // 3. Fallback for any possessive/apostrophe variant
  const strippedPossessive = cleaned.replace(/'s$/, '');
  const fallbackMatch = dict[strippedPossessive];
  if (fallbackMatch) {
    return {
      word: displayWord,
      language,
      ...fallbackMatch,
    };
  }

  return {
    word: displayWord,
    original: language === 'Hebrew' ? 'לְשׁוֹן הַקֹּדֶשׁ' : 'Κοινὴ Ἑλληνική',
    transliteration: language === 'Hebrew' ? 'Biblical Hebrew' : 'Koine Greek',
    strongs: `${verse.book} ${verse.chapter}:${verse.verse}`,
    language,
    definition: `King James Version rendering in ${verse.book} ${verse.chapter}:${verse.verse}.`,
  };
}
