"use client";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";

// ─── Theme ─────────────────────────────────────────────────────────────────
const G = {
  darkest: "#0a1f12",
  dark:    "#0f2d1a",
  mid:     "#1a4a2e",
  light:   "#2d6e44",
  soft:    "#4a8c5c",
  mint:    "#e8f5ed",
  gold:    "#b8922a",
  goldLt:  "#d4a843",
  bg:      "#f0f6f2",
  card:    "#ffffff",
  border:  "#d4e8da",
  text:    "#0d1f14",
  muted:   "#5a7a65",
  red:     "#dc2626",
};

const STATUSES = {
  quote:       { label:"Quoted",      bg:"#fffbeb", text:"#92400e",  dot:"#f59e0b", calCls:"bg-amber-50 text-amber-800 border-l-2 border-amber-400" },
  open:        { label:"Open",        bg:"#f0fdf4", text:"#14532d",  dot:"#22c55e", calCls:"bg-green-50 text-green-800 border-l-2 border-green-500" },
  in_progress: { label:"In Progress", bg:"#ecfdf5", text:"#064e3b",  dot:"#10b981", calCls:"bg-emerald-50 text-emerald-800 border-l-2 border-emerald-500" },
  won:         { label:"Won \u2713",  bg:"#dcfce7", text:"#14532d",  dot:"#16a34a", calCls:"bg-green-100 text-green-900 border-l-2 border-green-700" },
  lost:        { label:"Lost",        bg:"#f9fafb", text:"#6b7280",  dot:"#9ca3af", calCls:"bg-gray-100 text-gray-500 border-l-2 border-gray-300" },
};
const WEEKDAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const WEEKDAYS_S = ["S","M","T","W","T","F","S"];
const MO_NAMES   = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MATERIALS  = ["Granite","Quartz","Marble","Quartzite","Soapstone","Laminate","Butcher Block","Concrete","Other"];
const JOB_TYPES  = ["Kitchen","Bathroom","Laundry Room","Outdoor Kitchen","Bar","Office","Other"];

