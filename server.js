// ============================================================
// server.js
//
// Two things on one port:
//   HTTP  → serves public/index.html (the browser UI)
//   WS    → /session   (browser connects here; we proxy to Gemini Live)
//
// Flow:
//   1. User opens browser → clicks "Start Call"
//   2. Browser captures mic audio via getUserMedia (PCM 16kHz)
//   3. Browser opens WebSocket to /session
//   4. Server opens Gemini Live session for that browser connection
//   5. Audio flows:  Browser → WS → Server → Gemini Live
//                    Gemini Live → Server → WS → Browser (audio plays)
//
// Why a server at all?
//   Gemini Live API key must stay server-side (never exposed to browser).
//   The server is a thin authenticated proxy — no audio processing needed
//   because the browser sends PCM 16kHz directly, which is what Gemini wants.
// ============================================================

require("dotenv").config();
const http = require("http");
const express = require("express");
const path = require("path");
const { WebSocketServer } = require("ws");
const { handleBrowserSession } = require("./services/geminiProxy");

const app = express();

// Trust Railway / Render / Heroku reverse proxy (needed for correct req.protocol)
app.set("trust proxy", 1);

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);

// WebSocket — Railway proxies wss:// → ws:// to our process
// So we just listen for plain WS connections; TLS is terminated at the edge.
const wss = new WebSocketServer({ server, path: "/session" });

wss.on("connection", (ws, req) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  console.log(`🌐 Browser connected from ${ip}`);
  handleBrowserSession(ws);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  // Railway injects RAILWAY_PUBLIC_DOMAIN; Render injects RENDER_EXTERNAL_URL
  const publicUrl =
    process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : process.env.RENDER_EXTERNAL_URL
      ? process.env.RENDER_EXTERNAL_URL
      : `http://localhost:${PORT}`;

  console.log(`\n✅ ChiefVoice web server running on port ${PORT}`);
  console.log(`📱 Open on mobile: ${publicUrl}`);
  console.log(`🎙️  WebSocket path: /session\n`);
});
