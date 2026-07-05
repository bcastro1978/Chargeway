# Especificaciones Funcionales - Orquestador de Carga

## Filtro de Conectores (Compatibilidad)
- `CCS2 / CCS1`: Mapeado a `ccs`, `combo`, `cs2`, `cs1`.
- `Type 2`: Mapeado a `type2`, `tipo2`, `ac`.
- `GB/T`: Mapeado a `gbt`, `chino`.

## Rango Seguro y Tolerancias
- **Margen de Seguridad:** Se reserva estrictamente el **12%** de la autonomía WLTP calculada para evitar quedarse varado.
- **Límite Alcanzable:** `reachableLimit = initialRangeKm * 0.88`.
- **Radio de Búsqueda Interna:** 30 km a la redonda de la polilínea (para viajes largos).
- **Radio de Búsqueda Visual ("En Ruta"):** 5 km a la redonda.
