import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth-service';


// Helper to wait for auth initialization
const waitForAuth = (authService: AuthService): Promise<void> => {
  return new Promise((resolve) => {
    if (authService.isInitialized()) {
      resolve();
      return;
    }
    
    // Poll until initialized
    const interval = setInterval(() => {
      if (authService.isInitialized()) {
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

    router.navigate(['/auth/login']);
    return false;
  };
};