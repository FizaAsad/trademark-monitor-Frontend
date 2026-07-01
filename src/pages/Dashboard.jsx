import { useState, useEffect, useMemo } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ── Summary card ──────────────────────────────────────────────────────────────
function SummaryCard({ label, count, color }) {
  return (
    <div style={{ ...styles.card, borderTop: `4px solid ${color}` }}>
      <p style={styles.cardLabel}>{label}</p>
      <p style={{ ...styles.cardCount, color }}>{count}</p>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
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

// ── Filter dropdown ───────────────────────────────────────────────────────────
function FilterSelect({ label, value, onChange, options }) {
  return (
    <div style={styles.filterGroup}>
      <label style={styles.filterLabel}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={styles.select}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────
function ActionButton({ label, onClick, color, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles.actionBtn,
        background: disabled ? "#F4F6F9" : color,
        color: disabled ? "#aaa" : "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [matches, setMatches]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [actionLoading, setActionLoading] = useState({}); // { "trademark-12": true }

  // ── Filters state ───────────────────────────────────────────────────────────
  const [filterSource,   setFilterSource]   = useState("all");
  const [filterKeyword,  setFilterKeyword]  = useState("all");
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo,   setFilterDateTo]   = useState("");

  // ── Fetch all matches ───────────────────────────────────────────────────────
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

  // ── PATCH status action ─────────────────────────────────────────────────────
  async function updateStatus(match, newStatus) {
    const key = `${match.category}-${match.id}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`${API}/api/matches/${match.category}/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("PATCH failed");
      // Update locally — no full refetch needed
      setMatches((prev) =>
        prev.map((m) =>
          m.id === match.id && m.category === match.category
            ? { ...m, status: newStatus, reviewed_at: new Date().toISOString() }
            : m
        )
      );
    } catch (err) {
      setError(`Failed to update status for "${match.match_name}". Try again.`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  }

  // ── Derived filter options from live data ───────────────────────────────────
  const keywordOptions = useMemo(() => {
    const unique = [...new Set(matches.map((m) => m.keyword).filter(Boolean))].sort();
    return [{ value: "all", label: "All Keywords" }, ...unique.map((k) => ({ value: k, label: k }))];
  }, [matches]);

  const sourceOptions = [
    { value: "all",         label: "All Sources"   },
    { value: "trademark",   label: "Trademark"     },
    { value: "domain",      label: "Domain"        },
    { value: "marketplace", label: "Marketplace"   },
    { value: "social",      label: "Social"        },
  ];

  const statusOptions = [
    { value: "all",       label: "All Statuses" },
    { value: "new",       label: "New"          },
    { value: "reviewed",  label: "Reviewed"     },
    { value: "dismissed", label: "Dismissed"    },
  ];

  // ── Client-side filtering ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (filterSource  !== "all" && m.category !== filterSource)  return false;
      if (filterKeyword !== "all" && m.keyword  !== filterKeyword) return false;
      if (filterStatus  !== "all" && m.status   !== filterStatus)  return false;
      if (filterDateFrom) {
        const found = new Date(m.date_found);
        if (found < new Date(filterDateFrom)) return false;
      }
      if (filterDateTo) {
        const found = new Date(m.date_found);
        if (found > new Date(filterDateTo + "T23:59:59")) return false;
      }
      return true;
    });
  }, [matches, filterSource, filterKeyword, filterStatus, filterDateFrom, filterDateTo]);

  // ── Summary counts (always from full unfiltered data) ───────────────────────
  const newMatches     = matches.filter((m) => m.status === "new");
  const trademarkNew   = newMatches.filter((m) => m.category === "trademark").length;
  const domainNew      = newMatches.filter((m) => m.category === "domain").length;
  const marketplaceNew = newMatches.filter((m) => m.category === "marketplace").length;

  const hasActiveFilters =
    filterSource !== "all" || filterKeyword !== "all" ||
    filterStatus !== "all" || filterDateFrom !== "" || filterDateTo !== "";

  function clearFilters() {
    setFilterSource("all");
    setFilterKeyword("all");
    setFilterStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  // ── Render ──────────────────────────────────────────────────────────────────
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
          ↻ Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={styles.errorBanner}>
          <span>⚠ {error}</span>
          <button onClick={() => setError("")} style={styles.errorClose}>✕</button>
        </div>
      )}

      {/* Summary cards — wired to live counts */}
      <div style={styles.cardRow}>
        <SummaryCard label="TOTAL NEW"          count={newMatches.length}  color="#B22222" />
        <SummaryCard label="TRADEMARK MATCHES"  count={trademarkNew}       color="#1B2A4A" />
        <SummaryCard label="DOMAIN MATCHES"     count={domainNew}          color="#F0A500" />
        <SummaryCard label="MARKETPLACE HITS"   count={marketplaceNew}     color="#1E7A4A" />
      </div>

      {/* Filters */}
      <div style={styles.filterBar}>
        <FilterSelect
          label="Source"
          value={filterSource}
          onChange={setFilterSource}
          options={sourceOptions}
        />
        <FilterSelect
          label="Keyword"
          value={filterKeyword}
          onChange={setFilterKeyword}
          options={keywordOptions}
        />
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Date From</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            style={styles.select}
          />
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Date To</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            style={styles.select}
          />
        </div>
        <FilterSelect
          label="Status"
          value={filterStatus}
          onChange={setFilterStatus}
          options={statusOptions}
        />
        {hasActiveFilters && (
          <div style={styles.filterGroup}>
            <label style={{ ...styles.filterLabel, opacity: 0 }}>_</label>
            <button onClick={clearFilters} style={styles.clearBtn}>
              ✕ Clear
            </button>
          </div>
        )}
      </div>

      {/* Matches table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <p style={styles.tableLabel}>
            {hasActiveFilters ? "FILTERED MATCHES" : "ALL MATCHES"}
          </p>
          <span style={styles.totalCount}>
            {hasActiveFilters
              ? `${filtered.length} of ${matches.length}`
              : `${matches.length} total`}
          </span>
        </div>

        {loading ? (
          <p style={styles.emptyMsg}>Loading matches...</p>
        ) : filtered.length === 0 ? (
          <p style={styles.emptyMsg}>
            {hasActiveFilters
              ? "No matches found for the selected filters."
              : "No matches found yet. Run a scan to start detecting threats."}
          </p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["Source", "Keyword", "Match Name", "Date Found", "Status", "Actions"].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => {
                  const key = `${m.category}-${m.id}`;
                  const busy = !!actionLoading[key];
                  return (
                    <tr key={key} style={{ background: i % 2 === 0 ? "#ffffff" : "#F4F6F9" }}>

                      <td style={styles.td}>
                        <SourceBadge source={m.source} category={m.category} />
                      </td>

                      <td style={{ ...styles.td, fontWeight: "600", color: "#1B2A4A" }}>
                        {m.keyword || "—"}
                      </td>

                      <td style={styles.td}>{m.match_name || "—"}</td>

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

                      <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                        <ActionButton
                          label={busy && m.status !== "reviewed" ? "..." : "✓ Reviewed"}
                          color="#1E7A4A"
                          disabled={busy || m.status === "reviewed"}
                          onClick={() => updateStatus(m, "reviewed")}
                        />
                        <span style={{ display: "inline-block", width: "6px" }} />
                        <ActionButton
                          label={busy && m.status !== "dismissed" ? "..." : "✕ Dismiss"}
                          color="#888888"
                          disabled={busy || m.status === "dismissed"}
                          onClick={() => updateStatus(m, "dismissed")}
                        />
                        {m.status !== "new" && (
                          <>
                            <span style={{ display: "inline-block", width: "6px" }} />
                            <ActionButton
                              label={busy && m.status === "new" ? "..." : "↺ New"}
                              color="#2E5FA3"
                              disabled={busy}
                              onClick={() => updateStatus(m, "new")}
                            />
                          </>
                        )}
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

// ── Styles ────────────────────────────────────────────────────────────────────
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
    marginBottom: "24px",
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
  filterBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    alignItems: "flex-end",
    background: "#fff",
    border: "1px solid #DDDDDD",
    borderRadius: "8px",
    padding: "16px 20px",
    marginBottom: "20px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    minWidth: "140px",
  },
  filterLabel: {
    fontSize: "11px",
    fontWeight: "bold",
    letterSpacing: "0.8px",
    color: "#888",
    textTransform: "uppercase",
  },
  select: {
    padding: "7px 10px",
    border: "1px solid #CCCCCC",
    borderRadius: "6px",
    fontSize: "13px",
    color: "#1B2A4A",
    background: "#F9FAFB",
    fontFamily: "Arial, sans-serif",
    cursor: "pointer",
    outline: "none",
  },
  clearBtn: {
    padding: "7px 14px",
    background: "#FDECEA",
    color: "#B22222",
    border: "1px solid #B22222",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "bold",
    cursor: "pointer",
    fontFamily: "Arial, sans-serif",
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
  actionBtn: {
    padding: "5px 12px",
    border: "none",
    borderRadius: "5px",
    fontSize: "12px",
    fontWeight: "bold",
    fontFamily: "Arial, sans-serif",
    transition: "opacity 0.15s",
  },
};