// ============================================================
// dashboard/app.js
// Javascript Logic for Admin Console
// ============================================================

// Base API URL configuration
// Dynamically fall back to localhost if not hosted together
const BASE_URL = location.hostname === "" || location.hostname === "localhost" || location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : `${location.protocol}//${location.host}`;

// Prompt presets definitions
const PROMPT_PRESETS = {
  Tanglish: `You are a warm, polite customer support agent on a phone call.

SPEECH STYLE PROTOCOL (CRITICAL FOR HUMAN REALISM):
- You must sound like a real, helpful human, NOT a robotic AI.
- Speak in colloquial, polite Tanglish (mixed Tamil and English) using respectful endings ("seri nga", "aama nga", "sollinga nga", "oru nimisham irunga").
- Keep responses extremely SHORT. Never speak more than 1 or 2 sentences at a time.
- EXPRESS EMOTION NATIVELY: Speak with a warm smile in your voice. If the customer says something funny, interesting, or tells a joke, laugh naturally (chuckle, giggle, "haha", "hehe") and respond with happiness. 
- Match the customer's tone and vibe: be enthusiastic if they are happy, and empathetic if they are concerned.
- Acknowledge and react to what the customer says before answering. For example:
  * "Oh, appadiya nga... (chuckle) seri kelunga!"
  * "Kandippa nga, naan help panren."
  * "Hmm, puriyudhu nga... enna aachu nu sollunga."
- Start responses with small verbal nods like: "Okay nga...", "Seri nga...", "Aama nga...".
- Avoid long explanations, lists, or bullet points. If you need info, ask for one thing at a time.
- NEVER use informal slang like "da", "machi", or "dii". Stay professional, warm, and highly respectful.`,

  Support: `You are a polite and professional English customer support agent.
  
SPEECH STYLE PROTOCOL (CRITICAL FOR HUMAN REALISM):
- You must sound like a real, warm person, NOT a machine.
- Keep responses short: 1-2 sentences max. 
- EXPRESS EMOTION NATIVELY: Speak with a warm smile in your voice. If the caller laughs or says something funny/interesting, chuckle naturally and show happiness. Match their vibe.
- Always acknowledge and react to the customer's input before answering. For example:
  * "Oh, I see... (giggle) that's great!", "Sure, I can help with that!", "Hmm, let me check that for you."
- Speak in a natural, friendly, and helpful tone.
- Avoid structured lists or spelling out headers. Speak in plain, conversational language.`,

  Sales: `You are an energetic and friendly sales representative on a phone call.

SPEECH STYLE PROTOCOL (CRITICAL FOR HUMAN REALISM):
- Sound like an engaging consultant, NOT a cold-calling robot.
- Keep responses short and punchy: 1-2 sentences max.
- EXPRESS EMOTION NATIVELY: Speak with a warm smile. Laugh naturally and show positive energy if the user shares something interesting or funny.
- Always react and validate what the customer says first: "That makes total sense! (chuckle)", "Oh, absolutely!", "Right, I get it."
- Ask brief questions to guide the conversation. Never dump features or pitch lists.
- Speak naturally with business casual tone.`
};

// UI State variables
let activeVoice = "Arjun";
let currentConfig = null;

// DOM Elements
const voiceCards = document.querySelectorAll(".voice-card");
const sliderEmotion = document.getElementById("slider-emotion");
const sliderSpeed = document.getElementById("slider-speed");
const sliderFriendliness = document.getElementById("slider-friendliness");
const emotionVal = document.getElementById("emotion-val");
const speedVal = document.getElementById("speed-val");
const friendlinessVal = document.getElementById("friendliness-val");
const presetSelector = document.getElementById("preset-selector");
const systemPromptEditor = document.getElementById("system-prompt-editor");
const savePromptBtn = document.getElementById("save-prompt-btn");
const refreshLogsBtn = document.getElementById("refresh-logs-btn");
const callsTableBody = document.getElementById("calls-table-body");

// Metrics elements
const metricTotalCalls = document.getElementById("metric-total-calls");
const metricActiveCalls = document.getElementById("metric-active-calls");
const metricAvgDuration = document.getElementById("metric-avg-duration");
const metricCreditsConsumed = document.getElementById("metric-credits-consumed");

