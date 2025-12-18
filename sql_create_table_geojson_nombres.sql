-- Tabla para almacenar nombres de archivos GeoJSON
CREATE TABLE IF NOT EXISTS msjl_geojson_nombres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  archivo VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas por archivo
CREATE INDEX IF NOT EXISTS idx_geojson_nombres_archivo ON msjl_geojson_nombres(archivo);

-- Índice para búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_geojson_nombres_nombre ON msjl_geojson_nombres(nombre);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_geojson_nombres_updated_at
  BEFORE UPDATE ON msjl_geojson_nombres
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE msjl_geojson_nombres IS 'Almacena los nombres de los archivos GeoJSON y su relación con los archivos en storage';
COMMENT ON COLUMN msjl_geojson_nombres.nombre IS 'Nombre descriptivo de la ubicación (ej: Hospitales, Escuelas)';
COMMENT ON COLUMN msjl_geojson_nombres.archivo IS 'Nombre del archivo en storage (ej: hospitales.geojson)';

