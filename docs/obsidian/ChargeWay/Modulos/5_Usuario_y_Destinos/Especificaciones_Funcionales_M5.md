# Especificaciones Funcionales - Usuario y Destinos

## Restricciones
- Máximo 5 localizaciones en la tabla `favorite_locations`.
- Cada favorito debe contener: `alias`, `address`, `lat`, `lng`.
- Si no existe dirección textual, se guardan las coordenadas formateadas.

## Interfaz de Usuario
- Uso de `React Portals` para renderizar los modales (Creación y Eliminación) al final del DOM, superando problemas de `z-index` y contextos CSS anidados.
