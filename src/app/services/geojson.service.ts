import { Injectable } from '@angular/core';
import { Observable, from, switchMap, catchError, throwError } from 'rxjs';
import { SupabaseService } from '../core/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class GeojsonService {
  private readonly STORAGE_BUCKET = 'data'; // Nombre del bucket en Supabase Storage
  private readonly STORAGE_FOLDER = 'geojson'; // Carpeta dentro del bucket

  constructor(private supabaseService: SupabaseService) { }

  /**
   * Carga un archivo GeoJSON desde Supabase Storage
   * @param fileName Nombre del archivo (ej: 'sjl_limite.geojson')
   * @returns Observable con el contenido GeoJSON como texto (para mantener compatibilidad con el código actual)
   */
  loadGeojsonFile(fileName: string): Observable<string> {
    // Ruta relativa dentro del bucket (NO URL completa)
    const filePath = `${this.STORAGE_FOLDER}/${fileName}`;

    console.log(`📥 Cargando GeoJSON desde Supabase Storage: bucket=${this.STORAGE_BUCKET}, path=${filePath}`);

    return from(
      this.supabaseService.supabase.storage
        .from(this.STORAGE_BUCKET)
        .download(filePath)
    ).pipe(
      switchMap(async ({ data, error }) => {
        if (error) {
          console.error(`❌ Error al descargar ${fileName} desde Supabase Storage:`, error);
          throw new Error(`Error al cargar ${fileName}: ${error.message}`);
        }

        if (!data) {
          throw new Error(`No se encontró el archivo ${fileName} en Supabase Storage`);
        }

        // Convertir el Blob a texto
        const text = await data.text();
        console.log(`✅ GeoJSON cargado exitosamente desde Supabase Storage: ${fileName}`);
        return text;
      }),
      catchError((error) => {
        console.error(`❌ Error al cargar ${fileName} desde Supabase Storage:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Guarda o actualiza un archivo GeoJSON en Supabase Storage
   * @param fileName Nombre del archivo (ej: 'sjl_limite.geojson')
   * @param geoJsonData Objeto GeoJSON a guardar
   * @returns Observable que se completa cuando el archivo se guarda exitosamente
   */
  saveGeojsonFile(fileName: string, geoJsonData: any): Observable<void> {
    // Ruta relativa dentro del bucket (NO URL completa)
    const filePath = `${this.STORAGE_FOLDER}/${fileName}`;

    // Convertir el objeto GeoJSON a string
    const geojsonString = JSON.stringify(geoJsonData, null, 2);

    // Crear un Blob con el contenido (Supabase Storage requiere Blob o ArrayBuffer)
    const blob = new Blob([geojsonString], { type: 'application/geo+json' });

    console.log(`💾 Guardando GeoJSON en Supabase Storage: bucket=${this.STORAGE_BUCKET}, path=${filePath}`);

    return from(
      this.supabaseService.supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(filePath, blob, {
          upsert: true,
          contentType: 'application/geo+json'
        })
    ).pipe(
      switchMap(async ({ data, error }) => {
        if (error) {
          console.error(`❌ Error al guardar ${fileName} en Supabase Storage:`, error);
          throw new Error(`Error al guardar ${fileName}: ${error.message}`);
        }

        console.log(`✅ GeoJSON guardado exitosamente en Supabase Storage: ${fileName}`);
      }),
      catchError((error) => {
        console.error(`❌ Error al guardar ${fileName} en Supabase Storage:`, error);
        return throwError(() => error);
      })
    );
  }
}

