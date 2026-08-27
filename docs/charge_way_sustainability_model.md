# Modelo de Reserva de Estacionamiento para Vehículos Eléctricos (EV), Monetización por Volumen y Sostenibilidad SaaS - ChargeWay Ecuador

Este documento establece la arquitectura operativa, el marco legal y regulatorio de Ecuador, el esquema de monetización por volumen con saldo prepagado y las ecuaciones matemáticas del backend para la plataforma SaaS **ChargeWay**.

---

## 1. Arquitectura Operativa y Funcional

ChargeWay se define como un **sistema de intermediación tecnológica y gestión de espacios físicos de parqueo** equipados con puntos de carga para vehículos eléctricos (EV).

```mermaid
graph TD
    A[Conductor EV] -->|1. Solicitud Reserva por Horas| B[Plataforma SaaS ChargeWay]
    C[Anfitrión / Dueño Parqueo] <-->|2. Habilitación con Saldo Prepagado / Disponibilidad| B
    B --> D[Calculadora de Energía Ec & ΔSoC%]
    B --> E[Módulo de Compliance Tarifario ARCONEL]
    B --> H[Motor de Volumen & Wallet Prepagado]
    D -->|Ec = P x t x 0.88| F[Estimación kWh & ΔSoC%]
    E -->|Tareq <= Lmax| G[Verificación vs Topes Legales]
    H -->|N <= 5: $0 | N >= 6: 20%| I[Débito Automático del Saldo Prepagado]
```

### Flujo Operativo:
1. **Gestión de Disponibilidad y Habilitación por el Anfitrión:**
   - Registro de parqueo con potencia nominal (3.7 kW AC hasta 50 kW DC).
   - Configuración de horario de disponibilidad y tarifa por hora de parqueo.
   - Habilitación del parqueadero mediante compra/recarga de **saldo prepagado** (billetera digital de anfitrión).
2. **Reserva por Horas por el Conductor:**
   - Geolocalización en app, selección de bloque horario y envío de solicitud.
   - Confirmación directa por parte del anfitrión y generación de pase digital QR.
3. **Cálculo Matemático Referencial de Carga:**
   - Cálculo de la energía estimada transferida ($E_c$) y del incremento en el porcentaje de batería ($\Delta SoC\%$).
4. **Módulo de Compliance Regulatorio:**
   - Verificación automática de la tarifa equivalente en USD/kWh ($Tar_{eq} \le L_{max}$).
   - Bloqueo preventivo de tarifas que superen los topes de ARCONEL para evitar sanciones por especulación.
5. **Liquidación de Comisión por Volumen:**
   - Las primeras 5 reservas del mes para cada punto son **100% gratuitas** ($0 comisión).
   - A partir de la reserva #6 del mes, se liquida el **20% sobre la ganancia del anfitrión**, debitándose automáticamente del saldo prepagado.

---

## 2. Marco de Viabilidad Legal en Ecuador

- **Exención de Comercialización de Energía (LOSPEE):** La SaaS es estrictamente un servicio de información y reservas de estacionamiento. No comercializa ni vende directamente electricidad, liberando a la plataforma del requisito de título habilitante de comercialización bajo la Ley Orgánica del Servicio Público de Energía Eléctrica (LOSPEE).
- **Alineación Municipal:** Inspirado en modelos públicos en Ecuador (ej. parqueaderos EPMMOP en Quito), donde se cobra por el espacio físico de estacionamiento y el punto eléctrico es un servicio atado al espacio.
- **Responsabilidad Delegada (ARCERNNR-003/20):** Los Términos y Condiciones (T&C) delegan la obligación al anfitrión de poseer un medidor dedicado exclusivo y Contrato de Comercialización con la empresa distribuidora (CNEL EP / EEQ).

---

## 3. Esquema de Monetización SaaS por Volumen y Saldo Prepagado

ChargeWay basa su modelo de monetización en el uso efectivo y volumen de transacciones:

1. **Cuota Gratuita Mensual por Punto de Parqueo:**
   - Cada punto de parqueo registrado cuenta con **5 reservas mensuales libres de comisión** ($0.00 USD).
   - Facilita la adopción sin fricción de nuevos anfitriones y pequeños comercios.

2. **Comisión por Volumen (20% a partir de la 6ª Reserva / Hora):**
   - A partir de la reserva mensual número 6 ($N_{res} \ge 6$), ChargeWay cobra una **comisión del 20%** calculada sobre el valor de la ganancia neta o precio cobrado por el anfitrión.
   
