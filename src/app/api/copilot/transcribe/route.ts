import { withTiming } from '@/lib/server-timing';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

async function handlePOST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioBase64, mimeType } = body;

    if (!audioBase64) {
      return NextResponse.json({ error: 'Falta el audio en base64' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY no configurada' }, { status: 500 });
    }

    // Clean mime type (e.g., 'audio/webm;codecs=opus' -> 'audio/webm')
    const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim();

    const targetModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.7-flash'];
    let transcript = '';


    for (const model of targetModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      inlineData: {
                        mimeType: cleanMimeType,
                        data: audioBase64,
                      },

                    },
                    {
                      text: 'Transcribe exactamente lo que dice el conductor en este audio en español de Ecuador. El usuario viaja en vehículo eléctrico por Ecuador y puede mencionar destinos (Quito, Tena, Baños, Ambato, Riobamba, Latacunga, Cotopaxi, Pelileo, Puyo, Ibarra, Cuenca, Guayaquil, Manta, etc.), cargadores o batería. Devuelve ÚNICAMENTE el texto transcrito en texto plano, sin comillas ni explicaciones adicionales.',
                    },
                  ],
                },
              ],
            }),
            signal: AbortSignal.timeout(8000),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            transcript = text.replace(/^["'\s]+|["'\s]+$/g, '').trim();
            break;
          }
        }
      } catch (e) {
        console.warn(`Error transcribiendo con modelo ${model}:`, e);
      }
    }

    return NextResponse.json({ transcript });
  } catch (error: any) {
    console.error('Error en /api/copilot/transcribe:', error);
    return NextResponse.json({ error: error.message || 'Error al transcribir audio' }, { status: 500 });
  }
}

export const POST = withTiming('transcribe', handlePOST);
