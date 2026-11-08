import { DocumentDraft, EditorSettings } from '../types.ts';

const STORAGE_DOCS_KEY = 'docs_documents_v1';
const STORAGE_ACTIVE_ID_KEY = 'docs_active_id_v1';
const STORAGE_SETTINGS_KEY = 'docs_settings_v1';

export const INITIAL_SAMPLE_CONTENT = `# The Architecture of Thought

Writing is not merely the transcription of ideas already fully formed; it is the physical medium in which thinking unfolds. In a world saturated with ephemeral notifications, the act of sustained drafting demands quiet spaces, deliberate typography, and tools that vanish.

## Principles of Quiet Work

1. **Eliminate Friction**: An idea lost to latency or UI clutter is an idea lost forever.
2. **Respect the Measure**: Reading comfort peaks between 65 and 75 characters per line.
3. **Persist Invisibly**: Every keystroke belongs to the writer, safely stored in local memory.

### Direct Visual Formatting

When writing in Docs, **bold text appears bold as you write**, headings scale cleanly, and your chosen Google Font renders in real time without cognitive friction.

> "Simplicity is about subtracting the obvious and adding the meaningful."  
> — John Maeda, *The Laws of Simplicity*

### Key Milestones for This Draft

- [x] Configure publication typography scale and per-draft Google Font
- [x] Test direct visual bold formatting while writing
- [ ] Draft empirical case study on distraction-free ergonomics
- [ ] Export standalone HTML archive or publish to PDF

### Code & Computation

When technical precision is required, clean syntax formatting ensures code snippets remain immediately readable:

\`\`\`typescript
interface Manuscript {
  title: string;
  wordCount: number;
  readingTimeMinutes: number;
  font: string;
}

function evaluateReadability(manuscript: Manuscript): string {
  return manuscript.wordCount > 500 ? "Longform Essay" : "Brevity Note";
}
\`\`\`

---

## Conclusion & Next Steps

Use the outline sidebar on the left to navigate between sections. When finished, export your draft as clean **Markdown (.md)**, standalone **HTML (.html)**, or print directly to **PDF**.
`;

export const DEFAULT_SETTINGS: EditorSettings = {
  fontFamily: 'serif',
  fontSize: 'base',
  viewMode: 'split',
  theme: 'light',
  showOutline: true,
};

// In-memory fallback layer for seamless operation even if storage is quota-blocked or restricted
let inMemoryDocs: DocumentDraft[] | null = null;
let inMemoryActiveId: string | null = null;
let inMemorySettings: EditorSettings | null = null;

// ==========================================
// IndexedDB High-Capacity Storage Engine
// ==========================================
const DB_NAME = 'docs_application_db';
const DB_VERSION = 1;
const STORE_NAME = 'docs_data';

function openIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openIndexedDb();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {
    // Fail silently without console.error
  }
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openIndexedDb();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve((req.result as T) ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

export function createNewDraft(customTitle?: string, initialFont?: string): DocumentDraft {
  const now = Date.now();
  const id = `doc_${now}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    title: customTitle || 'Untitled Draft',
    content: `# ${customTitle || 'Untitled Draft'}\n\nStart typing your thoughts here...\n`,
    createdAt: now,
    updatedAt: now,
    fontFamily: initialFont || 'Source Serif 4',
    fontSize: 'base',
  };
}

/**
 * Loads all documents synchronously from memory or localStorage,
 * with fallbacks for legacy keys and sample documents.
 */
export function loadAllDocuments(): DocumentDraft[] {
  if (inMemoryDocs && inMemoryDocs.length > 0) {
    return inMemoryDocs;
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw =
        localStorage.getItem(STORAGE_DOCS_KEY) ||
        localStorage.getItem('opendc_documents_v1') ||
        localStorage.getItem('atelier_documents_v1');

      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryDocs = parsed;
          return parsed;
        }
      }
    }
  } catch {
    // Graceful fallback to initial doc
  }

  const initialDoc: DocumentDraft = {
    id: 'initial_sample_doc',
    title: 'The Architecture of Thought',
    content: INITIAL_SAMPLE_CONTENT,
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now(),
    fontFamily: 'Source Serif 4',
    fontSize: 'base',
  };

  inMemoryDocs = [initialDoc];
  saveAllDocuments(inMemoryDocs);
  return inMemoryDocs;
}

