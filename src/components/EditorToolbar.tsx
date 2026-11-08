import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Link as LinkIcon,
  Minus,
  FileCode,
  Eye,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  Table as TableIcon,
  Highlighter,
  Palette,
  RemoveFormatting,
  ChevronDown,
  HelpCircle,
  Type,
  Check,
  Search,
  Superscript,
  Subscript,
  ArrowUpDown,
  Wand2,
} from 'lucide-react';
import { CURATED_GOOGLE_FONTS, loadGoogleFont } from '../utils/fonts.ts';

export interface EditorToolbarProps {
  isMarkdownMode: boolean;
  onToggleMode: () => void;
  onExecFormat: (command: string, value?: string) => void;
  onOpenImageModal: () => void;
  onOpenTableModal: () => void;
  onOpenLinkModal: () => void;
  onOpenShortcutsModal: () => void;
  onApplyLocalFont: (fontName: string) => void;
  onApplyGlobalDraftFont?: (fontName: string) => void;
  currentLocalFont?: string;
  defaultDraftFont?: string;
  hasTextSelection?: boolean;
  isBoldActive?: boolean;
  isItalicActive?: boolean;
  isUnderlineActive?: boolean;
  lineSpacing?: string;
  onLineSpacingChange?: (spacing: string) => void;
  isFindOpen?: boolean;
  onToggleFind?: () => void;
  onCleanUpDocument?: () => void;
}

interface DropdownCoord {
  top: number;
  left: number;
}

// Expansive curated highlighter colors
export const HIGHLIGHT_COLORS = [
  { name: 'Soft Yellow', color: '#fef08a' },
  { name: 'Sunny Gold', color: '#fde047' },
  { name: 'Warm Amber', color: '#fed7aa' },
  { name: 'Coral Peach', color: '#fdba74' },
  { name: 'Rose Blush', color: '#fecdd3' },
  { name: 'Flamingo Pink', color: '#fbcfe8' },
  { name: 'Lavender Lilac', color: '#e9d5ff' },
  { name: 'Royal Violet', color: '#d8b4fe' },
  { name: 'Sky Blue', color: '#bae6fd' },
  { name: 'Electric Cyan', color: '#a5f3fc' },
  { name: 'Mint Leaf', color: '#bbf7d0' },
  { name: 'Spring Green', color: '#86efac' },
  { name: 'Lime Glow', color: '#d9f99d' },
  { name: 'Sand Beige', color: '#f5ebe0' },
  { name: 'Slate Mist', color: '#e2e8f0' },
  { name: 'Dark Slate', color: '#334155' },
];

// Expansive curated text ink colors
export const TEXT_COLORS = [
  { name: 'Default Dark', color: '#18191b' },
  { name: 'Muted Slate', color: '#64748b' },
  { name: 'Cool Gray', color: '#4b5563' },
  { name: 'Pure White', color: '#ffffff' },
  { name: 'Crimson Red', color: '#dc2626' },
  { name: 'Ruby Rose', color: '#e11d48' },
  { name: 'Hot Coral', color: '#f43f5e' },
  { name: 'Tangerine Orange', color: '#ea580c' },
  { name: 'Warm Amber', color: '#d97706' },
  { name: 'Honey Gold', color: '#ca8a04' },
  { name: 'Emerald Green', color: '#059669' },
  { name: 'Forest Green', color: '#16a34a' },
  { name: 'Aqua Teal', color: '#0d9488' },
  { name: 'Ocean Cyan', color: '#0284c7' },
  { name: 'Royal Blue', color: '#2563eb' },
  { name: 'Deep Indigo', color: '#4f46e5' },
  { name: 'Electric Violet', color: '#7c3aed' },
  { name: 'Magenta Fuchsia', color: '#c026d3' },
];

const FONT_SIZES = [
  { label: 'Caption', value: '1', px: '13px' },
  { label: 'Small', value: '2', px: '15px' },
  { label: 'Normal', value: '3', px: '17px' },
  { label: 'Medium', value: '4', px: '20px' },
  { label: 'Large', value: '5', px: '24px' },
  { label: 'Title', value: '6', px: '28px' },
  { label: 'Display', value: '7', px: '34px' },
];

