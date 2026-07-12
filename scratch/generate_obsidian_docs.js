const fs = require('fs');
const path = require('path');

const baseDir = path.join('c:\\PERSONAL\\IA\\ChargeWay', 'docs', 'obsidian');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const files = {
  'Inicio.md': `# Inicio

Bienvenido a la bóveda de documentación oficial de **ChargeWay**.

## 🗺️ Módulos Principales
1. [[1_Planificador_de_Rutas/Resumen_Planificador|Planificador de Rutas (Core Routing Engine)]]
2. [[2_Orquestador_de_Carga/Resumen_Orquestador|Orquestador de Carga (Charging Orchestrator)]]
3. [[3_Copiloto_EV/Resumen_Copiloto|Copiloto EV y Telemetría en Vivo]]
4. [[4_Gestion_Vehiculos/Resumen_Vehiculos|Gestión de Vehículos (Garage & Specs)]]
5. [[5_Usuario_y_Destinos/Resumen_Usuario|Gestión de Usuario y Destinos (Mis Lugares)]]

## 🏗️ Arquitectura y Referencias
- [[Arquitectura/Modelo_de_Base_de_Datos_Supabase|Modelo de Base de Datos Supabase]]
- [[Arquitectura/Glosario_y_Constantes|Glosario y Constantes Generales]]
`,

  // MODULE 1: Planificador de Rutas
  'Modulos/1_Planificador_de_Rutas/Resumen_Planificador.md': `# 1. Planificador de Rutas (Core Routing)

El módulo principal responsable de trazar rutas, calcular distancias y generar perfiles topográficos (elevación) utilizando la API de Mapbox.

## Sub-documentos
- [[Historias_de_Usuario_M1|Historias de Usuario]]
- [[Especificaciones_Funcionales_M1|Especificaciones Funcionales]]
- [[Especificaciones_Tecnicas_M1|Especificaciones Técnicas]]
`,
  'Modulos/1_Planificador_de_Rutas/Historias_de_Usuario_M1.md': `# Historias de Usuario - Planificador de Rutas

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
`,
  'Modulos/1_Planificador_de_Rutas/Especificaciones_Funcionales_M1.md': `# Especificaciones Funcionales - Planificador de Rutas

## Reglas de Negocio
1. **Proveedor de Servicios:** Se utiliza \`Mapbox Directions API\` configurado con el perfil \`driving\`.
2. **Puntos Intermedios:** El sistema debe soportar un arreglo dinámico de puntos (origen, paradas sugeridas, destino).
3. **Decodificación Geométrica:** La API de Mapbox retorna la geometría codificada (Polyline), la cual debe ser decodificada localmente a un arreglo de pares de coordenadas \`[lng, lat]\` para renderizar el mapa y los cálculos de distancia (Haversine).
`,
  'Modulos/1_Planificador_de_Rutas/Especificaciones_Tecnicas_M1.md': `# Especificaciones Técnicas - Planificador de Rutas

## Archivos Clave
- \`src/lib/services/mapbox.ts\`: 
  - \`getMapboxRoute(coordinates)\`: Realiza el \`fetch\` a \`api.mapbox.com/directions/v5/mapbox/driving\`.
  - \`decodeGeoJSONGeometry(geometry)\`: Algoritmo para transformar la polilínea codificada.
- \`src/hooks/useTripStore.ts\`: Zustand store que mantiene el estado global \`tripPlan\` (distancia, duración, geometría).

## Algoritmos
- **Cálculo Acumulativo (\`buildRouteCumDistances\`):** Se recorre el arreglo decodificado aplicando la fórmula de Haversine para calcular la distancia acumulada en cada punto de la polilínea, vital para sincronizar el perfil de elevación.
`,

  // MODULE 2: Orquestador de Carga
  'Modulos/2_Orquestador_de_Carga/Resumen_Orquestador.md': `# 2. Orquestador de Carga

Módulo crítico que cruza la base de datos de electrolineras con la ruta generada y la autonomía del vehículo para sugerir de forma inteligente dónde parar a cargar.

## Sub-documentos
- [[Historias_de_Usuario_M2|Historias de Usuario]]
- [[Especificaciones_Funcionales_M2|Especificaciones Funcionales]]
- [[Especificaciones_Tecnicas_M2|Especificaciones Técnicas]]
`,
  'Modulos/2_Orquestador_de_Carga/Historias_de_Usuario_M2.md': `# Historias de Usuario - Orquestador de Carga

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
`,
  'Modulos/2_Orquestador_de_Carga/Especificaciones_Funcionales_M2.md': `# Especificaciones Funcionales - Orquestador de Carga

## Filtro de Conectores (Compatibilidad)
- \`CCS2 / CCS1\`: Mapeado a \`ccs\`, \`combo\`, \`cs2\`, \`cs1\`.
- \`Type 2\`: Mapeado a \`type2\`, \`tipo2\`, \`ac\`.
- \`GB/T\`: Mapeado a \`gbt\`, \`chino\`.

## Rango Seguro y Tolerancias
- **Margen de Seguridad:** Se reserva estrictamente el **12%** de la autonomía WLTP calculada para evitar quedarse varado.
- **Límite Alcanzable:** \`reachableLimit = initialRangeKm * 0.88\`.
- **Radio de Búsqueda Interna:** 30 km a la redonda de la polilínea (para viajes largos).
- **Radio de Búsqueda Visual ("En Ruta"):** 5 km a la redonda.
`,
  'Modulos/2_Orquestador_de_Carga/Especificaciones_Tecnicas_M2.md': `# Especificaciones Técnicas - Orquestador de Carga

## Archivos Clave
- \`src/lib/route-orchestrator.ts\`: Corazón algorítmico. 
  - \`fetchChargersAlongRoute\`: Cruza los cargadores con la geometría de la ruta.
  - \`pickBestChargingStop\`: Encuentra el cargador ideal cerca del 70% del rango, filtrando los inalcanzables. Implementa lógica de "Fallback" si el arreglo \`reachable\` está vacío.
- \`src/lib/data/ecuador-chargers.ts\`: Backup local y tipado de los cargadores migrados desde Supabase.

## Dependencias
- Función \`haversineKm(lat1, lon1, lat2, lon2)\` para detección de distancia geodésica.
`,

  // MODULE 3: Copiloto EV
  'Modulos/3_Copiloto_EV/Resumen_Copiloto.md': `# 3. Copiloto EV y Telemetría en Vivo

Sistema de asistencia activa y retroalimentación en tiempo real que reacciona a la topografía de la ruta para predecir el consumo y dar tips de conducción.

## Sub-documentos
- [[Historias_de_Usuario_M3|Historias de Usuario]]
- [[Especificaciones_Funcionales_M3|Especificaciones Funcionales]]
- [[Especificaciones_Tecnicas_M3|Especificaciones Técnicas]]
`,
  'Modulos/3_Copiloto_EV/Historias_de_Usuario_M3.md': `# Historias de Usuario - Copiloto EV

## HU-3.1: Estimación Dinámica de Batería
**Como** conductor
**Quiero** ver con qué porcentaje de batería llegaré a mi destino
**Para** reducir la "ansiedad de rango".

**Criterios de Aceptación:**
1. El cálculo debe restar 0.25 kWh adicionales por cada 100m de ascenso en la ruta.
2. Si el cálculo resulta en batería negativa, debe decir "0%" y mostrar los km faltantes como "Margen Extra".

## HU-3.2: Tips de Regeneración Sincronizados
**Como** conductor
**Quiero** ver recomendaciones (ej. usar regeneración alta en bajadas) sincronizadas con mi avance
**Para** maximizar la eficiencia energética.
`,
  'Modulos/3_Copiloto_EV/Especificaciones_Funcionales_M3.md': `# Especificaciones Funcionales - Copiloto EV

## Física y Consumo
- \`Consumo Base:\` (Batería utilizable / Autonomía WLTP) * 100 (kWh/100km).
- \`Penalidad de Subida:\` 0.25 kWh por cada 100 metros de ascenso neto acumulado.
- \`Beneficio de Bajada:\` Se ignora parcialmente para cálculos conservadores, asumiendo que la regeneración nunca es 100% eficiente (solo compensa parte del arrastre).

## Generación de Segmentos (Tips)
La ruta se divide en segmentos dependiendo de la pendiente:
- \`Subida Fuerte\` (> 4% inclinación)
- \`Bajada Leve / Fuerte\` (< -2% inclinación)
- \`Plano - Eficiente\` (entre -2% y 4%)
`,
  'Modulos/3_Copiloto_EV/Especificaciones_Tecnicas_M3.md': `# Especificaciones Técnicas - Copiloto EV

## Archivos Clave
- \`src/app/page.tsx\`: Orquestación del estado \`liveStats\` y renderizado de la UI de recomendaciones.
- \`EVCopilot.tsx\`: Componente presentacional que renderiza los segmentos con iconos dinámicos.
- Lógica de resaltado: Utiliza \`progressKm\` para encontrar el índice del segmento activo haciendo \`activeSegmentIndex = segments.findIndex(s => progressKm >= s.startKm && progressKm < s.endKm)\`.
`,

  // MODULE 4: Gestión de Vehículos
  'Modulos/4_Gestion_Vehiculos/Resumen_Vehiculos.md': `# 4. Gestión de Vehículos (Garage & Specs)

Almacena y provee las especificaciones de la base de datos de modelos eléctricos disponibles en el mercado ecuatoriano (y LATAM) para alimentar los cálculos físicos.

## Sub-documentos
- [[Historias_de_Usuario_M4|Historias de Usuario]]
- [[Especificaciones_Funcionales_M4|Especificaciones Funcionales]]
- [[Especificaciones_Tecnicas_M4|Especificaciones Técnicas]]
`,
  'Modulos/4_Gestion_Vehiculos/Historias_de_Usuario_M4.md': `# Historias de Usuario - Gestión de Vehículos

## HU-4.1: Selección de Vehículo
**Como** usuario
**Quiero** seleccionar mi marca y modelo de auto en un menú desplegable
**Para** que la aplicación personalice los cálculos de rango y compatibilidad.

**Criterios de Aceptación:**
1. Los vehículos deben estar agrupados y filtrados por Marca.
2. Al cambiar de vehículo, el estado global de WLTP Range y Capacidad de batería debe actualizarse inmediatamente.
`,
  'Modulos/4_Gestion_Vehiculos/Especificaciones_Funcionales_M4.md': `# Especificaciones Funcionales - Gestión de Vehículos

## Normalización de Autonomías (NEDC/CLTC -> WLTP)
- Cuando el fabricante provee autonomías en ciclo CLTC o NEDC, el sistema realiza una conversión automática:
  - \`WLTP = Rango Comercial * 0.85\`
- Esto asegura que las predicciones sean siempre realistas y seguras.

## Marcas Soportadas (Actualmente)
- BYD (Yuan Plus, Dolphin, Seagull, etc)
- Chery (eQ7)
- Dongfeng (Nammi 06, S7 EV)
- *Lista expansible por JSON o Supabase (Phase 2).*
`,
  'Modulos/4_Gestion_Vehiculos/Especificaciones_Tecnicas_M4.md': `# Especificaciones Técnicas - Gestión de Vehículos

## Estructura de Datos
\`src/lib/vehicles.json\`
Contiene un arreglo de objetos \`Vehicle\`:
\`\`\`json
{
  "id": "chery-eq7",
  "brand": "Chery",
  "model": "eQ7",
  "specs": {
    "usable_battery_kwh": 65.5,
    "drag_coefficient": 0.30,
    "frontal_area_m2": 2.6,
    "weight_kg": 1800,
    "peak_charging_kw": 90,
    "wltp_range_km": 435,
    "charger_type": "CCS2",
    "commercial_range_km": 512,
    "commercial_standard": "CLTC"
  }
}
\`\`\`
`,

  // MODULE 5: Gestión de Usuario y Destinos
  'Modulos/5_Usuario_y_Destinos/Resumen_Usuario.md': `# 5. Gestión de Usuario y Destinos (Mis Lugares)

Sistema que permite a los usuarios autenticados guardar y administrar localizaciones en el mapa bajo nombres personalizados (alias).

## Sub-documentos
- [[Historias_de_Usuario_M5|Historias de Usuario]]
- [[Especificaciones_Funcionales_M5|Especificaciones Funcionales]]
- [[Especificaciones_Tecnicas_M5|Especificaciones Técnicas]]
`,
  'Modulos/5_Usuario_y_Destinos/Historias_de_Usuario_M5.md': `# Historias de Usuario - Usuario y Destinos

## HU-5.1: Guardar Favorito desde el Mapa
**Como** usuario autenticado
**Quiero** dar clic en un punto del mapa y elegir "Seleccionar en el mapa"
**Para** guardar ese punto como "Favorito" con un alias (ej. Casa).

## HU-5.2: Límite de Favoritos
**Como** plataforma (Business)
**Quiero** limitar a 5 el número máximo de favoritos por usuario estándar
**Para** reservar la expansión ilimitada como una característica premium.
`,
  'Modulos/5_Usuario_y_Destinos/Especificaciones_Funcionales_M5.md': `# Especificaciones Funcionales - Usuario y Destinos

## Restricciones
- Máximo 5 localizaciones en la tabla \`favorite_locations\`.
- Cada favorito debe contener: \`alias\`, \`address\`, \`lat\`, \`lng\`.
- Si no existe dirección textual, se guardan las coordenadas formateadas.

## Interfaz de Usuario
- Uso de \`React Portals\` para renderizar los modales (Creación y Eliminación) al final del DOM, superando problemas de \`z-index\` y contextos CSS anidados.
`,
  'Modulos/5_Usuario_y_Destinos/Especificaciones_Tecnicas_M5.md': `# Especificaciones Técnicas - Usuario y Destinos

## Archivos Clave
- \`src/components/Dashboard/FavoriteAliasModal.tsx\`
- \`src/components/Dashboard/DeleteFavoriteModal.tsx\`
- \`src/lib/services/supabase.ts\`: Funciones \`getFavoriteLocations\`, \`addFavoriteLocation\`, \`deleteFavoriteLocation\`.
- Integración en \`page.tsx\`: Hook \`useEffect\` escucha cambios de sesión para recargar los favoritos.
`,

  // ARQUITECTURA
  'Arquitectura/Modelo_de_Base_de_Datos_Supabase.md': `# Modelo de Base de Datos Supabase

El backend de ChargeWay corre sobre **Supabase** (PostgreSQL).

## Esquema Fase 1
- **Tabla:** \`chargers\`
  - \`id\` (UUID)
  - \`name\` (Text)
  - \`lat\` (Float)
  - \`lng\` (Float)
  - \`tipo_cargador\` (Text) - Ejemplo: "CCS2, Type 2"
  - \`velocidad\` (Text)
  - \`estado\` (Text)

- **Tabla:** \`favorite_locations\`
  - \`id\` (UUID)
  - \`user_id\` (UUID, References auth.users)
  - \`alias\` (Text)
  - \`address\` (Text)
  - \`lat\` (Float)
  - \`lng\` (Float)
  - \`created_at\` (Timestamptz)

*(Para tablas de Fase 2, referirse a la rama secundaria)*
`,
  'Arquitectura/Glosario_y_Constantes.md': `# Glosario y Constantes Globales

## Glosario
- **SoC (State of Charge):** Nivel de carga de la batería en porcentaje (%).
- **WLTP (Worldwide Harmonised Light Vehicles Test Procedure):** Estándar realista de medición de autonomía.
- **CLTC / NEDC:** Estándares chinos/antiguos de medición (optimistas). Requieren reducción del 15% para asimilarse al WLTP.
- **Regeneración (Regen):** Capacidad del motor eléctrico para invertir polaridad y recargar la batería en bajadas o frenados.

## Constantes
- \`NEAR_KM\`: **5 km** (Radio para detectar un cargador "En Ruta" y pintarlo de amarillo en el UI).
- \`SEARCH_RADIUS_KM\`: **30 km** (Radio del orquestador interno para cruce con electrolineras).
- \`SAFETY_BUFFER_PERCENT\`: **12%** (Margen intocable de autonomía calculado antes de forzar parada).
- \`MAX_FAVORITES_STANDARD\`: **5** (Límite de guardado).
`
};

for (const [relativePath, content] of Object.entries(files)) {
  const fullPath = path.join(baseDir, relativePath);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, content, 'utf8');
}

console.log('Obsidian Vault generado exitosamente.');
