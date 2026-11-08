import React, { useRef, useImperativeHandle, forwardRef, useMemo, useEffect } from 'react';
import { FontSize } from '../types.ts';
import { getFontFamilyCss, loadFontsFromContent } from '../utils/fonts.ts';
import { parseMarkdownToHtml } from '../utils/parser.ts';
import { BookOpen } from 'lucide-react';

export interface PreviewPaneRef {
  scrollToHeading: (headingId: string) => void;
}

interface PreviewPaneProps {
  content: string;
  fontFamily?: string;
  fontSize: FontSize;
  title?: string;
  isReadingMode?: boolean;
}

export const PreviewPane = forwardRef<PreviewPaneRef, PreviewPaneProps>(
  ({ content, fontFamily, fontSize, isReadingMode = false }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      loadFontsFromContent(content);
    }, [content]);

    const html = useMemo(() => {
      return parseMarkdownToHtml(content);
    }, [content]);

    const fontStyle = getFontFamilyCss(fontFamily);

    const fontSizeClass =
      fontSize === 'sm'
        ? 'text-[15px]'
        : fontSize === 'lg'
        ? 'text-[19px]'
        : fontSize === 'xl'
        ? 'text-[22px]'
        : 'text-[17px]';

    useImperativeHandle(ref, () => ({
      scrollToHeading: (headingId: string) => {
        const target = containerRef.current?.querySelector(`#${headingId}`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      },
    }));

    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-white dark:bg-[#181a1f] text-[#18191b] dark:text-[#f2f3f5] transition-colors">
        {/* Clean Reading / Live HTML Scroll Surface (Optimized for both Phone Reader & Desktop) */}
        <div
          ref={containerRef}
          aria-label={isReadingMode ? 'Document Reading View' : 'Document Live HTML Preview'}
          className="preview-pane-wrapper flex-1 h-full overflow-y-auto px-4 sm:px-8 md:px-12 py-5 sm:py-8 flex justify-center bg-white dark:bg-[#181a1f] text-[#18191b] dark:text-[#f2f3f5] transition-colors"
        >
          <div className="w-full max-w-[72ch] py-2 sm:py-4 break-words overflow-x-hidden">
            {html.trim().length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-[#9ea0a5] dark:text-[#60636c] text-center select-none">
                <BookOpen className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm font-medium">Document is empty</p>
                <p className="text-xs mt-1">Open on a desktop or tablet to edit this document</p>
              </div>
            ) : (
              <article
                style={{ fontFamily: fontStyle }}
                className={`prose-editorial ${fontSizeClass}`}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
);

PreviewPane.displayName = 'PreviewPane';
