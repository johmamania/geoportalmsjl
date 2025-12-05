# 📋 Instrucciones para Configurar Supabase

## 🚀 Paso 1: Ejecutar el Script SQL

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido completo de `supabase-schema-updated.sql`
5. Ejecuta el script (botón "Run")

## 👤 Paso 2: Crear Usuario Administrador en Supabase Auth

### Opción A: Desde el Dashboard

1. Ve a **Authentication** > **Users**
2. Click en **"Add User"** o **"Invite User"**
3. Completa:
   - **Email**: `admin@example.com` (o el que prefieras)
   - **Password**: Crea una contraseña segura
   - **Auto Confirm User**: ✅ Activar (para desarrollo)
4. Click en **"Create User"**
5. **IMPORTANTE**: Copia el **User ID** que se genera (es un UUID)

### Opción B: Desde SQL (si prefieres)

```sql
-- Esto creará el usuario en auth.users
-- Nota: Necesitas permisos de superusuario o usar la función de Supabase
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('tu_contraseña_segura', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);
```

## 🔗 Paso 3: Vincular Usuario Auth con admin_users

Después de crear el usuario en Auth, ejecuta este SQL:

```sql
-- Reemplaza estos valores:
-- 1. 'USER_ID_AQUI' → El UUID del usuario creado en Auth (Paso 2)
-- 2. 'admin@example.com' → El email que usaste en Auth

INSERT INTO admin_users (user_id, username, is_active, access_code)
VALUES (
  'USER_ID_AQUI',              -- ⚠️ REEMPLAZA CON EL UUID DE AUTH
  'admin@example.com',          -- ⚠️ REEMPLAZA CON EL EMAIL DE AUTH
  true,
  generate_access_code()        -- Genera código automáticamente
);
```

### Ejemplo Real:

```sql
INSERT INTO admin_users (user_id, username, is_active, access_code)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  -- UUID de ejemplo
  'admin@ejemplo.com',
  true,
  generate_access_code()
);
```

## ✅ Paso 4: Verificar la Configuración

Ejecuta esta query para verificar que todo esté correcto:

```sql
SELECT 
  au.id,
  au.user_id,
  au.username,
  au.is_active,
  au.access_code,
  au.created_at,
  u.email as auth_email,
  u.id as auth_user_id
FROM admin_users au
LEFT JOIN auth.users u ON au.user_id = u.id
WHERE au.is_active = true;
```

Deberías ver:
- ✅ `user_id` no es NULL
- ✅ `username` coincide con `auth_email`
- ✅ `is_active` es `true`
- ✅ `access_code` tiene un valor (ej: `2025$1234`)

## 🔐 Paso 5: Probar el Login

1. Ve a tu aplicación Angular
2. Navega a `/admin/login`
3. Ingresa:
   - **Username**: El email que usaste (ej: `admin@example.com`)
   - **Password**: La contraseña que configuraste
4. Deberías recibir un código de acceso
5. Ingresa el código
6. Deberías ser redirigido a `/admin/admin-map`

## 🛠️ Solución de Problemas

### Error: "Usuario no autorizado como administrador"

**Causa**: El usuario no existe en `admin_users` o `user_id` no coincide.

**Solución**:
```sql
-- Verificar si el usuario existe
SELECT * FROM admin_users WHERE username = 'tu_email@ejemplo.com';

-- Si no existe, crear el registro
INSERT INTO admin_users (user_id, username, is_active, access_code)
SELECT 
  u.id,
  u.email,
  true,
  generate_access_code()
FROM auth.users u
WHERE u.email = 'tu_email@ejemplo.com'
AND NOT EXISTS (
  SELECT 1 FROM admin_users WHERE username = u.email
);
```

### Error: "Usuario inactivo"

**Solución**:
```sql
UPDATE admin_users 
SET is_active = true 
WHERE username = 'tu_email@ejemplo.com';
```

### Error: "No se pudo crear la sesión"

**Causa**: Problema con Supabase Auth.

**Solución**:
1. Verifica que el usuario existe en **Authentication** > **Users**
2. Verifica que el email y password son correctos
3. Verifica que las variables de entorno `SUPABASE_URL` y `SUPABASE_ANON_KEY` están correctas

## 📝 Notas Importantes

1. **El `username` en `admin_users` DEBE coincidir con el `email` en `auth.users`**
2. **El `user_id` en `admin_users` DEBE ser el mismo UUID que el `id` en `auth.users`**
3. **Siempre usa el mismo email para ambos sistemas**
4. **El `access_code` se genera automáticamente, pero puedes cambiarlo manualmente si es necesario**

## 🔄 Actualizar Usuario Existente

Si ya tienes usuarios en `admin_users` sin `user_id`, puedes actualizarlos así:

```sql
-- Actualizar usuario existente con su user_id de Auth
UPDATE admin_users au
SET user_id = u.id
FROM auth.users u
WHERE au.username = u.email
AND au.user_id IS NULL;
```

