import type { TermiApi } from '../shared/types';

declare global {
  interface Window {
    termi: TermiApi;
  }
}

// The build inlines a file imported with `?raw` as a string.
declare module '*.md?raw' {
  const content: string;
  export default content;
}
