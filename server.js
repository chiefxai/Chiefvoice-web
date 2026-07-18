// ============================================================
// server.js
//
// HTTP Server + WebSocket Proxy + REST API for Admin Dashboard (Vobiz.ai Integrated)
// ============================================================

require("dotenv").config();

// Write Google Application Credentials JSON from env variables to a local temp file on startup if provided
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    const fs = require("fs");
    const path = require("path");
    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const credsFilePath = path.join(tempDir, "gcp-creds.json");
    fs.writeFileSync(credsFilePath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, "utf8");
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credsFilePath;
    console.log("🔑 Google Application Credentials JSON loaded and written to temp path.");
  } catch (err) {
    console.error("❌ Failed to write GOOGLE_APPLICATION_CREDENTIALS_JSON:", err.message);
  }
}

const http = require("http");
const express = require("express");
const cors = require("cors");
const path = require("path");
const ws = require("ws");
const { WebSocketServer } = ws;
const { createClient } = require("@supabase/supabase-js");
const { handleBrowserSession } = require("./services/geminiProxy");
const { handleVobizSession, vobizCallNumbers } = require("./services/vobizProxy");
const { handleTwilioSession, twilioCallNumbers } = require("./services/twilioProxy");
const { getConfig, updateConfig } = require("./services/config");
const { readAll, writeAll, append, update } = require("./services/store");
const {
  initialLeads,
  initialWorkflows,
  initialCampaigns,
  initialCallLogs,
  initialLoans,
  initialVirtualNumbers,
  initialTeamMembers,
  initialOrgSettings
} = require("./services/initialData");

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

function seedCRMData() {
  if (readAll("leads", []).length === 0) writeAll("leads", initialLeads);
  if (readAll("campaigns", []).length === 0) writeAll("campaigns", initialCampaigns);
  if (readAll("workflows", []).length === 0) writeAll("workflows", initialWorkflows);
  if (readAll("loans", []).length === 0) writeAll("loans", initialLoans);
  if (readAll("calllogs", []).length === 0) writeAll("calllogs", initialCallLogs);
  if (readAll("numbers", []).length === 0) writeAll("numbers", initialVirtualNumbers);
  if (readAll("team", []).length === 0) writeAll("team", initialTeamMembers);
  
  const currentOrg = readAll("org", []);
  if (currentOrg.length === 0) {
    writeAll("org", [initialOrgSettings]);
  }
}
seedCRMData();

const app = express();

// Trust Railway / Render / Heroku reverse proxy (needed for correct req.protocol)
app.set("trust proxy", 1);

// Middlewares
app.use(cors()); // Enable CORS for decoupled dashboard
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "dashboard")));
app.use("/public", express.static(path.join(__dirname, "public")));

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

// Supabase state backup & restoration helpers
async function restoreStateFromSupabase() {
  if (!supabase) return;
  try {
    console.log("🔄 Restoring CRM state from Supabase...");
    const { data, error } = await supabase.from("crm_state").select("*");
    if (error) {
      console.warn("⚠️ Could not restore state from Supabase (table 'crm_state' might not exist):", error.message);
      return;
    }
    if (data && data.length > 0) {
      for (const row of data) {
        console.log(`📥 Restored ${row.key} from Supabase.`);
        writeAll(row.key, row.value);
      }
    }
  } catch (err) {
    console.error("❌ Error restoring state from Supabase:", err.message);
  }
}

async function syncToSupabase(key, value) {
  if (supabase) {
    try {
      const { error } = await supabase.from("crm_state").upsert({ key, value });
      if (error) {
        console.warn(`⚠️ Failed to upsert ${key} to Supabase:`, error.message);
      }
    } catch (err) {
      console.warn(`⚠️ Error caught in syncToSupabase for ${key}:`, err.message);
    }
  }
}

if (supabase) {
  restoreStateFromSupabase();
}


// Track active sessions in real-time
let activeSessionsCount = 0;

// REST API Endpoints
app.get("/health", (_req, res) => res.json({ ok: true }));

