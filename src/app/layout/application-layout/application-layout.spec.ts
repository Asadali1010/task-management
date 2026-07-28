import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { vi } from 'vitest';

import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { NAVIGATION_ITEMS } from '../navigation.config';
import { ApplicationLayout } from './application-layout';

describe('ApplicationLayout', () => {
  let fixture: ComponentFixture<ApplicationLayout>;
  let authService: {
    logout: ReturnType<typeof vi.fn>;
    getCurrentUserEmail: ReturnType<typeof vi.fn>;
    getCurrentUserInitials: ReturnType<typeof vi.fn>;
  };
  let themeService: ThemeService;
  let router: Router;

  beforeEach(async () => {
    authService = {
      logout: vi.fn(),
      getCurrentUserEmail: vi.fn().mockReturnValue('user@example.com'),
      getCurrentUserInitials: vi.fn().mockReturnValue('UE'),
    };

    await TestBed.configureTestingModule({
      imports: [ApplicationLayout],
      providers: [
        provideRouter([
          { path: 'dashboard', component: class {} },
          { path: 'login', component: class {} },
        ]),
        { provide: AuthService, useValue: authService },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ApplicationLayout);
    themeService = TestBed.inject(ThemeService);
    router = TestBed.inject(Router);
    themeService.init();
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  function getCompiled(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('should create and compose header, sidebar, and router outlet', () => {
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(getCompiled().querySelector('app-top-header')).toBeTruthy();
    expect(getCompiled().querySelector('app-sidebar')).toBeTruthy();
    expect(getCompiled().querySelector('router-outlet')).toBeTruthy();
  });

  it('should render Task Management branding and route-derived page title', async () => {
    await router.navigateByUrl('/dashboard');
    fixture.detectChanges();

    const compiled = getCompiled();
    expect(compiled.textContent).toContain('Task Management');
    expect(compiled.querySelector('.top-header-page-title')?.textContent).toContain('Dashboard');
  });

  it('should list all navigation items from navigation.config', () => {
    fixture.detectChanges();

    const links = Array.from(getCompiled().querySelectorAll('.sidebar-nav-link'));
    expect(links).toHaveLength(NAVIGATION_ITEMS.length);

    for (const item of NAVIGATION_ITEMS) {
      expect(getCompiled().textContent).toContain(item.label);
    }
  });

  it('should wire theme toggle to ThemeService', () => {
    fixture.detectChanges();

    const themeButton = getCompiled().querySelector(
      'button[aria-label="Switch to dark theme"]',
    ) as HTMLButtonElement;

    expect(themeService.theme()).toBe('light');
    themeButton.click();
    fixture.detectChanges();

    expect(themeService.theme()).toBe('dark');
  });

  it('should render notifications placeholder and user profile menu with logout', () => {
    fixture.detectChanges();

    const compiled = getCompiled();
    expect(compiled.querySelector('.top-header-notifications-btn')).toBeTruthy();
    expect(compiled.querySelector('.top-header-avatar')?.textContent).toContain('UE');

    const profileButton = compiled.querySelector('.top-header-avatar-btn') as HTMLButtonElement;
    profileButton.click();
    fixture.detectChanges();

    expect(compiled.textContent).toContain('user@example.com');

    const logoutButton = compiled.querySelector('.top-header-profile-action') as HTMLButtonElement;
    logoutButton.click();
    fixture.detectChanges();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should open mobile sidebar drawer from header menu button', () => {
    fixture.componentInstance['isMobile'].set(true);
    fixture.detectChanges();

    const menuButton = getCompiled().querySelector('.top-header-menu-btn') as HTMLButtonElement;
    expect(menuButton).toBeTruthy();

    menuButton.click();
    fixture.detectChanges();

    expect(getCompiled().querySelector('.sidebar--open')).toBeTruthy();
  });

  it('should close mobile sidebar when backdrop is clicked', () => {
    fixture.componentInstance['isMobile'].set(true);
    fixture.componentInstance['sidebarOpen'].set(true);
    fixture.detectChanges();

    const backdrop = getCompiled().querySelector('.sidebar-backdrop') as HTMLButtonElement;
    backdrop.click();
    fixture.detectChanges();

    expect(getCompiled().querySelector('.sidebar--open')).toBeFalsy();
  });
});
