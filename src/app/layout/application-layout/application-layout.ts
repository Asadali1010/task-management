import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { fromEvent } from 'rxjs';

import { Sidebar } from '../sidebar/sidebar';
import { TopHeader } from '../top-header/top-header';

const MOBILE_BREAKPOINT_PX = 768;

@Component({
  selector: 'app-application-layout',
  imports: [TopHeader, Sidebar, RouterOutlet],
  templateUrl: './application-layout.html',
  styleUrl: './application-layout.css',
})
export class ApplicationLayout implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly sidebarOpen = signal(false);
  protected readonly isMobile = signal(false);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.updateViewportMode();

    fromEvent(window, 'resize')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateViewportMode());
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  private updateViewportMode(): void {
    const mobile = window.innerWidth < MOBILE_BREAKPOINT_PX;
    this.isMobile.set(mobile);

    if (!mobile) {
      this.sidebarOpen.set(false);
    }
  }
}
