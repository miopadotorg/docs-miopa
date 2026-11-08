import React from 'react';
import { X, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl/Cmd + B', label: 'Bold formatting' },
    { key: 'Ctrl/Cmd + I', label: 'Italic formatting' },
    { key: 'Ctrl/Cmd + U', label: 'Underline formatting' },
    { key: 'Ctrl/Cmd + K', label: 'Insert link' },
    { key: 'Ctrl/Cmd + S', label: 'Manual instant save' },
    { key: 'Ctrl/Cmd + Z', label: 'Undo change' },
    { key: 'Ctrl/Cmd + Y', label: 'Redo change' },
    { key: 'Tab', label: 'Indent text / insert spaces' },
    { key: 'Esc', label: 'Exit Zen mode' },
    { key: '**text** + Space', label: 'Inline bold auto-format' },
    { key: '- + Space', label: 'Start bullet list' },
    { key: '1. + Space', label: 'Start numbered list' },
    { key: '> + Space', label: 'Start blockquote' },
    { key: '--- + Enter', label: 'Insert horizontal divider' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-xs select-none"
    >
      <div className="bg-[#faf9f6] dark:bg-[#181a1f] border border-[#e6e4dd] dark:border-[#282b33] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e6e4dd] dark:border-[#282b33]">
          <div className="flex items-center gap-2">
            <Command className="w-4 h-4 text-[#2563eb]" />
            <h2 id="shortcuts-modal-title" className="text-sm font-semibold text-[#18191b] dark:text-[#f2f3f5]">
              Keyboard & Markdown Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-2">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-[#f0eee8] dark:hover:bg-[#22252c] text-xs transition-colors"
            >
              <span className="text-[#68696d] dark:text-[#9598a0]">{sc.label}</span>
              <kbd className="px-2 py-0.5 rounded bg-white dark:bg-[#121316] border border-[#e6e4dd] dark:border-[#282b33] text-[11px] font-mono text-[#18191b] dark:text-[#f2f3f5] shadow-xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-[#e6e4dd] dark:border-[#282b33] bg-[#f7f6f2] dark:bg-[#14161b] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1 text-xs font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
