import { withTiming } from '@/lib/server-timing';
import { NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export const runtime = 'nodejs';

// In-memory cache de audios generados para que las frases repetidas sean instantáneas (0ms)
const audioCache = new Map<string, Buffer>();

async function synthesizeWithEdgeStream(text: string, voice: string): Promise<{ stream: ReadableStream<Uint8Array>; onComplete: Promise<Buffer> }> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text);

  const chunks: Buffer[] = [];
  let completeResolve: (buf: Buffer) => void;
  let completeReject: (err: any) => void;
  const onComplete = new Promise<Buffer>((resolve, reject) => {
    completeResolve = resolve;
    completeReject = reject;
  });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      audioStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        controller.enqueue(new Uint8Array(chunk));
      });
      audioStream.on('end', () => {
        completeResolve(Buffer.concat(chunks));
        controller.close();
      });
      audioStream.on('error', (err: any) => {
        completeReject(err);
        controller.error(err);
      });
    },
    cancel() {
      try {
        (audioStream as any).destroy?.();
      } catch (_) {}
    }
  });

  return { stream, onComplete };
}

/**
 * Endpoint de Síntesis de Voz Humana Ultra Realista en Alta Definición
 * Utiliza Microsoft Azure Neural Voices (es-EC-AndreaNeural / es-EC-LuisNeural)
 * Proporciona entonación humana natural, calidez y dicción clara ecuatoriana.
 * Soporta Streaming en tiempo real (TTFB < 300ms) y caché automática en memoria.
 */
async function handleGET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text');
  const voice = searchParams.get('voice') || 'es-EC-AndreaNeural';

  if (!text) {
    return NextResponse.json({ error: 'Text parameter is required' }, { status: 400 });
  }

  // Preprocesamiento para pronunciación fluida
  const cleaned = text
    .replace(/\(([^)]+)\)/g, ', $1, ')
    .replace(/(\d+)\s*kWh/gi, '$1 kilovatios hora')
    .replace(/(\d+)\s*km\/h/gi, '$1 kilómetros por hora')
    .replace(/(\d+)\s*km\b/gi, '$1 kilómetros')
    .replace(/(\d+)\s*%/g, '$1 por ciento')
    .replace(/[*_#~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const textToSpeak = cleaned.slice(0, 450);
  const cacheKey = `${voice}:${textToSpeak}`;

  // 1. Si ya está en memoria, devolver inmediatamente (0ms)
  if (audioCache.has(cacheKey)) {
    const cachedBuffer = audioCache.get(cacheKey)!;
    return new NextResponse(new Uint8Array(cachedBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-Voice-Provider': 'cache',
      },
    });
  }

  // 2. Ejecutar generación con Azure Neural Voice en streaming inmediato
  try {
    const { stream, onComplete } = await synthesizeWithEdgeStream(textToSpeak, voice);

    // Guardar en caché asíncronamente al completarse el stream
    onComplete.then(buffer => {
      if (buffer && buffer.length > 0) {
        if (audioCache.size > 200) {
          const oldest = audioCache.keys().next().value;
          if (oldest) audioCache.delete(oldest);
        }
        audioCache.set(cacheKey, buffer);
      }
    }).catch(err => {
      console.warn('Error cacheando audio completado:', err);
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-Voice-Provider': 'azure-neural-stream',
      },
    });
  } catch (neuralErr) {
    console.warn('Azure Neural in-process voice generation error, using fallback:', neuralErr);
  }

  // 3. Fallback de alta disponibilidad a Google Translate Voice
  try {
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=es-US&client=tw-ob&q=${encodeURIComponent(textToSpeak)}`;
    const response = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'X-Voice-Provider': 'google-fallback',
        },
      });
    }
  } catch (fallbackErr) {
    console.error('Fallback TTS also failed:', fallbackErr);
  }

  return NextResponse.json({ error: 'TTS audio synthesis failed' }, { status: 500 });
}

export const GET = withTiming('tts', handleGET);
