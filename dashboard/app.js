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
  Tanglish: `You are a customer support guy on a phone call, talking the way people in Chennai actually talk — not performing politeness, just genuinely chatting.

SPEECH STYLE (CRITICAL FOR HUMAN REALISM):
- Never write bracketed actions like (chuckle), (laughs), (giggle) — they get read out as literal words and sound broken. Put the emotion INTO the words: "aha, appadiya nga!" already sounds like a laugh, you don't need to tag it.
- Mix Tamil for the emotional/connective parts and English for technical nouns, naturally: "Adhu order-oda issue nu therinjudhu, but oru nimisham check pannanum."
- Keep responses to 1-2 sentences, then stop.
- React to what they said IN THE SAME breath as your next sentence — don't pause and react separately: "Ayyo appadiya nga, ok sollunga your order number."
- Vary your filler — "seri nga", "aama nga", "okay okay", "puriyudhu" — pick one per turn, don't stack three together.
- Vary sentence length — a short reaction, then a slightly longer practical line. Don't make every line the same shape, that reads as scripted.
- NEVER use "da", "machi", "dii" — keep it warm and respectful, not over-familiar.`,

  Support: `You are an English-speaking customer support person on a phone call — relaxed and genuine, not performing customer-service energy.

SPEECH STYLE (CRITICAL FOR HUMAN REALISM):
- Never write bracketed actions like (laughs), (giggle), (pause) — they get spoken literally and sound broken. Show warmth through word choice and rhythm instead: "oh nice, that actually makes this easier" already carries the warmth.
- Keep responses to 1-2 sentences, then stop and listen.
- React to what they said in the same breath as your next line, not as a separate beat: "Oh got it — ok let me just check your account real quick."
- Let some sentences trail off naturally instead of always being crisp: "should be back up in like... ten minutes."
- Vary sentence length and avoid repeating the same opener every turn ("Sure, I can help with that" every single time sounds scripted).
- Avoid corporate phrasing: no "I'd be happy to assist", "certainly", "absolutely" — just talk like a person who happens to be helpful.`,

  Sales: `You are a sales person on a phone call — genuinely engaged and a little informal, not reciting a pitch.

SPEECH STYLE (CRITICAL FOR HUMAN REALISM):
- Never write bracketed actions like (chuckle), (laughs) — they get spoken as literal words and sound broken. Let the energy come through in your phrasing: "haha right, exactly" already does the job.
- Keep responses short and punchy — 1-2 sentences, then ask something and stop.
- React and validate in the same breath as the next sentence: "Totally fair point — so what's the main thing you're trying to solve right now?"
- Vary your sentence rhythm — short reaction, then a slightly longer follow-up, not uniform length every time.
- Never dump a feature list or multiple questions at once. One thread at a time, like an actual conversation.
- Avoid "absolutely!", "great question!", "I'd love to help" — sound like a person who's interested, not a script.`
};

// UI State variables
let activeVoice = "Arjun";
let currentConfig = null;
let activeCallSid = null;

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

// Outbound calling elements
const startCallBtn = document.getElementById("start-call-btn");
const hangupCallBtn = document.getElementById("hangup-call-btn");
const outboundPhoneNumber = document.getElementById("outbound-phone-number");
const callStatusIndicator = document.getElementById("call-status-indicator");

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
    callsTableBody.innerHTML = `<tr><td colspan="7" class="table-empty">Loading records...</td></tr>`;
    const response = await fetch(`${BASE_URL}/api/calls`);
    const data = await response.json();
    
    const calls = data.calls || [];
    if (calls.length === 0) {
      callsTableBody.innerHTML = `<tr><td colspan="7" class="table-empty">No calls recorded yet.</td></tr>`;
      return;
    }

    callsTableBody.innerHTML = "";
    calls.forEach(call => {
      const dateStr = new Date(call.created_at).toLocaleString();
      const durationStr = `${call.duration_seconds}s`;
      const costStr = call.cost_usd !== undefined && call.cost_usd !== null
        ? `$${Number(call.cost_usd).toFixed(4)}`
        : "$0.0000";
      
      // Sentiment badge markup
      const sentimentClass = `badge-${call.sentiment?.toLowerCase() || 'neutral'}`;
      const sentimentText = call.sentiment || "Neutral";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${call.caller_number || "Unknown"}</strong></td>
        <td>🎙️ ${call.agent_name || "Arjun"}</td>
        <td>${durationStr}</td>
        <td><strong>${costStr}</strong></td>
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
    callsTableBody.innerHTML = `<tr><td colspan="7" class="table-empty" style="color:var(--red)">Failed to load call logs.</td></tr>`;
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

// Outbound Call Handlers
async function placeOutboundCall() {
  const number = outboundPhoneNumber.value.trim();
  if (!number) {
    showCallStatus("Please enter a valid phone number", "error");
    return;
  }

  showCallStatus("Initiating call...", "active");
  startCallBtn.disabled = true;
  hangupCallBtn.disabled = false;

  try {
    const response = await fetch(`${BASE_URL}/api/twilio/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: number })
    });
    const data = await response.json();
    if (data.success && data.callSid) {
      activeCallSid = data.callSid;
      showCallStatus("Call ringing...", "active");
    } else {
      throw new Error(data.error || "Failed to trigger call");
    }
  } catch (err) {
    showCallStatus(err.message, "error");
    startCallBtn.disabled = false;
    hangupCallBtn.disabled = true;
  }
}

async function hangupOutboundCall() {
  if (!activeCallSid) {
    showCallStatus("No active call to hang up", "error");
    return;
  }

  showCallStatus("Hanging up...", "active");
  hangupCallBtn.disabled = true;

  try {
    const response = await fetch(`${BASE_URL}/api/twilio/hangup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callSid: activeCallSid })
    });
    const data = await response.json();
    if (data.success) {
      showCallStatus("Call completed", "");
      activeCallSid = null;
      startCallBtn.disabled = false;
      setTimeout(updateCallLogs, 2000);
    } else {
      throw new Error(data.error || "Failed to hang up call");
    }
  } catch (err) {
    showCallStatus(err.message, "error");
    hangupCallBtn.disabled = false;
  }
}

function showCallStatus(message, type) {
  callStatusIndicator.textContent = message;
  callStatusIndicator.className = "call-status-message";
  if (type) {
    callStatusIndicator.classList.add(type);
  }
  callStatusIndicator.classList.remove("hidden");
}

startCallBtn.addEventListener("click", placeOutboundCall);
hangupCallBtn.addEventListener("click", hangupOutboundCall);

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
