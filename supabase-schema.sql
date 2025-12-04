-- ============================================
-- SCHEMA PARA MAPA DINÁMICO - SUPABASE
-- ============================================

-- Tabla de usuarios administradores
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  access_code VARCHAR(50) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

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

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_map_points_updated_at
  BEFORE UPDATE ON map_points
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_map_routes_updated_at
  BEFORE UPDATE ON map_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

-- Política RLS (Row Level Security) - Permitir lectura pública de puntos activos
ALTER TABLE map_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_polygons ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Políticas para lectura pública (solo registros activos)
CREATE POLICY "Public read map_points" ON map_points
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public read map_routes" ON map_routes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public read map_polygons" ON map_polygons
  FOR SELECT USING (is_active = true);

-- Políticas para administradores (requieren autenticación)
-- Nota: Estas políticas deben ajustarse según tu sistema de autenticación de Supabase

-- Insertar usuario administrador de ejemplo (password: admin123)
-- El hash debe generarse con bcrypt. Para desarrollo, puedes usar: https://bcrypt-generator.com/
-- INSERT INTO admin_users (username, password_hash, access_code) 
-- VALUES ('admin', '$2a$10$...', generate_access_code());

