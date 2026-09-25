import type { TermiApi } from '../shared/types';

declare global {
  interface Window {
    termi: TermiApi;
  }
}
