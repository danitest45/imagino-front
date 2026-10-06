'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** Native modal supplies focus containment, Escape handling and focus restoration. */
export default function StudioDialog({ open, onClose, title, children, wide = false }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    else if (!open && element.open) element.close();
    return () => { if (element.open) element.close(); };
  }, [open]);
  return <dialog ref={dialog} className={`studio-dialog${wide ? ' studio-dialog-wide' : ''}`} aria-labelledby={id}
    onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="studio-dialog-inner">
      <div className="studio-dialog-heading"><h2 id={id}>{title}</h2><button className="studio-icon-button" type="button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></div>
      {open ? children : null}
    </div>
  </dialog>;
}
