import { create } from 'zustand';
import { Waypoint } from '@/components/Dashboard/RouteSearch';
import { TripPlan, generateTripPlan } from '@/lib/route-orchestrator';
import { Vehicle } from '@/components/Dashboard/VehicleSelector';
import { geocodePlace } from '@/lib/services/mapbox';
import vehicles from '@/lib/vehicles.json';
import { supabase } from '@/lib/supabase';

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
  setSelectedVehicle: (vehicle: Vehicle) => void;
  setSoc: (soc: number) => void;
  setRoutePoints: (points: Waypoint[]) => void;
  setMapFlyTo: (coords: { lat: number; lng: number } | null) => void;
  setIsNavigating: (val: boolean) => void;
  setIsSimulating: (val: boolean) => void;
  planRoute: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  saveTripToDatabase: () => Promise<void>;
}

export const useTripStore = create<TripState>((set, get) => ({
  selectedVehicle: vehicles[0] as Vehicle,
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

  setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle }),
  setSoc: (soc) => set({ soc }),
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
          set({ user: profile });
        } else {
          const meta = session.user.user_metadata;
          set({
            user: {
              id: session.user.id,
              email: session.user.email,
              full_name: meta?.full_name || meta?.name || '',
              avatar_url: meta?.avatar_url || meta?.picture || ''
            }
          });
        }
      } else {
        set({ user: null });
      }
    } catch (err) {
      console.error('Error checking session:', err);
    } finally {
      set({ isLoadingUser: false });
    }
  },

  saveTripToDatabase: async () => {
    const { tripPlan, routePoints, selectedVehicle, user } = get();
    if (!tripPlan || !user) return;

    const origin = routePoints[0]?.name || 'Origen';
    const destination = routePoints[routePoints.length - 1]?.name || 'Destino';

    const tripData = {
      user_id: user.id,
      origin_name: origin,
      destination_name: destination,
      vehicle_model: `${selectedVehicle.brand} ${selectedVehicle.model}`,
      start_soc: get().soc,
      arrival_soc: tripPlan.arrivalSoc,
      distance_km: tripPlan.route.distance / 1000,
      duration_min: tripPlan.route.duration / 60,
      consumption_kwh: tripPlan.totalConsumptionWh / 1000,
      route_geometry: tripPlan.route.geometry,
      waypoints: routePoints
    };

    const { error } = await supabase.from('trips').insert([tripData]);
    if (error) {
      console.error('Error saving trip:', error.message);
    } else {
      console.log('Trip saved successfully!');
    }
  }
}));
