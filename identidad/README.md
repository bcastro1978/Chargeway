# Kit Oficial de Identidad de Marca — ChargeWay Ecuador
*Plataforma Integral de Recursos de Marca, Diseño, Publicidad y Merchandising*

Bienvenido al repositorio maestro de identidad de **ChargeWay Ecuador**. Este espacio contiene todos los lineamientos estratégicos, archivos vectoriales originales, capturas de pantalla de alta fidelidad, fondos y texturas, paletas cromáticas, tokens de diseño y blueprints de producción para el ecosistema ChargeWay.

---

## 📁 Estructura del Directorio `identidad/`

```
identidad/
│
├── 📄 README.md                                  # Índice general del Kit de Marca y Guía de Navegación
├── 📄 MANUAL_DE_MARCA.md                         # Brand Book integral: Filosofía, Logotipo, Colores, Tipografías y UI
├── 📄 GUIA_CAMPANAS_PUBLICIDAD.md                # Estrategia de Go-to-Market, Copys, Guiones para Video Ads y Vallas
├── 📄 GUIA_MERCHANDISING.md                      # Fichas técnicas de producción de Merchandising, Tarjetas RFID y Tótem
│
├── 📂 logos/                                     # Logotipos vectoriales en formato SVG y PNG Master
│   ├── logo_principal_color.svg                  # Versión oficial horizontal para fondos oscuros (Web & App)
│   ├── logo_principal_light.svg                  # Versión horizontal para fondos claros, facturas e imprenta
│   ├── logo_simbolo_icono.svg                    # Isotipo independiente (Pin GPS + Rayo Neón + Carretera)
│   ├── logo_badge_app.svg                        # Ícono squircle oficial con bisel metálico para Apps móviles
│   ├── logo_monocromo_blanco.svg                 # Versión blanca pura (serigrafía, bordados, fondos sólidos)
│   ├── logo_monocromo_negro.svg                  # Versión negra pura (papelería legal, sellos, offset a 1 tinta)
│   ├── logo_partner_hosts.svg                    # Submarca oficial "ChargeWay Partner / Red Anfitriones"
│   ├── favicon.svg                               # Favicon vectorial optimizado para navegadores
│   └── logo_original.png                         # Master PNG original 1024x1024
│
├── 📂 capturas/                                  # Capturas de pantalla e interfaces de alta resolución
│   ├── INDEX_CAPTURAS.md                         # Catálogo descriptivo con resoluciones y casos de uso
│   ├── 01_dashboard_desktop_hud.png              # UI Desktop completa con mapa, telemetría y Copiloto Andrea AI
│   ├── 02_mobile_app_in_cockpit.png              # App móvil en cabina de auto eléctrico (Tranquility Index)
│   ├── 03_mobile_trip_planner_topo.png           # Planificador Quito ➔ Cuenca con perfil altimétrico en mano
│   ├── 04_scrollytelling_landing.png             # Landing page con scrollytelling de corredores turísticos
│   ├── 05_bento_grid_topografia.png              # Módulo de física de altimetría y regeneración gravitatoria
│   ├── 06_bento_grid_estaciones.png              # Módulo de mapa de 200+ electrolineras nacionales
│   ├── 07_bento_grid_pwa.png                     # Módulo de funcionamiento offline y aplicación PWA
│   └── 08_host_sustainability_model.png          # Panel financiero y simulador de anfitriones ARCONEL
│
├── 📂 fondos_y_texturas/                         # Fondos gráficos vectoriales, gradientes y paisajes
│   ├── INDEX_FONDOS.md                           # Guía técnica de aplicación para web, slides y publicidad
│   ├── bg_hud_cyber_grid.svg                     # Grilla cibernética HUD con telemetría de coordenadas
│   ├── bg_topografia_curvas_nivel.svg            # Curvas de nivel topográficas andinas y corredor E35
│   ├── bg_mesh_electric_glow.svg                 # Malla neón difusa en gradiente suave (Cyan & Lime)
│   ├── bg_circuito_recarga_patron.svg            # Patrón repetible (*seamless*) de circuitos de alta potencia
│   ├── textura_carbon_fiber.svg                  # Textura de fibra de carbono aeroespacial 2x2 twill
│   ├── foto_cotopaxi_sunset.jpg                  # Fotografía del Volcán Cotopaxi al atardecer
│   ├── foto_costa_spondylus.png                  # Fotografía de la Ruta del Spondylus
│   ├── foto_oriente_amazon.png                   # Fotografía de la selva y carreteras amazónicas
│   └── foto_hero_porsche_taycan.png              # Fotografía de auto eléctrico en curva de montaña
│
├── 📂 paleta_y_estilos/                          # Tokens de diseño, CSS y muestra de color
│   ├── tokens.json                               # Design tokens en formato JSON (Figma, Tailwind, React)
│   ├── estilos_identidad.css                     # CSS listo para importar con variables, botones y efectos HUD
│   └── swatch_paleta_colores.svg                 # Tablero gráfico con códigos HEX, RGB, CMYK y Pantone
│
└── 📂 merchandising_y_publicidad/                # Blueprints vectoriales y renders fotorrealistas
    ├── mockup_tarjeta_rfid.svg                   # Blueprint vectorial de la tarjeta física contactless
    ├── mockup_sticker_anfitrion_qr.svg           # Vinilo adhesivo para establecimientos y electrolineras
    ├── mockup_valla_publicitaria_ooh.svg         # Valla publicitaria de carretera Panamericana (1200x600)
    ├── mockup_post_instagram_lanzamiento.svg     # Plantilla cuadrada para posts de Instagram (1080x1080)
    ├── mockup_story_instagram_lanzamiento.svg    # Plantilla vertical para Stories / Reels / TikTok (1080x1920)
    ├── mockup_totem_estacion.svg                 # Señalética vertical monolítica con display LED
    ├── mockup_merchandising_render.jpg           # Render fotorrealista de kit completo de merchandising
    └── mockup_valla_publicitaria_render.jpg      # Render fotográfico de valla publicitaria en autopista andina
```

