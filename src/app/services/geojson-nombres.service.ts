import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from '../core/supabase.service';

export interface GeojsonNombre {
  id: string;
  nombre: string;
  archivo: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeojsonNombresService {
  private tableName = 'msjl_geojson_nombres';

  constructor(private supabaseService: SupabaseService) { }

  /**
   * Obtener todos los nombres de GeoJSON
   */
  getNombres(): Observable<GeojsonNombre[]> {
    return from(
      this.supabaseService.supabase
        .from(this.tableName)
        .select('*')
        .order('nombre', { ascending: true })
        .then(response => {
          if (response.error) throw response.error;
          return response.data as GeojsonNombre[];
        })
    );
  }

  /**
   * Obtener un nombre por ID
   */
  getNombreById(id: string): Observable<GeojsonNombre | null> {
    return from(
      this.supabaseService.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single()
        .then(response => {
          if (response.error) {
            if (response.error.code === 'PGRST116') {
              return null; // No encontrado
            }
            throw response.error;
          }
          return response.data as GeojsonNombre;
        })
    );
  }

  /**
   * Obtener un nombre por archivo
   */
  getNombreByArchivo(archivo: string): Observable<GeojsonNombre | null> {
    return from(
      this.supabaseService.supabase
        .from(this.tableName)
        .select('*')
        .eq('archivo', archivo)
        .single()
        .then(response => {
          if (response.error) {
            if (response.error.code === 'PGRST116') {
              return null; // No encontrado
            }
            throw response.error;
          }
          return response.data as GeojsonNombre;
        })
    );
  }

  /**
   * Crear un nuevo nombre
   */
  crearNombre(nombre: string, archivo: string): Observable<GeojsonNombre> {
    return from(
      this.supabaseService.supabase
        .from(this.tableName)
        .insert({
          nombre,
          archivo
        })
        .select()
        .single()
        .then(response => {
          if (response.error) throw response.error;
          return response.data as GeojsonNombre;
        })
    );
  }

  /**
   * Actualizar un nombre existente
   */
  actualizarNombre(id: string, nombre: string, archivo: string): Observable<GeojsonNombre> {
    return from(
      this.supabaseService.supabase
        .from(this.tableName)
        .update({
          nombre,
          archivo,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
        .then(response => {
          if (response.error) throw response.error;
          return response.data as GeojsonNombre;
        })
    );
  }

  /**
   * Actualizar por archivo
   */
  actualizarPorArchivo(archivo: string, nombre: string): Observable<GeojsonNombre> {
    return from(
      this.supabaseService.supabase
        .from(this.tableName)
        .update({
          nombre,
          updated_at: new Date().toISOString()
        })
        .eq('archivo', archivo)
        .select()
        .single()
        .then(response => {
          if (response.error) throw response.error;
          return response.data as GeojsonNombre;
        })
    );
  }

  /**
   * Eliminar un nombre
   */
  eliminarNombre(id: string): Observable<void> {
    return from(
      this.supabaseService.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)
        .then(response => {
          if (response.error) throw response.error;
          return;
        })
    );
  }
}

