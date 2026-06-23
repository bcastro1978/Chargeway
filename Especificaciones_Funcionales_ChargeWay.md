# Documento de Especificaciones Funcionales: ChargeWay

## 1. Resumen Ejecutivo
**ChargeWay** ("Drive with Electric Tranquility") es una plataforma web inteligente diseñada para planificar rutas para vehículos eléctricos (EVs) en Ecuador. Su objetivo principal es calcular la ruta óptima de un punto A a un punto B (con paradas intermedias), considerando no solo la distancia y el tráfico, sino la orografía del terreno (elevación), las características técnicas del vehículo eléctrico (batería, eficiencia) y la infraestructura de carga disponible en la red ecuatoriana. El sistema incluye un **Índice de Tranquilidad** que asegura que el conductor llegará a su destino con suficiente rango de seguridad.

## 2. Arquitectura y Stack Tecnológico
La plataforma está construida bajo una arquitectura Frontend pesada orientada a servicios (BaaS), usando renderizado del lado del cliente y componentes de React interactivos.

*   **Framework Principal**: Next.js 16 (App Router, Turbopack) / React 19.
*   **Lenguaje**: TypeScript estricto.
*   **Estilos**: CSS Modules / Inline Styles / TailwindCSS (parcial), con diseño tipo "Glassmorphism" y modo oscuro ("Premium dark").
*   **Mapas y Ruteo**: Mapbox GL JS (`mapbox-gl`) para renderizado del mapa de navegación nocturno (`navigation-night-v1`).
*   **Base de Datos y Backend**: Supabase (PostgreSQL), para almacenar la información de los puntos de carga (`charging.ts`).
*   **Gráficos**: Recharts (para los perfiles de elevación).
*   **Lógica Core**: Motor de energía físico personalizado (`energy-core.ts`) y orquestador de rutas (`route-orchestrator.ts`).

## 3. Módulos y Funcionalidades Principales

### 3.1. Módulo de Ruteo y Búsqueda (`RouteSearch.tsx`)
*   **Búsqueda Geocodificada**: Barra de búsqueda con autocompletado impulsada por la API de Mapbox. Permite al usuario buscar direcciones, puntos de interés (POIs) o ingresar paradas intermedias.
*   **Ubicación GPS**: Botón para obtener la ubicación actual del usuario a través de la API del navegador (HTML5 Geolocation), convirtiendo las coordenadas en una dirección legible.
*   **Gestión de Waypoints**: Capacidad de agregar, eliminar y reordenar paradas a lo largo de la ruta, así como invertir el origen y el destino.

### 3.2. Módulo del Mapa Interactivo (`RouteMap.tsx`)
*   **Renderizado de Ruta**: Dibuja la polilínea decodificada de la ruta óptima en el mapa.
*   **Visualización de Cargadores**: Carga y renderiza marcadores personalizados e interactivos para todas las estaciones de carga del país en la base de datos, diferenciando el estado por color (Rápido = Verde, Normal = Ámbar).
*   **Navegación en Tiempo Real**: Incorpora un GPS tracking en vivo. Cuando el usuario hace clic en "Iniciar Viaje", la plataforma sigue su ubicación en tiempo real centrando el mapa. También tiene una herramienta de **"Simulación"** para probar la ruta.
*   **Panel de Información (Charger Info Panel)**: Pop-up estético tipo "Glass" que muestra la información técnica del cargador: Tipo de conexión, Potencia (ej. 7kW, 50kW), Horario, Costo y un botón nativo de **"Llegar al punto"** que recalcula la ruta y acciona el GPS hacia el cargador.

### 3.3. Módulo de Vehículos y Estado (`VehicleSelector.tsx`, `VehicleStats.tsx`)
*   **Selección de Vehículo**: Dropdown para escoger entre una base de datos local de EVs (ej. BYD Yuan Plus, etc.), cargando instantáneamente las especificaciones del coche (Capacidad de batería en kWh, rango WLTP, eficiencia térmica).
*   **Estado de Carga (SoC)**: Slider para ajustar el nivel de batería actual (%) del coche. En función de este ajuste, se calcula el rango dinámico estimado en kilómetros.

### 3.4. Motor de Energía e Índice de Tranquilidad (`energy-core.ts`, `TranquilityIndex.tsx`)
*   **Física de Consumo**: El algoritmo toma la ruta y los datos de elevación para calcular el consumo exacto. El coche consume energía en las subidas y recupera energía (Frenado Regenerativo) en las bajadas.
*   **Perfil de Elevación**: Una gráfica de Recharts que muestra la altimetría del terreno a lo largo de la ruta seleccionada.
*   **Índice de Tranquilidad**: Un semáforo (Óptimo, Advertencia, Crítico) que evalúa si el SoC de llegada y los kilómetros de margen de seguridad son suficientes para realizar la ruta sin quedarse varado.

### 3.5. Orquestador de Rutas (`route-orchestrator.ts`)
*   Motor lógico que une los waypoints, consulta la API de Mapbox Directions, calcula el consumo con el `energy-core`, detecta si la carga inicial no es suficiente y cruza espacialmente la polilínea con la base de datos de Supabase para recomendar paradas de carga estratégicas en el camino.

### 3.6. Módulo de Inteligencia Comercial para Fabricantes (BI)
*   **Benchmarking Competitivo**: Permite a las marcas (ej. BYD, Kia) comparar el volumen de tráfico de sus vehículos frente a la competencia en todo el país.
*   **Distribución Geográfica Activa**: Analiza la densidad de vehículos circulando por provincia y cantón. Ayuda a identificar en qué ciudades la adopción de una marca específica es alta, y dónde hay una oportunidad de expansión o la necesidad de instalar puntos de carga exclusivos (Destination Charging).
*   **Análisis de Desempeño Energético de Flota (Próximamente)**: Otorga a los fabricantes información macro sobre cómo se comportan sus vehículos en la orografía andina, revelando datos de degradación de rango por topografía.