---

## 🎨 Resumen Rápido de Paleta de Color

| Tono | HEX | RGB | Pantone | Función |
| :--- | :--- | :--- | :--- | :--- |
| **Electric Cyan** | `#00D2FF` | `0, 210, 255` | PMS 298 C | Botones de acción, rutas en mapa, iluminación neón HUD. |
| **Cyber Lime** | `#00F5A0` | `0, 245, 160` | PMS 802 C | Batería óptima, energía, regeneración gravitatoria andina. |
| **Deep Space** | `#070B12` | `7, 11, 18` | PMS Black 6 C | Fondo oscuro oficial de la plataforma e interfaces. |
| **Partner Emerald** | `#10B981` | `16, 185, 129` | PMS 7723 C | Submarca de Anfitriones y ganancias de parqueaderos. |
| **Caution Amber** | `#F59E0B` | `245, 158, 11` | PMS 137 C | Alerta de batería baja (<20%) y paradas obligatorias. |
| **Critical Crimson** | `#EF4444` | `239, 68, 68` | PMS 1788 C | Batería crítica (<10%) o cargador inoperativo. |

---

## 🔤 Tipografías Oficiales

- **Titulares y Display:** [Syne](https://fonts.google.com/specimen/Syne) (`font-weight: 800 / 900`, `letter-spacing: -0.035em`).
- **Cuerpo y UI:** [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) (`font-weight: 400 / 500 / 600 / 700`).
- **Telemetría y HUD:** [Space Mono](https://fonts.google.com/specimen/Space+Mono) (`font-weight: 700`, `letter-spacing: 0.15em`, mayúsculas).

---

## 🚀 Cómo Utilizar este Kit

1. **Para Crear Páginas Web o Nuevas Vistas:**
   - Importa [`paleta_y_estilos/estilos_identidad.css`](file:///c:/PERSONAL/IA/ChargeWay/identidad/paleta_y_estilos/estilos_identidad.css) o integra los tokens desde [`paleta_y_estilos/tokens.json`](file:///c:/PERSONAL/IA/ChargeWay/identidad/paleta_y_estilos/tokens.json).
   - Utiliza [`logos/logo_principal_color.svg`](file:///c:/PERSONAL/IA/ChargeWay/identidad/logos/logo_principal_color.svg) para la barra de navegación superior.
   - Aplica fondos desde [`fondos_y_texturas/`](file:///c:/PERSONAL/IA/ChargeWay/identidad/fondos_y_texturas/) para dar profundidad visual tecnológica.

2. **Para Lanzar Campañas Publicitarias:**
   - Consulta los copys y guiones en [`GUIA_CAMPANAS_PUBLICIDAD.md`](file:///c:/PERSONAL/IA/ChargeWay/identidad/GUIA_CAMPANAS_PUBLICIDAD.md).
   - Utiliza las plantillas en [`merchandising_y_publicidad/`](file:///c:/PERSONAL/IA/ChargeWay/identidad/merchandising_y_publicidad/) para anuncios en Instagram, TikTok, LinkedIn y vallas de carretera.

3. **Para Producir Merchandising y Señalética:**
   - Sigue las especificaciones técnicas en [`GUIA_MERCHANDISING.md`](file:///c:/PERSONAL/IA/ChargeWay/identidad/GUIA_MERCHANDISING.md).
   - Envía los vectores SVG de [`merchandising_y_publicidad/`](file:///c:/PERSONAL/IA/ChargeWay/identidad/merchandising_y_publicidad/) a los proveedores de impresión y confección textil.
