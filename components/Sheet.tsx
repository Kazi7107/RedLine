"use client";

import { useEffect, useId, useRef } from "react";
import { Icon } from "./Icon";

/**
 * Native <dialog> as a popover on desktop and a bottom sheet on phones.
 * The browser handles focus trapping, Escape and returning focus.
 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself, outside its content) closes it.
        if (e.target === ref.current) onClose();
      }}
    >
      <span className="sheet__grab" aria-hidden="true" />
      <div className="sheet__head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className="sheet__body">{children}</div>
    </dialog>
  );
}
