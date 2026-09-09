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
  const sheetRef = useRef<HTMLElement | null>(null);
  const isClosing = closing || internalClosing;

  const requestClose = useCallback(() => {
    if (isClosing) return;
    setInternalClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      onClose();
    }, EXIT_ANIMATION_MS);
  }, [isClosing, onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetRef.current?.querySelector<HTMLButtonElement>(".view-sheet-close")?.focus();

    function containFocus(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const controls = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      ) ?? []).filter((control) => control.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first && last) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last && first) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", containFocus);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", containFocus);
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

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
      ref={sheetRef}
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
