import { Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { getNavigationTitleForUrl } from '../navigation.config';

@Component({
  selector: 'app-top-header',
  imports: [RouterLink],
  templateUrl: './top-header.html',
  styleUrl: './top-header.css',
})
export class TopHeader implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  protected readonly themeService = inject(ThemeService);

  readonly showMenuButton = input(false);
  readonly menuExpanded = input(false);

  readonly menuToggle = output<void>();

  protected readonly pageTitle = signal('Dashboard');
  protected readonly profileMenuOpen = signal(false);
  protected readonly userEmail = signal<string | null>(null);
  protected readonly userInitials = signal('?');

  ngOnInit(): void {
    this.refreshUserDisplay();
    this.updatePageTitle(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.updatePageTitle(event.urlAfterRedirects);
        this.refreshUserDisplay();
        this.profileMenuOpen.set(false);
      });
  }

  protected toggleMenu(): void {
    this.menuToggle.emit();
  }

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  protected toggleProfileMenu(): void {
    this.profileMenuOpen.update((open) => !open);
  }

  protected closeProfileMenu(): void {
    this.profileMenuOpen.set(false);
  }

  protected logout(): void {
    this.authService.logout();
    this.profileMenuOpen.set(false);
    void this.router.navigate(['/login']);
  }

  protected themeToggleLabel(): string {
    return this.themeService.isDark() ? 'Switch to light theme' : 'Switch to dark theme';
  }

  private updatePageTitle(url: string): void {
    this.pageTitle.set(getNavigationTitleForUrl(url));
  }

  private refreshUserDisplay(): void {
    this.userEmail.set(this.authService.getCurrentUserEmail());
    this.userInitials.set(this.authService.getCurrentUserInitials());
  }
}
