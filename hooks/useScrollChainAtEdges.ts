"use client";

import { useEffect } from "react";

/**
 * When a nested scroll area hits its top/bottom edge, allow wheel events to
 * propagate so the page (or parent scroller) can continue scrolling.
 */
export function useScrollChainAtEdges(
  ref: React.RefObject<HTMLElement | null>,
  enabled = true,
) {
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;

      const maxScrollTop = element.scrollHeight - element.clientHeight;
      if (maxScrollTop <= 0) return;

      const atTop = element.scrollTop <= 0;
      const atBottom = element.scrollTop >= maxScrollTop - 1;
      const scrollingUp = event.deltaY < 0;
      const scrollingDown = event.deltaY > 0;

      if ((scrollingUp && atTop) || (scrollingDown && atBottom)) {
        return;
      }

      event.stopPropagation();
    };

    element.addEventListener("wheel", onWheel, { passive: true });
    return () => element.removeEventListener("wheel", onWheel);
  }, [ref, enabled]);
}
