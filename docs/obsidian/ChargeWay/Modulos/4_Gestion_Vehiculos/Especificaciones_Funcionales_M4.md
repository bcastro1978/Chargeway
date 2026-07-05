# Especificaciones Funcionales - Gestión de Vehículos

## Normalización de Autonomías (NEDC/CLTC -> WLTP)
- Cuando el fabricante provee autonomías en ciclo CLTC o NEDC, el sistema realiza una conversión automática:
  - `WLTP = Rango Comercial * 0.85`
- Esto asegura que las predicciones sean siempre realistas y seguras.

## Marcas Soportadas (Actualmente)
- BYD (Yuan Plus, Dolphin, Seagull, etc)
- Chery (eQ7)
- Dongfeng (Nammi 06, S7 EV)
- *Lista expansible por JSON o Supabase (Phase 2).*
