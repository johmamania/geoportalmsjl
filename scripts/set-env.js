const fs = require('fs');
const path = require('path');

const targetPath = './src/environments/environment.prod.ts';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const envConfigFile = `export const environment = {
  production: true,
  RETRY: 0,
  VERSION: '1.0.0',
  allowedDomains: ['${supabaseUrl.replace('https://', '').replace('http://', '')}'],
  disallowedRoutes: [],
  supabase: {
    url: '${supabaseUrl}',
    anonKey: '${supabaseAnonKey}'
  }
};
`;

// Asegurar que el directorio existe
const targetDir = path.dirname(targetPath);
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

fs.writeFileSync(targetPath, envConfigFile);
console.log(`✅ environment.prod.ts generado correctamente`);
console.log(`   Supabase URL: ${supabaseUrl ? '✓ Configurado' : '✗ Vacío'}`);
console.log(`   Supabase Key: ${supabaseAnonKey ? '✓ Configurado' : '✗ Vacío'}`);