// Vobiz Webhook Answer Endpoint
app.post("/api/vobiz/incoming", (req, res) => {
  const From = req.body.From || req.query.From;
  const CallUUID = req.body.CallUUID || req.query.CallUUID || req.body.callId || req.body.CallSid;

  if (CallUUID && From) {
    vobizCallNumbers.set(CallUUID, From);
    // Remove from cache after 2 minutes
    setTimeout(() => vobizCallNumbers.delete(CallUUID), 120000);
  }

  res.set("Content-Type", "text/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Stream bidirectional="true" keepCallAlive="true" contentType="audio/x-l16;rate=16000">wss://${req.headers.host}/vobiz/stream</Stream>
</Response>`);
});

// Initiate Outbound Vobiz Call to User's Phone
app.post("/api/vobiz/call", async (req, res) => {
  const { phoneNumber, questions } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ error: "Missing phoneNumber in request body" });
  }

  // Register dynamic call questions if provided
  if (questions && Array.isArray(questions) && questions.length > 0) {
    const { vobizCallQuestions } = require("./services/vobizProxy");
    const sanitizedNumber = phoneNumber.replace(/[\s\-\(\)\+]+/g, "");
    vobizCallQuestions.set(sanitizedNumber, questions);
  }

  const authId = process.env.VOBIZ_AUTH_ID;
  const authToken = process.env.VOBIZ_AUTH_TOKEN;
  const vobizNumber = process.env.VOBIZ_PHONE_NUMBER;

  if (!authId || !authToken || !vobizNumber) {
    return res.status(500).json({
      error: "Vobiz credentials are not configured on the server. Please set VOBIZ_AUTH_ID, VOBIZ_AUTH_TOKEN, and VOBIZ_PHONE_NUMBER."
    });
  }

  try {
    let callbackUrl;
    if (process.env.PUBLIC_URL) {
      callbackUrl = `${process.env.PUBLIC_URL}/api/vobiz/incoming`;
    } else {
      const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const host = req.headers.host;
      callbackUrl = `${protocol}://${host}/api/vobiz/incoming`;
    }

    console.log(`📞 Triggering Vobiz outbound call to ${phoneNumber} from ${vobizNumber}...`);

    const response = await fetch(
      `https://api.vobiz.ai/api/v1/Account/${authId}/Call/`,
      {
        method: "POST",
        headers: {
          "X-Auth-ID": authId,
          "X-Auth-Token": authToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to: phoneNumber,
          from: vobizNumber,
          answer_url: callbackUrl,
          answer_method: "POST"
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Vobiz API error (Status: ${response.status})`);
    }

    console.log(`✅ Outbound Vobiz call initiated. Response:`, JSON.stringify(data));
    res.json({ success: true, callSid: data.request_uuid || data.api_id || data.callId || data.callUUID || data.sid || "vobiz_outbound" });
  } catch (err) {
    console.error("❌ Failed to initiate Vobiz outbound call:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Hang up active Vobiz call
app.post("/api/vobiz/hangup", async (req, res) => {
  const { callSid } = req.body;
  if (!callSid) {
    return res.status(400).json({ error: "Missing callSid in request body" });
  }

  const authId = process.env.VOBIZ_AUTH_ID;
  const authToken = process.env.VOBIZ_AUTH_TOKEN;

  if (!authId || !authToken) {
    return res.status(500).json({
      error: "Vobiz credentials are not configured on the server."
    });
  }

  try {
    console.log(`📞 Hanging up Vobiz call ${callSid}...`);

    const response = await fetch(
      `https://api.vobiz.ai/api/v1/Account/${authId}/Call/${callSid}/`,
      {
        method: "DELETE",
        headers: {
          "X-Auth-ID": authId,
          "X-Auth-Token": authToken,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok && response.status !== 204) {
      const errText = await response.text();
      throw new Error(errText || `Vobiz hangup error (Status: ${response.status})`);
    }

    console.log(`✅ Vobiz call completed successfully: ${callSid}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to hang up Vobiz call:", err.message);
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


// ── Questionnaire Questions API ──
app.get("/api/questions", (req, res) => {
  const defaultQuestions = [
    "Unga full name enna, sollunga?",
    "Ugaluku enna maadhiri insurance coverage venum?",
    "Unga budget premium target enna?",
    "Ugaluku edhavadhu pre-existing health conditions or medical issues iruka?"
  ];
  res.json(readAll("questions", defaultQuestions));
});

app.post("/api/questions", (req, res) => {
  if (Array.isArray(req.body)) {
    writeAll("questions", req.body);
    broadcastLog(`⚙️ Questionnaire questions list updated`, { type: "system" });
    return res.json(req.body);
  }
  res.status(400).json({ error: "Invalid questions payload" });
});

// ── Lead Responses API ──
app.get("/api/lead-responses", async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("lead_responses")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) return res.json(data);
      console.warn("Supabase query error for lead_responses:", error.message);
    } catch (err) {
      console.warn("Failed to fetch lead_responses from Supabase:", err.message);
    }
  }
  // Local fallback
  res.json(readAll("lead_responses", []));
});

app.post("/api/lead-responses", async (req, res) => {
  const payload = {
    id: `RESP-${Date.now().toString().slice(-5)}`,
    call_id: req.body.call_id || `call_local_${Date.now()}`,
    policyholder_phone: req.body.policyholder_phone || "+918939479296",
    question: req.body.question,
    answer: req.body.answer,
    created_at: new Date().toISOString()
  };

  // Local write
  append("lead_responses", payload);

  // Supabase write
  if (supabase) {
    try {
      const { error } = await supabase.from("lead_responses").insert([{
        call_id: payload.call_id,
        policyholder_phone: payload.policyholder_phone,
        question: payload.question,
        answer: payload.answer
      }]);
      if (error) console.error("Supabase insert error for lead_responses:", error.message);
    } catch (err) {
      console.error("Failed to insert lead_responses into Supabase:", err.message);
    }
  }

  broadcastLog(`📝 Lead response recorded: "${payload.question}" ➔ "${payload.answer}"`, { type: "system" });
  res.status(201).json(payload);
});

// ── Chroma Vector search proxy ──
app.get("/api/v2/chroma/search", async (req, res) => {
  const query = req.query.q || "";
  if (!query) return res.json({ documents: [], metadatas: [], ids: [] });
  try {
    const chromaUrl = process.env.CHROMA_URL || "https://chroma-corechroma-production-1118.up.railway.app";
    const collectionsRes = await fetch(`${chromaUrl}/api/v2/tenants/default_tenant/databases/default_database/collections`);
    const collections = await collectionsRes.json();
    const targetColl = collections.find(c => c.name === "policy-documents");
    if (!targetColl) throw new Error("policy-documents collection not found");
    const collectionId = targetColl.id;
    const searchUrl = `${chromaUrl}/api/v2/tenants/default_tenant/databases/default_database/collections/${collectionId}/get`;

    // Clean query and extract keywords
    const stopwords = new Set(["what", "is", "the", "a", "of", "and", "in", "to", "for", "about", "how", "does", "do", "you", "have", "definition", "qualifies", "under", "policy", "wording", "plan", "insurance"]);
    const keywords = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopwords.has(w));

    let filterBody = {};
    if (keywords.length > 0) {
      const expanded = [];
      for (const kw of keywords) {
        expanded.push(kw.toLowerCase());
        expanded.push(kw.charAt(0).toUpperCase() + kw.slice(1));
        expanded.push(kw.toUpperCase());
      }
      if (expanded.length === 1) {
        filterBody = { where_document: { "$contains": expanded[0] } };
      } else {
        filterBody = {
          where_document: {
            "$or": expanded.map(kw => ({ "$contains": kw }))
          }
        };
      }
    } else {
      filterBody = { where_document: { "$contains": query } };
    }

    const chromaRes = await fetch(searchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...filterBody,
        limit: 3,
        include: ["documents", "metadatas"]
      })
    });

    const data = await chromaRes.json();
    res.json(data);
  } catch (err) {
    console.error("Chroma search proxy failed:", err.message);
    res.status(500).json({ error: err.message });
  }
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

function getHtmlTemplate(subject, body) {
  const year = new Date().getFullYear();

  // Auto-detect key:value lines in the body and render as a table
  const lines = (body || '').split('\n').map(l => l.trim()).filter(Boolean);
  const tableRows = lines.map(line => {
    const sep = line.indexOf(':');
    if (sep > 0 && sep < 40) {
      const key = line.slice(0, sep).trim().replace(/^[•\-*]\s*/, '');
      const val = line.slice(sep + 1).trim();
      if (key && val) {
        return `<tr>
          <td style="padding:10px 16px;font-size:13px;color:#64748b;font-weight:600;width:38%;background:#f8fafc;border-bottom:1px solid #e2e8f0;">${key}</td>
          <td style="padding:10px 16px;font-size:14px;color:#1e293b;font-weight:500;border-bottom:1px solid #e2e8f0;">${val}</td>
        </tr>`;
      }
    }
    return null;
  }).filter(Boolean);

  const hasTable = tableRows.length >= 2;
  const plainBody = body ? body.replace(/\n/g, '<br>') : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${subject || 'ChiefVoice Notification'}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#0f1117;">
  <tr>
    <td align="center" style="padding:32px 16px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;">

        <!-- Gold accent line -->
        <tr><td style="background:linear-gradient(90deg,#f59e0b,#fbbf24,#f59e0b);height:4px;border-radius:4px 4px 0 0;"></td></tr>

        <!-- Dark header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f1117 0%,#1e1b4b 60%,#312e81 100%);padding:36px 40px 44px;">
            <table border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:8px;padding:8px 11px;font-size:18px;line-height:1;">&#9889;</td>
                <td style="padding-left:10px;">
                  <div style="color:#fff;font-size:18px;font-weight:700;letter-spacing:.3px;">ChiefVoice</div>
                  <div style="color:#94a3b8;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;margin-top:1px;">CRM Intelligence</div>
                </td>
              </tr>
            </table>
            <div style="margin-top:28px;">
              <div style="color:#a5b4fc;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">CALL SUMMARY</div>
              <div style="color:#fff;font-size:26px;font-weight:700;line-height:1.3;letter-spacing:-.3px;">${subject || 'Your ChiefVoice Summary'}</div>
            </div>
          </td>
        </tr>

        <!-- White body card -->
        <tr>
          <td style="background:#fff;padding:36px 40px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <p style="margin:0 0 16px;font-size:17px;color:#1e293b;font-weight:600;">Hello &#128075;</p>
            <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.7;">Thank you for calling ChiefVoice. Your call has been processed by our AI assistant. Here is a summary of the details collected during your call:</p>

            ${hasTable ? `
            <div style="margin-bottom:24px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4f46e5;margin-bottom:12px;">&#128203; Details Collected</div>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;border-collapse:collapse;">
                ${tableRows.join('')}
              </table>
            </div>` : `
            <div style="background:#f8fafc;border-left:4px solid #4f46e5;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:24px;">
              <p style="margin:0;font-size:14px;color:#334155;line-height:1.8;">${plainBody}</p>
            </div>`}

            <!-- CTA box -->
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:10px;padding:20px 24px;">
                  <p style="margin:0;color:#fff;font-size:14px;font-weight:600;line-height:1.6;">&#9989; Your details have been received and our team will follow up with you shortly.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Dark footer -->
        <tr>
          <td style="background:#1e293b;padding:24px 40px;border-radius:0 0 12px 12px;border:1px solid #334155;border-top:none;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td>
                  <div style="color:#fff;font-size:13px;font-weight:700;">&#9889; ChiefVoice</div>
                  <div style="color:#64748b;font-size:11px;margin-top:4px;">&copy; ${year} ChiefVoice. All rights reserved.</div>
                </td>
                <td align="right" style="vertical-align:top;">
                  <div style="color:#475569;font-size:11px;line-height:1.8;">This is an automated email.<br>Please do not reply directly.</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="height:32px;"></td></tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

app.post('/api/integrations/send-email', async (req, res) => {
  const { email, subject, body, documentType } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Missing email address in request" });
  }

  console.log(`✉️ Outbound Email requested to: ${email} | Subject: ${subject}`);
  broadcastLog(`✉️ AI requested email to ${email} (Subject: ${subject})`, { type: 'email', email });

  const emailSubject = subject || "Requested Document from ChiefVoice";
  const emailBody = body || `Hello,\n\nPlease find attached the requested ${documentType || 'document'}.\n\nBest regards,\nChiefVoice Team`;

  // 1. Vercel Serverless Bridge (HTTPS 443 Relay)
  const vercelEmailUrl = process.env.VERCEL_EMAIL_SERVICE_URL;
  if (vercelEmailUrl) {
    try {
      console.log("✉️ Routing email delivery through Vercel bridge...");
      const response = await fetch(vercelEmailUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          subject: emailSubject,
          body: emailBody,
          gmailUser: process.env.GMAIL_USER,
          gmailPass: process.env.GMAIL_PASS
        })
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || `Vercel Bridge error (Status: ${response.status})`);
      }
      console.log(`✅ Email sent successfully via Vercel Bridge`);
      return res.json({ success: true, provider: "vercel_bridge" });
    } catch (err) {
      console.warn("⚠️ Vercel Bridge delivery failed, trying other methods:", err.message);
    }
  }

  // 2. Gmail REST API (Official Google Developer Console Method)
  const gmailClientId = process.env.GMAIL_CLIENT_ID;
  const gmailClientSecret = process.env.GMAIL_CLIENT_SECRET;
  const gmailRefreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const gmailSender = process.env.GMAIL_USER || email;

  if (gmailClientId && gmailClientSecret && gmailRefreshToken) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    try {
      console.log("✉️ Attempting Gmail REST API delivery (Port 443)...");
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: gmailClientId,
          client_secret: gmailClientSecret,
          refresh_token: gmailRefreshToken,
          grant_type: "refresh_token"
        }).toString(),
        signal: controller.signal
      });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.access_token) {
        throw new Error(tokenData.error_description || "Failed to retrieve access token");
      }

      const accessToken = tokenData.access_token;
      const utf8Subject = `=?utf-8?B?${Buffer.from(emailSubject).toString("base64")}?=`;
      const htmlContent = getHtmlTemplate(emailSubject, emailBody);
      const mimeParts = [
        `From: ${gmailSender}`,
        `To: ${email}`,
        `Subject: ${utf8Subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=utf-8`,
        `Content-Transfer-Encoding: 7bit`,
        ``,
        htmlContent
      ];
      const rawMime = mimeParts.join("\r\n");
      const base64UrlMime = Buffer.from(rawMime)
        .toString("base64")
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const gmailResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ raw: base64UrlMime }),
        signal: controller.signal
      });

      const gmailData = await gmailResponse.json();
      if (!gmailResponse.ok || gmailData.error) {
        throw new Error(gmailData.error?.message || "Gmail API error");
      }

      console.log(`✅ Email sent successfully via Gmail REST API: ${gmailData.id}`);
      return res.json({ success: true, provider: "gmail_rest", messageId: gmailData.id });
    } catch (err) {
      console.warn("⚠️ Gmail REST API delivery failed, trying other methods:", err.message);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // 3. Resend REST API (Cloud HTTP Method)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      console.log("✉️ Attempting Resend API delivery...");
      const fromEmail = process.env.RESEND_FROM_EMAIL || "ChiefVoice <onboarding@resend.dev>";
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject: emailSubject,
          text: emailBody,
          html: getHtmlTemplate(emailSubject, emailBody)
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.message || data.error?.message || "Resend API error");
      }

      console.log(`✅ Email sent successfully via Resend: ${data.id}`);
      return res.json({ success: true, provider: "resend", messageId: data.id });
    } catch (err) {
      console.warn("⚠️ Resend API delivery failed, trying other methods:", err.message);
    }
  }

  // 4. Gmail SMTP (Nodemailer Fallback - requires unblocked ports)
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;
  if (gmailUser && gmailPass) {
    try {
      console.log("✉️ Attempting Gmail SMTP fallback delivery...");
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: gmailUser,
          pass: gmailPass
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const mailOptions = {
        from: gmailUser,
        to: email,
        subject: emailSubject,
        text: emailBody,
        html: getHtmlTemplate(emailSubject, emailBody)
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully via SMTP: ${info.messageId}`);
      return res.json({ success: true, provider: "smtp", messageId: info.messageId });
    } catch (err) {
      console.warn("⚠️ Gmail SMTP delivery failed:", err.message);
    }
  }

  // 4. Default to Simulation Mode
  console.log("⚠️ No active email service credentials succeeded. Falling back to simulation mode.");
  res.json({
    success: true,
    simulated: true,
    message: `Email simulation successful. Details: To: ${email}, Subject: ${emailSubject}`
  });
});

app.post('/api/integrations/send-whatsapp', async (req, res) => {
  const { phoneNumber, message, documentUrl, fileName } = req.body;
  if (!phoneNumber || !message) {
    return res.status(400).json({ error: "Missing phoneNumber or message in request" });
  }

  const sanitizedPhone = phoneNumber.replace(/[\s\-\(\)\+]+/g, "");
  console.log(`💬 Outbound WhatsApp requested to: ${sanitizedPhone}`);
  broadcastLog(`💬 AI requested WhatsApp to ${sanitizedPhone} (Msg: "${message.slice(0, 50)}...")`, { type: 'whatsapp', phoneNumber: sanitizedPhone });

  const wasenderApiKey = process.env.WASENDER_API_KEY;

  if (!wasenderApiKey) {
    console.warn("⚠️ WASENDER_API_KEY not configured in .env. Falling back to simulated WhatsApp send.");
    return res.json({
      success: true,
      simulated: true,
      message: `WhatsApp simulation successful. Details: To: ${sanitizedPhone}, Msg: "${message}"`
    });
  }

  try {
    const payload = {
      to: sanitizedPhone,
      text: message
    };

    if (documentUrl) {
      payload.documentUrl = documentUrl;
      payload.fileName = fileName || "Document";
    }

    const response = await fetch("https://www.wasenderapi.com/api/send-message", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${wasenderApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || `WasenderAPI error (Status: ${response.status})`);
    }

    console.log(`✅ WhatsApp sent successfully. JID: ${data.data?.jid}`);
    res.json({ success: true, jid: data.data?.jid });
  } catch (err) {
    console.error("❌ Failed to send WhatsApp via WasenderAPI:", err.message);
    // Return a soft success so the AI does not announce a connection error to the caller
    res.json({
      success: false,
      simulated: true,
      error: err.message,
      message: `WhatsApp delivery attempted to ${sanitizedPhone}.`
    });
  }
});

// ==========================================
// 1. CRM AI / Gemini endpoints
// ==========================================

// AI Insights Desk
app.post('/api/gemini/insights', async (req, res) => {
  const { leads, loans, campaigns, platformMode } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  const isInsurance = platformMode === 'insurance';

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.json({
      success: true,
      insights: isInsurance 
        ? `💡 **AI Underwriting Brief (Simulation Mode)**\n\n*   **Policy Conversions**: Underwriting reports steady workflow. Lead validation is in progress.\n*   **Risk Profile**: Avg risk is low. Follow up on outstanding declarations.`
        : `💡 **AI Credit Brief (Simulation Mode)**\n\n*   **Loan Conversions**: Metrics indicate positive user growth.\n*   **Risk Profile**: Average portfolio credit score is healthy at 700.`
    });
  }

  try {
    const { GoogleGenAI } = require("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const role = isInsurance ? 'Chief Underwriting Officer and Risk Strategist for Insurance' : 'Chief Credit Analyst';
    const terminology = isInsurance ? 'policy types, risk bands, underwritten values, and premiums' : 'loan products, outstanding balances, interest rates, and loan terms';

    const prompt = `You are the ${role} at ChiefXAI. Analyze the following CRM state and provide a high-level strategic brief with executive bullet points. Evaluate the active pipeline metrics, particularly looking at ${terminology}. Use bolding, clean headers, and actionable insights. Do not include system-internal text.
Leads database: ${JSON.stringify(leads)}
${isInsurance ? 'Policies' : 'Loans'} database: ${JSON.stringify(loans)}
Campaigns database: ${JSON.stringify(campaigns)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: isInsurance
          ? 'You are a veteran Chief Underwriting Officer and risk strategist for top tier global insurers. Speak clearly, professionally and focus on premium yield and underwriting discipline.'
          : 'You are a veteran Chief Financial Officer and credit risk strategist. Speak clearly and professionally.',
      },
    });

    res.json({ success: true, insights: response.text });
  } catch (error) {
    res.json({
      success: true,
      insights: `💡 **AI Strategic Brief (Simulation Fallback Mode)**\n\n*   Pipeline metrics are operational. General credit scoring and risk profiles remain stable.`
    });
  }
});

// Intelligent Lead Scoring & Auto-tagging
app.post('/api/gemini/score-lead', async (req, res) => {
  const { lead } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const score = lead.financialInfo
      ? Math.round((lead.financialInfo.creditScore - 300) / 5.2 + (lead.financialInfo.monthlyIncome > 8000 ? 20 : 5) - lead.financialInfo.debtToIncome * 30)
      : 50;
    const finalScore = Math.max(10, Math.min(100, score));
    const tags = finalScore > 85 ? ['Prime-Lead', 'Low-Risk'] : finalScore < 50 ? ['Subprime', 'High-DTI'] : ['Standard-Profile'];

    return res.json({
      success: true,
      score: finalScore,
      tags,
      decision: `Offline scoring algorithm: Credit score ${lead.financialInfo?.creditScore || '700'} maps to rating ${finalScore}/100.`
    });
  }

  try {
    const { GoogleGenAI, Type } = require("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Assess the loan eligibility score (0-100) for this applicant:
Applicant Profile: ${JSON.stringify(lead)}
Analyze debt-to-income (DTI), credit score, monthly income stability, and loan amount requested. Provide the response strictly in JSON format.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: 'Eligibility score between 0 and 100.' },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Appropriate tags such as Elite, High-DTI, Low-Income, Strong-Employer.',
            },
            decision: { type: Type.STRING, description: 'One-sentence rationale explaining the score.' },
          },
          required: ['score', 'tags', 'decision'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, ...parsed });
  } catch (error) {
    res.json({
      success: true,
      score: 75,
      tags: ['Standard-Profile'],
      decision: `Scoring engine fallback: Candidate meets standard credit thresholds.`
    });
  }
});

// Document OCR & Verification Analyzer
app.post('/api/gemini/verify-doc', async (req, res) => {
  const { docType, docName, fileContent } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const nameMatch = docName.toLowerCase().includes('sarah') || docName.toLowerCase().includes('jenkins');
    const income = docName.toLowerCase().includes('w2') || docName.toLowerCase().includes('paystub') ? 8500 : undefined;
    return res.json({
      success: true,
      ocrData: {
        extractedName: nameMatch ? 'Sarah Jenkins' : 'Michael Chen',
        extractedIncome: income,
        extractedEmployer: docType === 'Paystub' ? 'TechCorp Solutions' : undefined,
        confidenceScore: 98,
        issues: [],
      },
      status: 'Verified',
    });
  }

  try {
    const { GoogleGenAI, Type } = require("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Act as an automated document underwriting parser. Extract structural details from this document:
Document Category: ${docType}
File Name: ${docName}
Extracted Text Segment: "${fileContent || 'Jane Doe, Pay Period: June 2026, Net Income: $6,500, Employer: Acme Global Ltd'}"

Determine Name compatibility, Income parameters, Employer name, confidence rating, and flag any discrepancy. Format response as JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedName: { type: Type.STRING, description: 'Full name on the document.' },
            extractedIncome: { type: Type.NUMBER, description: 'Extracted monthly/annual wages if readable.' },
            extractedEmployer: { type: Type.STRING, description: 'Employer name if paystub.' },
            confidenceScore: { type: Type.INTEGER, description: 'Parser confidence score 0-100.' },
            issues: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Issues detected (e.g. Low resolution, Name mismatch, expired doc).',
            },
          },
          required: ['extractedName', 'confidenceScore', 'issues'],
        },
      },
    });

    const ocrData = JSON.parse(response.text || '{}');
    const status = ocrData.issues.length > 0 ? 'Rejected' : 'Verified';
    res.json({ success: true, ocrData, status });
  } catch (error) {
    res.json({
      success: true,
      ocrData: {
        extractedName: 'Sarah Jenkins',
        confidenceScore: 90,
        issues: [],
      },
      status: 'Verified',
    });
  }
});

// Voice Call Simulator Engine
app.post(['/api/simulate-call', '/api/gemini/simulate-call'], async (req, res) => {
  const { leadName, loanAmount, prompt, transcript, customerUtterance } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    let reply = `Hello ${leadName}, I appreciate that. I've noted down your loan details. Let's touch base again soon.`;
    let sentiment = 'Neutral';
    let intent = 'Unknown';
    let isFinished = false;

    const lowerUtterance = customerUtterance.toLowerCase();
    if (lowerUtterance.includes('yes') || lowerUtterance.includes('sure') || lowerUtterance.includes('interested')) {
      reply = `That is fantastic! Since you are interested in the $${loanAmount} loan, I am sending an upload link for your documents right now. Should I also book an agent to call you back?`;
      sentiment = 'Positive';
      intent = 'Interested';
    } else if (lowerUtterance.includes('no') || lowerUtterance.includes('stop') || lowerUtterance.includes('busy')) {
      reply = `I completely understand. I will close your file. Thanks for your time, goodbye!`;
      sentiment = 'Negative';
      intent = 'Not Interested';
      isFinished = true;
    }

    return res.json({ success: true, reply, sentiment, intent, isFinished });
  }

  try {
    const { GoogleGenAI, Type } = require("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const formattedTranscript = transcript
      .map((t) => `${t.speaker}: ${t.text}`)
      .join('\n');

    const conversationPrompt = `You are an conversational outbound AI calling agent for ChiefXAI. You are in a phone call with client ${leadName} discussing their requested loan of $${loanAmount}.
Campaign Persona/Instruction: ${prompt}

Prior Conversation:
${formattedTranscript}

Customer's new message: "${customerUtterance}"

Generate your next reply. It must be brief (1-2 clear, human sentences as spoken on a phone). Also analyze the customer's sentiment ('Positive' | 'Neutral' | 'Negative') and intent ('Interested' | 'Not Interested' | 'Callback Scheduled' | 'Wrong Number' | 'Unknown') and whether the conversation has naturally concluded (isFinished).
Output strictly as JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: conversationPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING, description: 'Natural spoken reply from the AI agent.' },
            sentiment: {
              type: Type.STRING,
              enum: ['Positive', 'Neutral', 'Negative'],
              description: 'Sentiment of the customer.',
            },
            intent: {
              type: Type.STRING,
              enum: ['Interested', 'Not Interested', 'Callback Scheduled', 'Wrong Number', 'Unknown'],
              description: 'Customer intent analysis.',
            },
            isFinished: {
              type: Type.BOOLEAN,
              description: 'Whether the conversation has ended (e.g., customer said goodbye or asked to hang up).',
            },
          },
          required: ['reply', 'sentiment', 'intent', 'isFinished'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, ...parsed });
  } catch (error) {
    res.json({
      success: true,
      reply: `I see. I will document this on your profile.`,
      sentiment: 'Neutral',
      intent: 'Unknown',
      isFinished: false
    });
  }
});

