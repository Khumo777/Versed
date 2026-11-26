import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  Highlighter,
  MessageSquareText,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import {
  BibleVerse,
  HIGHLIGHT_PALETTE,
  VerseComment,
  VerseHighlight,
} from '../types';

interface CommentPanelProps {
  verse: BibleVerse | undefined;
  comments: VerseComment[];
  highlights: VerseHighlight[];
  draftQuote: string;
  bulkVerses?: BibleVerse[];
  isMobileOpen: boolean;
  focusTrigger: number;
  onClearDraftQuote: () => void;
  onCancelBulkComment?: () => void;
  onQuoteHighlight: (excerpt: string) => void;
  onAddComment: (body: string, linkedExcerpt?: string) => void;
  onDeleteComment: (commentId: string) => void;
  onRemoveHighlight: (highlightId: string) => void;
  onCloseMobile: () => void;
}

export function CommentPanel({
  verse,
  comments,
  highlights,
  draftQuote,
  bulkVerses = [],
  isMobileOpen,
  focusTrigger,
  onClearDraftQuote,
  onCancelBulkComment,
  onQuoteHighlight,
  onAddComment,
  onDeleteComment,
  onRemoveHighlight,
  onCloseMobile,
}: CommentPanelProps) {
  const [body, setBody] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (focusTrigger > 0 || draftQuote || bulkVerses.length > 0) {
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [focusTrigger, draftQuote, bulkVerses.length, isMobileOpen]);

  const isBulkMode = bulkVerses.length > 0;

  if (!verse) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    onAddComment(trimmed, draftQuote || undefined);
    setBody('');
  };

  const panelBody = (
    <div className="flex h-full flex-col bg-white text-stone-900 dark:bg-black dark:text-stone-100">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-5 py-4 dark:border-stone-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-stone-500 dark:text-stone-400">
            <span>Personal Study Margin</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">KJV</span>
          </div>
          <h3 className="mt-1 truncate font-serif text-lg font-medium text-[#004B7A] dark:text-[#6EB5E5]">
            {verse.book} {verse.chapter}:{verse.verse}
          </h3>
        </div>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close study margin"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 lg:hidden dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable Highlights + Personal Comments */}
      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
        {/* Highlights Section */}
        <div>
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-stone-500 dark:text-stone-400">
              <Highlighter className="h-3.5 w-3.5" />
              <span>Highlights</span>
            </h4>
            <span className="font-mono text-xs tabular-nums text-stone-400 dark:text-stone-500">
              {highlights.length}
            </span>
          </div>

          {highlights.length === 0 ? (
            <p className="mt-2.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              Tap Highlight on the verse to mark the full verse or select individual words.
            </p>
          ) : (
            <div className="mt-2.5 space-y-2.5">
              {highlights.map((hl) => {
                const palette = HIGHLIGHT_PALETTE.find((p) => p.id === hl.color);
                if (!palette) return null;
                return (
                  <div
                    key={hl.id}
                    className="rounded-xl border border-stone-200 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-950"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400">
                      <span className="flex items-center gap-1.5 font-medium text-stone-700 dark:text-stone-300">
                        <span className={`h-2.5 w-2.5 rounded-full ${palette.swatchClass}`} />
                        <span>{palette.label}</span>
                        <span aria-hidden="true">·</span>
                        <span>{palette.meaning}</span>
                      </span>
                      <span className="text-[11px]">{hl.createdAt}</span>
                    </div>

                    <p className="mt-2 font-serif text-sm italic leading-relaxed text-stone-800 dark:text-stone-200">
                      “{hl.excerpt}”
                    </p>

                    <div className="mt-2.5 flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => onQuoteHighlight(hl.excerpt)}
                        className="font-medium text-amber-800 transition-colors hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                      >
                        Write note on this
                      </button>
                      <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">
                        ·
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveHighlight(hl.id)}
                        className="text-stone-500 transition-colors hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Hairline Divider */}
        <div className="border-t border-stone-200 dark:border-stone-800" />

        {/* Personal Notes & Comments */}
        <div>
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-stone-500 dark:text-stone-400">
              <MessageSquareText className="h-3.5 w-3.5" />
              <span>Your Notes & Comments</span>
            </h4>
            <span className="font-mono text-xs tabular-nums text-stone-400 dark:text-stone-500">
              {comments.length}
            </span>
          </div>

          {comments.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-stone-300 p-4 text-center dark:border-stone-800">
              <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                No personal notes on this verse yet. Write a reflection or study note below.
              </p>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-stone-200/80 dark:divide-stone-800">
              {comments.map((comment) => (
                <li key={comment.id} className="py-3.5 first:pt-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-stone-500 dark:text-stone-400">
                      {comment.createdAt}
                    </span>

                    <button
                      type="button"
                      onClick={() => onDeleteComment(comment.id)}
                      aria-label="Delete note"
                      className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {comment.linkedExcerpt && (
                    <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 font-serif text-xs italic text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                      “{comment.linkedExcerpt}”
                    </p>
                  )}

                  <p className="mt-1.5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    {comment.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Pinned Note Composer */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-black"
      >
        {isBulkMode && (
          <div className="mb-2.5 flex items-start justify-between gap-2 rounded-lg border border-[#004B7A]/25 bg-[#004B7A]/8 px-3 py-2 text-xs text-[#004B7A] dark:border-[#6EB5E5]/30 dark:bg-[#6EB5E5]/12 dark:text-[#6EB5E5]">
            <div className="min-w-0">
              <div className="font-semibold">
                Bulk note · {bulkVerses.length} {bulkVerses.length === 1 ? 'verse' : 'verses'}
              </div>
              <div className="mt-0.5 truncate text-[11px] opacity-85">
                {bulkVerses.map((v) => `${v.book} ${v.chapter}:${v.verse}`).join(', ')}
              </div>
            </div>
            {onCancelBulkComment && (
              <button
                type="button"
                onClick={onCancelBulkComment}
                aria-label="Cancel bulk note"
                className="shrink-0 opacity-80 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {draftQuote && (
          <div className="mb-2.5 flex items-start justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <span className="line-clamp-2 font-serif italic">“{draftQuote}”</span>
            <button
              type="button"
              onClick={onClearDraftQuote}
              aria-label="Clear quoted phrase"
              className="shrink-0 text-amber-700 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={
              isBulkMode
                ? `Add a note across ${bulkVerses.length} selected verses...`
                : `Add a note on ${verse.book} ${verse.chapter}:${verse.verse}...`
            }
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:bg-white focus:outline-none dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-amber-400 dark:focus:bg-black"
          />
          <button
            type="submit"
            disabled={!body.trim()}
            aria-label="Save note"
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl bg-stone-900 text-white transition-colors hover:bg-stone-800 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-stone-200"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <>
      {/* Desktop Right Margin Panel */}
      <aside className="hidden h-full w-[360px] shrink-0 border-l border-stone-200 lg:block dark:border-stone-800">
        {panelBody}
      </aside>

      {/* Mobile / Tablet Bottom Sheet */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        >
          <div
            className="flex h-[78dvh] w-full flex-col overflow-hidden rounded-t-3xl border-t border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <span className="h-1.5 w-10 rounded-full bg-stone-300 dark:bg-stone-700" />
            </div>
            <div className="min-h-0 flex-1">{panelBody}</div>
          </div>
        </div>
      )}
    </>
  );
}
