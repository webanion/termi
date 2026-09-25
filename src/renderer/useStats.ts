import { useEffect, useState } from 'react';
import type { StatsSample } from '../shared/types';

// The latest system stats sample, or null before the first one. Kept out of the store so the
// sample main sends every 1.5 seconds re-renders only the stats footer.
export function useStats(): StatsSample | null {
  const [sample, setSample] = useState<StatsSample | null>(null);
  useEffect(() => window.termi.onStats(setSample), []);
  return sample;
}
