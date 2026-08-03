"use client";

import { useEffect, useId, useRef } from "react";

import { cn } from "@/lib/utils";

type AccessibleDialogProps = Readonly<{
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  closeOnBackdrop?: boolean;
}>;

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** Shared keyboard/focus baseline for demo modals and drawers. */
export function AccessibleDialog({
  open,
  title,
  description,
  onClose,
  children,
  className,
  initialFocusRef,
  returnFocusRef,
  closeOnBackdrop = true,
}: AccessibleDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const returnFocusTarget = returnFocusRef?.current ?? previouslyFocused;
    document.body.style.overflow = "hidden";
    const focusTarget = initialFocusRef?.current ?? panelRef.current?.querySelector<HTMLElement>(focusableSelector);
    focusTarget?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(focusableSelector)];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        event.preventDefault();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      returnFocusTarget?.focus();
    };
  }, [initialFocusRef, onClose, open, returnFocusRef]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={`Fechar ${title}`}
        className="absolute inset-0 h-full w-full cursor-default bg-bg/80 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn("absolute overflow-y-auto border-line bg-bg-alt shadow-subtle", className)}
      >
        <h2 id={titleId} className="sr-only">{title}</h2>
        {description ? <p id={descriptionId} className="sr-only">{description}</p> : null}
        {children}
      </div>
    </div>
  );
}
