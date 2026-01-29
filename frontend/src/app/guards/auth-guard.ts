import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth-service';

const waitForAuth = (authService: AuthService, timeout = 5000): Promise<void> => {
  return new Promise((resolve) => {
    if (authService.isInitialized()) {
      resolve();
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      if (authService.isInitialized() || Date.now() - startTime > timeout) {
        clearInterval(interval);
        resolve();
      }
    }, 50);
  });
};

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await waitForAuth(authService);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return async () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    await waitForAuth(authService);

    const user = authService.currentUser();

    if (!user) {
      router.navigate(['/auth/login']);
      return false;
    }

    if (allowedRoles.includes(user.role)) {
      return true;
    }

    // User is logged in but wrong role - redirect to their proper dashboard
    switch (user.role) {
      case 'administrator':
        router.navigate(['/admin']);
        break;
      case 'manager':
        router.navigate(['/manager']);
        break;
      case 'assistant':
        router.navigate(['/assistant']);
        break;
      case 'intervenant':
        router.navigate(['/intervenant']);
        break;
      case 'director':
        router.navigate(['/director']);
        break;
      default:
        router.navigate(['/auth/login']);
    }
    return false;
  };
};