import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:5000";

const SCRAPERS = [
  { key: "euipo",         label: "EU Trademark",      subtitle: "EUIPO",          endpoint: "/api/test-euipo",         category: "trademark"    },
  { key: "uspto",         label: "US Trademark",       subtitle: "USPTO",          endpoint: "/api/test-uspto",         category: "trademark"    },
  { key: "ukipo",         label: "UK Trademark",       subtitle: "UKIPO",          endpoint: "/api/test-ukipo",         category: "trademark"    },
  { key: "cipo",          label: "Canada",             subtitle: "CIPO",           endpoint: "/api/test-cipo",          category: "trademark"    },
  { key: "ipau",          label: "IP Australia",       subtitle: "IP Australia",   endpoint: "/api/test-ipau",          category: "trademark"    },
  { key: "iponz",         label: "New Zealand",        subtitle: "IPONZ",          endpoint: "/api/test-iponz",         category: "trademark"    },
  { key: "us-states",     label: "US States",          subtitle: "State Registries", endpoint: "/api/test-us-states",  category: "trademark"    },
  { key: "us-states-v1",  label: "US States (Alt)",    subtitle: "State v2",       endpoint: "/api/test-us-states-v1", category: "trademark"    },
  { key: "domains",       label: "Domain Typos",       subtitle: "DNS Check",      endpoint: "/api/test-domains",      category: "domain"       },
  { key: "marketplace",   label: "Marketplace",        subtitle: "Amazon / eBay / Etsy", endpoint: "/api/test-marketplace", category: "marketplace" },
];

const CATEGORY_COLORS = {
  trademark:   { bg: "#D6E4F0", color: "#1B2A4A" },
  domain:      { bg: "#FFF3D0", color: "#8B6000" },
  marketplace: { bg: "#D4EDDA", color: "#1E7A4A" },
};

// idle | running | done | error
function ScanCard({ scraper, state, result, onRun }) {
  const cat = CATEGORY_COLORS[scraper.category] || { bg: "#F4F6F9", color: "#555" };
  const isRunning = state === "running";

  const borderColor =
    state === "done"    ? "#1E7A4A" :
    state === "error"   ? "#B22222" :
    state === "running" ? "#2E5FA3" :
    "#DDDDDD";

  return (
    <div style={{ ...styles.scanCard, borderLeft: `4px solid ${borderColor}` }}>
      <div style={styles.scanCardTop}>
        <div>
          <span style={{ ...styles.categoryBadge, background: cat.bg, color: cat.color }}>
            {scraper.category}
          </span>
          <p style={styles.scanCardTitle}>{scraper.label}</p>
          <p style={styles.scanCardSub}>{scraper.subtitle}</p>
        </div>
        <button
          onClick={() => onRun(scraper)}
          disabled={isRunning}
          style={{
            ...styles.runBtn,
            background: isRunning ? "#ccc" : "#1B2A4A",
            cursor: isRunning ? "not-allowed" : "pointer",
          }}
        >
          {isRunning ? "Running..." : "▶ Run"}
        </button>
      </div>

      {result && (
        <div style={{
          ...styles.scanResult,
          background: state === "error" ? "#FDECEA" : "#F0FFF4",
          color:      state === "error" ? "#B22222" : "#1E7A4A",
          borderTop:  `1px solid ${state === "error" ? "#f5c6c6" : "#b2dfca"}`,
        }}>
          {state === "error" ? "✕ " : "✓ "}{result}
        </div>
      )}
    </div>
  );
}

