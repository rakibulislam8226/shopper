/**
 * Shared icon set. One inline-SVG per concept, each sized/styled by the
 * caller via `className` (default `h-4 w-4`, `currentColor` stroke) so a
 * single icon works at any size in any context — a 4px auth-field glyph and
 * a 24px panel badge are the same component, not two.
 *
 * New icon: add it here and import it. Never redefine an existing shape
 * (lock, sparkle, check, ...) locally in a page or component — that's how
 * this file was born in the first place.
 */

import { type SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement>;

function strokeIconProps(props: IconProps): IconProps {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
    className: props.className ?? 'h-4 w-4',
  };
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...strokeIconProps(props)}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <svg {...strokeIconProps(props)}>
      <path d="M13.5 2h-3A1.5 1.5 0 0 0 9 3.5v17A1.5 1.5 0 0 0 10.5 22h3a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 13.5 2Z" />
      <path d="M11 18h2" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...strokeIconProps(props)}>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function StoreIcon(props: IconProps) {
  return (
    <svg {...strokeIconProps(props)}>
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...strokeIconProps(props)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <svg {...strokeIconProps(props)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...strokeIconProps({ strokeWidth: 2.5, ...props })}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <svg {...strokeIconProps({ strokeWidth: 2, className: 'h-3 w-3 shrink-0', ...props })}>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.6 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...strokeIconProps(props)}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <svg {...strokeIconProps(props)}>
      <path d="M9.9 4.24A10.4 10.4 0 0 1 12 4c6.5 0 10 7 10 7a17.5 17.5 0 0 1-2.3 3.3M6.6 6.6C3.4 8.5 2 12 2 12s3.5 7 10 7a10.1 10.1 0 0 0 4.2-.9M2 2l20 20" />
      <path d="M14.1 14.1a3 3 0 1 1-4.2-4.2" />
    </svg>
  );
}

export function BoxIcon(props: IconProps) {
  return (
    <svg {...strokeIconProps(props)}>
      <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />
    </svg>
  );
}

export function CoinsIcon(props: IconProps) {
  return (
    <svg {...strokeIconProps(props)}>
      <path d="M12 7c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3zM4 4v6c0 1.7 3.6 3 8 3s8-1.3 8-3V4M4 10v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <svg {...strokeIconProps(props)}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5M12 7v5l3 2" />
    </svg>
  );
}

export function ScrollIcon(props: IconProps) {
  return (
    <svg {...strokeIconProps(props)}>
      <path d="M6 3h9a3 3 0 0 1 3 3v12a3 3 0 0 0 3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 2-2.8M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

export function TrendUpIcon(props: IconProps) {
  return (
    <svg {...strokeIconProps(props)}>
      <path d="M3 3v18h18M7 15l4-4 3 3 5-6" />
    </svg>
  );
}

export function RevenueIcon(props: IconProps) {
  return (
    <svg {...strokeIconProps(props)}>
      <path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...strokeIconProps(props)}>
      <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
    </svg>
  );
}

/** Filled 4-point sparkle — decorative accents on auth panels. */
export function SparkleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" />
    </svg>
  );
}

/** The shopping-bag brand mark used in `BrandLogo` and the auth panels' badge. */
export function BrandMarkIcon(props: IconProps) {
  return (
    <svg {...strokeIconProps({ strokeWidth: 2, className: 'h-5 w-5', ...props })}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
