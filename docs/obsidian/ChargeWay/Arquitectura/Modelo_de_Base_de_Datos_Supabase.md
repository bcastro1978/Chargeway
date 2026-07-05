# Modelo de Base de Datos Supabase

El backend de ChargeWay corre sobre **Supabase** (PostgreSQL).

## Esquema Fase 1
- **Tabla:** `chargers`
  - `id` (UUID)
  - `name` (Text)
  - `lat` (Float)
  - `lng` (Float)
  - `tipo_cargador` (Text) - Ejemplo: "CCS2, Type 2"
  - `velocidad` (Text)
  - `estado` (Text)

- **Tabla:** `favorite_locations`
  - `id` (UUID)
  - `user_id` (UUID, References auth.users)
  - `alias` (Text)
  - `address` (Text)
  - `lat` (Float)
  - `lng` (Float)
  - `created_at` (Timestamptz)

*(Para tablas de Fase 2, referirse a la rama secundaria)*
