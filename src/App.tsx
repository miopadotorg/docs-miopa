import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  DocumentDraft,
  EditorSettings,
  EditorViewMode,
  FontSize,
  SaveState,
} from './types.ts';
import {
  loadAllDocuments,
  saveAllDocuments,
  loadActiveDocumentId,
  saveActiveDocumentId,
  loadSettings,
  saveSettings,
  createNewDraft,
  syncWithIndexedDb,
} from './utils/storage.ts';
import { optimizeImageFile } from './utils/imageCompress.ts';
import {
  calculateMetrics,
  extractHeadings,
  buildStandaloneHtml,
  htmlToMarkdown,
  HeadingItem,
} from './utils/parser.ts';
import { exportOpdcFile, parseImportedFileContent } from './utils/opdc.ts';
import { generateDocxBlob } from './utils/docxExport.ts';
import { parseDocxArrayBuffer } from './utils/docxImport.ts';
import {
  loadGoogleFont,
  preloadAllCuratedFonts,
  DEFAULT_DRAFT_FONT,
} from './utils/fonts.ts';
import { TopNav } from './components/TopNav.tsx';
import { OutlineSidebar } from './components/OutlineSidebar.tsx';
import { EditorPane, EditorPaneRef } from './components/EditorPane.tsx';
import { PreviewPane, PreviewPaneRef } from './components/PreviewPane.tsx';
import { MetricsBar } from './components/MetricsBar.tsx';
import { DraftsModal } from './components/DraftsModal.tsx';
import { NewDraftModal } from './components/NewDraftModal.tsx';
import { FontPickerModal } from './components/FontPickerModal.tsx';
import { ImageModal } from './components/ImageModal.tsx';
import { TableModal } from './components/TableModal.tsx';
import { ShortcutsModal } from './components/ShortcutsModal.tsx';
import { LinkModal } from './components/LinkModal.tsx';
import { Minimize2, UploadCloud, CheckCircle2 } from 'lucide-react';

