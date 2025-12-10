import { Injectable, signal } from '@angular/core';
import { SupabaseService } from '../core/supabase.service';
import { Observable, from, map, catchError, throwError, of, switchMap } from 'rxjs';
import { AdminLoginRequest, AdminLoginResponse, AdminUser } from '../model/admin-auth';
import { Session, AuthError } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {
  // Signal para el estado de autenticación
  isAuthenticated = signal<boolean>(false);
  currentUser = signal<AdminUser | null>(null);
  accessCode = signal<string | null>(null);
  session = signal<Session | null>(null);

  constructor(private supabaseService: SupabaseService) {
    // Verificar si hay sesión guardada
    this.checkStoredSession();

    // Escuchar cambios en la autenticación
    this.supabaseService.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this.session.set(session);
        this.loadAdminUser(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        this.session.set(null);
        this.isAuthenticated.set(false);
        this.currentUser.set(null);
        this.accessCode.set(null);
      }
    });

    // Referencia explícita al método login para evitar que sea eliminado por tree-shaking
    // Esto asegura que el método esté disponible en producción
    if (typeof this.login === 'function') {
      // El método existe, esto previene que sea eliminado
      (this as any).__loginMethod = this.login;
    }
  }

  /**
   * Autentica un usuario administrador usando Supabase Auth
   * @param credentials - Credenciales de login (username y password)
   * @returns Observable con la respuesta de autenticación
   *
   * IMPORTANTE: Este método debe mantenerse público y no ser eliminado por tree-shaking
   */
  public login(credentials: AdminLoginRequest): Observable<AdminLoginResponse> {
    // Validar credenciales
    if (!credentials || !credentials.username || !credentials.password) {
      return throwError(() => ({
        success: false,
        message: 'Credenciales inválidas'
      }));
    }

    // Primero autenticar con Supabase Auth
    // Asumimos que el username es el email o podemos buscar el email del usuario
    return from(
      this.supabaseService.supabase.auth.signInWithPassword({
        email: credentials.username, // O buscar email por username
        password: credentials.password
      })
    ).pipe(
      switchMap(async (response) => {
        if (response.error) {
          return {
            success: false,
            message: response.error.message || 'Error en la autenticación'
          } as AdminLoginResponse;
        }

        if (!response.data.session || !response.data.user) {
          return {
            success: false,
            message: 'No se pudo crear la sesión'
          } as AdminLoginResponse;
        }

        // Verificar si el usuario es administrador
        const adminUser = await this.getAdminUserByUserId(response.data.user.id);

        if (!adminUser) {
          // Si no es admin, cerrar sesión
          await this.supabaseService.supabase.auth.signOut();
          return {
            success: false,
            message: 'Usuario no autorizado como administrador'
          } as AdminLoginResponse;
        }

        if (!adminUser.is_active) {
          await this.supabaseService.supabase.auth.signOut();
          return {
            success: false,
            message: 'Usuario inactivo'
          } as AdminLoginResponse;
        }

        // Generar o obtener código de acceso
        if (!adminUser.access_code) {
          const newCode = this.generateAccessCode();
          await this.updateAccessCode(adminUser.id, newCode);
          adminUser.access_code = newCode;
        }

        // Guardar sesión
        this.session.set(response.data.session);
        this.setSession(adminUser);

        return {
          success: true,
          access_code: adminUser.access_code,
          user_id: adminUser.id,
          message: 'Autenticación exitosa'
        } as AdminLoginResponse;
      }),
      catchError((error: AuthError) => {
        console.error('Error en autenticación:', error);
        return throwError(() => ({
          success: false,
          message: error.message || 'Error al autenticar usuario'
        }));
      })
    );
  }

  /**
   * Obtiene el usuario admin por user_id de Supabase Auth o por email/username
   */
  private async getAdminUserByUserId(userId: string): Promise<AdminUser | null> {
    // Primero intentar obtener el email del usuario autenticado
    const { data: userData } = await this.supabaseService.supabase.auth.getUser();
    const userEmail = userData?.user?.email;

    if (!userEmail) {
      return null;
    }

    // Buscar admin_user por username (que debería ser el email) o por user_id si existe
    let query = this.supabaseService.supabase
      .from('admin_users')
      .select('*')
      .eq('username', userEmail);

    // Si existe la columna user_id, también buscar por ella
    const { data, error } = await query.single();

    if (error || !data) {
      // Si no se encuentra por username, intentar por user_id si existe la columna
      if (userId) {
        const { data: userByIdData } = await this.supabaseService.supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (userByIdData && !userByIdData.error) {
          return userByIdData as AdminUser;
        }
      }
      return null;
    }

    return data as AdminUser;
  }

  /**
   * Verifica el código de acceso
   */
  verifyAccessCode(code: string): Observable<boolean> {
    return from(
      this.supabaseService.supabase
        .from('admin_users')
        .select('*')
        .eq('access_code', code)
        .eq('is_active', true)
        .single()
    ).pipe(
      map(response => {
        if (response.error || !response.data) {
          return false;
        }

        const user = response.data as AdminUser;
        this.setSession(user);
        return true;
      }),
      catchError(() => of(false))
    );
  }

  /**
   * Actualiza el código de acceso de un usuario
   */
  private async updateAccessCode(userId: string, code: string): Promise<void> {
    await this.supabaseService.supabase
      .from('admin_users')
      .update({ access_code: code })
      .eq('id', userId);
  }

  /**
   * Genera un código de acceso único
   */
  private generateAccessCode(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${year}$${random}`;
  }

  /**
   * Establece la sesión del usuario
   */
  private setSession(user: AdminUser): void {
    this.isAuthenticated.set(true);
    this.currentUser.set(user);
    this.accessCode.set(user.access_code);

    // Guardar en localStorage
    localStorage.setItem('admin_user_id', user.id);
    localStorage.setItem('admin_access_code', user.access_code || '');
    localStorage.setItem('admin_username', user.username);
  }

  /**
   * Verifica si hay una sesión guardada
   */
  private async checkStoredSession(): Promise<void> {
    // Verificar sesión de Supabase Auth
    const { data: { session } } = await this.supabaseService.supabase.auth.getSession();

    if (session) {
      this.session.set(session);
      const adminUser = await this.getAdminUserByUserId(session.user.id);

      if (adminUser && adminUser.is_active) {
        this.setSession(adminUser);
      } else {
        this.logout();
      }
    } else {
      // Fallback: verificar localStorage antiguo
      const accessCode = localStorage.getItem('admin_access_code');
      if (accessCode) {
        this.verifyAccessCode(accessCode).subscribe(isValid => {
          if (!isValid) {
            this.logout();
          }
        });
      }
    }
  }

  /**
   * Carga el usuario admin después de autenticación
   */
  private async loadAdminUser(userId: string): Promise<void> {
    const adminUser = await this.getAdminUserByUserId(userId);
    if (adminUser && adminUser.is_active) {
      this.setSession(adminUser);
    }
  }

  /**
   * Cierra la sesión
   */
  async logout(): Promise<void> {
    // Cerrar sesión en Supabase
    await this.supabaseService.supabase.auth.signOut();

    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.accessCode.set(null);
    this.session.set(null);

    localStorage.removeItem('admin_user_id');
    localStorage.removeItem('admin_access_code');
    localStorage.removeItem('admin_username');
  }

  /**
   * Verifica si el usuario está autenticado
   */
  getIsAuthenticated(): boolean {
    return this.isAuthenticated();
  }
}