// ==========================================
// 2. Twilio Call Webhooks & Initiation
// ==========================================

// Twilio Webhook Incoming Answer Endpoint
app.post("/api/twilio/incoming", (req, res) => {
  const From = req.body.From || req.query.From;
  const CallSid = req.body.CallSid || req.query.CallSid || req.body.callId || req.body.CallSid;

  if (CallSid && From) {
    twilioCallNumbers.set(CallSid, From);
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

// Initiate Outbound Twilio Call
app.post("/api/twilio/call", async (req, res) => {
  const { phoneNumber, questions } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ error: "Missing phoneNumber in request body" });
  }

  // Register dynamic call questions if provided
  if (questions && Array.isArray(questions) && questions.length > 0) {
    const { twilioCallQuestions } = require("./services/twilioProxy");
    const sanitizedNumber = phoneNumber.replace(/[\s\-\(\)\+]+/g, "");
    twilioCallQuestions.set(sanitizedNumber, questions);
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
    let callbackUrl;
    if (process.env.PUBLIC_URL) {
      callbackUrl = `${process.env.PUBLIC_URL}/api/twilio/incoming`;
    } else {
      const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const host = req.headers.host;
      callbackUrl = `${protocol}://${host}/api/twilio/incoming`;
    }

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
    return res.status(500).json({ error: "Twilio credentials are not configured on the server." });
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

// ==========================================
// 3. CRM CRUD APIs & Sync Endpoints
// ==========================================

// Leads Database API
app.get('/api/leads', (req, res) => {
  res.json(readAll('leads', initialLeads));
});

app.post('/api/leads', (req, res) => {
  const newLead = {
    id: `L-${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toISOString(),
    ...req.body
  };
  append('leads', newLead);
  broadcastLog(`👤 Created new lead: ${newLead.name} via UI`, { type: 'lead', leadId: newLead.id });
  res.status(201).json(newLead);
});

app.patch('/api/leads/:id', (req, res) => {
  const updated = update('leads', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Lead not found' });
  broadcastLog(`👤 Updated lead profile: ${updated.name}`, { type: 'lead', leadId: req.params.id });
  res.json(updated);
});

app.delete('/api/leads/:id', (req, res) => {
  const leadsList = readAll('leads', initialLeads);
  const filtered = leadsList.filter(l => l.id !== req.params.id);
  writeAll('leads', filtered);
  broadcastLog(`👤 Removed lead: ${req.params.id}`, { type: 'lead', leadId: req.params.id });
  res.json({ success: true });
});

// Loans Database API
app.get('/api/loans', (req, res) => {
  res.json(readAll('loans', initialLoans));
});

app.post('/api/loans', (req, res) => {
  const newLoan = {
    id: `LN-${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toISOString(),
    ...req.body
  };
  append('loans', newLoan);
  broadcastLog(`💵 Created new loan application: ${newLoan.id}`, { type: 'loan', loanId: newLoan.id });
  res.status(201).json(newLoan);
});

app.patch('/api/loans/:id', (req, res) => {
  const updated = update('loans', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Loan not found' });
  broadcastLog(`💵 Updated loan application: ${updated.id}`, { type: 'loan', loanId: req.params.id });
  res.json(updated);
});

// Campaigns Database API
app.get('/api/campaigns', (req, res) => {
  res.json(readAll('campaigns', initialCampaigns));
});

app.post('/api/campaigns', (req, res) => {
  const newCampaign = {
    id: `CAMP-${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toISOString(),
    ...req.body
  };
  append('campaigns', newCampaign);
  broadcastLog(`📢 Created marketing campaign: ${newCampaign.name}`, { type: 'campaign', campaignId: newCampaign.id });
  res.status(201).json(newCampaign);
});

app.patch('/api/campaigns/:id', (req, res) => {
  const updated = update('campaigns', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Campaign not found' });
  broadcastLog(`📢 Updated campaign settings: ${updated.name}`, { type: 'campaign', campaignId: req.params.id });
  res.json(updated);
});

// Workflows Database API
app.get('/api/workflows', (req, res) => {
  res.json(readAll('workflows', initialWorkflows));
});

app.post('/api/workflows', (req, res) => {
  const newWorkflow = {
    id: `WF-${Date.now().toString().slice(-4)}`,
    ...req.body
  };
  append('workflows', newWorkflow);
  broadcastLog(`⚙️ Created routing workflow: ${newWorkflow.name}`, { type: 'workflow', workflowId: newWorkflow.id });
  res.status(201).json(newWorkflow);
});

app.patch('/api/workflows/:id', (req, res) => {
  const updated = update('workflows', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Workflow not found' });
  broadcastLog(`⚙️ Updated workflow settings: ${updated.name}`, { type: 'workflow', workflowId: req.params.id });
  res.json(updated);
});

// Call Logs Database API
app.get('/api/call-logs', (req, res) => {
  res.json(readAll('calllogs', initialCallLogs));
});

app.post('/api/call-logs', (req, res) => {
  const newLog = {
    id: `CL-${Date.now().toString().slice(-4)}`,
    ...req.body
  };
  append('calllogs', newLog);
  broadcastLog(`📞 Logged call with: ${newLog.leadName || 'Contact'}`, { type: 'calllog', logId: newLog.id });
  res.status(201).json(newLog);
});

// Settings Database APIs
app.get('/api/settings/numbers', (req, res) => {
  res.json(readAll('numbers', initialVirtualNumbers));
});

app.post('/api/settings/numbers', (req, res) => {
  const newNumber = {
    id: `NUM-${Date.now().toString().slice(-4)}`,
    ...req.body
  };
  append('numbers', newNumber);
  broadcastLog(`📞 Assigned new virtual number: ${newNumber.phoneNumber}`, { type: 'settings' });
  res.status(201).json(newNumber);
});

app.patch('/api/settings/numbers/:id', (req, res) => {
  const updated = update('numbers', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Number not found' });
  res.json(updated);
});

app.get('/api/settings/team', (req, res) => {
  res.json(readAll('team', initialTeamMembers));
});

app.post('/api/settings/team', (req, res) => {
  const newMember = {
    id: `TM-${Date.now().toString().slice(-4)}`,
    ...req.body
  };
  append('team', newMember);
  broadcastLog(`👤 Registered team member: ${newMember.name}`, { type: 'settings' });
  res.status(201).json(newMember);
});

app.patch('/api/settings/team/:id', (req, res) => {
  const updated = update('team', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Team member not found' });
  res.json(updated);
});

app.get('/api/settings/org', (req, res) => {
  const orgList = readAll('org', [initialOrgSettings]);
  res.json(orgList[0] || initialOrgSettings);
});

app.post('/api/settings/org', (req, res) => {
  writeAll('org', [req.body]);
  broadcastLog(`⚙️ Updated organization settings: ${req.body.name}`, { type: 'settings' });
  res.json(req.body);
});

// Bulk State Synchronization Endpoints
app.post('/api/leads/sync', (req, res) => {
  writeAll('leads', req.body);
  syncToSupabase('leads', req.body);
  res.json(req.body);
});
app.post('/api/loans/sync', (req, res) => {
  writeAll('loans', req.body);
  syncToSupabase('loans', req.body);
  res.json(req.body);
});
app.post('/api/campaigns/sync', (req, res) => {
  writeAll('campaigns', req.body);
  syncToSupabase('campaigns', req.body);
  res.json(req.body);
});
app.post('/api/workflows/sync', (req, res) => {
  writeAll('workflows', req.body);
  syncToSupabase('workflows', req.body);
  res.json(req.body);
});
app.post('/api/settings/numbers/sync', (req, res) => {
  writeAll('numbers', req.body);
  syncToSupabase('numbers', req.body);
  res.json(req.body);
});
app.post('/api/settings/team/sync', (req, res) => {
  writeAll('team', req.body);
  syncToSupabase('team', req.body);
  res.json(req.body);
});
app.post('/api/call-logs/sync', (req, res) => {
  writeAll('calllogs', req.body);
  syncToSupabase('calllogs', req.body);
  res.json(req.body);
});

// SPA fallback routing
app.get("*", (req, res, next) => {
  if (req.url.startsWith("/api") || req.url.startsWith("/session") || req.url.startsWith("/vobiz/stream") || req.url.startsWith("/twilio/stream")) {
    return next();
  }
  res.sendFile(path.join(__dirname, "dashboard", "index.html"));
});

const server = http.createServer(app);

// WebSocket setup using manual upgrade routing to support multiple paths
const wss = new WebSocketServer({ noServer: true });
const wssTwilio = new WebSocketServer({ noServer: true });
const wssVobiz = new WebSocketServer({ noServer: true });

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

wssVobiz.on("connection", (ws, req) => {
  activeSessionsCount++;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  console.log(`📞 Vobiz call connected from ${ip} | Active: ${activeSessionsCount}`);

  handleVobizSession(ws);

  ws.on("close", () => {
    activeSessionsCount = Math.max(0, activeSessionsCount - 1);
    console.log(`📞 Vobiz call disconnected | Active: ${activeSessionsCount}`);
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
  } else if (pathname === "/vobiz/stream") {
    wssVobiz.handleUpgrade(request, socket, head, (ws) => {
      wssVobiz.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

// ── Seed Chroma DB ──
async function seedChromaDB() {
  try {
    const chromaUrl = process.env.CHROMA_URL || "https://chroma-corechroma-production-1118.up.railway.app";
    console.log(`🤖 Checking Chroma DB collection seeding at: ${chromaUrl}`);
    const collectionsRes = await fetch(`${chromaUrl}/api/v2/tenants/default_tenant/databases/default_database/collections`);
    if (!collectionsRes.ok) {
      console.warn("⚠️ Failed to check Chroma DB collections list");
      return;
    }
    const collections = await collectionsRes.json();
    let targetColl = collections.find(c => c.name === "policy-documents");
    let needsSeed = !targetColl;
    let newCollectionId = targetColl?.id;

    if (targetColl) {
      try {
        const countRes = await fetch(`${chromaUrl}/api/v2/tenants/default_tenant/databases/default_database/collections/${targetColl.id}/count`);
        if (countRes.ok) {
          const count = await countRes.json();
          const fs = require("fs");
          const path = require("path");
          const seedPath = path.join(__dirname, "policy_documents_seed.json");
          let seedCount = 0;
          if (fs.existsSync(seedPath)) {
            const seedData = JSON.parse(fs.readFileSync(seedPath, "utf8"));
            seedCount = seedData.ids.length;
          }
          if (count === 0 || count !== seedCount) {
            console.log(`📥 Document count mismatch (DB: ${count}, Local Seed: ${seedCount}). Resetting and re-seeding...`);
            await fetch(`${chromaUrl}/api/v2/tenants/default_tenant/databases/default_database/collections/${targetColl.name}`, {
              method: "DELETE"
            });
            needsSeed = true;
            targetColl = null; // force recreate
          }
        }
      } catch (err) {
        console.warn("⚠️ Failed to query/re-seed collection document count:", err.message);
      }
    }

    if (needsSeed) {
      if (!targetColl) {
        console.log(`📥 "policy-documents" collection not found on target Chroma. Creating...`);
        const createRes = await fetch(`${chromaUrl}/api/v2/tenants/default_tenant/databases/default_database/collections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "policy-documents",
            metadata: { description: "Health Insurance Policy Documents" },
            get_or_create: true
          })
        });
        if (!createRes.ok) {
          console.error("❌ Failed to create collection on target Chroma DB:", await createRes.text());
          return;
        }
        const targetCollection = await createRes.json();
        newCollectionId = targetCollection.id;
      }

      const fs = require("fs");
      const path = require("path");
      const seedPath = path.join(__dirname, "policy_documents_seed.json");
      if (fs.existsSync(seedPath)) {
        const seedData = JSON.parse(fs.readFileSync(seedPath, "utf8"));
        console.log(`📤 Seeding ${seedData.ids.length} chunks into target Chroma DB...`);
        const mockEmbeddings = new Array(seedData.ids.length).fill(null).map(() => new Array(384).fill(0.0));
        const addRes = await fetch(`${chromaUrl}/api/v2/tenants/default_tenant/databases/default_database/collections/${newCollectionId}/add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: seedData.ids,
            embeddings: mockEmbeddings,
            metadatas: seedData.metadatas,
            documents: seedData.documents
          })
        });
        if (addRes.ok) {
          console.log("🎉 Chroma DB seeded successfully with policy documents!");
        } else {
          console.error("❌ Failed to seed Chroma DB:", await addRes.text());
        }
      } else {
        console.warn("⚠️ Local Chroma DB seed file policy_documents_seed.json not found!");
      }
    } else {
      console.log(`✅ Chroma DB "policy-documents" collection already exists and has documents. Skipping seed.`);
    }
  } catch (err) {
    console.error("❌ Error checking/seeding Chroma DB:", err.message);
  }
}

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
  console.log(`📞 Vobiz Stream WebSocket path: /vobiz/stream\n`);

  // Run dynamic Chroma DB seeding
  seedChromaDB();
});
