import React, { useState, useEffect, useRef } from 'react';
import { X, Link as LinkIcon, ExternalLink, AlertCircle } from 'lucide-react';

interface LinkModalProps {
  isOpen: boolean;
  initialText: string;
  onClose: () => void;
  onInsertLink: (url: string, text: string, openInNewTab: boolean) => void;
}

export const LinkModal: React.FC<LinkModalProps> = ({
  isOpen,
  initialText,
  onClose,
  onInsertLink,
}) => {
  const [url, setUrl] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDisplayText(initialText || '');
      setUrl('');
      setError(null);
      // Auto-focus after modal opens
      setTimeout(() => {
        urlInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, initialText]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError('Please enter a destination URL.');
      return;
    }

    // Auto-prefix http:// if no protocol provided and not anchor or mailto
    let finalUrl = trimmedUrl;
    if (
      !/^https?:\/\//i.test(finalUrl) &&
      !/^mailto:/i.test(finalUrl) &&
      !finalUrl.startsWith('#') &&
      !finalUrl.startsWith('/')
    ) {
      finalUrl = `https://${finalUrl}`;
    }

    const finalLabel = displayText.trim() || trimmedUrl;
    onInsertLink(finalUrl, finalLabel, openInNewTab);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-xs select-none"
    >
      <div className="bg-[#faf9f6] dark:bg-[#181a1f] border border-[#e6e4dd] dark:border-[#282b33] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6e4dd] dark:border-[#282b33]">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-[#2563eb]" />
            <h2 id="link-modal-title" className="text-base font-semibold text-[#18191b] dark:text-[#f2f3f5]">
              Insert Link
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close link dialog"
            className="p-1.5 rounded-md hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="link-url-input" className="block text-xs font-medium text-[#68696d] dark:text-[#9598a0] mb-1.5">
              Link Destination (URL)
            </label>
            <input
              ref={urlInputRef}
              id="link-url-input"
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              placeholder="https://example.com or mailto:person@domain.com"
              className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-[#121316] border border-[#e6e4dd] dark:border-[#282b33] text-[#18191b] dark:text-[#f2f3f5] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
            />
          </div>

          <div>
            <label htmlFor="link-text-input" className="block text-xs font-medium text-[#68696d] dark:text-[#9598a0] mb-1.5">
              Display Text
            </label>
            <input
              id="link-text-input"
              type="text"
              value={displayText}
              onChange={(e) => setDisplayText(e.target.value)}
              placeholder="Text to display (defaults to URL)"
              className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-[#121316] border border-[#e6e4dd] dark:border-[#282b33] text-[#18191b] dark:text-[#f2f3f5] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="link-newtab-checkbox"
              checked={openInNewTab}
              onChange={(e) => setOpenInNewTab(e.target.checked)}
              className="rounded border-[#d3d0c7] dark:border-[#383d47] text-[#2563eb] focus:ring-[#2563eb]"
            />
            <label htmlFor="link-newtab-checkbox" className="text-xs text-[#18191b] dark:text-[#f2f3f5] flex items-center gap-1 cursor-pointer">
              <span>Open in new tab</span>
              <ExternalLink className="w-3 h-3 text-[#68696d] dark:text-[#9598a0]" />
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-md border border-red-200 dark:border-red-900/50">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e6e4dd] dark:border-[#282b33]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#68696d] dark:text-[#9598a0] hover:bg-[#eae8e1] dark:hover:bg-[#22252c] rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!url.trim()}
              className="px-4 py-1.5 text-xs font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              Insert Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
