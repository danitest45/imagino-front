"use client";

import { createContext, useContext, type ReactNode } from "react";

// Native dialogs occupy the browser's top layer. Their popup descendants must
// remain inside that dialog instead of being portaled behind it to document.body.
const OverlayContainer = createContext<HTMLElement | null>(null);

export function OverlayHost({ container, children }: {
  container: HTMLElement | null;
  children: ReactNode;
}) {
  return <OverlayContainer.Provider value={container}>{children}</OverlayContainer.Provider>;
}

export function useOverlayContainer() {
  return useContext(OverlayContainer);
}

export function hasOpenPopup(element: HTMLElement) {
  return !!element.querySelector('[data-imagino-popup][data-state="open"]');
}
