import React, { useState, useEffect } from 'react';
import {
  CURATED_GOOGLE_FONTS,
  GoogleFontOption,
  loadGoogleFont,
} from '../utils/fonts.ts';
import { X, Search, Check, Type, Sparkles } from 'lucide-react';

interface FontPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFont: string;
  onSelectFont: (fontName: string) => void;
  draftTitle: string;
}

export const FontPickerModal: React.FC<FontPickerModalProps> = ({
  isOpen,
  onClose,
  currentFont,
  onSelectFont,
  draftTitle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customFontInput, setCustomFontInput] = useState('');

  // Pre-load fonts when modal opens so previews render accurately
  useEffect(() => {
    if (isOpen) {
      CURATED_GOOGLE_FONTS.slice(0, 10).forEach((f) => loadGoogleFont(f.name));
      if (currentFont) loadGoogleFont(currentFont);
    }
  }, [isOpen, currentFont]);

  if (!isOpen) return null;

  const filteredFonts = CURATED_GOOGLE_FONTS.filter((font) => {
    const matchesCategory =
      selectedCategory === 'all' || font.category === selectedCategory;
    const matchesSearch =
      font.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      font.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelect = (fontName: string) => {
    loadGoogleFont(fontName);
    onSelectFont(fontName);
  };

  const handleApplyCustom = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = customFontInput.trim();
    if (!trimmed) return;
    loadGoogleFont(trimmed);
    onSelectFont(trimmed);
    setCustomFontInput('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="font-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-xs select-none"
    >
      <div className="bg-[#faf9f6] dark:bg-[#181a1f] border border-[#e6e4dd] dark:border-[#282b33] rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6e4dd] dark:border-[#282b33]">
          <div>
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-[#2563eb]" />
              <h2 id="font-modal-title" className="text-base font-semibold text-[#18191b] dark:text-[#f2f3f5]">
                Google Font Studio
              </h2>
            </div>
            <p className="text-xs text-[#68696d] dark:text-[#9598a0] mt-0.5">
              Change typography specifically for <span className="font-medium text-[#18191b] dark:text-[#f2f3f5]">"{draftTitle || 'Untitled Draft'}"</span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close font picker"
            className="p-1.5 rounded-md hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Custom Input Bar */}
        <div className="p-4 border-b border-[#e6e4dd] dark:border-[#282b33] space-y-3 bg-[#f7f6f2] dark:bg-[#14161b]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#9ea0a5] dark:text-[#60636c] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search curated fonts..."
              aria-label="Search curated Google fonts"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#181a1f] border border-[#e6e4dd] dark:border-[#282b33] rounded-lg text-[#18191b] dark:text-[#f2f3f5] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
            />
          </div>

          {/* Categories */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {[
              { id: 'all', label: 'All Fonts' },
              { id: 'serif', label: 'Editorial Serif' },
              { id: 'sans', label: 'Modern Sans' },
              { id: 'mono', label: 'Monospace' },
              { id: 'handwriting', label: 'Handwriting' },
              { id: 'display', label: 'Display' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-[#2563eb] text-white shadow-xs'
                    : 'bg-white dark:bg-[#181a1f] text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5] border border-[#e6e4dd] dark:border-[#282b33]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredFonts.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#9ea0a5] dark:text-[#60636c]">
              No curated font found matching "{searchQuery}". Try loading it below as a custom Google Font!
            </div>
          ) : (
            filteredFonts.map((font) => {
              const isSelected = currentFont.toLowerCase() === font.name.toLowerCase();
              return (
                <button
                  key={font.name}
                  onClick={() => handleSelect(font.name)}
                  onMouseEnter={() => loadGoogleFont(font.name)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'border-[#2563eb] bg-[#2563eb]/5 dark:bg-[#2563eb]/10'
                      : 'border-[#e6e4dd] dark:border-[#282b33] bg-white dark:bg-[#121316] hover:border-[#68696d]'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-base text-[#18191b] dark:text-[#f2f3f5] truncate"
                        style={{ fontFamily: `"${font.name}", serif` }}
                      >
                        {font.label}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-semibold text-[#2563eb] dark:text-[#60a5fa] px-1.5 py-0.5 rounded bg-[#2563eb]/10">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#68696d] dark:text-[#9598a0] flex items-center gap-2">
                      <span className="capitalize">{font.category}</span>
                      <span>·</span>
                      <span>{font.description}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span
                      className="text-xs text-[#68696d] dark:text-[#9598a0] opacity-80 hidden sm:inline"
                      style={{ fontFamily: `"${font.name}", serif` }}
                    >
                      Sphinx of black quartz, judge my vow.
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-[#2563eb] shrink-0" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Load Any Custom Google Font */}
        <form
          onSubmit={handleApplyCustom}
          className="p-4 border-t border-[#e6e4dd] dark:border-[#282b33] bg-[#f7f6f2] dark:bg-[#14161b] flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-[#2563eb] shrink-0" />
          <input
            type="text"
            value={customFontInput}
            onChange={(e) => setCustomFontInput(e.target.value)}
            placeholder="Type any Google Font name (e.g. Oswald, Bitter, Nunito)..."
            aria-label="Custom Google Font name"
            className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-[#181a1f] border border-[#e6e4dd] dark:border-[#282b33] rounded-lg text-[#18191b] dark:text-[#f2f3f5] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
          />
          <button
            type="submit"
            disabled={!customFontInput.trim()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-[#18191b] dark:bg-[#2563eb] hover:bg-neutral-800 dark:hover:bg-blue-600 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap"
          >
            Load Font
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-[#18191b] dark:text-[#f2f3f5] hover:bg-[#eae8e1] dark:hover:bg-[#22252c] rounded-lg transition-colors"
          >
            Done
          </button>
        </form>
      </div>
    </div>
  );
};