const SEED = [
  { id:1,  customer:"Smith Residence",   jobType:"Kitchen",         material:"Quartz",    status:"open",        amount:4800,  sqft:45,  start:"2026-03-15", close:"2026-04-20", notes:"White quartz, undermount sink",  address:"Austin, TX",        lat:30.2672, lng:-97.7431, createdAt:"2026-02-10" },
  { id:2,  customer:"Rodriguez Family",  jobType:"Bathroom",        material:"Marble",    status:"quote",       amount:2200,  sqft:28,  start:"2026-04-01", close:"2026-05-10", notes:"Carrara marble, two vanities",   address:"Houston, TX",       lat:29.7604, lng:-95.3698, createdAt:"2026-02-18" },
  { id:3,  customer:"Thompson Build",    jobType:"Kitchen",         material:"Granite",   status:"won",         amount:6500,  sqft:62,  start:"2026-02-10", close:"2026-03-28", notes:"Black galaxy granite",           address:"Dallas, TX",        lat:32.7767, lng:-96.7970, createdAt:"2026-01-10" },
  { id:4,  customer:"Chen Residence",    jobType:"Outdoor Kitchen", material:"Granite",   status:"in_progress", amount:8200,  sqft:80,  start:"2026-03-20", close:"2026-05-15", notes:"Weather-resistant granite",      address:"San Antonio, TX",   lat:29.4241, lng:-98.4936, createdAt:"2026-03-01" },
  { id:5,  customer:"Williams Builders", jobType:"Kitchen",         material:"Quartz",    status:"quote",       amount:12400, sqft:140, start:"2026-04-10", close:"2026-06-01", notes:"4 units, new construction",      address:"Fort Worth, TX",    lat:32.7555, lng:-97.3308, createdAt:"2026-02-25" },
  { id:6,  customer:"Patel Home",        jobType:"Kitchen",         material:"Quartzite", status:"open",        amount:5600,  sqft:55,  start:"2026-04-05", close:"2026-05-20", notes:"Super White quartzite",          address:"Plano, TX",         lat:33.0198, lng:-96.6989, createdAt:"2026-03-10" },
  { id:7,  customer:"Anderson Project",  jobType:"Bar",             material:"Concrete",  status:"lost",        amount:3100,  sqft:30,  start:"2026-03-01", close:"2026-04-15", notes:"Custom concrete bar top",        address:"Arlington, TX",     lat:32.7357, lng:-97.1081, createdAt:"2026-02-15" },
  { id:8,  customer:"Martinez LLC",      jobType:"Kitchen",         material:"Quartz",    status:"won",         amount:9800,  sqft:95,  start:"2026-01-15", close:"2026-02-28", notes:"Commercial remodel",             address:"Corpus Christi, TX",lat:27.8006, lng:-97.3964, createdAt:"2026-01-01" },
  { id:9,  customer:"Hayes Residence",   jobType:"Bathroom",        material:"Marble",    status:"quote",       amount:3400,  sqft:32,  start:"2026-04-12", close:"2026-06-15", notes:"Master bath, double vanity",     address:"Lubbock, TX",       lat:33.5779, lng:-101.855, createdAt:"2026-02-12" },
  { id:10, customer:"Griffin Builders",  jobType:"Kitchen",         material:"Quartz",    status:"in_progress", amount:7200,  sqft:75,  start:"2026-03-25", close:"2026-05-30", notes:"New build, 3 kitchens",          address:"El Paso, TX",       lat:31.7619, lng:-106.485, createdAt:"2026-03-05" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmt$ = v => "$" + (v||0).toLocaleString();
const fmtDate = d => { if(!d) return "—"; const p=d.split("-"); return `${p[1]}/${p[2]}/${p[0].slice(2)}`; };
const addDays = (iso, n) => { const d=new Date(iso+"T12:00:00"); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; };
const today   = () => new Date().toISOString().split("T")[0];

function rowToJob(r) {
  return {
    id:        r.id,
    customer:  r.customer||"",
    jobType:   r.job_type||"",
    material:  r.material||"",
    status:    r.status||"quote",
    amount:    parseFloat(r.amount)||0,
    sqft:      parseFloat(r.sqft)||0,
    start:     r.start_date||"",
    close:     r.close_date||"",
    notes:     r.notes||"",
    address:   r.address||"",
    lat:       r.lat ? parseFloat(r.lat) : null,
    lng:       r.lng ? parseFloat(r.lng) : null,
    createdAt: r.created_at||today(),
  };
}
function jobToRow(j) {
  return {
    id:         j.id,
    customer:   j.customer,
    job_type:   j.jobType||null,
    material:   j.material||null,
    status:     j.status,
    amount:     j.amount||0,
    sqft:       j.sqft||0,
    start_date: j.start||null,
    close_date: j.close||null,
    notes:      j.notes||null,
    address:    j.address||null,
    lat:        j.lat||null,
    lng:        j.lng||null,
    created_at: j.createdAt||today(),
  };
}

// ─── Excel Import Parser ──────────────────────────────────────────────────
const loadXLSX = () => new Promise((resolve, reject) => {
  if (window.XLSX) { resolve(window.XLSX); return; }
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
  s.onload  = () => resolve(window.XLSX);
  s.onerror = () => reject(new Error("Failed to load XLSX library"));
  document.head.appendChild(s);
});

function parseImportSheet(worksheet, XLSX) {
  const raw = XLSX.utils.sheet_to_json(worksheet, { header:1, defval:null, raw:false });
  // Find header row
  let hRow = -1;
  for (let i = 0; i < Math.min(15, raw.length); i++) {
    if (raw[i] && raw[i].some(c => c && (String(c).includes("Quote") || String(c).includes("Bill To")))) {
      hRow = i; break;
    }
  }
  if (hRow < 0) return { jobs:[], errors:["Could not find header row. Expected columns: Quote #, Bill To Customer, etc."] };

  const headers = raw[hRow].map(h => h ? String(h).trim() : "");
  const ci = {
    quote:    headers.findIndex(h => h.includes("Quote")),
    date:     headers.findIndex(h => h.includes("Date")),
    customer: headers.findIndex(h => h.includes("Bill To")),
    jobName:  headers.findIndex(h => h.includes("Job Name")),
    projType: headers.findIndex(h => h.includes("Project Type")),
    status:   headers.findIndex(h => h === "Status"),
    total:    headers.findIndex(h => h === "Total"),
  };

  const jobs = [], errors = [];
  let i = hRow + 1;
  while (i < raw.length) {
    const row = raw[i];
    if (!row) { i++; continue; }
    const quoteRaw = ci.quote >= 0 ? row[ci.quote] : null;
    if (!quoteRaw || !String(quoteRaw).trim()) { i++; continue; }

    const quoteStr = String(quoteRaw).trim();
    // Generate stable numeric ID: "10448-1" -> 1044801
    const parts = quoteStr.split("-");
    const numId  = (parseInt(parts[0])||0) * 100 + (parseInt(parts[1])||1);

    const customer  = ci.customer >= 0 && row[ci.customer] ? String(row[ci.customer]).trim() : "Unknown";
    const address1  = ci.jobName  >= 0 && row[ci.jobName]  ? String(row[ci.jobName]).trim()  : "";
    const projType  = ci.projType >= 0 && row[ci.projType] ? String(row[ci.projType]).trim()  : "";
    const statusRaw = ci.status   >= 0 && row[ci.status]   ? String(row[ci.status]).trim()    : "";
    const totalRaw  = ci.total    >= 0 && row[ci.total]    ? row[ci.total]                    : 0;
    const dateRaw   = ci.date     >= 0 && row[ci.date]     ? String(row[ci.date]).trim()       : "";

    // City from the NEXT row (alternating pattern)
    let city = "";
    if (i + 1 < raw.length) {
      const next = raw[i+1];
      if (next && ci.quote >= 0 && !next[ci.quote] && ci.jobName >= 0 && next[ci.jobName]) {
        city = String(next[ci.jobName]).trim();
      }
    }

    const address = [address1, city].filter(Boolean).join(", ");
    const status  = statusRaw.toLowerCase().includes("accept") ? "open" : "quote";
    const amount  = parseFloat(String(totalRaw).replace(/[$,]/g,""))||0;

    // Parse start date
    let startDate = today();
    if (dateRaw) {
      const d = new Date(dateRaw);
      if (!isNaN(d.getTime())) startDate = d.toISOString().split("T")[0];
    }
    const closeDate = status === "open" ? addDays(startDate, 21) : addDays(startDate, 30);

    // Material hint from project type
    let material = "Other";
    const pt = projType.toLowerCase();
    if (pt.includes("granite"))      material = "Granite";
    else if (pt.includes("quartz"))  material = "Quartz";
    else if (pt.includes("marble"))  material = "Marble";

    jobs.push({
      id:        numId,
      customer,
      jobType:   "Kitchen",
      material,
      status,
      amount,
      sqft:      0,
      start:     startDate,
      close:     closeDate,
      notes:     `Quote #${quoteStr} | ${projType}`.trim(),
      address,
      lat:       null,
      lng:       null,
      createdAt: today(),
    });
    i++;
  }
  return { jobs, errors };
}

// ─── Small UI Components ──────────────────────────────────────────────────
function Badge({ status }) {
  const s = STATUSES[status] || STATUSES.quote;
  return (
    <span style={{ background:s.bg, color:s.text, display:"inline-flex", alignItems:"center", gap:4, padding:"2px 10px", borderRadius:99, fontSize:12, fontWeight:600 }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.dot, display:"inline-block" }} />
      {s.label}
    </span>
  );
}

function Btn({ children, onClick, variant="primary", small, disabled, style={} }) {
  const base = {
    border:"none", cursor: disabled?"not-allowed":"pointer", borderRadius:10, fontWeight:600,
    padding: small ? "6px 14px" : "10px 20px", fontSize: small ? 13 : 14,
    transition:"all .15s", opacity: disabled ? .5 : 1,
    display:"inline-flex", alignItems:"center", gap:6, ...style,
  };
  const variants = {
    primary: { background:`linear-gradient(135deg, ${G.light} 0%, ${G.mid} 100%)`, color:"#fff", boxShadow:`0 2px 8px ${G.light}55` },
    gold:    { background:`linear-gradient(135deg, ${G.goldLt} 0%, ${G.gold} 100%)`, color:"#fff", boxShadow:`0 2px 8px ${G.gold}55` },
    ghost:   { background:"transparent", color:G.light, border:`1.5px solid ${G.border}` },
    danger:  { background:"#fef2f2", color:G.red, border:`1.5px solid #fecaca` },
  };
  return <button style={{...base,...variants[variant]}} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Input({ label, value, onChange, type="text", required, placeholder }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      {label && <label style={{ fontSize:12, fontWeight:600, color:G.muted, textTransform:"uppercase", letterSpacing:.5 }}>{label}{required&&<span style={{color:G.red}}> *</span>}</label>}
      <input
        type={type} value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder}
        style={{ padding:"10px 14px", borderRadius:10, border:`1.5px solid ${G.border}`, fontSize:14,
          background:G.card, color:G.text, outline:"none", width:"100%", boxSizing:"border-box",
          transition:"border .15s" }}
        onFocus={e=>e.target.style.borderColor=G.light}
        onBlur={e=>e.target.style.borderColor=G.border}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      {label && <label style={{ fontSize:12, fontWeight:600, color:G.muted, textTransform:"uppercase", letterSpacing:.5 }}>{label}{required&&<span style={{color:G.red}}> *</span>}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ padding:"10px 14px", borderRadius:10, border:`1.5px solid ${G.border}`, fontSize:14,
          background:G.card, color:G.text, outline:"none", width:"100%", boxSizing:"border-box" }}>
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ─── Job Form Modal ──────────────────────────────────────────────────────
const BLANK = { customer:"", jobType:"Kitchen", material:"Quartz", status:"quote", amount:"", sqft:"", start:"", close:"", notes:"", address:"" };

function JobModal({ job, onSave, onClose }) {
  const [f, setF]         = useState(job ? {
    customer:job.customer, jobType:job.jobType||"Kitchen", material:job.material||"Quartz",
    status:job.status, amount:String(job.amount||""), sqft:String(job.sqft||""),
    start:job.start||"", close:job.close||"", notes:job.notes||"", address:job.address||"",
  } : { ...BLANK, start:today() });
  const [saving,  setSaving]  = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const set = k => v => setF(p=>({...p,[k]:v}));

  const handleSubmit = async () => {
    if (!f.customer.trim()) return;
    setSaving(true); setSaveErr("");
    try {
      await onSave({ ...f, amount:parseFloat(f.amount)||0, sqft:parseFloat(f.sqft)||0 });
    } catch(e) {
      setSaveErr(e?.message || String(e));
      setSaving(false);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:G.card, borderRadius:20, padding:28, width:"100%", maxWidth:540, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.3)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:G.text }}>{job?"Edit Job":"Add New Job"}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:G.muted, lineHeight:1 }}>&times;</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div style={{ gridColumn:"1/-1" }}><Input label="Customer Name" value={f.customer} onChange={set("customer")} required placeholder="e.g. Smith Residence" /></div>
          <Select label="Job Type" value={f.jobType} onChange={set("jobType")} options={JOB_TYPES} />
          <Select label="Material" value={f.material} onChange={set("material")} options={MATERIALS} />
          <Select label="Status" value={f.status} onChange={set("status")} options={Object.keys(STATUSES)} />
          <Input label="Amount ($)" value={f.amount} onChange={set("amount")} type="number" placeholder="0" />
          <Input label="Sq Ft" value={f.sqft} onChange={set("sqft")} type="number" placeholder="0" />
          <Input label="Start Date" value={f.start} onChange={set("start")} type="date" />
          <Input label="Close Date" value={f.close} onChange={set("close")} type="date" />
          <div style={{ gridColumn:"1/-1" }}><Input label="Address / City" value={f.address} onChange={set("address")} placeholder="e.g. Austin, TX" /></div>
          <div style={{ gridColumn:"1/-1" }}><Input label="Notes" value={f.notes} onChange={set("notes")} placeholder="Optional notes..." /></div>
        </div>
        {saveErr && (
          <div style={{ marginTop:14, padding:"10px 14px", background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:10, fontSize:13, color:G.red }}>
            ⚠ Save failed: {saveErr}
          </div>
        )}
        <div style={{ display:"flex", gap:10, marginTop:22, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
          <Btn onClick={handleSubmit} disabled={!f.customer.trim() || saving}>
            {saving ? "Saving..." : job ? "Save Changes" : "Add Job"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────
function Dashboard({ jobs, onAdd }) {
  const stats = useMemo(() => {
    const active = jobs.filter(j=>j.status!=="lost"&&j.status!=="won");
    const pipeline = active.reduce((s,j)=>s+j.amount,0);
    const won = jobs.filter(j=>j.status==="won").reduce((s,j)=>s+j.amount,0);
    const quotes = jobs.filter(j=>j.status==="quote").length;
    const open   = jobs.filter(j=>j.status==="open"||j.status==="in_progress").length;
    return { pipeline, won, quotes, open, total:jobs.length };
  }, [jobs]);

  const recent = useMemo(()=>[...jobs].sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||"")).slice(0,5),[jobs]);

  const Card = ({label,value,sub,icon,grad}) => (
    <div style={{ background:`linear-gradient(135deg, ${grad[0]} 0%, ${grad[1]} 100%)`, borderRadius:18, padding:22, color:"#fff", boxShadow:`0 4px 16px ${grad[0]}44` }}>
      <div style={{ fontSize:28, marginBottom:4 }}>{icon}</div>
      <div style={{ fontSize:28, fontWeight:800, letterSpacing:-1 }}>{value}</div>
      <div style={{ fontSize:13, opacity:.85, marginTop:2 }}>{label}</div>
      {sub && <div style={{ fontSize:12, opacity:.7, marginTop:4 }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={{ margin:0, fontSize:28, fontWeight:800, color:G.text }}>&#9971; Dashboard</h1>
          <p style={{ margin:"4px 0 0", color:G.muted, fontSize:14 }}>Welcome back — here&apos;s your pipeline overview</p>
        </div>
        <Btn onClick={onAdd} variant="gold">&#43; Add Job</Btn>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:16, marginBottom:28 }}>
        <Card label="Active Pipeline" value={fmt$(stats.pipeline)} icon="&#128181;" grad={[G.light, G.mid]} />
        <Card label="Won Revenue" value={fmt$(stats.won)} icon="&#127942;" grad={[G.gold, "#8a6a1a"]} />
        <Card label="Open Quotes" value={stats.quotes} sub="awaiting approval" icon="&#128203;" grad={["#d97706","#b45309"]} />
        <Card label="Active Jobs" value={stats.open} sub="in progress" icon="&#128736;" grad={[G.soft, G.light]} />
        <Card label="Total Jobs" value={stats.total} icon="&#128197;" grad={["#6366f1","#4338ca"]} />
      </div>

      <div style={{ background:G.card, borderRadius:18, padding:22, boxShadow:`0 2px 12px ${G.border}` }}>
        <h2 style={{ margin:"0 0 16px", fontSize:16, fontWeight:700, color:G.text }}>Recent Activity</h2>
        {recent.length === 0 && <p style={{ color:G.muted, fontSize:14 }}>No jobs yet — add one to get started.</p>}
        {recent.map(j => (
          <div key={j.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${G.border}` }}>
            <div>
              <div style={{ fontWeight:600, fontSize:14, color:G.text }}>{j.customer}</div>
              <div style={{ fontSize:12, color:G.muted }}>{j.jobType} &middot; {j.address}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontWeight:700, color:G.light, fontSize:14 }}>{fmt$(j.amount)}</div>
              <Badge status={j.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Jobs List ────────────────────────────────────────────────────────────
function JobsView({ jobs, onAdd, onEdit, onDelete, onBulkDelete }) {
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected,     setSelected]     = useState(new Set());

  const filtered = useMemo(() => jobs.filter(j => {
    const q = search.toLowerCase();
    const matchQ = !q || j.customer.toLowerCase().includes(q) || (j.address||"").toLowerCase().includes(q) || (j.notes||"").toLowerCase().includes(q);
    const matchS  = filterStatus==="all" || j.status===filterStatus;
    return matchQ && matchS;
  }), [jobs, search, filterStatus]);

  // Clear selection when filter changes
  const allIds    = filtered.map(j=>j.id);
  const allChecked = allIds.length > 0 && allIds.every(id=>selected.has(id));
  const someChecked = allIds.some(id=>selected.has(id));

  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(allIds));
  };
  const toggle = id => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const selectedFiltered = allIds.filter(id=>selected.has(id));

  const handleBulk = () => {
    onBulkDelete(selectedFiltered);
    setSelected(new Set());
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:G.text }}>&#128203; Jobs</h1>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {selectedFiltered.length > 0 && (
            <Btn variant="danger" small onClick={handleBulk}>
              &#128465; Delete {selectedFiltered.length} Selected
            </Btn>
          )}
          <Btn onClick={onAdd} variant="gold">&#43; Add Job</Btn>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search jobs..."
          style={{ flex:1, minWidth:180, padding:"9px 14px", borderRadius:10, border:`1.5px solid ${G.border}`, fontSize:14, background:G.card, color:G.text, outline:"none" }} />
        <select value={filterStatus} onChange={e=>{ setFilterStatus(e.target.value); setSelected(new Set()); }}
          style={{ padding:"9px 14px", borderRadius:10, border:`1.5px solid ${G.border}`, fontSize:14, background:G.card, color:G.text, outline:"none" }}>
          <option value="all">All Statuses</option>
          {Object.entries(STATUSES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div style={{ background:G.card, borderRadius:18, overflow:"hidden", boxShadow:`0 2px 12px ${G.border}` }}>
        {/* Select-all header */}
        {filtered.length > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 18px", background:G.mint, borderBottom:`1px solid ${G.border}` }}>
            <input type="checkbox" checked={allChecked} ref={el=>{ if(el) el.indeterminate = someChecked && !allChecked; }}
              onChange={toggleAll}
              style={{ width:16, height:16, cursor:"pointer", accentColor:G.light }} />
            <span style={{ fontSize:12, fontWeight:600, color:G.dark }}>
              {someChecked ? `${selectedFiltered.length} selected` : `${filtered.length} job${filtered.length!==1?"s":""}`}
            </span>
          </div>
        )}

        {filtered.length===0 && <div style={{ padding:32, textAlign:"center", color:G.muted }}>No jobs found</div>}

        {filtered.map((j,idx) => {
          const isChecked = selected.has(j.id);
          return (
            <div key={j.id} style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"12px 18px",
              borderBottom: idx<filtered.length-1?`1px solid ${G.border}`:"none",
              background: isChecked ? G.mint : "white",
              flexWrap:"wrap", gap:8, transition:"background .1s",
            }}>
              <input type="checkbox" checked={isChecked} onChange={()=>toggle(j.id)}
                style={{ width:16, height:16, cursor:"pointer", flexShrink:0, accentColor:G.light }}
                onClick={e=>e.stopPropagation()} />
              <div style={{ flex:1, minWidth:180 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <span style={{ fontWeight:700, fontSize:15, color:G.text }}>{j.customer}</span>
                  <Badge status={j.status} />
                </div>
                <div style={{ fontSize:12, color:G.muted, marginTop:3 }}>
                  {[j.jobType, j.material, j.address].filter(Boolean).join(" · ")}
                </div>
                {j.notes && <div style={{ fontSize:12, color:G.muted, marginTop:2, fontStyle:"italic" }}>{j.notes.slice(0,80)}{j.notes.length>80?"…":""}</div>}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontWeight:800, fontSize:16, color:G.light }}>{fmt$(j.amount)}</div>
                  <div style={{ fontSize:11, color:G.muted }}>{fmtDate(j.start)} → {fmtDate(j.close)}</div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <Btn variant="ghost" small onClick={()=>onEdit(j)}>Edit</Btn>
                  <Btn variant="danger" small onClick={()=>onDelete(j.id)}>&#128465;</Btn>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Customers ───────────────────────────────────────────────────────────
function CustomersView({ jobs }) {
  const customers = useMemo(() => {
    const map = {};
    jobs.forEach(j => {
      if (!map[j.customer]) map[j.customer] = { name:j.customer, jobs:[], total:0 };
      map[j.customer].jobs.push(j);
      map[j.customer].total += j.amount;
    });
    return Object.values(map).sort((a,b)=>b.total-a.total);
  }, [jobs]);

  return (
    <div>
      <h1 style={{ margin:"0 0 20px", fontSize:26, fontWeight:800, color:G.text }}>&#128101; Customers</h1>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
        {customers.map(c => (
          <div key={c.name} style={{ background:G.card, borderRadius:16, padding:18, boxShadow:`0 2px 10px ${G.border}` }}>
            <div style={{ width:42, height:42, borderRadius:"50%", background:`linear-gradient(135deg,${G.light},${G.mid})`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:18, marginBottom:10 }}>
              {c.name[0].toUpperCase()}
            </div>
            <div style={{ fontWeight:700, fontSize:15, color:G.text }}>{c.name}</div>
            <div style={{ fontSize:13, color:G.muted, margin:"3px 0 8px" }}>{c.jobs.length} job{c.jobs.length!==1?"s":""}</div>
            <div style={{ fontWeight:800, fontSize:18, color:G.light }}>{fmt$(c.total)}</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:8 }}>
              {c.jobs.map(j=><Badge key={j.id} status={j.status} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Import Tab ───────────────────────────────────────────────────────────
function ImportView({ onImportDone }) {
  const [dragging,   setDragging]   = useState(false);
  const [file,       setFile]       = useState(null);
  const [parsed,     setParsed]     = useState([]);
  const [errors,     setErrors]     = useState([]);
  const [importing,  setImporting]  = useState(false);
  const [done,       setDone]       = useState(null);
  const [parsing,    setParsing]    = useState(false);
  const inputRef = useRef(null);

  const handleFile = useCallback(async (f) => {
    if (!f) return;
    setFile(f); setParsed([]); setErrors([]); setDone(null); setParsing(true);
    try {
      const XLSX = await loadXLSX();
      const buf  = await f.arrayBuffer();
      const wb   = XLSX.read(buf, { type:"array", cellText:true, cellDates:false });
      const wsName = wb.SheetNames[0];
      const ws   = wb.Sheets[wsName];
      const { jobs, errors:errs } = parseImportSheet(ws, XLSX);
      setParsed(jobs);
      setErrors(errs);
    } catch(e) {
      setErrors([String(e.message||e)]);
    } finally {
      setParsing(false);
    }
  }, []);

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const doImport = async () => {
    if (!parsed.length) return;
    setImporting(true);
    try {
      const payload = parsed.map(j => jobToRow(j));
      const { error } = await supabase.from("jobs").upsert(payload, { onConflict:"id" });
      if (error) throw error;
      setDone({ count:parsed.length });
      onImportDone();
    } catch(e) {
      setErrors(prev=>[...prev, String(e.message||e)]);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => { setFile(null); setParsed([]); setErrors([]); setDone(null); };

  return (
    <div>
      <h1 style={{ margin:"0 0 6px", fontSize:26, fontWeight:800, color:G.text }}>&#8659; Import Jobs</h1>
      <p style={{ margin:"0 0 24px", color:G.muted, fontSize:14 }}>Drag and drop your monthly Excel spreadsheet to sync all jobs automatically.</p>

      {/* Drop Zone */}
      {!file && (
        <div
          onDragOver={e=>{e.preventDefault();setDragging(true);}}
          onDragLeave={()=>setDragging(false)}
          onDrop={onDrop}
          onClick={()=>inputRef.current?.click()}
          style={{
            border: `2.5px dashed ${dragging ? G.light : G.border}`,
            borderRadius:20, padding:"52px 32px", textAlign:"center", cursor:"pointer",
            background: dragging ? G.mint : G.bg, transition:"all .2s",
            boxShadow: dragging ? `0 0 0 4px ${G.light}22` : "none",
          }}>
          <div style={{ fontSize:52, marginBottom:14, filter:dragging?"none":"grayscale(30%)" }}>&#128229;</div>
          <div style={{ fontSize:18, fontWeight:700, color:G.text, marginBottom:6 }}>
            {dragging ? "Drop it!" : "Drop your Excel file here"}
          </div>
          <div style={{ fontSize:13, color:G.muted, marginBottom:18 }}>or click to browse — supports .xlsx, .xls</div>
          <Btn variant="ghost" small>&#128194; Browse File</Btn>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }}
            onChange={e=>{ if(e.target.files[0]) handleFile(e.target.files[0]); }} />
        </div>
      )}

      {/* Parsing indicator */}
      {parsing && (
        <div style={{ textAlign:"center", padding:32, color:G.muted }}>
          <div style={{ fontSize:32, marginBottom:10 }}>&#9881;</div>
          <div>Parsing spreadsheet...</div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{ background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:14, padding:16, marginBottom:16 }}>
          <div style={{ fontWeight:700, color:G.red, marginBottom:6 }}>&#9888; Parsing issues:</div>
          {errors.map((e,i)=><div key={i} style={{ fontSize:13, color:G.red }}>{e}</div>)}
        </div>
      )}

      {/* Success */}
      {done && (
        <div style={{ background:"#f0fdf4", border:`1.5px solid ${G.border}`, borderRadius:14, padding:18, marginBottom:16, textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:8 }}>&#9989;</div>
          <div style={{ fontWeight:700, fontSize:18, color:G.text }}>Import Complete!</div>
          <div style={{ color:G.muted, fontSize:14, marginTop:4 }}>{done.count} jobs synced to your database.</div>
          <div style={{ marginTop:14 }}><Btn variant="ghost" small onClick={reset}>Import Another File</Btn></div>
        </div>
      )}

      {/* Preview Table */}
      {parsed.length > 0 && !done && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <span style={{ fontWeight:700, fontSize:16, color:G.text }}>{parsed.length} jobs found</span>
              <span style={{ fontSize:13, color:G.muted, marginLeft:8 }}>in {file?.name}</span>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <Btn variant="ghost" small onClick={reset}>Clear</Btn>
              <Btn variant="gold" onClick={doImport} disabled={importing}>
                {importing ? "Syncing..." : `&#9650; Sync ${parsed.length} Jobs`}
              </Btn>
            </div>
          </div>
          <div style={{ background:G.card, borderRadius:16, overflow:"hidden", boxShadow:`0 2px 12px ${G.border}` }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:G.mint }}>
                    {["Customer","Address","Status","Amount","Start","Notes"].map(h=>(
                      <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontWeight:700, color:G.dark, fontSize:12, textTransform:"uppercase", letterSpacing:.4 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0,50).map((j,i)=>(
                    <tr key={j.id} style={{ borderTop:`1px solid ${G.border}`, background: i%2===0?"transparent":G.bg }}>
                      <td style={{ padding:"9px 14px", fontWeight:600, color:G.text }}>{j.customer}</td>
                      <td style={{ padding:"9px 14px", color:G.muted }}>{j.address||"—"}</td>
                      <td style={{ padding:"9px 14px" }}><Badge status={j.status} /></td>
                      <td style={{ padding:"9px 14px", fontWeight:700, color:G.light }}>{fmt$(j.amount)}</td>
                      <td style={{ padding:"9px 14px", color:G.muted }}>{fmtDate(j.start)}</td>
                      <td style={{ padding:"9px 14px", color:G.muted, maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{j.notes}</td>
                    </tr>
                  ))}
                  {parsed.length>50&&<tr><td colSpan={6} style={{ padding:"10px 14px", textAlign:"center", color:G.muted, fontSize:12 }}>...and {parsed.length-50} more</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Calendar ────────────────────────────────────────────────────────────
function CalendarView({ jobs, onAdd }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [sel,   setSel]   = useState(null);
  const todayStr = today();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();

  const jobsByDate = useMemo(() => {
    const map = {};
    jobs.forEach(j => {
      const key = j.start||j.close;
      if (!key) return;
      const [y,m,d] = key.split("-").map(Number);
      if (y===year && m-1===month) {
        const dk = String(d);
        if (!map[dk]) map[dk] = [];
        map[dk].push(j);
      }
    });
    return map;
  }, [jobs, year, month]);

  const monthStats = useMemo(() => {
    const arr = Object.values(jobsByDate).flat();
    const pipeline = arr.filter(j=>j.status!=="won"&&j.status!=="lost").reduce((s,j)=>s+j.amount,0);
    const won = arr.filter(j=>j.status==="won").reduce((s,j)=>s+j.amount,0);
    return { pipeline, won };
  }, [jobsByDate]);

  const selJobs = sel ? (jobsByDate[String(sel)]||[]) : [];
  const prevMonth = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); setSel(null); };
  const nextMonth = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); setSel(null); };

  const cells = [];
  for (let i=0; i<firstDay; i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:G.text }}>&#128197; Calendar</h1>
          <div style={{ fontSize:13, color:G.muted, marginTop:3 }}>
            Pipeline: <b style={{color:G.light}}>{fmt$(monthStats.pipeline)}</b>
            &nbsp;&nbsp;Won: <b style={{color:G.gold}}>{fmt$(monthStats.won)}</b>
          </div>
        </div>
        <Btn onClick={onAdd} variant="gold" small>&#43; Add Job</Btn>
      </div>

      {/* Nav */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:20, marginBottom:16 }}>
        <button onClick={prevMonth} style={{ background:G.card, border:`1.5px solid ${G.border}`, borderRadius:10, padding:"6px 14px", cursor:"pointer", fontSize:16, color:G.text }}>&#8592;</button>
        <span style={{ fontSize:20, fontWeight:800, color:G.text, minWidth:180, textAlign:"center" }}>{MO_NAMES[month]} {year}</span>
        <button onClick={nextMonth} style={{ background:G.card, border:`1.5px solid ${G.border}`, borderRadius:10, padding:"6px 14px", cursor:"pointer", fontSize:16, color:G.text }}>&#8594;</button>
      </div>

      {/* Grid */}
      <div style={{ background:G.card, borderRadius:18, overflow:"hidden", boxShadow:`0 2px 12px ${G.border}` }}>
        {/* Weekday headers */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", background:G.mint }}>
          {WEEKDAYS.map(d=><div key={d} style={{ padding:"10px 0", textAlign:"center", fontSize:12, fontWeight:700, color:G.dark, letterSpacing:.3 }}>{d}</div>)}
        </div>
        {/* Days */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
          {cells.map((d,i) => {
            if (!d) return <div key={`e${i}`} style={{ minHeight:72, background:"#fafafa", borderRight:`1px solid ${G.border}`, borderBottom:`1px solid ${G.border}` }} />;
            const dk = String(d);
            const dayJobs = jobsByDate[dk]||[];
            const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const isToday = dateStr===todayStr;
            const isSel   = sel===d;
            const hasWon  = dayJobs.some(j=>j.status==="won");
            const dayTotal= dayJobs.reduce((s,j)=>s+j.amount,0);
            return (
              <div key={d} onClick={()=>setSel(isSel?null:d)}
                style={{
                  minHeight:72, padding:"6px 7px", cursor:"pointer", position:"relative",
                  borderRight:`1px solid ${G.border}`, borderBottom:`1px solid ${G.border}`,
                  background: isSel ? G.mint : isToday ? "#f0fdf4" : "white",
                  boxShadow: isSel ? `inset 0 0 0 2px ${G.light}` : isToday ? `inset 0 0 0 1.5px ${G.soft}` : "none",
                  transition:"background .15s",
                }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <span style={{
                    fontSize:13, fontWeight: isToday?800:500,
                    color: isToday ? G.light : G.text,
                    background: isToday ? G.mint : "transparent",
                    borderRadius:99, padding: isToday?"1px 6px":"0",
                    display:"inline-block",
                  }}>{d}</span>
                  {hasWon && <span style={{ color:G.gold, fontSize:9 }}>&#9733;</span>}
                </div>
                <div style={{ marginTop:3, display:"flex", flexDirection:"column", gap:2 }}>
                  {dayJobs.slice(0,2).map(j=>{
                    const s = STATUSES[j.status]||STATUSES.quote;
                    return (
                      <div key={j.id} style={{ fontSize:10, borderRadius:4, padding:"1px 5px", background:s.bg, color:s.text, borderLeft:`2px solid ${s.dot}`, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {j.customer}
                      </div>
                    );
                  })}
                  {dayJobs.length>2 && <div style={{ fontSize:10, color:G.muted, paddingLeft:2 }}>+{dayJobs.length-2} more</div>}
                </div>
                {dayTotal > 0 && (
                  <div style={{ position:"absolute", bottom:4, right:6, fontSize:9, color:G.muted, fontWeight:600 }}>
                    {fmt$(dayTotal)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day panel */}
      {sel && selJobs.length > 0 && (
        <div style={{ marginTop:16, background:G.card, borderRadius:16, padding:18, boxShadow:`0 2px 12px ${G.border}` }}>
          <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700, color:G.text }}>
            {MO_NAMES[month]} {sel}, {year} &mdash; {selJobs.length} job{selJobs.length!==1?"s":""}
          </h3>
          {selJobs.map(j=>(
            <div key={j.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${G.border}` }}>
              <div>
                <div style={{ fontWeight:600, fontSize:14, color:G.text }}>{j.customer}</div>
                <div style={{ fontSize:12, color:G.muted }}>{j.jobType} · {j.material}</div>
                {j.notes && <div style={{ fontSize:12, color:G.muted, fontStyle:"italic" }}>{j.notes.slice(0,80)}</div>}
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontWeight:700, color:G.light, fontSize:15 }}>{fmt$(j.amount)}</div>
                <Badge status={j.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Map View ─────────────────────────────────────────────────────────────
function MapView({ jobs }) {
  const mapRef  = useRef(null);
  const leafRef = useRef(null);
  const markRef = useRef([]);

  useEffect(() => {
    if (leafRef.current) return;
    const loadLeaflet = async () => {
      if (!window.L) {
        await new Promise((res, rej) => {
          const css = document.createElement("link");
          css.rel="stylesheet"; css.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
          document.head.appendChild(css);
          const s = document.createElement("script");
          s.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
          s.onload=res; s.onerror=rej; document.head.appendChild(s);
        });
      }
      if (!mapRef.current) return;
      leafRef.current = window.L.map(mapRef.current).setView([31.5, -99.5], 6);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:"&copy; OpenStreetMap contributors"
      }).addTo(leafRef.current);
    };
    loadLeaflet();
    return () => { if(leafRef.current){leafRef.current.remove();leafRef.current=null;} };
  }, []);

  useEffect(() => {
    if (!leafRef.current) return;
    markRef.current.forEach(m=>m.remove());
    markRef.current = [];
    jobs.filter(j=>j.lat&&j.lng).forEach(j=>{
      const s = STATUSES[j.status]||STATUSES.quote;
      const icon = window.L.divIcon({ html:`<div style="width:14px;height:14px;border-radius:50%;background:${s.dot};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`, className:"", iconAnchor:[7,7] });
      const m = window.L.marker([j.lat,j.lng],{icon}).addTo(leafRef.current);
      m.bindPopup(`<b>${j.customer}</b><br/>${j.address}<br/>${fmt$(j.amount)}`);
      markRef.current.push(m);
    });
  }, [jobs]);

  const geocoded = jobs.filter(j=>j.lat&&j.lng).length;
  return (
    <div>
      <h1 style={{ margin:"0 0 6px", fontSize:26, fontWeight:800, color:G.text }}>&#128506;&#65039; Map</h1>
      <p style={{ margin:"0 0 16px", color:G.muted, fontSize:14 }}>{geocoded} of {jobs.length} jobs plotted</p>
      <div ref={mapRef} style={{ height:520, borderRadius:18, overflow:"hidden", boxShadow:`0 2px 16px ${G.border}` }} />
    </div>
  );
}

// ─── App Shell ───────────────────────────────────────────────────────────
export default function CountertopCRM() {
  const [tab,     setTab]     = useState("dashboard");
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null); // null | "add" | job-object
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, type="success") => {
    setToast({msg,type});
    setTimeout(()=>setToast(null), 3000);
  };

  const fetchJobs = useCallback(async () => {
    const { data, error } = await supabase.from("jobs").select("*").order("created_at", { ascending:false });
    if (error) {
      console.error(error);
      setJobs(SEED);
    } else {
      setJobs(data.length ? data.map(rowToJob) : SEED);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleSave = async (formData) => {
    const isEdit = modal && modal !== "add";
    const job = {
      ...formData,
      id: isEdit ? modal.id : Date.now(),
      createdAt: isEdit ? modal.createdAt : today(),
    };
    const { error } = await supabase.from("jobs").upsert(jobToRow(job), { onConflict:"id" });
    if (error) throw new Error(error.message);   // modal will catch & display
    setModal(null);
    await fetchJobs();
    showToast(isEdit ? "Job updated!" : "Job added!");
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this job?")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) { showToast("Error: "+error.message, "error"); return; }
    await fetchJobs();
    showToast("Job deleted");
  };

  const handleBulkDelete = async (ids) => {
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} job${ids.length!==1?"s":""}? This cannot be undone.`)) return;
    const { error } = await supabase.from("jobs").delete().in("id", ids);
    if (error) { showToast("Error: "+error.message, "error"); return; }
    await fetchJobs();
    showToast(`${ids.length} job${ids.length!==1?"s":""} deleted`);
  };

  const TABS = [
    ["dashboard", "&#128197; Dashboard"],
    ["jobs",      "&#128203; Jobs"],
    ["customers", "&#128101; Customers"],
    ["import",    "&#8659; Import"],
    ["calendar",  "&#9776; Calendar"],
    ["map",       "&#128506;&#65039; Map"],
  ];

  return (
    <div style={{ minHeight:"100vh", background:G.bg, fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif" }}>
      {/* Topbar */}
      <div style={{ background:`linear-gradient(135deg, ${G.darkest} 0%, ${G.dark} 60%, ${G.mid} 100%)`, padding:"0 24px", boxShadow:"0 2px 16px rgba(0,0,0,.35)", position:"sticky", top:0, zIndex:200 }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", alignItems:"center", gap:0 }}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 0", marginRight:24, flexShrink:0 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg, ${G.goldLt}, ${G.gold})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, boxShadow:`0 2px 8px ${G.gold}66` }}>
              &#9971;
            </div>
            <div>
              <div style={{ color:"#fff", fontWeight:800, fontSize:15, letterSpacing:-.3 }}>FairwayStone</div>
              <div style={{ color:G.mint, fontSize:10, opacity:.8, letterSpacing:.2 }}>COUNTERTOP CRM</div>
            </div>
          </div>
          {/* Nav */}
          <nav style={{ display:"flex", gap:2, overflow:"auto" }}>
            {TABS.map(([id, label]) => (
              <button key={id} onClick={()=>setTab(id)}
                dangerouslySetInnerHTML={{ __html:label }}
                style={{
                  background: tab===id ? `linear-gradient(135deg, ${G.light}cc, ${G.mid}cc)` : "transparent",
                  border:"none", color: tab===id ? "#fff" : `${G.mint}bb`,
                  padding:"18px 16px", cursor:"pointer", fontSize:13, fontWeight: tab===id?700:500,
                  borderBottom: tab===id ? `2.5px solid ${G.goldLt}` : "2.5px solid transparent",
                  transition:"all .15s", whiteSpace:"nowrap",
                }} />
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"28px 20px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:80, color:G.muted }}>
            <div style={{ fontSize:40, marginBottom:12 }}>&#9971;</div>
            <div>Loading your jobs...</div>
          </div>
        ) : (
          <>
            {tab==="dashboard" && <Dashboard jobs={jobs} onAdd={()=>setModal("add")} />}
            {tab==="jobs"      && <JobsView  jobs={jobs} onAdd={()=>setModal("add")} onEdit={j=>setModal(j)} onDelete={handleDelete} onBulkDelete={handleBulkDelete} />}
            {tab==="customers" && <CustomersView jobs={jobs} />}
            {tab==="import"    && <ImportView onImportDone={()=>{ fetchJobs(); showToast("Import complete! Jobs synced."); }} />}
            {tab==="calendar"  && <CalendarView jobs={jobs} onAdd={()=>setModal("add")} />}
            {tab==="map"       && <MapView jobs={jobs} />}
          </>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <JobModal
          job={modal==="add" ? null : modal}
          onSave={handleSave}
          onClose={()=>setModal(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
          background: toast.type==="error" ? G.red : G.light,
          color:"#fff", padding:"12px 24px", borderRadius:12, fontWeight:600, fontSize:14,
          boxShadow:"0 4px 20px rgba(0,0,0,.3)", zIndex:9999, whiteSpace:"nowrap",
          animation:"fadeIn .2s ease",
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}