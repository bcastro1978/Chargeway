# Especificaciones Técnicas - Usuario y Destinos

## Archivos Clave
- `src/components/Dashboard/FavoriteAliasModal.tsx`
- `src/components/Dashboard/DeleteFavoriteModal.tsx`
- `src/lib/services/supabase.ts`: Funciones `getFavoriteLocations`, `addFavoriteLocation`, `deleteFavoriteLocation`.
- Integración en `page.tsx`: Hook `useEffect` escucha cambios de sesión para recargar los favoritos.
