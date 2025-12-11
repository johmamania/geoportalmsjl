// Este archivo será generado automáticamente por el script set-env.js durante el build en Vercel
// No editar manualmente

export const environment = {
  production: true,
  RETRY: 0,
  VERSION: '1.0.0',
  allowedDomains: [],
  disallowedRoutes: [],
  supabase: {
    url: '',
    anonKey: ''
  },
  // Configuración de OpenRouteService
  openRouteService: {
    apiKey: '', // Se configurará desde variables de entorno en Vercel
    baseUrl: 'https://api.openrouteservice.org/v2/directions',
    useOpenRouteService: true // Cambiar a false cuando se agoten las 2000 peticiones
  }
};

