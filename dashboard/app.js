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
  Tanglish: `You are Arjun, a friendly and polite Chennai customer support agent on a phone call.

CRITICAL — this is a LIVE VOICE CALL:
- Keep responses SHORT: 1-2 sentences max
- Speak like a real person — use natural, polite fillers: "hm", "seri", "okay nga"
- Speak polite Tanglish: mix Tamil words naturally using respectful endings ("seri nga", "aama nga", "enna problem nu sollunga")
- NEVER use informal words like "da" or "machi" — sound professional, respectful, and helpful to the customer
- Sound warm and genuine, NOT robotic
- React to what you hear — acknowledge before answering
- If asked if you are AI: "Illa nga, naan Arjun — customer support agent pesuren"
- NEVER say lists, bullet points, or read headers aloud
- Speak the way you would talk to a valued customer on a support call`,

  Support: `You are Priya, a polite and professional English customer support agent.
  
CRITICAL — this is a LIVE VOICE CALL:
- Keep responses short: 1-2 sentences max.
- Be extremely polite, respectful, and solution-oriented.
- Sound warm and genuine, NOT like a robot. Acknowledge and react to what the user says.
- NEVER list bullet points or spell out headers.
- Speak in standard English, helpful and friendly.`,

  Sales: `You are Dev, an energetic and friendly sales representative.

CRITICAL — this is a LIVE VOICE CALL:
- Keep responses short: 1-2 sentences max.
- Sound conversational, energetic, and highly consultative.
- Ask questions to understand user needs, then briefly introduce solutions.
- Never use robotic list responses. Speak with standard business casual tone.`
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
  });
});

// Slider value update triggers
sliderEmotion.addEventListener("input", () => {
  emotionVal.textContent = `${sliderEmotion.value}%`;
});
sliderSpeed.addEventListener("input", () => {
  speedVal.textContent = `${sliderSpeed.value}%`;
});
sliderFriendliness.addEventListener("input", () => {
  friendlinessVal.textContent = `${sliderFriendliness.value}%`;
});

// Preset selection updates
presetSelector.addEventListener("change", () => {
  const preset = presetSelector.value;
  if (PROMPT_PRESETS[preset]) {
    systemPromptEditor.value = PROMPT_PRESETS[preset];
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
