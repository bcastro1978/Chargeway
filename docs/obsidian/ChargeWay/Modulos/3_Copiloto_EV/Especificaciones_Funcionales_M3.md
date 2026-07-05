# Especificaciones Funcionales - Copiloto EV

## Física y Consumo
- `Consumo Base:` (Batería utilizable / Autonomía WLTP) * 100 (kWh/100km).
- `Penalidad de Subida:` 0.25 kWh por cada 100 metros de ascenso neto acumulado.
- `Beneficio de Bajada:` Se ignora parcialmente para cálculos conservadores, asumiendo que la regeneración nunca es 100% eficiente (solo compensa parte del arrastre).

## Generación de Segmentos (Tips)
La ruta se divide en segmentos dependiendo de la pendiente:
- `Subida Fuerte` (> 4% inclinación)
- `Bajada Leve / Fuerte` (< -2% inclinación)
- `Plano - Eficiente` (entre -2% y 4%)
