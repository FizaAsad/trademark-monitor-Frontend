import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const SCRAPERS = [
  { key: "euipo",       label: "EUIPO",            endpoint: "/api/test-euipo" },
  { key: "uspto",       label: "USPTO",            endpoint: "/api/test-uspto" },
  { key: "ipau",        label: "IP Australia",     endpoint: "/api/test-ipau" },
  { key: "iponz",       label: "IPONZ",            endpoint: "/api/test-iponz" },
  { key: "ukipo",       label: "UKIPO",            endpoint: "/api/test-ukipo" },
  { key: "cipo",        label: "CIPO (Canada)",    endpoint: "/api/test-cipo" },
  { key: "us_states",   label: "US States",        endpoint: "/api/test-us-states-v1" },
  { key: "domains",     label: "Domain Typos",     endpoint: "/api/test-domains" },
  { key: "marketplace", label: "Marketplace",      endpoint: "/api/test-marketplace" },
  { key: "social",      label: "Social Media",     endpoint: "/api/test-social" },
];

export default function ScanControl() {
  const [results,  setResults]  = useState({});
  const [running,  setRunning]  = useState({});
  const [runningAll, setRunningAll] = useState(false);

  async function runScraper(key, endpoint) {
    setRunning(prev => ({ ...prev, [key]: true }));
    setResults(prev => ({ ...prev, [key]: { status: "running" } }));
    try {
      const res  = await fetch(`${API}${endpoint}`);
      const data = await res.json();
      setResults(prev => ({ ...prev, [key]: { status: "done", message: data.message || JSON.stringify(data) } }));
    } catch (err) {
      setResults(prev => ({ ...prev, [key]: { status: "error", message: err.message } }));
    } finally {
      setRunning(prev => ({ ...prev, [key]: false }));
    }
  }

  async function runAll() {
    setRunningAll(true);
    setResults({});
    for (const s of SCRAPERS) {
      await runScraper(s.key, s.endpoint);
    }
    setRunningAll(false);
  }

  function statusColor(status) {
    if (status === "running") return "#2E5FA3";
    if (status === "done")    return "#1E7A4A";
    if (status === "error")   return "#B22222";
    return "#888";
  }

  function statusLabel(status) {
    if (status === "running") return "Running...";
    if (status === "done")    return "Done";
    if (status === "error")   return "Error";
    return "";
  }

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Scan Control</h1>
        <p style={styles.subtitle}>Manually trigger scrapers to find new trademark matches.</p>
      </div>

      {/* Run All button */}
      <div style={styles.runAllRow}>
        <button
          onClick={runAll}
          disabled={runningAll}
          style={{ ...styles.runAllBtn, background: runningAll ? "#888" : "#1B2A4A", cursor: runningAll ? "not-allowed" : "pointer" }}
        >
          {runningAll ? "Running All Scrapers..." : "▶ Run All Scrapers"}
        </button>
        {runningAll && <span style={styles.runningHint}>This may take 5–10 minutes</span>}
      </div>

      {/* Scraper list */}
      <div style={styles.grid}>
        {SCRAPERS.map(({ key, label, endpoint }) => {
          const result = results[key];
          const isRunning = running[key];
          return (
            <div key={key} style={styles.card}>
              <div style={styles.cardTop}>
                <span style={styles.cardLabel}>{label}</span>
                {result && (
                  <span style={{ ...styles.badge, background: statusColor(result.status) }}>
                    {statusLabel(result.status)}
                  </span>
                )}
              </div>
              {result?.message && (
                <p style={{ ...styles.cardMsg, color: result.status === "error" ? "#B22222" : "#444" }}>
                  {result.message}
                </p>
              )}
              <button
                onClick={() => runScraper(key, endpoint)}
                disabled={isRunning || runningAll}
                style={{
                  ...styles.runBtn,
                  background: isRunning || runningAll ? "#ccc" : "#2E5FA3",
                  cursor: isRunning || runningAll ? "not-allowed" : "pointer",
                }}
              >
                {isRunning ? "Running..." : "Run"}
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}

const styles = {
  page:        { fontFamily: "Arial, sans-serif", maxWidth: "900px", margin: "0 auto", padding: "32px 24px", color: "#111" },
  header:      { marginBottom: "28px" },
  title:       { fontSize: "26px", fontWeight: "bold", color: "#1B2A4A", margin: "0 0 6px 0" },
  subtitle:    { fontSize: "14px", color: "#555", margin: 0 },
  runAllRow:   { display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" },
  runAllBtn:   { padding: "12px 28px", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "bold", fontFamily: "Arial, sans-serif" },
  runningHint: { fontSize: "13px", color: "#888" },
  grid:        { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" },
  card:        { background: "#fff", border: "1px solid #DDD", borderRadius: "8px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  cardTop:     { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" },
  cardLabel:   { fontSize: "14px", fontWeight: "bold", color: "#1B2A4A" },
  badge:       { fontSize: "11px", fontWeight: "bold", color: "#fff", padding: "2px 8px", borderRadius: "10px" },
  cardMsg:     { fontSize: "12px", marginBottom: "12px", lineHeight: "1.5", wordBreak: "break-word" },
  runBtn:      { padding: "7px 18px", color: "#fff", border: "none", borderRadius: "5px", fontSize: "13px", fontWeight: "bold", fontFamily: "Arial, sans-serif" },
};
