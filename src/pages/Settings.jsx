import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Settings() {
  const [email,   setEmail]   = useState("");
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [message, setMessage] = useState(null); // { type: "success"|"error", text }

  // ── Load existing settings on mount ─────────────────────────────────────────
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch(`${API}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setEmail(data.email || "");
            setEnabled(data.alert_enabled ?? true);
          }
        }
      } catch (err) {
        // No existing settings yet — defaults are fine
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // ── Save settings ────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!email.trim()) {
      setMessage({ type: "error", text: "Please enter a valid email address." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMessage({ type: "error", text: "Email address format is invalid." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`${API}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), alerts_enabled: enabled }),
      });
      if (!res.ok) throw new Error("Server returned " + res.status);
      setMessage({ type: "success", text: "Settings saved successfully." });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save settings. Is the backend running?" });
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.page}>
        <p style={styles.loadingMsg}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Alert Settings</h1>
        <p style={styles.subtitle}>
          Configure where and when brand threat alerts are sent.
        </p>
      </div>

      {/* Settings card */}
      <div style={styles.card}>

        {/* Email input */}
        <div style={styles.field}>
          <label style={styles.label}>ALERT EMAIL</label>
          <p style={styles.hint}>New threat alerts will be sent to this address after each scan.</p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. you@company.com"
            style={styles.input}
          />
        </div>

        <div style={styles.divider} />

        {/* Toggle */}
        <div style={styles.field}>
          <label style={styles.label}>EMAIL ALERTS</label>
          <p style={styles.hint}>Enable or disable automatic email alerts after scans.</p>
          <div
            style={styles.toggleRow}
            onClick={() => setEnabled((prev) => !prev)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setEnabled((prev) => !prev)}
          >
            <div style={{ ...styles.track, background: enabled ? "#1E7A4A" : "#ccc" }}>
              <div style={{ ...styles.thumb, transform: enabled ? "translateX(22px)" : "translateX(2px)" }} />
            </div>
            <span style={{ ...styles.toggleLabel, color: enabled ? "#1E7A4A" : "#888" }}>
              {enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Status message */}
        {message && (
          <div style={{
            ...styles.messageBanner,
            background: message.type === "success" ? "#D4EDDA" : "#FDECEA",
            border: `1px solid ${message.type === "success" ? "#1E7A4A" : "#B22222"}`,
            color: message.type === "success" ? "#1E7A4A" : "#B22222",
          }}>
            {message.type === "success" ? "✓" : "⚠"} {message.text}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...styles.saveBtn,
            background: saving ? "#888" : "#1B2A4A",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {/* Info box */}
      <div style={styles.infoBox}>
        <p style={styles.infoTitle}>ℹ How alerts work</p>
        <ul style={styles.infoList}>
          <li>After each scan completes, the system checks for new matches across all sources.</li>
          <li>If new matches are found and alerts are enabled, an email is sent to the address above.</li>
          <li>The email includes a full table of new matches and a link to the dashboard.</li>
          <li>If no new matches are found, no email is sent.</li>
        </ul>
      </div>

    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page:          { fontFamily: "Arial, sans-serif", maxWidth: "700px", margin: "0 auto", padding: "32px 24px", color: "#111" },
  header:        { marginBottom: "28px" },
  title:         { fontSize: "26px", fontWeight: "bold", color: "#1B2A4A", margin: "0 0 6px 0" },
  subtitle:      { fontSize: "14px", color: "#555", margin: 0 },
  loadingMsg:    { color: "#888", fontSize: "14px", textAlign: "center", padding: "60px 0" },
  card:          { background: "#fff", border: "1px solid #DDDDDD", borderRadius: "8px", padding: "28px 32px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: "20px" },
  field:         { marginBottom: "4px" },
  label:         { fontSize: "11px", fontWeight: "bold", letterSpacing: "1px", color: "#888", display: "block", marginBottom: "6px" },
  hint:          { fontSize: "13px", color: "#777", margin: "0 0 12px 0" },
  input:         { width: "100%", padding: "10px 14px", border: "1px solid #CCCCCC", borderRadius: "6px", fontSize: "14px", color: "#1B2A4A", background: "#F9FAFB", fontFamily: "Arial, sans-serif", outline: "none", boxSizing: "border-box" },
  divider:       { height: "1px", background: "#EEEEEE", margin: "20px 0" },
  toggleRow:     { display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", userSelect: "none" },
  track:         { width: "46px", height: "24px", borderRadius: "12px", position: "relative", transition: "background 0.2s", flexShrink: 0 },
  thumb:         { position: "absolute", top: "2px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.3)", transition: "transform 0.2s" },
  toggleLabel:   { fontSize: "14px", fontWeight: "bold" },
  messageBanner: { padding: "10px 14px", borderRadius: "6px", fontSize: "13px", marginBottom: "16px" },
  saveBtn:       { padding: "11px 28px", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "bold", fontFamily: "Arial, sans-serif" },
  infoBox:       { background: "#F4F6F9", border: "1px solid #DDDDDD", borderRadius: "8px", padding: "20px 24px" },
  infoTitle:     { fontSize: "13px", fontWeight: "bold", color: "#1B2A4A", margin: "0 0 10px 0" },
  infoList:      { fontSize: "13px", color: "#555", margin: 0, paddingLeft: "20px", lineHeight: "1.8" },
};