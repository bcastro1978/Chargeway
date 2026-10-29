# ChargeWay Ecuador — Landing Page Oficial
*Documentación Técnica, Manual de Estilo y Guía de Despliegue // Estándar Ruva Web Pro*

---

## 1. Estructura del Proyecto

```text
landing/
├── index.html                   # Página principal de aterrizaje (HTML5 semántico)
├── direccion-de-arte.html       # Hoja de muestra interactiva aprobada
├── css/
│   └── estilos.css              # Sistema de diseño, tokens, animaciones y responsive
├── js/
│   └── main.js                  # Lógica de interacción, ScrollTrigger y scroll Lenis
├── vendor/                      # Librerías en versiones exactas (sin dependencias externas)
│   ├── gsap.min.js              # GSAP 3.13.0
│   ├── ScrollTrigger.min.js      # GSAP ScrollTrigger 3.13.0
│   ├── SplitText.min.js          # GSAP SplitText 3.13.0
│   └── lenis.min.js             # Lenis Scroll 1.3.11
├── img/                         # Recursos gráficos, logotipos, fondos y capturas
│   ├── logo_original.png        # Logotipo oficial (Squircle relieve metálico con rayo y vía)
│   ├── favicon.svg              # Isotipo vectorial de navegador
│   ├── foto_hero_porsche_taycan.png
│   ├── foto_cotopaxi_sunset.jpg
│   ├── bg_topografia_curvas_nivel.svg
│   └── ...
└── LEEME.md                     # Esta guía técnica de mantenimiento
```

---

## 2. Dirección de Arte Aprobada: Cyber Andino de Alto Rendimiento

### 2.1 Concepto Visual
Combina la precisión instrumental y aeroespacial de una cabina de auto eléctrico contemporáneo con la topografía andina del Ecuador. La iluminación neón cian y lima sobre el fondo *Deep Midnight Space* evoca la conducción nocturna en la carretera Panamericana E35 con total serenidad y certeza energética.

### 2.2 Sistema Cromático y Roles
| Rol del Color | Token CSS | HEX Oficial | Función en Interfaz | Contraste WCAG |
| :--- | :--- | :--- | :--- | :--- |
| **Acción / Primario** | `--brand`, `--cta` | `#00D2FF` | Botones de acción, enlaces, rutas activas, iluminación HUD | AA (4.5:1+) |
| **Texto sobre Acción** | `--cta-ink` | `#070B12` | Texto oscuro de máxima legibilidad sobre botones cyan/lime | AAA (14.2:1) |
| **Energía / Regeneración**| `--energy` | `#00F5A0` | Batería óptima, kWh recuperados en bajada, telemetría activa | AA |
| **Fondo Institucional** | `--bg` | `#070B12` | Fondo Deep Midnight Space (optimizado para pantallas OLED) | Base |
| **Superficie HUD** | `--surface-elevated` | `rgba(15,23,42,0.82)` | Tarjetas con desenfoque de cristal líquido (*backdrop-filter*) | - |
| **Submarca Partner** | `--partner` | `#10B981` | Anfitriones comerciales, exención LOSPEE, cálculo de retorno | AA |
| **Alerta / Precaución** | `--caution` | `#F59E0B` | Aviso de pendiente pronunciada o SoC < 20% | AA |

### 2.3 Tipografías
- **Display / Titulares:** `Syne` (Pesos 800 ExtraBold y 900 Black) con `letter-spacing: -0.04em`.
- **Lectura / UI:** `Space Grotesk` (Pesos 400 Regular, 500 Medium, 700 Bold) para textos explicativos y navegación.
- **Telemetría / HUD:** `Space Mono` (Pesos 400 y 700) para coordenadas, porcentajes SoC, altitud msnm y métricas.

### 2.4 Ficha Técnica de Movimiento (Tokens M)
```javascript
const M = {
  ease: 'power3.out',       // Curva de entrada precisa sin rebotes agresivos
  easeIO: 'power2.inOut',   // Transiciones suaves entre estados
  pop: 'back.out(1.4)',     // Asentamiento elástico sutil para insignias
  dur: 0.85,                // Duración base en segundos
  stagger: 0.08,            // Escalonado en cascada entre elementos
  dist: 24,                 // Recorrido vertical en píxeles
  lerp: 0.1                 // Inercia de scroll en Lenis
};
```

