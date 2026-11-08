import React from 'react';
import { HeadingItem } from '../utils/parser.ts';
import { ListCollapse, X, ChevronRight, Hash } from 'lucide-react';

interface OutlineSidebarProps {
  headings: HeadingItem[];
  isOpen: boolean;
  onToggle: () => void;
  onSelectHeading: (heading: HeadingItem) => void;
}

export const OutlineSidebar: React.FC<OutlineSidebarProps> = ({
  headings,
  isOpen,
  onToggle,
  onSelectHeading,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Slide-Over Backdrop */}
      <div
        onClick={onToggle}
        aria-hidden="true"
        className="no-print fixed inset-0 z-30 bg-black/40 backdrop-blur-xs md:hidden animate-in fade-in duration-150"
      />

      <aside
        aria-label="Document Outline"
        className="no-print fixed inset-y-0 left-0 z-40 w-72 max-w-[82vw] shadow-2xl md:static md:w-64 md:shadow-none shrink-0 border-r border-[#e6e4dd] dark:border-[#282b33] bg-[#f7f6f2] dark:bg-[#14161b] flex flex-col h-full transition-all select-none"
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#e6e4dd] dark:border-[#282b33]">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#68696d] dark:text-[#9598a0]">
            <ListCollapse className="w-4 h-4" />
            <span>Outline &amp; Jump-List</span>
          </div>
          <button
            onClick={onToggle}
            title="Close outline"
            aria-label="Close outline"
            className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] transition-colors"
          >
            <X className="w-4 h-4 md:hidden" />
            <ChevronRight className="w-4 h-4 hidden md:block" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {headings.length === 0 ? (
            <div className="text-xs text-[#9ea0a5] dark:text-[#60636c] px-2 py-6 text-center leading-relaxed">
              <Hash className="w-5 h-5 mx-auto mb-2 opacity-40" />
              No section headings in this document yet.
            </div>
          ) : (
            headings.map((heading) => {
              const indentClass =
                heading.level === 1
                  ? 'font-medium text-[#18191b] dark:text-[#f2f3f5]'
                  : heading.level === 2
                  ? 'pl-3 text-[#68696d] dark:text-[#9598a0]'
                  : 'pl-6 text-xs text-[#9ea0a5] dark:text-[#60636c]';

              return (
                <button
                  key={heading.id}
                  onClick={() => onSelectHeading(heading)}
                  className={`w-full text-left py-2 md:py-1.5 px-2.5 rounded-md hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-xs transition-colors flex items-center justify-between group truncate ${indentClass}`}
                >
                  <span className="truncate">{heading.text}</span>
                  <span className="text-[10px] text-[#9ea0a5] dark:text-[#60636c] md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                    H{heading.level}
                  </span>
                </button>
              );
            })
          )}
        </nav>
      </aside>
    </>
  );
};
