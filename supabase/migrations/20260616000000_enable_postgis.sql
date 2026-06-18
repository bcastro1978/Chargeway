-- Activar PostGIS para consultas espaciales (geográficas)
create extension if not exists postgis;

-- Modificar la tabla 'chargers' si existe, o simular su creación
CREATE TABLE IF NOT EXISTS public.chargers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    potencia_kw NUMERIC,
    lat NUMERIC,
    lng NUMERIC
);

-- Agregar la columna 'location_geom' tipo Point para PostGIS
ALTER TABLE public.chargers ADD COLUMN IF NOT EXISTS location_geom geometry(Point, 4326);

-- Función para mantener sincronizado lat/lng con location_geom si se inserta por coordenadas clásicas
CREATE OR REPLACE FUNCTION sync_charger_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.location_geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS charger_geom_trigger ON public.chargers;
CREATE TRIGGER charger_geom_trigger
BEFORE INSERT OR UPDATE OF lat, lng
ON public.chargers
FOR EACH ROW
EXECUTE FUNCTION sync_charger_geom();

-- Función RPC para que el cliente (o Edge Function) la llame pasando el GeoJSON de la ruta
-- y devuelva los cargadores que se encuentren a menos de 'radius_meters' de distancia de la polilínea.
CREATE OR REPLACE FUNCTION get_chargers_along_route(
  route_geojson JSON,
  radius_meters FLOAT DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  potencia_kw NUMERIC,
  lat NUMERIC,
  lng NUMERIC,
  distancia_metros FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.nombre,
    c.potencia_kw,
    c.lat,
    c.lng,
    ST_Distance(c.location_geom::geography, ST_GeomFromGeoJSON(route_geojson)::geography) as distancia_metros
  FROM 
    public.chargers c
  WHERE 
    ST_DWithin(
      c.location_geom::geography, 
      ST_GeomFromGeoJSON(route_geojson)::geography, 
      radius_meters
    )
  ORDER BY distancia_metros ASC;
END;
$$ LANGUAGE plpgsql;
