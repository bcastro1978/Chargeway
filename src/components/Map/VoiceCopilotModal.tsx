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
import { Waypoint } from '@/components/Dashboard/RouteSearch';
import { orderRouteWithStops } from '@/lib/services/route-helpers';

interface VoiceCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: CopilotContext;
  messages?: CopilotMessage[];
  setMessages?: React.Dispatch<React.SetStateAction<CopilotMessage[]>>;
}

function isBrandMatch(chargerName: string, brand?: string): boolean {
  if (!brand || !brand.trim()) return false;
  const b = brand.trim().toLowerCase();
  const text = (chargerName || '').toLowerCase();
  const keywords: string[] = [b];
  if (b.includes('byd')) keywords.push('byd');
  if (b.includes('kia')) keywords.push('kia');
  if (b.includes('tesla')) keywords.push('tesla', 'supercharger', 'nacs');
  if (b.includes('porsche')) keywords.push('porsche');
  if (b.includes('audi')) keywords.push('audi');
  return keywords.some(kw => text.includes(kw));
}

const HUMAN_VOICES = [
  { id: 'es-EC-AndreaNeural', name: 'Andrea', gender: 'female' },
  { id: 'es-EC-LuisNeural', name: 'Luis', gender: 'male' },
  { id: 'es-US-PalomaNeural', name: 'Paloma', gender: 'female' },
  { id: 'es-MX-DaliaNeural', name: 'Dalia', gender: 'female' },
];

