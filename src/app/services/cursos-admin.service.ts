import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SupabaseService } from '../core/supabase.service';

export interface Curso {
  id?: number;
  titulo: string;
  descripcion: string;
  duracion: string;
  nivel: string;
  categoria: string;
  certificado: boolean;
  instructor: string;
  fecha_inicio: string;
  imagen?: string;
  precio?: number;
  estado?: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CursosAdminService {
  private readonly TABLE_NAME = 'msjl_cursos';

  constructor(private supabaseService: SupabaseService) { }

  /**
   * Obtiene todos los cursos (para admin)
   */
  getCursos(): Observable<Curso[]> {
    return from(
      this.supabaseService.supabase
        .from(this.TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(`Error al obtener cursos: ${error.message}`);
        }
        return data as Curso[];
      }),
      catchError((error) => {
        console.error('Error al obtener cursos:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene solo los cursos activos (para público)
   */
  getCursosActivos(): Observable<Curso[]> {
    return from(
      this.supabaseService.supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('estado', true)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(`Error al obtener cursos activos: ${error.message}`);
        }
        return data as Curso[];
      }),
      catchError((error) => {
        console.error('Error al obtener cursos activos:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene un curso por ID
   */
  getCursoById(id: number): Observable<Curso> {
    return from(
      this.supabaseService.supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(`Error al obtener curso: ${error.message}`);
        }
        return data as Curso;
      }),
      catchError((error) => {
        console.error('Error al obtener curso:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Crea un nuevo curso
   */
  createCurso(curso: Omit<Curso, 'id' | 'created_at' | 'updated_at'>): Observable<Curso> {
    return from(
      this.supabaseService.supabase
        .from(this.TABLE_NAME)
        .insert([{
          ...curso,
          estado: curso.estado !== undefined ? curso.estado : true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(`Error al crear curso: ${error.message}`);
        }
        return data as Curso;
      }),
      catchError((error) => {
        console.error('Error al crear curso:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Actualiza un curso existente
   */
  updateCurso(id: number, curso: Partial<Curso>): Observable<Curso> {
    return from(
      this.supabaseService.supabase
        .from(this.TABLE_NAME)
        .update({
          ...curso,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(`Error al actualizar curso: ${error.message}`);
        }
        return data as Curso;
      }),
      catchError((error) => {
        console.error('Error al actualizar curso:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Elimina un curso
   */
  deleteCurso(id: number): Observable<void> {
    return from(
      this.supabaseService.supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('id', id)
    ).pipe(
      map(({ error }) => {
        if (error) {
          throw new Error(`Error al eliminar curso: ${error.message}`);
        }
      }),
      catchError((error) => {
        console.error('Error al eliminar curso:', error);
        return throwError(() => error);
      })
    );
  }
}

