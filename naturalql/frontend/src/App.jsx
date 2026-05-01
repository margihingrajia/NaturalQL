import { useState, useRef, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const C = {
  cream:      "#F5F0E8",
  linen:      "#EDE7D9",
  parchment:  "#E4DAC8",
  sand:       "#C8B99A",
  walnut:     "#8B7355",
  espresso:   "#3D2B1F",
  ink:        "#2A1F14",
  terracotta: "#C4622D",
  sage:       "#6B8A6E",
  dustyBlue:  "#7B9BAA",
  amber:      "#C8882A",
  rust:       "#9E3D22",
  white:      "#FDFAF4",
  shadow:     "rgba(61,43,31,0.08)",
  shadowMd:   "rgba(61,43,31,0.14)",
};

const CHART_COLORS = [
  C.terracotta, C.dustyBlue, C.sage, C.amber, C.walnut,
  "#A67C9B", "#7A9E7E", "#D4A76A", "#8FA8C8", "#C4956A",
];

const SUGGESTIONS = [
  "Show all customers from the USA",
  "Top 5 products by revenue",
  "Orders placed this year by status",
  "Which customer spent the most?",
  "Average order value per country",
  "Products with less than 100 in stock",
];

function detectChartType(rows, columns) {
  if (!rows || rows.length === 0 || columns.length < 2) return null;
  const numCols = columns.filter(c => rows.slice(0, 5).every(r => r[c] !== null && !isNaN(Number(r[c]))));
  const catCols = columns.filter(c => !numCols.includes(c));
  if (numCols.length >= 1 && catCols.length >= 1) {
    return rows.length <= 10 ? "bar" : "line";
  }
  if (numCols.length >= 2) return "scatter";
  return null;
}

function BarChart({ rows, columns }) {
  const catCol = columns.find(c => rows.slice(0,5).some(r => isNaN(Number(r[c]))));
  const numCol = columns.find(c => c !== catCol && rows.slice(0,5).every(r => !isNaN(Number(r[c]))));
  if (!catCol || !numCol) return null;
  const data = rows.slice(0, 12).map(r => ({ label: String(r[catCol] ?? "").slice(0, 18), value: Number(r[numCol]) || 0 }));
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 560, H = 280, PAD = 52, BAR_AREA = W - PAD * 2;
  const barW = Math.min(44, (BAR_AREA / data.length) - 8);
  const step = BAR_AREA / data.length;
  const plotH = H - PAD * 1.9;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W, display: "block" }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = PAD + (1 - t) * plotH;
        return (
          <g key={i}>
            <line x1={PAD} y1={y} x2={W - PAD * 0.5} y2={y} stroke={C.parchment} strokeWidth="1" strokeDasharray={t === 0 ? "none" : "4,4"} />
            <text x={PAD - 7} y={y + 4} fontSize="9" fill={C.walnut} textAnchor="end" fontFamily="'Courier Prime', monospace">
              {(max * t).toFixed(max < 10 ? 1 : 0)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const bH = (d.value / max) * plotH;
        const x = PAD + i * step + (step - barW) / 2;
        const y = PAD + plotH - bH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bH} fill={CHART_COLORS[i % CHART_COLORS.length]} rx="3" opacity="0.85" />
            <text x={x + barW / 2} y={H - PAD * 0.45} fontSize="9" fill={C.walnut} textAnchor="middle"
              transform={data.length > 6 ? `rotate(-35, ${x + barW / 2}, ${H - PAD * 0.45})` : undefined}
              fontFamily="'DM Sans', sans-serif">{d.label}</text>
            {bH > 16 && <text x={x + barW / 2} y={y - 4} fontSize="9" fill={C.espresso} textAnchor="middle" fontWeight="700" fontFamily="'Courier Prime', monospace">
              {d.value > 1000 ? (d.value/1000).toFixed(1)+"k" : d.value.toFixed(d.value % 1 === 0 ? 0 : 1)}
            </text>}
          </g>
        );
      })}
      <line x1={PAD} y1={PAD} x2={PAD} y2={PAD + plotH} stroke={C.sand} strokeWidth="1.5" />
      <line x1={PAD} y1={PAD + plotH} x2={W - PAD * 0.5} y2={PAD + plotH} stroke={C.sand} strokeWidth="1.5" />
    </svg>
  );
}

