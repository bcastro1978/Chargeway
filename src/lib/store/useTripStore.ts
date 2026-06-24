import { create } from 'zustand';
import { Waypoint } from '@/components/Dashboard/RouteSearch';
import { TripPlan, generateTripPlan } from '@/lib/route-orchestrator';
import { Vehicle } from '@/components/Dashboard/VehicleSelector';
import { geocodePlace } from '@/lib/services/mapbox';
import vehicles from '@/lib/vehicles.json';
import { supabase } from '@/lib/supabase';
import { ConsentChoices, TERMS_VERSION, PRIVACY_VERSION } from '@/components/Dashboard/ConsentModal';

interface TripState {
  selectedVehicle: Vehicle;
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
  saveTripToDatabase: () => Promise<void>;
  saveConsent: (choices: ConsentChoices) => Promise<void>;
}

export const useTripStore = create<TripState>((set, get) => ({
  selectedVehicle: null as any,
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
  user: null,
  isLoadingUser: false,
  needsConsent: false,
  consentRecord: null,
  filterCompatibleChargers: true,

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
          
          // Query the user's last trip to load their previous vehicle and SoC
          const { data: lastTrip } = await supabase
            .from('trips')
            .select('vehicle_model, start_soc')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (lastTrip && lastTrip.vehicle_model) {
            const foundVehicle = vehicles.find(v => `${v.brand} ${v.model}` === lastTrip.vehicle_model);
            if (foundVehicle) {
              loadedState.selectedVehicle = foundVehicle as Vehicle;
            } else {
              loadedState.selectedVehicle = vehicles[0] as Vehicle;
            }
            if (lastTrip.start_soc !== null && lastTrip.start_soc !== undefined) {
              loadedState.soc = Number(lastTrip.start_soc);
            }
          } else {
            loadedState.selectedVehicle = vehicles[0] as Vehicle;
          }
          
          set(loadedState);

          // Check if user has accepted current version of terms/privacy
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
        } else {
          // New user – no profile yet, must accept consent before continuing
          const meta = session.user.user_metadata;
          set({
            user: {
              id: session.user.id,
              email: session.user.email,
              full_name: meta?.full_name || meta?.name || '',
              avatar_url: meta?.avatar_url || meta?.picture || ''
            },
            selectedVehicle: vehicles[0] as Vehicle,
            needsConsent: true,
          });
        }
      } else {
        set({ user: null, selectedVehicle: vehicles[0] as Vehicle });
      }
    } catch (err) {
      console.error('Error checking session:', err);
      set({ selectedVehicle: vehicles[0] as Vehicle });
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
  },
}));