// Audio player elements
const audioPlayerBar = document.getElementById("audio-player-bar");
const mainAudioElement = document.getElementById("main-audio-element");
const playerCallerId = document.getElementById("player-caller-id");
const playerCallMeta = document.getElementById("player-call-meta");
const closePlayerBtn = document.getElementById("close-player-btn");

// ── 1. Fetch Configuration ─────────────────────────────────────
async function loadConfig() {
  try {
    const response = await fetch(`${BASE_URL}/api/config`);
    const config = await response.json();
    currentConfig = config;
    
    // Update Voice Card UI
    activeVoice = config.activeVoice;
    voiceCards.forEach(c => {
      if (c.getAttribute("data-voice") === activeVoice) {
        c.classList.add("active");
      } else {
        c.classList.remove("active");
      }
    });

    // Update Sliders
    sliderEmotion.value = config.emotion;
    emotionVal.textContent = `${config.emotion}%`;
    
    sliderSpeed.value = config.speed;
    speedVal.textContent = `${config.speed}%`;
    
    sliderFriendliness.value = config.friendliness;
    friendlinessVal.textContent = `${config.friendliness}%`;

    // Update Prompt
    systemPromptEditor.value = config.systemPrompt;
  } catch (err) {
    console.error("Failed to load backend config:", err.message);
  }
}

// ── 2. Save Configuration ──────────────────────────────────────
async function saveConfig() {
  if (!currentConfig) return;
  
  const payload = {
    activeVoice,
    emotion: parseInt(sliderEmotion.value),
    speed: parseInt(sliderSpeed.value),
    friendliness: parseInt(sliderFriendliness.value),
    systemPrompt: systemPromptEditor.value
  };

  try {
    savePromptBtn.disabled = true;
    savePromptBtn.textContent = "Applying config...";
    
    const response = await fetch(`${BASE_URL}/api/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      currentConfig = await response.json();
      showStatusNotice("Config updated successfully!");
    } else {
      throw new Error("Failed to save");
    }
  } catch (err) {
    console.error("Error saving config:", err.message);
    alert("Error saving configuration to backend.");
  } finally {
    savePromptBtn.disabled = false;
    savePromptBtn.textContent = "Apply Config Settings";
  }
}

// ── 3. Fetch Metrics ───────────────────────────────────────────
async function updateMetrics() {
  try {
    const response = await fetch(`${BASE_URL}/api/metrics`);
    const metrics = await response.json();
    
    metricTotalCalls.textContent = metrics.totalCalls;
    metricActiveCalls.textContent = metrics.activeSessions;
    metricAvgDuration.textContent = `${metrics.avgDuration}s`;
    metricCreditsConsumed.textContent = `$${metrics.creditsConsumed.toFixed(2)}`;
  } catch (err) {
    console.error("Error fetching metrics:", err.message);
  }
}

// ── 4. Fetch Call Logs ─────────────────────────────────────────
async function updateCallLogs() {
  try {
    callsTableBody.innerHTML = `<tr><td colspan="6" class="table-empty">Loading records...</td></tr>`;
    const response = await fetch(`${BASE_URL}/api/calls`);
    const data = await response.json();
    
    const calls = data.calls || [];
    if (calls.length === 0) {
      callsTableBody.innerHTML = `<tr><td colspan="6" class="table-empty">No calls recorded yet.</td></tr>`;
      return;
    }

    callsTableBody.innerHTML = "";
    calls.forEach(call => {
      const dateStr = new Date(call.created_at).toLocaleString();
      const durationStr = `${call.duration_seconds}s`;
      
      // Sentiment badge markup
      const sentimentClass = `badge-${call.sentiment?.toLowerCase() || 'neutral'}`;
      const sentimentText = call.sentiment || "Neutral";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${call.caller_number || "Unknown"}</strong></td>
        <td>🎙️ ${call.agent_name || "Arjun"}</td>
        <td>${durationStr}</td>
        <td><span class="badge ${sentimentClass}">${sentimentText}</span></td>
        <td>${dateStr}</td>
        <td class="action-row">
          ${call.recording_url 
            ? `<button class="btn-icon play-btn" data-url="${call.recording_url}" data-caller="${call.caller_number}" data-meta="${durationStr} • ${call.agent_name}">▶</button>
               <a href="${call.recording_url}" download="recording_${call.id}.wav" class="btn-icon" style="text-decoration:none">📥</a>` 
            : `<span class="tag">No Audio</span>`}
        </td>
      `;
      callsTableBody.appendChild(tr);
    });

    // Wire up inline play buttons
    document.querySelectorAll(".play-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const url = btn.getAttribute("data-url");
        const caller = btn.getAttribute("data-caller");
        const meta = btn.getAttribute("data-meta");
        playAudio(url, caller, meta);
      });
    });

  } catch (err) {
    console.error("Error loading call logs:", err.message);
    callsTableBody.innerHTML = `<tr><td colspan="6" class="table-empty" style="color:var(--red)">Failed to load call logs.</td></tr>`;
  }
}