function duration(started, completed) {
  if (!started || !completed) return "—";
  const ms = new Date(completed) - new Date(started);
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

export default function Settings() {
  const [scanStates,  setScanStates]  = useState({});   // { key: "idle"|"running"|"done"|"error" }
  const [scanResults, setScanResults] = useState({});   // { key: "message" }
  const [logs,        setLogs]        = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError,   setLogsError]   = useState("");

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError("");
    try {
      const res = await fetch(`${API}/api/scan-logs?limit=50`);
      if (!res.ok) throw new Error("Server returned " + res.status);
      setLogs(await res.json());
    } catch (err) {
      setLogsError("Could not load scan logs. Is the backend running?");
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  async function runScan(scraper) {
    setScanStates(p => ({ ...p, [scraper.key]: "running" }));
    setScanResults(p => ({ ...p, [scraper.key]: "" }));
    try {
      const res = await fetch(`${API}${scraper.endpoint}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setScanStates(p  => ({ ...p,  [scraper.key]: "done"  }));
      setScanResults(p => ({ ...p,  [scraper.key]: data.message || "Scan complete" }));
      fetchLogs();
    } catch (err) {
      setScanStates(p  => ({ ...p,  [scraper.key]: "error" }));
      setScanResults(p => ({ ...p,  [scraper.key]: err.message }));
    }
  }

  async function runAllScans() {
    for (const scraper of SCRAPERS) {
      await runScan(scraper);
    }
  }

  const anyRunning = Object.values(scanStates).some(s => s === "running");

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Scan Control</h1>
          <p style={styles.subtitle}>
            Manually trigger any scraper and review the scan history below.
          </p>
        </div>
        <button
          onClick={runAllScans}
          disabled={anyRunning}
          style={{
            ...styles.runAllBtn,
            opacity: anyRunning ? 0.6 : 1,
            cursor:  anyRunning ? "not-allowed" : "pointer",
          }}
        >
          {anyRunning ? "Running..." : "▶ Run All Scans"}
        </button>
      </div>

      {/* Scraper grid */}
      <div style={styles.sectionLabel}>SCRAPERS ({SCRAPERS.length})</div>
      <div style={styles.grid}>
        {SCRAPERS.map(s => (
          <ScanCard
            key={s.key}
            scraper={s}
            state={scanStates[s.key]  || "idle"}
            result={scanResults[s.key] || ""}
            onRun={runScan}
          />
        ))}
      </div>

      {/* Scan logs */}
      <div style={styles.logsCard}>
        <div style={styles.logsHeader}>
          <p style={styles.sectionLabel}>SCAN LOGS</p>
          <button onClick={fetchLogs} style={styles.refreshBtn}>↻ Refresh</button>
        </div>

        {logsError && (
          <div style={styles.errorBanner}>⚠ {logsError}</div>
        )}

        {logsLoading ? (
          <p style={styles.emptyMsg}>Loading logs...</p>
        ) : logs.length === 0 ? (
          <p style={styles.emptyMsg}>No scan logs yet. Run a scan above to populate this table.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["Scan Type", "Started", "Duration", "Matches Found", "Status", "Error"].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const done      = !!log.completed_at;
                  const hasError  = !!log.error_log;
                  const statusLabel = hasError ? "Error" : done ? "Completed" : "Running";
                  const statusStyle = hasError
                    ? { bg: "#FDECEA", color: "#B22222" }
                    : done
                    ? { bg: "#D4EDDA", color: "#1E7A4A" }
                    : { bg: "#D6E4F0", color: "#1B2A4A" };

                  return (
                    <tr key={log.id} style={{ background: i % 2 === 0 ? "#fff" : "#F4F6F9" }}>
                      <td style={{ ...styles.td, fontWeight: "600", color: "#1B2A4A" }}>
                        {log.scan_type || "—"}
                      </td>
                      <td style={{ ...styles.td, color: "#555", fontSize: "13px" }}>
                        {log.started_at
                          ? new Date(log.started_at).toLocaleString("en-GB", {
                              day: "2-digit", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td style={{ ...styles.td, color: "#555", fontSize: "13px" }}>
                        {duration(log.started_at, log.completed_at)}
                      </td>
                      <td style={{ ...styles.td, textAlign: "center", fontWeight: "bold", color: "#1B2A4A" }}>
                        {log.total_found ?? "—"}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          background: statusStyle.bg,
                          color:      statusStyle.color,
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}>
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ ...styles.td, color: "#B22222", fontSize: "12px", maxWidth: "240px", wordBreak: "break-word" }}>
                        {log.error_log || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "Arial, sans-serif",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "32px 24px",
    color: "#111",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "28px",
  },
  title: {
    fontSize: "26px",
    fontWeight: "bold",
    color: "#1B2A4A",
    margin: "0 0 6px 0",
  },
  subtitle: {
    fontSize: "14px",
    color: "#555",
    margin: 0,
  },
  runAllBtn: {
    padding: "10px 22px",
    background: "#1B2A4A",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "bold",
    fontFamily: "Arial, sans-serif",
    whiteSpace: "nowrap",
  },
  sectionLabel: {
    fontSize: "11px",
    fontWeight: "bold",
    letterSpacing: "1px",
    color: "#2E5FA3",
    marginBottom: "14px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "16px",
    marginBottom: "32px",
  },
  scanCard: {
    background: "#fff",
    border: "1px solid #DDDDDD",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  scanCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 18px",
    gap: "12px",
  },
  categoryBadge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "10px",
    fontSize: "10px",
    fontWeight: "bold",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    marginBottom: "6px",
  },
  scanCardTitle: {
    fontSize: "15px",
    fontWeight: "bold",
    color: "#1B2A4A",
    margin: "0 0 2px 0",
  },
  scanCardSub: {
    fontSize: "12px",
    color: "#888",
    margin: 0,
  },
  runBtn: {
    padding: "8px 16px",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "bold",
    fontFamily: "Arial, sans-serif",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  scanResult: {
    padding: "8px 18px",
    fontSize: "12px",
    fontWeight: "500",
  },
  logsCard: {
    background: "#fff",
    border: "1px solid #DDDDDD",
    borderRadius: "8px",
    padding: "24px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  logsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  refreshBtn: {
    padding: "6px 14px",
    background: "#F4F6F9",
    color: "#1B2A4A",
    border: "1px solid #DDDDDD",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "bold",
    cursor: "pointer",
    fontFamily: "Arial, sans-serif",
  },
  errorBanner: {
    background: "#FDECEA",
    border: "1px solid #B22222",
    borderRadius: "6px",
    padding: "10px 16px",
    marginBottom: "16px",
    color: "#B22222",
    fontSize: "14px",
  },
  emptyMsg: {
    color: "#888",
    fontSize: "14px",
    textAlign: "center",
    padding: "40px 0",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },
  th: {
    textAlign: "left",
    padding: "10px 14px",
    background: "#1B2A4A",
    color: "#fff",
    fontSize: "12px",
    fontWeight: "bold",
    letterSpacing: "0.5px",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px 14px",
    verticalAlign: "middle",
    borderBottom: "1px solid #EEEEEE",
  },
};
