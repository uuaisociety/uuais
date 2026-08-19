"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Used for the dialog's accessible name and the default header. */
  title: string;
  description?: string;
  /** Overrides the default header row entirely (caller must include a close control). */
  header?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  children: React.ReactNode;
}

const sizes = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
} as const;

/**
 * Accessible modal built on Radix Dialog: focus trap, Escape to close, focus
 * restore on close, scroll lock, and proper dialog semantics out of the box.
 * Matches the incumbent admin modal look (white/gray-800 panel, rounded-lg).
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  header,
  size = "md",
  className,
  children,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          aria-modal="true"
          {...(description ? {} : { "aria-describedby": undefined })}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 focus:outline-none"
        >
          <div
            className={cn(
              "bg-card rounded-lg p-6 w-full max-h-[90vh] overflow-y-auto shadow-xl",
              sizes[size],
              className,
            )}
          >
            {header ? (
              <>
                <Dialog.Title asChild><h2 className="sr-only">{title}</h2></Dialog.Title>
                {description && <Dialog.Description className="sr-only">{description}</Dialog.Description>}
                {header}
              </>
            ) : (
              <>
                <div className="flex justify-between items-start mb-4 gap-4">
                  <div>
                    <Dialog.Title asChild>
                      <h2 className="text-xl font-bold text-foreground">{title}</h2>
                    </Dialog.Title>
                    {description && (
                      <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Close dialog"
                      className="size-9 grid place-items-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] transition-colors cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </Dialog.Close>
                </div>
              </>
            )}
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default Modal;
