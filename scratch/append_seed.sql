-- Script para agregar nuevos puntos desde el Excel actualizado
BEGIN;
INSERT INTO public.charging_points (region, province, city_or_canton, name, speed, charger_type, power, schedule, cost_type, gps_link, lat, lng) VALUES ('Sierra', 'Pichincha', 'Quito - Cumbaya', 'Urbapark Cumbaya (calle Pampite y Diego de Robles esquina)
', '🟡 NORMAL', 'Tipo 2 Pared', '7KW', 'L-V: 08h00-20h00, S-D: 10h00 a 18h00', 'Pago 17ctvs por Kw', 'https://maps.app.goo.gl/TB5dLgoug4bNu6rY6?g_st=ac', NULL, NULL);
INSERT INTO public.charging_points (region, province, city_or_canton, name, speed, charger_type, power, schedule, cost_type, gps_link, lat, lng) VALUES ('Sierra', 'Pichincha', 'Quito', 'Conectz (Orellana y Rábida)', '🟢 ULTRA RÁPIDA', 'CCS1, CCS2 Y GBT', '200kw', '46227', '29 ctvs por Kw más $12 de activación del servicio', 'https://maps.app.goo.gl/uesxTHBDYZgk38Wh9?g_st=ac', NULL, NULL);
COMMIT;