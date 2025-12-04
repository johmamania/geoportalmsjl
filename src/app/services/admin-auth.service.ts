import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AdminLoginRequest, AdminLoginResponse, AdminUser } from '../model/admin-auth';

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {
  private supabaseUrl = environment.supabase.url;
  private supabaseKey = environment.supabase.anonKey;
  private headers = new HttpHeaders({
    'apikey': this.supabaseKey,
    'Authorization': `Bearer ${this.supabaseKey}`,
    'Content-Type': 'application/json'
  });

  // Signal para el estado de autenticación
  isAuthenticated = signal<boolean>(false);
  currentUser = signal<AdminUser | null>(null);
  accessCode = signal<string | null>(null);

  constructor(private http: HttpClient) {
    // Verificar si hay sesión guardada
    this.checkStoredSession();
  }

  /**
   * Autentica un usuario administrador
   */
  login(credentials: AdminLoginRequest): Observable<AdminLoginResponse> {
    const url = `${this.supabaseUrl}/rest/v1/admin_users?username=eq.${credentials.username}&select=*`;
    
    return this.http.get<AdminUser[]>(url, { headers: this.headers }).pipe(
      map(users => {
        if (users.length === 0) {
          return {
            success: false,
            message: 'Usuario no encontrado'
          };
        }

        const user = users[0];
        
        // Verificar si el usuario está activo
        if (!user.is_active) {
          return {
            success: false,
            message: 'Usuario inactivo'
          };
        }

        // En producción, deberías verificar el hash de la contraseña
        // Por ahora, comparamos directamente (esto debe cambiarse en producción)
        // const isValidPassword = bcrypt.compareSync(credentials.password, user.password_hash);
        
        // Para desarrollo, puedes usar una comparación simple
        // En producción, usa bcrypt.compareSync()
        const isValidPassword = true; // Temporal - debe implementarse con bcrypt

        if (!isValidPassword) {
          return {
            success: false,
            message: 'Contraseña incorrecta'
          };
        }

        // Generar o obtener código de acceso
        if (!user.access_code) {
          // Si no tiene código, generar uno nuevo
          const newCode = this.generateAccessCode();
          this.updateAccessCode(user.id, newCode).subscribe();
          user.access_code = newCode;
        }

        // Guardar sesión
        this.setSession(user);

        return {
          success: true,
          access_code: user.access_code,
          user_id: user.id,
          message: 'Autenticación exitosa'
        };
      }),
      catchError(error => {
        console.error('Error en autenticación:', error);
        return throwError(() => ({
          success: false,
          message: 'Error al autenticar usuario'
        }));
      })
    );
  }

  /**
   * Verifica el código de acceso
   */
  verifyAccessCode(code: string): Observable<boolean> {
    const url = `${this.supabaseUrl}/rest/v1/admin_users?access_code=eq.${code}&select=*`;
    
    return this.http.get<AdminUser[]>(url, { headers: this.headers }).pipe(
      map(users => {
        if (users.length > 0 && users[0].is_active) {
          this.setSession(users[0]);
          return true;
        }
        return false;
      }),
      catchError(() => of(false))
    );
  }

  /**
   * Actualiza el código de acceso de un usuario
   */
  private updateAccessCode(userId: string, code: string): Observable<void> {
    const url = `${this.supabaseUrl}/rest/v1/admin_users?id=eq.${userId}`;
    return this.http.patch<void>(url, { access_code: code }, { headers: this.headers });
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
  private checkStoredSession(): void {
    const userId = localStorage.getItem('admin_user_id');
    const accessCode = localStorage.getItem('admin_access_code');
    const username = localStorage.getItem('admin_username');

    if (userId && accessCode && username) {
      // Verificar que el código sigue siendo válido
      this.verifyAccessCode(accessCode).subscribe(isValid => {
        if (!isValid) {
          this.logout();
        }
      });
    }
  }

  /**
   * Cierra la sesión
   */
  logout(): void {
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.accessCode.set(null);
    
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

