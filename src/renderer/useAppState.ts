import { useSyncExternalStore } from 'react';
import { getState, subscribe, type AppState } from './appStore';

// Read one part of the store. The selector must return something the store holds (or a
// primitive), never a new array or object, or every read would look like a change.
export function useAppState<T>(selector: (state: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getState()));
}
