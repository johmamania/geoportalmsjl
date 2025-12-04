import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AdminAuthService);
  const router = inject(Router);

  if (authService.getIsAuthenticated()) {
    return true;
  }

  // Redirigir al login de administración
  router.navigate(['/admin/login']);
  return false;
};

