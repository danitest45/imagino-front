"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import "./scroll-region.css";

/** Native scrolling gets a keyboard stop only when content actually overflows. */
export function ScrollRegion({ children, className, label }: {
  children: ReactNode;
  className: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const style = getComputedStyle(element);
      setScrollable(
        (/auto|scroll/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1) ||
        (/auto|scroll/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1),
      );
    };
    const resize = new ResizeObserver(measure);
    const observeChildren = () => {
      resize.disconnect();
      resize.observe(element);
      for (const child of element.children) resize.observe(child);
      measure();
    };
    const mutation = new MutationObserver(observeChildren);
    mutation.observe(element, { childList: true });
    observeChildren();
    return () => { resize.disconnect(); mutation.disconnect(); };
  }, []);
  return <div ref={ref} className={`ui-scroll-region ${className}`} tabIndex={scrollable ? 0 : undefined}
    role={scrollable ? "region" : undefined} aria-label={scrollable ? label : undefined}>
    {children}
  </div>;
}
