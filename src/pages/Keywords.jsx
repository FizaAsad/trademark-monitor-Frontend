import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Keywords() {
  const [keywords, setKeywords]     = useState([]);
  const [newTerm, setNewTerm]       = useState("");
  const [editingId, setEditingId]   = useState(null);
  const [editingTerm, setEditingTerm] = useState("");
  const [loading, setLoading]       = useState(true);
  const [adding, setAdding]         = useState(false);
  const [error, setError]           = useState("");

  // ── Fetch all keywords ─────────────────────────────────────────────────
  async function fetchKeywords() {
    try {
      const res = await fetch(`${API}/api/keywords`);
      const data = await res.json();
      setKeywords(data);
    } catch (err) {
      setError("Could not load keywords. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchKeywords(); }, []);

  // ── Add keyword ────────────────────────────────────────────────────────
  async function handleAdd(e) {
    e.preventDefault();
    if (!newTerm.trim()) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: newTerm.trim() }),
      });
      if (!res.ok) throw new Error();
      setNewTerm("");
      await fetchKeywords();
    } catch {
      setError("Failed to add keyword. Try again.");
    } finally {
      setAdding(false);
    }
  }

  // ── Delete keyword ─────────────────────────────────────────────────────
  async function handleDelete(id) {
    if (!window.confirm("Delete this keyword?")) return;
    try {
      await fetch(`${API}/api/keywords/${id}`, { method: "DELETE" });
      setKeywords((prev) => prev.filter((k) => k.id !== id));
    } catch {
      setError("Failed to delete keyword.");
    }
  }

  // ── Toggle active ──────────────────────────────────────────────────────
  async function handleToggle(kw) {
    try {
      await fetch(`${API}/api/keywords/${kw.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !kw.active }),
      });
      setKeywords((prev) =>
        prev.map((k) => (k.id === kw.id ? { ...k, active: !k.active } : k))
      );
    } catch {
      setError("Failed to update keyword.");
    }
  }

  // ── Save inline edit ───────────────────────────────────────────────────
  async function handleEditSave(id) {
    if (!editingTerm.trim()) return;
    try {
      await fetch(`${API}/api/keywords/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: editingTerm.trim() }),
      });
      setKeywords((prev) =>
        prev.map((k) => (k.id === id ? { ...k, term: editingTerm.trim() } : k))
      );
      setEditingId(null);
    } catch {
      setError("Failed to save changes.");
    }
  }

  // ── UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-shell keywords-page" style={styles.page}>
      {/* Header */}
      <div className="page-header" style={styles.header}>
        <h1 style={styles.title}>Keyword Manager</h1>
        <p style={styles.subtitle}>
          Add the brand names you want to monitor across trademark databases,
          domains, marketplaces, and social platforms.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div style={styles.errorBanner}>
          <span>⚠ {error}</span>
          <button onClick={() => setError("")} style={styles.errorClose}>✕</button>
        </div>
      )}

      {/* Add keyword form */}
      <div className="data-card" style={styles.card}>
        <p style={styles.cardLabel}>ADD NEW KEYWORD</p>
        <form className="stackable-form" onSubmit={handleAdd} style={styles.addForm}>
          <input
            type="text"
            placeholder="e.g. BrandName, YourLogo, TradeMark..."
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            style={styles.input}
            disabled={adding}
            maxLength={100}
          />
          <button
            type="submit"
            style={{ ...styles.btnPrimary, opacity: adding ? 0.7 : 1 }}
            disabled={adding || !newTerm.trim()}
          >
            {adding ? "Adding..." : "+ Add Keyword"}
          </button>
        </form>
      </div>

      {/* Keywords table */}
      <div className="data-card" style={styles.card}>
        <div className="table-heading" style={styles.tableHeader}>
          <p style={styles.cardLabel}>MONITORED KEYWORDS</p>
          <span style={styles.count}>{keywords.length} total</span>
        </div>

        {loading ? (
          <p style={styles.emptyMsg}>Loading keywords...</p>
        ) : keywords.length === 0 ? (
          <p style={styles.emptyMsg}>
            No keywords yet. Add one above to start monitoring.
          </p>
        ) : (
          <div className="responsive-table">
          <table style={styles.table}>
            <thead>
              <tr>
                {["Keyword", "Status", "Date Added", "Active", "Actions"].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keywords.map((kw, i) => (
                <tr
                  key={kw.id}
                  style={{
                    ...styles.tr,
                    background: i % 2 === 0 ? "#ffffff" : "#F4F6F9",
                  }}
                >
                  {/* Keyword cell — inline edit */}
                  <td style={styles.td}>
                    {editingId === kw.id ? (
                      <input
                        value={editingTerm}
                        onChange={(e) => setEditingTerm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEditSave(kw.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        style={styles.inlineInput}
                        autoFocus
                        maxLength={100}
                      />
                    ) : (
                      <span style={styles.termText}>{kw.term}</span>
                    )}
                  </td>

                  {/* Status badge */}
                  <td style={styles.td}>
                    <span style={kw.active ? styles.badgeActive : styles.badgeInactive}>
                      {kw.active ? "Monitoring" : "Paused"}
                    </span>
                  </td>

                  {/* Date added */}
                  <td style={{ ...styles.td, color: "#777", fontSize: "13px" }}>
                    {kw.created_at
                      ? new Date(kw.created_at).toLocaleDateString("en-GB", {
                          day: "2-digit", month: "short", year: "numeric",
                        })
                      : "—"}
                  </td>

                  {/* Active toggle */}
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <button
                      onClick={() => handleToggle(kw)}
                      style={{
                        ...styles.toggle,
                        background: kw.active ? "#1E7A4A" : "#ccc",
                      }}
                      title={kw.active ? "Click to pause" : "Click to activate"}
                    >
                      <span
                        style={{
                          ...styles.toggleThumb,
                          transform: kw.active ? "translateX(20px)" : "translateX(2px)",
                        }}
                      />
                    </button>
                  </td>

                  {/* Actions */}
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    {editingId === kw.id ? (
                      <div style={styles.actionGroup}>
                        <button
                          onClick={() => handleEditSave(kw.id)}
                          style={styles.btnSave}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={styles.btnCancel}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={styles.actionGroup}>
                        <button
                          onClick={() => { setEditingId(kw.id); setEditingTerm(kw.term); }}
                          style={styles.btnEdit}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(kw.id)}
                          style={styles.btnDelete}
                        >
                          Delete
                        </button>
                      </div>
                    )}
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

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: {
    fontFamily: "Arial, sans-serif",
    maxWidth: "960px",
    margin: "0 auto",
    padding: "32px 24px",
    color: "#111",
  },
  header: {
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
    padding: "0 4px",
  },
  card: {
    background: "#fff",
    border: "1px solid #DDDDDD",
    borderRadius: "8px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  cardLabel: {
    fontSize: "11px",
    fontWeight: "bold",
    letterSpacing: "1px",
    color: "#2E5FA3",
    margin: "0 0 14px 0",
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
  },
  count: {
    fontSize: "12px",
    color: "#888",
    background: "#F4F6F9",
    padding: "3px 10px",
    borderRadius: "12px",
  },
  addForm: {
    display: "flex",
    gap: "12px",
  },
  input: {
    flex: 1,
    padding: "10px 14px",
    fontSize: "14px",
    border: "1px solid #DDDDDD",
    borderRadius: "6px",
    outline: "none",
    fontFamily: "Arial, sans-serif",
  },
  inlineInput: {
    padding: "6px 10px",
    fontSize: "14px",
    border: "1px solid #2E5FA3",
    borderRadius: "4px",
    outline: "none",
    width: "100%",
    fontFamily: "Arial, sans-serif",
  },
  btnPrimary: {
    padding: "10px 20px",
    background: "#1B2A4A",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "Arial, sans-serif",
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
  },
  tr: {
    borderBottom: "1px solid #EEEEEE",
    transition: "background 0.15s",
  },
  td: {
    padding: "12px 14px",
    verticalAlign: "middle",
  },
  termText: {
    fontWeight: "600",
    color: "#1B2A4A",
  },
  badgeActive: {
    background: "#D4EDDA",
    color: "#1E7A4A",
    padding: "3px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "bold",
  },
  badgeInactive: {
    background: "#F4F6F9",
    color: "#888",
    padding: "3px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "bold",
  },
  toggle: {
    position: "relative",
    width: "44px",
    height: "24px",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    transition: "background 0.2s",
    padding: 0,
  },
  toggleThumb: {
    position: "absolute",
    top: "2px",
    width: "20px",
    height: "20px",
    background: "#fff",
    borderRadius: "50%",
    transition: "transform 0.2s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  },
  actionGroup: {
    display: "flex",
    gap: "8px",
    justifyContent: "center",
  },
  btnEdit: {
    padding: "5px 14px",
    background: "#D6E4F0",
    color: "#1B2A4A",
    border: "none",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: "bold",
    cursor: "pointer",
    fontFamily: "Arial, sans-serif",
  },
  btnDelete: {
    padding: "5px 14px",
    background: "#FDECEA",
    color: "#B22222",
    border: "none",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: "bold",
    cursor: "pointer",
    fontFamily: "Arial, sans-serif",
  },
  btnSave: {
    padding: "5px 14px",
    background: "#1E7A4A",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: "bold",
    cursor: "pointer",
    fontFamily: "Arial, sans-serif",
  },
  btnCancel: {
    padding: "5px 14px",
    background: "#eee",
    color: "#555",
    border: "none",
    borderRadius: "4px",
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "Arial, sans-serif",
  },
  emptyMsg: {
    color: "#888",
    fontSize: "14px",
    textAlign: "center",
    padding: "32px 0",
  },
};
