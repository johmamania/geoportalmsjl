# GeoPortal San Juan de Lurigancho

Sistema de Información Geográfica (SIG) para el Distrito de San Juan de Lurigancho. Aplicación web desarrollada con Angular 17 que permite visualizar y gestionar información geográfica del distrito.

## 🚀 Características

- Visualización de mapas interactivos con OpenLayers
- Gestión de puntos, rutas y polígonos geográficos
- Integración con Supabase para almacenamiento de datos
- Panel de administración para gestión de contenido
- Diseño responsive optimizado para dispositivos móviles
- Sistema de autenticación y autorización

## 📋 Requisitos Previos

- Node.js (v18 o superior)
- npm (v9 o superior)
- Cuenta en Vercel para despliegue
- Cuenta en Supabase para base de datos

## 🛠️ Instalación Local

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd geoportalSlj
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
   - Crear archivo `src/environments/environment.development.ts` con tus credenciales de Supabase:
```typescript
export const environment = {
  production: false,
  RETRY: 0,
  VERSION: '1.0.0',
  allowedDomains: ['localhost:8080'],
  disallowedRoutes: ["http://localhost:8080/backend/login/forget"],
  supabase: {
    url: 'TU_SUPABASE_URL',
    anonKey: 'TU_SUPABASE_ANON_KEY'
  }
};
```

4. Ejecutar servidor de desarrollo:
```bash
npm start
```

5. Abrir en el navegador: `http://localhost:4200`

## 🏗️ Build para Producción

### Build Local:
```bash
npm run build:prod:local
```

### Build para Vercel:
```bash
npm run build:prod:vercel
```

El build se guardará en la carpeta `dist/browser/`.

## 📦 Despliegue en Vercel

### Opción 1: Despliegue Automático desde Git

1. **Conectar repositorio a Vercel:**
   - Ir a [Vercel](https://vercel.com)
   - Importar el proyecto desde GitHub/GitLab/Bitbucket
   - Vercel detectará automáticamente la configuración de Angular

2. **Configurar Variables de Entorno:**
   En la configuración del proyecto en Vercel, agregar las siguientes variables:
   - `SUPABASE_URL`: URL de tu proyecto Supabase
   - `SUPABASE_ANON_KEY`: Clave anónima de Supabase

3. **Configuración de Build:**
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist/browser`
   - **Install Command:** `npm install`

4. **Desplegar:**
   - Vercel desplegará automáticamente en cada push a la rama principal
   - El script `env.js` generará automáticamente el archivo `environment.prod.ts` con las variables de entorno

### Opción 2: Despliegue Manual

1. Instalar Vercel CLI:
```bash
npm i -g vercel
```

2. Iniciar sesión:
```bash
vercel login
```

3. Desplegar:
```bash
vercel --prod
```

## 🔧 Configuración de Variables de Entorno en Vercel

Las siguientes variables deben configurarse en el panel de Vercel:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SUPABASE_URL` | URL de tu proyecto Supabase | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Clave anónima de Supabase | `eyJhbGci...` |

**Nota:** El script `scripts/env.js` se ejecuta automáticamente durante el build y genera el archivo `environment.prod.ts` con estas variables.

## 📁 Estructura del Proyecto

```
geoportalSlj/
├── src/
│   ├── app/
│   │   ├── components/       # Componentes reutilizables
│   │   ├── core/             # Servicios core (Supabase)
│   │   ├── guard/            # Guards de autenticación
│   │   ├── interceptor/      # Interceptores HTTP
│   │   ├── login/            # Componente de login
│   │   ├── material/         # Configuración de Angular Material
│   │   ├── model/            # Modelos de datos
│   │   ├── pages/            # Páginas principales
│   │   │   ├── admin/        # Panel de administración
│   │   │   ├── geoportal/    # Visualizador de mapas
│   │   │   └── inicio/       # Página de inicio
│   │   └── services/         # Servicios de la aplicación
│   ├── assets/               # Recursos estáticos
│   └── environments/         # Archivos de configuración
├── scripts/
│   └── env.js               # Script para generar environment.prod.ts
├── angular.json             # Configuración de Angular
├── vercel.json              # Configuración de Vercel
└── package.json             # Dependencias del proyecto
```

## 🎨 Tecnologías Utilizadas

- **Angular 17** - Framework principal
- **Angular Material** - Componentes UI
- **OpenLayers** - Visualización de mapas
- **Supabase** - Backend y base de datos
- **TypeScript** - Lenguaje de programación
- **RxJS** - Programación reactiva

## 📱 Características Responsive

La aplicación está optimizada para:
- 📱 Dispositivos móviles (320px - 480px)
- 📱 Tablets (481px - 768px)
- 💻 Desktop (769px+)

## 🔐 Seguridad

- Variables de entorno no se incluyen en el repositorio
- Autenticación mediante JWT
- Validación de dominios permitidos
- Interceptores para manejo de errores

## 🐛 Solución de Problemas

### Error: "Supabase configuration missing"
- Verificar que las variables de entorno estén configuradas en Vercel
- Verificar que el script `env.js` se ejecute durante el build

### Error: "Module not found"
- Ejecutar `npm install` para instalar dependencias
- Verificar que todas las dependencias estén en `package.json`

### Problemas de Build en Vercel
- Verificar que el `Output Directory` sea `dist/browser`
- Verificar que el `Build Command` sea `npm run build`
- Revisar los logs de build en Vercel para más detalles

## 📝 Scripts Disponibles

- `npm start` - Inicia servidor de desarrollo
- `npm run build` - Build para producción (Vercel)
- `npm run build:prod:vercel` - Build con variables de entorno de Vercel
- `npm run build:prod:local` - Build para producción local
- `npm run watch` - Build en modo watch

## 👥 Contribución

1. Crear una rama para la nueva funcionalidad
2. Realizar los cambios
3. Hacer commit de los cambios
4. Crear un Pull Request

## 📄 Licencia

Este proyecto es propiedad de la Municipalidad de San Juan de Lurigancho.

## 📞 Contacto

Para más información, contactar con el equipo de desarrollo de la Municipalidad de San Juan de Lurigancho.

---

**Desarrollado para la Municipalidad de San Juan de Lurigancho** 🏛️
