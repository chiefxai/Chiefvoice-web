# ChiefVoice — Web Realtime Voice Agent

Browser-based voice call with Gemini Live API. Works on **Chrome Android + Safari iOS**.  
No Exotel. No phone number. Just open a URL on mobile and talk to Arjun.

---

## Deploy to Railway (recommended — free tier works)

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "chiefvoice web realtime"
# create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/chiefvoice-web.git
git push -u origin main
```

### Step 2 — Deploy on Railway

1. Go to **railway.app** → New Project → Deploy from GitHub repo
2. Select your repo → Railway auto-detects Node.js
3. Click **Variables** → Add:
   ```
   GEMINI_API_KEY = your_key_here
   ```
4. Railway assigns a public URL like `https://chiefvoice-web-production.up.railway.app`
5. Share that URL with your phone — done ✅

> Railway gives free $5/month credit — enough for ~500 hours of idle server time.
> The server only uses CPU when a call is active, so it's very cheap.

---

## Deploy to Render (alternative — also free)

1. Go to **render.com** → New Web Service → Connect GitHub repo
2. Build command: `npm install`
3. Start command: `node server.js`
4. Add env var: `GEMINI_API_KEY = your_key_here`
5. Render gives a `https://your-app.onrender.com` URL

> Note: Render free tier spins down after 15 min inactivity. First request after
> sleep takes ~30s. Upgrade to $7/month Starter to keep it always-on.

---

## Local dev with HTTPS (for mobile testing on same WiFi)

```bash
npm install
cp .env.example .env
# add GEMINI_API_KEY

# Option A: ngrok
npm start &
ngrok http 3000
# Open the ngrok https:// URL on mobile

# Option B: just test on desktop first (localhost works without HTTPS)
npm start
# Open http://localhost:3000 in Chrome
```

---

## Mobile browser compatibility

| Browser | Mic | Audio | Notes |
|---------|-----|-------|-------|
| Chrome Android | ✅ | ✅ | Best experience |
| Safari iOS 16+ | ✅ | ✅ | Tap call button to unlock AudioContext |
| Firefox Android | ✅ | ✅ | Works fine |
| Samsung Internet | ✅ | ✅ | Works fine |
| Safari iOS 14-15 | ⚠️ | ✅ | May need page reload if mic fails |

**iOS Safari note:** The page shows a small notice reminding users to tap the
button to allow mic + audio. This is a Safari security requirement — AudioContext
must be created inside a user gesture (tap). The code handles this correctly.

---

## What's in the code

```
web-realtime/
├── server.js                  — Express HTTP + WebSocket server
│                                Serves public/ and proxies browser↔Gemini
├── services/geminiProxy.js    — Opens Gemini Live session per browser connection
│                                API key stays here — never sent to browser
├── public/index.html          — Complete mobile UI
│                                Mic capture, resampling, scheduled playback
│                                Safari AudioContext unlock handling
├── railway.json               — Railway deploy config
├── render.yaml                — Render deploy config
└── .env.example
```

## Audio architecture

```
Browser mic (getUserMedia)
  → Float32 at device sample rate (could be 44100 on Safari)
  → Resample to 16kHz (linear interpolation, in browser)
  → Float32 → Int16 PCM
  → Base64 → JSON → WebSocket → server.js → Gemini Live

Gemini Live response (PCM 24kHz)
  → server.js → WebSocket → browser
  → Base64 → Int16 → Float32
  → Scheduled into persistent AudioContext (gap-free playback)
  → Speaker
```

No server-side audio processing. Server is a pure WebSocket proxy.
