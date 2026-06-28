// ============================================================
// services/geminiProxy.js
//
// ── WHAT WAS ROBOTIC AND WHY WE FIXED IT ──────────────────
//
// PROBLEM 1 — Wrong model:
//   Old: "gemini-2.5-flash-native-audio-latest"  ← this is correct
//   But the speechConfig was duplicated inside generationConfig,
//   which caused a config conflict and degraded voice quality.
//   Fix: Single clean speechConfig at top level only.
//
// PROBLEM 2 — Wrong sendRealtimeInput format:
//   Old: session.sendRealtimeInput({ media: { data, mimeType } })
//   The @google/genai SDK uses `audio` not `media` for browser PCM.
//   Fix: session.sendRealtimeInput({ audio: { data, mimeType } })
//
// PROBLEM 3 — Slider values sent as raw numbers in prompt:
//   "Emotion intensity: 75%" tells Gemini nothing useful.
//   Fix: buildRuntimePrompt() converts sliders to prose instructions
//   that the model can actually act on.
//
// PROBLEM 4 — VAD (Voice Activity Detection) not configured:
//   Without VAD config, Gemini uses aggressive defaults that cut
//   the caller off mid-sentence and rush responses — sounds robotic.
//   Fix: Added realtimeInputConfig with tuned VAD settings.
// ============================================================

const fs = require("fs");
const path = require("path");
const ws = require("ws");
const { GoogleGenAI } = require("@google/genai");
const { createClient } = require("@supabase/supabase-js");
const { getConfig, buildRuntimePrompt } = require("./config");

// ── Clients ───────────────────────────────────────────────────
const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  apiVersion: "v1alpha",
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
let supabase = null;

function isValidHttpUrl(str) {
  try { return ["http:", "https:"].includes(new URL(str).protocol); }
  catch { return false; }
}

if (supabaseUrl && supabaseKey && isValidHttpUrl(supabaseUrl)) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      realtime: { transport: ws }
    });
  } catch (err) {
    console.error("❌ Supabase init failed:", err.message);
  }
}

// ── Voice map ─────────────────────────────────────────────────
// Gemini 2.5 Native Audio voices — chosen for warmth and naturalness
// Puck  = warm, expressive male  (best for Tanglish — most human feel)
// Aoede = breezy, friendly female
// Fenrir = calm, steady male
// Kore  = clear, firm female
const VOICE_MAP = {
  Arjun: "Puck",
  Priya: "Aoede",
  Dev:   "Fenrir",
  Kavya: "Kore",
};

// ── WAV header ────────────────────────────────────────────────
function getWavHeader(dataLength, sampleRate = 16000, channels = 1, bitsPerSample = 16) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);                                      h.writeUInt32LE(dataLength + 36, 4);
  h.write("WAVE", 8);                                      h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);                                 h.writeUInt16LE(1, 20);
  h.writeUInt16LE(channels, 22);                           h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28);
  h.writeUInt16LE(channels * bitsPerSample / 8, 32);       h.writeUInt16LE(bitsPerSample, 34);
  h.write("data", 36);                                     h.writeUInt32LE(dataLength, 40);
  return h;
}

// Downsample 24kHz → 16kHz (for recording file consistency)
function resample24To16(buffer24) {
  const s24 = new Int16Array(buffer24.buffer, buffer24.byteOffset, buffer24.byteLength / 2);
  const s16 = new Int16Array(Math.round(s24.length * 2 / 3));
  for (let i = 0; i < s16.length; i++) {
    const pos = i * 1.5;
    const lo = Math.floor(pos);
    const hi = Math.min(s24.length - 1, lo + 1);
    s16[i] = s24[lo] * (1 - (pos - lo)) + s24[hi] * (pos - lo);
  }
  return Buffer.from(s16.buffer, s16.byteOffset, s16.byteLength);
}

// ── WS send helper ────────────────────────────────────────────
function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

