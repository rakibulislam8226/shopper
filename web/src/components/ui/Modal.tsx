import { cn } from '@lib/cn';
import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { CloseIcon } from './icons';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  children: ReactNode;
}

/**
 * Reusable overlay dialog, shared by every "add/edit X" flow in the
 * dashboard rather than each screen rolling its own. Blurs and locks the
 * page behind it while open — body scroll is disabled and the backdrop
 * absorbs every click, so nothing underneath is reachable until it closes —
 * and portals to `document.body` so it always stacks above the dashboard
 * layout regardless of where in the tree it's rendered from.
 *
 * Closes on Escape or a backdrop click; the panel itself stops that click
 * from bubbling to the backdrop.
 */
export function Modal({ open, onClose, title, description, size = 'md', children }: ModalProps) {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const titleId = title ? 'modal-title' : undefined;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl',
          'border border-edge-strong bg-card shadow-2xl',
          SIZE_CLASSES[size],
        )}
      >
        {(title ?? description) && (
          <div className="flex items-start justify-between gap-4 border-b border-edge-strong px-8 py-6">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="text-xl font-semibold text-text-primary">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1.5 text-base leading-relaxed text-text-muted">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 rounded-lg p-2 text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="overflow-y-auto px-8 py-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
