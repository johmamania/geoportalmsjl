-- ============================================
-- SCHEMA ACTUALIZADO PARA SUPABASE AUTH
-- ============================================

-- Tabla de usuarios administradores (ACTUALIZADA)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Referencia a Supabase Auth
  username VARCHAR(100) UNIQUE NOT NULL, -- Debe coincidir con el email en auth.users
  password_hash TEXT, -- Opcional ahora (se usa Supabase Auth)
  access_code VARCHAR(50) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Si la tabla ya existe, agregar la columna user_id si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE admin_users 
    ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Tabla de puntos geográficos
CREATE TABLE IF NOT EXISTS map_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  icon_type VARCHAR(50) DEFAULT 'default',
  icon_color VARCHAR(7) DEFAULT '#FF0000',
  category VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES admin_users(id),
  is_active BOOLEAN DEFAULT true
);

-- Tabla de rutas (líneas)
CREATE TABLE IF NOT EXISTS map_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  coordinates JSONB NOT NULL, -- Array de [longitude, latitude]
  stroke_color VARCHAR(7) DEFAULT '#0000FF',
  stroke_width INTEGER DEFAULT 2,
  category VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES admin_users(id),
  is_active BOOLEAN DEFAULT true
);

-- Tabla de polígonos
CREATE TABLE IF NOT EXISTS map_polygons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  coordinates JSONB NOT NULL, -- Array de arrays [[longitude, latitude], ...]
  fill_color VARCHAR(7) DEFAULT '#00FF00',
  stroke_color VARCHAR(7) DEFAULT '#000000',
  stroke_width INTEGER DEFAULT 2,
  fill_opacity DECIMAL(3, 2) DEFAULT 0.3,
  category VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES admin_users(id),
  is_active BOOLEAN DEFAULT true
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_map_points_location ON map_points(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_map_points_active ON map_points(is_active);
CREATE INDEX IF NOT EXISTS idx_map_routes_active ON map_routes(is_active);
CREATE INDEX IF NOT EXISTS idx_map_polygons_active ON map_polygons(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_access_code ON admin_users(access_code);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
DROP TRIGGER IF EXISTS update_map_points_updated_at ON map_points;
CREATE TRIGGER update_map_points_updated_at
  BEFORE UPDATE ON map_points
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_map_routes_updated_at ON map_routes;
CREATE TRIGGER update_map_routes_updated_at
  BEFORE UPDATE ON map_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_map_polygons_updated_at ON map_polygons;
CREATE TRIGGER update_map_polygons_updated_at
  BEFORE UPDATE ON map_polygons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para generar código de acceso único
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  random_part TEXT;
  access_code TEXT;
BEGIN
  year_part := EXTRACT(YEAR FROM NOW())::TEXT;
  random_part := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  access_code := year_part || '$' || random_part;
  RETURN access_code;
END;
$$ LANGUAGE plpgsql;

-- Política RLS (Row Level Security)
ALTER TABLE map_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_polygons ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Public read map_points" ON map_points;
DROP POLICY IF EXISTS "Public read map_routes" ON map_routes;
DROP POLICY IF EXISTS "Public read map_polygons" ON map_polygons;
DROP POLICY IF EXISTS "Admins can manage map_points" ON map_points;
DROP POLICY IF EXISTS "Admins can manage map_routes" ON map_routes;
DROP POLICY IF EXISTS "Admins can manage map_polygons" ON map_polygons;
DROP POLICY IF EXISTS "Admins can manage admin_users" ON admin_users;

-- Políticas para lectura pública (solo registros activos)
CREATE POLICY "Public read map_points" ON map_points
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public read map_routes" ON map_routes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public read map_polygons" ON map_polygons
  FOR SELECT USING (is_active = true);

-- Políticas para administradores autenticados
-- Los administradores pueden hacer CRUD completo
CREATE POLICY "Admins can manage map_points" ON map_points
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can manage map_routes" ON map_routes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can manage map_polygons" ON map_polygons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
  );

-- Política para que los administradores puedan ver su propia información
CREATE POLICY "Admins can view own admin_users" ON admin_users
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid() 
      AND au.is_active = true
    )
  );

-- ============================================
-- INSTRUCCIONES PARA CREAR UN USUARIO ADMIN
-- ============================================
-- 
-- 1. Primero, crea el usuario en Supabase Auth (Authentication > Users > Add User)
--    - Email: admin@example.com
--    - Password: tu_contraseña_segura
--    - Anota el User ID que se genera
--
-- 2. Luego, ejecuta este INSERT (reemplaza los valores):
--
-- INSERT INTO admin_users (user_id, username, is_active, access_code)
-- VALUES (
--   'USER_ID_DE_SUPABASE_AUTH',  -- El UUID del usuario creado en Auth
--   'admin@example.com',          -- El mismo email usado en Auth
--   true,
--   generate_access_code()        -- Genera un código automáticamente
-- );
--
-- Ejemplo completo:
-- INSERT INTO admin_users (user_id, username, is_active, access_code)
-- VALUES (
--   '123e4567-e89b-12d3-a456-426614174000',
--   'admin@example.com',
--   true,
--   generate_access_code()
-- );