/**
 * Persists documents with multi-tier storage:
 * 1. Synchronously updates in-memory state.
 * 2. Asynchronously persists to IndexedDB (virtually unlimited quota for large documents and images).
 * 3. Saves to localStorage; if QuotaExceededError occurs, gracefully prunes heavy base64 strings
 *    from the localStorage mirror while keeping full fidelity in IndexedDB and memory.
 */
export function saveAllDocuments(docs: DocumentDraft[]): void {
  if (!Array.isArray(docs) || docs.length === 0) return;

  // 1. Update memory cache immediately
  inMemoryDocs = docs;

  // 2. Persist to IndexedDB (asynchronous, high capacity)
  idbSet('documents', docs).catch(() => {});

  // 3. Persist to localStorage with quota protection
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_DOCS_KEY, JSON.stringify(docs));
    }
  } catch (err: unknown) {
    // Handle QuotaExceededError or SecurityError gracefully without throwing console.error
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Strip out heavy base64 data URLs from secondary drafts in localStorage mirror
        const lightDocs = docs.map((doc, idx) => {
          if (idx === 0) return doc; // Keep active draft intact if possible
          if (doc.content && doc.content.length > 100000) {
            return {
              ...doc,
              content: doc.content.replace(/src="data:image\/[^;]+;base64,[^"]+"/g, 'src=""'),
            };
          }
          return doc;
        });
        localStorage.setItem(STORAGE_DOCS_KEY, JSON.stringify(lightDocs));
      }
    } catch {
      // If even lightDocs fails, memory and IndexedDB maintain the state
    }
  }
}

/**
 * Asynchronously synchronizes documents with IndexedDB.
 * Called on startup to restore full high-resolution content if localStorage was quota-limited.
 */
export async function syncWithIndexedDb(onHydrate: (docs: DocumentDraft[]) => void): Promise<void> {
  try {
    const idbDocs = await idbGet<DocumentDraft[]>('documents');
    if (Array.isArray(idbDocs) && idbDocs.length > 0) {
      inMemoryDocs = idbDocs;
      onHydrate(idbDocs);
    }
  } catch {
    // Silent
  }
}

export function loadActiveDocumentId(): string {
  if (inMemoryActiveId) return inMemoryActiveId;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const active =
        localStorage.getItem(STORAGE_ACTIVE_ID_KEY) ||
        localStorage.getItem('opendc_active_id_v1');
      if (active) {
        inMemoryActiveId = active;
        return active;
      }
    }
  } catch {
    // Silent
  }

  return 'initial_sample_doc';
}

export function saveActiveDocumentId(id: string): void {
  inMemoryActiveId = id;
  idbSet('active_id', id).catch(() => {});

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, id);
    }
  } catch {
    // Silent
  }
}

export function detectSystemTheme(): 'light' | 'dark' {
  try {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  } catch {
    // Silent
  }
  return 'light';
}

export function loadSettings(): EditorSettings {
  if (inMemorySettings) return inMemorySettings;

  const systemTheme = detectSystemTheme();

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw =
        localStorage.getItem(STORAGE_SETTINGS_KEY) ||
        localStorage.getItem('opendc_settings_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        const merged: EditorSettings = {
          ...DEFAULT_SETTINGS,
          theme: systemTheme,
          ...parsed,
          viewMode: parsed.viewMode === 'zen' ? 'preview' : parsed.viewMode || 'split',
        };
        inMemorySettings = merged;
        return merged;
      }
    }
  } catch {
    // Silent
  }

  return {
    ...DEFAULT_SETTINGS,
    theme: systemTheme,
  };
}

export function saveSettings(settings: EditorSettings): void {
  inMemorySettings = settings;
  idbSet('settings', settings).catch(() => {});

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    }
  } catch {
    // Silent
  }
}
