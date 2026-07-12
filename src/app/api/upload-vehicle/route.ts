import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// Utilizamos eval('require') para engañar a Webpack y evitar que intente empaquetar 
// estos módulos nativos de Node.js durante la construcción en Vercel,
// los cuales serán resueltos en tiempo de ejecución de Node.js sin problemas.
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

    // 1. Detección de placas con Google Cloud Vision (TEMPORALMENTE DESHABILITADO PARA DESPLIEGUE)
    let finalBuffer = buffer;
    
    // TODO: Implementar difuminación de placas mediante REST API en lugar de @google-cloud/vision
    // para evitar problemas con el empaquetado de dependencias nativas en Vercel.

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
