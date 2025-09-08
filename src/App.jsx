import React, { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,   // ← use this instead of BarChart
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Line,
} from "recharts";

// -----------------------------
// Budget Planner — Sellable MVP
// -----------------------------

const STORAGE_KEY = "budget.transactions.v1";
const STORAGE_KEY_CURRENCY = "budget.currency.v1"; // 'KES' | 'USD'

const pastelPalette = [
  "#BDE0FE","#FFC8DD","#CDEAC0","#FFD6A5","#E0BBE4",
  "#FDE2E4","#D7E3FC","#B8E0D2","#F9F1A5","#F1C0E8",
];

const defaultCategories = [
  { id: "salary", label: "Salary", type: "income" },
  { id: "freelance", label: "Freelance", type: "income" },
  { id: "other_inc", label: "Other Income", type: "income" },
  { id: "food", label: "Food & Groceries", type: "expense" },
  { id: "transport", label: "Transport", type: "expense" },
  { id: "rent", label: "Rent", type: "expense" },
  { id: "utilities", label: "Utilities", type: "expense" },
  { id: "entertainment", label: "Entertainment", type: "expense" },
  { id: "health", label: "Health", type: "expense" },
  { id: "savings", label: "Savings", type: "expense" },
  { id: "airtime", label: "Data / Airtime", type: "expense" },
  { id: "school", label: "School Fees", type: "expense" },
  { id: "charity", label: "Tithes / Charity", type: "expense" },
];

function formatCurrency(n, currency) {
  if (Number.isNaN(Number(n))) return "0";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(n));
  } catch {
    return `${currency} ${Number(n).toFixed(2)}`;
  }
}
function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

const GLOBAL_CSS = `
  *{box-sizing:border-box} html,body,#root{height:100%}
  body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,"Helvetica Neue",Arial,"Noto Sans","Apple Color Emoji","Segoe UI Emoji";color:#24324a;background:linear-gradient(180deg,#F8FBFF,#FFF9FB)}
  .page{max-width:1100px;margin:0 auto;padding:24px 16px 48px}
  .header{display:flex;gap:16px;align-items:center;justify-content:space-between;margin-bottom:16px}
  .header h1{margin:0;font-size:24px} .header p{margin:4px 0 0;color:#6b7280;font-size:14px}
  .header-actions select{appearance:none;background:#fff;border:1px solid #e5e7eb;padding:8px 10px;border-radius:10px;box-shadow:0 1px 1px rgba(0,0,0,.03)} .header-actions .btn{margin-left:6px}
  .kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
  @media (max-width:900px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media (max-width:520px){.kpis{grid-template-columns:1fr}}
  .kpi{background:rgba(255,255,255,.7);border:1px solid #eef2f7;padding:14px 14px 12px;border-radius:14px;box-shadow:0 4px 14px rgba(23,30,60,.04)}
  .kpiTitle{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px}
  .kpiValue{font-size:22px;font-weight:600}
  .kpiBar{margin-top:10px;height:6px;width:100%;background:#f3f4f6;border-radius:999px;overflow:hidden}
  .kpiBar span{display:block;height:100%;width:100%;background:var(--bar,#BDE0FE)}
  .card{background:rgba(255,255,255,.8);border:1px solid #eef2f7;border-radius:16px;padding:16px;margin-top:16px;box-shadow:0 6px 18px rgba(23,30,60,.05)}
  .card h2{margin:0 0 12px;font-size:18px;color:#374151}
  .form{display:grid;gap:12px}
  .grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  @media (max-width:520px){.grid2{grid-template-columns:1fr}}
  .field label{display:block;font-size:12px;color:#6b7280;margin-bottom:6px}
  .field input,.field select{width:100%;padding:10px 12px;border-radius:10px;border:1px solid #e5e7eb;background:#fff}
  .actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}
  .btn{padding:10px 14px;border-radius:10px;border:1px solid transparent;cursor:pointer;font-weight:600}
  .btn.primary{background:#E0BBE4;color:#24324a}
  .btn.secondary{background:#fff;border-color:#e5e7eb;color:#374151}
  .btn.danger{background:#FDE2E4;color:#7f1d1d}
  .btn.small{padding:6px 10px;font-size:12px}
  .gridCharts{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  @media (max-width:900px){.gridCharts{grid-template-columns:1fr}}
  .chartBox{width:100%;height:260px}
  .tableWrap{overflow-x:auto}
  table{width:100%;border-collapse:collapse;font-size:14px}
  thead th{text-align:left;color:#6b7280;font-weight:600;padding:10px 8px;border-bottom:1px solid #eef2f7}
  tbody td{padding:10px 8px;border-bottom:1px solid #f3f4f6}
  td.right,th.right{text-align:right}
  .strong{font-weight:600;color:#111827}
  .muted{color:#6b7280}
  .rowActions{display:flex;justify-content:flex-end;gap:6px}
  .pill{padding:3px 8px;border-radius:999px;font-size:12px;border:1px solid #e5e7eb}
  .pill.inc{background:#D7E3FC;color:#111827}
  .pill.exp{background:#FDE2E4;color:#111827}
  .empty{display:flex;align-items:center;justify-content:center;height:200px;border:1px dashed #e5e7eb;border-radius:12px;color:#6b7280;background:rgba(255,255,255,.6)}
  .footer{margin-top:16px;text-align:center;color:#6b7280;font-size:12px}
`;

