export const environment = {
  production:false,
  RETRY: 0,
  VERSION: '1.0.0',
  allowedDomains: ['localhost:8080'],
  disallowedRoutes: ["http://localhost:8080/backend/login/forget"],
  // Configuración de Supabase
  supabase: {
    url: 'https://khecnaugsqmgxxfgsndu.supabase.co', // Reemplaza con tu URL de Supabase
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZWNuYXVnc3FtZ3h4ZmdzbmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2Mjc2MDYsImV4cCI6MjA4MDIwMzYwNn0.ocXUgDaxNDAXLDHApm9MzS5gcok8vuABPgH_K4bUKbE' // Reemplaza con tu clave anónima de Supabase
  },
  // Configuración de OpenRouteService
  openRouteService: {
    apiKey: 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjdlMDYzYThhMTY4ODQwMzNiZjZhNjA4N2NhYTBiZTM2IiwiaCI6Im11cm11cjY0In0=', // Reemplaza con tu API key de OpenRouteService (obtén una en https://openrouteservice.org/)
    baseUrl: 'https://api.openrouteservice.org/v2/directions',
    useOpenRouteService: true // Cambiar a false cuando se agoten las 2000 peticiones gratuitas
  }
};
