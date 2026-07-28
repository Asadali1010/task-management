import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { NAVIGATION_ITEMS } from '../navigation.config';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  readonly isOpen = input(false);
  readonly isMobile = input(false);

  readonly navClosed = output<void>();

  protected readonly navigationItems = NAVIGATION_ITEMS;

  protected onNavigate(): void {
    if (this.isMobile()) {
      this.navClosed.emit();
    }
  }

  protected onBackdropClick(): void {
    this.navClosed.emit();
  }
}
