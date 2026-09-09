'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Send,
  Bot,
  Navigation,
  MapPin,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import {
  askEvCopilot,
  CopilotContext,
  CopilotMessage,
  CopilotDestination,
  CopilotCharger,
} from '@/lib/services/copilot';
import { useTripStore } from '@/lib/store/useTripStore';

interface VoiceCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: CopilotContext;
}

const HUMAN_VOICES = [
  { id: 'es-EC-AndreaNeural', name: 'Andrea (Ecuador - Voz Humana)', gender: 'female' },
  { id: 'es-EC-LuisNeural', name: 'Luis (Ecuador - Voz Humana)', gender: 'male' },
  { id: 'es-US-PalomaNeural', name: 'Paloma (Latina - Expresiva)', gender: 'female' },
  { id: 'es-MX-DaliaNeural', name: 'Dalia (Natural - Cálida)', gender: 'female' },
];

export const VoiceCopilotModal: React.FC<VoiceCopilotModalProps> = ({
  isOpen,
  onClose,
  context,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      role: 'assistant',
      content: `¡Hola! Soy tu copiloto ChargeWay. Puedes preguntarme por voz sobre tu autonomía, si llegas a Pimán, San Gabriel o Atacames, y trazaré tu ruta en el mapa en tiempo real.`,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('es-EC-AndreaNeural');
  const [autoSyncMap, setAutoSyncMap] = useState(true);
  const [activeSyncNotice, setActiveSyncNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sincronizar automáticamente el mapa principal con el destino o cargadores
  const applyDestinationToMap = async (dest: CopilotDestination, announceNotice = true) => {
    try {
      const { routePoints, setRoutePoints, planRoute, setMapFlyTo } = useTripStore.getState();
      const currentOrigin =
        routePoints[0]?.lat !== 0 && routePoints[0]?.lng !== 0
          ? routePoints[0]
          : { id: 'origin', name: 'Quito Centro', lat: -0.1807, lng: -78.4678 };

      const newDestination = {
        id: 'destination',
        name: dest.name,
        lat: dest.lat,
        lng: dest.lng,
      };

      if (dest.isRoundTrip) {
        const returnPoint = {
          id: 'return_' + Date.now(),
          name: `${currentOrigin.name} (Retorno)`,
          lat: currentOrigin.lat,
          lng: currentOrigin.lng,
        };
        setRoutePoints([currentOrigin, newDestination, returnPoint]);
      } else {
        setRoutePoints([currentOrigin, newDestination]);
      }

      setMapFlyTo({ lat: dest.lat, lng: dest.lng });
      await planRoute();

      if (announceNotice) {
        const noticeText = dest.isRoundTrip
          ? `Ruta completa trazada: ${currentOrigin.name} ➔ ${dest.name} ➔ Retorno`
          : `Ruta trazada a ${dest.name}`;
        setActiveSyncNotice(noticeText);
        setTimeout(() => setActiveSyncNotice(null), 4000);
      }
    } catch (err) {
      console.warn('Error al sincronizar destino en mapa:', err);
    }
  };

  // Añadir cargador o parada intermedia a la ruta activa y recalcular plan
  const addWaypointToRoute = async (
    charger: { name: string; lat: number; lng: number },
    announceNotice = true
  ) => {
    try {
      const { routePoints, setRoutePoints, planRoute, setMapFlyTo } = useTripStore.getState();
      const currentOrigin =
        routePoints[0]?.lat !== 0 && routePoints[0]?.lng !== 0
          ? routePoints[0]
          : { id: 'origin', name: 'Origen', lat: -0.1807, lng: -78.4678 };

      const intermediateStop = {
        id: `stop_${Date.now()}`,
        name: charger.name,
        lat: charger.lat,
        lng: charger.lng,
      };

      const isRoundTripActive =
        routePoints.length >= 3 &&
        Math.abs(routePoints[routePoints.length - 1].lat - currentOrigin.lat) < 0.01 &&
        Math.abs(routePoints[routePoints.length - 1].lng - currentOrigin.lng) < 0.01;

      if (isRoundTripActive) {
        // En un viaje ida y vuelta: [Origen, Destino, Retorno]
        const turnPoint = routePoints[1];
        const returnPoint = routePoints[routePoints.length - 1];

        // Se ubica la parada de recarga estratégica (en el destino o en el regreso hacia el origen)
        const newPoints = [currentOrigin, turnPoint, intermediateStop, returnPoint];
        setRoutePoints(newPoints);
      } else {
        const currentDest =
          routePoints[routePoints.length - 1]?.lat !== 0 && routePoints[routePoints.length - 1]?.lng !== 0
            ? routePoints[routePoints.length - 1]
            : { id: 'destination', name: 'Destino', lat: charger.lat, lng: charger.lng };

        // Si ya hay paradas intermedias, evitar duplicar exactamente la misma
        const existingIntermediates = routePoints.length > 2
          ? routePoints.slice(1, -1).filter(
              p => Math.abs(p.lat - charger.lat) > 0.002 || Math.abs(p.lng - charger.lng) > 0.002
            )
          : [];

        const newPoints = [currentOrigin, ...existingIntermediates, intermediateStop, currentDest];
        setRoutePoints(newPoints);
      }

      setMapFlyTo({ lat: charger.lat, lng: charger.lng });
      await planRoute();

      if (announceNotice) {
        setActiveSyncNotice(`Parada añadida: ${charger.name}`);
        setTimeout(() => setActiveSyncNotice(null), 4000);
      }
    } catch (err) {
      console.warn('Error al agregar parada a la ruta:', err);
    }
  };

  const flyToChargerOnMap = (ch: CopilotCharger) => {
    try {
      const { setMapFlyTo } = useTripStore.getState();
      setMapFlyTo({ lat: ch.lat, lng: ch.lng });
      setActiveSyncNotice(`Enfocando cargador: ${ch.name}`);
      setTimeout(() => setActiveSyncNotice(null), 3500);
    } catch (err) {
      console.warn('Error al enfocar cargador:', err);
    }
  };

  const startNavigation = () => {
    try {
      const { setIsNavigating } = useTripStore.getState();
      setIsNavigating(true);
      setActiveSyncNotice('Navegación GPS Iniciada');
      setTimeout(() => setActiveSyncNotice(null), 3000);
    } catch (err) {
      console.warn('Error al iniciar navegación:', err);
    }
  };

  // Inicializar Reconocimiento de Voz del Navegador
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'es-EC';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInputText(transcript);
            handleSendMessage(transcript);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, []);

  // Preprocesar texto para pronunciación fluida
  const cleanTextForSpeech = (rawText: string): string => {
    return rawText
      .replace(/\(([^)]+)\)/g, ', $1, ')
      .replace(/(\d+)\s*kWh/gi, '$1 kilovatios hora')
      .replace(/(\d+)\s*km\/h/gi, '$1 kilómetros por hora')
      .replace(/(\d+)\s*km\b/gi, '$1 kilómetros')
      .replace(/(\d+)\s*%/g, '$1 por ciento')
      .replace(/[*_#~`]/g, '')
      .replace(/¿|¡/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Reproducción exclusiva con Voz Humana de Alta Definición
  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined') return;

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }

    const naturalSpeechText = cleanTextForSpeech(text);

    try {
      const audioUrl = `/api/tts?voice=${encodeURIComponent(selectedVoice)}&text=${encodeURIComponent(naturalSpeechText)}`;
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;

      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = (e) => {
        console.warn('Error en audio neural:', e);
        setIsSpeaking(false);
      };

      audio.play().catch(e => {
        console.warn('Autoplay bloqueado por el navegador (requiere interacción):', e);
        setIsSpeaking(false);
      });
    } catch (err) {
      console.error('Error al iniciar audio:', err);
      setIsSpeaking(false);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Tu navegador no soporta reconocimiento de voz directo. Puedes escribir tu mensaje en el campo inferior.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setIsListening(false);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        setIsSpeaking(false);
      }
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Recognition start exception:', e);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || loading) return;

    const userMsg: CopilotMessage = { role: 'user', content: query };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInputText('');
    setLoading(true);

    let activeContext = context;
    let preMappedDestination = false;

    // CASO B: Si la consulta por voz contiene una intención de viaje / destino nuevo,
    // trazamos primero la ruta en el mapa, procesamos el motor físico-energético multicapa (planRoute)
    // y enviamos la telemetría real calculada a askEvCopilot (ejecutándose con la certeza del Caso A).
    if (autoSyncMap) {
      try {
        const resolveRes = await fetch('/api/copilot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, resolveOnly: true }),
        });

        if (resolveRes.ok) {
          const { destination: preResolvedDest } = await resolveRes.json();
          if (preResolvedDest && preResolvedDest.lat && preResolvedDest.lng) {
            setActiveSyncNotice(`Mapeando ruta a ${preResolvedDest.name}...`);
            await applyDestinationToMap(preResolvedDest, false);
            preMappedDestination = true;

            const storeState = useTripStore.getState();
            const freshPlan = storeState.tripPlan;
            const freshPoints = storeState.routePoints;
            const freshVehicle = storeState.selectedVehicle;
            const freshSoc = storeState.soc;

            if (freshPlan) {
              const isRound = preResolvedDest.isRoundTrip || freshPoints.length > 2;
              const routeDistKm = Math.round(freshPlan.route.distance / 1000);
              const routeDurationMin = Math.round(freshPlan.route.duration / 60);
              const totalKwh = Math.round((freshPlan.totalConsumptionWh / 1000) * 10) / 10;
              const arrivalSocPct = Math.round(freshPlan.arrivalSoc * 100);
              const arrivalRangeKm = freshPlan.arrivalRangeKm;
              const safetyMarginKm = freshPlan.safetyMarginKm;
              const rawCharger = freshPlan.suggestedChargingStop;
              let bestChargerName =
                rawCharger?.nombre ||
                (freshPlan as any).chargingStops?.[0]?.name ||
                (freshPlan.chargers?.[0] as any)?.nombre ||
                (freshPlan.chargers?.[0] as any)?.name ||
                preResolvedDest.recommendedStop ||
                'Estación en la ruta';

              if (rawCharger?.canton && !bestChargerName.toLowerCase().includes(rawCharger.canton.toLowerCase())) {
                bestChargerName = `${bestChargerName} en ${rawCharger.canton}`;
              }

              const activeTripTelemetry = {
                originName: freshPoints[0]?.name || 'Quito',
                destinationName: preResolvedDest.name,
                destinationLat: preResolvedDest.lat,
                destinationLng: preResolvedDest.lng,
                isRoundTrip: isRound,
                distanceKm: routeDistKm,
                durationMin: routeDurationMin,
                consumptionKwh: totalKwh,
                arrivalSoc: arrivalSocPct,
                arrivalRangeKm: arrivalRangeKm,
                safetyMarginKm: safetyMarginKm,
                recommendedChargerName: bestChargerName,
              };

              // Excluir cargadores ubicados en el propio destino final si la batería no alcanza para llegar
              const isDeficit = arrivalSocPct < 20;
              const eligiblePlanChargers = (freshPlan.chargers || []).filter((c: any) => {
                if (isDeficit && preResolvedDest && preResolvedDest.lat && preResolvedDest.lng) {
                  const cLat = c.location?.lat ?? c.lat;
                  const cLng = c.location?.lng ?? c.lng;
                  const dLat = (cLat - preResolvedDest.lat) * 111;
                  const dLng = (cLng - preResolvedDest.lng) * 111;
                  const distToDest = Math.sqrt(dLat * dLat + dLng * dLng);
                  return distToDest > 25; // Excluir cargadores a menos de 25 km del destino final
                }
                return true;
              });

              const candidateChargers = eligiblePlanChargers.length > 0 ? eligiblePlanChargers : (freshPlan.chargers || []);
              const routeChargers = candidateChargers.slice(0, 6).map((c: any) => ({
                id: c.id || c.name || c.nombre,
                name: c.canton && !(c.nombre || c.name)?.toLowerCase().includes(c.canton.toLowerCase())
                  ? `${c.nombre || c.name} (${c.canton})`
                  : (c.nombre || c.name),
                power: c.potencia || c.power || '50 kW',
                speed: c.velocidad || c.speed || 'Rápida',
                lat: c.location?.lat ?? c.lat,
                lng: c.location?.lng ?? c.lng,
              }));

              activeContext = {
                ...context,
                vehicleModel: freshVehicle ? `${freshVehicle.brand} ${freshVehicle.model}` : context?.vehicleModel,
                batteryCapacityKwh: freshVehicle?.specs?.usable_battery_kwh ?? context?.batteryCapacityKwh,
                currentSoC: Math.round((freshSoc || 0.5) * 100),
                destinationCity: preResolvedDest.name,
                estimatedRangeKm: freshVehicle ? Math.round(freshVehicle.specs.wltp_range_km * freshSoc) : context?.estimatedRangeKm,
                wltpRangeKm: freshVehicle?.specs?.wltp_range_km ?? context?.wltpRangeKm,
                activeTrip: activeTripTelemetry,
                routeChargers: routeChargers.length > 0 ? routeChargers : context?.routeChargers,
              };

              setActiveSyncNotice(
                isRound
                  ? `Ruta completa trazada: Quito ➔ ${preResolvedDest.name} ➔ Retorno (${routeDistKm} km)`
                  : `Ruta trazada a ${preResolvedDest.name} (${routeDistKm} km)`
              );
              setTimeout(() => setActiveSyncNotice(null), 4000);
            }
          }
        }
      } catch (preMapErr) {
        console.warn('Error en pre-mapeo Caso B:', preMapErr);
      }
    }

    try {
      const response = await askEvCopilot(query, activeContext, updated);
      const assistantMsg: CopilotMessage = {
        role: 'assistant',
        content: response.text,
        destination: response.destination,
        chargers: response.chargers,
        action: response.action,
        waypoint: response.waypoint,
      };
      setMessages([...updated, assistantMsg]);

      // Sincronización Automática con el Mapa
      if (response.action === 'add_waypoint' && response.waypoint) {
        await addWaypointToRoute(response.waypoint, true);
      } else if (autoSyncMap && response.destination && !preMappedDestination) {
        await applyDestinationToMap(response.destination, false);
      } else if (autoSyncMap && response.chargers && response.chargers.length > 0) {
        flyToChargerOnMap(response.chargers[0]);
      }

      speakText(response.text);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '90px',
      right: '20px',
      width: 'min(420px, calc(100vw - 32px))',
      height: '560px',
      background: 'rgba(11, 23, 19, 0.96)',
      backdropFilter: 'blur(24px)',
      border: '1px solid rgba(16, 185, 129, 0.45)',
      borderRadius: '24px',
      boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75), 0 0 40px rgba(16, 185, 129, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 2000,
      overflow: 'hidden',
      animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes soundWave {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(16, 185, 129, 0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
          }}>
            <Sparkles size={17} />
          </div>
          <div>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Copiloto Manos Libres
              <button
                onClick={() => setAutoSyncMap(!autoSyncMap)}
                title={autoSyncMap ? 'Sincronización activa con el mapa' : 'Activar sincronización con el mapa'}
                style={{
                  fontSize: '0.62rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  background: autoSyncMap ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                  color: autoSyncMap ? '#34d399' : 'rgba(255, 255, 255, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <span style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: autoSyncMap ? '#10b981' : 'gray',
                }} />
                {autoSyncMap ? 'Mapa Sincronizado' : 'Mapa Desconectado'}
              </button>
            </div>

            {/* Selector de Voz Humana */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#6ee7b7' }}>Voz:</span>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '6px',
                  color: '#a7f3d0',
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  outline: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {HUMAN_VOICES.map((v) => (
                  <option key={v.id} value={v.id} style={{ background: '#0b1713', color: 'white' }}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => {
              const next = !voiceEnabled;
              setVoiceEnabled(next);
              if (!next && audioPlayerRef.current) {
                audioPlayerRef.current.pause();
                setIsSpeaking(false);
              }
            }}
            title={voiceEnabled ? 'Silenciar voz' : 'Activar voz'}
            style={{
              background: voiceEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '8px',
              padding: '7px',
              color: voiceEnabled ? '#34d399' : 'rgba(255, 255, 255, 0.4)',
              cursor: 'pointer',
            }}
          >
            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '8px',
              padding: '7px',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Sync Toast Notification */}
      {activeSyncNotice && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.25)',
          borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '4px 12px',
          fontSize: '0.7rem',
          color: '#6ee7b7',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          justifyContent: 'center',
        }}>
          <CheckCircle2 size={12} color="#34d399" />
          {activeSyncNotice}
        </div>
      )}

      {/* Messages Feed */}
      <div style={{
        flex: 1,
        padding: '14px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '8px',
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '90%',
              }}
            >
              {!isUser && (
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#34d399',
                  flexShrink: 0,
                  marginTop: '2px',
                }}>
                  <Bot size={13} />
                </div>
              )}
              <div style={{
                background: isUser ? '#10b981' : 'rgba(255, 255, 255, 0.06)',
                border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                color: isUser ? '#041f16' : 'white',
                fontWeight: isUser ? 600 : 400,
                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '10px 14px',
                fontSize: '0.82rem',
                lineHeight: 1.45,
              }}>
                <div>{m.content}</div>

                {/* Interactive Map Actions for Assistant Messages */}
                {!isUser && (m.destination || (m.chargers && m.chargers.length > 0)) && (
                  <div style={{
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}>
                    {/* Botón Trazar Ruta */}
                    {m.destination && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => applyDestinationToMap(m.destination!)}
                          style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '6px 10px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          <Navigation size={12} />
                          Trazar ruta a {m.destination.name}
                        </button>

                        <button
                          onClick={() => startNavigation()}
                          style={{
                            background: 'rgba(255, 255, 255, 0.12)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: '#a7f3d0',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '6px 10px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          🚗 Iniciar GPS
                        </button>
                      </div>
                    )}

                    {/* Parada agregada Banner */}
                    {m.waypoint && (
                      <div style={{
                        marginTop: '6px',
                        marginBottom: '4px',
                        padding: '6px 10px',
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.45)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.72rem',
                        color: '#a7f3d0',
                        fontWeight: 600,
                      }}>
                        <span>✅</span>
                        <span>Parada en {m.waypoint.name} añadida a la ruta</span>
                      </div>
                    )}

                    {/* Cargadores Recomendados Interactivos */}
                    {m.chargers && m.chargers.length > 0 && (
                      <div style={{ marginTop: '4px' }}>
                        <div style={{ fontSize: '0.66rem', color: '#6ee7b7', marginBottom: '4px', fontWeight: 600 }}>
                          ⚡ Estaciones de carga en la ruta (toca para ver o añadir a la ruta):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {m.chargers.map((ch, cIdx) => (
                            <div
                              key={cIdx}
                              style={{
                                background: 'rgba(16, 185, 129, 0.12)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                borderRadius: '6px',
                                padding: '5px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '6px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flex: 1 }}>
                                <Zap size={11} color="#34d399" className="shrink-0" />
                                <span style={{ fontSize: '0.7rem', color: '#d1fae5', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ch.name}>
                                  {ch.name}
                                </span>
                                <span style={{
                                  fontSize: '0.62rem',
                                  color: '#34d399',
                                  background: 'rgba(16, 185, 129, 0.2)',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                }}>
                                  {ch.power}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                <button
                                  onClick={() => flyToChargerOnMap(ch)}
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '4px',
                                    color: '#e2e8f0',
                                    fontSize: '0.65rem',
                                    padding: '2px 6px',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                  }}
                                  title="Ver ubicación en el mapa"
                                >
                                  🔍 Ver
                                </button>
                                <button
                                  onClick={() => addWaypointToRoute(ch)}
                                  style={{
                                    background: 'rgba(16, 185, 129, 0.35)',
                                    border: '1px solid rgba(16, 185, 129, 0.6)',
                                    borderRadius: '4px',
                                    color: '#ffffff',
                                    fontSize: '0.65rem',
                                    padding: '2px 6px',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                  }}
                                  title="Añadir esta estación como parada intermedia"
                                >
                                  ➕ Añadir
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '8px 12px',
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.5)',
            }}>
              Calculando ruta y estaciones compatibles...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Voice Status Indicator */}
      {(isListening || isSpeaking) && (
        <div style={{
          padding: '8px 14px',
          background: isListening ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          fontSize: '0.74rem',
          fontWeight: 600,
          color: isListening ? '#f87171' : '#34d399',
        }}>
          {isSpeaking ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '3px', background: '#34d399', borderRadius: '2px', animation: 'soundWave 0.8s infinite 0.1s' }}></span>
              <span style={{ width: '3px', background: '#34d399', borderRadius: '2px', animation: 'soundWave 0.8s infinite 0.3s' }}></span>
              <span style={{ width: '3px', background: '#34d399', borderRadius: '2px', animation: 'soundWave 0.8s infinite 0.2s' }}></span>
              <span style={{ width: '3px', background: '#34d399', borderRadius: '2px', animation: 'soundWave 0.8s infinite 0.4s' }}></span>
            </div>
          ) : (
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#ef4444',
              animation: 'pulseRing 1.5s infinite',
            }} />
          )}
          {isListening ? 'Escuchando tu voz... Habla con naturalidad' : 'Hablando con Voz Humana HD...'}
        </div>
      )}

      {/* Input / Mic Controls */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(5, 14, 10, 0.85)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <button
          onClick={toggleListening}
          title={isListening ? 'Detener micrófono' : 'Hablar por micrófono'}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            border: 'none',
            background: isListening
              ? '#ef4444'
              : 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: isListening ? '0 0 18px #ef4444' : '0 0 18px rgba(16, 185, 129, 0.4)',
            transition: 'all 0.2s',
          }}
        >
          {isListening ? <MicOff size={19} /> : <Mic size={19} />}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder={isListening ? 'Escuchando tu voz...' : 'Pregunta o pide un destino...'}
          style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '10px 14px',
            color: 'white',
            fontSize: '0.82rem',
            outline: 'none',
          }}
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || loading}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '11px',
            border: 'none',
            background: inputText.trim() ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
            color: inputText.trim() ? '#041f16' : 'rgba(255, 255, 255, 0.3)',
            cursor: inputText.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};
