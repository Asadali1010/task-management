import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { APP_THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  const mockMatchMedia = (prefersDark: boolean): void => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: prefersDark,
      media: '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    } as MediaQueryList);
  };

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    mockMatchMedia(false);

    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });

    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.restoreAllMocks();
  });

  it('should default to light theme when nothing is stored and system prefers light', () => {
    service.init();

    expect(service.theme()).toBe('light');
    expect(service.isLight()).toBe(true);
    expect(service.isDark()).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should resolve dark theme from system preference when nothing is stored', () => {
    mockMatchMedia(true);

    service.init();

    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should read stored theme from localStorage on init', () => {
    localStorage.setItem(APP_THEME_STORAGE_KEY, 'dark');

    service.init();

    expect(service.theme()).toBe('dark');
    expect(service.isLight()).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should persist theme and update data-theme when setTheme is called', () => {
    service.init();

    service.setTheme('dark');

    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(localStorage.getItem(APP_THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should toggle between light and dark themes', () => {
    service.init();

    service.toggleTheme();
    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem(APP_THEME_STORAGE_KEY)).toBe('dark');

    service.toggleTheme();
    expect(service.theme()).toBe('light');
    expect(localStorage.getItem(APP_THEME_STORAGE_KEY)).toBe('light');
  });

  it('should not access localStorage or document on the server platform', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    const setAttributeSpy = vi.spyOn(document.documentElement, 'setAttribute');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });

    const serverService = TestBed.inject(ThemeService);
    serverService.init();
    serverService.setTheme('dark');

    expect(serverService.theme()).toBe('dark');
    expect(getItemSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(setAttributeSpy).not.toHaveBeenCalled();
  });
});
