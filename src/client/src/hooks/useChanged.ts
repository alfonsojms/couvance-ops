import { useState } from 'react';

/**
 * true en el render en que alguna de `deps` cambió respecto del render anterior (y en el primero).
 * Permite ajustar estado a partir de props durante el render, en lugar de hacerlo en un useEffect
 * (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
 */
export function useChanged(deps: readonly unknown[]): boolean {
  const [prev, setPrev] = useState<readonly unknown[] | null>(null);
  const changed = prev === null || deps.some((dep, i) => !Object.is(dep, prev[i]));
  if (changed) setPrev(deps);
  return changed;
}
