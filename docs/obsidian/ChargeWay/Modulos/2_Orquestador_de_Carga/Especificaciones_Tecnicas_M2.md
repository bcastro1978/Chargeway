# Especificaciones Técnicas - Orquestador de Carga

## Archivos Clave
- `src/lib/route-orchestrator.ts`: Corazón algorítmico. 
  - `fetchChargersAlongRoute`: Cruza los cargadores con la geometría de la ruta.
  - `pickBestChargingStop`: Encuentra el cargador ideal cerca del 70% del rango, filtrando los inalcanzables. Implementa lógica de "Fallback" si el arreglo `reachable` está vacío.
- `src/lib/data/ecuador-chargers.ts`: Backup local y tipado de los cargadores migrados desde Supabase.

## Dependencias
- Función `haversineKm(lat1, lon1, lat2, lon2)` para detección de distancia geodésica.
