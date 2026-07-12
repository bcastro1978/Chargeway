import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Waypoint } from '@/components/Dashboard/RouteSearch';
import { TripPlan, generateTripPlan } from '@/lib/route-orchestrator';
import { Vehicle } from '@/components/Dashboard/VehicleSelector';
import { geocodePlace } from '@/lib/services/mapbox';
import { supabase } from '@/lib/supabase';
import { ConsentChoices, TERMS_VERSION, PRIVACY_VERSION } from '@/components/Dashboard/ConsentModal';

interface TripState {
  globalVehicles: Vehicle[];
  isVehiclesLoading: boolean;
  selectedVehicle: Vehicle | null;
  soc: number;
  routePoints: Waypoint[];
  tripPlan: TripPlan | null;
  isLoadingPlan: boolean;
  isNavigating: boolean;
  isSimulating: boolean;
  mapFlyTo: { lat: number; lng: number } | null;
  user: any;
  isLoadingUser: boolean;
  needsConsent: boolean;          // true = show consent modal
  consentRecord: any | null;     // loaded from DB
  filterCompatibleChargers: boolean;
  setSelectedVehicle: (vehicle: Vehicle) => void;
  setSoc: (soc: number) => void;
  setFilterCompatibleChargers: (val: boolean) => void;
  setRoutePoints: (points: Waypoint[]) => void;
  setMapFlyTo: (coords: { lat: number; lng: number } | null) => void;
  setIsNavigating: (val: boolean) => void;
  setIsSimulating: (val: boolean) => void;
  planRoute: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  fetchGlobalVehicles: () => Promise<void>;
  saveTripToDatabase: () => Promise<void>;
  favoriteLocations: Waypoint[];
  currentDistance: number;
  setCurrentDistance: (val: number) => void;
  fetchFavorites: () => Promise<void>;
  addFavorite: (wp: Waypoint, originalAddress?: string) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  saveConsent: (choices: ConsentChoices) => Promise<void>;
  mapSelectionIndex: number | null;
  setMapSelectionIndex: (idx: number | null) => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
  globalVehicles: [],
  isVehiclesLoading: true,
  selectedVehicle: null,
  soc: 0.65,
  routePoints: [
    { id: 'origin', name: '', lat: 0, lng: 0 },
    { id: 'destination', name: '', lat: 0, lng: 0 }
  ],
  tripPlan: null,
  isLoadingPlan: false,
  isNavigating: false,
  isSimulating: false,
  mapFlyTo: null,
  favoriteLocations: [],
  currentDistance: 0,
  user: null,
  isLoadingUser: false,
  needsConsent: false,
  consentRecord: null,
  filterCompatibleChargers: true,
  mapSelectionIndex: null,

