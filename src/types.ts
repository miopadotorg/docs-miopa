export type EditorViewMode = 'split' | 'editor' | 'preview' | 'zen';

export type FontFamily = 'serif' | 'sans' | 'mono';

export type FontSize = 'sm' | 'base' | 'lg' | 'xl';

export type SaveState = 'saved' | 'saving' | 'idle';

export interface DocumentDraft {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  fontFamily?: string;
  fontSize?: FontSize;
}

export interface EditorSettings {
  fontFamily: FontFamily;
  fontSize: FontSize;
  viewMode: EditorViewMode;
  theme: 'light' | 'dark';
  showOutline: boolean;
}
