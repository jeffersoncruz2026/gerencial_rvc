import { useEffect, useState } from 'react';

/**
 * Selection state that defaults to the last (most recent) option and falls back
 * to it whenever the current value is empty or no longer available — e.g. when
 * the data finishes loading after the page has mounted.
 * `options` must be sorted ascending.
 */
export function useLatestOption(options: string[]) {
  const latest = options[options.length - 1] || '';
  const [value, setValue] = useState<string>(latest);

  useEffect(() => {
    if (!value || !options.includes(value)) setValue(latest);
  }, [options, latest, value]);

  const current = value && options.includes(value) ? value : latest;
  return [current, setValue] as const;
}
