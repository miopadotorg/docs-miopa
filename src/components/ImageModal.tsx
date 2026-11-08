import React, { useState, useRef } from 'react';
import { X, Upload, Link as LinkIcon, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { optimizeImageFile } from '../utils/imageCompress.ts';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertImage: (src: string, altText: string) => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  onInsertImage,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, SVG, WebP, GIF).');
      return;
    }

    try {
      const optimized = await optimizeImageFile(file);
      if (!optimized) {
        setError('Failed to process image file.');
        return;
      }
      setPreviewSrc(optimized);
      if (!altText) {
        const defaultAlt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setAltText(defaultAlt);
      }
    } catch {
      setError('Failed to read image file.');
    }
  };

  const handleUrlChange = (val: string) => {
    setImageUrl(val);
    setError(null);
    if (val.trim().startsWith('http://') || val.trim().startsWith('https://') || val.trim().startsWith('data:image/')) {
      setPreviewSrc(val.trim());
    } else {
      setPreviewSrc(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSrc = activeTab === 'upload' ? previewSrc : imageUrl.trim();
    if (!finalSrc) {
      setError('Please select or enter an image source.');
      return;
    }

    onInsertImage(finalSrc, altText.trim() || 'Document image');
    handleResetAndClose();
  };

  const handleResetAndClose = () => {
    setImageUrl('');
    setAltText('');
    setPreviewSrc(null);
    setError(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-xs select-none"
    >
      <div className="bg-[#faf9f6] dark:bg-[#181a1f] border border-[#e6e4dd] dark:border-[#282b33] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6e4dd] dark:border-[#282b33]">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#2563eb]" />
            <h2 id="image-modal-title" className="text-base font-semibold text-[#18191b] dark:text-[#f2f3f5]">
              Insert Image
            </h2>
          </div>
          <button
            onClick={handleResetAndClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-md hover:bg-[#eae8e1] dark:hover:bg-[#22252c] text-[#68696d] dark:text-[#9598a0] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch: Upload vs URL */}
        <div className="flex border-b border-[#e6e4dd] dark:border-[#282b33] bg-[#f7f6f2] dark:bg-[#14161b] px-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('upload');
              setError(null);
            }}
            className={`flex items-center gap-2 py-3 text-xs font-medium border-b-2 transition-colors mr-6 ${
              activeTab === 'upload'
                ? 'border-[#2563eb] text-[#2563eb] dark:text-[#60a5fa]'
                : 'border-transparent text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File (Offline Base64)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('url');
              setError(null);
            }}
            className={`flex items-center gap-2 py-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'url'
                ? 'border-[#2563eb] text-[#2563eb] dark:text-[#60a5fa]'
                : 'border-transparent text-[#68696d] dark:text-[#9598a0] hover:text-[#18191b] dark:hover:text-[#f2f3f5]'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Web URL</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {activeTab === 'upload' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="image-file-input"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#d3d0c7] dark:border-[#383d47] hover:border-[#2563eb] dark:hover:border-[#60a5fa] rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center bg-white dark:bg-[#121316]"
              >
                <Upload className="w-8 h-8 text-[#9ea0a5] mb-2" />
                <span className="text-xs font-medium text-[#18191b] dark:text-[#f2f3f5]">
                  Click to select an image from your device
                </span>
                <span className="text-[11px] text-[#68696d] dark:text-[#9598a0] mt-1">
                  Supports PNG, JPG, WebP, GIF, SVG (up to 8MB)
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="image-url-input" className="block text-xs font-medium text-[#68696d] dark:text-[#9598a0] mb-1.5">
                Image Web URL
              </label>
              <input
                id="image-url-input"
                type="url"
                value={imageUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://images.unsplash.com/... or any public link"
                className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-[#121316] border border-[#e6e4dd] dark:border-[#282b33] text-[#18191b] dark:text-[#f2f3f5] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
              />
            </div>
          )}

          {/* Alt / Caption Text */}
          <div>
            <label htmlFor="image-alt-input" className="block text-xs font-medium text-[#68696d] dark:text-[#9598a0] mb-1.5">
              Caption / Alt Description
            </label>
            <input
              id="image-alt-input"
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="e.g. Architectural diagram of the modular system"
              className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-[#121316] border border-[#e6e4dd] dark:border-[#282b33] text-[#18191b] dark:text-[#f2f3f5] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
            />
          </div>

          {/* Error notice */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-md border border-red-200 dark:border-red-900/50">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Image Preview Box */}
          {previewSrc && (
            <div className="border border-[#e6e4dd] dark:border-[#282b33] rounded-lg p-2 bg-[#f7f6f2] dark:bg-[#14161b]">
              <div className="text-[11px] font-medium text-[#68696d] dark:text-[#9598a0] mb-1.5">Preview</div>
              <div className="max-h-48 overflow-hidden rounded flex items-center justify-center bg-black/5 dark:bg-white/5">
                <img
                  src={previewSrc}
                  alt={altText || 'Preview'}
                  className="max-h-44 object-contain rounded"
                  onError={() => setError('Image failed to load. Please verify the URL.')}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e6e4dd] dark:border-[#282b33]">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="px-3 py-1.5 text-xs text-[#68696d] dark:text-[#9598a0] hover:bg-[#eae8e1] dark:hover:bg-[#22252c] rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!previewSrc && !imageUrl.trim()}
              className="px-4 py-1.5 text-xs font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              Insert Image
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
