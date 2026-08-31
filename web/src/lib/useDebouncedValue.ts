import { useEffect, useState } from 'react';

/**
 * Returns `value`, delayed by `delayMs` after it stops changing — so a
 * search box can update on every keystroke while the value actually sent to
 * the API (and used as a query key) only changes once typing pauses.
 * Reusable anywhere a live input drives a network request.
 */
export function useDebouncedValue<Value>(value: Value, delayMs = 350): Value {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
