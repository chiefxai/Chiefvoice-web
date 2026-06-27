// ============================================================
// services/geminiProxy.js
//
// Bridges Browser WebSocket ↔ Gemini Live API + Handles recording,
// dynamic configuration (voice & prompt), and post-call Supabase save.
// ============================================================

const fs = require("fs");
const path = require("path");
const ws = require("ws");
const { GoogleGenAI } = require("@google/genai");
const { createClient } = require("@supabase/supabase-js");
const { getConfig } = require("./config");

// Initialize Gemini Client
const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  apiVersion: "v1alpha",
});

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
let supabase = null;

function isValidHttpUrl(string) {
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;  
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

if (supabaseUrl && supabaseKey && isValidHttpUrl(supabaseUrl)) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      realtime: { transport: ws }
    });
  } catch (err) {
    console.error("❌ Failed to initialize Supabase client in proxy:", err.message);
  }
}

// Map user-friendly voice names to Gemini Live prebuilt voices
const VOICE_MAP = {
  Arjun: "Puck",    // Male warm
  Priya: "Aoede",   // Female friendly/breezy
  Dev: "Fenrir",    // Male calm
  Kavya: "Kore",    // Female formal/firm
};

// ── Audio Helpers ─────────────────────────────────────────────

// Downsamples 24kHz Int16 PCM (Gemini output) to 16kHz Int16 PCM
function resample24To16(buffer24) {
  const samples24 = new Int16Array(
    buffer24.buffer,
    buffer24.byteOffset,
    buffer24.byteLength / 2
  );
  const samples16 = new Int16Array(Math.round(samples24.length * 2 / 3));

  for (let i = 0; i < samples16.length; i++) {
    const srcIndex = i * 1.5;
    const indexFloor = Math.floor(srcIndex);
    const indexCeil = Math.min(samples24.length - 1, indexFloor + 1);
    const weight = srcIndex - indexFloor;
    samples16[i] =
      samples24[indexFloor] * (1 - weight) + samples24[indexCeil] * weight;
  }
  return Buffer.from(samples16.buffer, samples16.byteOffset, samples16.byteLength);
}

// Generates a 44-byte WAV header for raw PCM data
function getWavHeader(dataLength, sampleRate = 16000, numChannels = 1, bitsPerSample = 16) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(dataLength + 36, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // Audio format (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  header.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

// ── Message helper ───────────────────────────────────────────
function send(ws, obj) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(obj));
  }
}

// ── Main handler ──────────────────────────────────────────────
async function handleBrowserSession(browserWs) {
  let geminiSession = null;
  let isActive = true;
  const startTime = Date.now();

  // Call metadata & recording assets
  const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const tempDir = path.join(__dirname, "../temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const tempPcmPath = path.join(tempDir, `${callId}.pcm`);
  const recordStream = fs.createWriteStream(tempPcmPath);
  const transcriptLines = [];

  // ── 1. Open Gemini Live session with dynamic config ─────────
  const activeConfig = getConfig();
  console.log("📞 Incoming call. Active config loaded:", activeConfig);
  const voiceName = VOICE_MAP[activeConfig.activeVoice] || "Puck";

  // Construct dynamic prompt injecting the slider values
  const customizedPrompt = `${activeConfig.systemPrompt}
  
Additional voice delivery instructions:
- Emotion intensity: ${activeConfig.emotion}%
- Speed: ${activeConfig.speed}%
- Friendliness level: ${activeConfig.friendliness}%`;

  try {
    geminiSession = await openGeminiSession(browserWs, voiceName, customizedPrompt, recordStream, transcriptLines);
    console.log(`✅ Gemini Live session open | Call ID: ${callId} | Voice: ${activeConfig.activeVoice} (${voiceName})`);
    send(browserWs, { type: "ready" });
  } catch (err) {
    console.error("❌ Failed to open Gemini Live session:", err.message);
    send(browserWs, { type: "error", message: "Failed to connect to AI. Check API key." });
    recordStream.close();
    try { fs.unlinkSync(tempPcmPath); } catch {}
    browserWs.close();
    return;
  }

  // ── 2. Handle messages from Browser ──────────────────────
  browserWs.on("message", async (rawMsg) => {
    if (!isActive || !geminiSession) return;

    try {
      const msg = JSON.parse(rawMsg.toString());

      switch (msg.type) {
        case "audio":
          // 1. Forward raw PCM 16kHz base64 data to Gemini
          await geminiSession.sendAudio(msg.data);

          // 2. Write to the call recording file
          const audioBuffer = Buffer.from(msg.data, "base64");
          recordStream.write(audioBuffer);
          break;

        case "stop":
          isActive = false;
          await geminiSession.close();
          break;

        default:
          break;
      }
    } catch (err) {
      console.error("❌ Error processing browser message:", err.message);
    }
  });

  // Helper to trigger post-call upload and database saving
  async function finalizeCall() {
    isActive = false;
    recordStream.end();

    const endTime = Date.now();
    const durationSeconds = Math.round((endTime - startTime) / 1000);

    // Wait for the stream write to finish completely
    await new Promise((resolve) => recordStream.on("finish", resolve));

    // Upload & database insertion logic (runs asynchronously)
    processPostCallData(callId, tempPcmPath, durationSeconds, transcriptLines, activeConfig)
      .catch((err) => console.error("❌ Error processing post-call data:", err.message));
  }

  browserWs.on("close", async () => {
    console.log(`🌐 Browser disconnected | Call ID: ${callId}`);
    if (isActive) {
      await finalizeCall();
    }
    if (geminiSession) {
      try { await geminiSession.close(); } catch {}
    }
  });

  browserWs.on("error", (err) => {
    console.error("❌ Browser WS error:", err.message);
    isActive = false;
  });
}

// ── Open Gemini Live session ──────────────────────────────────
async function openGeminiSession(browserWs, voiceName, systemPrompt, recordStream, transcriptLines) {
  const session = await genai.live.connect({
    model: "gemini-2.5-flash-native-audio-latest",
    config: {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voiceName,
          },
        },
      },
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName,
            },
          },
        },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      realtimeInputConfig: {},
    },
    callbacks: {
      onmessage: (response) => {
        if (!browserWs || browserWs.readyState !== 1) return;

        // ── Audio response from Gemini ───────────────────────
        if (response.serverContent?.modelTurn?.parts) {
          for (const part of response.serverContent.modelTurn.parts) {
            if (part.inlineData?.mimeType?.startsWith("audio/")) {
              const audioBase64 = part.inlineData.data;

              // Send raw PCM 24kHz to browser
              send(browserWs, {
                type: "audio",
                data: audioBase64,
                mimeType: part.inlineData.mimeType,
              });

              // Resample 24kHz to 16kHz and save to recording file
              const rawBuffer = Buffer.from(audioBase64, "base64");
              const resampledBuffer = resample24To16(rawBuffer);
              recordStream.write(resampledBuffer);
            }
          }
        }

        // ── Transcriptions ───────────────────────────────────
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

        // ── Barge-in ─────────────────────────────────────────
        if (response.serverContent?.interrupted) {
          console.log("✋ Barge-in — AI stopped speaking");
          send(browserWs, { type: "interrupted" });
        }

        // ── Turn complete ────────────────────────────────────
        if (response.serverContent?.turnComplete) {
          send(browserWs, { type: "turn_complete" });
        }
      },

      onerror: (err) => {
        const msg = err.message || String(err);
        console.error("❌ Gemini Live error:", msg);
        send(browserWs, { type: "error", message: msg });
      },

      onclose: (e) => {
        console.log(`🔌 Gemini Live session closed. Code: ${e?.code || 'N/A'}, Reason: ${e?.reason || 'No reason provided'}`);
        send(browserWs, { type: "ended" });
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
    close: async () => {
      try { await session.close(); } catch {}
    },
  };
}