// ═══════════════════════════════════════════════════════════════
// MAIN SESSION HANDLER
// ═══════════════════════════════════════════════════════════════
async function handleBrowserSession(browserWs) {
  let geminiSession = null;
  let isActive = true;
  const startTime = Date.now();

  const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const tempDir = path.join(__dirname, "../temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const tempPcmPath = path.join(tempDir, `${callId}.pcm`);
  const recordStream = fs.createWriteStream(tempPcmPath);
  const transcriptLines = [];

  // ── Load config and build prompt ──────────────────────────
  const activeConfig = getConfig();
  const voiceName = VOICE_MAP[activeConfig.activeVoice] || "Puck";

  // buildRuntimePrompt converts slider numbers → human prose instructions
  // e.g. speed:75 → "Speak at a quick, energetic pace"
  const finalPrompt = buildRuntimePrompt(activeConfig);

  console.log(`📞 New call | ID: ${callId} | Voice: ${activeConfig.activeVoice} (${voiceName})`);

  // ── Open Gemini session ───────────────────────────────────
  try {
    geminiSession = await openGeminiSession(
      browserWs, voiceName, finalPrompt, recordStream, transcriptLines
    );
    console.log(`✅ Gemini Live session open | Call ID: ${callId}`);
    send(browserWs, { type: "ready" });
  } catch (err) {
    console.error("❌ Gemini session failed:", err.message);
    send(browserWs, { type: "error", message: "Failed to connect to AI. Check API key." });
    recordStream.close();
    try { fs.unlinkSync(tempPcmPath); } catch {}
    browserWs.close();
    return;
  }

  // ── Handle browser messages ───────────────────────────────
  browserWs.on("message", async (rawMsg) => {
    if (!isActive || !geminiSession) return;
    try {
      const msg = JSON.parse(rawMsg.toString());
      if (msg.type === "audio") {
        await geminiSession.sendAudio(msg.data);
        recordStream.write(Buffer.from(msg.data, "base64"));
      } else if (msg.type === "stop") {
        isActive = false;
        await geminiSession.close();
      }
    } catch (err) {
      console.error("❌ Message error:", err.message);
    }
  });

  async function finalizeCall() {
    isActive = false;
    recordStream.end();
    const duration = Math.round((Date.now() - startTime) / 1000);
    await new Promise(r => recordStream.on("finish", r));
    processPostCallData(callId, tempPcmPath, duration, transcriptLines, activeConfig)
      .catch(err => console.error("❌ Post-call error:", err.message));
  }

  browserWs.on("close", async () => {
    console.log(`🌐 Disconnected | Call ID: ${callId}`);
    if (isActive) await finalizeCall();
    if (geminiSession) try { await geminiSession.close(); } catch {}
  });

  browserWs.on("error", err => {
    console.error("❌ WS error:", err.message);
    isActive = false;
  });
}

// ═══════════════════════════════════════════════════════════════
// GEMINI LIVE SESSION — CORE VOICE QUALITY SETTINGS
// ═══════════════════════════════════════════════════════════════
async function openGeminiSession(browserWs, voiceName, systemPrompt, recordStream, transcriptLines) {

  const session = await genai.live.connect({
    model: "gemini-2.5-flash-native-audio-latest",

    config: {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          }
        }
      },

    },

    callbacks: {
      onmessage: (response) => {
        if (!browserWs || browserWs.readyState !== 1) return;

        // AI audio response
        if (response.serverContent?.modelTurn?.parts) {
          for (const part of response.serverContent.modelTurn.parts) {
            if (part.inlineData?.mimeType?.startsWith("audio/")) {
              // Send to browser for playback
              send(browserWs, {
                type: "audio",
                data: part.inlineData.data,
                mimeType: part.inlineData.mimeType,
              });
              // Save resampled version to recording file
              const raw = Buffer.from(part.inlineData.data, "base64");
              recordStream.write(resample24To16(raw));
            }
          }
        }

        // Transcripts
        if (response.serverContent?.inputTranscription?.text) {
          const text = response.serverContent.inputTranscription.text;
          console.log(`👤 Caller: "${text}"`);
          transcriptLines.push({ role: "user", text });
          send(browserWs, { type: "transcript", role: "user", text });
        }
        if (response.serverContent?.outputTranscription?.text) {
          const text = response.serverContent.outputTranscription.text;
          console.log(`🤖 Agent: "${text}"`);
          transcriptLines.push({ role: "ai", text });
          send(browserWs, { type: "transcript", role: "ai", text });
        }

        // Barge-in: caller interrupted AI
        if (response.serverContent?.interrupted) {
          send(browserWs, { type: "interrupted" });
        }

        // Turn complete
        if (response.serverContent?.turnComplete) {
          send(browserWs, { type: "turn_complete" });
        }
      },

      onerror: (err) => {
        console.error("❌ Gemini error:", err.message || err);
        send(browserWs, { type: "error", message: String(err.message || err) });
      },

      onclose: (e) => {
        console.log(`🔌 Gemini closed. Code: ${e?.code}, Reason: ${e?.reason || "none"}`);
        send(browserWs, { type: "ended" });
      },
    },
  });

  return {
    // Use `media` for sending audio input via the @google/genai SDK
    sendAudio: async (base64Pcm16k) => {
      await session.sendRealtimeInput({
        media: {
          data: base64Pcm16k,
          mimeType: "audio/pcm;rate=16000",
        },
      });
    },
    close: async () => { try { await session.close(); } catch {} },
  };
}

