import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type FullScreenViewSheetProps = {
  viewKey: string;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  children: ReactNode;
  closing?: boolean;
  onClose: () => void;
};

const EXIT_ANIMATION_MS = 320;

export function FullScreenViewSheet({ viewKey, title, eyebrow, subtitle, children, closing = false, onClose }: FullScreenViewSheetProps) {
  const [internalClosing, setInternalClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const isClosing = closing || internalClosing;

  const requestClose = useCallback(() => {
    if (isClosing) return;
    setInternalClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      onClose();
    }, EXIT_ANIMATION_MS);
  }, [isClosing, onClose]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const sheet = (
    <section
      className={`view-sheet-layer ${isClosing ? "is-closing" : ""}`}
      data-sheet-view={viewKey}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="view-sheet-backdrop" onClick={requestClose} />
      <div className={`view-sheet view-sheet-${viewKey}`}>
        <header className="view-sheet-header">
          <div className="view-sheet-title-block">
            <div className="view-sheet-mark" aria-hidden="true">{title.slice(0, 1)}</div>
            <div>
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
              <h2>{title}</h2>
              {subtitle && <span>{subtitle}</span>}
            </div>
          </div>
          <button className="view-sheet-close" type="button" onClick={requestClose} aria-label="Close panel">
            <X size={18} />
          </button>
        </header>
        <div className="view-sheet-content">{children}</div>
      </div>
    </section>
  );

  return createPortal(sheet, document.body);
}
