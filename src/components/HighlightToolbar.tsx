import { Check, Eraser, MessageSquareQuote, MousePointerClick, X } from 'lucide-react';
import { HIGHLIGHT_PALETTE, HighlightColor, VerseHighlight } from '../types';

interface HighlightToolbarProps {
  isOpen: boolean;
  isPhraseMode: boolean;
  selectedRange: [number, number] | null;
  selectedExcerpt: string;
  existingHighlights: VerseHighlight[];
  onTogglePhraseMode: () => void;
  onApplyColor: (color: HighlightColor) => void;
  onClearAllHighlights: () => void;
  onQuoteToComment: (excerpt: string) => void;
  onClose: () => void;
}

export function HighlightToolbar({
  isOpen,
  isPhraseMode,
  selectedRange,
  selectedExcerpt,
  existingHighlights,
  onTogglePhraseMode,
  onApplyColor,
  onClearAllHighlights,
  onQuoteToComment,
  onClose,
}: HighlightToolbarProps) {
  if (!isOpen) return null;

  const hasRange = selectedRange !== null;

  return (
    <div
      className="mx-auto mt-6 w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-3.5 text-stone-900 shadow-lg dark:border-stone-800 dark:bg-neutral-950 dark:text-stone-100"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 pb-2.5 dark:border-stone-800">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-stone-800 dark:text-stone-100">
            {hasRange
              ? 'Phrase selected — pick an ink color'
              : isPhraseMode
                ? 'Tap first and last word in the verse'
                : 'Tap a color for the whole verse, or select words'}
          </p>
          {hasRange && selectedExcerpt && (
            <p className="mt-0.5 truncate text-xs italic text-stone-500 dark:text-stone-400">
              “{selectedExcerpt}”
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close highlight toolbar"
          className="flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        {HIGHLIGHT_PALETTE.map((swatch) => {
          const isApplied = existingHighlights.some((h) => h.color === swatch.id);
          return (
            <button
              key={swatch.id}
              type="button"
              onClick={() => onApplyColor(swatch.id)}
              aria-label={`Apply ${swatch.label} highlight`}
              title={`${swatch.label} (${swatch.meaning})`}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-90"
            >
              <span
                className={`h-6 w-6 rounded-full ${swatch.swatchClass} transition-all ${
                  isApplied
                    ? 'ring-2 ring-[#004B7A] ring-offset-2 ring-offset-white dark:ring-[#6EB5E5] dark:ring-offset-neutral-950'
                    : 'ring-1 ring-black/10 dark:ring-white/15'
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 pt-2.5 dark:border-stone-800">
        <button
          type="button"
          onClick={onTogglePhraseMode}
          className={`flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            isPhraseMode
              ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-400 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-500/50'
              : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800'
          }`}
        >
          {isPhraseMode ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Word-tap active</span>
            </>
          ) : (
            <>
              <MousePointerClick className="h-3.5 w-3.5" />
              <span>Select phrase</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
          {hasRange && selectedExcerpt && (
            <button
              type="button"
              onClick={() => onQuoteToComment(selectedExcerpt)}
              className="flex min-h-[36px] items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-800 dark:bg-white dark:text-black dark:hover:bg-stone-200 whitespace-nowrap shrink-0"
            >
              <MessageSquareQuote className="h-3.5 w-3.5" />
              <span>Comment on phrase</span>
            </button>
          )}

          {existingHighlights.length > 0 && (
            <button
              type="button"
              onClick={onClearAllHighlights}
              className="flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 whitespace-nowrap shrink-0"
            >
              <Eraser className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
