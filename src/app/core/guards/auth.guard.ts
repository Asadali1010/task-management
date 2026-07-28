import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';

import { AuthService } from '../services/auth.service';

function resolveAuthRedirect(): boolean | UrlTree {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getStoredToken()) {
    return true;
  }

  return router.createUrlTree(['/login']);
}

export const authGuard: CanActivateFn = () => resolveAuthRedirect();

export const authGuardChild: CanActivateChildFn = () => resolveAuthRedirect();
