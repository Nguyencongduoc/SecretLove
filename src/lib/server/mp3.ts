import 'server-only';
import { MPEGDecoder } from 'mpg123-decoder';
import { AppError } from './errors';
import { AUDIO_HARD_MAX, AUDIO_MAX_SECONDS } from '@/lib/audio-limits';
export { AUDIO_HARD_MAX } from '@/lib/audio-limits';
export function audioLimit() {
  const value = process.env.MAX_AUDIO_UPLOAD_BYTES;
  if (!value) return AUDIO_HARD_MAX;
  const parsed = Number(value);
  if (
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(parsed) ||
    parsed < 1024 ||
    parsed > AUDIO_HARD_MAX
  )
    throw new AppError(503, 'AUDIO_CONFIGURATION', 'Audio uploads are temporarily unavailable.');
  return parsed;
}
const invalid = () =>
  new AppError(
    422,
    'INVALID_AUDIO',
    `Use a valid MP3 up to ${AUDIO_MAX_SECONDS / 60} minutes. Other formats are not supported.`,
  );
// Strict MPEG Layer III framing. Strip ID3v2, ID3v1 and APE tags; reject arbitrary trailing data.
export function inspectMp3(input: Buffer, maximum = audioLimit()) {
  if (!input.length || input.length > maximum)
    throw new AppError(
      413,
      'PAYLOAD_TOO_LARGE',
      `Choose an MP3 up to ${Math.floor(maximum / 1024)} KiB.`,
    );
  let start = 0,
    end = input.length;
  if (input.subarray(0, 3).toString() === 'ID3') {
    if (
      input.length < 10 ||
      ![2, 3, 4].includes(input[3]) ||
      input[4] === 255 ||
      [...input.subarray(6, 10)].some((v) => v > 127)
    )
      throw invalid();
    const size = (input[6] << 21) | (input[7] << 14) | (input[8] << 7) | input[9];
    start = 10 + size + (input[3] === 4 && input[5] & 16 ? 10 : 0);
    if (start > end) throw invalid();
  }
  if (end - start >= 128 && input.subarray(end - 128, end - 125).toString() === 'TAG') end -= 128;
  if (end - start >= 32 && input.subarray(end - 32, end - 24).toString() === 'APETAGEX') {
    const size = input.readUInt32LE(end - 20),
      flags = input.readUInt32LE(end - 12);
    if (size < 32 || size > end - start) throw invalid();
    end -= size;
    if (flags & 0x80000000) {
      if (end - start < 32 || input.subarray(end - 32, end - 24).toString() !== 'APETAGEX')
        throw invalid();
      end -= 32;
    }
  }
  let offset = start,
    duration = 0,
    rate = 0,
    channels = 0,
    count = 0;
  const frames: Buffer[] = [];
  while (offset < end) {
    if (end - offset < 4) throw invalid();
    const b = input[offset + 1],
      c = input[offset + 2],
      d = input[offset + 3];
    const version = (b >> 3) & 3,
      layer = (b >> 1) & 3,
      bitrateIndex = c >> 4,
      sampleIndex = (c >> 2) & 3;
    if (
      input[offset] !== 255 ||
      (b & 224) !== 224 ||
      version === 1 ||
      layer !== 1 ||
      bitrateIndex === 0 ||
      bitrateIndex === 15 ||
      sampleIndex === 3 ||
      (d & 3) === 2
    )
      throw invalid();
    const hz = [44100, 48000, 32000][sampleIndex] / (version === 3 ? 1 : version === 2 ? 2 : 4);
    const bits =
      (version === 3
        ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
        : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160])[bitrateIndex] * 1000;
    const length = Math.floor(((version === 3 ? 144 : 72) * bits) / hz) + ((c >> 1) & 1);
    const channelCount = d >> 6 === 3 ? 1 : 2;
    if (
      offset + length > end ||
      length < 24 ||
      (rate && (rate !== hz || channels !== channelCount))
    )
      throw invalid();
    rate = hz;
    channels = channelCount;
    duration += (version === 3 ? 1152 : 576) / hz;
    if (duration > AUDIO_MAX_SECONDS) throw invalid();
    frames.push(input.subarray(offset, offset + length));
    count++;
    offset += length;
  }
  if (count < 3 || !duration) throw invalid();
  const data = Buffer.concat(frames);
  return { data, frames, duration, sampleRate: rate };
}
let inspecting = 0;
export async function normalizeAudio(input: Buffer) {
  if (inspecting >= 2)
    throw new AppError(503, 'TEMPORARILY_UNAVAILABLE', 'Try uploading again in a moment.');
  inspecting++;
  let decoder: MPEGDecoder | undefined;
  try {
    const inspected = inspectMp3(input);
    decoder = new MPEGDecoder();
    await decoder.ready;
    const deadline = Date.now() + 8000;
    let samples = 0;
    // Decode bounded batches and discard PCM, rather than allocating the whole waveform.
    for (let i = 0; i < inspected.frames.length; i += 32) {
      if (Date.now() > deadline) throw invalid();
      const decoded = decoder.decodeFrames(inspected.frames.slice(i, i + 32));
      if (
        decoded.errors.length ||
        (decoded.samplesDecoded && decoded.sampleRate !== inspected.sampleRate)
      )
        throw invalid();
      samples += decoded.samplesDecoded;
    }
    if (samples === 0) throw invalid();
    const sanitized = inspectMp3(inspected.data);
    return { data: sanitized.data, duration: sanitized.duration };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw invalid();
  } finally {
    decoder?.free();
    inspecting--;
  }
}
