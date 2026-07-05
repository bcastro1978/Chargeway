# Especificaciones Técnicas - Copiloto EV

## Archivos Clave
- `src/app/page.tsx`: Orquestación del estado `liveStats` y renderizado de la UI de recomendaciones.
- `EVCopilot.tsx`: Componente presentacional que renderiza los segmentos con iconos dinámicos.
- Lógica de resaltado: Utiliza `progressKm` para encontrar el índice del segmento activo haciendo `activeSegmentIndex = segments.findIndex(s => progressKm >= s.startKm && progressKm < s.endKm)`.
