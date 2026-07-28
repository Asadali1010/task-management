import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { mockAuthInterceptor } from './core/interceptors/mock-auth.interceptor';
import { mockProjectInterceptor } from './core/interceptors/mock-project.interceptor';
import { ThemeService } from './core/services/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withFetch(), withInterceptors([mockAuthInterceptor, mockProjectInterceptor])),
    provideAppInitializer(() => {
      inject(ThemeService).init();
    }),
  ],
};
