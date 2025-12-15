import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SupabaseService } from '../core/supabase.service';

export interface Publicacion {
  id?: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  categoria: string;
  autor: string;
  imagenruta?: string;
  //contenido?: string;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PublicacionesService {
  private readonly TABLE_NAME = 'msjl_publicaciones';

  constructor(private supabaseService: SupabaseService) { }

  /**
   * Obtiene todas las publicaciones
   */
  getPublicaciones(): Observable<Publicacion[]> {
    return from(
      this.supabaseService.supabase
        .from(this.TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(`Error al obtener publicaciones: ${error.message}`);
        }
        return data as Publicacion[];
      }),
      catchError((error) => {
        console.error('Error al obtener publicaciones:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene una publicación por ID
   */
  getPublicacionById(id: number): Observable<Publicacion> {
    return from(
      this.supabaseService.supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(`Error al obtener publicación: ${error.message}`);
        }
        return data as Publicacion;
      }),
      catchError((error) => {
        console.error('Error al obtener publicación:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Crea una nueva publicación
   */
  createPublicacion(publicacion: Omit<Publicacion, 'id' | 'created_at' | 'updated_at'>): Observable<Publicacion> {
    return from(
      this.supabaseService.supabase
        .from(this.TABLE_NAME)
        .insert([{
          ...publicacion,
          activo: publicacion.activo !== undefined ? publicacion.activo : true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(`Error al crear publicación: ${error.message}`);
        }
        return data as Publicacion;
      }),
      catchError((error) => {
        console.error('Error al crear publicación:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Actualiza una publicación existente
   */
  updatePublicacion(id: number, publicacion: Partial<Publicacion>): Observable<Publicacion> {
    return from(
      this.supabaseService.supabase
        .from(this.TABLE_NAME)
        .update({
          ...publicacion,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(`Error al actualizar publicación: ${error.message}`);
        }
        return data as Publicacion;
      }),
      catchError((error) => {
        console.error('Error al actualizar publicación:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Elimina una publicación
   */
  deletePublicacion(id: number): Observable<void> {
    return from(
      this.supabaseService.supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('id', id)
    ).pipe(
      map(({ error }) => {
        if (error) {
          throw new Error(`Error al eliminar publicación: ${error.message}`);
        }
      }),
      catchError((error) => {
        console.error('Error al eliminar publicación:', error);
        return throwError(() => error);
      })
    );
  }
}

