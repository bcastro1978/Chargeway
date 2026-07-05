# Historias de Usuario - Orquestador de Carga

## HU-2.1: Sugerencia de Parada Automática
**Como** conductor de VE
**Quiero** que el sistema evalúe si mi carga actual no es suficiente para llegar al destino
**Para** que me sugiera automáticamente la mejor estación de carga intermedia.

**Criterios de Aceptación:**
1. Si el SoC estimado al llegar es menor al 12% o negativo, el sistema busca un cargador.
2. La parada sugerida debe mostrarse como un waypoint rojo en el mapa.
3. Si el cargador está fuera del rango seguro, se debe hacer un fallback y mostrar el primer cargador de la ruta.

## HU-2.2: Filtrado por Compatibilidad
**Como** conductor de VE
**Quiero** ver solo los cargadores que tienen un conector compatible con mi auto
**Para** no desviarme hacia una estación donde no pueda cargar.
