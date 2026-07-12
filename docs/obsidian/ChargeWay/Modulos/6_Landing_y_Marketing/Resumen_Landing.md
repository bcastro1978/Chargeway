---
tags:
  - arquitectura
  - marketing
  - ux_ui
  - lead_generation
---

# Resumen: Landing Page y Marketing

## Objetivo
Atraer a propietarios de vehículos a combustión y futuros usuarios de vehículos eléctricos, resolver sus dudas y convertirlos en "Leads" mediante una calculadora interactiva de ahorro.

## Arquitectura de Rutas
- `/`: Landing Page promocional.
- `/app`: Planificador de rutas original y dashboard de ChargeWay.

## Componentes Clave
1. **HeroSection**: Engancha al usuario con una propuesta de valor fuerte (diseño limpio y profesional).
2. **FeaturesSection**: Resalta lo que hace especial a la plataforma.
3. **SavingsCalculator (Calculadora de Ahorro)**: Herramienta CRO interactiva. Convierte datos de rutas (km/día) en ahorros monetarios para incentivar la compra de un VE.
4. **EducationSection**: Rompe las objeciones más comunes (mitos sobre el desgaste de batería en subidas, tiempos de carga, etc.) a través de copywriting psicológico.

## Modelo de Datos (Leads)
Tabla `leads` en Supabase:
- `id`: UUID (PK)
- `name`: Nombre del contacto
- `contact_info`: Email o Teléfono
- `daily_km`: Kilómetros que recorre al día (usado para calcular ahorro)
- `brand_interest`: Marca de VE que le interesó
- `model_interest`: Modelo de VE
- `created_at`: Fecha de creación

## Flujo de Datos
1. Usuario interactúa con `SavingsCalculator` en frontend.
2. Hace clic en "Mayor información" y llena `LeadForm`.
3. Envío POST a `/api/leads`.
4. El backend usa Supabase Service Role para insertar los datos en la tabla `leads` (saltándose restricciones RLS de usuarios anónimos).
