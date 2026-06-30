import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";

export default function AIAgent() {
  const [config, setConfig] = useState({
    activeVoice: "Arjun",
    emotion: 50,
    speed: 50,
    friendliness: 50,
    systemPrompt: ""
  });
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    // Load config on mount
    fetch("/api/config")
      .then(res => res.json())
      .then(data => {
        if (data) setConfig(data);
      })
      .catch(err => console.error("Failed to load agent config:", err));
  }, []);

  const handleSave = async (updatedConfig = config) => {
    setSaving(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig)
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setStatusMsg("Configuration applied successfully!");
        setTimeout(() => setStatusMsg(""), 3000);
      } else {
        throw new Error("Failed to save config");
      }
    } catch (err) {
      alert("Error saving configuration: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    const next = { ...config, [field]: value };
    setConfig(next);
    // Auto-save sliders on release, or voice selector change
    if (field === "activeVoice") {
      handleSave(next);
    }
  };

  return (
    <div>
      <PageHeader title="AI Agent Configuration" subtitle="Control how the AI sounds, behaves, and escalates during calls" />
      <div className="px-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-[15px]">Voice & Language</h3>
          <div>
            <label className="text-xs font-semibold text-[var(--color-muted)]">Voice Persona</label>
            <select 
              value={config.activeVoice}
              onChange={(e) => updateField("activeVoice", e.target.value)}
              className="mt-1 w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="Arjun">Arjun — Male (warm & expressive)</option>
              <option value="Priya">Priya — Female (friendly & clear)</option>
              <option value="Dev">Dev — Male (calm & professional)</option>
              <option value="Kavya">Kavya — Female (formal & polite)</option>
            </select>
          </div>
          
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold text-[var(--color-muted)] mb-1">
                <span>Emotion Intensity</span>
                <span>{config.emotion}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={config.emotion}
                onChange={(e) => setConfig(prev => ({ ...prev, emotion: parseInt(e.target.value) }))}
                onMouseUp={() => handleSave()}
                onTouchEnd={() => handleSave()}
                className="w-full"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-[var(--color-muted)] mb-1">
                <span>Speech Speed</span>
                <span>{config.speed}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={config.speed}
                onChange={(e) => setConfig(prev => ({ ...prev, speed: parseInt(e.target.value) }))}
                onMouseUp={() => handleSave()}
                onTouchEnd={() => handleSave()}
                className="w-full"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-[var(--color-muted)] mb-1">
                <span>Friendliness</span>
                <span>{config.friendliness}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={config.friendliness}
                onChange={(e) => setConfig(prev => ({ ...prev, friendliness: parseInt(e.target.value) }))}
                onMouseUp={() => handleSave()}
                onTouchEnd={() => handleSave()}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-[15px]">AI Instructions</h3>
          <div>
            <label className="text-xs font-semibold text-[var(--color-muted)]">System Prompt</label>
            <textarea 
              rows={9} 
              value={config.systemPrompt}
              onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
              placeholder="System prompt for the Gemini Live session..."
              className="mt-1 w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs font-mono bg-white outline-none focus:border-[var(--color-trust)]" 
            />
          </div>
        </div>
      </div>
      
      <div className="px-8 mt-5 flex items-center gap-4">
        <button 
          onClick={() => handleSave()}
          disabled={saving}
          className="bg-[var(--color-trust)] hover:opacity-90 disabled:bg-gray-300 text-white text-sm font-medium px-5 py-2.5 rounded-xl cursor-pointer shadow-sm"
        >
          {saving ? "Applying Config..." : "Apply Config Settings"}
        </button>
        {statusMsg && (
          <span className="text-sm font-medium text-green-600">{statusMsg}</span>
        )}
      </div>
      <div className="h-8" />
    </div>
  );
}
