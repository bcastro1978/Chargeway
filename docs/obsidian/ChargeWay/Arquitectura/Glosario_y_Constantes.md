# Glosario y Constantes Globales

## Glosario
- **SoC (State of Charge):** Nivel de carga de la batería en porcentaje (%).
- **WLTP (Worldwide Harmonised Light Vehicles Test Procedure):** Estándar realista de medición de autonomía.
- **CLTC / NEDC:** Estándares chinos/antiguos de medición (optimistas). Requieren reducción del 15% para asimilarse al WLTP.
- **Regeneración (Regen):** Capacidad del motor eléctrico para invertir polaridad y recargar la batería en bajadas o frenados.

## Constantes
- `NEAR_KM`: **5 km** (Radio para detectar un cargador "En Ruta" y pintarlo de amarillo en el UI).
- `SEARCH_RADIUS_KM`: **30 km** (Radio del orquestador interno para cruce con electrolineras).
- `SAFETY_BUFFER_PERCENT`: **12%** (Margen intocable de autonomía calculado antes de forzar parada).
- `MAX_FAVORITES_STANDARD`: **5** (Límite de guardado).
