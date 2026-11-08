import React, { useState, useRef, useEffect } from 'react';
import { EditorViewMode, SaveState } from '../types.ts';
import {
  Columns2,
  FileEdit,
  Eye,
  FolderOpen,
  Plus,
  Upload,
  Download,
  Printer,
  Copy,
  Check,
  Sun,
  Moon,
  List,
  CheckCircle2,
  Loader2,
  FileText,
  FileDown,
  BookOpen,
} from 'lucide-react';

interface TopNavProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  viewMode: EditorViewMode;
  onViewModeChange: (mode: EditorViewMode) => void;
  saveState: SaveState;
  lastSavedTime: string | null;
  draftsCount: number;
  onOpenDraftsModal: () => void;
  onNewDraft: () => void;
  onImportFile: (file: File) => void;
  showOutline: boolean;
  onToggleOutline: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onExportOpdc: () => void;
  onExportDocx: () => void;
  onExportMarkdown: () => void;
  onExportHtml: () => void;
  onPrintPdf: () => void;
  onCopyMarkdown: () => void;
  onCopyHtml: () => void;
  onOpenFontPicker: () => void;
  fontFamily?: string;
  isMobileViewOnly?: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  title,
  onTitleChange,
  viewMode,
  onViewModeChange,
  saveState,
  lastSavedTime,
  draftsCount,
  onOpenDraftsModal,
  onNewDraft,
  onImportFile,
  showOutline,
  onToggleOutline,
  theme,
  onToggleTheme,
  onExportOpdc,
  onExportDocx,
  onExportMarkdown,
  onExportHtml,
  onPrintPdf,
  onCopyMarkdown,
  onCopyHtml,
  isMobileViewOnly = false,
}) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = (type: 'markdown' | 'html', action: () => void) => {
    action();
    setCopyFeedback(type);
    setTimeout(() => setCopyFeedback(null), 2000);
    setIsExportOpen(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportFile(file);
      e.target.value = '';
    }
  };

  return (
    <header className="no-print h-14 border-b border-[#e6e4dd] dark:border-[#282b33] bg-[#faf9f6] dark:bg-[#181a1f] px-3 sm:px-4 md:px-6 flex items-center justify-between gap-2 md:gap-6 select-none z-20">
      {/* Hidden file input for importing .opdc, .docx, .md, .txt */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".opdc,.docx,.md,.txt,.markdown,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileInputChange}
        className="hidden"
        id="topnav-file-import"
      />

      {/* Zone 1: Brand & Document Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <a
          href="/"
          className="font-serif text-base sm:text-lg font-bold tracking-tight text-[#18191b] dark:text-[#f2f3f5] whitespace-nowrap shrink-0 hover:opacity-80 transition-opacity flex items-center gap-2"
        >
          <img
            src="/assets/aistudio/Text_Miopa_displaying_color_61a0aa45_2K_26a746f7.jpg"
            alt="Miopa Docs Icon"
            className="w-6 h-6 rounded-md object-cover shadow-xs border border-black/10 dark:border-white/10"
          />
          <span className="hidden xs:inline sm:inline">Docs</span>
        </a>

        <div className="h-4 w-px bg-[#e6e4dd] dark:bg-[#282b33] shrink-0" aria-hidden="true" />

        {isMobileViewOnly ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="text-sm font-semibold text-[#18191b] dark:text-[#f2f3f5] truncate"
              title={title || 'Untitled Document'}
            >
              {title || 'Untitled Document'}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#2563eb]/10 text-[#2563eb] dark:bg-[#2563eb]/20 dark:text-[#60a5fa] shrink-0">
              <Eye className="w-3 h-3" />
              <span>View Only</span>
            </span>
          </div>
        ) : (
          <div className="relative flex items-center min-w-0 max-w-[180px] sm:max-w-xs md:max-w-sm flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              aria-label="Document Title"
              placeholder="Untitled Document"
              className="w-full bg-transparent text-sm font-medium text-[#18191b] dark:text-[#f2f3f5] focus:outline-none focus:ring-1 focus:ring-[#2563eb] rounded px-1.5 py-0.5 truncate hover:bg-[#f0eee8] dark:hover:bg-[#22252c] transition-colors"
            />
          </div>
        )}

        {/* Live Autosave Text Status (Desktop) */}
        {!isMobileViewOnly && (
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#68696d] dark:text-[#9598a0] shrink-0">
            {saveState === 'saving' ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-[#2563eb]" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-500" />
                <span>{lastSavedTime ? `Saved ${lastSavedTime}` : 'Saved'}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Zone 2: View Switcher (Write, Split, Read) - Desktop / Tablet only */}
      {!isMobileViewOnly && (
        <nav
          aria-label="Editor View Modes"
          className="hidden md:flex items-center p-1 bg-[#f0eee8] dark:bg-[#121316] rounded-lg border border-[#e6e4dd] dark:border-[#282b33] shrink-0"
        >
          <button
            onClick={() => onViewModeChange('editor')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'editor'
                ? 'bg-white dark:bg-[#22252c] text-[#18191b] dark:text-[#f2f3f5] shadow-xs'
                : 'text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5]'
            }`}
            title="Write Mode: Focused writing surface"
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>Write</span>
          </button>

          <button
            onClick={() => onViewModeChange('split')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'split'
                ? 'bg-white dark:bg-[#22252c] text-[#18191b] dark:text-[#f2f3f5] shadow-xs'
                : 'text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5]'
            }`}
            title="Split View: Editor and Preview side-by-side"
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>

          <button
            onClick={() => onViewModeChange('preview')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'preview'
                ? 'bg-white dark:bg-[#22252c] text-[#18191b] dark:text-[#f2f3f5] shadow-xs'
                : 'text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5]'
            }`}
            title="Reading Mode: Distraction-free view"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>Read</span>
          </button>
        </nav>
      )}

      {/* Zone 3: Document Actions & Exports */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Toggle Outline button */}
        <button
          onClick={onToggleOutline}
          title={showOutline ? 'Hide Outline' : 'Show Outline'}
          aria-label="Toggle Outline"
          className={`p-2 rounded-lg text-xs transition-colors flex items-center gap-1 border ${
            showOutline
              ? 'bg-[#e6e4dd] dark:bg-[#282b33] border-[#d3d0c7] dark:border-[#383d47] text-[#18191b] dark:text-[#f2f3f5]'
              : 'border-transparent text-[#68696d] dark:text-[#9598a0] hover:bg-[#f0eee8] dark:hover:bg-[#22252c]'
          }`}
        >
          <List className="w-4 h-4" />
          <span className="hidden xl:inline text-xs">Outline</span>
        </button>

        {/* Library / Drafts switcher */}
        <button
          onClick={onOpenDraftsModal}
          title="Document Library"
          aria-label={`Open Document Library with ${draftsCount} drafts`}
          className="p-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 text-[#68696d] dark:text-[#9598a0] hover:bg-[#f0eee8] dark:hover:bg-[#22252c] hover:text-[#18191b] dark:hover:text-[#f2f3f5]"
        >
          <FolderOpen className="w-4 h-4" />
          <span className="hidden md:inline">Drafts ({draftsCount})</span>
        </button>

        {/* Import File Button (.opdc, .docx, .md, .txt) - Available on both Phone and Desktop */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Import Document (.opdc, .docx, .md, .txt)"
          aria-label="Import document (.opdc or .docx)"
          className="p-2 rounded-lg text-xs transition-colors flex items-center gap-1 text-[#68696d] dark:text-[#9598a0] hover:bg-[#f0eee8] dark:hover:bg-[#22252c] hover:text-[#18191b] dark:hover:text-[#f2f3f5]"
        >
          <Upload className="w-4 h-4 text-[#2563eb]" />
          <span className="hidden lg:inline">Import</span>
        </button>

        {/* New Note Button (Desktop only; Phone is View-Only) */}
        {!isMobileViewOnly && (
          <button
            onClick={onNewDraft}
            title="New Note (Create fresh document)"
            aria-label="New Note"
            className="p-2 rounded-lg text-xs transition-colors flex items-center gap-1 text-[#68696d] dark:text-[#9598a0] hover:bg-[#f0eee8] dark:hover:bg-[#22252c] hover:text-[#18191b] dark:hover:text-[#f2f3f5]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">New</span>
          </button>
        )}

        {/* Export Pipeline Dropdown */}
        <div className="relative" ref={exportDropdownRef}>
          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            aria-expanded={isExportOpen}
            aria-haspopup="true"
            title="Export or Share Document"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-white bg-[#18191b] dark:bg-[#2563eb] hover:bg-neutral-800 dark:hover:bg-blue-600 rounded-lg transition-colors whitespace-nowrap shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {isExportOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 max-w-[90vw] rounded-lg bg-white dark:bg-[#181a1f] border border-[#e6e4dd] dark:border-[#282b33] shadow-xl py-1.5 z-30 select-none animate-in fade-in duration-100"
            >
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9ea0a5] dark:text-[#60636c]">
                Download Files
              </div>

              {/* 1. Custom .opdc Format */}
              <button
                role="menuitem"
                onClick={() => {
                  onExportOpdc();
                  setIsExportOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs text-[#18191b] dark:text-[#f2f3f5] hover:bg-[#f0eee8] dark:hover:bg-[#22252c] flex items-center gap-2.5 transition-colors"
              >
                <FileDown className="w-4 h-4 text-[#2563eb] shrink-0" />
                <div>
                  <div className="font-semibold flex items-center gap-1.5">
                    <span>Docs Document (.opdc)</span>
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-[#2563eb]/10 text-[#2563eb] font-bold">Native</span>
                  </div>
                  <div className="text-[11px] text-[#68696d] dark:text-[#9598a0]">Package with typography & metadata</div>
                </div>
              </button>

              {/* 2. Microsoft Word .docx Format */}
              <button
                role="menuitem"
                onClick={() => {
                  onExportDocx();
                  setIsExportOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs text-[#18191b] dark:text-[#f2f3f5] hover:bg-[#f0eee8] dark:hover:bg-[#22252c] flex items-center gap-2.5 transition-colors"
              >
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <div className="font-semibold flex items-center gap-1.5">
                    <span>Word Document (.docx)</span>
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">Compatible</span>
                  </div>
                  <div className="text-[11px] text-[#68696d] dark:text-[#9598a0]">Ready for Word, Google Docs & Pages</div>
                </div>
              </button>

              {/* 3. Markdown (.md) */}
              <button
                role="menuitem"
                onClick={() => {
                  onExportMarkdown();
                  setIsExportOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs text-[#18191b] dark:text-[#f2f3f5] hover:bg-[#f0eee8] dark:hover:bg-[#22252c] flex items-center gap-2.5 transition-colors"
              >
                <Download className="w-4 h-4 text-[#68696d] dark:text-[#9598a0] shrink-0" />
                <div>
                  <div className="font-medium">Markdown (.md)</div>
                  <div className="text-[11px] text-[#68696d] dark:text-[#9598a0]">Raw markdown draft with bold & lists</div>
                </div>
              </button>

              {/* 4. Standalone HTML */}
              <button
                role="menuitem"
                onClick={() => {
                  onExportHtml();
                  setIsExportOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs text-[#18191b] dark:text-[#f2f3f5] hover:bg-[#f0eee8] dark:hover:bg-[#22252c] flex items-center gap-2.5 transition-colors"
              >
                <FileEdit className="w-4 h-4 text-[#68696d] dark:text-[#9598a0] shrink-0" />
                <div>
                  <div className="font-medium">Standalone HTML (.html)</div>
                  <div className="text-[11px] text-[#68696d] dark:text-[#9598a0]">Self-contained with typography reset</div>
                </div>
              </button>

              {/* 5. Print / PDF */}
              <button
                role="menuitem"
                onClick={() => {
                  onPrintPdf();
                  setIsExportOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs text-[#18191b] dark:text-[#f2f3f5] hover:bg-[#f0eee8] dark:hover:bg-[#22252c] flex items-center gap-2.5 transition-colors"
              >
                <Printer className="w-4 h-4 text-[#68696d] dark:text-[#9598a0] shrink-0" />
                <div>
                  <div className="font-medium">Print / PDF</div>
                  <div className="text-[11px] text-[#68696d] dark:text-[#9598a0]">Publication-grade page layout</div>
                </div>
              </button>

              <div className="my-1 border-t border-[#e6e4dd] dark:border-[#282b33]" />

              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9ea0a5] dark:text-[#60636c]">
                Clipboard
              </div>

              <button
                role="menuitem"
                onClick={() => handleCopy('markdown', onCopyMarkdown)}
                className="w-full px-3 py-1.5 text-left text-xs text-[#18191b] dark:text-[#f2f3f5] hover:bg-[#f0eee8] dark:hover:bg-[#22252c] flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Copy className="w-3.5 h-3.5 text-[#68696d]" />
                  <span>Copy Markdown</span>
                </span>
                {copyFeedback === 'markdown' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>

              <button
                role="menuitem"
                onClick={() => handleCopy('html', onCopyHtml)}
                className="w-full px-3 py-1.5 text-left text-xs text-[#18191b] dark:text-[#f2f3f5] hover:bg-[#f0eee8] dark:hover:bg-[#22252c] flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Copy className="w-3.5 h-3.5 text-[#68696d]" />
                  <span>Copy Rendered HTML</span>
                </span>
                {copyFeedback === 'html' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            </div>
          )}
        </div>

        {/* Theme Toggle (Light / Dark) */}
        <button
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          aria-label={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          className="p-2 rounded-lg text-[#68696d] dark:text-[#9598a0] hover:bg-[#f0eee8] dark:hover:bg-[#22252c] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
