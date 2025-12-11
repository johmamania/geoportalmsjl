import { Injectable } from '@angular/core';
import { Observable, from, catchError, map, of } from 'rxjs';
import { SupabaseService } from '../core/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class EstadisticasService {
  private readonly STORAGE_PREFIX = 'visita_registrada_';

  constructor(private supabaseService: SupabaseService) { }

  /**
   * Obtiene la clave de localStorage para un contador específico
   * Incluye la fecha del día para que cada dispositivo cuente solo una vez por día
   */
  private getStorageKey(nombre: string): string {
    const hoy = new Date().toISOString().split('T')[0]; // Formato: YYYY-MM-DD
    return `${this.STORAGE_PREFIX}${nombre}_${hoy}`;
  }

  /**
   * Verifica si ya se registró una visita para este contador en el día actual
   */
  private yaRegistrado(nombre: string): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false; // Si no hay localStorage disponible, permitir el registro
    }
    const key = this.getStorageKey(nombre);
    return localStorage.getItem(key) === 'true';
  }

  /**
   * Marca que se registró una visita para este contador en el día actual
   */
  private marcarRegistrado(nombre: string): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return; // Si no hay localStorage disponible, no hacer nada
    }
    const key = this.getStorageKey(nombre);
    localStorage.setItem(key, 'true');
  }

  /**
   * Incrementa el contador de visitas al sistema
   * Solo cuenta una vez por dispositivo por día
   * @returns Observable que se completa cuando la operación termina
   */
  incrementarVisitasSistema(): Observable<void> {
    // Verificar si ya se registró hoy en este dispositivo
    if (this.yaRegistrado('visitas_sistema')) {
      console.log('ℹ️ Visita al sistema ya registrada hoy en este dispositivo');
      return of(void 0); // Retornar observable vacío sin hacer nada
    }

    // Marcar como registrado antes de hacer la llamada
    this.marcarRegistrado('visitas_sistema');

    return this.incrementarContador('visitas_sistema');
  }

  /**
   * Incrementa el contador de visitas a los mapas
   * Solo cuenta una vez por dispositivo por día
   * @returns Observable que se completa cuando la operación termina
   */
  incrementarVisitasMapas(): Observable<void> {
    // Verificar si ya se registró hoy en este dispositivo
    if (this.yaRegistrado('visitas_mapas')) {
      console.log('ℹ️ Visita a mapas ya registrada hoy en este dispositivo');
      return of(void 0); // Retornar observable vacío sin hacer nada
    }

    // Marcar como registrado antes de hacer la llamada
    this.marcarRegistrado('visitas_mapas');

    return this.incrementarContador('visitas_mapas');
  }

  /**
   * Incrementa un contador específico llamando a la función RPC de Supabase
   * @param nombre Nombre del contador a incrementar ('visitas_sistema' o 'visitas_mapas')
   * @returns Observable que se completa cuando la operación termina
   */
  private incrementarContador(nombre: string): Observable<void> {
    return from(
      this.supabaseService.supabase.rpc('incrementar_contador', {
        nombre_input: nombre
      })
    ).pipe(
      map(({ error }) => {
        if (error) {
          console.error(`❌ Error al incrementar contador '${nombre}':`, error);
          throw error;
        }
        console.log(`✅ Contador '${nombre}' incrementado correctamente`);
      }),
      catchError(error => {
        console.error(`❌ Error al incrementar contador '${nombre}':`, error);
        throw error;
      })
    );
  }

  /**
   * Obtiene las estadísticas actuales desde la tabla estadisticas
   * @returns Observable con las estadísticas
   */
  obtenerEstadisticas(): Observable<any[]> {
    return from(
      this.supabaseService.supabase
        .from('estadisticas')
        .select('*')
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('❌ Error al obtener estadísticas:', error);
          throw error;
        }
        return data || [];
      }),
      catchError(error => {
        console.error('❌ Error al obtener estadísticas:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene el valor de un contador específico
   * @param nombre Nombre del contador ('visitas_sistema' o 'visitas_mapas')
   * @returns Observable con el valor del contador
   */
  obtenerContador(nombre: string): Observable<number> {
    return from(
      this.supabaseService.supabase
        .from('estadisticas')
        .select('contador')
        .eq('nombre', nombre)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error(`❌ Error al obtener contador '${nombre}':`, error);
          throw error;
        }
        return data?.contador || 0;
      }),
      catchError(error => {
        console.error(`❌ Error al obtener contador '${nombre}':`, error);
        throw error;
      })
    );
  }
}

