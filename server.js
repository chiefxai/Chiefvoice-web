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
const { handleTwilioSession, twilioCallNumbers } = require("./services/twilioProxy");
const { getConfig, updateConfig } = require("./services/config");
const { readAll, writeAll, append, update } = require("./services/store");

// SSE logs-stream system
let logClients = [];
function broadcastLog(message, details = {}) {
  const logObj = {
    timestamp: new Date().toISOString(),
    message,
    ...details
  };
  const data = `data: ${JSON.stringify(logObj)}\n\n`;
  logClients.forEach((client) => {
    try { client.write(data); } catch (e) {}
  });
}
global.broadcastLog = broadcastLog;

// Seed initial data
function seedData() {
  if (readAll("shops", []).length === 0) {
    writeAll("shops", [{ id: "default", name: "Sri Lakshmi Stores", aiNumber: process.env.TWILIO_PHONE_NUMBER || "+91 73580 21190", locality: "Anna Nagar, Madurai" }]);
  }
  if (readAll("catalog_default", []).length === 0) {
    writeAll("catalog_default", [
      { id: "P001", name: "Ponni Rice", brand: "Aachi", unit: "kg", price: 58, stock: 480 },
      { id: "P002", name: "Sugar", brand: "Local", unit: "kg", price: 44, stock: 12 },
      { id: "P003", name: "Sunflower Oil", brand: "Gold Winner", unit: "litre", price: 152, stock: 60 },
      { id: "P004", name: "Toor Dal", brand: "Tata Sampann", unit: "kg", price: 138, stock: 35 },
      { id: "P005", name: "Idli Rice", brand: "Aachi", unit: "kg", price: 52, stock: 8 },
      { id: "P006", name: "Salt", brand: "Tata", unit: "packet", price: 22, stock: 200 },
      { id: "P007", name: "Maggi Noodles", brand: "Nestle", unit: "box(12)", price: 144, stock: 18 },
      { id: "P008", name: "Red Chilli Powder", brand: "Aachi", unit: "kg", price: 220, stock: 25 },
      { id: "P009", name: "Toilet Soap", brand: "Santoor", unit: "dozen", price: 312, stock: 14 },
      { id: "P010", name: "Tea Powder", brand: "Red Label", unit: "kg", price: 410, stock: 22 }
    ]);
  }
  if (readAll("customers_default", []).length === 0) {
    writeAll("customers_default", [
      { id: "C001", name: "Kavitha Ramesh", phone: "+91 98421 33012", type: "Retail", locality: "K.K. Nagar, Madurai", ltv: 18420, khata: 0 },
      { id: "C002", name: "Selvam Traders", phone: "+91 94432 87711", type: "Wholesale", locality: "Simmakkal, Madurai", ltv: 142300, khata: 8600 },
      { id: "C003", name: "Priya Anand", phone: "+91 90031 22456", type: "Retail", locality: "Anna Nagar, Madurai", ltv: 6210, khata: 450 },
      { id: "C004", name: "Murugan Stores (Sub-dealer)", phone: "+91 96297 70044", type: "Wholesale", locality: "Tallakulam, Madurai", ltv: 261800, khata: 22400 },
      { id: "C005", name: "Lakshmi Narayanan", phone: "+91 89034 51290", type: "Retail", locality: "Goripalayam, Madurai", ltv: 3120, khata: 0 }
    ]);
  }
  if (readAll("orders_default", []).length === 0) {
    writeAll("orders_default", [
      { id: "ORD-10231", customer: "Kavitha Ramesh", phone: "+91 98421 33012", items: [{n:"Ponni Rice",q:"5 kg",p:290},{n:"Sunflower Oil",q:"2 litre",p:304},{n:"Toor Dal",q:"1 kg",p:138}], total: 732, status: "Confirmed", source: "AI Call", time: "10:42 AM", delivery: "Delivery" },
      { id: "ORD-10230", customer: "Selvam Traders", phone: "+91 94432 87711", items: [{n:"Ponni Rice",q:"50 kg",p:2900},{n:"Sugar",q:"20 kg",p:880}], total: 3780, status: "Packing", source: "AI Call", time: "10:15 AM", delivery: "Pickup" },
      { id: "ORD-10229", customer: "Priya Anand", phone: "+91 90031 22456", items: [{n:"Maggi Noodles",q:"1 box",p:144},{n:"Tea Powder",q:"0.5 kg",p:205}], total: 349, status: "Out for Delivery", source: "WhatsApp", time: "9:58 AM", delivery: "Delivery" },
      { id: "ORD-10228", customer: "Lakshmi Narayanan", phone: "+91 89034 51290", items: [{n:"Idli Rice",q:"3 kg",p:156},{n:"Salt",q:"2 packet",p:44}], total: 200, status: "Delivered", source: "AI Call", time: "9:20 AM", delivery: "Delivery" },
      { id: "ORD-10227", customer: "Murugan Stores (Sub-dealer)", phone: "+91 96297 70044", items: [{n:"Red Chilli Powder",q:"10 kg",p:2200},{n:"Toilet Soap",q:"5 dozen",p:1560}], total: 3760, status: "Placed", source: "AI Call", time: "8:55 AM", delivery: "Pickup" }
    ]);
  }
}
seedData();