// ── Process Post Call Data: Upload & Sentiment ─────────────────
async function processPostCallData(callId, tempPcmPath, durationSeconds, transcriptLines, activeConfig) {
  if (!fs.existsSync(tempPcmPath)) return;

  const rawPcm = fs.readFileSync(tempPcmPath);
  const wavHeader = getWavHeader(rawPcm.length);
  const wavBuffer = Buffer.concat([wavHeader, rawPcm]);

  // Delete local temp PCM file
  try { fs.unlinkSync(tempPcmPath); } catch {}

  let recordingUrl = null;
  let sentiment = "Neutral";
  const fullTranscript = transcriptLines
    .map((line) => `${line.role === "user" ? "Caller" : "Agent"}: ${line.text}`)
    .join("\n");

  // 1. Upload to Supabase Storage
  if (supabase && wavBuffer.length > 0) {
    const filename = `${callId}.wav`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("recordings")
      .upload(filename, wavBuffer, {
        contentType: "audio/wav",
        upsert: true,
      });

    if (uploadError) {
      console.error("❌ Supabase upload error:", uploadError.message);
    } else {
      const { data: publicUrlData } = supabase.storage
        .from("recordings")
        .getPublicUrl(filename);
      recordingUrl = publicUrlData?.publicUrl;
      console.log(`💾 Call recording uploaded to: ${recordingUrl}`);
    }
  }

  // 2. Perform Sentiment Analysis using Gemini 2.5 Flash
  if (transcriptLines.length > 0) {
    try {
      const analysisPrompt = `Analyze the sentiment of the following call transcript. Respond with ONLY one of these three words: Positive, Neutral, or Negative. Do not include any other text, explanation, or punctuation.
      
Transcript:
${fullTranscript}`;

      const aiResponse = await genai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: analysisPrompt,
      });

      const responseText = aiResponse.text?.trim() || "";
      if (["Positive", "Neutral", "Negative"].includes(responseText)) {
        sentiment = responseText;
      }
      console.log(`📊 Analyzed Sentiment: ${sentiment}`);
    } catch (err) {
      console.error("❌ Failed to analyze sentiment:", err.message);
    }
  }

  // 3. Save Call Metadata to Supabase DB
  if (supabase) {
    const { error: dbError } = await supabase.from("calls").insert({
      caller_number: `+1 (555) 019-${Math.floor(1000 + Math.random() * 9000)}`, // Random placeholder number
      agent_name: activeConfig.activeVoice,
      language: "Tanglish",
      duration_seconds: durationSeconds,
      sentiment,
      transcript: fullTranscript,
      recording_url: recordingUrl,
    });

    if (dbError) {
      console.error("❌ Failed to insert call log into Supabase:", dbError.message);
    } else {
      console.log(`✅ Call log saved to Supabase database | Call ID: ${callId}`);
    }
  } else {
    console.log("⚠️ Supabase not configured. Call logs not saved.");
  }
}

module.exports = { handleBrowserSession };
