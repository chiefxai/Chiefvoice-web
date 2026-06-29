// services/audioConverter.js
// ============================================================
// Low-overhead audio translation for G.711 mu-law <-> PCM16
// and sample-rate conversions (8kHz <-> 16kHz <-> 24kHz)
// ============================================================

const BIAS = 0x84;
const CLIP = 32635;

// Populate lookup tables for ultra-fast audio conversion
const muLawEncodeTable = new Uint8Array(65536);
const muLawDecodeTable = new Int16Array(256);

for (let i = -32768; i <= 32767; i++) {
  const pcm = i;
  let sign = 0;
  let sample = pcm;
  if (sample < 0) {
    sample = -sample;
    sign = 0x80;
  }
  if (sample > CLIP) sample = CLIP;
  sample = sample + BIAS;

  let exponent = 7;
  let mask = 0x4000;
  while ((sample & mask) === 0 && exponent > 0) {
    sample <<= 1;
    exponent--;
  }
  let mantissa = (sample >> (exponent + 3)) & 0x0F;
  let val = ~(sign | (exponent << 4) | mantissa);
  muLawEncodeTable[pcm + 32768] = val & 0xFF;
}

for (let i = 0; i < 256; i++) {
  let mulaw = ~i;
  let sign = mulaw & 0x80;
  let exponent = (mulaw >> 4) & 0x07;
  let mantissa = mulaw & 0x0F;
  let sample = (mantissa << 3) + BIAS;
  sample <<= exponent;
  sample -= BIAS;
  muLawDecodeTable[i] = sign ? -sample : sample;
}

/**
 * Decodes 8kHz G.711 mu-law (Twilio inbound) to 8kHz 16-bit linear PCM
 * @param {Buffer} mulawBuffer 
 * @returns {Buffer} pcmBuffer
 */
function mulawToPcm16(mulawBuffer) {
  const pcmBuffer = Buffer.alloc(mulawBuffer.length * 2);
  for (let i = 0; i < mulawBuffer.length; i++) {
    const mulawSample = mulawBuffer[i];
    const pcmSample = muLawDecodeTable[mulawSample];
    pcmBuffer.writeInt16LE(pcmSample, i * 2);
  }
  return pcmBuffer;
}

/**
 * Encodes 8kHz 16-bit linear PCM to 8kHz G.711 mu-law (Twilio outbound)
 * @param {Buffer} pcmBuffer 
 * @returns {Buffer} mulawBuffer
 */
function pcm16ToMulaw(pcmBuffer) {
  const count = pcmBuffer.length / 2;
  const mulawBuffer = Buffer.alloc(count);
  for (let i = 0; i < count; i++) {
    const pcmSample = pcmBuffer.readInt16LE(i * 2);
    // Map negative to positive index correctly
    mulawBuffer[i] = muLawEncodeTable[pcmSample + 32768];
  }
  return mulawBuffer;
}

/**
 * Upsamples 16-bit PCM from 8kHz to 16kHz (for Gemini input)
 * Duplicates each sample (Zero-Order Hold / Linear Interpolation)
 * @param {Buffer} pcm8k 
 * @returns {Buffer} pcm16k
 */
function upsample8To16(pcm8k) {
  const samples8k = pcm8k.length / 2;
  const pcm16k = Buffer.alloc(pcm8k.length * 2);
  for (let i = 0; i < samples8k; i++) {
    const sample = pcm8k.readInt16LE(i * 2);
    pcm16k.writeInt16LE(sample, i * 4);
    pcm16k.writeInt16LE(sample, i * 4 + 2);
  }
  return pcm16k;
}

/**
 * Downsamples 16-bit PCM from 24kHz to 8kHz (for Twilio outbound)
 * Keeps 1 out of every 3 samples
 * @param {Buffer} pcm24k 
 * @returns {Buffer} pcm8k
 */
function downsample24To8(pcm24k) {
  const samples24k = pcm24k.length / 2;
  const samples8k = Math.floor(samples24k / 3);
  const pcm8k = Buffer.alloc(samples8k * 2);
  for (let i = 0; i < samples8k; i++) {
    const sample = pcm24k.readInt16LE(i * 6);
    pcm8k.writeInt16LE(sample, i * 2);
  }
  return pcm8k;
}

/**
 * Downsamples 16-bit PCM from 16kHz to 8kHz
 * Keeps 1 out of every 2 samples
 * @param {Buffer} pcm16k 
 * @returns {Buffer} pcm8k
 */
function downsample16To8(pcm16k) {
  const samples16k = pcm16k.length / 2;
  const samples8k = Math.floor(samples16k / 2);
  const pcm8k = Buffer.alloc(samples8k * 2);
  for (let i = 0; i < samples8k; i++) {
    const sample = pcm16k.readInt16LE(i * 4);
    pcm8k.writeInt16LE(sample, i * 2);
  }
  return pcm8k;
}

module.exports = {
  mulawToPcm16,
  pcm16ToMulaw,
  upsample8To16,
  downsample24To8,
  downsample16To8
};
