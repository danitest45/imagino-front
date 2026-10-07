"use client";

import { createContext, useContext, type ReactNode } from "react";

// Keep popup descendants inside their active dialog for nested focus management,
// stacking, and compatibility with any remaining native top-layer dialogs.
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

const inertOwners = new WeakMap<HTMLElement, { count: number; previous: string | null }>();

/** Radix Select hides other branches from assistive technology and traps focus.
 * Also make those branches genuinely unfocusable while its modal list is open.
 * Never inert an ancestor of the popup or its containing dialog. */
export function inertOutsidePopup(popup: HTMLElement) {
  const boundary = popup.closest<HTMLElement>("[data-imagino-dialog], dialog[open]") ?? popup.ownerDocument.body;
  const acquired = new Set<HTMLElement>();
  let released = false;

  function acquireBranches() {
    if (released || !boundary.contains(popup)) return;
    let branch: HTMLElement = popup;
    while (branch !== boundary && branch.parentElement) {
      const parent = branch.parentElement;
      for (const sibling of Array.from(parent.children)) {
        if (!(sibling instanceof HTMLElement) || sibling === branch || acquired.has(sibling)) continue;
        const owner = inertOwners.get(sibling);
        if (owner) owner.count += 1;
        else {
          inertOwners.set(sibling, { count: 1, previous: sibling.getAttribute("inert") });
          sibling.setAttribute("inert", "");
        }
        acquired.add(sibling);
      }
      branch = parent;
    }
  }

  acquireBranches();
  // New root-level UI or portals must not reintroduce focusable hidden content.
  // Descendants of a branch already marked inert inherit its behavior.
  const observer = new MutationObserver(acquireBranches);
  observer.observe(boundary, { childList: true, subtree: true });
  return () => {
    if (released) return;
    released = true;
    observer.disconnect();
    for (const element of acquired) {
      const owner = inertOwners.get(element);
      if (!owner || --owner.count > 0) continue;
      if (owner.previous === null) element.removeAttribute("inert");
      else element.setAttribute("inert", owner.previous);
      inertOwners.delete(element);
    }
    acquired.clear();
  };
}