  setMapSelectionIndex: (idx) => set({ mapSelectionIndex: idx }),
  setCurrentDistance: (val) => set({ currentDistance: val }),
  setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle }),
  setSoc: (soc) => set({ soc }),
  setFilterCompatibleChargers: (val) => set({ filterCompatibleChargers: val }),
  setRoutePoints: (points) => set({ routePoints: points }),
  setMapFlyTo: (coords) => set({ mapFlyTo: coords }),
  setIsNavigating: (val) => set({ isNavigating: val }),
  setIsSimulating: (val) => set({ isSimulating: val }),

  planRoute: async () => {
    const { routePoints, selectedVehicle, soc } = get();

    // Need at least 2 named points
    const namedPoints = routePoints.filter(p => p.name.trim());
    if (namedPoints.length < 2) {
      set({ tripPlan: null, isLoadingPlan: false });
      return;
    }

    set({ isLoadingPlan: true });

    // Auto-geocode waypoints that have a name but no valid coordinates
    const resolved: Waypoint[] = await Promise.all(
      routePoints.map(async (p) => {
        if (p.name.trim() && p.lat === 0 && p.lng === 0) {
          const coords = await geocodePlace(p.name);
          if (coords) return { ...p, lat: coords.lat, lng: coords.lng };
        }
        return p;
      })
    );

    // CRITICAL: only update routePoints if coords actually changed to avoid re-render loop
    const coordsChanged = resolved.some(
      (p, i) => p.lat !== routePoints[i]?.lat || p.lng !== routePoints[i]?.lng
    );
    if (coordsChanged) {
      set({ routePoints: resolved });
    }

    const validPoints = resolved.filter(p => p.name && p.lat !== 0 && p.lng !== 0);
    if (validPoints.length < 2) {
      set({ tripPlan: null, isLoadingPlan: false });
      return;
    }

    const coords = validPoints.map(p => ({ lat: p.lat, lng: p.lng }));
    try {
      const plan = await generateTripPlan(coords, selectedVehicle.specs, soc);
      set({ tripPlan: plan, mapFlyTo: null });
    } catch (error) {
      console.warn('Could not plan trip:', error);
      set({ tripPlan: null });
    } finally {
      set({ isLoadingPlan: false });
    }
  },

  loginWithGoogle: async () => {
    const redirectToUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectToUrl,
      }
    });
    if (error) console.error('Error logging in:', error.message);
  },

  fetchGlobalVehicles: async () => {
    set({ isVehiclesLoading: true });
    try {
      const { data, error } = await supabase
        .from('vehicle_models')
        .select(`
          id, name, usable_battery_kwh, drag_coefficient, frontal_area_m2, 
          weight_kg, peak_charging_kw, wltp_range_km, charger_type, slug, 
          commercial_range_km, commercial_standard, certificado_wltp,
          vehicle_brands(name, logo_url)
        `)
        .eq('is_active', true)
        .order('name');
        
      if (error) throw error;
      
      const mappedVehicles: Vehicle[] = (data || []).map(row => ({
        id: row.slug || row.id,
        model: row.name,
        brand: (row.vehicle_brands as any)?.name || 'Unknown',
        photoUrl: (row.vehicle_brands as any)?.logo_url || undefined,
        specs: {
          usable_battery_kwh: row.usable_battery_kwh,
          wltp_range_km: row.wltp_range_km,
          drag_coefficient: row.drag_coefficient,
          frontal_area_m2: row.frontal_area_m2,
          weight_kg: row.weight_kg,
          peak_charging_kw: row.peak_charging_kw,
          charger_type: row.charger_type,
          commercial_range_km: row.commercial_range_km,
          commercial_standard: row.commercial_standard,
          certificado_wltp: row.certificado_wltp
        }
      }));
      
      // Sort primarily by brand, then by model
      mappedVehicles.sort((a, b) => {
        if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
        return a.model.localeCompare(b.model);
      });

      set({ globalVehicles: mappedVehicles, isVehiclesLoading: false });
      
      const { selectedVehicle } = get();
      if (!selectedVehicle && mappedVehicles.length > 0) {
        set({ selectedVehicle: mappedVehicles[0] });
      }
    } catch (error) {
      console.error('Error fetching global vehicles:', error);
      set({ isVehiclesLoading: false });
    }
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      set({ user: null });
    } else {
      console.error('Error logging out:', error.message);
    }
  },

  checkSession: async () => {
    set({ isLoadingUser: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          const loadedState: Partial<TripState> = { user: profile };
          
          // Query the user's primary vehicle in garage
          const { data: primaryVehicle } = await supabase
            .from('user_vehicles')
            .select(`
              is_primary,
              photo_url,
              vehicle_models!user_vehicles_vehicle_model_id_fkey (
                id, name, slug, usable_battery_kwh, drag_coefficient, 
                frontal_area_m2, weight_kg, peak_charging_kw, wltp_range_km, charger_type,
                vehicle_brands ( id, name )
              )
            `)
            .eq('user_id', session.user.id)
            .eq('is_primary', true)
            .maybeSingle();

          if (primaryVehicle && primaryVehicle.vehicle_models) {
            const dbModel = primaryVehicle.vehicle_models;
            loadedState.selectedVehicle = {
              id: dbModel.slug,
              brand: dbModel.vehicle_brands?.name || 'Genérico',
              model: dbModel.name,
              logo: '',
              photoUrl: primaryVehicle.photo_url || '',
              specs: {
                usable_battery_kwh: Number(dbModel.usable_battery_kwh),
                drag_coefficient: Number(dbModel.drag_coefficient),
                frontal_area_m2: Number(dbModel.frontal_area_m2),
                weight_kg: Number(dbModel.weight_kg),
                peak_charging_kw: Number(dbModel.peak_charging_kw),
                wltp_range_km: Number(dbModel.wltp_range_km),
                charger_type: dbModel.charger_type,
              }
            } as Vehicle;
          } else {
            const { data: lastTrip } = await supabase
              .from('trips')
              .select('vehicle_model, start_soc')
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (lastTrip && lastTrip.vehicle_model) {
              const { globalVehicles, fetchGlobalVehicles } = get();
              let vehicles = globalVehicles;
              if (vehicles.length === 0) {
                await fetchGlobalVehicles();
                vehicles = get().globalVehicles;
              }
              const foundVehicle = vehicles.find(v => `${v.brand} ${v.model}` === lastTrip.vehicle_model);
              if (foundVehicle) {
                loadedState.selectedVehicle = foundVehicle as Vehicle;
              } else if (vehicles.length > 0) {
                loadedState.selectedVehicle = vehicles[0];
              }
              if (lastTrip.start_soc !== null && lastTrip.start_soc !== undefined) {
                loadedState.soc = Number(lastTrip.start_soc);
              }
            } else {
              const vehicles = get().globalVehicles;
              if (vehicles.length > 0) loadedState.selectedVehicle = vehicles[0];
            }
          }
          
          set(loadedState);

          const { data: existingConsent } = await supabase
            .from('consent_records')
            .select('id, terms_version, privacy_version, accepted_terms, accepted_privacy, accepted_statistical_use')
            .eq('user_id', session.user.id)
            .eq('accepted_terms', true)
            .eq('accepted_privacy', true)
            .eq('accepted_statistical_use', true)
            .order('accepted_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const hasValidConsent = existingConsent &&
            existingConsent.terms_version === TERMS_VERSION &&
            existingConsent.privacy_version === PRIVACY_VERSION;

          set({ consentRecord: existingConsent, needsConsent: !hasValidConsent });
          
          await get().fetchFavorites();
        } else {
          const meta = session.user.user_metadata;
          const vehicles = get().globalVehicles;
          set({
            user: {
              id: session.user.id,
              email: session.user.email,
              full_name: meta?.full_name || meta?.name || '',
              avatar_url: meta?.avatar_url || meta?.picture || ''
            },
            selectedVehicle: vehicles.length > 0 ? vehicles[0] : null,
            needsConsent: true,
          });
        }
      } else {
        const { globalVehicles, fetchGlobalVehicles } = get();
        let vehicles = globalVehicles;
        if (vehicles.length === 0) {
          await fetchGlobalVehicles();
          vehicles = get().globalVehicles;
        }
        set({ user: null, selectedVehicle: vehicles.length > 0 ? vehicles[0] : null });
      }
    } catch (err) {
      console.error('Error checking session:', err);
    } finally {
      set({ isLoadingUser: false });
    }
  },

  saveTripToDatabase: async () => {
    const { tripPlan, routePoints, selectedVehicle, user, soc } = get();
    if (!tripPlan || !user) return;

    const origin = routePoints[0]?.name || 'Origen';
    const destination = routePoints[routePoints.length - 1]?.name || 'Destino';

    const tripData = {
      user_id: user.id,
      origin_name: origin,
      destination_name: destination,
      vehicle_model: `${selectedVehicle.brand} ${selectedVehicle.model}`,
      start_soc: soc,
      arrival_soc: tripPlan.arrivalSoc,
      distance_km: tripPlan.route.distance / 1000,
      duration_min: tripPlan.route.duration / 60,
      consumption_kwh: tripPlan.totalConsumptionWh / 1000,
      route_geometry: tripPlan.route.geometry,
      waypoints: routePoints
    };

    // Save trip details
    const { error: tripError } = await supabase.from('trips').insert([tripData]);
    if (tripError) {
      console.error('Error saving trip:', tripError.message);
    }

    // Update local state for user metadata
    set({
      user: {
        ...user,
        last_vehicle_id: selectedVehicle.id,
        last_soc: soc
      }
    });
  },

  saveConsent: async (choices: ConsentChoices) => {
    const { user } = get();
    if (!user) return;

    // Collect browser evidence for legal audit trail
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
    // IP will be null client-side (server would need to provide it) — acceptable evidenciable
    const consentPayload = {
      user_id: user.id,
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      accepted_terms: choices.acceptedTerms,
      accepted_privacy: choices.acceptedPrivacy,
      accepted_statistical_use: choices.acceptedStatisticalUse,
      accepted_marketing_chargeway: choices.acceptedMarketingChargeWay,
      accepted_marketing_brands: choices.acceptedMarketingBrands,
      user_agent: userAgent,
      accepted_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('consent_records')
      .insert([consentPayload])
      .select()
      .single();

    if (error) {
      // DB table may not exist yet — store consent locally as fallback
      // so the user is never blocked. We still update needsConsent to false.
      console.warn('Could not save consent to DB (table may be missing). Falling back to localStorage.', error.message);
      try {
        localStorage.setItem(
          `chargeWay_consent_${user.id}`,
          JSON.stringify({ ...consentPayload, savedAt: new Date().toISOString(), fallback: true })
        );
      } catch (_) {
        // localStorage also unavailable — ignore, still let user through
      }
      set({ needsConsent: false, consentRecord: consentPayload });
      return;
    }

    set({ needsConsent: false, consentRecord: data });
    console.log('Consent saved with ID:', data?.id);
    await get().fetchFavorites();
  },

  fetchFavorites: async () => {
    const { user } = get();
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('favorite_locations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data && !error) {
        set({ favoriteLocations: data.map(d => ({ id: d.id, name: d.name, address: d.address, lat: d.lat, lng: d.lng })) });
      }
    } catch (err) {
      console.error('Error fetching favorites', err);
    }
  },

  addFavorite: async (wp: Waypoint, originalAddress?: string) => {
    const { user, favoriteLocations } = get();
    if (!user) return;
    
    // Check if already exists by coords or name
    if (favoriteLocations.find(f => f.lat === wp.lat && f.lng === wp.lng)) return;

    try {
      const { data, error } = await supabase
        .from('favorite_locations')
        .insert({
          user_id: user.id,
          name: wp.name,
          address: originalAddress || wp.name,
          lat: wp.lat,
          lng: wp.lng
        })
        .select()
        .single();
        
      if (data && !error) {
        set({ favoriteLocations: [{ id: data.id, name: data.name, address: data.address, lat: data.lat, lng: data.lng }, ...favoriteLocations] });
      } else if (error) {
        console.error('Supabase Error:', error);
      }
    } catch (err: any) {
      console.error('Error adding favorite', err);
    }
  },

  removeFavorite: async (id: string) => {
    const { user, favoriteLocations } = get();
    if (!user) return;
    
    set({ favoriteLocations: favoriteLocations.filter(f => f.id !== id) });
    
    try {
      await supabase.from('favorite_locations').delete().eq('id', id);
    } catch (err) {
      console.error('Error removing favorite', err);
    }
  }
}),
{
  name: 'chargeway-trip-storage',
  partialize: (state) => ({
    selectedVehicle: state.selectedVehicle,
    soc: state.soc,
    routePoints: state.routePoints,
    filterCompatibleChargers: state.filterCompatibleChargers,
  }),
}));