---

## 4. Historias de Usuario (User Stories)

**Épica 1: Configuración del Viaje**
*   **US-1.1**: Como conductor de un EV, quiero seleccionar mi modelo de vehículo de una lista para que el sistema conozca mis capacidades de batería.
*   **US-1.2**: Como conductor de un EV, quiero ingresar mi porcentaje de batería actual (SoC) para que el sistema pueda estimar hasta dónde puedo llegar.
*   **US-1.3**: Como viajero, quiero buscar un destino ingresando texto o usando mi ubicación actual, para que el mapa trace el camino.
*   **US-1.4**: Como planificador de viajes, quiero añadir puntos de paso (waypoints) entre el origen y el destino para crear un itinerario personalizado.

**Épica 2: Asistencia de Carga (Range Anxiety)**
*   **US-2.1**: Como usuario, quiero visualizar en el mapa todos los puntos de carga disponibles, diferenciando entre carga rápida y lenta.
*   **US-2.2**: Como usuario, quiero hacer clic en un cargador del mapa para ver su potencia, conectores, horarios, precio y si requiere adaptadores.
*   **US-2.3**: Como conductor en apuros, quiero que si la ruta excede mi capacidad de batería, el sistema me advierta con un "Índice de Tranquilidad" rojo.
*   **US-2.4**: Como viajero, quiero que el sistema me muestre una gráfica del perfil de elevación para saber cómo la cordillera afectará mi autonomía.

**Épica 3: Navegación GPS Activa**
*   **US-3.1**: Como conductor, quiero presionar "Iniciar Viaje" para que el mapa haga un seguimiento de mi ubicación GPS y me muestre avanzando sobre la línea de ruta dibujada.
*   **US-3.2**: Como conductor que necesita recargar urgente, quiero abrir el panel de un cargador y presionar "Llegar al punto" para que el sistema me enrute de inmediato hacia él y empiece a navegar.
*   **US-3.3**: Como desarrollador probando el app, quiero activar la "Simulación de Viaje" para ver cómo el cursor se mueve a lo largo de la ruta sin que tenga que salir a conducir físicamente.

**Épica 4: Inteligencia de Negocios para Fabricantes (Marcas)**
*   **US-4.1**: Como analista de marca (ej. BYD), quiero ver un mapa nacional con la concentración de movilidad de mis vehículos filtrada por provincia y cantón para saber dónde está mi mercado.
*   **US-4.2**: Como gerente de ventas, quiero un gráfico que contraste el porcentaje de uso de mis vehículos frente a mis competidores (ej. 45% BYD vs 20% Kia) para evaluar el market share en base a la movilidad real.
*   **US-4.3**: Como ingeniero de producto automotriz, quiero visualizar patrones de rutas frecuentes de los dueños de mis vehículos para sugerir puntos óptimos de carga exclusiva o concesionarios de servicio técnico.

---

## 5. Recomendaciones para la Reingeniería

Si se plantea reconstruir o escalar la plataforma, se deben considerar los siguientes puntos técnicos de reingeniería:

1.  **Migración Completa de Estilos (UI/UX)**:
    Actualmente el sistema mezcla estilos *inline* (ej. `style={{ display: 'flex' }}`), CSS en strings inyectados (ej. `<style>`) y algo de Tailwind. En la reingeniería, debe abstraerse todo hacia componentes estandarizados UI usando TailwindCSS puro o una librería como `shadcn/ui` o `Radix`.
2.  **Gestión Global de Estado**:
    En `page.tsx`, todo el estado (`soc`, `selectedVehicle`, `routePoints`, `tripPlan`, `isNavigating`, etc.) vive a nivel superior, lo que provoca re-renderizados masivos. Se debe implementar `Zustand` o `Redux Toolkit` para separar los estados de "Planificación" y "Navegación en vivo".
3.  **Desacoplamiento de Servicios Geográficos**:
    La dependencia dura con Mapbox está distribuida entre los componentes (ej. `RouteSearch.tsx` llama a `fetch` a mapbox, `RouteMap.tsx` inicia MapboxGL). Se recomienda usar el Patrón Repository (Patrón de Capas) abstrayendo el proveedor de mapas en un Contexto para poder intercambiar Mapbox por Google Maps o HereMaps sin romper la UI.
4.  **Optimización del Manejo en Tiempo Real (GPS)**:
    El watcher de GPS actual actualiza el estado local y repinta el DOM rápidamente. Se debe mover el control del marcador GPS (`gpsMarkerRef`) fuera del ciclo de vida de React (usando `useRef` para actualizar la instancia GL sin desencadenar un re-render global del componente de React).
5.  **Offline-first y PWA**:
    La navegación se corta en zonas de montaña en Ecuador (sin cobertura 4G/5G). La reingeniería debe estructurarse como PWA (Progressive Web App) apoyándose en Service Workers y un caché agresivo para Mapbox GL para mantener la ruta activa incluso si se cae el internet.
6.  **Migración de Algoritmo de Elevación a WebAssembly**:
    Si el `energy-core` se vuelve más complejo calculando la física (peso, clima, fricción de neumáticos) sobre arrays masivos de puntos GPS en milisegundos, su lógica podría convertirse en Rust y transpilarse a WebAssembly (Wasm) para el frontend, o pasarse a Supabase Edge Functions.