function DonutChart({ rows, columns }) {
  const catCol = columns.find(c => rows.slice(0,5).some(r => isNaN(Number(r[c]))));
  const numCol = columns.find(c => c !== catCol && rows.slice(0,5).every(r => !isNaN(Number(r[c]))));
  if (!catCol || !numCol) return null;
  const data = rows.slice(0, 8).map((r, i) => ({
    label: String(r[catCol] ?? "").slice(0, 22),
    value: Math.max(Number(r[numCol]) || 0, 0),
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const cx = 130, cy = 130, R = 100, ri = 58;
  let angle = -Math.PI / 2;
  const slices = data.map(d => {
    const sweep = (d.value / total) * Math.PI * 2;
    const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle);
    angle += sweep;
    const x2 = cx + R * Math.cos(angle), y2 = cy + R * Math.sin(angle);
    const ix1 = cx + ri * Math.cos(angle - sweep), iy1 = cy + ri * Math.sin(angle - sweep);
    const ix2 = cx + ri * Math.cos(angle), iy2 = cy + ri * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    return { ...d, path: `M${x1},${y1} A${R},${R},0,${large},1,${x2},${y2} L${ix2},${iy2} A${ri},${ri},0,${large},0,${ix1},${iy1} Z`, pct: ((d.value/total)*100).toFixed(1) };
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
      <svg viewBox="0 0 260 260" style={{ width: 200, flexShrink: 0 }}>
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity="0.88" stroke={C.white} strokeWidth="2.5" />)}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="11" fill={C.walnut} fontFamily="'Courier Prime', monospace">TOTAL</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="15" fill={C.espresso} fontWeight="700" fontFamily="'Lora', serif">
          {total > 10000 ? (total/1000).toFixed(1)+"k" : total.toLocaleString()}
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: C.espresso, fontFamily: "'DM Sans', sans-serif" }}>{s.label}</span>
            <span style={{ fontSize: 11, color: C.walnut, marginLeft: "auto", paddingLeft: 16, fontFamily: "'Courier Prime', monospace" }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({ rows, columns }) {
  const numCols = columns.filter(c => rows.slice(0,5).every(r => !isNaN(Number(r[c]))));
  const catCol = columns.find(c => !numCols.includes(c));
  if (!catCol || numCols.length === 0) return null;
  const col = numCols[0];
  const W = 560, H = 260, PAD = 50;
  const plotW = W - PAD * 1.5, plotH = H - PAD * 1.7;
  const vals = rows.map(r => Number(r[col]) || 0);
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0), range = max - min || 1;
  const pts = rows.map((r, i) => ({
    x: PAD + (i / Math.max(rows.length - 1, 1)) * plotW,
    y: PAD + (1 - (Number(r[col]) - min) / range) * plotH,
    label: String(r[catCol] ?? "").slice(0, 14), val: Number(r[col]),
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${pathD} L${pts[pts.length-1].x},${PAD+plotH} L${PAD},${PAD+plotH} Z`;
  const shown = pts.filter((_, i) => i % Math.max(1, Math.ceil(pts.length / 7)) === 0 || i === pts.length - 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W, display: "block" }}>
      <defs>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.terracotta} stopOpacity="0.2" />
          <stop offset="100%" stopColor={C.terracotta} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t, i) => {
        const y = PAD + (1 - t) * plotH;
        return <line key={i} x1={PAD} y1={y} x2={W - PAD * 0.5} y2={y} stroke={C.parchment} strokeWidth="1" strokeDasharray={t===0?"none":"5,5"} />;
      })}
      <path d={area} fill="url(#ag)" />
      <path d={pathD} fill="none" stroke={C.terracotta} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {shown.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4.5" fill={C.terracotta} stroke={C.white} strokeWidth="2.5" />
          <text x={p.x} y={H - 10} fontSize="9" fill={C.walnut} textAnchor="middle" fontFamily="'DM Sans', sans-serif">{p.label}</text>
        </g>
      ))}
      <line x1={PAD} y1={PAD} x2={PAD} y2={PAD+plotH} stroke={C.sand} strokeWidth="1.5" />
      <line x1={PAD} y1={PAD+plotH} x2={W-PAD*0.5} y2={PAD+plotH} stroke={C.sand} strokeWidth="1.5" />
    </svg>
  );
}

function StatCards({ rows, columns }) {
  const numCols = columns.filter(c => rows.slice(0,5).every(r => !isNaN(Number(r[c]))));
  if (numCols.length === 0) return <div style={{ color: C.sand, fontStyle: "italic", fontSize: 13 }}>No numeric columns to summarize.</div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 12, marginBottom: 4 }}>
      {numCols.slice(0, 4).map(col => {
        const vals = rows.map(r => Number(r[col])).filter(v => !isNaN(v));
        const sum = vals.reduce((a, b) => a + b, 0);
        const avg = sum / vals.length;
        const max = Math.max(...vals), min = Math.min(...vals);
        const fmt = v => v > 10000 ? (v/1000).toFixed(1)+"k" : v.toFixed(v % 1 === 0 ? 0 : 2);
        return (
          <div key={col} style={{ background: C.white, border: `1px solid ${C.parchment}`, borderRadius: 10, padding: "14px 16px", boxShadow: `0 2px 8px ${C.shadow}` }}>
            <div style={{ fontSize: 9, color: C.walnut, fontFamily: "'Courier Prime', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{col}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.espresso, fontFamily: "'Lora', serif", marginBottom: 6 }}>{fmt(sum)}</div>
            <div style={{ fontSize: 10, color: C.walnut, fontFamily: "'Courier Prime', monospace", lineHeight: 1.6 }}>
              avg {avg.toFixed(1)}<br />
              min {fmt(min)} · max {fmt(max)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      style={{ flexShrink: 0, background: "none", border: `1px solid ${C.parchment}`, borderRadius: 5, padding: "3px 10px", cursor: "pointer", fontSize: 11, color: C.walnut, fontFamily: "'Courier Prime', monospace", transition: "all 0.2s", whiteSpace: "nowrap" }}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function exportCSV(rows, columns) {
  const header = columns.join(",");
  const body = rows.map(r => columns.map(c => JSON.stringify(r[c] ?? "")).join(",")).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "naturalql_results.csv"; a.click();
}

function RemoteDbForm({ dbType, onConnect }) {
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState(dbType === "postgres" ? "5432" : "3306");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [database, setDatabase] = useState("");
  const [status, setStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  const buildDsn = () => dbType === "postgres"
    ? `postgresql://${user}:${password}@${host}:${port}/${database}`
    : `mysql://${user}:${password}@${host}:${port}/${database}`;
  async function testConn() {
    setTesting(true); setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/query/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "show tables", db_type: dbType, db_path: buildDsn() }),
      });
      if (res.ok) { setStatus("ok"); onConnect(buildDsn()); }
      else setStatus("err");
    } catch { setStatus("err"); }
    setTesting(false);
  }
  const inp = { width: "100%", background: C.white, border: `1px solid ${C.parchment}`, borderRadius: 6, padding: "7px 10px", fontSize: 12, color: C.espresso, fontFamily: "'Courier Prime', monospace", outline: "none" };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, paddingTop: 12 }}>
      {[["Host", host, setHost], ["Port", port, setPort], ["User", user, setUser], ["Database", database, setDatabase]].map(([l, v, s]) => (
        <div key={l}>
          <div style={{ fontSize: 9, color: C.walnut, fontFamily: "'Courier Prime', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{l}</div>
          <input style={inp} value={v} onChange={e => s(e.target.value)} placeholder={l.toLowerCase()} />
        </div>
      ))}
      <div style={{ gridColumn: "1/-1" }}>
        <div style={{ fontSize: 9, color: C.walnut, fontFamily: "'Courier Prime', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Password</div>
        <input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password" />
      </div>
      <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={testConn} disabled={testing || !host || !user || !database}
          style={{ padding: "7px 18px", background: C.espresso, border: "none", borderRadius: 6, color: C.cream, fontSize: 12, fontFamily: "'Lora', serif", cursor: "pointer", opacity: (testing || !host || !user || !database) ? 0.5 : 1 }}>
          {testing ? "Connecting…" : "Connect"}
        </button>
        {status === "ok" && <span style={{ color: C.sage, fontSize: 11, fontFamily: "'Courier Prime', monospace" }}>✓ Connected</span>}
        {status === "err" && <span style={{ color: C.rust, fontSize: 11, fontFamily: "'Courier Prime', monospace" }}>✗ Failed</span>}
      </div>
    </div>
  );
}

export default function App() {
  const [question, setQuestion] = useState("");
  const [dbPath, setDbPath] = useState("");
  const [dbType, setDbType] = useState("sqlite");
  const [history, setHistory] = useState([]);
  const [queryHistory, setQueryHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [uploadedDb, setUploadedDb] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const fileRef = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => {
    if (result && resultRef.current) {
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [result]);

  useEffect(() => {
    if (!result?.rows?.length) return;
    const cols = Object.keys(result.rows[0]);
    const ct = detectChartType(result.rows, cols);
    if (ct) setViewMode(result.rows.length <= 8 ? "donut" : ct === "line" ? "line" : "bar");
    else setViewMode("table");
  }, [result]);

  async function handleUpload(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setError(null);
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/api/upload/db`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setUploadedDb(data); setDbPath(data.db_path); setDbType("sqlite");
    } catch (err) { setError(err.message); }
    finally { setUploading(false); }
  }

  async function runQuery(q) {
    if (!q?.trim()) return;
    setLoading(true); setError(null); setResult(null); setShowSuggestions(false);
    try {
      const res = await fetch(`${API_BASE}/api/query/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, db_type: dbType, db_path: dbPath || undefined, history: history.slice(-6) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Query failed");
      setResult(data);
      setHistory(h => [...h, { role: "user", content: q }, { role: "assistant", content: data.sql }]);
      setQueryHistory(h => [{ question: q, sql: data.sql, row_count: data.row_count, ts: new Date().toLocaleTimeString() }, ...h].slice(0, 20));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  function handleSubmit(e) { e?.preventDefault(); runQuery(question); }
  function handleKeyDown(e) { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runQuery(question); }

  const columns = result?.rows?.length ? Object.keys(result.rows[0]) : [];
  const chartType = result ? detectChartType(result.rows, columns) : null;
  const hasNumeric = columns.some(c => result?.rows?.slice(0,3).every(r => !isNaN(Number(r[c]))));
  const availableViews = [
    "table",
    ...(chartType ? ["bar"] : []),
    ...(chartType === "line" || (chartType && result?.rows?.length > 10) ? ["line"] : []),
    ...(result?.rows?.length <= 12 && chartType ? ["donut"] : []),
    ...(hasNumeric ? ["stats"] : []),
  ];
  const VIEW_LABELS = { table: "⊞ Table", bar: "▮ Bar", line: "∿ Line", donut: "◉ Pie", stats: "∑ Stats" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          background: ${C.linen};
          background-image:
            radial-gradient(ellipse 80% 50% at 15% 0%, rgba(196,98,45,0.06) 0%, transparent 55%),
            radial-gradient(ellipse 50% 60% at 90% 90%, rgba(107,138,110,0.07) 0%, transparent 55%);
          color: ${C.espresso};
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: ${C.linen}; }
        ::-webkit-scrollbar-thumb { background: ${C.sand}; border-radius: 3px; }

        .layout { display: flex; min-height: 100vh; }

        /* SIDEBAR */
        .sidebar {
          width: 230px; flex-shrink: 0;
          background: ${C.cream};
          border-right: 1px solid ${C.parchment};
          display: flex; flex-direction: column;
          position: sticky; top: 0; height: 100vh; overflow-y: auto;
          padding: 28px 20px;
        }
        .logo-mark { font-family: 'Courier Prime', monospace; font-size: 9px; font-weight: 700; color: ${C.terracotta}; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 5px; }
        .logo-name { font-family: 'Lora', serif; font-size: 21px; font-weight: 700; color: ${C.espresso}; letter-spacing: -0.02em; line-height: 1.15; }
        .logo-tagline { font-size: 11px; color: ${C.walnut}; margin-top: 4px; line-height: 1.45; }
        .sidebar-divider { height: 1px; background: ${C.parchment}; margin: 20px 0; }
        .sidebar-label { font-family: 'Courier Prime', monospace; font-size: 9px; color: ${C.sand}; letter-spacing: 0.18em; text-transform: uppercase; display: block; margin-bottom: 9px; }

        .db-select {
          width: 100%; background: ${C.white}; border: 1px solid ${C.parchment};
          color: ${C.espresso}; font-family: 'Courier Prime', monospace; font-size: 12px;
          padding: 8px 28px 8px 10px; border-radius: 7px; cursor: pointer; outline: none;
          transition: border-color 0.2s; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238B7355'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
        }
        .db-select:focus { border-color: ${C.terracotta}; }

        .upload-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 7px;
          padding: 8px 10px; margin-top: 9px;
          background: transparent; border: 1px dashed ${C.sand}; border-radius: 7px;
          color: ${C.walnut}; font-family: 'Courier Prime', monospace; font-size: 11px;
          cursor: pointer; transition: all 0.2s;
        }
        .upload-btn:hover:not(:disabled) { border-color: ${C.terracotta}; color: ${C.terracotta}; background: rgba(196,98,45,0.05); }
        .upload-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .db-badge { display: flex; align-items: center; gap: 6px; margin-top: 9px; padding: 6px 10px; background: rgba(107,138,110,0.1); border: 1px solid rgba(107,138,110,0.2); border-radius: 6px; font-family: 'Courier Prime', monospace; font-size: 10px; color: ${C.sage}; word-break: break-all; }

        .history-btn { display: block; width: 100%; padding: 8px 10px; border-radius: 6px; border: none; background: none; text-align: left; cursor: pointer; transition: background 0.15s; }
        .history-btn:hover { background: ${C.parchment}; }
        .history-q { font-size: 12px; color: ${C.espresso}; line-height: 1.3; font-family: 'DM Sans', sans-serif; }
        .history-meta { font-size: 10px; color: ${C.walnut}; font-family: 'Courier Prime', monospace; margin-top: 2px; }

        /* MAIN */
        .main { flex: 1; min-width: 0; padding: 44px 52px 80px; }

        .page-title { font-family: 'Lora', serif; font-size: clamp(1.8rem, 3vw, 2.5rem); font-weight: 600; color: ${C.espresso}; line-height: 1.2; letter-spacing: -0.02em; margin-bottom: 6px; }
        .page-title em { font-style: italic; color: ${C.terracotta}; }
        .page-sub { font-size: 14px; color: ${C.walnut}; margin-bottom: 32px; line-height: 1.55; }

        .query-card { background: ${C.white}; border: 1px solid ${C.parchment}; border-radius: 14px; padding: 20px 22px; box-shadow: 0 3px 18px ${C.shadow}; margin-bottom: 22px; }
        textarea { width: 100%; min-height: 86px; resize: none; outline: none; border: none; background: transparent; color: ${C.espresso}; font-family: 'Lora', serif; font-size: 16px; line-height: 1.65; caret-color: ${C.terracotta}; }
        textarea::placeholder { color: ${C.sand}; font-style: italic; }
        .query-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 13px; border-top: 1px solid ${C.linen}; margin-top: 6px; flex-wrap: wrap; gap: 8px; }
        .kbd-hint { font-family: 'Courier Prime', monospace; font-size: 11px; color: ${C.sand}; }

        .run-btn { display: flex; align-items: center; gap: 9px; padding: 10px 26px; background: ${C.espresso}; border: none; border-radius: 9px; color: ${C.cream}; font-family: 'Lora', serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .run-btn:hover:not(:disabled) { background: ${C.terracotta}; transform: translateY(-1px); box-shadow: 0 5px 16px rgba(196,98,45,0.28); }
        .run-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }

        .chip { padding: 6px 14px; background: ${C.white}; border: 1px solid ${C.parchment}; border-radius: 20px; font-family: 'DM Sans', sans-serif; font-size: 12px; color: ${C.walnut}; cursor: pointer; transition: all 0.18s; white-space: nowrap; }
        .chip:hover { border-color: ${C.terracotta}; color: ${C.terracotta}; background: rgba(196,98,45,0.05); }

        .error-box { padding: 14px 18px; background: rgba(158,61,34,0.07); border: 1px solid rgba(158,61,34,0.2); border-radius: 10px; color: ${C.rust}; font-family: 'Courier Prime', monospace; font-size: 13px; margin-bottom: 24px; line-height: 1.5; }

        .result-panel { animation: riseIn 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes riseIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }

        .section-label { font-family: 'Courier Prime', monospace; font-size: 9px; color: ${C.sand}; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 10px; display: block; }

        .sql-card { background: ${C.cream}; border: 1px solid ${C.parchment}; border-left: 3px solid ${C.terracotta}; border-radius: 10px; padding: 14px 18px; margin-bottom: 22px; font-family: 'Courier Prime', monospace; font-size: 13px; color: ${C.espresso}; line-height: 1.75; overflow-x: auto; white-space: pre-wrap; word-break: break-word; display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; }

        .result-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
        .result-title { font-family: 'Lora', serif; font-size: 15px; font-weight: 600; color: ${C.espresso}; flex: 1; }
        .pill { padding: 3px 10px; border-radius: 12px; font-family: 'Courier Prime', monospace; font-size: 11px; background: ${C.parchment}; color: ${C.walnut}; }
        .pill.g { background: rgba(107,138,110,0.15); color: ${C.sage}; }

        .icon-btn { background: none; border: 1px solid ${C.parchment}; border-radius: 6px; padding: "4px 12px"; cursor: pointer; font-size: 11px; color: ${C.walnut}; font-family: 'Courier Prime', monospace; transition: all 0.18s; white-space: nowrap; padding: 4px 12px; }
        .icon-btn:hover { border-color: ${C.walnut}; color: ${C.espresso}; }

        .view-toggle { display: inline-flex; gap: 2px; background: ${C.linen}; border: 1px solid ${C.parchment}; border-radius: 9px; padding: 3px; margin-bottom: 16px; }
        .view-btn { padding: 6px 14px; border: none; border-radius: 6px; font-family: 'Courier Prime', monospace; font-size: 11px; cursor: pointer; transition: all 0.15s; background: none; color: ${C.walnut}; }
        .view-btn.active { background: ${C.white}; color: ${C.espresso}; font-weight: 700; box-shadow: 0 1px 5px ${C.shadow}; }

        .chart-card { background: ${C.white}; border: 1px solid ${C.parchment}; border-radius: 12px; padding: 24px 26px; box-shadow: 0 2px 12px ${C.shadow}; }
        .table-wrap { border: 1px solid ${C.parchment}; border-radius: 12px; overflow: auto; max-height: 480px; background: ${C.white}; box-shadow: 0 2px 12px ${C.shadow}; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        thead { position: sticky; top: 0; background: ${C.cream}; z-index: 1; }
        th { padding: 11px 16px; text-align: left; font-family: 'Courier Prime', monospace; font-size: 10px; font-weight: 700; color: ${C.walnut}; letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 1px solid ${C.parchment}; white-space: nowrap; }
        td { padding: 10px 16px; border-bottom: 1px solid ${C.linen}; color: ${C.espresso}; font-family: 'DM Sans', sans-serif; font-size: 13px; white-space: nowrap; max-width: 280px; overflow: hidden; text-overflow: ellipsis; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: rgba(196,98,45,0.04); }
        .null-cell { color: ${C.sand}; font-style: italic; font-size: 12px; }

        .spinner { width: 14px; height: 14px; border: 2px solid rgba(253,250,244,0.25); border-top-color: ${C.cream}; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .clear-btn { background: none; border: none; color: ${C.sand}; font-family: 'Courier Prime', monospace; font-size: 11px; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: color 0.18s; }
        .clear-btn:hover { color: ${C.rust}; }

        @media (max-width: 720px) {
          .layout { flex-direction: column; }
          .sidebar { width: 100%; height: auto; position: static; padding: 18px; }
          .main { padding: 24px 18px 60px; }
        }
      `}</style>

      <div className="layout">
        {/* ───── SIDEBAR ───── */}
        <aside className="sidebar">
          <div>
            <div className="logo-mark">NaturalQL</div>
            <div className="logo-name">Query<br />Studio</div>
            <div className="logo-tagline">Plain English → SQL</div>
          </div>

          <div className="sidebar-divider" />

          <span className="sidebar-label">Database</span>
          <select className="db-select" value={dbType} onChange={e => { setDbType(e.target.value); setDbPath(""); setUploadedDb(null); }}>
            <option value="sqlite">SQLite (file)</option>
            <option value="postgres">PostgreSQL</option>
            <option value="mysql">MySQL</option>
          </select>

          {dbType === "sqlite" && (
            <>
              <button className="upload-btn" onClick={() => fileRef.current.click()} disabled={uploading}>
                {uploading ? <><div className="spinner" style={{ borderTopColor: C.walnut }} /> Uploading…</> : "↑ Upload .db file"}
              </button>
              <input ref={fileRef} type="file" accept=".db,.sqlite,.sqlite3" style={{ display: "none" }} onChange={handleUpload} />
              {uploadedDb && (
                <div className="db-badge">
                  <span>✓</span>
                  <span>{uploadedDb.db_path.split(/[/\\]/).pop()} ({uploadedDb.tables.length} tables)</span>
                </div>
              )}
            </>
          )}

          {(dbType === "postgres" || dbType === "mysql") && (
            <RemoteDbForm dbType={dbType} onConnect={dsn => setDbPath(dsn)} />
          )}

          <div className="sidebar-divider" />

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span className="sidebar-label" style={{ marginBottom: 0 }}>History</span>
              {queryHistory.length > 0 && (
                <button className="clear-btn" style={{ fontSize: 10 }} onClick={() => { setQueryHistory([]); setHistory([]); setResult(null); setError(null); setShowSuggestions(true); }}>clear</button>
              )}
            </div>
            {queryHistory.length === 0 && <div style={{ fontSize: 12, color: C.sand, fontStyle: "italic" }}>No queries yet</div>}
            {queryHistory.map((h, i) => (
              <button key={i} className="history-btn" onClick={() => { setQuestion(h.question); }}>
                <div className="history-q">{h.question.slice(0, 50)}{h.question.length > 50 ? "…" : ""}</div>
                <div className="history-meta">{h.row_count} rows · {h.ts}</div>
              </button>
            ))}
          </div>
        </aside>

        {/* ───── MAIN ───── */}
        <main className="main">
          <h1 className="page-title">Ask your database<br />in <em>plain English</em></h1>
          <p className="page-sub">Connect a database, type any question — get SQL and results instantly.</p>

          {/* Query card */}
          <div className="query-card">
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Which customers from the USA placed the most orders this year?"
              rows={3}
            />
            <div className="query-footer">
              <span className="kbd-hint">Ctrl / ⌘ + Enter to run</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {history.length > 0 && (
                  <button className="clear-btn" onClick={() => { setHistory([]); setResult(null); setError(null); setShowSuggestions(true); }}>
                    clear session
                  </button>
                )}
                <button className="run-btn" onClick={handleSubmit} disabled={loading || !question.trim()}>
                  {loading ? <><div className="spinner" /> Running…</> : "Run Query →"}
                </button>
              </div>
            </div>
          </div>

          {/* Suggestions */}
          {showSuggestions && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className="chip" onClick={() => { setQuestion(s); runQuery(s); }}>{s}</button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && <div className="error-box">⚠ {error}</div>}

          {/* Results */}
          {result && (
            <div className="result-panel" ref={resultRef}>
              <span className="section-label">Generated SQL</span>
              <div className="sql-card">
                <span>{result.sql}</span>
                <CopyBtn text={result.sql} />
              </div>

              <div className="result-bar">
                <span className="result-title">Results</span>
                <span className="pill g">{result.row_count} rows</span>
                {result.rows.length > 0 && (
                  <button className="icon-btn" onClick={() => exportCSV(result.rows, columns)}>↓ Export CSV</button>
                )}
              </div>

              {result.rows.length === 0 ? (
                <div style={{ padding: "28px 0", color: C.sand, fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 14 }}>No rows returned.</div>
              ) : (
                <>
                  {availableViews.length > 1 && (
                    <div className="view-toggle">
                      {availableViews.map(v => (
                        <button key={v} className={`view-btn ${viewMode === v ? "active" : ""}`} onClick={() => setViewMode(v)}>
                          {VIEW_LABELS[v]}
                        </button>
                      ))}
                    </div>
                  )}

                  {viewMode === "bar" && <div className="chart-card"><BarChart rows={result.rows} columns={columns} /></div>}
                  {viewMode === "line" && <div className="chart-card"><LineChart rows={result.rows} columns={columns} /></div>}
                  {viewMode === "donut" && <div className="chart-card"><DonutChart rows={result.rows} columns={columns} /></div>}
                  {viewMode === "stats" && <div className="chart-card"><StatCards rows={result.rows} columns={columns} /></div>}
                  {viewMode === "table" && (
                    <div className="table-wrap">
                      <table>
                        <thead><tr>{columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
                        <tbody>
                          {result.rows.map((row, i) => (
                            <tr key={i}>
                              {columns.map(c => (
                                <td key={c} title={row[c] != null ? String(row[c]) : "null"}>
                                  {row[c] == null ? <span className="null-cell">null</span> : String(row[c])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
