import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { InfoIcon } from './icons';

const TOOLTIP_WIDTH = 224;
const VIEWPORT_MARGIN = 12;

interface Position {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
}

/**
 * Small "i" glyph next to a label; shows `text` on hover, or on click/tap.
 *
 * The panel is portalled to `document.body` and positioned from the
 * trigger's own bounding rect rather than CSS `absolute` — it sits inside
 * modals whose panel clips overflow, so a CSS-relative tooltip gets cut off
 * near an edge. Position is clamped to the viewport and flips above the
 * trigger when there isn't room below.
 */
export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const placement = window.innerHeight - rect.bottom < 90 ? 'top' : 'bottom';
    const width = Math.min(TOOLTIP_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - VIEWPORT_MARGIN),
    );
    setPosition({
      top: placement === 'bottom' ? rect.bottom + 8 : rect.top - 8,
      left,
      placement,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const close = (event: Event) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', close);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((value) => !value)}
        aria-label="More information"
        className="flex h-4 w-4 cursor-help items-center justify-center rounded-full text-text-faint transition-colors hover:text-indigo-400"
      >
        <InfoIcon className="h-3.5 w-3.5" />
      </button>

      {open &&
        position &&
        createPortal(
          <span
            role="tooltip"
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              width: Math.min(TOOLTIP_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2),
              transform: position.placement === 'top' ? 'translateY(-100%)' : undefined,
            }}
            className="z-60 rounded-lg border border-edge-strong bg-elevated px-3 py-2 text-xs leading-relaxed font-normal text-text-secondary normal-case shadow-2xl"
          >
            {text}
          </span>,
          document.body,
        )}
    </>
  );
}
