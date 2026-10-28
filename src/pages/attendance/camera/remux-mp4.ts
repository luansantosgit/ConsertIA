/**
 * O MediaRecorder do Chrome grava MP4 **fragmentado** (moov + mvex + moof/mdat).
 * O WhatsApp recusa esse container ("algo errado com o arquivo de vídeo"),
 * então remontamos o arquivo como MP4 progressivo (ftyp + moov + mdat).
 *
 * As amostras já codificadas são copiadas — não há re-encode, então a
 * qualidade e o peso permanecem os mesmos. `mp4box` lê os fragmentos e
 * `mp4-muxer` escreve o arquivo progressivo; as duas libs (~170 KB) são
 * importadas sob demanda, somente quando um vídeo é gravado.
 */
import type { Box, Sample, Track } from 'mp4box';
import type { ArrayBufferTarget, Muxer as Mp4Muxer } from 'mp4-muxer';

const MP4_MIME = 'video/mp4';
const MICROS = 1_000_000;

type Mp4BoxModule = typeof import('mp4box');

interface ParsedTrack {
  track: Track;
  samples: Sample[];
}

interface ParsedRecording {
  fragmented: boolean;
  tracks: ParsedTrack[];
}

/** Só MP4 precisa de remux; WebM já é enviado como documento pelo media-sender. */
export function isMp4Recording(file: File): boolean {
  return file.type.split(';')[0].trim().toLowerCase() === MP4_MIME;
}

function micros(value: number, timescale: number): number {
  return timescale > 0 ? Math.round((value / timescale) * MICROS) : 0;
}

/** Lê todos os fragmentos e devolve as amostras de áudio/vídeo em memória. */
async function readRecording(file: File, mp4box: Mp4BoxModule): Promise<ParsedRecording> {
  const iso = mp4box.createFile(true);
  const tracks = new Map<number, ParsedTrack>();
  let fragmented = false;
  let failure: string | null = null;

  iso.onError = (module, message) => {
    failure = `${module}: ${message}`;
  };
  iso.onReady = info => {
    fragmented = info.isFragmented;
    for (const track of info.tracks) {
      if (track.type !== 'video' && track.type !== 'audio') continue;
      tracks.set(track.id, { track, samples: [] });
      iso.setExtractionOptions(track.id, null, { nbSamples: track.nb_samples });
    }
    iso.start();
  };
  iso.onSamples = (id, _user, samples) => {
    tracks.get(id)?.samples.push(...samples);
  };

  try {
    const data = await file.arrayBuffer();
    iso.appendBuffer(mp4box.MP4BoxBuffer.fromArrayBuffer(data, 0), true);
    iso.flush();
  } catch (err) {
    failure = err instanceof Error ? err.message : 'MP4 inválido';
  }

  if (failure) throw new Error(`Não foi possível ler o vídeo: ${failure}`);
  return { fragmented, tracks: [...tracks.values()] };
}

/** Serializa o payload de um box (sem o cabeçalho size/type de 8 bytes). */
function boxPayload(box: Box, DataStream: Mp4BoxModule['DataStream']): Uint8Array {
  const stream = new DataStream();
  box.write(stream);
  return new Uint8Array(stream.buffer).slice(8, box.size);
}

function frameRateOf(entry: ParsedTrack): number {
  const total = entry.samples.reduce((sum, sample) => sum + sample.duration, 0);
  if (total <= 0) return 30;
  return Math.max(1, Math.round(entry.samples.length / (total / entry.track.timescale)));
}

function addSamples(
  muxer: Mp4Muxer<ArrayBufferTarget>,
  entry: ParsedTrack,
  avcC: Uint8Array | null,
  startUs: number,
): void {
  const { track, samples } = entry;
  const isVideo = track.type === 'video';

  for (const [index, sample] of samples.entries()) {
    if (!sample.data) throw new Error('Amostra de vídeo sem dados');
    const timestamp = micros(sample.cts, track.timescale) - startUs;
    const duration = micros(sample.duration, track.timescale);

    if (isVideo) {
      muxer.addVideoChunkRaw(
        sample.data,
        sample.is_sync ? 'key' : 'delta',
        timestamp,
        duration,
        index === 0 && avcC
          ? { decoderConfig: { codec: track.codec, description: avcC } }
          : undefined,
        micros(sample.cts - sample.dts, track.timescale),
      );
    } else {
      muxer.addAudioChunkRaw(sample.data, 'key', timestamp, duration);
    }
  }
}

/**
 * Devolve o próprio arquivo quando ele já é progressivo (ou não é MP4).
 * Lança erro quando o remux falha — o chamador decide o fallback.
 */
export async function remuxToProgressiveMp4(file: File): Promise<File> {
  if (!isMp4Recording(file)) return file;

  const [mp4box, muxerLib] = await Promise.all([import('mp4box'), import('mp4-muxer')]);
  const parsed = await readRecording(file, mp4box);
  if (!parsed.fragmented) return file;

  const video = parsed.tracks.find(entry => entry.track.type === 'video' && entry.samples.length > 0);
  const audio = parsed.tracks.find(entry => entry.track.type === 'audio' && entry.samples.length > 0);
  if (!video) return file;

  const description = video.samples[0].description;
  const avcC = 'boxes' in description
    ? description.boxes?.find((box: Box) => box.type === 'avcC')
    : undefined;
  if (!avcC) return file;

  // Desloca tudo pelo menor timestamp para nunca enviar valor negativo.
  // `firstTimestampBehavior: 'offset'` zera o restante de cada trilha.
  const starts = parsed.tracks.flatMap(entry =>
    entry.samples.map(sample => micros(sample.cts, entry.track.timescale)),
  );
  const startUs = starts.length > 0 ? Math.min(...starts) : 0;

  const muxer = new muxerLib.Muxer({
    target: new muxerLib.ArrayBufferTarget(),
    video: {
      codec: 'avc',
      width: video.track.video?.width || video.track.track_width,
      height: video.track.video?.height || video.track.track_height,
      frameRate: frameRateOf(video),
    },
    audio: audio?.track.audio
      ? {
          codec: 'aac',
          numberOfChannels: audio.track.audio.channel_count,
          sampleRate: audio.track.audio.sample_rate,
        }
      : undefined,
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  addSamples(muxer, video, boxPayload(avcC, mp4box.DataStream), startUs);
  if (audio?.track.audio) addSamples(muxer, audio, null, startUs);

  muxer.finalize();
  const blob = new Blob([muxer.target.buffer], { type: MP4_MIME });
  return new File([blob], file.name, { type: MP4_MIME, lastModified: file.lastModified });
}
