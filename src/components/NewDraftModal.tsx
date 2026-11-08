import React, { useState, useEffect, useRef } from 'react';
import { X, FilePlus2, AlertCircle } from 'lucide-react';

interface NewDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string) => void;
}

export const NewDraftModal: React.FC<NewDraftModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 40);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Please enter a title for your new draft.');
      inputRef.current?.focus();
      return;
    }
    onCreate(trimmed);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-draft-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-xs select-none"
    >
      <div className="bg-[#faf9f6] dark:bg-[#181a1f] border border-[#e6e4dd] dark:border-[#282b33] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6e4dd] dark:border-[#282b33]">
          <div className="flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-[#2563eb]" />
            <h2
              id="new-draft-modal-title"
              className="text-base font-semibold text-[#18191b] dark:text-[#f2f3f5]"
            >
              Create New Draft
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-md hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label
              htmlFor="new-draft-title-input"
              className="block text-xs font-medium text-[#68696d] dark:text-[#9598a0] mb-1.5"
            >
              Document Title
            </label>
            <input
              ref={inputRef}
              id="new-draft-title-input"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. System Architecture Notes, Chapter 1..."
              className="w-full px-3 py-2 text-sm rounded-md bg-white dark:bg-[#121316] border border-[#e6e4dd] dark:border-[#282b33] text-[#18191b] dark:text-[#f2f3f5] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-md border border-red-200 dark:border-red-900/50">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e6e4dd] dark:border-[#282b33]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#68696d] dark:text-[#9598a0] hover:bg-[#eae8e1] dark:hover:bg-[#22252c] rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-md transition-colors shadow-xs"
            >
              Create Draft
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
