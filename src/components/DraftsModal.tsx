import React, { useState } from 'react';
import { DocumentDraft } from '../types.ts';
import { calculateMetrics } from '../utils/parser.ts';
import { X, Plus, Copy, Trash2, FileText, Check, AlertTriangle, Eye } from 'lucide-react';

interface DraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentDraft[];
  activeId: string;
  onSelectDocument: (id: string) => void;
  onCreateNewDocument: () => void;
  onDuplicateDocument: (id: string) => void;
  onDeleteDocument: (id: string) => void;
  onImportFile?: (file: File) => void;
  isViewOnly?: boolean;
}

export const DraftsModal: React.FC<DraftsModalProps> = ({
  isOpen,
  onClose,
  documents,
  activeId,
  onSelectDocument,
  onCreateNewDocument,
  onDuplicateDocument,
  onDeleteDocument,
  onImportFile,
  isViewOnly = false,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportFile) {
      onImportFile(file);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drafts-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 dark:bg-black/70 backdrop-blur-xs select-none"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".opdc,.docx,.md,.txt,.markdown,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="bg-[#faf9f6] dark:bg-[#181a1f] border border-[#e6e4dd] dark:border-[#282b33] rounded-xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#e6e4dd] dark:border-[#282b33] gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 id="drafts-modal-title" className="text-base font-semibold text-[#18191b] dark:text-[#f2f3f5]">
                Document Library
              </h2>
              {isViewOnly && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-[#2563eb]/10 text-[#2563eb] dark:text-[#60a5fa]">
                  <Eye className="w-3 h-3" />
                  <span>Phone Reader</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#68696d] dark:text-[#9598a0] truncate">
              {documents.length} {documents.length === 1 ? 'document' : 'documents'} available to read
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onImportFile && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#18191b] dark:text-[#f2f3f5] bg-[#f0eee8] dark:bg-[#22252c] hover:bg-[#eae8e1] dark:hover:bg-[#2c3038] border border-[#e6e4dd] dark:border-[#282b33] rounded-md transition-colors"
              >
                <span>Import (.opdc / .docx)</span>
              </button>
            )}
            {!isViewOnly && (
              <button
                onClick={() => {
                  onCreateNewDocument();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Draft</span>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-md hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {documents.map((doc) => {
            const isActive = doc.id === activeId;
            const metrics = calculateMetrics(doc.content);
            const formattedDate = new Date(doc.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={doc.id}
                className={`p-3 sm:p-3.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                  isActive
                    ? 'border-[#2563eb] bg-[#2563eb]/5 dark:bg-[#2563eb]/10'
                    : 'border-[#e6e4dd] dark:border-[#282b33] bg-white dark:bg-[#121316] hover:border-[#68696d]'
                }`}
              >
                <div
                  className="flex-1 cursor-pointer min-w-0"
                  onClick={() => {
                    onSelectDocument(doc.id);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#2563eb]' : 'text-[#68696d]'}`} />
                    <span className="font-medium text-sm text-[#18191b] dark:text-[#f2f3f5] truncate">
                      {doc.title || 'Untitled Draft'}
                    </span>
                    {isActive && (
                      <span className="text-[10px] uppercase font-semibold text-[#2563eb] dark:text-[#60a5fa] px-1.5 py-0.5 rounded bg-[#2563eb]/10 shrink-0">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#68696d] dark:text-[#9598a0] flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>{metrics.words} words</span>
                    <span>·</span>
                    <span>{metrics.readingTimeText}</span>
                    <span>·</span>
                    <span>{formattedDate}</span>
                  </div>
                </div>

                {!isViewOnly && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onDuplicateDocument(doc.id)}
                      title="Duplicate draft"
                      aria-label={`Duplicate ${doc.title}`}
                      className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {deleteConfirmId === doc.id ? (
                      <div className="flex items-center gap-1 pl-1">
                        <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">Delete?</span>
                        <button
                          onClick={() => {
                            onDeleteDocument(doc.id);
                            setDeleteConfirmId(null);
                          }}
                          title="Confirm deletion"
                          aria-label="Confirm deletion"
                          className="p-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          title="Cancel deletion"
                          aria-label="Cancel deletion"
                          className="p-1.5 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(doc.id)}
                        disabled={documents.length <= 1}
                        title={documents.length <= 1 ? 'Cannot delete the only draft' : 'Delete draft'}
                        aria-label={`Delete ${doc.title}`}
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-[#68696d] hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-4 sm:px-6 py-3 border-t border-[#e6e4dd] dark:border-[#282b33] bg-[#f7f6f2] dark:bg-[#14161b] flex items-center justify-between gap-2 text-xs text-[#68696d] dark:text-[#9598a0]">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 opacity-60 shrink-0" />
            <span className="truncate">
              {isViewOnly
                ? 'Tap any document above to view it in phone reader mode.'
                : 'Drafts are securely preserved in your local browser storage.'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs font-medium text-[#18191b] dark:text-[#f2f3f5] hover:bg-[#eae8e1] dark:hover:bg-[#22252c] rounded transition-colors shrink-0"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
