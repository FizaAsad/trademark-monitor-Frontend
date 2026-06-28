



import { useState, useEffect } from "react";

const API = "http://localhost:5000";

// ── Summary card component ───────────────────────────────────────────────────
function SummaryCard({ label, count, color }) {
  return (
    <div style={{ ...styles.card, borderTop: `4px solid ${color}` }}>
      <p style={styles.cardLabel}>{label}</p>
      <p style={{ ...styles.cardCount, color }}>{count}</p>
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    new:       { bg: "#FDECEA", color: "#B22222", label: "New" },
    reviewed:  { bg: "#D4EDDA", color: "#1E7A4A", label: "Reviewed" },
    dismissed: { bg: "#F4F6F9", color: "#888888", label: "Dismissed" },
  };
  const s = map[status] || map["new"];
  return (
    <span style={{ background: s.bg, color: s.color, padding: "3px 10px",
      borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
      {s.label}
    </span>
  );
}

// ── Source badge ──────────────────────────────────────────────────────────────
function SourceBadge({ source, category }) {
  const colorMap = {
    trademark:   { bg: "#D6E4F0", color: "#1B2A4A" },
    domain:      { bg: "#FFF3D0", color: "#8B6000" },
    marketplace: { bg: "#D4EDDA", color: "#1E7A4A" },
    social:      { bg: "#F3E8FF", color: "#6B21A8" },
  };
  const c = colorMap[category] || { bg: "#F4F6F9", color: "#555" };
  return (
    <span style={{ background: c.bg, color: c.color, padding: "3px 10px",
      borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
      {source}
    </span>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [matches, setMatches]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  async function fetchMatches() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/matches`);
      if (!res.ok) throw new Error("Server returned " + res.status);
      const data = await res.json();
      setMatches(data);
    } catch (err) {
      setError("Could not load matches. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMatches(); }, []);

  // ── Summary counts ──────────────────────────────────────────────────────
  const newMatches       = matches.filter((m) => m.status === "new");
  const trademarkNew     = newMatches.filter((m) => m.category === "trademark").length;
  const domainNew        = newMatches.filter((m) => m.category === "domain").length;
  const marketplaceNew   = newMatches.filter((m) => m.category === "marketplace").length;

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Threat Dashboard</h1>
          <p style={styles.subtitle}>
            All brand threats detected across trademark registries, domains,
            marketplaces, and social platforms.
          </p>
        </div>
        <button onClick={fetchMatches} style={styles.refreshBtn}>
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={styles.errorBanner}>
          <span>⚠ {error}</span>
          <button onClick={() => setError("")} style={styles.errorClose}>✕</button>
        </div>
      )}

      {/* Summary cards */}
      <div style={styles.cardRow}>
        <SummaryCard label="TOTAL NEW"          count={newMatches.length}  color="#B22222" />
        <SummaryCard label="TRADEMARK MATCHES"  count={trademarkNew}       color="#1B2A4A" />
        <SummaryCard label="DOMAIN MATCHES"     count={domainNew}          color="#F0A500" />
        <SummaryCard label="MARKETPLACE HITS"   count={marketplaceNew}     color="#1E7A4A" />
      </div>

      {/* Matches table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <p style={styles.tableLabel}>ALL MATCHES</p>
          <span style={styles.totalCount}>{matches.length} total</span>
        </div>

        {loading ? (
          <p style={styles.emptyMsg}>Loading matches...</p>
        ) : matches.length === 0 ? (
          <p style={styles.emptyMsg}>
            No matches found yet. Run a scan to start detecting threats.
          </p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["Source", "Keyword", "Match Name", "Date Found", "Status"].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matches.map((m, i) => (
                  <tr key={`${m.category}-${m.id}`}
                    style={{ background: i % 2 === 0 ? "#ffffff" : "#F4F6F9" }}>

                    <td style={styles.td}>
                      <SourceBadge source={m.source} category={m.category} />
                    </td>

                    <td style={{ ...styles.td, fontWeight: "600", color: "#1B2A4A" }}>
                      {m.keyword || "—"}
                    </td>

                    <td style={styles.td}>
                      {m.match_name || "—"}
                    </td>

                    <td style={{ ...styles.td, color: "#777", fontSize: "13px" }}>
                      {m.date_found
                        ? new Date(m.date_found).toLocaleDateString("en-GB", {
                            day: "2-digit", month: "short", year: "numeric",
                          })
                        : "—"}
                    </td>

                    <td style={styles.td}>
                      <StatusBadge status={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    fontFamily: "Arial, sans-serif",
    maxWidth: "1100px",
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
  refreshBtn: {
    padding: "9px 20px",
    background: "#1B2A4A",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "bold",
    cursor: "pointer",
    fontFamily: "Arial, sans-serif",
    whiteSpace: "nowrap",
  },
  errorBanner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#FDECEA",
    border: "1px solid #B22222",
    borderRadius: "6px",
    padding: "10px 16px",
    marginBottom: "20px",
    color: "#B22222",
    fontSize: "14px",
  },
  errorClose: {
    background: "none",
    border: "none",
    color: "#B22222",
    cursor: "pointer",
    fontSize: "16px",
  },
  cardRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "28px",
  },
  card: {
    background: "#fff",
    border: "1px solid #DDDDDD",
    borderRadius: "8px",
    padding: "20px 24px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  cardLabel: {
    fontSize: "11px",
    fontWeight: "bold",
    letterSpacing: "1px",
    color: "#888",
    margin: "0 0 10px 0",
  },
  cardCount: {
    fontSize: "36px",
    fontWeight: "bold",
    margin: 0,
  },
  tableCard: {
    background: "#fff",
    border: "1px solid #DDDDDD",
    borderRadius: "8px",
    padding: "24px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  tableLabel: {
    fontSize: "11px",
    fontWeight: "bold",
    letterSpacing: "1px",
    color: "#2E5FA3",
    margin: 0,
  },
  totalCount: {
    fontSize: "12px",
    color: "#888",
    background: "#F4F6F9",
    padding: "3px 10px",
    borderRadius: "12px",
  },
  tableWrapper: {
    overflowX: "auto",
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
  emptyMsg: {
    color: "#888",
    fontSize: "14px",
    textAlign: "center",
    padding: "40px 0",
  },
};