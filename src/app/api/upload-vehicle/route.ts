import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// Utilizamos eval('require') para engañar a Webpack y evitar que intente empaquetar 
// estos módulos nativos de Node.js durante la construcción en Vercel,
// los cuales serán resueltos en tiempo de ejecución de Node.js sin problemas.
const vision = eval('require')('@google-cloud/vision');
const sharp = eval('require')('sharp');
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json({ error: 'Falta el archivo o el userId' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Detección de placas con Google Cloud Vision
    let finalBuffer = buffer;
    try {
      // Necesita configuración de credenciales de Google (GOOGLE_APPLICATION_CREDENTIALS)
      // Si no están configuradas, esto fallará, lo cual es normal en un ambiente sin llaves
      const client = new vision.ImageAnnotatorClient();
      const [result] = await client.textDetection(buffer);
      const detections = result.textAnnotations;

      if (detections && detections.length > 0) {
        // En una implementación robusta buscaríamos el bounding box de la matrícula.
        // Aquí asumiremos que cualquier texto que parezca matrícula se difumina.
        // Para este ejemplo, usamos objectLocalization buscando 'License plate'.
        const [objResult] = await client.objectLocalization(buffer);
        const objects = objResult.localizedObjectAnnotations;
        
        if (objects) {
          const plates = objects.filter(obj => obj.name?.toLowerCase().includes('license plate'));
          
          if (plates.length > 0) {
            // Conseguimos metadatos originales de la imagen
            const metadata = await sharp(buffer).metadata();
            const imgWidth = metadata.width || 1000;
            const imgHeight = metadata.height || 1000;

            let img = sharp(buffer);

            // Difuminar cada placa detectada
            for (const plate of plates) {
              const vertices = plate.boundingPoly?.normalizedVertices;
              if (vertices && vertices.length === 4) {
                // Calcular caja en pixeles
                const left = Math.round(vertices[0].x! * imgWidth);
                const top = Math.round(vertices[0].y! * imgHeight);
                const width = Math.round((vertices[1].x! - vertices[0].x!) * imgWidth);
                const height = Math.round((vertices[2].y! - vertices[1].y!) * imgHeight);

                // Asegurar que las coordenadas son válidas
                if (width > 0 && height > 0) {
                  const region = await img
                    .clone()
                    .extract({ left, top, width, height })
                    .blur(20) // Nivel de difuminado
                    .toBuffer();
                  
                  img = img.composite([{ input: region, top, left }]);
                }
              }
            }
            finalBuffer = await img.toBuffer();
          }
        }
      }
    } catch (visionError) {
      console.warn('Google Cloud Vision error (probablemente faltan credenciales):', visionError);
      // Fallback: se usa la imagen original sin difuminar si falla la IA
    }

    // 2. Subir al Storage de Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const fileName = `${userId}/${randomUUID()}.jpg`;
    
    // Asegurar que guardamos como JPG comprimido
    const compressedBuffer = await sharp(finalBuffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('vehicle_photos')
      .upload(fileName, compressedBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // 3. Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from('vehicle_photos')
      .getPublicUrl(fileName);

    return NextResponse.json({ success: true, url: publicUrlData.publicUrl });

  } catch (error: any) {
    console.error('Error al subir vehículo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
