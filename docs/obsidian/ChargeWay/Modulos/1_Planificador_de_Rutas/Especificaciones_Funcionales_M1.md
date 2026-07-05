# Especificaciones Funcionales - Planificador de Rutas

## Reglas de Negocio
1. **Proveedor de Servicios:** Se utiliza `Mapbox Directions API` configurado con el perfil `driving`.
2. **Puntos Intermedios:** El sistema debe soportar un arreglo dinámico de puntos (origen, paradas sugeridas, destino).
3. **Decodificación Geométrica:** La API de Mapbox retorna la geometría codificada (Polyline), la cual debe ser decodificada localmente a un arreglo de pares de coordenadas `[lng, lat]` para renderizar el mapa y los cálculos de distancia (Haversine).
