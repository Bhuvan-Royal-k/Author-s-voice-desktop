import React, { useState } from "react";
import { api } from "../utils/api";
import type { AppConfig, Voice } from "../utils/api";
import { HardDrive, PlayCircle, Monitor, Mic, Info } from "lucide-react";

interface SettingsViewProps {
  config: AppConfig;
  voices: Voice[];
  onConfigSaved: (config: AppConfig) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ config, voices, onConfigSaved }) => {
  const [settingsLibraryPath, setSettingsLibraryPath] = useState(config.library_path || "");
  const [settingsVoice, setSettingsVoice] = useState(config.default_voice || "en-US-AriaNeural");
  const [settingsSpeed, setSettingsSpeed] = useState(config.default_speed || 1.0);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updated: AppConfig = {
      ...config,
      library_path: settingsLibraryPath.trim(),
      default_voice: settingsVoice,
      default_speed: settingsSpeed
    };

    try {
      const saved = await api.updateConfig(updated);
      onConfigSaved(saved);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Error saving configuration.");
    }
  };

  const handlePickFolder = async () => {
    try {
      const res = await api.pickFolder();
      if (res.path) {
        setSettingsLibraryPath(res.path);
      }
    } catch (err) {
      console.error("Failed to pick folder", err);
    }
  };

  return (
    <div style={{ maxWidth: "800px", display: "flex", flexDirection: "column", gap: "32px", paddingBottom: "120px" }}>
      <div>
        <h1 style={{ fontSize: "32px", fontWeight: "700", margin: "0 0 8px", letterSpacing: "-0.5px" }}>Settings</h1>
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>Customize your application preferences.</p>
      </div>

      {saveSuccess && (
        <div style={{ color: "#fff", backgroundColor: "var(--success-color)", padding: "12px 16px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", textAlign: "center" }}>
          Settings saved successfully.
        </div>
      )}

      <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Storage Section */}
        <div className="settings-section">
          <div className="settings-header">
            <HardDrive size={20} />
            <h2>Storage</h2>
          </div>
          <div className="settings-card">
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "600" }}>Library Location</label>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px" }}>Where your local audiobooks and progress are saved.</p>
              <div style={{ display: "flex", gap: "12px" }}>
                <input
                  type="text"
                  className="form-input"
                  value={settingsLibraryPath}
                  onChange={(e) => setSettingsLibraryPath(e.target.value)}
                  placeholder="Select a folder..."
                  required
                />
                <button type="button" className="btn btn-secondary" onClick={handlePickFolder} style={{ whiteSpace: "nowrap" }}>
                  Browse Folder
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Voice Section */}
        <div className="settings-section">
          <div className="settings-header">
            <Mic size={20} />
            <h2>Voice</h2>
          </div>
          <div className="settings-card">
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "600" }}>Default Narrator</label>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px" }}>The voice used when reading new books.</p>
              <select
                className="form-input"
                value={settingsVoice}
                onChange={(e) => setSettingsVoice(e.target.value)}
              >
                {voices.map((v) => (
                  <option key={v.short_name} value={v.short_name}>
                    {v.friendly_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Playback Section */}
        <div className="settings-section">
          <div className="settings-header">
            <PlayCircle size={20} />
            <h2>Playback</h2>
          </div>
          <div className="settings-card">
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "600", display: "flex", justifyContent: "space-between" }}>
                <span>Reading Speed</span>
                <span style={{ color: "var(--accent-color)" }}>{settingsSpeed}x</span>
              </label>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px" }}>Adjust how fast the narrator reads.</p>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={settingsSpeed}
                onChange={(e) => setSettingsSpeed(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent-color)" }}
              />
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="settings-section">
          <div className="settings-header">
            <Monitor size={20} />
            <h2>Appearance</h2>
          </div>
          <div className="settings-card">
             <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
               Appearance settings (themes, fonts) can be configured directly inside the Reader view.
             </p>
          </div>
        </div>

        {/* About Section */}
        <div className="settings-section">
          <div className="settings-header">
            <Info size={20} />
            <h2>About</h2>
          </div>
          <div className="settings-card" style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
            <p style={{ margin: 0, fontWeight: "600", color: "var(--text-primary)" }}>Author Voice</p>
            <p style={{ margin: 0 }}>Version 1.0.0 (Local Desktop Edition)</p>
            <p style={{ margin: 0, marginTop: "8px" }}>An offline, local-first listening experience. Your documents never leave your device.</p>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start", padding: "12px 32px", fontSize: "15px", borderRadius: "30px", marginTop: "16px" }}>
          Save Settings
        </button>
      </form>
    </div>
  );
};
