# Solución para Error 403: "new row violates row-level security policy"

## Problema
Error 403 "Unauthorized" con mensaje "new row violates row-level security policy" al intentar subir archivos GeoJSON a Supabase Storage.

## Causa
Las políticas de Row Level Security (RLS) en Supabase Storage están bloqueando la operación porque:
1. El usuario no está autenticado, O
2. Las políticas RLS no permiten la operación para usuarios autenticados/anónimos

## Soluciones

### Opción 1: Configurar Políticas RLS para Usuarios Autenticados (Recomendado)

Si el usuario debe estar autenticado para subir archivos:

1. Ve a **Supabase Dashboard** > **Storage** > **Policies**
2. Selecciona el bucket `data`
3. Crea las siguientes políticas:

#### Política para INSERT (Subir archivos):

```sql
-- Permitir a usuarios autenticados subir archivos en la carpeta geojson
CREATE POLICY "Permitir subir archivos GeoJSON a usuarios autenticados"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'data' AND
  (storage.foldername(name))[1] = 'geojson'
);
```

#### Política para UPDATE (Reemplazar archivos):

```sql
-- Permitir a usuarios autenticados actualizar archivos en la carpeta geojson
CREATE POLICY "Permitir actualizar archivos GeoJSON a usuarios autenticados"
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
```

#### Política para SELECT (Leer archivos):

```sql
-- Permitir a usuarios autenticados leer archivos en la carpeta geojson
CREATE POLICY "Permitir leer archivos GeoJSON a usuarios autenticados"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'data' AND
  (storage.foldername(name))[1] = 'geojson'
);
```

### Opción 2: Configurar Políticas RLS para Acceso Anónimo (Menos Seguro)

Si necesitas permitir subir archivos sin autenticación (NO recomendado para producción):

```sql
-- Permitir a usuarios anónimos subir archivos
CREATE POLICY "Permitir subir archivos GeoJSON anónimamente"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'data' AND
  (storage.foldername(name))[1] = 'geojson'
);

-- Permitir a usuarios anónimos actualizar archivos
CREATE POLICY "Permitir actualizar archivos GeoJSON anónimamente"
ON storage.objects
FOR UPDATE
TO anon
USING (
  bucket_id = 'data' AND
  (storage.foldername(name))[1] = 'geojson'
)
WITH CHECK (
  bucket_id = 'data' AND
  (storage.foldername(name))[1] = 'geojson'
);
```

### Opción 3: Deshabilitar RLS (NO Recomendado)

**⚠️ ADVERTENCIA: Esto desactiva todas las políticas de seguridad. Solo para desarrollo/testing.**

```sql
-- Deshabilitar RLS en storage.objects (NO recomendado para producción)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

## Verificar Autenticación en el Código

Asegúrate de que el usuario esté autenticado antes de subir archivos:

1. El usuario debe iniciar sesión usando `AdminAuthService.login()`
2. Verifica que la sesión esté activa antes de subir:
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   if (!session) {
     // Redirigir al login o mostrar error
   }
   ```

## Pasos para Implementar

1. **Verifica que el usuario esté autenticado:**
   - Asegúrate de que el usuario haya iniciado sesión en el panel de administración
   - Verifica que la sesión de Supabase Auth esté activa

2. **Configura las políticas RLS:**
   - Ve a Supabase Dashboard > Storage > Policies
   - Crea las políticas según la Opción 1 (usuarios autenticados)

3. **Prueba la subida de archivos:**
   - Inicia sesión como administrador
   - Intenta subir un archivo GeoJSON
   - Verifica que no aparezca el error 403

## Notas Importantes

- **Seguridad**: Siempre usa políticas RLS para usuarios autenticados en producción
- **Permisos**: Las políticas deben coincidir con el rol del usuario (authenticated, anon, etc.)
- **Bucket**: Asegúrate de que el bucket `data` exista y esté configurado correctamente
- **Carpeta**: Las políticas verifican que el archivo esté en la carpeta `geojson`

## Verificación

Después de configurar las políticas, verifica:

1. El usuario puede iniciar sesión correctamente
2. La sesión de Supabase Auth está activa
3. Las políticas RLS están creadas y activas
4. El bucket `data` existe y tiene la carpeta `geojson`
5. Los archivos se pueden subir sin error 403