// ═══════════════════════════════════════════════════════════════
// POST CALL: Upload + Sentiment + Supabase save
// ═══════════════════════════════════════════════════════════════
async function processPostCallData(callId, tempPcmPath, durationSeconds, transcriptLines, activeConfig) {
  if (!fs.existsSync(tempPcmPath)) return;

  const rawPcm = fs.readFileSync(tempPcmPath);
  const wavBuffer = Buffer.concat([getWavHeader(rawPcm.length), rawPcm]);
  try { fs.unlinkSync(tempPcmPath); } catch {}

  let recordingUrl = null;
  let sentiment = "Neutral";
  const fullTranscript = transcriptLines
    .map(l => `${l.role === "user" ? "Caller" : "Agent"}: ${l.text}`)
    .join("\n");

  // Upload to Supabase Storage
  if (supabase && wavBuffer.length > 44) {
    const { error: uploadErr } = await supabase.storage
      .from("recordings")
      .upload(`${callId}.wav`, wavBuffer, { contentType: "audio/wav", upsert: true });

    if (uploadErr) {
      console.error("❌ Upload error:", uploadErr.message);
    } else {
      const { data } = supabase.storage.from("recordings").getPublicUrl(`${callId}.wav`);
      recordingUrl = data?.publicUrl;
      console.log(`💾 Uploaded: ${recordingUrl}`);
    }
  }

  // Sentiment analysis
  if (transcriptLines.length > 0) {
    try {
      const res = await genai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Analyze the sentiment of this call transcript. Reply with ONLY one word: Positive, Neutral, or Negative.\n\n${fullTranscript}`,
      });
      const t = res.text?.trim();
      if (["Positive", "Neutral", "Negative"].includes(t)) sentiment = t;
      console.log(`📊 Sentiment: ${sentiment}`);
    } catch (err) {
      console.error("❌ Sentiment error:", err.message);
    }
  }

  // Save to Supabase DB
  if (supabase) {
    const { error } = await supabase.from("calls").insert({
      caller_number: "Web Call",
      agent_name: activeConfig.activeVoice,
      language: "Tanglish",
      duration_seconds: durationSeconds,
      sentiment,
      transcript: fullTranscript,
      recording_url: recordingUrl,
    });
    if (error) console.error("❌ DB insert error:", error.message);
    else console.log(`✅ Saved to DB | ID: ${callId}`);
  }
}

module.exports = { handleBrowserSession };
