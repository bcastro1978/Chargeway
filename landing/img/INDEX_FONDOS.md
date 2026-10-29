# Guía de Fondos, Texturas y Recursos Fotográficos ChargeWay

Este directorio contiene los fondos vectoriales, texturas técnicas y fotografías de alta resolución del sistema visual de **ChargeWay**.

---

## 1. Fondos Vectoriales (.SVG)

| Archivo | Técnica / Estilo | Uso Principal |
| :--- | :--- | :--- |
| **`bg_hud_cyber_grid.svg`** | Cuadrícula isométrica y ortogonal + marcas HUD y telemetría de coordenadas GPS de Ecuador. | Secciones Hero de páginas web, banners tecnológicos, fondos de diapositivas en Keynote/PowerPoint. |
| **`bg_topografia_curvas_nivel.svg`** | Curvas de nivel topográficas vectoriales representando la cordillera de los Andes y la autopista E35. | Portadas de folletos, banners promocionales de viajes interprovinciales, fondos de infografías. |
| **`bg_mesh_electric_glow.svg`** | Malla difusa de luz neón (Cyan `#00D2FF`, Cyber Lime `#00F5A0`, Deep Space `#070B12`). | Fondos de newsletters, landing pages, banners para Google Display y pantallas de carga (Splash Screens). |
| **`bg_circuito_recarga_patron.svg`** | Patrón repetible (*seamless tile*) de conectores, líneas de alta tensión y microcircuitos. | Packaging de productos, reverso de tarjetas físicas, textiles técnicos y fondos decorativos sutiles. |
| **`textura_carbon_fiber.svg`** | Textura de fibra de carbono aeroespacial 2x2 twill weave de alto contraste. | Tarjetas RFID oficiales, bases de displays físicos, insignias PRO y merchandising premium. |

---

## 2. Fotografía de Paisajes y Automoción Ecuatoriana

ChargeWay celebra la geografía única de Ecuador como escenario del viaje eléctrico:

| Archivo | Sujeto / Ubicación | Emoción y Mensaje de Marca |
| :--- | :--- | :--- |
| **`foto_cotopaxi_sunset.jpg`** | Atardecer dorado sobre el Volcán Cotopaxi y la avenida de los volcanes. | Majestuosidad andina, libertad en carretera, conquista de la altitud sin emisiones. |
| **`foto_costa_spondylus.png`** | Ruta del Spondylus, acantilados costeros del Pacífico y carreteras abiertas. | Energía renovable, brisa marina, viajes placenteros y red de carga en playas. |
| **`foto_oriente_amazon.png`** | Exuberante vegetación de la Amazonía ecuatoriana con carreteras verdes. | Sostenibilidad pura, biodiversidad, protección del medio ambiente con movilidad cero emisiones. |
| **`foto_hero_porsche_taycan.png`** | Vehículo eléctrico de alto rendimiento en curva de montaña andina. | Tecnología de vanguardia, precisión, aceleración instantánea y disfrute de la conducción. |

---

## 3. Reglas de Aplicación Visual

1. **Jerarquía Visual y Legibilidad:**
   - Todo texto colocado sobre `bg_hud_cyber_grid.svg` o `bg_topografia_curvas_nivel.svg` debe mantener un contraste mínimo de **4.5:1** (WCAG AA). Si es necesario, aplicar una capa de viñeta oscura (`rgba(7, 11, 18, 0.75)`).
2. **Uso de Fondos Neón:**
   - La malla luminosa `bg_mesh_electric_glow.svg` debe reservarse para momentos de alto impacto emocional (Hero, botones destacados, llamadas a la acción principales). No saturar paneles de lectura densa.
3. **Escalabilidad de Patrones:**
   - El archivo `bg_circuito_recarga_patron.svg` está diseñado a 400×400 px con acoplamiento perfecto (*seamless*). Puede repetirse en CSS utilizando `background-repeat: repeat;`.
