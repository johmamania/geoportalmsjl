import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';
import { SupabaseService } from '../core/supabase.service';
import { firstValueFrom } from 'rxjs';

export const adminGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AdminAuthService);
  const router = inject(Router);
  const supabaseService = inject(SupabaseService);

  try {
    // Verificar sesión de Supabase
    const { data: { session }, error } = await supabaseService.supabase.auth.getSession();
    
    // Verificar si está autenticado en el servicio
    const isAuthenticated = authService.getIsAuthenticated();
    
    // Si hay sesión de Supabase y está autenticado en el servicio
    if (session && isAuthenticated && !error) {
      return true;
    }

    // Si no hay sesión pero hay datos en localStorage, intentar verificar
    if (!session && isAuthenticated) {
      // Verificar si la sesión expiró
      const accessCode = localStorage.getItem('admin_access_code');
      if (accessCode) {
        const isValid = await firstValueFrom(authService.verifyAccessCode(accessCode));
        if (isValid) {
          return true;
        }
      }
    }

    // Redirigir a página 403 (acceso denegado)
    router.navigate(['/403']);
    return false;
  } catch (error) {
    console.error('Error en guard:', error);
    // Redirigir a página 403 (acceso denegado)
    router.navigate(['/403']);
    return false;
  }
};

