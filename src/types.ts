export type Snippet = {
  id: string;
  imageData: string;
  textContent?: string; // If converted to text
  width: number;
  height: number;
  aspectRatio: number;
};

export type AppState = {
  step: 'upload' | 'editor' | 'arrange' | 'download';
  originalImage: string | null;
  snippets: Snippet[];
};
