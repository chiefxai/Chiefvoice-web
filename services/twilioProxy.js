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

  let geminiSetupFinished = false;

  const triggerGreetingIfReady = async () => {
    if (geminiSetupFinished && streamSid) {
      const geminiSession = await geminiSessionPromise;
      if (geminiSession) {
        try {
          console.log("👋 Triggering custom warm greeting...");
          await geminiSession.sendText("Good morning sir! May I speak to Britto?");
        } catch (e) {
          console.error("Failed to trigger initial greeting:", e.message);
        }
      }
    }
  };

  let liveInputTokens = 0;
  let liveOutputTokens = 0;
  let totalInboundAudioBytes = 0;
  let totalOutboundAudioBytes = 0;

  // Start connecting to Gemini asynchronously in the background
  const geminiSessionPromise = openGeminiSession(
    twilioWs,
    voiceName,
    finalPrompt,
    recordStream,
    transcriptLines,
    () => streamSid,
    (inTokens, outTokens) => {
      liveInputTokens += inTokens;
      liveOutputTokens += outTokens;
      if (global.broadcastLog) {
        global.broadcastLog(`🪙 Tokens Spent: Input ${liveInputTokens} | Output ${liveOutputTokens}`, { type: "usage", inputTokens: liveInputTokens, outputTokens: liveOutputTokens });
      }
    },
    (outBytes) => {
      totalOutboundAudioBytes += outBytes;
    },
    () => {
      geminiSetupFinished = true;
      triggerGreetingIfReady();
    }
  ).then(session => {
    console.log(`✅ Gemini Live session open for Twilio | Call ID: ${callId}`);
    if (global.broadcastLog) {
      global.broadcastLog(`📞 Voice Session Open | Call ID: ${callId}`, { type: "system", callId });
    }
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
          triggerGreetingIfReady();
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
            totalInboundAudioBytes += pcm16k.length;

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

    if (global.broadcastLog) {
      global.broadcastLog(`🛑 Call completed | Caller: ${callerNumber} | Duration: ${duration}s | Total Tokens: ${liveInputTokens + liveOutputTokens}`, { type: "system", duration, inputTokens: liveInputTokens, outputTokens: liveOutputTokens });
    }

    processPostCallData(callId, callerNumber, tempPcmPath, duration, transcriptLines, activeConfig, liveInputTokens, liveOutputTokens, totalInboundAudioBytes, totalOutboundAudioBytes)
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

// GEMINI LIVE SESSION
// ═══════════════════════════════════════════════════════════════
async function openGeminiSession(twilioWs, voiceName, systemPrompt, recordStream, transcriptLines, getStreamSid, onTokenUsage, onAudioOut, onSetupComplete) {
  const outboundQueue = [];
  let intervalId = null;

  const startPacing = () => {
    if (intervalId) return;
    intervalId = setInterval(() => {
      // 160 bytes of G.711 mu-law represents 20ms of audio at 8kHz
      if (outboundQueue.length >= 160) {
        const chunk = Buffer.from(outboundQueue.splice(0, 160));
        sendJson(twilioWs, {
          event: "media",
          streamSid: getStreamSid(),
          media: {
            payload: chunk.toString("base64")
          }
        });
      }
    }, 20);
  };

  const stopPacing = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    outboundQueue.length = 0;
  };

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
        console.log("📥 Raw Gemini response:", JSON.stringify(response).slice(0, 300));
        
        // Extract token usage metadata from live session
        const usage = response.usageMetadata || response.usage_metadata;
        if (usage && onTokenUsage) {
          const inCount = usage.promptTokenCount || usage.prompt_token_count || 0;
          const outCount = usage.candidatesTokenCount || usage.candidates_token_count || 
                           usage.responseTokenCount || usage.response_token_count || 0;
          if (inCount > 0 || outCount > 0) {
            onTokenUsage(inCount, outCount);
          }
        }

        if (response.setupComplete) {
          console.log("⚙️ Gemini Setup Complete. Ready for greeting.");
          if (onSetupComplete) onSetupComplete();
        }

        if (!twilioWs || twilioWs.readyState !== 1) return;

        // AI audio response
        if (response.serverContent?.modelTurn?.parts) {
          for (const part of response.serverContent.modelTurn.parts) {
            if (part.inlineData?.mimeType?.startsWith("audio/")) {
              const raw24kPCM = Buffer.from(part.inlineData.data, "base64");
              if (onAudioOut) {
                onAudioOut(raw24kPCM.length);
              }
              
              // 1. Resample: 24kHz PCM -> 8kHz PCM
              const pcm8k = downsample24To8(raw24kPCM);

              // 2. Encode: 8kHz PCM -> 8kHz G.711 u-law
              const mulaw8k = pcm16ToMulaw(pcm8k);

              // 3. Queue the bytes for 20ms paced delivery
              for (let i = 0; i < mulaw8k.length; i++) {
                outboundQueue.push(mulaw8k[i]);
              }
              startPacing();

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
          if (global.broadcastLog) {
            global.broadcastLog(`👤 Caller: "${text}"`, { type: "transcript", role: "user", text });
          }
        }
        if (response.serverContent?.outputTranscription?.text) {
          const text = response.serverContent.outputTranscription.text;
          console.log(`🤖 Agent to Twilio: "${text}"`);
          transcriptLines.push({ role: "ai", text });
          if (global.broadcastLog) {
            global.broadcastLog(`🤖 Agent: "${text}"`, { type: "transcript", role: "ai", text });
          }
        }



        // Barge-in: caller interrupted AI
        if (response.serverContent?.interrupted) {
          stopPacing();
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
        stopPacing();
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
      if (session.conn && session.conn.ws && session.conn.ws.readyState === 1) {
        session.conn.ws.send(JSON.stringify({
          client_content: {
            turns: [
              {
                role: "user",
                parts: [{ text: text }]
              }
            ],
            turn_complete: true
          }
        }));
      }
    },
    close: async () => {
      stopPacing();
      try { await session.close(); } catch {}
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// POST CALL DATA HANDLING
// ═══════════════════════════════════════════════════════════════
async function processPostCallData(callId, callerNumber, tempPcmPath, durationSeconds, transcriptLines, activeConfig, liveInputTokens, liveOutputTokens, totalInboundAudioBytes, totalOutboundAudioBytes) {
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

  let sentimentInputTokens = 0;
  let sentimentOutputTokens = 0;

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

      // Capture post-call sentiment API token usage
      if (res.usageMetadata) {
        sentimentInputTokens = res.usageMetadata.promptTokenCount || 0;
        sentimentOutputTokens = res.usageMetadata.candidatesTokenCount || 
                                res.usageMetadata.responseTokenCount || 0;
      }
    } catch (err) {
      console.error("❌ Twilio Sentiment error:", err.message);
    }
  }

  // Combined token calculation for BOTH models
  let totalInputTokens = liveInputTokens + sentimentInputTokens;
  let totalOutputTokens = liveOutputTokens + sentimentOutputTokens;

  // Fallback if websocket usageMetadata wasn't populated (calculate based on duration/audio bytes)
  if (totalInputTokens === 0 && totalInboundAudioBytes > 0) {
    // 16kHz 16-bit PCM has 32,000 bytes per second. Audio input tokens = 32 per second.
    // Plus baseline for systemPrompt + transcript turns history context
    const inputAudioSeconds = totalInboundAudioBytes / 32000;
    const promptBaseline = 1500 + (transcriptLines.length * 150);
    totalInputTokens = Math.round((inputAudioSeconds * 32) + promptBaseline);
  }
  if (totalOutputTokens === 0 && totalOutboundAudioBytes > 0) {
    // 24kHz 16-bit PCM has 48,000 bytes per second. Audio output tokens = 25 per second.
    const outputAudioSeconds = totalOutboundAudioBytes / 48000;
    totalOutputTokens = Math.round(outputAudioSeconds * 25);
  }

  // Pricing: Input: $0.075 / 1M tokens ($0.000000075 / token) | Output: $0.30 / 1M tokens ($0.0000003 / token)
  const costUsd = (totalInputTokens * 0.000000075) + (totalOutputTokens * 0.0000003);

  console.log(`📊 Cost Breakdown: Total Input Tokens=${totalInputTokens}, Total Output Tokens=${totalOutputTokens}, Cost=$${costUsd.toFixed(5)}`);

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
      cost_usd: costUsd,
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens
    });
    if (error) console.error("❌ Twilio DB insert error:", error.message);
    else console.log(`✅ Twilio call saved to DB | ID: ${callId}`);
  }
}

module.exports = { handleTwilioSession, twilioCallNumbers };
