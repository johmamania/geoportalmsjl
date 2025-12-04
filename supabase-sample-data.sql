-- ============================================
-- DATOS DE EJEMPLO - PUNTOS DE REUNIÓN
-- San Juan de Lurigancho
-- ============================================

-- Insertar 10 puntos de reunión de ejemplo
-- Coordenadas base: -76.969256, -11.9356555
-- Nota: Asegúrate de tener un usuario administrador creado primero
-- Si necesitas asignar created_by, reemplaza NULL con el ID del usuario

INSERT INTO map_points (name, description, latitude, longitude, icon_type, icon_color, category, is_active, created_by) VALUES
('Punto de Reunión 1', 'Punto de reunión principal - Zona Central', -11.9356555, -76.969256, 'marker', '#FF0000', 'Punto de Reunión', true, NULL),
('Punto de Reunión 2', 'Punto de reunión - Zona Norte', -11.9406555, -76.969256, 'marker', '#FF0000', 'Punto de Reunión', true, NULL),
('Punto de Reunión 3', 'Punto de reunión - Zona Sur', -11.9306555, -76.969256, 'marker', '#FF0000', 'Punto de Reunión', true, NULL),
('Punto de Reunión 4', 'Punto de reunión - Zona Este', -11.9356555, -76.964256, 'marker', '#FF0000', 'Punto de Reunión', true, NULL),
('Punto de Reunión 5', 'Punto de reunión - Zona Oeste', -11.9356555, -76.974256, 'marker', '#FF0000', 'Punto de Reunión', true, NULL),
('Punto de Reunión 6', 'Punto de reunión - Zona Noroeste', -11.9386555, -76.972256, 'marker', '#FF0000', 'Punto de Reunión', true, NULL),
('Punto de Reunión 7', 'Punto de reunión - Zona Noreste', -11.9386555, -76.966256, 'marker', '#FF0000', 'Punto de Reunión', true, NULL),
('Punto de Reunión 8', 'Punto de reunión - Zona Suroeste', -11.9326555, -76.972256, 'marker', '#FF0000', 'Punto de Reunión', true, NULL),
('Punto de Reunión 9', 'Punto de reunión - Zona Sureste', -11.9326555, -76.966256, 'marker', '#FF0000', 'Punto de Reunión', true, NULL),
('Punto de Reunión 10', 'Punto de reunión - Zona Central Este', -11.9356555, -76.962256, 'marker', '#FF0000', 'Punto de Reunión', true, NULL);

-- Verificar que los puntos se insertaron correctamente
SELECT id, name, latitude, longitude, category, created_at
FROM map_points
WHERE category = 'Punto de Reunión'
ORDER BY created_at DESC;