function deduplicatePhrases(str: string): string {
  if (!str) return '';
  const words = str.trim().split(/\s+/);
  if (words.length < 3) return str;

  // 1. Deduplicar palabras consecutivas idénticas (ej: 'ir ir' -> 'ir')
  const singleCleaned: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (i === 0 || words[i].toLowerCase() !== words[i - 1].toLowerCase()) {
      singleCleaned.push(words[i]);
    }
  }

  // 2. Deduplicar bloques de frases idénticas consecutivas (ej: 'ir y regresar ir y regresar')
  let cur = singleCleaned;
  let changed = true;
  while (changed) {
    changed = false;
    for (let len = Math.floor(cur.length / 2); len >= 2; len--) {
      for (let i = 0; i <= cur.length - 2 * len; i++) {
        const p1 = cur.slice(i, i + len).map(w => w.toLowerCase()).join(' ');
        const p2 = cur.slice(i + len, i + 2 * len).map(w => w.toLowerCase()).join(' ');
        if (p1 === p2) {
          cur.splice(i + len, len);
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }

  return cur.join(' ');
}

export function normalizeVoiceQuery(raw: string): string {
  if (!raw) return '';
  let text = deduplicatePhrases(raw.trim());

  const phoneticMap: Array<[RegExp, string]> = [
    // "expresar de tenen" / "regresar de tenen" -> "regresar de Tena"
    [/\b(?:expresar|regresar|viajar|salir)\s+de\s+tenen\b/gi, 'regresar de Tena'],
    [/\bexpresar\s+de\s+([a-záéíóúñ]+)/gi, 'regresar de $1'],
    [/\bde\s+tenen\b/gi, 'de Tena'],
    [/\ba\s+tenen\b/gi, 'a Tena'],
    [/\ben\s+tenen\b/gi, 'en Tena'],
    [/\btenen\b/gi, 'Tena'],

    // Destinos y ciudades en Ecuador con confusiones fonéticas
    [/\bcoto\s*taxi\b/gi, 'Cotopaxi'],
    [/\bcoto\s*pasi\b/gi, 'Cotopaxi'],
    [/\bapeli\s*leo\b/gi, 'Pelileo'],
    [/\bpeli\s*leo\b/gi, 'Pelileo'],
    [/\bbani?os\s+de\s+agua\s+santa\b/gi, 'Baños de Agua Santa'],
    [/\bbani?os\b/gi, 'Baños'],
    [/\bpapa\s*llacta\b/gi, 'Papallacta'],
    [/\bpapallacta\b/gi, 'Papallacta'],
    [/\blata\s*cunga\b/gi, 'Latacunga'],
    [/\brio\s*bamba\b/gi, 'Riobamba'],
    [/\bsanto\s*domingo\b/gi, 'Santo Domingo'],
    [/\botavalo\b/gi, 'Otavalo'],
    [/\bibarra\b/gi, 'Ibarra'],
    [/\bcumbaya\b/gi, 'Cumbayá'],
    [/\btulcan\b/gi, 'Tulcán'],

    // Términos de movilidad eléctrica
    [/\belectro\s*line(?:ra|ras)\b/gi, 'electrolinera'],
    [/\bcargador\s*rapido\b/gi, 'cargador rápido'],
    [/\bcuanta\s+bateria\b/gi, 'cuánta batería'],
    [/\bautonomia\b/gi, 'autonomía'],
  ];

  for (const [regex, replacement] of phoneticMap) {
    text = text.replace(regex, replacement);
  }

  return deduplicatePhrases(text);
}


export const VoiceCopilotModal: React.FC<VoiceCopilotModalProps> = React.memo(({
  isOpen,
  onClose,
  context,
  messages: propMessages,
  setMessages: propSetMessages,
}) => {
  const [internalMessages, setInternalMessages] = useState<CopilotMessage[]>([
    {
      role: 'assistant',
      content: `¡Hola! Soy tu asistente de viaje ChargeWay. Puedes preguntarme por voz sobre tu autonomía, estaciones de carga o consultar cualquier destino, y trazaré tu ruta en el mapa en tiempo real.`,
    },
  ]);

  const messages = propMessages || internalMessages;
  const setMessages = propSetMessages || setInternalMessages;

  const messagesRef = useRef<CopilotMessage[]>(messages);
  messagesRef.current = messages;

  const handleSendMessageRef = useRef<(text?: string) => Promise<void>>(async () => {});

  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);
  const lastTranscriptRef = useRef('');
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeRecognitionRef = useRef<any>(null);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('es-EC-AndreaNeural');
  const [autoSyncMap, setAutoSyncMap] = useState(true);
  const [activeSyncNotice, setActiveSyncNotice] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [dailyQuotaRemaining, setDailyQuotaRemaining] = useState<number | null>(null);
  const [addedStopNames, setAddedStopNames] = useState<Set<string>>(new Set());

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // Stream de micrófono reutilizable: abrir el dispositivo tarda 0,5–2 s, y si se abre en cada pulsación
  // se pierden las primeras palabras. Se abre una vez y se reutiliza mientras el asistente esté abierto.
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);

  const setListeningState = (val: boolean) => {
    isListeningRef.current = val;
    setIsListening(val);
  };

  const stopAllAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (nextAudioRef.current) {
      nextAudioRef.current.pause();
      nextAudioRef.current = null;
    }
    setIsSpeaking(false);
  };

  const stopActiveRecognition = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (activeRecognitionRef.current) {
      try {
        activeRecognitionRef.current.onend = null;
        activeRecognitionRef.current.onerror = null;
        activeRecognitionRef.current.stop();
      } catch (_) {}
      activeRecognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
    setListeningState(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sincronizar automáticamente el mapa principal con el destino o cargadores
  const applyDestinationToMap = async (
    dest: CopilotDestination,
    announceNotice = true,
    chargers?: CopilotCharger[]
  ) => {
    try {
      useTripStore.setState({ isNavigating: false, isSimulating: false });
      const { routePoints, setRoutePoints, planRoute, setMapFlyTo } = useTripStore.getState();
      const currentOrigin = dest.origin
        ? { id: 'origin', name: dest.origin.name, lat: dest.origin.lat, lng: dest.origin.lng }
        : (routePoints[0]?.lat !== 0 && routePoints[0]?.lng !== 0
            ? routePoints[0]
            : { id: 'origin', name: 'Quito Centro', lat: -0.1807, lng: -78.4678 });

      // Si la consulta detectó un modelo específico explícito (ej. "en un yuan pro"), sincronizarlo en el store
      if (dest.vehicleModel) {
        const normModel = dest.vehicleModel.toLowerCase().trim();
        const { globalVehicles, selectedVehicle, setSelectedVehicle } = useTripStore.getState();
        const currentModelNorm = (selectedVehicle?.model || '').toLowerCase().trim();
        // Solo actualizar si el modelo detectado difiere del actualmente configurado
        if (currentModelNorm !== normModel && !currentModelNorm.includes(normModel)) {
          const matchedVehicle = (globalVehicles || []).find(v => {
            const base = v.model.replace(/\(.*?\)/g, '').trim().toLowerCase();
            return base === normModel || `${v.brand} ${base}`.toLowerCase() === normModel;
          });
          if (matchedVehicle) {
            setSelectedVehicle(matchedVehicle);
          }
        }
      }


      let basePoints: any[] = [];
      if (dest.waypoints && dest.waypoints.length > 0) {
        const intermediateWaypoints = dest.waypoints.map((wp, idx) => ({
          id: `wp_${idx}_${Date.now()}`,
          name: wp.name,
          lat: wp.lat,
          lng: wp.lng,
        }));

        if (dest.isRoundTrip) {
          const returnPoint = {
            id: 'return_' + Date.now(),
            name: `${currentOrigin.name} (Retorno)`,
            lat: currentOrigin.lat,
            lng: currentOrigin.lng,
          };
          basePoints = [currentOrigin, ...intermediateWaypoints, returnPoint];
        } else {
          basePoints = [currentOrigin, ...intermediateWaypoints];
        }
      } else {
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
          basePoints = [currentOrigin, newDestination, returnPoint];
        } else {
          basePoints = [currentOrigin, newDestination];
        }
      }

      // Si la respuesta incluye paradas necesarias de recarga, insertarlas ordenadamente en la ruta
      const necessaryChargers = (chargers || []).filter(c => c.isNecessaryStop);
      if (necessaryChargers.length > 0) {
        const stopsToInsert = necessaryChargers.map((ch, idx) => ({
          id: `nec_stop_${Date.now()}_${idx}`,
          name: ch.name,
          lat: ch.lat,
          lng: ch.lng,
          posKm: ch.posKm,
          isInbound: ch.isInbound,
        }));

        const totalTripKm = (dest.distKm || 0) * (dest.isRoundTrip ? 2 : 1) || undefined;
        basePoints = orderRouteWithStops(basePoints, stopsToInsert, totalTripKm);
        setAddedStopNames(prev => {
          const updated = new Set(prev);
          necessaryChargers.forEach(ch => updated.add(ch.name));
          return updated;
        });
      }

      setRoutePoints(basePoints);
      setMapFlyTo({ lat: dest.lat, lng: dest.lng });
      await planRoute();

      if (announceNotice) {
        const noticeText = dest.waypoints && dest.waypoints.length > 0
          ? `Itinerario trazado: ${currentOrigin.name} ➔ ${dest.waypoints.map(w => w.name).join(' ➔ ')}${dest.isRoundTrip ? ' ➔ Retorno' : ''}`
          : dest.isRoundTrip
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
    charger: { name: string; lat: number; lng: number; posKm?: number; isInbound?: boolean },
    announceNotice = true
  ) => {
    try {
      setAddedStopNames(prev => new Set(prev).add(charger.name));
      useTripStore.setState({ isNavigating: false, isSimulating: false });
      const { routePoints, setRoutePoints, planRoute, setMapFlyTo, tripPlan } = useTripStore.getState();
      const totalDist = tripPlan?.route?.distance ? tripPlan.route.distance / 1000 : undefined;

      let basePoints = [...routePoints];
      const validPoints = basePoints.filter(p => p.lat !== 0 && p.lng !== 0 && p.name?.trim());
      if (validPoints.length === 0) {
        basePoints = [
          { id: 'origin', name: 'Mi ubicación', lat: -0.1807, lng: -78.4678 },
          { id: `dest_${Date.now()}`, name: charger.name, lat: charger.lat, lng: charger.lng }
        ];
        setRoutePoints(basePoints);
        setMapFlyTo({ lat: charger.lat, lng: charger.lng });
        await planRoute();
        if (announceNotice) {
          setActiveSyncNotice(`Ruta trazada hacia: ${charger.name}`);
          setTimeout(() => setActiveSyncNotice(null), 4000);
        }
        return;
      }

      const newPoints = orderRouteWithStops(
        basePoints,
        [{
          id: `stop_${Date.now()}`,
          name: charger.name,
          lat: charger.lat,
          lng: charger.lng,
          posKm: charger.posKm,
          isInbound: charger.isInbound,
        }],
        totalDist
      );

      setRoutePoints(newPoints);
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

  const addAllNecessaryStopsToRoute = async (chargers: CopilotCharger[]) => {
    try {
      useTripStore.setState({ isNavigating: false, isSimulating: false });
      const { routePoints, setRoutePoints, planRoute, setMapFlyTo, tripPlan } = useTripStore.getState();
      const totalDist = tripPlan?.route?.distance ? tripPlan.route.distance / 1000 : undefined;

      const stopsToInsert = chargers.map((ch, idx) => ({
        id: `wp-${ch.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}-${idx}`,
        name: ch.name,
        lat: ch.lat,
        lng: ch.lng,
        posKm: ch.posKm,
        isInbound: ch.isInbound ?? (idx > 0),
      }));

      const newPoints = orderRouteWithStops(routePoints, stopsToInsert, totalDist);
      setRoutePoints(newPoints);

      if (chargers[0]) setMapFlyTo({ lat: chargers[0].lat, lng: chargers[0].lng });
      await planRoute();
      setActiveSyncNotice(`Añadidas ${chargers.length} paradas calculadas a la ruta`);
      setTimeout(() => setActiveSyncNotice(null), 4000);
    } catch (err) {
      console.warn('Error al añadir paradas necesarias:', err);
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

  // Limpieza de audio y micrófono al desmontar
  useEffect(() => {
    return () => {
      stopAllAudio();
      stopActiveRecognition();
      releaseMicStream();
    };
  }, []);

  const MIC_CONSTRAINTS: MediaStreamConstraints = {
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
  };

  const getMicStream = async (): Promise<MediaStream> => {
    const existing = micStreamRef.current;
    if (existing && existing.getAudioTracks().some(t => t.readyState === 'live')) {
      return existing;
    }
    const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
    micStreamRef.current = stream;
    return stream;
  };

  function releaseMicStream() {
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
  }

  // Pre-calentar el micrófono al abrir el asistente (solo en la ruta MediaRecorder, sin Web Speech nativo).
  useEffect(() => {
    if (!isOpen) {
      releaseMicStream();
      return;
    }
    if (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) return;
    if (typeof navigator === 'undefined' || typeof navigator.mediaDevices?.getUserMedia !== 'function') return;
    getMicStream().catch(() => {
      // Permiso denegado o sin dispositivo: se volverá a intentar al pulsar el micrófono.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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

  // Reproducción exclusiva con Voz Humana de Alta Definición y Pipelining de Primera Frase
  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined') return;

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (nextAudioRef.current) {
      nextAudioRef.current.pause();
      nextAudioRef.current = null;
    }

    const naturalSpeechText = cleanTextForSpeech(text);
    if (!naturalSpeechText) return;

    // Sentence pipelining: extraer primera frase para reproducción casi instantánea (<400ms)
    const sentenceParts = naturalSpeechText.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s => s.trim()).filter(Boolean) || [naturalSpeechText];

    try {
      if (sentenceParts.length > 1 && sentenceParts[0].length >= 10) {
        const firstPart = sentenceParts[0];
        const restPart = sentenceParts.slice(1).join(' ');

        const firstUrl = `/api/tts?voice=${encodeURIComponent(selectedVoice)}&text=${encodeURIComponent(firstPart)}`;
        const audioFirst = new Audio(firstUrl);
        audioPlayerRef.current = audioFirst;

        // Pre-cargar la segunda parte en paralelo mientras suena la primera
        const restUrl = `/api/tts?voice=${encodeURIComponent(selectedVoice)}&text=${encodeURIComponent(restPart)}`;
        const audioRest = new Audio(restUrl);
        audioRest.preload = 'auto';
        nextAudioRef.current = audioRest;

        audioFirst.onplay = () => setIsSpeaking(true);
        audioFirst.onerror = (e) => {
          console.warn('Error en primera frase de audio:', e);
          setIsSpeaking(false);
        };
        audioFirst.onended = () => {
          if (nextAudioRef.current === audioRest) {
            audioPlayerRef.current = audioRest;
            audioRest.onplay = () => setIsSpeaking(true);
            audioRest.onended = () => setIsSpeaking(false);
            audioRest.onerror = () => setIsSpeaking(false);
            audioRest.play().catch(e => {
              console.warn('Error encadenando audio:', e);
              setIsSpeaking(false);
            });
          } else {
            setIsSpeaking(false);
          }
        };

        audioFirst.play().catch(e => {
          console.warn('Autoplay bloqueado por el navegador (requiere interacción):', e);
          setIsSpeaking(false);
        });
      } else {
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
      }
    } catch (err) {
      console.error('Error al iniciar audio:', err);
      setIsSpeaking(false);
    }
  };

  const toggleListening = async () => {
    // Si ya está escuchando y el usuario presiona el micrófono:
    // Interpreta la acción como "ENVIAR" lo que se ha hablado (o detener si no hay nada)
    if (isListeningRef.current) {
      // Caso 1: Grabación en curso con MediaRecorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        setActiveSyncNotice('Procesando audio...');
        try {
          mediaRecorderRef.current.stop();
        } catch (_) {}
        setListeningState(false);
        return;
      }

      // Caso 2: Reconocimiento nativo SpeechRecognition
      const textToSubmit = lastTranscriptRef.current.trim();
      stopActiveRecognition();
      setInterimTranscript('');

      if (textToSubmit) {
        lastTranscriptRef.current = '';
        const normalized = normalizeVoiceQuery(textToSubmit);
        setActiveSyncNotice('Procesando consulta...');
        handleSendMessageRef.current(normalized);
      } else {
        setActiveSyncNotice('No se capturó voz clara. Toca para hablar de nuevo.');
        setTimeout(() => setActiveSyncNotice(null), 3000);
      }
      return;
    }

    // Si NO está escuchando: Iniciar nueva sesión de escucha limpia
    stopAllAudio();
    lastTranscriptRef.current = '';
    setInterimTranscript('');

    const SpeechRecognition = typeof window !== 'undefined'
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;

    if (SpeechRecognition) {
      try {
        stopActiveRecognition();

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'es-419'; // Idioma estándar para reconocimiento en Latinoamérica (soporte universal Chrome/Safari)

        recognition.onstart = () => {
          setListeningState(true);
          setActiveSyncNotice('🎤 Escuchando... Habla tu consulta');
        };

        recognition.onresult = (event: any) => {
          let confirmed = '';
          let interim = '';

          for (let i = 0; i < event.results.length; ++i) {
            const transcriptText = event.results[i][0]?.transcript?.trim() || '';
            if (!transcriptText) continue;

            if (event.results[i].isFinal) {
              // En Chrome Android, cada burst puede ser el buffer acumulativo completo
              // o una repetición progresiva. Evitar duplicar frases anteriores.
              if (!confirmed) {
                confirmed = transcriptText;
              } else if (transcriptText.toLowerCase().includes(confirmed.toLowerCase())) {
                confirmed = transcriptText;
              } else if (!confirmed.toLowerCase().includes(transcriptText.toLowerCase())) {
                confirmed += ' ' + transcriptText;
              }
            } else {
              interim = transcriptText;
            }
          }

          let combined = (confirmed || interim).trim();
          if (confirmed && interim && !confirmed.toLowerCase().includes(interim.toLowerCase())) {
            combined = `${confirmed} ${interim}`.trim();
          }

          if (combined) {
            lastTranscriptRef.current = combined;
            setInterimTranscript(interim || combined);
            setActiveSyncNotice(`🎤 "${combined}"`);
          }

          // Temporizador de silencio: si deja de hablar por 1.4 segundos tras haber dicho algo, auto-enviar
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          if (combined.length >= 3) {
            silenceTimerRef.current = setTimeout(() => {
              if (isListeningRef.current && lastTranscriptRef.current.trim()) {
                const textToSend = normalizeVoiceQuery(lastTranscriptRef.current.trim());
                lastTranscriptRef.current = '';
                stopActiveRecognition();
                setInterimTranscript('');
                setActiveSyncNotice('Procesando consulta...');
                handleSendMessageRef.current(textToSend);
              }
            }, 1400);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          if (event.error === 'not-allowed') {
            setActiveSyncNotice('Permiso de micrófono no otorgado');
            stopActiveRecognition();
          } else if (event.error !== 'no-speech') {
            // Error de red o incompatibilidad: fallback automático a MediaRecorder + Gemini
            console.warn('SpeechRecognition falló con:', event.error, 'conmutando a MediaRecorder fallback');
            stopActiveRecognition();
            startMediaRecorderFallback();
          }
        };

        recognition.onend = () => {
          // Si la sesión finalizó y tenemos texto pendiente sin enviar
          if (isListeningRef.current) {
            const textToSend = lastTranscriptRef.current.trim();
            stopActiveRecognition();
            setInterimTranscript('');
            if (textToSend) {
              lastTranscriptRef.current = '';
              const normalized = normalizeVoiceQuery(textToSend);
              setActiveSyncNotice('Procesando consulta...');
              handleSendMessageRef.current(normalized);
            }
          }
        };

        activeRecognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (err) {
        console.warn('Error iniciando SpeechRecognition, usando fallback MediaRecorder:', err);
      }
    }

    // Fallback universal con MediaRecorder + Gemini
    startMediaRecorderFallback();
  };


  const startMediaRecorderFallback = async () => {
    if (typeof window === 'undefined' || typeof navigator?.mediaDevices?.getUserMedia !== 'function') {
      setActiveSyncNotice('Tu navegador no permite acceso al micrófono');
      setTimeout(() => setActiveSyncNotice(null), 4000);
      return;
    }

    try {
      const stream = await getMicStream();
      const mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm'))
        ? 'audio/webm'
        : (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4'))
        ? 'audio/mp4'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setListeningState(false);
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 500) return;

        setIsTranscribing(true);
        setActiveSyncNotice('Procesando consulta...');

        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const base64Audio = (reader.result as string).split(',')[1];
              const res = await fetch('/api/copilot/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioBase64: base64Audio, mimeType: blob.type }),
              });

              if (res.ok) {
                const data = await res.json();
                if (data.transcript && data.transcript.trim().length > 0) {
                  const normalized = normalizeVoiceQuery(data.transcript);
                  handleSendMessageRef.current(normalized);
                  setActiveSyncNotice(null);
                } else {
                  setActiveSyncNotice('No se detectó audio claro. Intenta de nuevo.');
                  setTimeout(() => setActiveSyncNotice(null), 3000);
                }
              }
            } catch (transcribeErr) {
              console.error('Error enviando audio para transcripción:', transcribeErr);
              setActiveSyncNotice('Error de transcripción de voz');
              setTimeout(() => setActiveSyncNotice(null), 3000);
            } finally {
              setIsTranscribing(false);
            }
          };
          reader.readAsDataURL(blob);
        } catch (err) {
          console.error('Error procesando audio blob:', err);
          setIsTranscribing(false);
        }
      };

      recorder.onstart = () => {
        setListeningState(true);
        setActiveSyncNotice('🎤 Escuchando... Toca el micrófono para enviar');
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
    } catch (err: any) {
      console.warn('Error accediendo al micrófono:', err);
      setActiveSyncNotice('Permiso de micrófono requerido en tu navegador');
      setTimeout(() => setActiveSyncNotice(null), 4000);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawQuery = (textToSend || '').trim();
    if (!rawQuery || loading) return;
    const query = normalizeVoiceQuery(rawQuery);
    if (!query || loading) return;

    const userMsg: CopilotMessage = { role: 'user', content: query };
    const currentHistory = messagesRef.current;
    const updated = [...currentHistory, userMsg];
    setMessages(updated);
    setLoading(true);
    setInterimTranscript('');

    try {
      // 1. Invocación directa y optimizada a askEvCopilot (baja latencia sub-1.5s)
      const response = await askEvCopilot(query, context, updated);
      if (response.quota?.remaining !== undefined) {
        setDailyQuotaRemaining(response.quota.remaining);
      }
      const assistantMsg: CopilotMessage = {
        role: 'assistant',
        content: response.text,
        destination: response.destination,
        chargers: response.chargers,
        places: response.places,
        action: response.action,
        waypoint: response.waypoint,
      };

      setMessages(prev => {
        const hasUser = prev.some(m => m === userMsg || (m.role === 'user' && m.content === userMsg.content && Math.abs(prev.indexOf(m) - prev.length) <= 2));
        return hasUser ? [...prev, assistantMsg] : [...prev, userMsg, assistantMsg];
      });

      // 2. Iniciar reproducción hablada de voz de inmediato
      speakText(response.text);

      // 3. Sincronización asíncrona de mapa en segundo plano (sin bloquear el audio)
      if (response.action === 'add_waypoint' && response.waypoint) {
        addWaypointToRoute(response.waypoint, true).catch(err => console.warn('Error en waypoint:', err));
      } else if (autoSyncMap && response.destination && response.destination.lat && response.destination.lng) {
        applyDestinationToMap(response.destination, true, response.chargers).catch(err => console.warn('Error mapeando destino:', err));
      } else if (autoSyncMap && response.chargers && response.chargers.length > 0 && ((context?.activeTrip?.arrivalSoc ?? 100) < 20)) {
        flyToChargerOnMap(response.chargers[0]);
      }
    } catch (err) {
      console.error('Error al procesar consulta de voz:', err);
    } finally {
      setLoading(false);
    }
  };

  handleSendMessageRef.current = handleSendMessage;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '520px',
      background: 'rgba(11, 23, 19, 0.96)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(16, 185, 129, 0.45)',
      borderRadius: '20px',
      boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 20px rgba(16, 185, 129, 0.15)',
      display: isOpen ? 'flex' : 'none',
      flexDirection: 'column',
      zIndex: 40,
      overflow: 'hidden',
      animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      transform: 'translateZ(0)',
      contain: 'paint layout',
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
            <img src="/logo.png" alt="ChargeWay" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Asistente de Viaje</span>
              {dailyQuotaRemaining !== null && (
                <span
                  title="Límite diario de 20 consultas por usuario"
                  style={{
                    fontSize: '0.64rem',
                    padding: '1px 6px',
                    borderRadius: '6px',
                    background: dailyQuotaRemaining <= 3 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.18)',
                    color: dailyQuotaRemaining <= 3 ? '#fca5a5' : '#6ee7b7',
                    border: dailyQuotaRemaining <= 3 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.35)',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                  }}
                >
                  {dailyQuotaRemaining}/20 hoy
                </span>
              )}
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

      {/* Sync Toast Notification / Live Mic Transcript */}
      {(activeSyncNotice || isListening || interimTranscript) && (
        <div style={{
          background: isListening ? 'rgba(59, 130, 246, 0.25)' : 'rgba(16, 185, 129, 0.25)',
          borderBottom: isListening ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(16, 185, 129, 0.3)',
          padding: '5px 12px',
          fontSize: '0.72rem',
          color: isListening ? '#93c5fd' : '#6ee7b7',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          justifyContent: 'center',
          fontWeight: 500,
        }}>
          {isListening ? (
            <Mic size={13} className="animate-pulse" color="#60a5fa" />
          ) : (
            <CheckCircle2 size={12} color="#34d399" />
          )}
          {interimTranscript ? `[Escuchando: "${interimTranscript}"]` : (activeSyncNotice || '🎤 Escuchando... Habla ahora')}
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
                  <img src="/logo.png" alt="ChargeWay" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
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

                {/* Interactive Map Actions and Recommendations for Assistant Messages */}
                {!isUser && (m.destination || (m.chargers && m.chargers.length > 0) || (m.places && m.places.length > 0)) && (
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

                    {/* Estaciones de Recarga en Copiloto (Paradas necesarias o resultados de búsqueda) */}
                    {m.chargers && m.chargers.length > 0 && (() => {
                      const necessaryInMessage = m.chargers.filter(c => c.isNecessaryStop);
                      const isNecessaryMode = necessaryInMessage.length > 0;
                      const displayChargers = isNecessaryMode ? necessaryInMessage : m.chargers.slice(0, 5);

                      return (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{
                            fontSize: '0.68rem',
                            color: isNecessaryMode ? '#fbbf24' : '#34d399',
                            marginBottom: '6px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}>
                            <Zap size={13} color={isNecessaryMode ? '#fbbf24' : '#34d399'} />
                            <span>
                              {isNecessaryMode
                                ? `Paradas de recarga necesarias (${displayChargers.length}):`
                                : `Estaciones más cercanas (${displayChargers.length}):`}
                            </span>
                          </div>

                          {isNecessaryMode && displayChargers.length > 1 && (
                            <button
                              onClick={() => addAllNecessaryStopsToRoute(displayChargers)}
                              style={{
                                width: '100%',
                                marginBottom: '6px',
                                padding: '5px 8px',
                                background: 'rgba(245, 158, 11, 0.25)',
                                border: '1px solid rgba(245, 158, 11, 0.7)',
                                borderRadius: '6px',
                                color: '#fef3c7',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px',
                              }}
                            >
                              <span>⚡</span>
                              <span>Añadir todas las paradas necesarias ({displayChargers.length})</span>
                            </button>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {displayChargers.map((ch, cIdx) => {
                              const isAdded = addedStopNames.has(ch.name);
                              return (
                                <div
                                  key={cIdx}
                                  style={{
                                    background: isNecessaryMode ? 'rgba(245, 158, 11, 0.18)' : 'rgba(16, 185, 129, 0.12)',
                                    border: `1px solid ${isNecessaryMode ? 'rgba(245, 158, 11, 0.6)' : 'rgba(16, 185, 129, 0.4)'}`,
                                    borderRadius: '8px',
                                    padding: '6px 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '6px',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                                    <Zap size={12} color={isNecessaryMode ? '#fbbf24' : '#34d399'} className="shrink-0" />
                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                                      <span
                                        style={{
                                          fontSize: '0.72rem',
                                          color: isNecessaryMode ? '#fef3c7' : '#ecfdf5',
                                          fontWeight: 600,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        }}
                                        title={ch.name}
                                      >
                                        {ch.name}
                                      </span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                        {isNecessaryMode && (
                                          <span style={{
                                            fontSize: '0.58rem',
                                            color: '#fbbf24',
                                            background: 'rgba(245, 158, 11, 0.28)',
                                            border: '1px solid rgba(245, 158, 11, 0.7)',
                                            padding: '0 4px',
                                            borderRadius: '3px',
                                            fontWeight: 700,
                                            whiteSpace: 'nowrap',
                                          }}>
                                            ⚡ Parada {ch.totalLegs && ch.totalLegs > 1 ? `${ch.legIndex}/${ch.totalLegs}` : 'Necesaria'}
                                          </span>
                                        )}
                                        {ch.distKm !== undefined && (
                                          <span style={{
                                            fontSize: '0.6rem',
                                            color: '#38bdf8',
                                            background: 'rgba(56, 189, 248, 0.2)',
                                            border: '1px solid rgba(56, 189, 248, 0.5)',
                                            padding: '0 5px',
                                            borderRadius: '4px',
                                            fontWeight: 700,
                                            whiteSpace: 'nowrap',
                                          }}>
                                            📍 {ch.distKm} km
                                          </span>
                                        )}
                                        {ch.power && (
                                          <span style={{
                                            fontSize: '0.6rem',
                                            color: isNecessaryMode ? '#fbbf24' : '#34d399',
                                            background: isNecessaryMode ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.22)',
                                            padding: '0 5px',
                                            borderRadius: '4px',
                                            fontWeight: 700,
                                            whiteSpace: 'nowrap',
                                          }}>
                                            {ch.power}
                                          </span>
                                        )}
                                        {ch.operator && ch.operator.toLowerCase() !== 'supabase' && (
                                          <span style={{
                                            fontSize: '0.58rem',
                                            color: 'rgba(255, 255, 255, 0.65)',
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            padding: '0 4px',
                                            borderRadius: '3px',
                                            whiteSpace: 'nowrap',
                                          }}>
                                            {ch.operator}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                    <button
                                      onClick={() => flyToChargerOnMap(ch)}
                                      style={{
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        border: '1px solid rgba(255, 255, 255, 0.18)',
                                        borderRadius: '5px',
                                        color: '#e2e8f0',
                                        fontSize: '0.65rem',
                                        padding: '3px 7px',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                      }}
                                      title="Ver ubicación en el mapa"
                                    >
                                      <span>🔍</span>
                                      <span>Ver</span>
                                    </button>
                                    <button
                                      onClick={() => addWaypointToRoute(ch)}
                                      disabled={isAdded}
                                      style={{
                                        background: isAdded
                                          ? 'rgba(16, 185, 129, 0.2)'
                                          : isNecessaryMode
                                          ? 'rgba(245, 158, 11, 0.6)'
                                          : 'rgba(16, 185, 129, 0.45)',
                                        border: `1px solid ${
                                          isAdded
                                            ? 'rgba(16, 185, 129, 0.5)'
                                            : isNecessaryMode
                                            ? 'rgba(245, 158, 11, 0.9)'
                                            : 'rgba(16, 185, 129, 0.8)'
                                        }`,
                                        borderRadius: '5px',
                                        color: isAdded ? '#a7f3d0' : '#ffffff',
                                        fontSize: '0.65rem',
                                        padding: '3px 8px',
                                        cursor: isAdded ? 'default' : 'pointer',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                      }}
                                      title={isAdded ? 'Esta estación ya fue agregada como parada' : 'Añadir esta estación como parada intermedia'}
                                    >
                                      <span>{isAdded ? '✓' : '➕'}</span>
                                      <span>{isAdded ? 'Añadida' : 'Parada'}</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Recomendaciones de Google Places (Qué hacer / Dónde comer / Turismo) */}
                    {m.places && m.places.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '0.66rem', color: '#38bdf8', marginBottom: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>📍</span>
                          <span>Recomendaciones en la zona (Google Places):</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {m.places.map((place, pIdx) => (
                            <div
                              key={pIdx}
                              style={{
                                background: 'rgba(56, 189, 248, 0.08)',
                                border: '1px solid rgba(56, 189, 248, 0.25)',
                                borderRadius: '6px',
                                padding: '5px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '6px',
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '0.7rem', color: '#e0f2fe', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {place.name}
                                  </span>
                                  {place.rating && (
                                    <span style={{ fontSize: '0.62rem', color: '#fbbf24', fontWeight: 700 }}>
                                      ★ {place.rating}
                                    </span>
                                  )}
                                </div>
                                {place.address && (
                                  <div style={{ fontSize: '0.6rem', color: 'rgba(255, 255, 255, 0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {place.address}
                                  </div>
                                )}
                              </div>
                              {place.mapsUri && (
                                <a
                                  href={place.mapsUri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    background: 'rgba(56, 189, 248, 0.2)',
                                    border: '1px solid rgba(56, 189, 248, 0.4)',
                                    borderRadius: '4px',
                                    color: '#bae6fd',
                                    fontSize: '0.62rem',
                                    padding: '2px 6px',
                                    textDecoration: 'none',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Ver mapa ↗
                                </a>
                              )}
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
      {(isListening || isSpeaking || isTranscribing) && (
        <div style={{
          padding: '8px 14px',
          background: isTranscribing ? 'rgba(6, 182, 212, 0.15)' : isListening ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          fontSize: '0.74rem',
          fontWeight: 600,
          color: isTranscribing ? '#22d3ee' : isListening ? '#f87171' : '#34d399',
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
              background: isTranscribing ? '#06b6d4' : '#ef4444',
              animation: 'pulseRing 1.5s infinite',
            }} />
          )}
          {isTranscribing ? 'Procesando consulta...' : isListening ? 'Escuchando tu voz... Habla con naturalidad' : 'Hablando con Voz Humana HD...'}
        </div>
      )}

      {/* Input / Mic Controls */}
      {/* Isolated Memoized Input Bar to eliminate typing re-render lag */}
      <CopilotChatInput
        onSend={handleSendMessage}
        isListening={isListening}
        isTranscribing={isTranscribing}
        onToggleListening={toggleListening}
        loading={loading}
      />
    </div>
  );
});

interface CopilotChatInputProps {
  onSend: (text: string) => void;
  isListening: boolean;
  isTranscribing: boolean;
  onToggleListening: () => void;
  loading: boolean;
}

const CopilotChatInput = React.memo<CopilotChatInputProps>(({
  onSend,
  isListening,
  isTranscribing,
  onToggleListening,
  loading,
}) => {
  const [text, setText] = useState('');

  const submit = () => {
    const q = text.trim();
    if (!q || loading) return;
    onSend(q);
    setText('');
  };

  return (
    <div style={{
      padding: '12px',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      background: 'rgba(5, 14, 10, 0.85)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      <button
        onClick={onToggleListening}
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
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={isTranscribing ? 'Transcribiendo audio...' : isListening ? 'Escuchando... Toca el micro para enviar' : 'Pregunta o pide un destino...'}
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
        onClick={submit}
        disabled={!text.trim() || loading}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '11px',
          border: 'none',
          background: text.trim() ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
          color: text.trim() ? '#041f16' : 'rgba(255, 255, 255, 0.3)',
          cursor: text.trim() ? 'pointer' : 'default',
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
  );
});
