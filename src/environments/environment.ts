export const environment = {
  production: false,
  RETRY: 0,
  VERSION: '1.0.0',
  allowedDomains: ['localhost:8080'],
  disallowedRoutes: ['http://localhost:8080/backend-sicoin/login/forget'],
  // Configuración de Supabase para desarrollo
  supabase: {
    url: 'https://khecnaugsqmgxxfgsndu.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZWNuYXVnc3FtZ3h4ZmdzbmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2Mjc2MDYsImV4cCI6MjA4MDIwMzYwNn0.ocXUgDaxNDAXLDHApm9MzS5gcok8vuABPgH_K4bUKbE'
  }
};