---

## 3. Arquitectura de Secciones y Copywriting (SEO & GEO)

1. **Cabecera Institucional:** Logo oficial `logo_original.png`, telemetría de red activa (+300 estaciones), navegación por anclas y botón responsive ("PLANIFICAR" en móvil / "PLANIFICA TU VIAJE GRATIS" en escritorio).
2. **Hero / Portada:** Promesa de tranquilidad andina, widget selector interactivo con física de pendientes y botón CTA que conecta a `https://chargeway.vercel.app/`.
3. **Cintillo de Cobertura Nacional:** Métricas de validación en 24 provincias y norma ARCONEL.
4. **Motor Físico Andino & Regeneración Gravitatoria:** Gráfico interactivo animado de perfil altimétrico (cruce de páramo Cotopaxi a 3,680m y regeneración hacia Baños).
5. **Suite Tecnológica (Bento Grid 6 Módulos):**
   - Motor Físico Andino Real.
   - Red de +300 Estaciones Verificadas.
   - Copiloto AI por Voz (manos libres).
   - Tranquility Index (colchón 15-20% y prevención de déficit).
   - Modo PWA Offline (navegación sin señal móvil en páramos).
   - ChargeWay Host Partner (monetización bajo ARCONEL).
6. **Comparativa Diferencial:** Tabla de cabina técnica frente a Google Maps / Waze y apps genéricas.
7. **Red Partner Anfitriones (B2B):** Modelo financiero para hoteles y parqueaderos bajo exención LOSPEE.
8. **Compatibilidad Multimarca:** Insignias de fabricantes EV en Ecuador (BYD, Kia, Hyundai, Tesla, Neta, etc.).
9. **Preguntas Frecuentes:** Acordeón nativo accesible (`<details>` y `<summary>`).
10. **Cierre de Portada:** Llamado final de alta conversión.
11. **Pie de Página (Footer):** Enlaces institucionales, marco regulatorio y créditos.
12. **Barra Fija en Celular:** Acceso con el pulgar que se oculta automáticamente al llegar al pie de página.

---

## 4. Auditoría Técnica Automatizada (Chrome Headless)

La página fue auditada con el script `revisar-sitio.mjs`:
- **Vista Celular (375 × 812 px):** 0 desbordes laterales (ancho exacto de 375 px), 0 contenidos ocultos, 0 errores de consola.
- **Vista Escritorio (1440 × 900 px):** Retícula balanceada, legibilidad impecable.
- **Compatibilidad `prefers-reduced-motion`:** Todo el contenido es accesible y estático si el usuario tiene activada la reducción de movimiento.
- **Respaldo No-JS:** Toda la página es perfectamente legible y funcional incluso con JavaScript deshabilitado.

---

## 5. Cómo Modificar o Personalizar

- **Cambiar enlace de la aplicación:** Reemplazar `https://chargeway.vercel.app/` en los botones de `index.html`.
- **Modificar cifras o métricas:** Los valores numéricos se editan directamente en el bloque `.metricas-strip` de `index.html`.
- **Añadir nuevas preguntas frecuentes:** Agregar un nuevo bloque `<details class="faq-item">` en la sección `#faq`.

---

## 6. Despliegue y Publicación

El proyecto es 100% estático (HTML, CSS y JS puro con librerías locales en `vendor/`):
- **Vercel / Netlify:** Se puede arrastrar directamente la carpeta `landing/` o integrarla como ruta pública en el repositorio de ChargeWay.
- **Hosting Tradicional (cPanel / Hostinger / Apache / Nginx):** Subir el contenido de `landing/` a la raíz pública (`public_html/`).
- **Cache Busting:** Se incluyó el parámetro de versión `?v=20261017a` en las hojas de estilo y scripts para forzar la actualización en navegadores de los visitantes.
