-- Script para agregar un nuevo punto identificado que no estaba en la base
BEGIN;

INSERT INTO public.charging_points (region, province, city_or_canton, name, speed, charger_type, power, schedule, cost_type, gps_link, lat, lng) VALUES ('Sierra', 'Pichincha', 'Quito', 'Centro comercial Montufar', '🟡 NORMAL', 'Pared', 'tipo 1 (7kw) ADAPTADOR', '9am a 5pm', 'Consultar', 'https://maps.app.goo.gl/evx2pQhJHXFsSw3T9', -0.2167212, -78.525009);

COMMIT;
