import { type ReactNode } from 'react';

/**
 * Sidebar navigation model — data only. Exporting a component from here too
 * would break React Fast Refresh for the whole module. Kept out of the component so routes, icons and
 * labels live in one list — adding a section means adding an entry here and a
 * route, nothing else.
 */
export interface NavItem {
  label: string;
  /** Present on a leaf item (navigates) and absent on a parent — a parent's
   * "path" is nonsensical since it renders no page of its own, just expands. */
  path?: string;
  icon: ReactNode;
  /** Shown as a muted chip; marks a section whose backend does not exist yet. */
  badge?: string;
  /** Nested items shown when this row is expanded. Presence makes it a parent. */
  children?: NavItem[];
}

/** 24×24 stroke paths, sized by the consumer. */
const paths = {
  grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  box: <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />,
  receipt: <path d="M5 3v18l2.5-1.5L10 21l2-1.5L14 21l2.5-1.5L19 21V3H5zM9 8h6M9 12h6M9 16h3" />,
  users: (
    <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
  ),
  building: (
    <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
  ),
  scroll: (
    <path d="M6 3h9a3 3 0 0 1 3 3v12a3 3 0 0 0 3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 2-2.8M9 8h6M9 12h6M9 16h4" />
  ),
  gear: (
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.1a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 2.6 7a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H7a1.7 1.7 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V7a1.7 1.7 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  ),
  card: (
    <path d="M2 7h20M2 5h20a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM6 15h4" />
  ),
  file: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6" />,
  sun: (
    <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  ),
};

export const NAV_SECTIONS: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Overview',
    items: [{ label: 'Dashboard', path: '/dashboard', icon: paths.grid }],
  },
  {
    heading: 'Operations',
    items: [
      { label: 'Products', path: '/dashboard/products', icon: paths.box },
      { label: 'Sales', path: '/dashboard/sales', icon: paths.receipt, badge: 'Soon' },
    ],
  },
  {
    heading: 'Organization',
    items: [
      { label: 'Employees', path: '/dashboard/employees', icon: paths.users },
      {
        label: 'Organizations',
        path: '/dashboard/organizations',
        icon: paths.building,
        badge: 'Soon',
      },
      { label: 'Audit log', path: '/dashboard/audit', icon: paths.scroll, badge: 'Soon' },
    ],
  },
  {
    heading: 'Account',
    items: [
      {
        label: 'Settings',
        icon: paths.gear,
        children: [
          { label: 'Shop details', path: '/dashboard/settings/profile', icon: paths.card },
          { label: 'Documents', path: '/dashboard/settings/documents', icon: paths.file },
          { label: 'Appearance', path: '/dashboard/settings/appearance', icon: paths.sun },
        ],
      },
    ],
  },
];