export default function App() {
  const [transactions, setTransactions] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [currency, setCurrency] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY_CURRENCY) || "KES"; }
    catch { return "KES"; }
  });
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [form, setForm] = useState({
    type: "expense",
    amount: "",
    category: "food",
    date: new Date().toISOString().slice(0, 10),
    note: "",
    id: null,
  });
// ---- PWA install prompt support ----
const [installEvt, setInstallEvt] = useState(null);

useEffect(() => {
  const onPrompt = (e) => { e.preventDefault(); setInstallEvt(e); };
  const onInstalled = () => setInstallEvt(null);

  window.addEventListener('beforeinstallprompt', onPrompt);
  window.addEventListener('appinstalled', onInstalled);
  return () => {
    window.removeEventListener('beforeinstallprompt', onPrompt);
    window.removeEventListener('appinstalled', onInstalled);
  };
}, []);

const doInstall = async () => {
  if (!installEvt) return;
  installEvt.prompt();
  await installEvt.userChoice;
  setInstallEvt(null);
};

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY_CURRENCY, currency); } catch {} }, [currency]);

  const txByMonth = useMemo(() => {
    const groups = new Map();
    for (const t of transactions) {
      const key = monthKey(t.date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(t);
    }
    return groups;
  }, [transactions]);

  const currentMonthTx = useMemo(() => txByMonth.get(filterMonth) || [], [txByMonth, filterMonth]);

  const { incomeThisMonth, expenseThisMonth, balanceThisMonth } = useMemo(() => {
    const inc = currentMonthTx.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const exp = currentMonthTx.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return { incomeThisMonth: inc, expenseThisMonth: exp, balanceThisMonth: inc - exp };
  }, [currentMonthTx]);

  const categorySummary = useMemo(() => {
    const map = new Map();
    for (const t of currentMonthTx.filter(t => t.type === "expense")) {
      const label = (defaultCategories.find(c => c.id === t.category)?.label) || t.category || "Other";
      map.set(label, (map.get(label) || 0) + Number(t.amount));
    }
    return Array.from(map.entries()).map(([name, value], idx) => ({ name, value, fill: pastelPalette[idx % pastelPalette.length] }));
  }, [currentMonthTx]);

  const last12Monthly = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      const label = d.toLocaleDateString(undefined, { month: "short" });
      const txs = txByMonth.get(key) || [];
      const income = txs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const expense = txs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      months.push({ key, label, income, expense, balance: income - expense });
    }
    return months;
  }, [txByMonth]);

  function resetForm() {
    setForm({ type: "expense", amount: "", category: "food", date: new Date().toISOString().slice(0, 10), note: "", id: null });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return alert("Please enter a valid amount.");
    if (!form.date) return alert("Please select a date.");
    const id =
      (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : String(Date.now() + Math.random()); // safe fallback
    const tx = {
      id,
      type: form.type,
      amount: Number(form.amount),
      category: form.category,
      date: new Date(form.date).toISOString(),
      note: form.note?.trim() || "",
    };
    if (form.id) setTransactions(prev => prev.map(p => (p.id === form.id ? tx : p)));
    else setTransactions(prev => [tx, ...prev]);
    resetForm();
  }

  function handleEdit(t) {
    setForm({
      id: t.id, type: t.type, amount: t.amount, category: t.category,
      date: t.date.slice(0, 10), note: t.note || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function handleDelete(id) {
    if (confirm("Delete this transaction?")) setTransactions(prev => prev.filter(t => t.id !== id));
  }
  function exportJson() {
    try {
      const data = JSON.stringify({ transactions: JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") }, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "budget-data.json"; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert("Export failed: " + e.message); }
  }
  function importJson(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result || "{}"));
        if (!obj || !Array.isArray(obj.transactions)) throw new Error("Invalid file: missing transactions[]");
        const valid = obj.transactions.filter(t => t && typeof t.type === 'string' && (t.type==='income'||t.type==='expense') && t.amount!=null && t.date);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
        window.location.reload();
      } catch (e) { alert("Import failed: " + e.message); }
    };
    reader.readAsText(file);
  }

  const monthOptions = useMemo(() => {
    const keys = new Set([...txByMonth.keys(), filterMonth]);
    return Array.from(keys).sort().map(k => ({ value: k, label: monthLabel(k) }));
  }, [txByMonth, filterMonth]);
  const categoriesForType = defaultCategories.filter(c => c.type === form.type);

  return (
    <div className="page">
      <style>{GLOBAL_CSS}</style>

      <header className="header">
        <div>
          <h1>Budget Planner</h1>
        <p>Track income & expenses. Data stays on your device.</p>
        </div>
       <div className="header-actions" style={{display:'flex', gap:8}}>
  <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
    {monthOptions.map(m => (
      <option key={m.value} value={m.value}>{m.label}</option>
    ))}
  </select>

  <select value={currency} onChange={(e)=> setCurrency(e.target.value)} title="Currency">
    <option value="KES">KES</option>
    <option value="USD">USD</option>
  </select>

  {/* Install button shows only when installable and not already installed */}
  {installEvt && (
    <button className="btn primary" onClick={doInstall}>Install App</button>
  )}

  <button className="btn secondary" onClick={exportJson}>Export</button>
  <label className="btn secondary" style={{display:'inline-block'}}>
    Import
    <input type="file" accept="application/json" onChange={importJson} style={{display:'none'}} />
  </label>
</div>

      </header>

      <section className="kpis">
        <KPI title="Income (month)"   value={formatCurrency(incomeThisMonth,  currency)} color="#BDE0FE" />
        <KPI title="Expenses (month)" value={formatCurrency(expenseThisMonth, currency)} color="#FFC8DD" />
        <KPI title="Balance (month)"  value={formatCurrency(balanceThisMonth,  currency)} color="#CDEAC0" />
        <KPI title="Transactions"     value={String(currentMonthTx.length)}     color="#FFD6A5" />
      </section>

      <section className="card">
        <h2>{form.id ? "Edit transaction" : "Add transaction"}</h2>
        <form className="form" onSubmit={handleSubmit}>
          <div className="grid2">
            <div className="field">
              <label>Type</label>
              <select value={form.type} onChange={(e) => {
                const v = e.target.value;
                setForm(prev => ({ ...prev, type: v, category: v === "income" ? "salary" : "food" }));
              }}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div className="field">
              <label>Amount</label>
              <input type="number" min="0" step="0.01" value={form.amount}
                     onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))} placeholder="0.00" />
            </div>
          </div>

          <div className="grid2">
            <div className="field">
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}>
                {categoriesForType.map(c => (<option key={c.id} value={c.id}>{c.label}</option>))}
              </select>
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))} />
            </div>
          </div>

          <div className="field">
            <label>Note (optional)</label>
            <input value={form.note} onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))} placeholder="e.g., Lunch, invoice #123" />
          </div>

          <div className="actions">
            {form.id && (<button type="button" className="btn secondary" onClick={resetForm}>Cancel</button>)}
            <button className="btn primary" type="submit">{form.id ? "Save changes" : "Add transaction"}</button>
          </div>
        </form>
      </section>

      <section className="gridCharts">
        <div className="card">
          <h2>Expense by Category</h2>
          {categorySummary.length === 0 ? (
            <EmptyState hint="Add an expense to see category breakdown." />
          ) : (
            <div className="chartBox">
              <ResponsiveContainer>
                <PieChart>
                  <Pie dataKey="value" data={categorySummary} innerRadius={60} outerRadius={90} paddingAngle={2} label>
                    {categorySummary.map((d, i) => (<Cell key={i} fill={d.fill} />))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v, currency)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="card">
          <h2>Last 12 Months</h2>
          <div className="chartBox">
            <ResponsiveContainer>
              <ComposedChart data={last12Monthly} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(v) => formatCurrency(v, currency)} />
                <Legend />
                <Bar dataKey="income" name="Income" />
                <Bar dataKey="expense" name="Expense" />
                <Line type="monotone" dataKey="balance" name="Balance" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Transactions — {monthLabel(filterMonth)}</h2>
        {currentMonthTx.length === 0 ? (
          <EmptyState hint="No transactions yet this month. Use the form above to add one." />
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Type</th><th>Category</th><th>Note</th>
                  <th className="right">Amount</th><th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentMonthTx.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).map((t)=>(
                  <tr key={t.id}>
                    <td>{new Date(t.date).toLocaleDateString()}</td>
                    <td><span className={`pill ${t.type==="income"?"inc":"exp"}`}>{t.type}</span></td>
                    <td>{defaultCategories.find(c=>c.id===t.category)?.label || t.category}</td>
                    <td className="muted">{t.note || "—"}</td>
                    <td className="right strong">{formatCurrency(t.amount, currency)}</td>
                    <td className="right">
                      <div className="rowActions">
                        <button className="btn small" onClick={()=>handleEdit(t)}>Edit</button>
                        <button className="btn danger small" onClick={()=>handleDelete(t.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="footer">Tip: Export your data to back it up or move to another device. (Data stays local unless you export.)</footer>
    </div>
  );
}

function KPI({ title, value, color }) {
  return (
    <div className="kpi" style={{ ['--bar']: color }}>
      <div className="kpiTitle">{title}</div>
      <div className="kpiValue">{value}</div>
      <div className="kpiBar"><span /></div>
    </div>
  );
}
function EmptyState({ hint }) {
  return <div className="empty">{hint}</div>;
}

// Dev-time quick checks
function runDevChecks() {
  try {
    console.assert(monthKey("2025-09-01") === "2025-09", "monthKey basic failed");
    console.assert(monthLabel("2025-09").toLowerCase().includes("sep"), "monthLabel looks wrong");
    console.assert(formatCurrency(0, 'KES').includes("0"), "formatCurrency(0) should include 0");
    console.assert(typeof formatCurrency(1234.56, 'USD') === 'string', "formatCurrency should return a string");
    console.assert(monthKey("2025-01-31") === "2025-01", "monthKey end-of-month failed");
    console.assert(formatCurrency(100, 'USD') !== formatCurrency(100, 'KES'), "USD vs KES should format differently");
    console.assert(Array.isArray(pastelPalette) && pastelPalette.length >= 6, "palette length");
    console.assert(defaultCategories.some(c => c.id === 'airtime'), "needs airtime");
    console.assert(defaultCategories.some(c => c.id === 'school'), "needs school");
    console.assert(defaultCategories.some(c => c.id === 'charity'), "needs charity");
    const sampleTx = [
      { date: "2025-09-10", type: "income", amount: 100, category: "salary" },
      { date: "2025-09-12", type: "expense", amount: 40, category: "food" },
      { date: "2025-08-20", type: "expense", amount: 10, category: "transport" },
    ];
    const mk = (arr) => arr.reduce((m, t) => { const k = monthKey(t.date); m[k] = (m[k]||0)+1; return m; }, {});
    const grouped = mk(sampleTx);
    console.assert(grouped["2025-09"] === 2 && grouped["2025-08"] === 1, "grouping by month failed");
    console.log("✅ Dev checks passed");
  } catch (e) { console.warn("⚠️ Dev checks issue:", e); }
}

try {
  const isDev = (
    (typeof import.meta !== "undefined" && import.meta?.env?.DEV) ||
    (typeof process !== "undefined" && process?.env?.NODE_ENV === "development")
  );
  if (isDev) runDevChecks();
} catch {}

