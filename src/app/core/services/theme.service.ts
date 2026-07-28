import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

export const APP_THEME_STORAGE_KEY = 'app-theme';

export type AppTheme = 'light' | 'dark';

const VALID_THEMES: readonly AppTheme[] = ['light', 'dark'];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly theme = signal<AppTheme>('light');
  readonly isDark = computed(() => this.theme() === 'dark');
  readonly isLight = computed(() => this.theme() === 'light');

  init(): void {
    this.applyTheme(this.resolveTheme(), { persist: false });
  }

  setTheme(theme: AppTheme): void {
    this.applyTheme(theme, { persist: true });
  }

  toggleTheme(): void {
    this.setTheme(this.theme() === 'light' ? 'dark' : 'light');
  }

  private resolveTheme(): AppTheme {
    if (!isPlatformBrowser(this.platformId)) {
      return 'light';
    }

    const stored = localStorage.getItem(APP_THEME_STORAGE_KEY);
    if (stored && this.isAppTheme(stored)) {
      return stored;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyTheme(theme: AppTheme, options: { persist: boolean }): void {
    this.theme.set(theme);

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    document.documentElement.setAttribute('data-theme', theme);

    if (options.persist) {
      localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
    }
  }

  private isAppTheme(value: string): value is AppTheme {
    return VALID_THEMES.includes(value as AppTheme);
  }
}