// Play audio in the bottom player bar
function playAudio(url, caller, meta) {
  playerCallerId.textContent = caller || "Unknown Caller";
  playerCallMeta.textContent = `Duration: ${meta}`;
  mainAudioElement.src = url;
  
  audioPlayerBar.classList.remove("hidden");
  mainAudioElement.play();
}

// ── Helper Status Notice ───────────────────────────────────────
function showStatusNotice(message) {
  const notice = document.createElement("div");
  notice.style.position = "fixed";
  notice.style.top = "20px";
  notice.style.right = "20px";
  notice.style.backgroundColor = "var(--green)";
  notice.style.color = "#fff";
  notice.style.padding = "12px 24px";
  notice.style.borderRadius = "8px";
  notice.style.fontSize = "14px";
  notice.style.fontWeight = "600";
  notice.style.zIndex = "2000";
  notice.style.boxShadow = "0 4px 15px rgba(72, 187, 120, 0.4)";
  notice.textContent = message;
  
  document.body.appendChild(notice);
  setTimeout(() => notice.remove(), 3000);
}

// ── Event Listeners ────────────────────────────────────────────

// Voice Card Click Handles
voiceCards.forEach(card => {
  card.addEventListener("click", () => {
    voiceCards.forEach(c => c.classList.remove("active"));
    card.classList.add("active");
    activeVoice = card.getAttribute("data-voice");
    saveConfig(); // Automatically save voice selection
  });
});

// Slider value update triggers (visual feedback)
sliderEmotion.addEventListener("input", () => {
  emotionVal.textContent = `${sliderEmotion.value}%`;
});
sliderSpeed.addEventListener("input", () => {
  speedVal.textContent = `${sliderSpeed.value}%`;
});
sliderFriendliness.addEventListener("input", () => {
  friendlinessVal.textContent = `${sliderFriendliness.value}%`;
});

// Save sliders automatically when user releases them (on 'change')
sliderEmotion.addEventListener("change", saveConfig);
sliderSpeed.addEventListener("change", saveConfig);
sliderFriendliness.addEventListener("change", saveConfig);

// Preset selection updates
presetSelector.addEventListener("change", () => {
  const preset = presetSelector.value;
  if (PROMPT_PRESETS[preset]) {
    systemPromptEditor.value = PROMPT_PRESETS[preset];
    saveConfig(); // Automatically save prompt preset when switched
  }
});

// Buttons triggers
savePromptBtn.addEventListener("click", saveConfig);
refreshLogsBtn.addEventListener("click", updateCallLogs);
closePlayerBtn.addEventListener("click", () => {
  mainAudioElement.pause();
  audioPlayerBar.classList.add("hidden");
});

// ── Initialization & Polling ──────────────────────────────────
async function init() {
  await loadConfig();
  await updateMetrics();
  await updateCallLogs();
  
  // Poll metrics every 3 seconds, call records every 10 seconds
  setInterval(updateMetrics, 3000);
  setInterval(updateCallLogs, 10000);
}

document.addEventListener("DOMContentLoaded", init);
