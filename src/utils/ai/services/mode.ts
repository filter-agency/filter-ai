type FilterAiMode = { mode: 'native' | 'legacy'; restUrl: string; nonce: string };

declare global {
  interface Window {
    filter_ai_ai?: FilterAiMode;
  }
}

export const getMode = (): 'native' | 'legacy' => window.filter_ai_ai?.mode ?? 'legacy';
