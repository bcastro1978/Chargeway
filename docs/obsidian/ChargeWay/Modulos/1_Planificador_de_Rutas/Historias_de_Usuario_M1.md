# Historias de Usuario - Planificador de Rutas

## HU-1.1: Generación de Ruta Básica
**Como** conductor de VE
**Quiero** ingresar una ubicación de origen y otra de destino
**Para** que el sistema dibuje la ruta más óptima en el mapa interactivo.

**Criterios de Aceptación:**
1. El sistema debe validar que ambas ubicaciones tengan coordenadas válidas (Lat/Lng).
2. La ruta se debe dibujar como una polilínea en el componente del mapa.
3. Se deben mostrar la distancia total en km y la duración estimada.

## HU-1.2: Generación del Perfil Topográfico (Elevación)
**Como** conductor de VE
**Quiero** visualizar un gráfico de elevación de la ruta completa
**Para** entender los desniveles que enfrentará mi batería.

**Criterios de Aceptación:**
1. El sistema debe extraer datos de altitud del perfil de la ruta.
2. Se debe renderizar un gráfico de área mostrando el progreso en el eje X (km) y la altitud en el eje Y (m).
