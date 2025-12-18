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
   * @param file Archivo original (opcional, mejora la compatibilidad)
   * @returns Observable que se completa cuando el archivo se guarda exitosamente
   */
  saveGeojsonFile(fileName: string, geoJsonData: any, file?: File): Observable<void> {
    // Ruta relativa dentro del bucket (NO URL completa)
    const filePath = `${this.STORAGE_FOLDER}/${fileName}`;

    console.log(`💾 Guardando GeoJSON en Supabase Storage: bucket=${this.STORAGE_BUCKET}, path=${filePath}`);

    // Verificar sesión antes de subir
    return from(
      this.supabaseService.supabase.auth.getSession()
    ).pipe(
      switchMap(({ data: sessionData, error: sessionError }) => {
        if (sessionError) {
          console.warn('⚠️ Error al verificar sesión:', sessionError);
        }

        if (!sessionData?.session) {
          console.warn('⚠️ No hay sesión activa. El error 403 puede ocurrir si las políticas RLS requieren autenticación.');
          console.warn('⚠️ Asegúrate de iniciar sesión como administrador o configurar políticas RLS para acceso anónimo.');
        } else {
          console.log('✅ Sesión activa encontrada');
        }

        // Preparar el archivo a subir
        let fileToUpload: File;

        if (file) {
          console.log(`📁 Usando archivo original: ${file.name} (${file.size} bytes)`);
          fileToUpload = file;
        } else {
          // Si no hay File, crear uno desde el objeto GeoJSON
          const geojsonString = JSON.stringify(geoJsonData, null, 2);
          const blob = new Blob([geojsonString], { type: 'application/json' });
          fileToUpload = new File([blob], fileName, {
            type: 'application/json',
            lastModified: Date.now()
          });
          console.log(`📦 Tamaño del archivo: ${fileToUpload.size} bytes`);
        }

        // Subir el archivo
        return from(
          this.supabaseService.supabase.storage
            .from(this.STORAGE_BUCKET)
            .upload(filePath, fileToUpload, {
              upsert: true,
              contentType: fileToUpload.type || 'application/json',
              cacheControl: '3600'
            })
        ).pipe(
          switchMap(async ({ data, error }) => {
            if (error) {
              throw this.createUploadError(error, fileName);
            }

            console.log(`✅ GeoJSON guardado exitosamente en Supabase Storage: ${fileName}`);
            if (data) {
              console.log(`   Ruta: ${data.path}`);
            }
          })
        );
      }),
      catchError((error) => {
        console.error(`❌ Error al guardar ${fileName} en Supabase Storage:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Crea un error detallado para errores de subida
   */
  private createUploadError(error: any, fileName: string): Error {
    console.error(`❌ Error al guardar ${fileName} en Supabase Storage:`, error);
    console.error(`   Mensaje: ${error.message}`);
    console.error(`   Error completo:`, JSON.stringify(error, null, 2));

    // El error de Supabase Storage puede tener diferentes propiedades
    const errorDetails = error as any;
    let statusCode: string | number | undefined;
    if (errorDetails.statusCode) {
      statusCode = errorDetails.statusCode;
      console.error(`   Código de error: ${statusCode}`);
    } else if (errorDetails.status) {
      statusCode = errorDetails.status;
      console.error(`   Código de error: ${statusCode}`);
    } else if (errorDetails.code) {
      statusCode = errorDetails.code;
      console.error(`   Código de error: ${statusCode}`);
    }

    // Proporcionar mensaje de error más detallado
    let errorMessage = `Error al guardar ${fileName}: ${error.message}`;

    if (statusCode === 403 || statusCode === '403' || error.message?.includes('403') || error.message?.includes('row-level security')) {
      errorMessage += '\n\n⚠️ Error 403: Política RLS bloqueando la operación\n';
      errorMessage += 'Posibles soluciones:\n';
      errorMessage += '1. Inicia sesión como administrador\n';
      errorMessage += '2. Configura políticas RLS en Supabase Storage para permitir INSERT/UPDATE\n';
      errorMessage += '3. Verifica que el bucket "data" tenga las políticas correctas\n';
      errorMessage += '\nConsulta el archivo SOLUCION_ERROR_403_RLS.md para más detalles.';
    } else if (statusCode === 400 || statusCode === '400' || error.message?.includes('400')) {
      errorMessage += '\n\nPosibles causas:\n';
      errorMessage += '- El bucket no tiene permisos de escritura\n';
      errorMessage += '- El formato del archivo no es válido\n';
      errorMessage += '- Falta autenticación adecuada\n';
      errorMessage += '- Verifica que el bucket "data" exista y tenga políticas de acceso correctas';
    }

    return new Error(errorMessage);
  }
}
