const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

async function main() {
  const text = process.argv[2] || 'Hola';
  const voice = process.argv[3] || 'es-EC-AndreaNeural';

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);

    const chunks = [];
    audioStream.on('data', chunk => chunks.push(chunk));
    audioStream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      process.stdout.write(buffer);
      process.exit(0);
    });
    audioStream.on('error', err => {
      console.error(err);
      process.exit(1);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
