/**
 * Curated Google Fonts library, dynamic loader, and font management.
 */

export interface GoogleFontOption {
  name: string;
  category: 'serif' | 'sans' | 'mono' | 'display' | 'handwriting';
  label: string;
  description: string;
}

export const DEFAULT_DRAFT_FONT = 'Source Serif 4';

export const CURATED_GOOGLE_FONTS: GoogleFontOption[] = [
  // Editorial & Classic Serifs
  { name: 'Source Serif 4', category: 'serif', label: 'Source Serif 4', description: 'Refined editorial classic' },
  { name: 'Playfair Display', category: 'serif', label: 'Playfair Display', description: 'High-contrast luxury editorial' },
  { name: 'Lora', category: 'serif', label: 'Lora', description: 'Contemporary calligraphic curves' },
  { name: 'Merriweather', category: 'serif', label: 'Merriweather', description: 'Comfortable longform reading' },
  { name: 'Libre Baskerville', category: 'serif', label: 'Libre Baskerville', description: 'Classic book typography' },
  { name: 'PT Serif', category: 'serif', label: 'PT Serif', description: 'Transitional academic serif' },
  { name: 'Cormorant Garamond', category: 'serif', label: 'Cormorant Garamond', description: 'Traditional literary elegance' },
  { name: 'EB Garamond', category: 'serif', label: 'EB Garamond', description: 'Classical Renaissance proportion' },
  { name: 'Crimson Pro', category: 'serif', label: 'Crimson Pro', description: 'Book production and poetry' },
  { name: 'Cinzel', category: 'serif', label: 'Cinzel', description: 'Roman inscription monumentality' },

  // Modern & Clean Sans-Serif
  { name: 'Inter', category: 'sans', label: 'Inter', description: 'Precision digital interface' },
  { name: 'Plus Jakarta Sans', category: 'sans', label: 'Plus Jakarta Sans', description: 'Geometric modern clarity' },
  { name: 'Roboto', category: 'sans', label: 'Roboto', description: 'Neo-grotesque universal clarity' },
  { name: 'Montserrat', category: 'sans', label: 'Montserrat', description: 'Urban geometric headlines & prose' },
  { name: 'Poppins', category: 'sans', label: 'Poppins', description: 'Balanced circular geometric sans' },
  { name: 'DM Sans', category: 'sans', label: 'DM Sans', description: 'Humanist low-contrast geometric' },
  { name: 'Outfit', category: 'sans', label: 'Outfit', description: 'Distinctive brand display sans' },
  { name: 'Manrope', category: 'sans', label: 'Manrope', description: 'Semi-condensed modern geometric' },
  { name: 'Space Grotesk', category: 'sans', label: 'Space Grotesk', description: 'Idiosyncratic tech modernist' },

  // Technical & Monospace
  { name: 'JetBrains Mono', category: 'mono', label: 'JetBrains Mono', description: 'Tabular code and metrics' },
  { name: 'Fira Code', category: 'mono', label: 'Fira Code', description: 'Developer programming standard' },
  { name: 'IBM Plex Mono', category: 'mono', label: 'IBM Plex Mono', description: 'Engineered industrial precision' },
  { name: 'Space Mono', category: 'mono', label: 'Space Mono', description: 'Retro-futuristic typewriter' },

  // Expressive, Handwriting & Display
  { name: 'Caveat', category: 'handwriting', label: 'Caveat', description: 'Warm personal handwriting' },
  { name: 'Dancing Script', category: 'handwriting', label: 'Dancing Script', description: 'Lively calligraphic script' },
  { name: 'Patrick Hand', category: 'handwriting', label: 'Patrick Hand', description: 'Clean notebook annotations' },
  { name: 'Abril Fatface', category: 'display', label: 'Abril Fatface', description: 'Dramatic publication titling' },
  { name: 'Oswald', category: 'display', label: 'Oswald', description: 'Condensed editorial headline' },
];

const loadedFonts = new Set<string>();

/**
 * Dynamically injects a fault-tolerant Google Font <link> tag into the document head if not yet loaded.
 * Uses the resilient /css?family= endpoint so fonts with partial weight/italic axes never 400.
 */
export function loadGoogleFont(fontName: string): void {
  if (!fontName || typeof document === 'undefined') return;
  const cleanName = fontName.replace(/^['"]+|['"]+$/g, '').trim();
  if (
    !cleanName ||
    cleanName === 'inherit' ||
    ['serif', 'sans-serif', 'monospace', 'system-ui'].includes(cleanName.toLowerCase()) ||
    loadedFonts.has(cleanName)
  ) {
    return;
  }

  const fontId = `gfont-${cleanName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(fontId)) {
    loadedFonts.add(cleanName);
    return;
  }

  try {
    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    const familyParam = encodeURIComponent(cleanName).replace(/%20/g, '+');
    link.href = `https://fonts.googleapis.com/css?family=${familyParam}:400,400i,500,600,700,700i&display=swap`;
    document.head.appendChild(link);
    loadedFonts.add(cleanName);
  } catch {
    // Silent fallback to local system font stack
  }
}

/**
 * Preloads all curated Google Fonts in a single batched stylesheet on startup
 * so local sentence fonts and toolbar font previews render instantaneously.
 */
export function preloadAllCuratedFonts(): void {
  if (typeof document === 'undefined') return;
  const batchId = 'gfont-curated-batch';
  if (document.getElementById(batchId)) return;

  try {
    const families = CURATED_GOOGLE_FONTS.map(
      (f) => `${encodeURIComponent(f.name).replace(/%20/g, '+')}:400,400i,600,700`
    ).join('|');
    const link = document.createElement('link');
    link.id = batchId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css?family=${families}&display=swap`;
    document.head.appendChild(link);
    CURATED_GOOGLE_FONTS.forEach((f) => loadedFonts.add(f.name));
  } catch {
    // Silent fallback
  }
}

/**
 * Scans HTML/Markdown content for any local font-family or face="..." usage
 * and ensures their Google Fonts are loaded.
 */
export function loadFontsFromContent(content: string): void {
  if (!content || typeof document === 'undefined') return;
  const styleMatches = content.matchAll(/font-family:\s*['"]?([^'";,>]+)/gi);
  for (const m of styleMatches) {
    if (m[1]) loadGoogleFont(m[1]);
  }
  const faceMatches = content.matchAll(/\bface=["']([^"']+)["']/gi);
  for (const m of faceMatches) {
    if (m[1]) loadGoogleFont(m[1]);
  }
}

/**
 * Returns a CSS font-family string with safe fallback.
 */
export function getFontFamilyCss(fontName?: string): string {
  if (!fontName || fontName === 'inherit') {
    return `"Source Serif 4", Georgia, serif`;
  }
  const clean = fontName.replace(/^['"]+|['"]+$/g, '').trim();
  return `"${clean}", "Source Serif 4", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, serif, sans-serif`;
}
