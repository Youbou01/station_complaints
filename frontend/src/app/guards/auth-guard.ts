import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth-service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const user = authService.currentUser();

    if (!user) {
      router.navigate(['/auth/login']);
      return false;
    }

    if (allowedRoles.includes(user.role)) {
      return true;
    }

    // Redirect to proper dashboard based on role
    const roleRoutes: Record<string, string> = {
      'administrator': '/admin',
      'manager': '/manager',
      'assistant': '/assistant',
      'intervenant': '/intervenant',
      'director': '/director'
    };

    router.navigate([roleRoutes[user.role] || '/auth/login']);
    return false;
  };
};