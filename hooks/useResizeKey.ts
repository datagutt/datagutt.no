import { useState, useEffect } from "react";

/**
 * Returns a key that increments on element resize (debounced).
 * Add this to a useEffect dependency array to re-run setup on resize.
 */
export function useResizeKey(
  ref: React.RefObject<HTMLElement | null>,
  delay = 150,
) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout>;
    let first = true;

    const observer = new ResizeObserver(() => {
      // Skip the initial observation (effect already runs on mount)
      if (first) {
        first = false;
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => setKey((k) => k + 1), delay);
    });

    observer.observe(el);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [ref, delay]);

  return key;
}
