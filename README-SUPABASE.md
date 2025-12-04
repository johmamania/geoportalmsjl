# Configuración del Sistema de Mapa Dinámico con Supabase

## 📋 Requisitos Previos

1. Cuenta en [Supabase](https://supabase.com)
2. Proyecto creado en Supabase
3. URL y API Key de tu proyecto Supabase

## 🗄️ Configuración de la Base de Datos

### Paso 1: Ejecutar el Schema SQL

1. Ve a tu proyecto en Supabase
2. Navega a **SQL Editor**
3. Copia y pega el contenido del archivo `supabase-schema.sql`
4. Ejecuta el script

Este script creará:
- Tabla `admin_users` - Usuarios administradores
- Tabla `map_points` - Puntos geográficos
- Tabla `map_routes` - Rutas (líneas)
- Tabla `map_polygons` - Polígonos
- Índices y políticas RLS

### Paso 2: Crear un Usuario Administrador

Ejecuta este SQL en el SQL Editor de Supabase:

```sql
-- Insertar usuario administrador de ejemplo
-- Usuario: admin
-- Contraseña: admin123 (debes hashearla con bcrypt)
-- El código de acceso se generará automáticamente

INSERT INTO admin_users (username, password_hash, is_active)
VALUES ('admin', '$2a$10$TuHashAqui', true);
```

**Nota:** Para generar el hash de la contraseña, puedes usar:
- https://bcrypt-generator.com/
- O cualquier herramienta de hash bcrypt

## ⚙️ Configuración del Proyecto Angular

### Paso 1: Configurar Environment

Edita `src/environments/environment.development.ts`:

```typescript
supabase: {
  url: 'https://tu-proyecto.supabase.co', // Tu URL de Supabase
  anonKey: 'tu-anon-key-aqui' // Tu clave anónima de Supabase
}
```

**Dónde encontrar estos valores:**
1. Ve a tu proyecto en Supabase
2. Settings → API
3. Copia la **URL** y la **anon/public key**

### Paso 2: Instalar Dependencias (si es necesario)

El proyecto ya incluye `@supabase/supabase-js`. Si necesitas instalarlo:

```bash
npm install @supabase/supabase-js
```

## 🚀 Uso del Sistema

### Acceso a la Administración

1. Navega a `/admin/login`
2. Ingresa usuario y contraseña
3. Se generará un código de acceso (ejemplo: `2025$1223`)
4. Ingresa el código para acceder a la administración

### Funcionalidades de Administración

- **Ver puntos**: Tabla paginada con todos los puntos
- **Agregar punto**: Botón "Agregar Punto" → Modal con formulario
- **Editar punto**: Icono de editar en cada fila
- **Eliminar punto**: Icono de eliminar en cada fila (soft delete)

### Visualización en el Mapa

Los puntos se cargan automáticamente desde Supabase y se muestran en el mapa principal (`/geoportal`).

## 🔒 Seguridad

- Las políticas RLS (Row Level Security) están habilitadas
- Solo se muestran registros con `is_active = true`
- La autenticación de administradores requiere código de acceso único
- Las contraseñas deben estar hasheadas con bcrypt

## 📝 Notas Importantes

1. **Hash de Contraseñas**: En producción, implementa correctamente la verificación de hash bcrypt en el servicio `AdminAuthService`
2. **Código de Acceso**: Se genera automáticamente con formato `AÑO$NNNN`
3. **Soft Delete**: Los registros no se eliminan físicamente, solo se marcan como `is_active = false`
4. **RLS Policies**: Ajusta las políticas según tus necesidades de seguridad

## 🐛 Solución de Problemas

### Error: "Failed to fetch"
- Verifica que la URL de Supabase sea correcta
- Verifica que la anon key sea correcta
- Revisa la consola del navegador para más detalles

### Error: "relation does not exist"
- Asegúrate de haber ejecutado el script SQL completo
- Verifica que las tablas existan en Supabase

### Los puntos no se muestran en el mapa
- Verifica que los puntos tengan `is_active = true`
- Revisa la consola del navegador para errores
- Verifica que las coordenadas sean válidas

## 📚 Estructura del Proyecto

```
src/app/
├── admin/
│   ├── admin.component.ts          # Componente principal de administración
│   ├── admin-login/
│   │   └── admin-login.component.ts # Login de administración
├── services/
│   ├── map-data.service.ts         # CRUD para puntos, rutas, polígonos
│   └── admin-auth.service.ts       # Autenticación de administradores
├── model/
│   ├── map-point.ts                # Modelo de puntos
│   ├── map-route.ts                # Modelo de rutas
│   ├── map-polygon.ts              # Modelo de polígonos
│   └── admin-auth.ts               # Modelo de autenticación
└── guard/
    └── admin.guard.ts               # Guard para proteger rutas de admin
```

## ✅ Checklist de Implementación

- [ ] Ejecutar script SQL en Supabase
- [ ] Crear usuario administrador
- [ ] Configurar environment con URL y API key
- [ ] Probar login de administración
- [ ] Agregar puntos desde la administración
- [ ] Verificar que los puntos aparezcan en el mapa
- [ ] Probar edición y eliminación de puntos