const LINE_SPACINGS = [
  { label: 'Compact (1.15)', value: '1.15' },
  { label: 'Comfortable (1.5)', value: '1.5' },
  { label: 'Editorial (1.78)', value: '1.78' },
  { label: 'Double (2.0)', value: '2.0' },
];

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  isMarkdownMode,
  onToggleMode,
  onExecFormat,
  onOpenImageModal,
  onOpenTableModal,
  onOpenLinkModal,
  onOpenShortcutsModal,
  onApplyLocalFont,
  onApplyGlobalDraftFont,
  currentLocalFont,
  defaultDraftFont = 'Source Serif 4',
  hasTextSelection = false,
  isBoldActive = false,
  isItalicActive = false,
  isUnderlineActive = false,
  lineSpacing = '1.78',
  onLineSpacingChange,
  isFindOpen = false,
  onToggleFind,
  onCleanUpDocument,
}) => {
  const [activeMenu, setActiveMenu] = useState<
    'heading' | 'size' | 'font' | 'highlight' | 'color' | 'spacing' | null
  >(null);
  const [menuCoord, setMenuCoord] = useState<DropdownCoord>({ top: 0, left: 0 });
  const [customHighlightHex, setCustomHighlightHex] = useState('#ffea79');
  const [customTextHex, setCustomTextHex] = useState('#e11d48');
  const [fontSearch, setFontSearch] = useState('');

  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click or escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest('[data-dropdown-trigger]')) {
        return;
      }
      if (menuContainerRef.current && !menuContainerRef.current.contains(target)) {
        setActiveMenu(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActiveMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleMenu = (
    menuName: 'heading' | 'size' | 'font' | 'highlight' | 'color' | 'spacing',
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeMenu === menuName) {
      setActiveMenu(null);
      return;
    }
    if (menuName === 'font') {
      setFontSearch('');
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownWidth =
      menuName === 'heading'
        ? 210
        : menuName === 'font'
        ? 275
        : menuName === 'color' || menuName === 'highlight'
        ? 290
        : 180;
    const safeLeft = Math.max(8, Math.min(window.innerWidth - dropdownWidth - 12, rect.left));
    setMenuCoord({
      top: rect.bottom + 6,
      left: safeLeft,
    });
    setActiveMenu(menuName);
  };

  const preventDef = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleApplyHighlight = (color: string) => {
    onExecFormat('hiliteColor', color);
    setActiveMenu(null);
  };

  const handleApplyColor = (color: string) => {
    onExecFormat('foreColor', color);
    setActiveMenu(null);
  };

  const handleApplyFontSize = (sizeVal: string) => {
    onExecFormat('fontSize', sizeVal);
    setActiveMenu(null);
  };

  const handleApplyHeading = (tag: string) => {
    onExecFormat('formatBlock', tag);
    setActiveMenu(null);
  };

  const handleSelectLocalFont = (fontName: string) => {
    loadGoogleFont(fontName);
    onApplyLocalFont(fontName);
    setActiveMenu(null);
  };

  const displayedFontLabel =
    currentLocalFont && currentLocalFont !== 'inherit'
      ? currentLocalFont
      : defaultDraftFont;

  const filteredFonts = CURATED_GOOGLE_FONTS.filter(
    (f) =>
      f.label.toLowerCase().includes(fontSearch.toLowerCase()) ||
      f.category.toLowerCase().includes(fontSearch.toLowerCase()) ||
      f.description.toLowerCase().includes(fontSearch.toLowerCase())
  );

  return (
    <div
      role="toolbar"
      aria-label="Document Editing Toolbar"
      className="no-print h-10 border-b border-[#e6e4dd] dark:border-[#282b33] bg-[#faf9f6] dark:bg-[#181a1f] px-3 md:px-4 flex items-center justify-between gap-1 overflow-x-auto select-none z-10 scrollbar-none"
    >
      {/* Group 1: Core Content Structure & Formatting */}
      <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
        {/* History: Undo / Redo */}
        <button
          type="button"
          onMouseDown={preventDef}
          onClick={() => onExecFormat('undo')}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={preventDef}
          onClick={() => onExecFormat('redo')}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
          className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-[#e6e4dd] dark:bg-[#282b33] mx-1 shrink-0" aria-hidden="true" />

        {/* Headings Selector Dropdown Trigger */}
        <button
          type="button"
          data-dropdown-trigger="heading"
          onMouseDown={preventDef}
          onClick={(e) => toggleMenu('heading', e)}
          title="Paragraph & Heading Styles"
          aria-label="Choose heading style"
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors border ${
            activeMenu === 'heading'
              ? 'bg-[#eae8e1] dark:bg-[#282b33] border-[#d3d0c7] dark:border-[#383d47] text-[#18191b] dark:text-[#f2f3f5]'
              : 'border-transparent hover:border-[#e6e4dd] dark:hover:border-[#282b33] hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#18191b] dark:text-[#f2f3f5]'
          }`}
        >
          <span className="font-medium">Style</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>

        {/* Font Family Selector on Top Bar (Automatically syncs with cursor selection) */}
        <button
          type="button"
          data-dropdown-trigger="font"
          onMouseDown={preventDef}
          onClick={(e) => toggleMenu('font', e)}
          title="Change Font for Selected Text or Current Sentence"
          aria-label="Choose font family"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all border ${
            activeMenu === 'font'
              ? 'bg-[#eae8e1] dark:bg-[#282b33] border-[#2563eb] text-[#18191b] dark:text-[#f2f3f5] ring-1 ring-[#2563eb]/40'
              : hasTextSelection
              ? 'border-[#2563eb] bg-[#2563eb]/10 dark:bg-[#2563eb]/20 text-[#18191b] dark:text-[#f2f3f5] ring-1 ring-[#2563eb]/30 shadow-xs'
              : 'border-[#e6e4dd] dark:border-[#282b33] bg-white/60 dark:bg-[#121316]/60 hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#18191b] dark:text-[#f2f3f5]'
          }`}
        >
          <Type className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
          <span
            className="font-medium max-w-[125px] truncate"
            style={{ fontFamily: `"${displayedFontLabel}", sans-serif` }}
          >
            {displayedFontLabel}
          </span>
          <ChevronDown className="w-2.5 h-2.5 opacity-60 shrink-0" />
        </button>

        {/* Font Size Selector Dropdown Trigger */}
        <button
          type="button"
          data-dropdown-trigger="size"
          onMouseDown={preventDef}
          onClick={(e) => toggleMenu('size', e)}
          title="Change Font Size"
          aria-label="Choose font size"
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors border ${
            activeMenu === 'size'
              ? 'bg-[#eae8e1] dark:bg-[#282b33] border-[#d3d0c7] dark:border-[#383d47] text-[#18191b] dark:text-[#f2f3f5]'
              : 'border-transparent hover:border-[#e6e4dd] dark:hover:border-[#282b33] hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#18191b] dark:text-[#f2f3f5]'
          }`}
        >
          <span>Size</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>

        <div className="h-4 w-px bg-[#e6e4dd] dark:bg-[#282b33] mx-1 shrink-0" aria-hidden="true" />

        {/* Core Inline Formatting: Bold, Italic, Underline, Strike */}
        <button
          type="button"
          onMouseDown={preventDef}
          onClick={() => onExecFormat('bold')}
          title="Bold (Ctrl+B)"
          aria-label="Bold text"
          className={`p-1.5 rounded transition-colors font-bold ${
            isBoldActive
              ? 'bg-[#2563eb] text-white shadow-xs'
              : 'text-[#18191b] dark:text-[#f2f3f5] hover:bg-[#eae8e1] dark:hover:bg-[#22252c]'
          }`}
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={preventDef}
          onClick={() => onExecFormat('italic')}
          title="Italic (Ctrl+I)"
          aria-label="Italic text"
          className={`p-1.5 rounded transition-colors italic ${
            isItalicActive
              ? 'bg-[#2563eb] text-white shadow-xs'
              : 'text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] hover:bg-[#eae8e1] dark:hover:bg-[#22252c]'
          }`}
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={preventDef}
          onClick={() => onExecFormat('underline')}
          title="Underline (Ctrl+U)"
          aria-label="Underline text"
          className={`p-1.5 rounded transition-colors ${
            isUnderlineActive
              ? 'bg-[#2563eb] text-white shadow-xs'
              : 'text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] hover:bg-[#eae8e1] dark:hover:bg-[#22252c]'
          }`}
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={preventDef}
          onClick={() => onExecFormat('strikeThrough')}
          title="Strikethrough"
          aria-label="Strikethrough text"
          className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        {/* Subscript & Superscript */}
        <button
          type="button"
          onMouseDown={preventDef}
          onClick={() => onExecFormat('superscript')}
          title="Superscript"
          aria-label="Superscript"
          className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors hidden lg:inline-flex"
        >
          <Superscript className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={preventDef}
          onClick={() => onExecFormat('subscript')}
          title="Subscript"
          aria-label="Subscript"
          className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors hidden lg:inline-flex"
        >
          <Subscript className="w-3.5 h-3.5" />
        </button>

        {/* Text Highlight Color Dropdown Trigger */}
        <button
          type="button"
          data-dropdown-trigger="highlight"
          onMouseDown={preventDef}
          onClick={(e) => toggleMenu('highlight', e)}
          title="Highlight Color Palette"
          aria-label="Text highlight color"
          className={`p-1.5 rounded transition-colors border ${
            activeMenu === 'highlight'
              ? 'bg-[#eae8e1] dark:bg-[#282b33] border-[#d3d0c7] dark:border-[#383d47]'
              : 'border-transparent hover:border-[#e6e4dd] dark:hover:border-[#282b33] hover:bg-[#eae8e1] dark:hover:bg-[#22252c]'
          }`}
        >
          <Highlighter className="w-3.5 h-3.5 text-amber-500" />
        </button>

        {/* Text Color Dropdown Trigger */}
        <button
          type="button"
          data-dropdown-trigger="color"
          onMouseDown={preventDef}
          onClick={(e) => toggleMenu('color', e)}
          title="Text Ink Color Palette"
          aria-label="Text color"
          className={`p-1.5 rounded transition-colors border ${
            activeMenu === 'color'
              ? 'bg-[#eae8e1] dark:bg-[#282b33] border-[#d3d0c7] dark:border-[#383d47]'
              : 'border-transparent hover:border-[#e6e4dd] dark:hover:border-[#282b33] hover:bg-[#eae8e1] dark:hover:bg-[#22252c]'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-[#2563eb]" />
        </button>

        <div className="h-4 w-px bg-[#e6e4dd] dark:bg-[#282b33] mx-1 shrink-0" aria-hidden="true" />

        {/* Text Alignment & Line Spacing */}
        <button
          type="button"
          onMouseDown={preventDef}
          onClick={() => onExecFormat('justifyLeft')}
          title="Align Left"
          aria-label="Align left"
          className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={preventDef}
          onClick={() => onExecFormat('justifyCenter')}
          title="Align Center"
          aria-label="Align center"
          className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={preventDef}
          onClick={() => onExecFormat('justifyRight')}
          title="Align Right"
          aria-label="Align right"
          className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </button>

        {/* Line Spacing Trigger */}
        {onLineSpacingChange && (
          <button
            type="button"
            data-dropdown-trigger="spacing"
            onMouseDown={preventDef}
            onClick={(e) => toggleMenu('spacing', e)}
            title="Line Spacing"
            aria-label="Line spacing"
            className={`p-1.5 rounded transition-colors border ${
              activeMenu === 'spacing'
                ? 'bg-[#eae8e1] dark:bg-[#282b33] border-[#d3d0c7] dark:border-[#383d47]'
                : 'border-transparent hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0]'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="h-4 w-px bg-[#e6e4dd] dark:bg-[#282b33] mx-1 shrink-0" aria-hidden="true" />

        {/* Lists & Tasks */}
        <button
          type="button"
          onMouseDown={preventDef}
          onClick={() => onExecFormat('insertUnorderedList')}
          title="Bullet List"
          aria-label="Bullet list"
          className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={preventDef}
          onClick={() => onExecFormat('insertOrderedList')}
          title="Numbered List"
          aria-label="Numbered list"
          className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={preventDef}
          onClick={() => {
            onExecFormat(
              'insertHTML',
              '<ul class="task-list"><li class="task-list-item"><input type="checkbox" /> <span>Task item</span></li></ul><p></p>'
            );
          }}
          title="Interactive Checklist / Task List"
          aria-label="Checklist task list"
          className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors"
        >
          <ListTodo className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-[#e6e4dd] dark:bg-[#282b33] mx-1 shrink-0" aria-hidden="true" />

        {/* Insert Elements: Image, Table, Link, Quote, Code, Divider */}
        <button
          type="button"
          onMouseDown={preventDef}
          onClick={onOpenImageModal}
          title="Insert Image"
          aria-label="Insert image"
          className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors flex items-center gap-1"
        >
          <ImageIcon className="w-3.5 h-3.5 text-[#2563eb]" />
          <span className="hidden xl:inline text-[11px] font-medium">Image</span>
        </button>

        <button
          type="button"
          onMouseDown={preventDef}
          onClick={onOpenTableModal}
          title="Insert Table"
          aria-label="Insert table"
          className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors flex items-center gap-1"
        >
          <TableIcon className="w-3.5 h-3.5 text-[#2563eb]" />
          <span className="hidden xl:inline text-[11px] font-medium">Table</span>
        </button>

        <button
          type="button"
          onMouseDown={preventDef}
          onClick={onOpenLinkModal}
          title="Insert Link (Ctrl+K)"
          aria-label="Insert Link"
          className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors flex items-center gap-1"
        >
          <LinkIcon className="w-3.5 h-3.5 text-[#2563eb]" />
          <span className="hidden xl:inline text-[11px] font-medium">Link</span>
        </button>

        <button
          type="button"
          onMouseDown={preventDef}
          onClick={() => onExecFormat('formatBlock', '<blockquote>')}
          title="Blockquote"
          aria-label="Blockquote"
          className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={preventDef}
          onClick={() => {
            const selection = window.getSelection()?.toString();
            if (selection) {
              onExecFormat(
                'insertHTML',
                `<div class="code-block-wrapper"><pre><code>${selection}</code></pre></div>`
              );
            } else {
              onExecFormat(
                'insertHTML',
                `<div class="code-block-wrapper"><pre><code>// Code snippet</code></pre></div><p></p>`
              );
            }
          }}
          title="Code Block"
          aria-label="Code block"
          className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors"
        >
          <Code className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={preventDef}
          onClick={() => onExecFormat('insertHorizontalRule')}
          title="Horizontal Divider"
          aria-label="Horizontal divider"
          className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={preventDef}
          onClick={() => onExecFormat('removeFormat')}
          title="Clear Formatting"
          aria-label="Clear formatting"
          className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors"
        >
          <RemoveFormatting className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Group 2: Find & Replace, Shortcuts Help & Mode Toggle */}
      <div className="flex items-center gap-1.5 shrink-0 pl-2">
        {onToggleFind && (
          <button
            type="button"
            onMouseDown={preventDef}
            onClick={onToggleFind}
            title="Find & Replace in Document (Ctrl+F)"
            aria-label="Find and replace"
            className={`p-1.5 rounded transition-colors ${
              isFindOpen
                ? 'bg-[#2563eb] text-white'
                : 'text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] hover:bg-[#eae8e1] dark:hover:bg-[#22252c]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onMouseDown={preventDef}
          onClick={onOpenShortcutsModal}
          title="Keyboard & Markdown Shortcuts"
          aria-label="Open keyboard shortcuts"
          className="p-1 rounded text-[#9ea0a5] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {/* Visual vs Markdown Source Toggle */}
        <button
          type="button"
          onMouseDown={preventDef}
          onClick={onToggleMode}
          title={isMarkdownMode ? 'Switch to Visual Mode (Bold is bold)' : 'Switch to Raw Markdown Source'}
          aria-label={isMarkdownMode ? 'Switch to Visual Mode' : 'Switch to Markdown Mode'}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] hover:bg-[#eae8e1] dark:hover:bg-[#22252c] transition-colors border border-[#e6e4dd] dark:border-[#282b33]"
        >
          {isMarkdownMode ? (
            <>
              <Eye className="w-3 h-3 text-[#2563eb]" />
              <span>Visual</span>
            </>
          ) : (
            <>
              <FileCode className="w-3 h-3 text-[#68696d]" />
              <span>Markdown</span>
            </>
          )}
        </button>
      </div>

      {/* FLOATING PORTAL DROPDOWNS */}
      {activeMenu &&
        createPortal(
          <div
            ref={menuContainerRef}
            style={{
              position: 'fixed',
              top: menuCoord.top,
              left: menuCoord.left,
              zIndex: 99999,
            }}
            className="bg-white dark:bg-[#181a1f] border border-[#e6e4dd] dark:border-[#282b33] shadow-2xl rounded-lg p-2 animate-in fade-in zoom-in-95 duration-100 select-none max-h-[85vh] overflow-y-auto"
          >
            {/* 1. Heading Menu */}
            {activeMenu === 'heading' && (
              <div className="w-48 py-0.5 space-y-0.5">
                <button
                  type="button"
                  onMouseDown={preventDef}
                  onClick={() => handleApplyHeading('<p>')}
                  className="w-full px-3 py-1.5 text-left text-xs rounded hover:bg-[#f0eee8] dark:hover:bg-[#22252c] text-[#18191b] dark:text-[#f2f3f5] font-normal"
                >
                  Normal Paragraph
                </button>
                <button
                  type="button"
                  onMouseDown={preventDef}
                  onClick={() => handleApplyHeading('<h1>')}
                  className="w-full px-3 py-1.5 text-left text-sm rounded hover:bg-[#f0eee8] dark:hover:bg-[#22252c] text-[#18191b] dark:text-[#f2f3f5] font-bold"
                >
                  Heading 1 (H1)
                </button>
                <button
                  type="button"
                  onMouseDown={preventDef}
                  onClick={() => handleApplyHeading('<h2>')}
                  className="w-full px-3 py-1.5 text-left text-xs rounded hover:bg-[#f0eee8] dark:hover:bg-[#22252c] text-[#18191b] dark:text-[#f2f3f5] font-semibold"
                >
                  Heading 2 (H2)
                </button>
                <button
                  type="button"
                  onMouseDown={preventDef}
                  onClick={() => handleApplyHeading('<h3>')}
                  className="w-full px-3 py-1.5 text-left text-xs rounded hover:bg-[#f0eee8] dark:hover:bg-[#22252c] text-[#18191b] dark:text-[#f2f3f5] font-medium"
                >
                  Heading 3 (H3)
                </button>
              </div>
            )}

            {/* 2. Searchable Sentence / Selection Font Family Menu */}
            {activeMenu === 'font' && (
              <div className="w-68 py-1">
                <div className="flex items-center justify-between px-2 mb-1.5">
                  <span className="text-[10px] font-semibold text-[#2563eb] dark:text-[#60a5fa] uppercase tracking-wider">
                    {hasTextSelection ? 'Target: Selected Text' : 'Target: Current Sentence'}
                  </span>
                  <button
                    type="button"
                    onMouseDown={preventDef}
                    onClick={() => handleSelectLocalFont('inherit')}
                    className="text-[10px] text-[#68696d] hover:text-[#18191b] dark:hover:text-white underline"
                  >
                    Reset Font
                  </button>
                </div>

                {/* Search Input */}
                <div className="px-1.5 mb-2">
                  <input
                    type="text"
                    value={fontSearch}
                    onChange={(e) => setFontSearch(e.target.value)}
                    placeholder="Filter 25+ Google Fonts..."
                    className="w-full px-2.5 py-1 text-xs rounded bg-[#f7f6f2] dark:bg-[#121316] border border-[#e6e4dd] dark:border-[#282b33] text-[#18191b] dark:text-[#f2f3f5] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1">
                  {filteredFonts.map((font) => {
                    const isSelected = displayedFontLabel === font.name;
                    return (
                      <button
                        key={font.name}
                        type="button"
                        onMouseDown={preventDef}
                        onClick={() => handleSelectLocalFont(font.name)}
                        className={`w-full px-2.5 py-1.5 text-left rounded hover:bg-[#f0eee8] dark:hover:bg-[#22252c] flex items-center justify-between group ${
                          isSelected
                            ? 'bg-[#2563eb]/10 text-[#2563eb] dark:text-[#60a5fa]'
                            : 'text-[#18191b] dark:text-[#f2f3f5]'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div
                            className="text-sm truncate leading-snug"
                            style={{ fontFamily: `"${font.name}", sans-serif` }}
                          >
                            {font.label}
                          </div>
                          <div className="text-[10px] text-[#9ea0a5] truncate">
                            {font.description}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] text-[#9ea0a5] uppercase tracking-tight px-1.5 py-0.5 rounded bg-[#f7f6f2] dark:bg-[#121316]">
                            {font.category}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#2563eb]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Optional: Set as document default font */}
                {onApplyGlobalDraftFont && (
                  <div className="mt-2 pt-2 border-t border-[#e6e4dd] dark:border-[#282b33] px-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-[#68696d] dark:text-[#9598a0]">
                      Base: {defaultDraftFont}
                    </span>
                    <button
                      type="button"
                      onMouseDown={preventDef}
                      onClick={() => {
                        if (currentLocalFont && currentLocalFont !== 'inherit') {
                          onApplyGlobalDraftFont(currentLocalFont);
                        }
                        setActiveMenu(null);
                      }}
                      className="text-[10px] font-medium text-[#2563eb] hover:underline"
                    >
                      Use current as doc base
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3. Font Size Menu */}
            {activeMenu === 'size' && (
              <div className="w-40 py-0.5 space-y-0.5">
                {FONT_SIZES.map((size) => (
                  <button
                    key={size.value}
                    type="button"
                    onMouseDown={preventDef}
                    onClick={() => handleApplyFontSize(size.value)}
                    className="w-full px-3 py-1.5 text-left text-xs rounded hover:bg-[#f0eee8] dark:hover:bg-[#22252c] text-[#18191b] dark:text-[#f2f3f5] flex items-center justify-between"
                  >
                    <span className="font-medium">{size.label}</span>
                    <span className="text-[11px] text-[#9ea0a5]">{size.px}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 4. Line Spacing Menu */}
            {activeMenu === 'spacing' && onLineSpacingChange && (
              <div className="w-44 py-0.5 space-y-0.5">
                <div className="text-[10px] font-semibold text-[#9ea0a5] uppercase tracking-wider mb-1 px-2">
                  Line Spacing
                </div>
                {LINE_SPACINGS.map((sp) => (
                  <button
                    key={sp.value}
                    type="button"
                    onMouseDown={preventDef}
                    onClick={() => {
                      onLineSpacingChange(sp.value);
                      setActiveMenu(null);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs rounded hover:bg-[#f0eee8] dark:hover:bg-[#22252c] flex items-center justify-between ${
                      lineSpacing === sp.value
                        ? 'text-[#2563eb] font-semibold bg-[#2563eb]/10'
                        : 'text-[#18191b] dark:text-[#f2f3f5]'
                    }`}
                  >
                    <span>{sp.label}</span>
                    {lineSpacing === sp.value && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}

            {/* 5. Rich Highlight Color Palette with Custom Hex Picker */}
            {activeMenu === 'highlight' && (
              <div className="w-64 p-1">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10px] font-semibold text-[#9ea0a5] uppercase tracking-wider">
                    Highlighter ({HIGHLIGHT_COLORS.length} Colors)
                  </span>
                  <button
                    type="button"
                    onMouseDown={preventDef}
                    onClick={() => handleApplyHighlight('transparent')}
                    className="text-[11px] font-medium text-red-600 dark:text-red-400 hover:underline"
                  >
                    Clear
                  </button>
                </div>

                <div className="grid grid-cols-8 gap-1.5 mb-3">
                  {HIGHLIGHT_COLORS.map((h) => (
                    <button
                      key={h.name}
                      type="button"
                      onMouseDown={preventDef}
                      onClick={() => handleApplyHighlight(h.color)}
                      title={h.name}
                      aria-label={`${h.name} highlight`}
                      className="w-6 h-6 rounded border border-black/15 hover:scale-115 transition-transform shadow-xs cursor-pointer"
                      style={{ backgroundColor: h.color }}
                    />
                  ))}
                </div>

                <div className="pt-2 border-t border-[#e6e4dd] dark:border-[#282b33] flex items-center gap-2">
                  <input
                    type="color"
                    value={customHighlightHex}
                    onChange={(e) => setCustomHighlightHex(e.target.value)}
                    className="w-7 h-7 rounded border border-[#e6e4dd] cursor-pointer p-0 bg-transparent"
                    title="Choose custom highlight color"
                  />
                  <input
                    type="text"
                    value={customHighlightHex}
                    onChange={(e) => setCustomHighlightHex(e.target.value)}
                    placeholder="#ffea79"
                    className="w-20 px-2 py-1 text-xs rounded bg-[#f7f6f2] dark:bg-[#121316] border border-[#e6e4dd] dark:border-[#282b33] font-mono"
                  />
                  <button
                    type="button"
                    onMouseDown={preventDef}
                    onClick={() => handleApplyHighlight(customHighlightHex)}
                    className="px-2.5 py-1 text-xs font-medium bg-[#2563eb] text-white rounded hover:bg-[#1d4ed8] transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {/* 6. Rich Text Ink Color Palette with Custom Hex Picker */}
            {activeMenu === 'color' && (
              <div className="w-64 p-1">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10px] font-semibold text-[#9ea0a5] uppercase tracking-wider">
                    Text Color ({TEXT_COLORS.length} Colors)
                  </span>
                  <button
                    type="button"
                    onMouseDown={preventDef}
                    onClick={() => handleApplyColor('inherit')}
                    className="text-[11px] font-medium text-[#2563eb] hover:underline"
                  >
                    Reset
                  </button>
                </div>

                <div className="grid grid-cols-6 gap-1.5 mb-3">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onMouseDown={preventDef}
                      onClick={() => handleApplyColor(c.color)}
                      title={c.name}
                      aria-label={`${c.name} text color`}
                      className="w-7 h-7 rounded border border-black/20 hover:scale-115 transition-transform shadow-xs cursor-pointer"
                      style={{ backgroundColor: c.color }}
                    />
                  ))}
                </div>

                <div className="pt-2 border-t border-[#e6e4dd] dark:border-[#282b33] flex items-center gap-2">
                  <input
                    type="color"
                    value={customTextHex}
                    onChange={(e) => setCustomTextHex(e.target.value)}
                    className="w-7 h-7 rounded border border-[#e6e4dd] cursor-pointer p-0 bg-transparent"
                    title="Choose custom text color"
                  />
                  <input
                    type="text"
                    value={customTextHex}
                    onChange={(e) => setCustomTextHex(e.target.value)}
                    placeholder="#e11d48"
                    className="w-20 px-2 py-1 text-xs rounded bg-[#f7f6f2] dark:bg-[#121316] border border-[#e6e4dd] dark:border-[#282b33] font-mono"
                  />
                  <button
                    type="button"
                    onMouseDown={preventDef}
                    onClick={() => handleApplyColor(customTextHex)}
                    className="px-2.5 py-1 text-xs font-medium bg-[#2563eb] text-white rounded hover:bg-[#1d4ed8] transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
