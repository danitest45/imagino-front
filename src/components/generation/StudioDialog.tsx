"use client";

import { Dialog, type DialogProps } from "../ui/Dialog";

/** Compatibility wrapper: all studio modals share the Imagino Radix primitive. */
export default function StudioDialog({ wide = false, className = "", ...props }: DialogProps) {
  return <Dialog {...props} wide={wide} className={`studio-dialog${wide ? " studio-dialog-wide" : ""} ${className}`} bodyClassName="studio-dialog-inner" />;
}
