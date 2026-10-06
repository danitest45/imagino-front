"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { OverlayHost, hasOpenPopup } from "./OverlayHost";
import "./dialog.css";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  description?: string;
  className?: string;
  bodyClassName?: string;
  wide?: boolean;
  closeLabel?: string;
  /** Explicit trigger also covers browsers that do not focus pointer clicks. */
  returnFocusTo?: HTMLElement | null;
}

/** One modal interaction layer for details, confirmation, pickers and drawers. */
export function Dialog({
  open, onClose, title, children, description, className = "", bodyClassName,
  wide = false, closeLabel = "Close dialog", returnFocusTo,
}: DialogProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const descriptionId = useId();
  const content = <>
    <header className="ui-dialog-heading">
      <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
      <DialogPrimitive.Close asChild>
        <button type="button" className="ui-icon-button" aria-label={closeLabel} title={closeLabel}>
          <X size={20} aria-hidden />
        </button>
      </DialogPrimitive.Close>
    </header>
    {description && <DialogPrimitive.Description id={descriptionId} className="ui-dialog-description">{description}</DialogPrimitive.Description>}
    {children}
  </>;
  return <DialogPrimitive.Root open={open} onOpenChange={next => { if (!next) onClose(); }}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="ui-dialog-overlay" />
      <DialogPrimitive.Content
        ref={setContainer}
        className={`ui-dialog${wide ? " ui-dialog-wide" : ""} ${className}`}
        data-imagino-dialog=""
        aria-describedby={description ? descriptionId : undefined}
        onOpenAutoFocus={() => {
          previousFocus.current = returnFocusTo ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
        }}
        onCloseAutoFocus={event => {
          const previous = returnFocusTo ?? previousFocus.current;
          if (previous?.isConnected) {
            event.preventDefault();
            previous.focus({ preventScroll: true });
          }
        }}
        onEscapeKeyDown={event => {
          if (container && hasOpenPopup(container)) event.preventDefault();
        }}
      >
        <OverlayHost container={container}>
          {/* Popups portal beside this scroll surface, inside the modal focus
              boundary. A scrolling modal root clips fixed menus in WebKit. */}
          <div className={`ui-dialog-scroll${bodyClassName ? ` ${bodyClassName}` : ""}`}>{content}</div>
        </OverlayHost>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>;
}