3. **Mecanismo de Saldo Prepagado (*Prepaid Host Balance / Wallet*):**
   - El dueño del parqueadero adquiere saldo prepagado (paquetes sugeridos de $10, $25, $50, $100 USD) para mantener activos sus puntos de parqueo.
   - Cada reserva comisionable (desde la 6ª) descuenta en tiempo real el 20% del saldo prepagado.
   - **Control de Disponibilidad:** Si el saldo llega a $0.00 USD y la cuota gratuita mensual está agotada, el parqueadero pasa a estado pausado hasta que el anfitrión realice una recarga.

4. **Tarifa por Gestión de Reserva al Conductor (Booking Fee):** Cobro digital administrativo menor ($0.50 USD) al conductor al confirmar una reserva.
5. **Módulo de Publicidad Geolocalizada:** Anuncios patrocinados de comercios, restaurantes u hoteles cercanos al punto de carga.

---

## 4. Ecuaciones Matemáticas del Backend

### A. Energía Entregada a la Batería ($E_c$)
$$E_c = P \times t \times \eta_{sys}$$
- $E_c$: Energía neta en kWh.
- $P$: Potencia nominal del cargador en kW.
- $t$: Tiempo reservado en horas.
- $\eta_{sys} = 0.88$ (88% eficiencia contemplando disipación térmica, cableado y BMS).

### B. Incremento del Porcentaje de Carga ($\Delta SoC\%$)
$$\Delta SoC(\%) = \left( \frac{E_c}{Cap_{bat}} \right) \times 100$$
- $Cap_{bat}$: Capacidad total de la batería del EV (30 kWh a 65 kWh en el mercado ecuatoriano).

### C. Control de Cumplimiento ARCONEL y Tope Tarifario
$$Tar_{eq} = \frac{\text{Precio del Parqueo por Hora (USD)}}{P} \le L_{max} \text{ (USD/kWh)}$$
$$\text{Precio Máximo por Hora (USD)} = P \times L_{max}$$

### D. Rentabilidad Neta para el Anfitrión ($R_s$)
$$R_s = E_c \times (Tar_v - \eta_{sys} Tar_c)$$
- $Tar_v$: Tarifa cobrada equivalente en USD/kWh ($Tar_v \le L_{max}$).
- $Tar_c$: Tarifa de adquisición pagada a CNEL EP / EEQ ($0.05$ Madrugada; $0.08$ Diurno; $0.10$ Punta).

### E. Ecuación de Comisión por Volumen ($Com$)
$$\text{Comisión}(N) = \begin{cases} 0.00 & \text{si } N \le 5 \text{ (Cuota Gratuita)} \\ 0.20 \times R_s & \text{si } N \ge 6 \text{ (Comisión del 20\%)} \end{cases}$$

### F. Actualización del Saldo Prepagado ($Saldo_{post}$)
$$Saldo_{post} = Saldo_{prev} - \text{Comisión}$$

---

## 5. Matriz de Parámetros ARCONEL (Resolución Nro. ARCONEL-029/25)

| Tipo de Cargador | Potencia Nominal ($P$) | Límite ARCONEL ($L_{max}$) | Energía Entregada en 1h ($E_c$) | Tope Máximo Legal por Hora |
| :--- | :--- | :--- | :--- | :--- |
| **Modo 2 / 3 AC** | 3.7 kW | $0.1715 /kWh | 3.26 kWh | **$0.63 USD/hora** |
| **Modo 3 AC Monofásico** | 7.0 kW | $0.1715 /kWh | 6.16 kWh | **$1.20 USD/hora** |
| **Modo 3 AC Domiciliario** | 10.0 kW | $0.1715 /kWh | 8.80 kWh | **$1.71 USD/hora** |
| **Modo 3 AC Comercial** | 14.0 kW | $0.1715 /kWh | 12.32 kWh | **$2.40 USD/hora** |
| **Modo 3 AC Trifásica** | 22.0 kW | $0.1715 /kWh | 19.36 kWh | **$3.77 USD/hora** |
| **Modo 3 AC Rápida** | 43.0 kW | $0.1994 /kWh | 37.84 kWh | **$8.57 USD/hora** |
| **Modo 4 DC Ultra-rápida** | 50.0 kW | $0.2851 /kWh | 44.00 kWh | **$14.25 USD/hora** |

---

## 6. Código de Referencia

El motor completo se encuentra implementado en el repositorio de ChargeWay:
- **Tipos TypeScript:** [`src/types/sustainability.ts`](file:///c:/PERSONAL/IA/ChargeWay/src/types/sustainability.ts) y [`src/types/partner.ts`](file:///c:/PERSONAL/IA/ChargeWay/src/types/partner.ts)
- **Motor de Cálculo, Volumen & Wallet:** [`src/lib/sustainability-core.ts`](file:///c:/PERSONAL/IA/ChargeWay/src/lib/sustainability-core.ts)
- **Harness de Pruebas Integradas:** [`scratch/test_sustainability.ts`](file:///c:/PERSONAL/IA/ChargeWay/scratch/test_sustainability.ts)
