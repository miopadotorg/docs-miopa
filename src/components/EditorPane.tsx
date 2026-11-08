import React, {
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { FontSize } from '../types.ts';
import {
  getFontFamilyCss,
  loadGoogleFont,
  loadFontsFromContent,
} from '../utils/fonts.ts';
import {
  parseMarkdownToHtml,
  htmlToMarkdown,
  cleanUpDocumentContent,
} from '../utils/parser.ts';
import { EditorToolbar } from './EditorToolbar.tsx';
import {
  Search,
  X,
  Replace,
} from 'lucide-react';

export interface EditorPaneRef {
  scrollToLine: (lineIndex: number) => void;
  focus: () => void;
  insertImage: (src: string, altText: string) => void;
  insertTable: (rows: number, cols: number, hasHeader: boolean) => void;
  insertLink: (url: string, displayText: string, openInNewTab: boolean) => void;
  applyLocalFont: (fontName: string) => void;
  getSelectedText: () => string;
}

interface EditorPaneProps {
  content: string;
  onChange: (newContent: string) => void;
  fontFamily?: string;
  onGlobalFontChange?: (fontName: string) => void;
  fontSize: FontSize;
  onSaveTrigger?: () => void;
  isZen?: boolean;
  isPageSheetMode?: boolean;
  onSelectionTextChange?: (selectedText: string) => void;
  onOpenImageModal: () => void;
  onOpenTableModal: () => void;
  onOpenLinkModal: () => void;
  onOpenShortcutsModal: () => void;
  onCleanUpNotify?: () => void;
}

/**
 * Computes relative luminance of a hex color to determine whether it is light or dark.
 */
function isLightColor(hex: string): boolean {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6 && clean.length !== 3) return true;
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55;
}

/**
 * Helper to expand a collapsed range to the boundaries of the current sentence
 * within its text node so clicking inside a sentence and picking a font styles that sentence.
 */
function expandRangeToCurrentSentence(range: Range, rootEl: HTMLElement): Range | null {
  const node = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE && node.textContent) {
    const text = node.textContent;
    if (!text.trim()) return null;
    const offset = range.startOffset;

    let start = 0;
    for (let i = offset - 1; i >= 0; i--) {
      if (
        (text[i] === '.' || text[i] === '!' || text[i] === '?') &&
        (i + 1 >= text.length || /\s/.test(text[i + 1]))
      ) {
        start = i + 1;
        while (start < text.length && /\s/.test(text[start])) start++;
        break;
      }
    }

    let end = text.length;
    for (let i = offset; i < text.length; i++) {
      if (text[i] === '.' || text[i] === '!' || text[i] === '?') {
        end = i + 1;
        break;
      }
    }

    if (end > start) {
      const sentenceRange = document.createRange();
      sentenceRange.setStart(node, start);
      sentenceRange.setEnd(node, end);
      return sentenceRange;
    }
  }

  let curr: Node | null = node;
  while (curr && curr !== rootEl) {
    if (
      curr.nodeType === Node.ELEMENT_NODE &&
      /^(P|LI|H[1-6]|BLOCKQUOTE)$/i.test((curr as HTMLElement).tagName) &&
      curr.textContent?.trim()
    ) {
      const blockRange = document.createRange();
      blockRange.selectNodeContents(curr);
      return blockRange;
    }
    curr = curr.parentNode;
  }
  return null;
}

/**
 * Inspects DOM ancestors from a node up to rootEl to detect any active local font family.
 */
