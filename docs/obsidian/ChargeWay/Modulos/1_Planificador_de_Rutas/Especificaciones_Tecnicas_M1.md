# Especificaciones Técnicas - Planificador de Rutas

## Archivos Clave
- `src/lib/services/mapbox.ts`: 
  - `getMapboxRoute(coordinates)`: Realiza el `fetch` a `api.mapbox.com/directions/v5/mapbox/driving`.
  - `decodeGeoJSONGeometry(geometry)`: Algoritmo para transformar la polilínea codificada.
- `src/hooks/useTripStore.ts`: Zustand store que mantiene el estado global `tripPlan` (distancia, duración, geometría).

## Algoritmos
- **Cálculo Acumulativo (`buildRouteCumDistances`):** Se recorre el arreglo decodificado aplicando la fórmula de Haversine para calcular la distancia acumulada en cada punto de la polilínea, vital para sincronizar el perfil de elevación.
