import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';

// In-memory cache de audios generados para que las frases repetidas sean instantáneas (0ms)
const audioCache = new Map<string, Buffer>();

/**
 * Endpoint de Síntesis de Voz Humana Ultra Realista en Alta Definición
 * Utiliza Microsoft Azure Neural Voices (es-EC-AndreaNeural / es-EC-LuisNeural)
 * Proporciona entonación humana natural, calidez y dicción clara ecuatoriana.
 */
export async function GET(request: Request) {
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

  // 1. Si ya está en memoria, devolver inmediatamente
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

  // 2. Ejecutar generación con Azure Neural Voice en proceso Node aislado
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate-tts.js');
    const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
      execFile(
        'node',
        [scriptPath, textToSpeak, voice],
        { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024, timeout: 8000 },
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else if (stdout && stdout.length > 0) {
            resolve(stdout);
          } else {
            reject(new Error(stderr ? stderr.toString() : 'Empty audio output'));
          }
        }
      );
    });

    if (audioBuffer && audioBuffer.length > 0) {
      if (audioCache.size > 150) {
        const oldest = audioCache.keys().next().value;
        if (oldest) audioCache.delete(oldest);
      }
      audioCache.set(cacheKey, audioBuffer);

      return new NextResponse(new Uint8Array(audioBuffer), {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'X-Voice-Provider': 'azure-neural',
        },
      });
    }
  } catch (neuralErr) {
    console.warn('Azure Neural voice generation error, using fallback:', neuralErr);
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
