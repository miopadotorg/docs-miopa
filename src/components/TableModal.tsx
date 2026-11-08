import React, { useState } from 'react';
import { X, Table as TableIcon } from 'lucide-react';

interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTable: (rows: number, cols: number, hasHeader: boolean) => void;
}

export const TableModal: React.FC<TableModalProps> = ({
  isOpen,
  onClose,
  onInsertTable,
}) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [hasHeader, setHasHeader] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInsertTable(Math.max(1, Math.min(12, rows)), Math.max(1, Math.min(8, cols)), hasHeader);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="table-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-xs select-none"
    >
      <div className="bg-[#faf9f6] dark:bg-[#181a1f] border border-[#e6e4dd] dark:border-[#282b33] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e6e4dd] dark:border-[#282b33]">
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-[#2563eb]" />
            <h2 id="table-modal-title" className="text-sm font-semibold text-[#18191b] dark:text-[#f2f3f5]">
              Insert Table
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="table-rows" className="block text-xs font-medium text-[#68696d] dark:text-[#9598a0] mb-1">
                Rows (1–12)
              </label>
              <input
                id="table-rows"
                type="number"
                min="1"
                max="12"
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-1.5 text-xs rounded bg-white dark:bg-[#121316] border border-[#e6e4dd] dark:border-[#282b33] text-[#18191b] dark:text-[#f2f3f5] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
              />
            </div>
            <div>
              <label htmlFor="table-cols" className="block text-xs font-medium text-[#68696d] dark:text-[#9598a0] mb-1">
                Columns (1–8)
              </label>
              <input
                id="table-cols"
                type="number"
                min="1"
                max="8"
                value={cols}
                onChange={(e) => setCols(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-1.5 text-xs rounded bg-white dark:bg-[#121316] border border-[#e6e4dd] dark:border-[#282b33] text-[#18191b] dark:text-[#f2f3f5] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-[#18191b] dark:text-[#f2f3f5]">
            <input
              type="checkbox"
              checked={hasHeader}
              onChange={(e) => setHasHeader(e.target.checked)}
              className="rounded accent-[#2563eb]"
            />
            <span>Include distinct header row</span>
          </label>

          {/* Quick interactive visual grid preview */}
          <div className="border border-[#e6e4dd] dark:border-[#282b33] p-2 rounded bg-white dark:bg-[#121316]">
            <div className="text-[10px] uppercase font-semibold text-[#9ea0a5] mb-1.5">
              Layout ({rows} × {cols})
            </div>
            <div
              className="grid gap-1 max-w-[200px] mx-auto"
              style={{ gridTemplateColumns: `repeat(${Math.min(cols, 8)}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: Math.min(rows * cols, 48) }).map((_, i) => {
                const rowIndex = Math.floor(i / cols);
                const isHeaderCell = hasHeader && rowIndex === 0;
                return (
                  <div
                    key={i}
                    className={`h-4 rounded-xs border ${
                      isHeaderCell
                        ? 'bg-[#2563eb]/20 border-[#2563eb]/40'
                        : 'bg-[#f0eee8] dark:bg-[#22252c] border-[#e6e4dd] dark:border-[#282b33]'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e6e4dd] dark:border-[#282b33]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#68696d] dark:text-[#9598a0] hover:bg-[#eae8e1] dark:hover:bg-[#22252c] rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded transition-colors shadow-xs"
            >
              Insert Table
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