const app = express();

// Trust Railway / Render / Heroku reverse proxy (needed for correct req.protocol)
app.set("trust proxy", 1);

// Middlewares
app.use(cors()); // Enable CORS for decoupled dashboard
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

// Twilio Webhook Answer Endpoint
app.post("/api/twilio/incoming", (req, res) => {
  const { CallSid, From } = req.body;
  if (CallSid && From) {
    twilioCallNumbers.set(CallSid, From);
    // Remove from cache after 2 minutes
    setTimeout(() => twilioCallNumbers.delete(CallSid), 120000);
  }

  res.set("Content-Type", "text/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${req.headers.host}/twilio/stream" />
  </Connect>
</Response>`);
});

// Initiate Outbound Twilio Call to User's Phone
app.post("/api/twilio/call", async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ error: "Missing phoneNumber in request body" });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !twilioNumber) {
    return res.status(500).json({
      error: "Twilio credentials are not configured on the server. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER."
    });
  }

  try {
    const authString = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const host = req.headers.host;
    const callbackUrl = `${protocol}://${host}/api/twilio/incoming`;

    console.log(`📞 Triggering Twilio outbound call to ${phoneNumber} from ${twilioNumber}...`);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authString}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: twilioNumber,
          Url: callbackUrl
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Twilio API error (Status: ${response.status})`);
    }

    console.log(`✅ Outbound Twilio call initiated. Call SID: ${data.sid}`);
    res.json({ success: true, callSid: data.sid });
  } catch (err) {
    console.error("❌ Failed to initiate Twilio outbound call:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Hang up active Twilio call
app.post("/api/twilio/hangup", async (req, res) => {
  const { callSid } = req.body;
  if (!callSid) {
    return res.status(400).json({ error: "Missing callSid in request body" });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return res.status(500).json({
      error: "Twilio credentials are not configured on the server."
    });
  }

  try {
    const authString = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    console.log(`📞 Hanging up Twilio call ${callSid}...`);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authString}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ Status: "completed" })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Twilio hangup error (Status: ${response.status})`);
    }

    console.log(`✅ Twilio call completed successfully: ${callSid}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to hang up Twilio call:", err.message);
    res.status(500).json({ error: err.message });
  }
});

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

  // Also count from local files if empty
  if (totalCalls === 0) {
    const localCalls = readAll("calls_default", []);
    totalCalls = localCalls.length;
    if (totalCalls > 0) {
      const totalDuration = localCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
      avgDuration = Math.round(totalDuration / totalCalls);
      creditsConsumed = parseFloat(((totalDuration / 60) * 0.06).toFixed(2));
    }
  }

  // Calculate shop-specific metrics for the React frontend
  const ordersList = readAll("orders_default", []);
  const todayRevenue = ordersList.filter(o => o.status === "Delivered" || o.status === "Confirmed").reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = ordersList.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(todayRevenue / totalOrders) : 0;

  res.json({
    totalCalls,
    activeSessions: activeSessionsCount,
    avgDuration,
    creditsConsumed,
    todayRevenue,
    totalOrders,
    avgOrderValue,
    callSuccessRate: 78,
    repeatRate: 54
  });
});

// SSE endpoint for live logs
app.get("/api/logs-stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  
  res.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString(), message: "Live system log stream initialized" })}\n\n`);
  
  logClients.push(res);
  
  req.on("close", () => {
    logClients = logClients.filter((c) => c !== res);
  });
});

// ── Orders API ──
app.get("/api/orders", (req, res) => {
  res.json(readAll("orders_default", []));
});

app.post("/api/orders", (req, res) => {
  const order = append("orders_default", {
    id: `ORD-${Date.now().toString().slice(-5)}`,
    status: "Placed",
    source: "Manual",
    time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    ...req.body,
  });
  broadcastLog(`📦 New manual order placed: ${order.id} (Total: ₹${order.total})`, { type: "order", orderId: order.id });
  res.status(201).json(order);
});

