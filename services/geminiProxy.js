// ============================================================
// services/geminiProxy.js
//
// THE CORE — bridges Browser WebSocket ↔ Gemini Live API
//
// Browser sends:  { type: "audio", data: "<base64 PCM 16kHz>" }
//                 { type: "stop" }
//
// Server → Gemini:  PCM 16kHz audio (what Gemini wants natively)
//
// Gemini → Server → Browser:  { type: "audio", data: "<base64 PCM 24kHz>" }
//                              { type: "transcript", role, text }
//                              { type: "interrupted" }
//                              { type: "turn_complete" }
//                              { type: "error", message }
//
// No audio conversion needed on the server — browser sends PCM 16kHz
// directly. Browser plays back PCM 24kHz using AudioContext.
// ============================================================

const { GoogleGenAI } = require("@google/genai");

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  apiVersion: "v1alpha",
});

const SYSTEM_PROMPT = `You are Arjun, a friendly Chennai customer support agent on a phone call.

CRITICAL — this is a LIVE VOICE CALL:
- Keep responses SHORT: 1-2 sentences max
- Speak like a real person — use natural fillers: "hm", "seri", "okay da"
- Speak Tanglish: mix Tamil words naturally ("seri", "aama da", "enna problem irukku")
- Sound warm and genuine, NOT robotic
- React to what you hear — acknowledge before answering
- If asked if you are AI: "Illa da, naan Arjun — customer support"
- NEVER say lists, bullet points, or read headers aloud
- Speak the way you'd talk to a friend on the phone`;

// ── Message helpers ───────────────────────────────────────────
function send(ws, obj) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(obj));
  }
}

// ── Main handler ──────────────────────────────────────────────
async function handleBrowserSession(browserWs) {
  let geminiSession = null;
  let isActive = true;

  // ── 1. Open Gemini Live session ───────────────────────────
  try {
    geminiSession = await openGeminiSession(browserWs);
    console.log("✅ Gemini Live session open");
    send(browserWs, { type: "ready" }); // tell browser we're connected
  } catch (err) {
    console.error("❌ Failed to open Gemini Live session:", err.message);
    send(browserWs, { type: "error", message: "Failed to connect to AI. Check API key." });
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
          // Browser sends base64 PCM 16kHz — forward directly to Gemini
          await geminiSession.sendAudio(msg.data);
          break;

        case "stop":
          // User clicked Stop Call
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

  browserWs.on("close", async () => {
    console.log("🌐 Browser disconnected");
    isActive = false;
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
async function openGeminiSession(browserWs) {
  const session = await genai.live.connect({
    model: "gemini-2.5-flash-native-audio-latest",
    config: {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: "Puck" }, // warm expressive voice
        },
      },
      inputAudioTranscription: {},  // get caller speech as text
      outputAudioTranscription: {}, // get AI response as text
      realtimeInputConfig: {
        // Gemini handles VAD and barge-in automatically
      },
    },
    callbacks: {
      onmessage: (response) => {
        if (!browserWs || browserWs.readyState !== 1) return;

        // ── Audio response from Gemini ───────────────────────
        if (response.serverContent?.modelTurn?.parts) {
          for (const part of response.serverContent.modelTurn.parts) {
            if (part.inlineData?.mimeType?.startsWith("audio/")) {
              // Send raw PCM 24kHz to browser — browser will play it
              send(browserWs, {
                type: "audio",
                data: part.inlineData.data,         // base64 PCM 24kHz
                mimeType: part.inlineData.mimeType, // e.g. "audio/pcm;rate=24000"
              });
            }
          }
        }

        // ── Transcriptions ───────────────────────────────────
        if (response.serverContent?.inputTranscription?.text) {
          const text = response.serverContent.inputTranscription.text;
          console.log(`👤 Caller: "${text}"`);
          send(browserWs, { type: "transcript", role: "user", text });
        }
        if (response.serverContent?.outputTranscription?.text) {
          const text = response.serverContent.outputTranscription.text;
          console.log(`🤖 Arjun: "${text}"`);
          send(browserWs, { type: "transcript", role: "ai", text });
        }

        // ── Barge-in ─────────────────────────────────────────
        if (response.serverContent?.interrupted) {
          console.log("✋ Barge-in — AI stopped speaking");
          send(browserWs, { type: "interrupted" });
        }

        // ── Turn complete ────────────────────────────────────
        if (response.serverContent?.turnComplete) {
          console.log("🔄 Turn complete");
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

module.exports = { handleBrowserSession };
