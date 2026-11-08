import React from 'react';
import { DocumentMetrics } from '../utils/parser.ts';
import { FontSize } from '../types.ts';
import { FileText, ScrollText } from 'lucide-react';

interface MetricsBarProps {
  metrics: DocumentMetrics;
  selectionText?: string;
  fontSize: FontSize;
  onFontSizeChange: (size: FontSize) => void;
  isPageSheetMode?: boolean;
  onTogglePageSheetMode?: () => void;
  isMobileViewOnly?: boolean;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  metrics,
  selectionText = '',
  fontSize,
  onFontSizeChange,
  isPageSheetMode = false,
  onTogglePageSheetMode,
  isMobileViewOnly = false,
}) => {
  const trimmedSelection = selectionText.trim();
  const selectedWords = trimmedSelection
    ? trimmedSelection.split(/\s+/).filter(Boolean).length
    : 0;
  const selectedChars = selectionText.length;

  return (
    <footer className="no-print h-10 sm:h-9 border-t border-[#e6e4dd] dark:border-[#282b33] bg-[#faf9f6] dark:bg-[#181a1f] px-3 sm:px-4 md:px-6 flex items-center justify-between gap-2 text-xs text-[#68696d] dark:text-[#9598a0] select-none z-10">
      {/* Live Document & Selection Metrics */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
        {!isMobileViewOnly && selectedWords > 0 && (
          <>
            <span className="font-semibold text-[#2563eb] dark:text-[#60a5fa] whitespace-nowrap">
              {selectedWords.toLocaleString()} {selectedWords === 1 ? 'word' : 'words'} ({selectedChars.toLocaleString()} chars) selected
            </span>
            <span aria-hidden="true" className="opacity-40">·</span>
          </>
        )}

        <span className="font-medium text-[#18191b] dark:text-[#f2f3f5] whitespace-nowrap">
          {metrics.words.toLocaleString()} <span className="font-normal text-[#68696d] dark:text-[#9598a0]">words</span>
        </span>

        <span aria-hidden="true" className="opacity-40 hidden sm:inline">·</span>

        <span className="whitespace-nowrap hidden sm:inline">
          {metrics.characters.toLocaleString()} <span className="text-[#9ea0a5] dark:text-[#60636c]">chars</span>
        </span>

        <span aria-hidden="true" className="opacity-40 hidden md:inline">·</span>

        <span className="whitespace-nowrap hidden md:inline">
          {metrics.paragraphs} <span className="text-[#9ea0a5] dark:text-[#60636c]">paragraphs</span>
        </span>

        <span aria-hidden="true" className="opacity-40">·</span>

        <span className="whitespace-nowrap text-[#18191b] dark:text-[#f2f3f5]">
          {metrics.readingTimeText}
        </span>
      </div>

      {/* Canvas Layout & Zoom Controls (Enabled on both Mobile Reader and Desktop) */}
      <div className="flex items-center gap-2 shrink-0">
        {!isMobileViewOnly && onTogglePageSheetMode && (
          <button
            type="button"
            onClick={onTogglePageSheetMode}
            title={isPageSheetMode ? 'Switch to Pageless Continuous Canvas' : 'Switch to Paper Page Layout'}
            className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#f0eee8] dark:bg-[#121316] hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#18191b] dark:text-[#f2f3f5] border border-[#e6e4dd] dark:border-[#282b33] transition-colors"
          >
            {isPageSheetMode ? (
              <>
                <FileText className="w-3 h-3 text-[#2563eb]" />
                <span>Paper View</span>
              </>
            ) : (
              <>
                <ScrollText className="w-3 h-3 text-[#2563eb]" />
                <span>Pageless</span>
              </>
            )}
          </button>
        )}

        {/* Base Zoom / Text Scale Selector (Visible on mobile too for comfortable reading) */}
        <div className="flex items-center gap-0.5 bg-[#f0eee8] dark:bg-[#121316] p-0.5 rounded-md border border-[#e6e4dd] dark:border-[#282b33]">
          <button
            type="button"
            onClick={() => onFontSizeChange('sm')}
            title="Compact Zoom (90%)"
            aria-label="Small scale"
            className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              fontSize === 'sm'
                ? 'bg-white dark:bg-[#22252c] text-[#18191b] dark:text-[#f2f3f5] shadow-xs'
                : 'text-[#68696d] dark:text-[#9598a0]'
            }`}
          >
            90%
          </button>
          <button
            type="button"
            onClick={() => onFontSizeChange('base')}
            title="Standard Zoom (100%)"
            aria-label="Standard scale"
            className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              fontSize === 'base'
                ? 'bg-white dark:bg-[#22252c] text-[#18191b] dark:text-[#f2f3f5] shadow-xs'
                : 'text-[#68696d] dark:text-[#9598a0]'
            }`}
          >
            100%
          </button>
          <button
            type="button"
            onClick={() => onFontSizeChange('lg')}
            title="Comfortable Zoom (115%)"
            aria-label="Large scale"
            className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              fontSize === 'lg'
                ? 'bg-white dark:bg-[#22252c] text-[#18191b] dark:text-[#f2f3f5] shadow-xs'
                : 'text-[#68696d] dark:text-[#9598a0]'
            }`}
          >
            115%
          </button>
          <button
            type="button"
            onClick={() => onFontSizeChange('xl')}
            title="Large Zoom (130%)"
            aria-label="Extra large scale"
            className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              fontSize === 'xl'
                ? 'bg-white dark:bg-[#22252c] text-[#18191b] dark:text-[#f2f3f5] shadow-xs'
                : 'text-[#68696d] dark:text-[#9598a0]'
            }`}
          >
            130%
          </button>
        </div>
      </div>
    </footer>
  );
};
