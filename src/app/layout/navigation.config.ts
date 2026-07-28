export interface NavigationItem {
  label: string;
  route: string;
  ariaLabel: string;
}

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { label: 'Dashboard', route: '/dashboard', ariaLabel: 'Go to Dashboard' },
  { label: 'Projects', route: '/projects', ariaLabel: 'Go to Projects' },
  { label: 'Tasks', route: '/tasks', ariaLabel: 'Go to Tasks' },
  { label: 'Analytics', route: '/analytics', ariaLabel: 'Go to Analytics' },
  { label: 'Settings', route: '/settings', ariaLabel: 'Go to Settings' },
] as const;

export function getNavigationTitleForUrl(url: string): string {
  const path = url.split('?')[0]?.split('#')[0] ?? '';

  const exactMatch = NAVIGATION_ITEMS.find((item) => item.route === path);
  if (exactMatch) {
    return exactMatch.label;
  }

  const prefixMatch = NAVIGATION_ITEMS.find(
    (item) => path.startsWith(`${item.route}/`) || path.startsWith(`${item.route}?`),
  );
  if (prefixMatch) {
    return prefixMatch.label;
  }

  if (path.startsWith('/projects/')) {
    return 'Projects';
  }

  const segment = path.split('/').filter(Boolean)[0];
  if (!segment) {
    return 'Dashboard';
  }

  return segment.charAt(0).toUpperCase() + segment.slice(1);
}
