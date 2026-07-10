import { useState, useEffect, useMemo, useRef } from "react";

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

// PDF helpers
function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function formatReportDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function escapePdfText(value) {
  return String(value ?? "-")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function splitLine(text, maxLength = 105) {
  const words = String(text || "-").split(/\s+/);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maxLength) {
      line = next;
      return;
    }
    if (line) lines.push(line);
    line = word.length > maxLength ? `${word.slice(0, maxLength - 3)}...` : word;
  });

  if (line) lines.push(line);
  return lines;
}

function createClientReportPdf({ rows, summary, filters }) {
  const today = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const colors = {
    navy: "0.106 0.165 0.290",
    red: "0.698 0.133 0.133",
    gold: "0.941 0.647 0.000",
    green: "0.118 0.478 0.290",
    blue: "0.180 0.373 0.639",
    paleRed: "0.992 0.925 0.918",
    paleGold: "1.000 0.953 0.816",
    paleGreen: "0.831 0.929 0.855",
    paleBlue: "0.839 0.894 0.941",
    light: "0.957 0.965 0.976",
    border: "0.835 0.835 0.835",
    text: "0.067 0.067 0.067",
    muted: "0.467 0.467 0.467",
    white: "1 1 1",
  };

  const activeFilters = [
    filters.source !== "all" ? `Source: ${filters.source}` : null,
    filters.keyword !== "all" ? `Keyword: ${filters.keyword}` : null,
    filters.status !== "all" ? `Status: ${filters.status}` : null,
    filters.dateFrom ? `From: ${filters.dateFrom}` : null,
    filters.dateTo ? `To: ${filters.dateTo}` : null,
  ].filter(Boolean);

  const pages = [];
  let commands = [];
  let y = 0;

  const rect = (x, yPos, width, height, color) => {
    commands.push(`${color} rg ${x} ${yPos} ${width} ${height} re f`);
  };

  const strokeRect = (x, yPos, width, height, color) => {
    commands.push(`${color} RG ${x} ${yPos} ${width} ${height} re S`);
  };

  const text = (value, x, yPos, size = 10, font = "F1", color = colors.text) => {
    commands.push(`${color} rg BT /${font} ${size} Tf ${x} ${yPos} Td (${escapePdfText(value)}) Tj ET`);
  };

  const addHeader = (pageNumber) => {
    rect(0, 0, 612, 792, colors.white);
    rect(0, 748, 612, 44, colors.navy);
    rect(40, 704, 532, 34, colors.light);
    text("GoBeagleGo", 40, 760, 15, "F2", colors.white);
    text("Threat Dashboard Report", 230, 760, 18, "F2", colors.white);
    text(`Generated: ${today}`, 420, 722, 9, "F1", colors.muted);
    text(`Page ${pageNumber}`, 520, 34, 9, "F1", colors.muted);
    y = 682;
  };

  const newPage = () => {
    if (commands.length) pages.push(commands.join("\n"));
    commands = [];
    addHeader(pages.length + 1);
  };

  const ensureSpace = (height) => {
    if (y - height < 56) newPage();
  };

  const drawSummaryCard = (x, label, count, accent, fill) => {
    rect(x, y - 72, 122, 72, fill);
    rect(x, y - 8, 122, 8, accent);
    strokeRect(x, y - 72, 122, 72, colors.border);
    text(label, x + 12, y - 28, 8, "F2", colors.muted);
    text(String(count), x + 12, y - 58, 24, "F2", accent);
  };

  const drawTableHeader = () => {
    ensureSpace(36);
    rect(40, y - 22, 532, 22, colors.navy);
    text("SOURCE", 48, y - 15, 8, "F2", colors.white);
    text("KEYWORD", 118, y - 15, 8, "F2", colors.white);
    text("MATCH NAME", 190, y - 15, 8, "F2", colors.white);
    text("DATE", 455, y - 15, 8, "F2", colors.white);
    text("STATUS", 520, y - 15, 8, "F2", colors.white);
    y -= 30;
  };

  newPage();
  text("All brand threats detected across trademark registries, domains, marketplaces, and social platforms.", 40, y, 10, "F1", colors.text);
  y -= 24;
  text(`Filters: ${activeFilters.length ? activeFilters.join("; ") : "None"}`, 40, y, 9, "F1", colors.muted);
  text(`Exported rows: ${rows.length}`, 470, y, 9, "F2", colors.blue);
  y -= 28;

  drawSummaryCard(40, "TOTAL NEW", summary.totalNew, colors.red, colors.paleRed);
  drawSummaryCard(176, "TRADEMARK", summary.trademarkNew, colors.navy, colors.paleBlue);
  drawSummaryCard(312, "DOMAIN", summary.domainNew, colors.gold, colors.paleGold);
  drawSummaryCard(448, "MARKETPLACE", summary.marketplaceNew, colors.green, colors.paleGreen);
  y -= 100;

  drawTableHeader();

  if (!rows.length) {
    text("No matches found for the selected filters.", 48, y, 10, "F1", colors.muted);
  } else {
    rows.forEach((match, index) => {
      const nameLines = splitLine(match.match_name || "-", 48).slice(0, 3);
      const rowHeight = Math.max(30, 14 + nameLines.length * 11);
      ensureSpace(rowHeight + 8);
      if (y > 650 || y < 90) drawTableHeader();

      rect(40, y - rowHeight + 6, 532, rowHeight, index % 2 === 0 ? colors.white : colors.light);
      strokeRect(40, y - rowHeight + 6, 532, rowHeight, colors.border);
      text(match.source || match.category || "-", 48, y - 10, 8, "F2", colors.navy);
      text(match.keyword || "-", 118, y - 10, 8, "F1", colors.text);
      nameLines.forEach((line, lineIndex) => {
        text(line, 190, y - 10 - lineIndex * 11, 8, "F1", colors.text);
      });
      text(formatReportDate(match.date_found), 455, y - 10, 8, "F1", colors.muted);
      text(match.status || "-", 520, y - 10, 8, "F2", match.status === "new" ? colors.red : colors.green);
      y -= rowHeight;
    });
  }

  if (commands.length) pages.push(commands.join("\n"));

  const objects = [];
  const pageRefs = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };

  addObject("<< /Type /Catalog /Pages 2 0 R >>");
  addObject("");
  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  pages.forEach((content) => {
    const contentId = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pageRefs.push(`${pageId} 0 R`);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pageRefs.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

// Main Dashboard
export default function Dashboard() {
  const [matches, setMatches]             = useState([]);
  const [keywords, setKeywords]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [actionLoading, setActionLoading] = useState({});
  const [pdfLoading, setPdfLoading]       = useState(false);
  const [newAlert, setNewAlert]           = useState(null);
  const pollRef                           = useRef(null);

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
      const [matchRes, kwRes] = await Promise.all([
        fetch(`${API}/api/matches`),
        fetch(`${API}/api/keywords`),
      ]);
      if (!matchRes.ok) throw new Error("Server returned " + matchRes.status);
      const data = await matchRes.json();
      setMatches(data);
      if (kwRes.ok) {
        const kwData = await kwRes.json();
        setKeywords(kwData.map(k => k.term).filter(Boolean));
      }
    } catch (err) {
      setError("Could not load matches. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMatches();

    // Poll every 60s for new matches
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/matches`);
        if (!res.ok) return;
        const data = await res.json();
        const lastSeen = parseInt(localStorage.getItem("gbg_last_seen_count") || "0", 10);
        const newCount = data.filter(m => m.status === "new").length;
        if (newCount > lastSeen) {
          setNewAlert(newCount - lastSeen);
          setMatches(data);
        }
      } catch (_) {}
    }, 60000);

    return () => clearInterval(pollRef.current);
  }, []);

  function dismissAlert() {
    const newCount = matches.filter(m => m.status === "new").length;
    localStorage.setItem("gbg_last_seen_count", String(newCount));
    setNewAlert(null);
  }

  // ── PDF export ──────────────────────────────────────────────────────────────
  function handleExportPDF() {
    setPdfLoading(true);
    setError("");
    const filename = `trademark-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    const reportPayload = {
      matches: filtered,
      summary: {
        totalNew: newMatches.length,
        trademarkNew,
        domainNew,
        marketplaceNew,
      },
      filters: {
        source: filterSource,
        keyword: filterKeyword,
        status: filterStatus,
        dateFrom: filterDateFrom,
        dateTo: filterDateTo,
      },
    };

    try {
      const blob = createClientReportPdf({
        rows: reportPayload.matches,
        summary: reportPayload.summary,
        filters: reportPayload.filters,
      });
      downloadBlob(blob, filename);
    } catch (err) {
      setError("PDF export failed: " + err.message);
    } finally {
      setPdfLoading(false);
    }
  }

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
    const fromMatches = matches.map((m) => m.keyword).filter(Boolean);
    const unique = [...new Set([...keywords, ...fromMatches])].sort();
    return [{ value: "all", label: "All Keywords" }, ...unique.map((k) => ({ value: k, label: k }))];
  }, [matches, keywords]);

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
    <div className="page-shell dashboard-page" style={styles.page}>

      {/* Header */}
      <div className="page-header dashboard-header" style={styles.header}>
        <div>
          <h1 style={styles.title}>Threat Dashboard</h1>
          <p style={styles.subtitle}>
            All brand threats detected across trademark registries, domains,
            marketplaces, and social platforms.
          </p>
        </div>
        <div className="page-actions" style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleExportPDF}
            disabled={pdfLoading}
            style={{
              ...styles.refreshBtn,
              background: pdfLoading ? "#888" : "#B22222",
              cursor: pdfLoading ? "not-allowed" : "pointer",
            }}
          >
            {pdfLoading ? "Generating..." : "⬇ Export PDF"}
          </button>
          <button onClick={fetchMatches} style={styles.refreshBtn}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={styles.errorBanner}>
          <span>⚠ {error}</span>
          <button onClick={() => setError("")} style={styles.errorClose}>✕</button>
        </div>
      )}

      {/* New match notification */}
      {newAlert && (
        <div style={styles.alertBanner}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={styles.alertDot} />
            <strong>{newAlert} new match{newAlert > 1 ? "es" : ""} detected</strong>
            <span style={{ fontSize: "13px", opacity: 0.85 }}>— a business name similar to yours was just registered.</span>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => { setFilterStatus("new"); dismissAlert(); }} style={styles.alertViewBtn}>View Now</button>
            <button onClick={dismissAlert} style={styles.alertDismissBtn}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="summary-grid" style={styles.cardRow}>
        <SummaryCard label="TOTAL NEW"          count={newMatches.length}  color="#B22222" />
        <SummaryCard label="TRADEMARK MATCHES"  count={trademarkNew}       color="#1B2A4A" />
        <SummaryCard label="DOMAIN MATCHES"     count={domainNew}          color="#F0A500" />
        <SummaryCard label="MARKETPLACE HITS"   count={marketplaceNew}     color="#1E7A4A" />
      </div>

      {/* Filters */}
      <div className="filter-bar" style={styles.filterBar}>
        <FilterSelect label="Source"  value={filterSource}  onChange={setFilterSource}  options={sourceOptions}  />
        <FilterSelect label="Keyword" value={filterKeyword} onChange={setFilterKeyword} options={keywordOptions} />
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Date From</label>
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} style={styles.select} />
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Date To</label>
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} style={styles.select} />
        </div>
        <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus} options={statusOptions} />
        {hasActiveFilters && (
          <div style={styles.filterGroup}>
            <label style={{ ...styles.filterLabel, opacity: 0 }}>_</label>
            <button onClick={clearFilters} style={styles.clearBtn}>✕ Clear</button>
          </div>
        )}
      </div>

      {/* Matches table */}
      <div className="data-card" style={styles.tableCard}>
        <div className="table-heading" style={styles.tableHeader}>
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
          <div className="responsive-table" style={styles.tableWrapper}>
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
                  const key  = `${m.category}-${m.id}`;
                  const busy = !!actionLoading[key];
                  return (
                    <tr key={key} style={{ background: i % 2 === 0 ? "#ffffff" : "#F4F6F9" }}>
                      <td style={styles.td}><SourceBadge source={m.source} category={m.category} /></td>
                      <td style={{ ...styles.td, fontWeight: "600", color: "#1B2A4A" }}>{m.keyword || "—"}</td>
                      <td style={styles.td}>{m.match_name || "—"}</td>
                      <td style={{ ...styles.td, color: "#777", fontSize: "13px" }}>
                        {m.date_found
                          ? new Date(m.date_found).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                      <td style={styles.td}><StatusBadge status={m.status} /></td>
                      <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                        <ActionButton label={busy && m.status !== "reviewed" ? "..." : "✓ Reviewed"} color="#1E7A4A" disabled={busy || m.status === "reviewed"} onClick={() => updateStatus(m, "reviewed")} />
                        <span style={{ display: "inline-block", width: "6px" }} />
                        <ActionButton label={busy && m.status !== "dismissed" ? "..." : "✕ Dismiss"} color="#888888" disabled={busy || m.status === "dismissed"} onClick={() => updateStatus(m, "dismissed")} />
                        {m.status !== "new" && (
                          <>
                            <span style={{ display: "inline-block", width: "6px" }} />
                            <ActionButton label={busy && m.status === "new" ? "..." : "↺ New"} color="#2E5FA3" disabled={busy} onClick={() => updateStatus(m, "new")} />
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
  page:        { fontFamily: "Arial, sans-serif", maxWidth: "1200px", margin: "0 auto", padding: "32px 24px", color: "#111" },
  header:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" },
  title:       { fontSize: "26px", fontWeight: "bold", color: "#1B2A4A", margin: "0 0 6px 0" },
  subtitle:    { fontSize: "14px", color: "#555", margin: 0 },
  refreshBtn:  { padding: "9px 20px", background: "#1B2A4A", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", fontFamily: "Arial, sans-serif", whiteSpace: "nowrap" },
  errorBanner:      { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FDECEA", border: "1px solid #B22222", borderRadius: "6px", padding: "10px 16px", marginBottom: "20px", color: "#B22222", fontSize: "14px" },
  errorClose:       { background: "none", border: "none", color: "#B22222", cursor: "pointer", fontSize: "16px" },
  alertBanner:      { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f2044", border: "2px solid #E3000F", borderRadius: "8px", padding: "14px 20px", marginBottom: "20px", color: "#fff", fontSize: "14px", gap: "12px", flexWrap: "wrap" },
  alertDot:         { width: 10, height: 10, borderRadius: "50%", background: "#E3000F", display: "inline-block", flexShrink: 0, animation: "pulse 1.5s infinite" },
  alertViewBtn:     { padding: "7px 18px", background: "#E3000F", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" },
  alertDismissBtn:  { padding: "7px 14px", background: "transparent", color: "#ccc", border: "1px solid #555", borderRadius: "6px", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap" },
  cardRow:     { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" },
  card:        { background: "#fff", border: "1px solid #DDDDDD", borderRadius: "8px", padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  cardLabel:   { fontSize: "11px", fontWeight: "bold", letterSpacing: "1px", color: "#888", margin: "0 0 10px 0" },
  cardCount:   { fontSize: "36px", fontWeight: "bold", margin: 0 },
  filterBar:   { display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end", background: "#fff", border: "1px solid #DDDDDD", borderRadius: "8px", padding: "16px 20px", marginBottom: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  filterGroup: { display: "flex", flexDirection: "column", gap: "5px", minWidth: "140px" },
  filterLabel: { fontSize: "11px", fontWeight: "bold", letterSpacing: "0.8px", color: "#888", textTransform: "uppercase" },
  select:      { padding: "7px 10px", border: "1px solid #CCCCCC", borderRadius: "6px", fontSize: "13px", color: "#1B2A4A", background: "#F9FAFB", fontFamily: "Arial, sans-serif", cursor: "pointer", outline: "none" },
  clearBtn:    { padding: "7px 14px", background: "#FDECEA", color: "#B22222", border: "1px solid #B22222", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", fontFamily: "Arial, sans-serif" },
  tableCard:   { background: "#fff", border: "1px solid #DDDDDD", borderRadius: "8px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  tableHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  tableLabel:  { fontSize: "11px", fontWeight: "bold", letterSpacing: "1px", color: "#2E5FA3", margin: 0 },
  totalCount:  { fontSize: "12px", color: "#888", background: "#F4F6F9", padding: "3px 10px", borderRadius: "12px" },
  tableWrapper:{ overflowX: "auto" },
  table:       { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
  th:          { textAlign: "left", padding: "10px 14px", background: "#1B2A4A", color: "#fff", fontSize: "12px", fontWeight: "bold", letterSpacing: "0.5px", whiteSpace: "nowrap" },
  td:          { padding: "12px 14px", verticalAlign: "middle", borderBottom: "1px solid #EEEEEE" },
  emptyMsg:    { color: "#888", fontSize: "14px", textAlign: "center", padding: "40px 0" },
  actionBtn:   { padding: "5px 12px", border: "none", borderRadius: "5px", fontSize: "12px", fontWeight: "bold", fontFamily: "Arial, sans-serif", transition: "opacity 0.15s" },
};
