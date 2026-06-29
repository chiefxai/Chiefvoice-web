// services/twilioProxy.js
// ============================================================
// Twilio WebSocket Proxy & Telephony Handler for Gemini Live API
// ============================================================

const fs = require("fs");
const path = require("path");
const ws = require("ws");
const { GoogleGenAI } = require("@google/genai");
const { createClient } = require("@supabase/supabase-js");
const { getConfig, buildRuntimePrompt } = require("./config");
const {
  mulawToPcm16,
  pcm16ToMulaw,
  upsample8To16,
  downsample24To8
} = require("./audioConverter");

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
    console.error("❌ Supabase init failed in twilioProxy:", err.message);
  }
}

const VOICE_MAP = {
  Arjun: "Puck",
  Priya: "Aoede",
  Dev:   "Fenrir",
  Kavya: "Kore",
};

// In-memory cache for caller phone numbers mapping CallSid -> From (set in webhook)
const twilioCallNumbers = new Map();

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

// Resample 24kHz -> 16kHz for recording file consistency (so recordings match the browser proxy format)
function resample24To16(buffer24) {
  const aligned = new Uint8Array(buffer24.length);
  aligned.set(buffer24);
  const s24 = new Int16Array(aligned.buffer, aligned.byteOffset, aligned.byteLength / 2);
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
function sendJson(wsConn, obj) {
  if (wsConn.readyState === 1) wsConn.send(JSON.stringify(obj));
}

// ═══════════════════════════════════════════════════════════════
// MAIN TWILIO SESSION HANDLER
// ═══════════════════════════════════════════════════════════════
async function handleTwilioSession(twilioWs) {
  let isActive = true;
  let streamSid = null;
  let callSid = null;
  const startTime = Date.now();

  const callId = `call_twilio_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const tempDir = path.join(__dirname, "../temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const tempPcmPath = path.join(tempDir, `${callId}.pcm`);
  const recordStream = fs.createWriteStream(tempPcmPath);
  const transcriptLines = [];

  const activeConfig = getConfig();
  const voiceName = VOICE_MAP[activeConfig.activeVoice] || "Puck";
  const finalPrompt = buildRuntimePrompt(activeConfig);

  console.log(`📞 New Twilio voice connection. Voice: ${activeConfig.activeVoice} (${voiceName})`);

  // Start connecting to Gemini asynchronously in the background
  const geminiSessionPromise = openGeminiSession(
    twilioWs,
    voiceName,
    finalPrompt,
    recordStream,
    transcriptLines,
    () => streamSid
  ).then(session => {
    console.log(`✅ Gemini Live session open for Twilio | Call ID: ${callId}`);
    return session;
  }).catch(err => {
    console.error("❌ Gemini session failed for Twilio:", err.message);
    recordStream.close();
    try { fs.unlinkSync(tempPcmPath); } catch {}
    twilioWs.close();
    return null;
  });

  let isFinalized = false;

  twilioWs.on("message", async (rawMsg) => {
    if (!isActive) return;
    try {
      const msg = JSON.parse(rawMsg.toString());
      
      switch (msg.event) {
        case "start":
          streamSid = msg.start.streamSid;
          callSid = msg.start.callSid;
          console.log(`🚀 Twilio Stream started: ${streamSid} | CallSid: ${callSid}`);
          
          // Wait for Gemini session to be ready, then trigger initial greeting
          geminiSessionPromise.then(async (geminiSession) => {
            if (geminiSession) {
              try {
                console.log("👋 Triggering custom warm greeting...");
                await geminiSession.sendText("Good morning sir! May I speak to Britto?");
              } catch (e) {
                console.error("Failed to trigger initial greeting:", e.message);
              }
            }
          });
          break;

        case "media":
          if (msg.media.track === "inbound") {
            const geminiSession = await geminiSessionPromise;
            if (!geminiSession) return;

            const rawMulaw = Buffer.from(msg.media.payload, "base64");
            
            // 1. Convert G.711 u-law (8kHz) -> PCM 16-bit (8kHz)
            const pcm8k = mulawToPcm16(rawMulaw);

            // 2. Upsample PCM 16-bit 8kHz -> PCM 16-bit 16kHz for Gemini
            const pcm16k = upsample8To16(pcm8k);

            // 3. Send to Gemini
            await geminiSession.sendAudio(pcm16k.toString("base64"));

            // 4. Save to recording file (downsample/resample to 16kHz for consistency)
            recordStream.write(pcm16k);
          }
          break;

        case "stop":
          console.log(`🔌 Twilio Stream stopped: ${streamSid}`);
          await finalizeCall();
          const geminiSession = await geminiSessionPromise;
          if (geminiSession) try { await geminiSession.close(); } catch {}
          break;
      }
    } catch (err) {
      console.error("❌ Twilio Message error:", err.message);
    }
  });

  async function finalizeCall() {
    if (isFinalized) return;
    isFinalized = true;
    isActive = false;
    recordStream.end();
    const duration = Math.round((Date.now() - startTime) / 1000);
    await new Promise(r => recordStream.on("finish", r));

    // Retrieve caller phone number from cache if matched
    const callerNumber = twilioCallNumbers.get(callSid) || "Twilio Call";
    twilioCallNumbers.delete(callSid); // clean up

    processPostCallData(callId, callerNumber, tempPcmPath, duration, transcriptLines, activeConfig)
      .catch(err => console.error("❌ Post-call error for Twilio:", err.message));
  }

  twilioWs.on("close", async () => {
    console.log(`🌐 Twilio WS closed | Call ID: ${callId}`);
    await finalizeCall();
    const geminiSession = await geminiSessionPromise;
    if (geminiSession) try { await geminiSession.close(); } catch {}
  });

  twilioWs.on("error", err => {
    console.error("❌ Twilio WS error:", err.message);
    isActive = false;
  });
}

// ═══════════════════════════════════════════════════════════════
// GEMINI LIVE SESSION
// ═══════════════════════════════════════════════════════════════
async function openGeminiSession(twilioWs, voiceName, systemPrompt, recordStream, transcriptLines, getStreamSid) {
  // Inject custom VAD config safely over WS intercept
  const originalSend = ws.prototype.send;
  ws.prototype.send = function (data, options, callback) {
    try {
      const payload = JSON.parse(data);
      if (payload.setup) {
        delete payload.setup.realtimeInputConfig;
        delete payload.setup.contextWindowCompression;

        if (!payload.setup.generationConfig) {
          payload.setup.generationConfig = {};
        }
        payload.setup.generationConfig.temperature = 0.9;
        
        data = JSON.stringify(payload);
        console.log("⚙️ Twilio Stream: Intercepted setup payload.");
      }
    } catch (_) {}
    ws.prototype.send = originalSend;
    return originalSend.call(this, data, options, callback);
  };

  const session = await genai.live.connect({
    model: "gemini-2.5-flash-native-audio-latest",
    config: {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName }
        }
      },
      inputAudioTranscription:  {},
      outputAudioTranscription: {},
      realtimeInputConfig: {
        automaticActivityDetection: {
          disabled: false,
          endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
          startOfSpeechSensitivity: "START_SENSITIVITY_LOW",
        },
        turnCoverage: "TURN_INCLUDES_ALL_INPUT",
      },
      contextWindowCompression: {
        triggerTokens: 25600,
        slidingWindow: { targetTokens: 12800 },
      },
    },
    callbacks: {
      onmessage: (response) => {
        if (!twilioWs || twilioWs.readyState !== 1) return;

        // AI audio response
        if (response.serverContent?.modelTurn?.parts) {
          for (const part of response.serverContent.modelTurn.parts) {
            if (part.inlineData?.mimeType?.startsWith("audio/")) {
              const raw24kPCM = Buffer.from(part.inlineData.data, "base64");
              
              // 1. Resample: 24kHz PCM -> 8kHz PCM
              const pcm8k = downsample24To8(raw24kPCM);

              // 2. Encode: 8kHz PCM -> 8kHz G.711 u-law
              const mulaw8k = pcm16ToMulaw(pcm8k);

              // 3. Send to Twilio WebSocket
              sendJson(twilioWs, {
                event: "media",
                streamSid: getStreamSid(),
                media: {
                  payload: mulaw8k.toString("base64")
                }
              });

              // Save resampled version to recording file
              recordStream.write(resample24To16(raw24kPCM));
            }
          }
        }

        // Transcripts
        if (response.serverContent?.inputTranscription?.text) {
          const text = response.serverContent.inputTranscription.text;
          console.log(`👤 Twilio Caller: "${text}"`);
          transcriptLines.push({ role: "user", text });
        }
        if (response.serverContent?.outputTranscription?.text) {
          const text = response.serverContent.outputTranscription.text;
          console.log(`🤖 Agent to Twilio: "${text}"`);
          transcriptLines.push({ role: "ai", text });
        }

        // Barge-in: caller interrupted AI
        if (response.serverContent?.interrupted) {
          sendJson(twilioWs, {
            event: "clear",
            streamSid: getStreamSid()
          });
        }
      },
      onerror: (err) => {
        console.error("❌ Gemini error in Twilio call:", err.message || err);
      },
      onclose: (e) => {
        console.log(`🔌 Gemini closed for Twilio. Code: ${e?.code}, Reason: ${e?.reason || "none"}`);
      },
    },
  });

  return {
    sendAudio: async (base64Pcm16k) => {
      await session.sendRealtimeInput({
        media: {
          data: base64Pcm16k,
          mimeType: "audio/pcm;rate=16000",
        },
      });
    },
    sendText: async (text) => {
      if (session.conn && session.conn.readyState === 1) {
        session.conn.send(JSON.stringify({
          clientContent: {
            turns: [
              {
                role: "user",
                parts: [{ text: text }]
              }
            ],
            turnComplete: true
          }
        }));
      }
    },
    close: async () => { try { await session.close(); } catch {} },
  };
}

// ═══════════════════════════════════════════════════════════════
// POST CALL DATA HANDLING
// ═══════════════════════════════════════════════════════════════
async function processPostCallData(callId, callerNumber, tempPcmPath, durationSeconds, transcriptLines, activeConfig) {
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
      console.error("❌ Twilio upload error:", uploadErr.message);
    } else {
      const { data } = supabase.storage.from("recordings").getPublicUrl(`${callId}.wav`);
      recordingUrl = data?.publicUrl;
      console.log(`💾 Twilio recording uploaded: ${recordingUrl}`);
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
      console.log(`📊 Twilio Sentiment: ${sentiment}`);
    } catch (err) {
      console.error("❌ Twilio Sentiment error:", err.message);
    }
  }

  // Save to Supabase DB
  if (supabase) {
    const { error } = await supabase.from("calls").insert({
      caller_number: callerNumber,
      agent_name: activeConfig.activeVoice,
      language: "Tanglish",
      duration_seconds: durationSeconds,
      sentiment,
      transcript: fullTranscript,
      recording_url: recordingUrl,
    });
    if (error) console.error("❌ Twilio DB insert error:", error.message);
    else console.log(`✅ Twilio call saved to DB | ID: ${callId}`);
  }
}

module.exports = { handleTwilioSession, twilioCallNumbers };
