// ============================================================
// server.js
//
// HTTP Server + WebSocket Proxy + REST API for Admin Dashboard
// ============================================================

require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const path = require("path");
const ws = require("ws");
const { WebSocketServer } = ws;
const { createClient } = require("@supabase/supabase-js");
const { handleBrowserSession } = require("./services/geminiProxy");
const { getConfig, updateConfig } = require("./services/config");

const app = express();

// Trust Railway / Render / Heroku reverse proxy (needed for correct req.protocol)
app.set("trust proxy", 1);

// Middlewares
app.use(cors()); // Enable CORS for decoupled dashboard
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/dashboard", express.static(path.join(__dirname, "dashboard")));

// Supabase client initialization
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
    console.log("✅ Supabase client initialized");
  } catch (err) {
    console.error("❌ Failed to initialize Supabase client:", err.message);
  }
} else {
  console.log("⚠️ Supabase credentials missing or invalid — database features disabled");
}

// Track active sessions in real-time
let activeSessionsCount = 0;

// REST API Endpoints
app.get("/health", (_req, res) => res.json({ ok: true }));

// Get active configuration (voice settings and prompt editor)
app.get("/api/config", (req, res) => {
  res.json(getConfig());
});

// Update configuration
app.post("/api/config", (req, res) => {
  console.log("⚙️ Updating config:", req.body);
  const updated = updateConfig(req.body);
  res.json(updated);
});

// Get call logs from Supabase
app.get("/api/calls", async (req, res) => {
  if (!supabase) {
    return res.json({ calls: [], warning: "Supabase not configured" });
  }
  try {
    const { data, error } = await supabase
      .from("calls")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ calls: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get dashboard metrics
app.get("/api/metrics", async (req, res) => {
  let totalCalls = 0;
  let avgDuration = 0;
  let creditsConsumed = 0.00;

  if (supabase) {
    try {
      const { data, error } = await supabase.from("calls").select("duration_seconds");
      if (!error && data) {
        totalCalls = data.length;
        if (totalCalls > 0) {
          const totalDuration = data.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
          avgDuration = Math.round(totalDuration / totalCalls);
          // Credit calculation: $0.06 per minute of audio (dummy estimation for Gemini Live + Transcribe + Storage)
          creditsConsumed = parseFloat(((totalDuration / 60) * 0.06).toFixed(2));
        }
      }
    } catch (err) {
      console.error("Error calculating metrics from Supabase:", err.message);
    }
  }

  res.json({
    totalCalls,
    activeSessions: activeSessionsCount,
    avgDuration,
    creditsConsumed,
  });
});

app.get("/list-models", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    }
    
    let allModels = [];
    let pageToken = "";
    
    do {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ""}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.models) {
        allModels.push(...data.models);
      }
      pageToken = data.nextPageToken || "";
    } while (pageToken);
    
    const liveModels = allModels.filter(m => 
      m.supportedGenerationMethods && m.supportedGenerationMethods.includes("bidiGenerateContent")
    );
    
    res.json({
      totalModelsFound: allModels.length,
      liveModels: liveModels.map(m => ({
        name: m.name,
        displayName: m.displayName,
        supportedGenerationMethods: m.supportedGenerationMethods
      })),
      allModelNames: allModels.map(m => m.name)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const server = http.createServer(app);

// WebSocket setup
const wss = new WebSocketServer({ server, path: "/session" });

wss.on("connection", (ws, req) => {
  activeSessionsCount++;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  console.log(`🌐 Browser connected from ${ip} | Active: ${activeSessionsCount}`);
  
  handleBrowserSession(ws);

  ws.on("close", () => {
    activeSessionsCount = Math.max(0, activeSessionsCount - 1);
    console.log(`🌐 Browser disconnected | Active: ${activeSessionsCount}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
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
