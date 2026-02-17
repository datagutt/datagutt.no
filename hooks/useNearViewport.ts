import { useEffect, useState } from "react";

export function useNearViewport(
  ref: React.RefObject<Element | null>,
  rootMargin = "250px 0px",
  once = true,
) {
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsNearViewport(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsNearViewport(false);
        }
      },
      { rootMargin, threshold: 0 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin, once]);

  return isNearViewport;
}
