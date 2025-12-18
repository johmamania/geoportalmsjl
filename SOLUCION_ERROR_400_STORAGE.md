# Solución para Error 400 al Guardar Archivos en Supabase Storage

## Problema
Error 400 Bad Request al intentar guardar archivos GeoJSON en Supabase Storage.

## Posibles Causas y Soluciones

### 1. Permisos del Bucket

El bucket `data` en Supabase Storage debe tener las políticas de acceso correctas.

#### Verificar y Configurar Permisos:

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **Storage** > **Policies**
3. Selecciona el bucket `data`
4. Asegúrate de tener políticas que permitan:
   - **INSERT** (para subir archivos)
   - **UPDATE** (para reemplazar archivos)
   - **SELECT** (para leer archivos)

#### Política Recomendada para el Bucket `data`:

```sql
-- Política para permitir INSERT (subir archivos)
CREATE POLICY "Permitir subir archivos GeoJSON"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'data' AND
  (storage.foldername(name))[1] = 'geojson'
);

-- Política para permitir UPDATE (reemplazar archivos)
CREATE POLICY "Permitir actualizar archivos GeoJSON"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'data' AND
  (storage.foldername(name))[1] = 'geojson'
)
WITH CHECK (
  bucket_id = 'data' AND
  (storage.foldername(name))[1] = 'geojson'
);

-- Política para permitir SELECT (leer archivos)
CREATE POLICY "Permitir leer archivos GeoJSON"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'data' AND
  (storage.foldername(name))[1] = 'geojson'
);
```

### 2. Verificar que el Bucket Exista

1. Ve a **Storage** > **Buckets**
2. Verifica que el bucket `data` exista
3. Si no existe, créalo:
   - Nombre: `data`
   - Público: Puede ser `false` (privado) si usas autenticación
   - File size limit: Ajusta según tus necesidades
   - Allowed MIME types: `application/json`, `application/geo+json`

### 3. Verificar Autenticación

Asegúrate de que el usuario esté autenticado cuando intenta subir archivos:

- Si usas autenticación, verifica que el token de sesión sea válido
- Si no usas autenticación, las políticas deben permitir acceso anónimo

### 4. Verificar el Formato del Archivo

El código ahora:
- Usa el archivo original cuando está disponible (mejor compatibilidad)
- Crea un File desde Blob si no hay archivo original
- Usa `application/json` como contentType

### 5. Verificar la Ruta del Archivo

La ruta debe ser relativa dentro del bucket:
- ✅ Correcto: `geojson/abastecimiento_agua.geojson`
- ❌ Incorrecto: `data/geojson/abastecimiento_agua.geojson` (no incluir el nombre del bucket)

## Cambios Realizados en el Código

1. **Mejora en `saveGeojsonFile`**:
   - Ahora acepta un parámetro opcional `file` para usar el archivo original
   - Si no hay archivo, crea un `File` desde el `Blob` para mejor compatibilidad
   - Mejor manejo de errores con mensajes más descriptivos

2. **Actualización en `SubirGeojsonComponent`**:
   - Pasa el archivo original al método `saveGeojsonFile`
   - Esto mejora la compatibilidad con Supabase Storage

## Próximos Pasos

1. Verifica los permisos del bucket en Supabase Dashboard
2. Asegúrate de que el bucket `data` exista
3. Configura las políticas de acceso según tus necesidades
4. Prueba subir un archivo nuevamente

## Logs de Depuración

El código ahora incluye logs detallados:
- Tamaño del archivo
- Ruta donde se guarda
- Código de error si falla
- Mensaje de error detallado

Revisa la consola del navegador para ver estos logs y diagnosticar el problema.