function detectFontAtNode(node: Node | null, rootEl: HTMLElement | null): string {
  let curr: Node | null = node;
  while (curr && curr !== rootEl) {
    if (curr.nodeType === Node.ELEMENT_NODE) {
      const el = curr as HTMLElement;
      const dataFont = el.getAttribute('data-local-font');
      if (dataFont) return dataFont;
      const faceAttr = el.getAttribute('face');
      if (faceAttr) return faceAttr.replace(/^['"]+|['"]+$/g, '').split(',')[0].trim();
      if (el.style && el.style.fontFamily) {
        const firstFont = el.style.fontFamily
          .split(',')[0]
          .replace(/^['"]+|['"]+$/g, '')
          .trim();
        if (firstFont && firstFont !== 'inherit') {
          return firstFont;
        }
      }
    }
    curr = curr.parentNode;
  }
  return 'inherit';
}

/**
 * Detects the active local font for a Range (handles both collapsed carets and multi-node selections).
 */
function detectFontInRange(range: Range, rootEl: HTMLElement): string {
  if (!range.collapsed) {
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
      if (current.textContent && current.textContent.trim().length > 0) {
        try {
          if (range.intersectsNode(current)) {
            const font = detectFontAtNode(current, rootEl);
            if (font !== 'inherit') return font;
          }
        } catch {
          // ignore
        }
      }
      current = walker.nextNode();
    }
  }
  return detectFontAtNode(range.startContainer, rootEl);
}

/**
 * Deterministically applies a font family to the exact text range by splitting boundary text nodes
 * and wrapping/updating `<span data-local-font="...">` elements. Works reliably across repeated changes
 * and single sentences without relying on buggy `document.execCommand('fontName')`.
 */
function applyFontToRange(range: Range, fontName: string, rootEl: HTMLElement): Range | null {
  if (range.collapsed) return null;

  // Normalize boundary points if they sit on Element nodes rather than Text nodes
  const walkerInit = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
  const intersectedNodes: Text[] = [];
  let n = walkerInit.nextNode();
  while (n) {
    try {
      if (range.intersectsNode(n)) {
        intersectedNodes.push(n as Text);
      }
    } catch {
      // ignore
    }
    n = walkerInit.nextNode();
  }

  if (intersectedNodes.length === 0) return null;

  const firstText = intersectedNodes[0];
  const lastText = intersectedNodes[intersectedNodes.length - 1];

  let startNode = firstText;
  let startOffset = range.startContainer === firstText ? range.startOffset : 0;
  let endNode = lastText;
  let endOffset =
    range.endContainer === lastText ? range.endOffset : (lastText.textContent || '').length;

  if (startNode === endNode) {
    if (startOffset >= endOffset) return null;
    if (endOffset < startNode.length) {
      startNode.splitText(endOffset);
    }
    const targetNode = startOffset > 0 ? startNode.splitText(startOffset) : startNode;
    const styledEl = styleSingleTextNode(targetNode, fontName, rootEl);
    const nextRange = document.createRange();
    nextRange.selectNodeContents(styledEl);
    return nextRange;
  }

  // Split startNode if needed
  const actualFirst = startOffset > 0 ? startNode.splitText(startOffset) : startNode;
  // Split endNode if needed
  if (endOffset < endNode.length) {
    endNode.splitText(endOffset);
  }
  const actualLast = endNode;

  // Collect all text nodes between actualFirst and actualLast inclusive
  const nodesToStyle: Text[] = [];
  const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
  let collecting = false;
  let curr = walker.nextNode();
  while (curr) {
    if (curr === actualFirst) collecting = true;
    if (collecting) {
      nodesToStyle.push(curr as Text);
    }
    if (curr === actualLast) break;
    curr = walker.nextNode();
  }

  let firstStyled: Node | null = null;
  let lastStyled: Node | null = null;

  for (const textNode of nodesToStyle) {
    if (!textNode.textContent) continue;
    const res = styleSingleTextNode(textNode, fontName, rootEl);
    if (!firstStyled) firstStyled = res;
    lastStyled = res;
  }

  if (firstStyled && lastStyled) {
    const nextRange = document.createRange();
    nextRange.setStartBefore(firstStyled);
    nextRange.setEndAfter(lastStyled);
    return nextRange;
  }

  return null;
}

function styleSingleTextNode(textNode: Text, fontName: string, rootEl: HTMLElement): Node {
  const parent = textNode.parentElement;

  if (fontName === 'inherit') {
    if (
      parent &&
      parent !== rootEl &&
      parent.tagName === 'SPAN' &&
      parent.hasAttribute('data-local-font')
    ) {
      parent.removeAttribute('data-local-font');
      parent.style.fontFamily = '';
    }
    return textNode;
  }

  // If parent is already a dedicated local-font span containing only this textNode, update it in place
  if (
    parent &&
    parent !== rootEl &&
    parent.tagName === 'SPAN' &&
    parent.hasAttribute('data-local-font') &&
    parent.childNodes.length === 1
  ) {
    parent.setAttribute('data-local-font', fontName);
    parent.style.fontFamily = `"${fontName}", sans-serif`;
    return parent;
  }

  const span = document.createElement('span');
  span.setAttribute('data-local-font', fontName);
  span.style.fontFamily = `"${fontName}", sans-serif`;
  textNode.parentNode?.insertBefore(span, textNode);
  span.appendChild(textNode);
  return span;
}

export const EditorPane = forwardRef<EditorPaneRef, EditorPaneProps>(
  (
    {
      content,
      onChange,
      fontFamily,
      onGlobalFontChange,
      fontSize,
      onSaveTrigger,
      isZen = false,
      isPageSheetMode = false,
      onSelectionTextChange,
      onOpenImageModal,
      onOpenTableModal,
      onOpenLinkModal,
      onOpenShortcutsModal,
      onCleanUpNotify,
    },
    ref
  ) => {
    const editableRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lastEmittedHtmlRef = useRef<string | null>(null);
    const savedRangeRef = useRef<Range | null>(null);

    const [isMarkdownMode, setIsMarkdownMode] = useState(false);
    const [isBoldActive, setIsBoldActive] = useState(false);
    const [isItalicActive, setIsItalicActive] = useState(false);
    const [isUnderlineActive, setIsUnderlineActive] = useState(false);
    const [currentLocalFont, setCurrentLocalFont] = useState<string>('inherit');
    const [hasTextSelection, setHasTextSelection] = useState(false);
    const [lineSpacing, setLineSpacing] = useState<string>('1.78');

    // Find & Replace state
    const [isFindOpen, setIsFindOpen] = useState(false);
    const [findQuery, setFindQuery] = useState('');
    const [replaceQuery, setReplaceQuery] = useState('');

    const emitChange = useCallback(
      (newHtmlOrMd: string) => {
        lastEmittedHtmlRef.current = newHtmlOrMd;
        onChange(newHtmlOrMd);
      },
      [onChange]
    );

    const updateFormatStates = useCallback(() => {
      if (!isMarkdownMode && typeof document !== 'undefined') {
        try {
          setIsBoldActive(document.queryCommandState('bold'));
          setIsItalicActive(document.queryCommandState('italic'));
          setIsUnderlineActive(document.queryCommandState('underline'));
        } catch {
          // ignore
        }
      }
    }, [isMarkdownMode]);

    const fontStyle = getFontFamilyCss(fontFamily);

    const fontSizeClass =
      fontSize === 'sm'
        ? 'text-[15px]'
        : fontSize === 'lg'
        ? 'text-[19px]'
        : fontSize === 'xl'
        ? 'text-[22px]'
        : 'text-[17px]';

    // Synchronize external content changes (e.g. switching drafts or initial load)
    useEffect(() => {
      loadFontsFromContent(content);
      if (!isMarkdownMode && editableRef.current) {
        if (content === lastEmittedHtmlRef.current) {
          return;
        }
        const looksLikeMarkdown =
          /(?:^#{1,6}\s+|^\s*[-*+]\s+|```|^\s*>\s+)/m.test(content) &&
          !/^\s*<(?:h[1-6]|p|div|table|ul|ol|blockquote|figure|article|section)/i.test(content);
        const htmlContent = looksLikeMarkdown ? parseMarkdownToHtml(content) : content;
        if (editableRef.current.innerHTML !== htmlContent) {
          editableRef.current.innerHTML = htmlContent;
          lastEmittedHtmlRef.current = htmlContent;
        }
      }
    }, [content, isMarkdownMode]);

    // Track browser selection reliably via document 'selectionchange' event and sync with Top Bar Font selector
    useEffect(() => {
      if (isMarkdownMode) {
        return;
      }

      const handleSelectionChange = () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !editableRef.current) return;

        const range = sel.getRangeAt(0);
        if (!editableRef.current.contains(range.commonAncestorContainer)) {
          return;
        }

        const isCollapsed = range.collapsed;
        const selectedStr = sel.toString();

        if (!isCollapsed) {
          savedRangeRef.current = range.cloneRange();
          setHasTextSelection(true);
          onSelectionTextChange?.(selectedStr);
        } else if (document.activeElement === editableRef.current) {
          savedRangeRef.current = range.cloneRange();
          setHasTextSelection(false);
          onSelectionTextChange?.('');
        }

        const detectedFont = detectFontInRange(range, editableRef.current);
        setCurrentLocalFont(detectedFont);
        updateFormatStates();
      };

      document.addEventListener('selectionchange', handleSelectionChange);
      return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, [isMarkdownMode, onSelectionTextChange, updateFormatStates]);

    const saveSelection = useCallback(() => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editableRef.current) {
        const range = sel.getRangeAt(0);
        if (editableRef.current.contains(range.commonAncestorContainer)) {
          savedRangeRef.current = range.cloneRange();
          const detectedFont = detectFontInRange(range, editableRef.current);
          setCurrentLocalFont(detectedFont);
        }
      }
    }, []);

    const restoreSelection = useCallback((): Range | null => {
      if (savedRangeRef.current && editableRef.current) {
        try {
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(savedRangeRef.current);
            return savedRangeRef.current;
          }
        } catch {
          return null;
        }
      }
      return null;
    }, []);

    /**
     * Applies a Google Font to the selected text, or to the current sentence
     * if the cursor is placed inside a sentence without highlighting.
     */
    const handleApplyLocalFont = useCallback(
      (fontName: string) => {
        if (fontName !== 'inherit') {
          loadGoogleFont(fontName);
        }
        setCurrentLocalFont(fontName);

        // Markdown Mode
        if (isMarkdownMode && textareaRef.current) {
          const textarea = textareaRef.current;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const selected = textarea.value.substring(start, end) || 'styled sentence';
          const wrapped =
            fontName === 'inherit'
              ? selected.replace(/<\/?(?:span|font)[^>]*>/gi, '')
              : `<span data-local-font="${fontName}" style="font-family: '${fontName}', sans-serif;">${selected}</span>`;
          const newText =
            textarea.value.substring(0, start) +
            wrapped +
            textarea.value.substring(end);
          emitChange(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start, start + wrapped.length);
          }, 0);
          return;
        }

        // Visual WYSIWYG Mode
        if (!editableRef.current) return;

        const targetRange = savedRangeRef.current
          ? savedRangeRef.current.cloneRange()
          : null;

        editableRef.current.focus();

        const sel = window.getSelection();
        if (!sel) return;

        let activeRange: Range | null = targetRange;
        if (!activeRange && sel.rangeCount > 0 && editableRef.current.contains(sel.anchorNode)) {
          activeRange = sel.getRangeAt(0).cloneRange();
        }

        // If cursor is collapsed inside a sentence, expand to that sentence so single-sentence font changes work effortlessly
        if (activeRange && activeRange.collapsed) {
          const expanded = expandRangeToCurrentSentence(activeRange, editableRef.current);
          if (expanded) {
            activeRange = expanded;
          }
        }

        if (activeRange && !activeRange.collapsed) {
          const updatedRange = applyFontToRange(activeRange, fontName, editableRef.current);
          if (updatedRange) {
            sel.removeAllRanges();
            sel.addRange(updatedRange);
            savedRangeRef.current = updatedRange.cloneRange();
          }
        } else if (fontName !== 'inherit') {
          // Empty line / empty editor: insert a styled span ready for typing
          const span = document.createElement('span');
          span.setAttribute('data-local-font', fontName);
          span.style.fontFamily = `"${fontName}", sans-serif`;
          span.innerHTML = '&#8203;';
          if (activeRange) {
            activeRange.insertNode(span);
            const newRange = document.createRange();
            newRange.setStart(span.firstChild || span, 1);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            savedRangeRef.current = newRange.cloneRange();
          }
        }

        emitChange(editableRef.current.innerHTML);
      },
      [isMarkdownMode, emitChange]
    );

    useImperativeHandle(ref, () => ({
      scrollToLine: (lineIndex: number) => {
        if (isMarkdownMode && textareaRef.current) {
          const textarea = textareaRef.current;
          const lines = textarea.value.split('\n');
          let charCount = 0;
          for (let i = 0; i < Math.min(lineIndex, lines.length); i++) {
            charCount += lines[i].length + 1;
          }
          textarea.focus();
          textarea.setSelectionRange(charCount, charCount);
        } else if (editableRef.current) {
          const headings = editableRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
          if (headings[lineIndex - 1]) {
            headings[lineIndex - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      },
      focus: () => {
        if (isMarkdownMode) {
          textareaRef.current?.focus();
        } else {
          editableRef.current?.focus();
        }
      },
      getSelectedText: () => {
        if (isMarkdownMode && textareaRef.current) {
          const { selectionStart, selectionEnd, value } = textareaRef.current;
          return value.substring(selectionStart, selectionEnd);
        }
        if (savedRangeRef.current && !savedRangeRef.current.collapsed) {
          return savedRangeRef.current.toString();
        }
        return window.getSelection()?.toString() || '';
      },
      insertLink: (url: string, displayText: string, openInNewTab: boolean) => {
        if (isMarkdownMode && textareaRef.current) {
          const textarea = textareaRef.current;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const linkMd = `[${displayText || url}](${url})`;
          const newText =
            textarea.value.substring(0, start) +
            linkMd +
            textarea.value.substring(end);
          emitChange(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + linkMd.length, start + linkMd.length);
          }, 0);
          return;
        }

        if (editableRef.current) {
          const targetRange = savedRangeRef.current
            ? savedRangeRef.current.cloneRange()
            : null;
          editableRef.current.focus();
          if (targetRange) {
            const sel = window.getSelection();
            if (sel) {
              sel.removeAllRanges();
              sel.addRange(targetRange);
            }
          }
          const targetAttr = openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
          const linkHtml = `<a href="${url}"${targetAttr}>${displayText || url}</a>`;
          document.execCommand('insertHTML', false, linkHtml);
          emitChange(editableRef.current.innerHTML);
        }
      },
      applyLocalFont: handleApplyLocalFont,
      insertImage: (src: string, altText: string) => {
        if (isMarkdownMode && textareaRef.current) {
          const textarea = textareaRef.current;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const imageMd = `\n\n![${altText}](${src})\n\n`;
          const newText =
            textarea.value.substring(0, start) +
            imageMd +
            textarea.value.substring(end);
          emitChange(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + imageMd.length, start + imageMd.length);
          }, 0);
        } else if (editableRef.current) {
          editableRef.current.focus();
          restoreSelection();
          const figureHtml = `<figure><img src="${src}" alt="${altText}" /><figcaption>${altText}</figcaption></figure><p></p>`;
          document.execCommand('insertHTML', false, figureHtml);
          emitChange(editableRef.current.innerHTML);
        }
      },
      insertTable: (rows: number, cols: number, hasHeader: boolean) => {
        if (isMarkdownMode && textareaRef.current) {
          const textarea = textareaRef.current;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;

          let tableMd = '\n\n';
          tableMd += '| ' + Array.from({ length: cols }).map((_, c) => `Header ${c + 1}`).join(' | ') + ' |\n';
          tableMd += '| ' + Array.from({ length: cols }).map(() => '---').join(' | ') + ' |\n';
          for (let r = 0; r < rows; r++) {
            tableMd += '| ' + Array.from({ length: cols }).map((_, c) => `Cell ${r + 1}-${c + 1}`).join(' | ') + ' |\n';
          }
          tableMd += '\n';

          const newText =
            textarea.value.substring(0, start) +
            tableMd +
            textarea.value.substring(end);
          emitChange(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + tableMd.length, start + tableMd.length);
          }, 0);
        } else if (editableRef.current) {
          editableRef.current.focus();
          restoreSelection();
          let tableHtml = '<table>';
          if (hasHeader) {
            tableHtml += '<thead><tr>';
            for (let c = 0; c < cols; c++) {
              tableHtml += `<th>Header ${c + 1}</th>`;
            }
            tableHtml += '</tr></thead>';
          }
          tableHtml += '<tbody>';
          const startRow = hasHeader ? 1 : 0;
          for (let r = startRow; r < rows; r++) {
            tableHtml += '<tr>';
            for (let c = 0; c < cols; c++) {
              tableHtml += `<td>Cell ${r + 1}-${c + 1}</td>`;
            }
            tableHtml += '</tr>';
          }
          tableHtml += '</tbody></table><p></p>';

          document.execCommand('insertHTML', false, tableHtml);
          emitChange(editableRef.current.innerHTML);
        }
      },
    }));

    // Rich text command execution
    const execFormat = (command: string, value: string | undefined = undefined) => {
      if (isMarkdownMode) {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end) || 'text';
        let wrapped = selected;

        if (command === 'bold') wrapped = `**${selected}**`;
        else if (command === 'italic') wrapped = `*${selected}*`;
        else if (command === 'underline') wrapped = `<u>${selected}</u>`;
        else if (command === 'strikeThrough') wrapped = `~~${selected}~~`;
        else if (command === 'superscript') wrapped = `<sup>${selected}</sup>`;
        else if (command === 'subscript') wrapped = `<sub>${selected}</sub>`;
        else if (command === 'formatBlock' && value === '<h1>') wrapped = `\n# ${selected}\n`;
        else if (command === 'formatBlock' && value === '<h2>') wrapped = `\n## ${selected}\n`;
        else if (command === 'formatBlock' && value === '<h3>') wrapped = `\n### ${selected}\n`;
        else if (command === 'formatBlock' && value === '<p>') wrapped = `\n${selected.replace(/^[#>\s-]+/, '')}\n`;
        else if (command === 'formatBlock' && value === '<blockquote>') wrapped = `\n> ${selected}\n`;
        else if (command === 'insertUnorderedList') wrapped = `\n- ${selected}\n`;
        else if (command === 'insertOrderedList') wrapped = `\n1. ${selected}\n`;
        else if (command === 'insertHorizontalRule') wrapped = `\n\n---\n\n`;
        else if (command === 'hiliteColor') wrapped = `<mark style="background-color: ${value}">${selected}</mark>`;
        else if (command === 'foreColor') {
          wrapped = value === 'inherit' ? selected : `<span style="color: ${value}">${selected}</span>`;
        } else if (command === 'fontSize') wrapped = `<font size="${value}">${selected}</font>`;

        const newText =
          textarea.value.substring(0, start) +
          wrapped +
          textarea.value.substring(end);
        emitChange(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start, start + wrapped.length);
        }, 0);
        return;
      }

      // Visual WYSIWYG Mode
      const targetRange = savedRangeRef.current
        ? savedRangeRef.current.cloneRange()
        : null;

      if (editableRef.current) {
        if (document.activeElement !== editableRef.current) {
          editableRef.current.focus();
        }
        if (targetRange) {
          const s = window.getSelection();
          if (s) {
            s.removeAllRanges();
            s.addRange(targetRange);
          }
        }
      }

      // Expand selection inside word for single-word styling if collapsed
      const sel = window.getSelection();
      if (
        sel &&
        sel.isCollapsed &&
        sel.rangeCount > 0 &&
        editableRef.current?.contains(sel.anchorNode) &&
        (command === 'bold' ||
          command === 'italic' ||
          command === 'underline' ||
          command === 'strikeThrough' ||
          command === 'hiliteColor' ||
          command === 'foreColor' ||
          command === 'fontSize')
      ) {
        try {
          const selWithModify = sel as unknown as {
            modify?: (alter: string, direction: string, granularity: string) => void;
          };
          if (typeof selWithModify.modify === 'function') {
            selWithModify.modify('move', 'backward', 'word');
            selWithModify.modify('extend', 'forward', 'word');
            saveSelection();
          }
        } catch {
          // fallback
        }
      }

      if (command === 'hiliteColor') {
        if (value === 'transparent') {
          document.execCommand('hiliteColor', false, 'transparent');
          document.execCommand('backColor', false, 'transparent');
        } else if (value) {
          try {
            document.execCommand('styleWithCSS', false, 'true');
          } catch {}
          const success = document.execCommand('hiliteColor', false, value);
          if (!success) {
            document.execCommand('backColor', false, value);
          }
          // Automatically detect whether highlight is light or dark and set readable foreground color
          const readableInk = isLightColor(value) ? '#18191b' : '#f8fafc';
          document.execCommand('foreColor', false, readableInk);
        }
      } else if (command === 'foreColor') {
        if (value === 'inherit') {
          document.execCommand('removeFormat', false);
        } else {
          try {
            document.execCommand('styleWithCSS', false, 'true');
          } catch {}
          document.execCommand('foreColor', false, value);
        }
      } else if (command === 'fontSize') {
        try {
          document.execCommand('styleWithCSS', false, 'false');
        } catch {}
        document.execCommand('fontSize', false, value);
      } else if (command === 'formatBlock') {
        const targetTag = value?.startsWith('<') ? value : `<${value || 'p'}>`;
        try {
          const success = document.execCommand('formatBlock', false, targetTag);
          if (!success) {
            document.execCommand('formatBlock', false, value?.replace(/[<>]/g, ''));
          }
        } catch {
          document.execCommand('formatBlock', false, value?.replace(/[<>]/g, ''));
        }
      } else {
        document.execCommand(command, false, value);
      }

      if (editableRef.current) {
        saveSelection();
        emitChange(editableRef.current.innerHTML);
      }
      updateFormatStates();
    };

    const handleContentEditableInput = () => {
      if (editableRef.current) {
        emitChange(editableRef.current.innerHTML);
      }
      saveSelection();
      updateFormatStates();
    };

    // Interactive checkbox click handler inside Visual Editor
    const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
        const checkbox = target as HTMLInputElement;
        if (checkbox.checked) {
          checkbox.setAttribute('checked', 'checked');
        } else {
          checkbox.removeAttribute('checked');
        }
        if (editableRef.current) {
          emitChange(editableRef.current.innerHTML);
        }
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      // Cmd/Ctrl + S: Manual save
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSaveTrigger?.();
        return;
      }

      // Cmd/Ctrl + F: Open Find & Replace
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFindOpen((prev) => !prev);
        return;
      }

      // Cmd/Ctrl + K: Link Modal
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        saveSelection();
        onOpenLinkModal();
        return;
      }

      if (!isMarkdownMode) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
          e.preventDefault();
          execFormat('bold');
          return;
        }

        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
          e.preventDefault();
          execFormat('italic');
          return;
        }

        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
          e.preventDefault();
          execFormat('underline');
          return;
        }

        // Inline markdown shortcut: when user types **word** followed by Space, make it real bold!
        if (e.key === ' ' || e.key === 'Spacebar') {
          const selection = window.getSelection();
          if (selection && selection.isCollapsed && selection.anchorNode) {
            const node = selection.anchorNode;
            if (node.nodeType === Node.TEXT_NODE && node.textContent) {
              const text = node.textContent.slice(0, selection.anchorOffset);
              const boldMatch = text.match(/\*\*([^*\n]+)\*\*$/);
              if (boldMatch) {
                e.preventDefault();
                const fullMatch = boldMatch[0];
                const innerText = boldMatch[1];
                const matchStart = selection.anchorOffset - fullMatch.length;

                const range = document.createRange();
                range.setStart(node, matchStart);
                range.setEnd(node, selection.anchorOffset);
                range.deleteContents();

                const strongEl = document.createElement('strong');
                strongEl.textContent = innerText;
                range.insertNode(strongEl);

                const spaceNode = document.createTextNode('\u00A0');
                strongEl.after(spaceNode);

                const newRange = document.createRange();
                newRange.setStartAfter(spaceNode);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);

                if (editableRef.current) {
                  emitChange(editableRef.current.innerHTML);
                }
                updateFormatStates();
                return;
              }
            }
          }
        }
      }

      // Tab indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        if (isMarkdownMode && textareaRef.current) {
          const textarea = textareaRef.current;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newText =
            textarea.value.substring(0, start) +
            '  ' +
            textarea.value.substring(end);
          emitChange(newText);
          setTimeout(() => {
            textarea.setSelectionRange(start + 2, start + 2);
          }, 0);
        } else {
          document.execCommand('insertHTML', false, '&nbsp;&nbsp;');
          if (editableRef.current) {
            emitChange(editableRef.current.innerHTML);
          }
        }
      }
    };

    // Toggle between Visual Mode and Markdown Source Mode
    const handleToggleMode = () => {
      if (isMarkdownMode) {
        const html = parseMarkdownToHtml(content);
        emitChange(html);
        setIsMarkdownMode(false);
      } else {
        const md = htmlToMarkdown(content);
        emitChange(md);
        setIsMarkdownMode(true);
      }
    };

    // Find & Replace actions
    const matchCount = React.useMemo(() => {
      if (!findQuery.trim()) return 0;
      const plain = editableRef.current?.innerText || content;
      const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = plain.match(new RegExp(escaped, 'gi'));
      return matches ? matches.length : 0;
    }, [findQuery, content]);

    const handleReplaceOne = () => {
      if (!findQuery) return;
      const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      if (isMarkdownMode) {
        const updated = content.replace(regex, replaceQuery);
        emitChange(updated);
      } else if (editableRef.current) {
        const walker = document.createTreeWalker(editableRef.current, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          if (node.textContent && regex.test(node.textContent)) {
            node.textContent = node.textContent.replace(regex, replaceQuery);
            emitChange(editableRef.current.innerHTML);
            break;
          }
        }
      }
    };

    const handleReplaceAll = () => {
      if (!findQuery) return;
      const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      if (isMarkdownMode) {
        const updated = content.replace(regex, replaceQuery);
        emitChange(newTextWithReplace(content, regex, replaceQuery));
      } else if (editableRef.current) {
        const walker = document.createTreeWalker(editableRef.current, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          if (node.textContent && regex.test(node.textContent)) {
            node.textContent = node.textContent.replace(regex, replaceQuery);
          }
        }
        emitChange(editableRef.current.innerHTML);
      }
    };

    function newTextWithReplace(str: string, rx: RegExp, rep: string) {
      return str.replace(rx, rep);
    }

    return (
      <div className="editor-pane flex-1 flex flex-col h-full bg-[#faf9f6] dark:bg-[#121316] overflow-hidden relative">
        {/* Top Formatting Toolbar (Font selector automatically updates & highlights on cursor text selection) */}
        {!isZen && (
          <EditorToolbar
            isMarkdownMode={isMarkdownMode}
            onToggleMode={handleToggleMode}
            onExecFormat={execFormat}
            onOpenImageModal={onOpenImageModal}
            onOpenTableModal={onOpenTableModal}
            onOpenLinkModal={() => {
              saveSelection();
              onOpenLinkModal();
            }}
            onOpenShortcutsModal={onOpenShortcutsModal}
            onApplyLocalFont={handleApplyLocalFont}
            onApplyGlobalDraftFont={onGlobalFontChange}
            currentLocalFont={currentLocalFont}
            defaultDraftFont={fontFamily || 'Source Serif 4'}
            hasTextSelection={hasTextSelection}
            isBoldActive={isBoldActive}
            isItalicActive={isItalicActive}
            isUnderlineActive={isUnderlineActive}
            lineSpacing={lineSpacing}
            onLineSpacingChange={setLineSpacing}
            isFindOpen={isFindOpen}
            onToggleFind={() => setIsFindOpen((prev) => !prev)}
          />
        )}

        {/* Find & Replace Slide-Down Bar */}
        {isFindOpen && (
          <div className="no-print bg-[#f7f6f2] dark:bg-[#181a1f] border-b border-[#e6e4dd] dark:border-[#282b33] px-4 py-2 flex flex-wrap items-center gap-2 text-xs z-20 animate-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#121316] border border-[#e6e4dd] dark:border-[#282b33] rounded-md px-2.5 py-1">
              <Search className="w-3.5 h-3.5 text-[#9ea0a5]" />
              <input
                type="text"
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                placeholder="Find in document..."
                className="bg-transparent focus:outline-none text-xs w-36 sm:w-44 text-[#18191b] dark:text-[#f2f3f5]"
              />
              {findQuery && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#2563eb]/10 text-[#2563eb]">
                  {matchCount} {matchCount === 1 ? 'match' : 'matches'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-white dark:bg-[#121316] border border-[#e6e4dd] dark:border-[#282b33] rounded-md px-2.5 py-1">
              <Replace className="w-3.5 h-3.5 text-[#9ea0a5]" />
              <input
                type="text"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                placeholder="Replace with..."
                className="bg-transparent focus:outline-none text-xs w-36 sm:w-44 text-[#18191b] dark:text-[#f2f3f5]"
              />
            </div>

            <button
              type="button"
              onClick={handleReplaceOne}
              disabled={!findQuery || matchCount === 0}
              className="px-2.5 py-1 rounded bg-[#eae8e1] dark:bg-[#22252c] hover:bg-[#dedbd2] text-[#18191b] dark:text-[#f2f3f5] font-medium disabled:opacity-40 transition-colors"
            >
              Replace
            </button>

            <button
              type="button"
              onClick={handleReplaceAll}
              disabled={!findQuery || matchCount === 0}
              className="px-2.5 py-1 rounded bg-[#2563eb] text-white hover:bg-[#1d4ed8] font-medium disabled:opacity-40 transition-colors"
            >
              Replace All
            </button>

            <button
              type="button"
              onClick={() => setIsFindOpen(false)}
              aria-label="Close Find and Replace"
              className="ml-auto p-1 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Writing Surface */}
        <div
          className={`flex-1 flex justify-center overflow-y-auto ${
            isPageSheetMode
              ? 'bg-[#efede7] dark:bg-[#0d0e11] px-3 sm:px-6 py-8'
              : 'px-4 md:px-8 py-6'
          }`}
        >
          <div
            className={`w-full max-w-[72ch] h-fit min-h-full flex flex-col ${
              isPageSheetMode
                ? 'bg-white dark:bg-[#181a1f] shadow-xl border border-[#e2dfd7] dark:border-[#282b33] rounded-sm px-8 sm:px-14 py-12'
                : ''
            }`}
          >
            {isMarkdownMode ? (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => emitChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onSelect={() => {
                  if (textareaRef.current) {
                    const { selectionStart, selectionEnd, value } = textareaRef.current;
                    const selText = value.substring(selectionStart, selectionEnd);
                    setHasTextSelection(selText.length > 0);
                    onSelectionTextChange?.(selText);
                  }
                }}
                aria-label="Markdown Drafting Editor"
                placeholder="Write your document in Markdown (# for title, **bold**, etc.)..."
                spellCheck="true"
                style={{ fontFamily: fontStyle, lineHeight: lineSpacing }}
                className={`w-full flex-1 min-h-[70vh] bg-transparent text-[#18191b] dark:text-[#f2f3f5] resize-none focus:outline-none ${fontSizeClass} placeholder:text-[#9ea0a5] dark:placeholder:text-[#60636c]`}
              />
            ) : (
              <div
                ref={editableRef}
                contentEditable
                onInput={handleContentEditableInput}
                onClick={handleEditorClick}
                onKeyDown={handleKeyDown}
                onKeyUp={() => {
                  saveSelection();
                  updateFormatStates();
                }}
                onMouseUp={() => {
                  saveSelection();
                  updateFormatStates();
                }}
                role="textbox"
                aria-multiline="true"
                aria-label="Docs Rich Document Editor"
                data-placeholder="Start typing your document... Select any text and choose a font from the top bar!"
                style={{ fontFamily: fontStyle, lineHeight: lineSpacing }}
                className={`w-full flex-1 min-h-[70vh] focus:outline-none prose-editorial ${fontSizeClass} empty:before:content-[attr(data-placeholder)] empty:before:text-[#9ea0a5] dark:empty:before:text-[#60636c] cursor-text`}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
);

EditorPane.displayName = 'EditorPane';
