import React, { useState } from "react";
import { FolderOpen, FileText } from "lucide-react";
import Logo from "./Logo";
import { api } from "../utils/api";
import type { AppConfig } from "../utils/api";

interface WelcomeScreenProps {
  onConfigSaved: (config: AppConfig) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onConfigSaved }) => {
  const [loading, setLoading] = useState(false);

  const handleOpenDocument = async () => {
    setLoading(true);
    try {
      const resp = await api.pickFile();
      if (resp.path) {
        const config = await api.getConfig();
        onConfigSaved(config);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChooseLibrary = async () => {
    setLoading(true);
    try {
      const resp = await api.pickFolder();
      if (resp.path) {
        const config = await api.getConfig();
        onConfigSaved(config);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="welcome-container">
      <div className="welcome-card" style={{ maxWidth: "480px", padding: "48px 40px", textAlign: "left", gap: "32px" }}>
        
        {/* Header */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <Logo size={28} className="logo-accent" />
            <h1 style={{ fontSize: "28px", margin: 0, fontWeight: "700" }}>
              Welcome to Author <span className="logo-accent">Voice</span>
            </h1>
          </div>
          <p style={{ fontSize: "16px", color: "var(--text-secondary)", margin: 0 }}>
            Turn any PDF into an audiobook.
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "rgba(var(--accent-rgb), 0.15)", color: "var(--accent-color)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "14px", flexShrink: 0 }}>1</div>
            <span style={{ fontSize: "15px", color: "var(--text-primary)" }}>Open your first document.</span>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "rgba(var(--accent-rgb), 0.15)", color: "var(--accent-color)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "14px", flexShrink: 0 }}>2</div>
            <span style={{ fontSize: "15px", color: "var(--text-primary)" }}>Choose a voice.</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "rgba(var(--accent-rgb), 0.15)", color: "var(--accent-color)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "14px", flexShrink: 0 }}>3</div>
            <span style={{ fontSize: "15px", color: "var(--text-primary)" }}>Press Play.</span>
          </div>
        </div>

        <p style={{ margin: 0, fontStyle: "italic", color: "var(--text-muted)", fontSize: "14px" }}>
          You're ready to go.
        </p>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
          <button 
            className="btn btn-primary" 
            style={{ width: "100%", padding: "14px", fontSize: "15px", justifyContent: "center" }}
            onClick={handleOpenDocument}
            disabled={loading}
          >
            <FileText size={18} />
            {loading ? "Loading..." : "Open Document"}
          </button>
          
          <button 
            className="btn btn-secondary" 
            style={{ width: "100%", padding: "14px", fontSize: "15px", justifyContent: "center" }}
            onClick={handleChooseLibrary}
            disabled={loading}
          >
            <FolderOpen size={18} />
            {loading ? "Loading..." : "Choose Library Folder"}
          </button>
        </div>
        
      </div>
    </div>
  );
};