export default function App() {
  // State
  const [documents, setDocuments] = useState<DocumentDraft[]>(() => loadAllDocuments());
  const [activeId, setActiveId] = useState<string>(() => loadActiveDocumentId());
  const [settings, setSettings] = useState<EditorSettings>(() => loadSettings());
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Modals & Panels State
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
  const [isNewDraftModalOpen, setIsNewDraftModalOpen] = useState(false);
  const [isFontModalOpen, setIsFontModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkModalInitialText, setLinkModalInitialText] = useState('');
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Drag and drop & Toast notifications
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectionText, setSelectionText] = useState('');
  const [isPageSheetMode, setIsPageSheetMode] = useState(false);
  const [isMobilePhone, setIsMobilePhone] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(max-width: 767px)').matches;
    }
    return false;
  });

  // Detect phone viewport (< 768px) to enforce clean view-only mode on phones
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const handleViewportChange = (e: MediaQueryListEvent) => {
      setIsMobilePhone(e.matches);
      if (e.matches) {
        setSettings((prev) => ({ ...prev, showOutline: false }));
      }
    };
    if (mq.matches) {
      setSettings((prev) => ({ ...prev, showOutline: false }));
    }
    mq.addEventListener('change', handleViewportChange);
    return () => mq.removeEventListener('change', handleViewportChange);
  }, []);

  // Active document resolution
  const activeDocument = useMemo(() => {
    return documents.find((d) => d.id === activeId) || documents[0] || createNewDraft();
  }, [documents, activeId]);

  const activeFont = activeDocument.fontFamily || DEFAULT_DRAFT_FONT;

  // Preload all curated Google Fonts on startup and load active draft font
  useEffect(() => {
    preloadAllCuratedFonts();
  }, []);

  useEffect(() => {
    if (activeFont) {
      loadGoogleFont(activeFont);
    }
  }, [activeFont]);

  // Derived metrics & outline
  const metrics = useMemo(() => {
    return calculateMetrics(activeDocument.content);
  }, [activeDocument.content]);

  const headings = useMemo(() => {
    return extractHeadings(activeDocument.content);
  }, [activeDocument.content]);

  // References for scrolling sync
  const editorRef = useRef<EditorPaneRef>(null);
  const previewRef = useRef<PreviewPaneRef>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hydrate from IndexedDB on startup (unlimited storage tier)
  useEffect(() => {
    syncWithIndexedDb((hydrated) => {
      if (Array.isArray(hydrated) && hydrated.length > 0) {
        setDocuments(hydrated);
      }
    });
  }, []);

  // Apply light/dark theme class and color-scheme to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [settings.theme]);

  // Automatically detect system/browser Light or Dark mode changes
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const nextTheme = e.matches ? 'dark' : 'light';
      setSettings((prev) => {
        const next = { ...prev, theme: nextTheme as 'light' | 'dark' };
        saveSettings(next);
        return next;
      });
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  // Listen for Escape key to exit Zen/Reading fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && settings.viewMode === 'zen') {
        setSettings((prev) => {
          const next = { ...prev, viewMode: 'split' as EditorViewMode };
          saveSettings(next);
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.viewMode]);

  // Global drag-and-drop listener to import .opdc, .md, .txt, or insert images
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDraggingOver) setIsDraggingOver(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.relatedTarget === null) {
        setIsDraggingOver(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];

      if (file.type.startsWith('image/')) {
        optimizeImageFile(file).then((base64) => {
          if (!base64) return;
          const alt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          editorRef.current?.insertImage(base64, alt);
          setToastMessage(`Inserted image "${file.name}"`);
          setTimeout(() => setToastMessage(null), 3000);
        });
        return;
      }

      try {
        const isDocx =
          file.name.toLowerCase().endsWith('.docx') ||
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const imported = isDocx
          ? await parseDocxArrayBuffer(await file.arrayBuffer(), file.name)
          : parseImportedFileContent(await file.text(), file.name);
        setDocuments((prevDocs) => {
          const updated = [imported, ...prevDocs];
          saveAllDocuments(updated);
          return updated;
        });
        setActiveId(imported.id);
        saveActiveDocumentId(imported.id);
        setToastMessage(`Imported "${imported.title}"`);
        setTimeout(() => setToastMessage(null), 3000);
      } catch {
        setToastMessage('Could not import file.');
        setTimeout(() => setToastMessage(null), 3000);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [isDraggingOver]);

  // Debounced auto-save (400ms delay)
  const triggerDebouncedSave = useCallback((updatedDocs: DocumentDraft[]) => {
    setSaveState('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveAllDocuments(updatedDocs);
      setSaveState('saved');
      const now = new Date();
      setLastSavedTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    }, 400);
  }, []);

  // Update content of active document
  const handleContentChange = useCallback(
    (newContent: string) => {
      setDocuments((prevDocs) => {
        const nextDocs = prevDocs.map((doc) => {
          if (doc.id === activeDocument.id) {
            return {
              ...doc,
              content: newContent,
              updatedAt: Date.now(),
            };
          }
          return doc;
        });
        triggerDebouncedSave(nextDocs);
        return nextDocs;
      });
    },
    [activeDocument.id, triggerDebouncedSave]
  );

  // Update title of active document
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setDocuments((prevDocs) => {
        const nextDocs = prevDocs.map((doc) => {
          if (doc.id === activeDocument.id) {
            return {
              ...doc,
              title: newTitle,
              updatedAt: Date.now(),
            };
          }
          return doc;
        });
        triggerDebouncedSave(nextDocs);
        return nextDocs;
      });
    },
    [activeDocument.id, triggerDebouncedSave]
  );

  // Manual save trigger (e.g. Cmd+S)
  const handleManualSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveAllDocuments(documents);
    setSaveState('saved');
    const now = new Date();
    setLastSavedTime(
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  }, [documents]);

  // Document management handlers
  const handleSelectDocument = (id: string) => {
    setActiveId(id);
    saveActiveDocumentId(id);
  };

  // Prompt user for a title before creating a new draft
  const handlePromptNewDocument = () => {
    setIsNewDraftModalOpen(true);
  };

  const handleConfirmNewDocument = (title: string) => {
    const newDoc = createNewDraft(title.trim() || 'Untitled Draft');
    const updated = [newDoc, ...documents];
    setDocuments(updated);
    setActiveId(newDoc.id);
    saveAllDocuments(updated);
    saveActiveDocumentId(newDoc.id);
    setIsNewDraftModalOpen(false);
    setIsDraftsModalOpen(false);
    setToastMessage(`Created "${newDoc.title}"`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleDuplicateDocument = (id: string) => {
    const target = documents.find((d) => d.id === id);
    if (!target) return;
    const duplicated: DocumentDraft = {
      ...target,
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: `${target.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [duplicated, ...documents];
    setDocuments(updated);
    setActiveId(duplicated.id);
    saveAllDocuments(updated);
    saveActiveDocumentId(duplicated.id);
  };

  const handleDeleteDocument = (id: string) => {
    if (documents.length <= 1) return;
    const filtered = documents.filter((d) => d.id !== id);
    setDocuments(filtered);
    saveAllDocuments(filtered);
    if (activeId === id) {
      const nextActive = filtered[0].id;
      setActiveId(nextActive);
      saveActiveDocumentId(nextActive);
    }
  };

  // Import file (.opdc, .docx, .md, .txt) handler
  const handleImportFile = async (file: File) => {
    try {
      const isDocx =
        file.name.toLowerCase().endsWith('.docx') ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const imported = isDocx
        ? await parseDocxArrayBuffer(await file.arrayBuffer(), file.name)
        : parseImportedFileContent(await file.text(), file.name);
      const updated = [imported, ...documents];
      setDocuments(updated);
      setActiveId(imported.id);
      saveAllDocuments(updated);
      saveActiveDocumentId(imported.id);
      setToastMessage(`Imported "${imported.title}"`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      setToastMessage('Could not import file.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Update font specifically for the active draft
  const handleSelectFontForActiveDraft = useCallback(
    (fontName: string) => {
      setDocuments((prevDocs) => {
        const nextDocs = prevDocs.map((doc) => {
          if (doc.id === activeDocument.id) {
            return {
              ...doc,
              fontFamily: fontName,
              updatedAt: Date.now(),
            };
          }
          return doc;
        });
        triggerDebouncedSave(nextDocs);
        return nextDocs;
      });
    },
    [activeDocument.id, triggerDebouncedSave]
  );

  // View & Settings handlers (Reading mode uses 'preview' directly without Reader/Writer sub-modes)
  const handleViewModeChange = (viewMode: EditorViewMode) => {
    setSettings((prev) => {
      const next = { ...prev, viewMode };
      saveSettings(next);
      return next;
    });
  };

  const handleFontSizeChange = (fontSize: FontSize) => {
    setSettings((prev) => {
      const next = { ...prev, fontSize };
      saveSettings(next);
      return next;
    });
  };

  const handleToggleTheme = () => {
    setSettings((prev) => {
      const nextTheme = prev.theme === 'light' ? 'dark' : 'light';
      const next = { ...prev, theme: nextTheme as 'light' | 'dark' };
      saveSettings(next);
      return next;
    });
  };

  const handleToggleOutline = () => {
    setSettings((prev) => {
      const next = { ...prev, showOutline: !prev.showOutline };
      saveSettings(next);
      return next;
    });
  };

  // Outline jump-list handler
  const handleSelectHeading = (heading: HeadingItem) => {
    if (previewRef.current) {
      previewRef.current.scrollToHeading(heading.id);
    }
    if (!isMobilePhone && editorRef.current && (settings.viewMode === 'split' || settings.viewMode === 'editor')) {
      editorRef.current.scrollToLine(heading.lineIndex);
    }
    if (isMobilePhone) {
      setSettings((prev) => ({ ...prev, showOutline: false }));
    }
  };

  // Rich element insertion handlers
  const handleInsertImage = (src: string, altText: string) => {
    editorRef.current?.insertImage(src, altText);
  };

  const handleInsertTable = (rows: number, cols: number, hasHeader: boolean) => {
    editorRef.current?.insertTable(rows, cols, hasHeader);
  };

  const handleOpenLinkModal = useCallback(() => {
    const selected = editorRef.current?.getSelectedText() || '';
    setLinkModalInitialText(selected);
    setIsLinkModalOpen(true);
  }, []);

  const handleInsertLink = useCallback((url: string, displayText: string, openInNewTab: boolean) => {
    editorRef.current?.insertLink(url, displayText, openInNewTab);
    setToastMessage(`Inserted link`);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Export Pipelines
  const handleExportOpdc = () => {
    exportOpdcFile(activeDocument);
    setToastMessage(`Exported "${activeDocument.title}.opdc"`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExportDocx = async () => {
    try {
      setToastMessage('Preparing Word document (.docx)...');
      const blob = await generateDocxBlob(
        activeDocument.title,
        activeDocument.content,
        activeFont
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = activeDocument.title.replace(/[^\w\s-]/g, '').trim() || 'document';
      a.download = `${safeTitle}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToastMessage(`Downloaded "${safeTitle}.docx"`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      setToastMessage('Failed to generate Word document.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleExportMarkdown = () => {
    const rawContent = activeDocument.content;
    const isHtml = /<[a-z][\s\S]*>/i.test(rawContent);
    const mdContent = isHtml ? htmlToMarkdown(rawContent) : rawContent;
    const blob = new Blob([mdContent], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `${activeDocument.title.replace(/[^\w\s-]/g, '').trim() || 'document'}.md`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportHtml = () => {
    const standaloneHtml = buildStandaloneHtml(
      activeDocument.title,
      activeDocument.content,
      activeFont
    );
    const blob = new Blob([standaloneHtml], {
      type: 'text/html;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `${activeDocument.title.replace(/[^\w\s-]/g, '').trim() || 'document'}.html`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleCopyMarkdown = () => {
    const rawContent = activeDocument.content;
    const isHtml = /<[a-z][\s\S]*>/i.test(rawContent);
    const mdContent = isHtml ? htmlToMarkdown(rawContent) : rawContent;
    navigator.clipboard.writeText(mdContent);
  };

  const handleCopyHtml = () => {
    const html = buildStandaloneHtml(
      activeDocument.title,
      activeDocument.content,
      activeFont
    );
    navigator.clipboard.writeText(html);
  };

  return (
    <div className="app-layout min-h-screen h-screen flex flex-col bg-[#faf9f6] dark:bg-[#121316] text-[#18191b] dark:text-[#f2f3f5] font-sans overflow-hidden">
      {/* Top Bar Navigation */}
      {settings.viewMode !== 'zen' && (
        <TopNav
          title={activeDocument.title}
          onTitleChange={handleTitleChange}
          viewMode={settings.viewMode}
          onViewModeChange={handleViewModeChange}
          saveState={saveState}
          lastSavedTime={lastSavedTime}
          draftsCount={documents.length}
          onOpenDraftsModal={() => setIsDraftsModalOpen(true)}
          onNewDraft={handlePromptNewDocument}
          onImportFile={handleImportFile}
          showOutline={settings.showOutline}
          onToggleOutline={handleToggleOutline}
          theme={settings.theme}
          onToggleTheme={handleToggleTheme}
          onExportOpdc={handleExportOpdc}
          onExportDocx={handleExportDocx}
          onExportMarkdown={handleExportMarkdown}
          onExportHtml={handleExportHtml}
          onPrintPdf={handlePrintPdf}
          onCopyMarkdown={handleCopyMarkdown}
          onCopyHtml={handleCopyHtml}
          onOpenFontPicker={() => setIsFontModalOpen(true)}
          fontFamily={activeFont}
          isMobileViewOnly={isMobilePhone}
        />
      )}

      {/* Minimal Exit Button if legacy zen mode is triggered */}
      {settings.viewMode === 'zen' && (
        <div className="no-print absolute top-3 right-4 z-50 flex items-center gap-2 bg-[#faf9f6]/95 dark:bg-[#181a1f]/95 backdrop-blur-md border border-[#e6e4dd] dark:border-[#282b33] px-3 py-1.5 rounded-full shadow-lg text-xs">
          <button
            onClick={() => handleViewModeChange('split')}
            title="Exit Reading Mode (Esc)"
            aria-label="Exit Reading Mode"
            className="flex items-center gap-1 text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] transition-colors px-2 py-0.5 rounded-full"
          >
            <Minimize2 className="w-3 h-3" />
            <span className="text-[11px] font-medium">Exit (Esc)</span>
          </button>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="no-print absolute top-16 right-4 sm:right-6 z-50 flex items-center gap-2 bg-[#18191b] text-white dark:bg-white dark:text-[#18191b] px-4 py-2 rounded-lg shadow-xl text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Drag & Drop Overlay (Desktop only) */}
      {!isMobilePhone && isDraggingOver && (
        <div className="fixed inset-0 z-50 pointer-events-none bg-[#2563eb]/10 dark:bg-[#2563eb]/20 backdrop-blur-xs border-4 border-dashed border-[#2563eb] flex flex-col items-center justify-center text-center p-6 select-none animate-in fade-in duration-100">
          <div className="bg-white dark:bg-[#181a1f] p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-3 border border-[#e6e4dd] dark:border-[#282b33]">
            <UploadCloud className="w-12 h-12 text-[#2563eb] animate-bounce" />
            <div className="text-base font-semibold text-[#18191b] dark:text-[#f2f3f5]">
              Drop file to import into Docs
            </div>
            <div className="text-xs text-[#68696d] dark:text-[#9598a0]">
              Supports .opdc, .md, .txt, or image files
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-content flex-1 flex overflow-hidden relative">
        {isMobilePhone ? (
          /* Phone View-Only Mode: Dedicated mobile reader + slide-over outline drawer */
          <>
            <OutlineSidebar
              headings={headings}
              isOpen={settings.showOutline}
              onToggle={handleToggleOutline}
              onSelectHeading={handleSelectHeading}
            />
            <PreviewPane
              ref={previewRef}
              content={activeDocument.content}
              fontFamily={activeFont}
              fontSize={settings.fontSize}
              title={activeDocument.title}
              isReadingMode={true}
            />
          </>
        ) : settings.viewMode === 'zen' ? (
          <PreviewPane
            ref={previewRef}
            content={activeDocument.content}
            fontFamily={activeFont}
            fontSize={settings.fontSize}
            title={activeDocument.title}
            isReadingMode={true}
          />
        ) : (
          /* Standard Desktop / Tablet Working Modes: Write, Split, and Read */
          <>
            {/* Outline Sidebar (collapsible) */}
            <OutlineSidebar
              headings={headings}
              isOpen={settings.showOutline}
              onToggle={handleToggleOutline}
              onSelectHeading={handleSelectHeading}
            />

            {/* Editor Pane (shown in Split and Write modes) */}
            {(settings.viewMode === 'split' || settings.viewMode === 'editor') && (
              <EditorPane
                ref={editorRef}
                content={activeDocument.content}
                onChange={handleContentChange}
                fontFamily={activeFont}
                onGlobalFontChange={handleSelectFontForActiveDraft}
                fontSize={settings.fontSize}
                onSaveTrigger={handleManualSave}
                isZen={false}
                isPageSheetMode={isPageSheetMode}
                onSelectionTextChange={setSelectionText}
                onOpenImageModal={() => setIsImageModalOpen(true)}
                onOpenTableModal={() => setIsTableModalOpen(true)}
                onOpenLinkModal={handleOpenLinkModal}
                onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
                onCleanUpNotify={() => {
                  setToastMessage('Cleaned up spacing, line breaks, and list markers');
                  setTimeout(() => setToastMessage(null), 3000);
                }}
              />
            )}

            {/* Split Divider line */}
            {settings.viewMode === 'split' && (
              <div
                className="w-px bg-[#e6e4dd] dark:bg-[#282b33] h-full shrink-0"
                aria-hidden="true"
              />
            )}

            {/* Reading Mode (Read) or Split Preview */}
            {(settings.viewMode === 'split' || settings.viewMode === 'preview') && (
              <PreviewPane
                ref={previewRef}
                content={activeDocument.content}
                fontFamily={activeFont}
                fontSize={settings.fontSize}
                title={activeDocument.title}
                isReadingMode={settings.viewMode === 'preview'}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom Metrics & Zoom Bar */}
      {settings.viewMode !== 'zen' && (
        <MetricsBar
          metrics={metrics}
          selectionText={selectionText}
          fontSize={settings.fontSize}
          onFontSizeChange={handleFontSizeChange}
          isPageSheetMode={isPageSheetMode}
          onTogglePageSheetMode={() => setIsPageSheetMode((prev) => !prev)}
          isMobileViewOnly={isMobilePhone}
        />
      )}

      {/* New Draft Title Prompt Modal */}
      <NewDraftModal
        isOpen={isNewDraftModalOpen}
        onClose={() => setIsNewDraftModalOpen(false)}
        onCreate={handleConfirmNewDocument}
      />

      {/* Document Library / Drafts Modal */}
      <DraftsModal
        isOpen={isDraftsModalOpen}
        onClose={() => setIsDraftsModalOpen(false)}
        documents={documents}
        activeId={activeDocument.id}
        onSelectDocument={handleSelectDocument}
        onCreateNewDocument={handlePromptNewDocument}
        onDuplicateDocument={handleDuplicateDocument}
        onDeleteDocument={handleDeleteDocument}
        onImportFile={handleImportFile}
        isViewOnly={isMobilePhone}
      />

      {/* Google Font Studio Modal */}
      <FontPickerModal
        isOpen={isFontModalOpen}
        onClose={() => setIsFontModalOpen(false)}
        currentFont={activeFont}
        onSelectFont={handleSelectFontForActiveDraft}
        draftTitle={activeDocument.title}
      />

      {/* Image Insertion Modal */}
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onInsertImage={handleInsertImage}
      />

      {/* Table Insertion Modal */}
      <TableModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        onInsertTable={handleInsertTable}
      />

      {/* Link Insertion Modal */}
      <LinkModal
        isOpen={isLinkModalOpen}
        initialText={linkModalInitialText}
        onClose={() => setIsLinkModalOpen(false)}
        onInsertLink={handleInsertLink}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}