app.patch("/api/orders/:id/status", (req, res) => {
  const { status } = req.body;
  const order = update("orders_default", req.params.id, { status });
  if (!order) return res.sendStatus(404);
  broadcastLog(`🔔 Order ${order.id} status updated to: ${status}`, { type: "order", orderId: order.id, status });
  res.json(order);
});

// ── Catalog API ──
app.get("/api/catalog", (req, res) => {
  res.json(readAll("catalog_default", []));
});

app.post("/api/catalog", (req, res) => {
  const item = append("catalog_default", {
    id: `P-${Date.now().toString().slice(-4)}`,
    ...req.body
  });
  broadcastLog(`🏷️ Added product to catalog: ${item.name} (${item.brand})`, { type: "catalog", itemId: item.id });
  res.status(201).json(item);
});

app.patch("/api/catalog/:id", (req, res) => {
  const arr = readAll("catalog_default", []);
  const idx = arr.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.sendStatus(404);
  arr[idx] = { ...arr[idx], ...req.body };
  writeAll("catalog_default", arr);
  broadcastLog(`🏷️ Updated product: ${arr[idx].name}`, { type: "catalog", itemId: req.params.id });
  res.json(arr[idx]);
});

// ── Customers API ──
app.get("/api/customers", (req, res) => {
  res.json(readAll("customers_default", []));
});

app.post("/api/customers", (req, res) => {
  const newCust = {
    id: `C-${Date.now().toString().slice(-4)}`,
    khata: Number(req.body.khata || 0),
    ltv: Number(req.body.ltv || 0),
    created_at: new Date().toISOString(),
    ...req.body,
  };
  append("customers_default", newCust);
  broadcastLog(`👤 Registered new customer: ${newCust.name} (${newCust.phone})`, { type: "customer", customerId: newCust.id });
  res.status(201).json(newCust);
});

app.get("/api/customers/:id", (req, res) => {
  const c = readAll("customers_default", []).find((x) => x.id === req.params.id);
  return c ? res.json(c) : res.sendStatus(404);
});

// ── Khata / Credit ──
app.post("/api/khata/:customerId/payment", (req, res) => {
  const arr = readAll("customers_default", []);
  const idx = arr.findIndex((c) => c.id === req.params.customerId);
  if (idx === -1) return res.sendStatus(404);
  const oldKhata = arr[idx].khata || 0;
  arr[idx].khata = Math.max(0, oldKhata - Number(req.body.amount || 0));
  writeAll("customers_default", arr);
  broadcastLog(`💳 Payment of ₹${req.body.amount} processed for ${arr[idx].name}. Khata balance: ₹${arr[idx].khata}`, { type: "payment", customerId: req.params.customerId });
  res.json(arr[idx]);
});

app.post("/api/khata/:customerId/reminder", (req, res) => {
  const c = readAll("customers_default", []).find((x) => x.id === req.params.customerId);
  if (!c) return res.sendStatus(404);
  broadcastLog(`💬 WhatsApp Khata reminder sent to ${c.name} (${c.phone}) for ₹${c.khata}`, { type: "notification", customerId: c.id });
  res.json({ sent: true });
});

// ── WhatsApp Broadcasts ──
app.post("/api/broadcast", (req, res) => {
  const { audiencePhones, templateName } = req.body;
  broadcastLog(`📢 Initiating WhatsApp Broadcast (${templateName}) to ${audiencePhones?.length || 0} customers`, { type: "broadcast" });
  res.json({ sent: audiencePhones?.length || 0, failed: 0 });
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

// WebSocket setup using manual upgrade routing to support multiple paths
const wss = new WebSocketServer({ noServer: true });
const wssTwilio = new WebSocketServer({ noServer: true });

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

wssTwilio.on("connection", (ws, req) => {
  activeSessionsCount++;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  console.log(`📞 Twilio call connected from ${ip} | Active: ${activeSessionsCount}`);

  handleTwilioSession(ws);

  ws.on("close", () => {
    activeSessionsCount = Math.max(0, activeSessionsCount - 1);
    console.log(`📞 Twilio call disconnected | Active: ${activeSessionsCount}`);
  });
});

server.on("upgrade", (request, socket, head) => {
  // Parse pathname safely
  let pathname;
  try {
    pathname = new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname;
  } catch (e) {
    pathname = request.url.split("?")[0];
  }

  if (pathname === "/session") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else if (pathname === "/twilio/stream") {
    wssTwilio.handleUpgrade(request, socket, head, (ws) => {
      wssTwilio.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
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
  console.log(`🎙️  Browser WebSocket path: /session`);
  console.log(`📞 Twilio Stream WebSocket path: /twilio/stream\n`);
});
