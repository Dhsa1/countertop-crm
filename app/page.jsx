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
  quote:       { label:"Quoted",      bg:"#fffbeb", text:"#92400e", dot:"#f59e0b" },
  open:        { label:"Open",        bg:"#f0fdf4", text:"#14532d", dot:"#22c55e" },
  in_progress: { label:"In Progress", bg:"#ecfdf5", text:"#064e3b", dot:"#10b981" },
  won:         { label:"Won \u2713",  bg:"#dcfce7", text:"#14532d", dot:"#16a34a" },
  lost:        { label:"Lost",        bg:"#f9fafb", text:"#6b7280", dot:"#9ca3af" },
};

const MO_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ─── Growing Dropdown Options ──────────────────────────────────────────────
// Seeded with real values from the April forecast spreadsheet
const COMBO_DEFAULTS = {
  installType:    ["Install","Fab","Supply Only","Measure","Service Call","Repair"],
  endUseSegment:  ["SAR","AUR","HOU","DAL","FTW","SAN","ATX","Other"],
  projectType:    ["Custom Hi","Custom Low","Production Hi","Production Low","Production Basic","Retail Hi","Retail Low","Commercial Low","Job Template"],
  scheduleStatus: ["scheduled","unscheduled","hold","cancelled"],
  salesRep:       ["Briceson Hodges"],
  projectManager: ["Jacob Frey","Norma Ovalle","Rhonda Zarate","Sharleigh Burkett","Tom Macaluso"],
  billTo:         [],
  jobType:        ["Kitchen","Bathroom","Laundry Room","Outdoor Kitchen","Bar","Office","Commercial"],
  material:       ["Granite","Quartz","Marble","Quartzite","Soapstone","Laminate","Butcher Block","Concrete","Other"],
};

function loadOpts(key) {
  try {
    const raw = typeof window !== "undefined" && localStorage.getItem("crm_opts_" + key);
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; }
  } catch {}
  return [...(COMBO_DEFAULTS[key] || [])];
}
function saveOpts(key, arr) {
  try { localStorage.setItem("crm_opts_" + key, JSON.stringify(arr)); } catch {}
}
function addOpt(key, value) {
  if (!value || !value.trim()) return;
  const v = value.trim();
  const cur = loadOpts(key);
  if (!cur.some(x => x.toLowerCase() === v.toLowerCase())) {
    saveOpts(key, [...cur, v]);
  }
}
// Call after saving a job to persist any newly typed values
function persistJobOpts(job) {
  const fields = [
    ["installType",    job.installType],
    ["endUseSegment",  job.endUseSegment],
    ["projectType",    job.projectType],
    ["scheduleStatus", job.scheduleStatus],
    ["salesRep",       job.salesRep1],
    ["salesRep",       job.salesRep2],
    ["projectManager", job.projectManager],
    ["billTo",         job.billTo],
    ["jobType",        job.jobType],
    ["material",       job.material],
  ];
  fields.forEach(([k, v]) => v && addOpt(k, v));
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmt$    = v  => "$" + (v||0).toLocaleString();
const fmtDate = d  => { if(!d) return "—"; const p=d.split("-"); return `${p[1]}/${p[2]}/${p[0].slice(2)}`; };
const addDays = (iso, n) => { const d=new Date(iso+"T12:00:00"); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; };
const today   = ()  => new Date().toISOString().split("T")[0];

function rowToJob(r) {
  return {
    id:             r.id,
    customer:       r.customer||"",
    jobType:        r.job_type||"",
    material:       r.material||"",
    status:         r.status||"quote",
    amount:         parseFloat(r.amount)||0,
    sqft:           parseFloat(r.sqft)||0,
    start:          r.start_date||"",
    close:          r.close_date||"",
    notes:          r.notes||"",
    address:        r.address||"",
    lat:            r.lat  ? parseFloat(r.lat)  : null,
    lng:            r.lng  ? parseFloat(r.lng)  : null,
    createdAt:      r.created_at||today(),
    customerPo:     r.customer_po||"",
    quoteHoldNum:   r.quote_hold_num||"",
    installType:    r.install_type||"",
    endUseSegment:  r.end_use_segment||"",
    projectType:    r.project_type||"",
    scheduleStatus: r.schedule_status||"",
    billTo:         r.bill_to||"",
    jobName:        r.job_name||"",       // the actual project/site name
    salesRep1:      r.sales_rep1||"",
    salesRep2:      r.sales_rep2||"",
    projectManager: r.project_manager||"",
  };
}
function jobToRow(j) {
  return {
    id:              j.id,
    customer:        j.customer||j.billTo||"Unknown",
    job_type:        j.jobType||null,
    material:        j.material||null,
    status:          j.status,
    amount:          j.amount||0,
    sqft:            j.sqft||0,
    start_date:      j.start||null,
    close_date:      j.close||null,
    notes:           j.notes||null,
    address:         j.address||null,
    lat:             j.lat||null,
    lng:             j.lng||null,
    created_at:      j.createdAt||today(),
    customer_po:     j.customerPo||null,
    quote_hold_num:  j.quoteHoldNum||null,
    install_type:    j.installType||null,
    end_use_segment: j.endUseSegment||null,
    project_type:    j.projectType||null,
    schedule_status: j.scheduleStatus||null,
    bill_to:         j.billTo||null,
    job_name:        j.jobName||null,
    sales_rep1:      j.salesRep1||null,
    sales_rep2:      j.salesRep2||null,
    project_manager: j.projectManager||null,
  };
}

// ─── Mobile hook ──────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 700 : false);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 700);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

// ─── Excel Export ─────────────────────────────────────────────────────────
async function exportJobsToExcel(jobs) {
  const XLSX = await new Promise((res, rej) => {
    if (window.XLSX) { res(window.XLSX); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => res(window.XLSX); s.onerror = rej;
    document.head.appendChild(s);
  });
  const rows = jobs.map(j => ({
    "Job #":           j.id,
    "Quote/Hold #":    j.quoteHoldNum||"",
    "Bill To":         j.billTo||"",
    "Customer":        j.customer||"",
    "Job Name":        j.jobName||"",
    "Status":          STATUSES[j.status]?.label||j.status,
    "Amount":          j.amount||0,
    "Sq Ft":           j.sqft||0,
    "Install Type":    j.installType||"",
    "End-Use Segment": j.endUseSegment||"",
    "Project Type":    j.projectType||"",
    "Schedule":        j.scheduleStatus||"",
    "Start Date":      j.start||"",
    "Close Date":      j.close||"",
    "Customer P.O.":   j.customerPo||"",
    "Sales Rep 1":     j.salesRep1||"",
    "Sales Rep 2":     j.salesRep2||"",
    "Project Manager": j.projectManager||"",
    "Location":        j.address||"",
    "Notes":           j.notes||"",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Jobs");
  XLSX.writeFile(wb, `jobs-export-${today()}.xlsx`);
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
  let hRow = -1;
  for (let i = 0; i < Math.min(15, raw.length); i++) {
    if (raw[i] && raw[i].some(c => c && (String(c).includes("Quote") || String(c).includes("Bill To") || String(c).includes("Job #")))) {
      hRow = i; break;
    }
  }
  if (hRow < 0) return { jobs:[], errors:["Could not find header row."] };

  const headers = raw[hRow].map(h => h ? String(h).trim().toLowerCase() : "");
  const col = name => headers.findIndex(h => h.includes(name));

  const ci = {
    jobNum:    col("job #"),
    quoteHold: col("quote"),
    date:      col("date"),
    custPo:    col("customer p"),
    jobName:   col("job name"),
    type:      col("type"),
    shipDt:    col("req.ship") >= 0 ? col("req.ship") : col("ship"),
    segment:   col("end-use") >= 0 ? col("end-use") : col("segment"),
    projType:  col("project type"),
    schedule:  col("schedule"),
    billTo:    col("bill to"),
    location:  col("location"),
    salesRep1: col("sales rep1"),
    salesRep2: col("sales rep2"),
    pm:        col("project manager"),
    amount:    col("amount"),
    status:    col("status"),
  };

  const jobs = [], errors = [];
  for (let i = hRow + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row) continue;

    // Primary key: Job # (numeric) or Quote/Hold # (converted)
    let numId = null;
    const jobNumRaw   = ci.jobNum   >= 0 ? row[ci.jobNum]   : null;
    const quoteRaw    = ci.quoteHold >= 0 ? row[ci.quoteHold] : null;

    if (jobNumRaw && !isNaN(parseInt(jobNumRaw))) {
      numId = parseInt(jobNumRaw);
    } else if (quoteRaw) {
      const parts = String(quoteRaw).split("-");
      numId = (parseInt(parts[0])||0) * 100 + (parseInt(parts[1])||1);
    }
    if (!numId) continue;

    const billTo     = ci.billTo    >= 0 && row[ci.billTo]    ? String(row[ci.billTo]).trim()    : "";
    const jobName    = ci.jobName   >= 0 && row[ci.jobName]   ? String(row[ci.jobName]).trim()   : "";
    const location   = ci.location  >= 0 && row[ci.location]  ? String(row[ci.location]).trim()  : "";
    const projType   = ci.projType  >= 0 && row[ci.projType]  ? String(row[ci.projType]).trim()  : "";
    const installTyp = ci.type      >= 0 && row[ci.type]      ? String(row[ci.type]).trim()      : "";
    const segment    = ci.segment   >= 0 && row[ci.segment]   ? String(row[ci.segment]).trim()   : "";
    const schedule   = ci.schedule  >= 0 && row[ci.schedule]  ? String(row[ci.schedule]).trim()  : "";
    const salesRep1  = ci.salesRep1 >= 0 && row[ci.salesRep1] ? String(row[ci.salesRep1]).trim() : "";
    const salesRep2  = ci.salesRep2 >= 0 && row[ci.salesRep2] ? String(row[ci.salesRep2]).trim() : "";
    const pm         = ci.pm        >= 0 && row[ci.pm]        ? String(row[ci.pm]).trim()        : "";
    const custPo     = ci.custPo    >= 0 && row[ci.custPo]    ? String(row[ci.custPo]).trim()    : "";
    const statusRaw  = ci.status    >= 0 && row[ci.status]    ? String(row[ci.status]).trim()    : "";
    const totalRaw   = ci.amount    >= 0 && row[ci.amount]    ? row[ci.amount]                   : 0;
    const dateRaw    = ci.date      >= 0 && row[ci.date]      ? String(row[ci.date]).trim()      : "";

    const amount = parseFloat(String(totalRaw).replace(/[$,]/g,""))||0;
    const status = statusRaw.toLowerCase().includes("accept") ? "open" : "quote";

    let startDate = today();
    if (dateRaw) { const d = new Date(dateRaw); if (!isNaN(d.getTime())) startDate = d.toISOString().split("T")[0]; }
    const closeDate = status === "open" ? addDays(startDate, 21) : addDays(startDate, 30);

    let material = "Other";
    const pt = projType.toLowerCase();
    if (pt.includes("granite")) material = "Granite";
    else if (pt.includes("quartz")) material = "Quartz";
    else if (pt.includes("marble")) material = "Marble";

    // jobName = the site/project description (e.g. "Wolslager Residence 210 E Tarrant")
    // address = physical location/area (e.g. "Bellezza")
    // billTo  = the billing company (e.g. "Sterling Creek Custom Homes")
    const address = location; // location column is the city/area

    const job = {
      id:             numId,
      customer:       billTo || "Unknown",
      billTo,
      jobName,        // separate — the project name/site address from Job Name column
      jobType:        "",
      material,
      status,
      amount,
      sqft:           0,
      start:          startDate,
      close:          closeDate,
      notes:          "",
      address,
      lat:            null,
      lng:            null,
      createdAt:      today(),
      customerPo:     custPo,
      quoteHoldNum:   quoteRaw ? String(quoteRaw).trim() : "",
      installType:    installTyp,
      endUseSegment:  segment,
      projectType:    projType,
      scheduleStatus: schedule,
      salesRep1,
      salesRep2,
      projectManager: pm,
    };
    persistJobOpts(job);
    jobs.push(job);
  }
  return { jobs, errors };
}

// ─── ComboInput — searchable, self-growing dropdown ───────────────────────
function ComboInput({ label, value, onChange, optKey, required, placeholder, half }) {
  const [open,    setOpen]    = useState(false);
  const [options, setOptions] = useState(() => loadOpts(optKey));
  const wrapRef = useRef(null);

  // Reload options from localStorage each time we open
  const handleFocus = () => {
    setOptions(loadOpts(optKey));
    setOpen(true);
  };

  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = options.filter(o =>
    !value || o.toLowerCase().includes(value.toLowerCase())
  );
  const showNew = value && value.trim() && !options.some(o => o.toLowerCase() === value.trim().toLowerCase());

  return (
    <div ref={wrapRef} style={{ display:"flex", flexDirection:"column", gap:5, position:"relative", gridColumn: half ? undefined : undefined }}>
      {label && (
        <label style={{ fontSize:12, fontWeight:600, color:G.muted, textTransform:"uppercase", letterSpacing:.5 }}>
          {label}{required && <span style={{color:G.red}}> *</span>}
        </label>
      )}
      <input
        value={value||""}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={handleFocus}
        placeholder={placeholder || "Type or select..."}
        autoComplete="off"
        style={{ padding:"10px 14px", borderRadius:10, border:`1.5px solid ${G.border}`, fontSize:14,
          background:G.card, color:G.text, outline:"none", width:"100%", boxSizing:"border-box" }}
        onKeyDown={e => { if(e.key==="Escape") setOpen(false); }}
      />
      {open && (filtered.length > 0 || showNew) && (
        <div style={{
          position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:500,
          background:G.card, border:`1.5px solid ${G.border}`, borderRadius:10,
          boxShadow:"0 8px 24px rgba(0,0,0,.12)", maxHeight:180, overflowY:"auto",
        }}>
          {filtered.map(o => (
            <div key={o} onMouseDown={e=>{ e.preventDefault(); onChange(o); setOpen(false); }}
              style={{ padding:"9px 14px", fontSize:13, cursor:"pointer", color:G.text,
                borderBottom:`1px solid ${G.border}`,
                background: o===value ? G.mint : "transparent",
              }}
              onMouseEnter={e=>e.currentTarget.style.background=G.mint}
              onMouseLeave={e=>e.currentTarget.style.background=o===value?G.mint:"transparent"}>
              {o}
            </div>
          ))}
          {showNew && (
            <div onMouseDown={e=>{ e.preventDefault(); onChange(value.trim()); setOpen(false); }}
              style={{ padding:"9px 14px", fontSize:13, cursor:"pointer", color:G.light,
                fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:10, background:G.mint, borderRadius:4, padding:"1px 6px", color:G.dark }}>NEW</span>
              Add &ldquo;{value.trim()}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Small UI Components ──────────────────────────────────────────────────
function Badge({ status }) {
  const s = STATUSES[status] || STATUSES.quote;
  return (
    <span style={{ background:s.bg, color:s.text, display:"inline-flex", alignItems:"center", gap:4,
      padding:"2px 10px", borderRadius:99, fontSize:12, fontWeight:600 }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.dot, display:"inline-block" }} />
      {s.label}
    </span>
  );
}

function Btn({ children, onClick, variant="primary", small, disabled, style={} }) {
  const base = {
    border:"none", cursor:disabled?"not-allowed":"pointer", borderRadius:10, fontWeight:600,
    padding:small?"6px 14px":"10px 20px", fontSize:small?13:14,
    transition:"all .15s", opacity:disabled?.5:1,
    display:"inline-flex", alignItems:"center", gap:6, ...style,
  };
  const variants = {
    primary: { background:`linear-gradient(135deg,${G.light} 0%,${G.mid} 100%)`, color:"#fff", boxShadow:`0 2px 8px ${G.light}55` },
    gold:    { background:`linear-gradient(135deg,${G.goldLt} 0%,${G.gold} 100%)`, color:"#fff", boxShadow:`0 2px 8px ${G.gold}55` },
    ghost:   { background:"transparent", color:G.light, border:`1.5px solid ${G.border}` },
    danger:  { background:"#fef2f2", color:G.red, border:`1.5px solid #fecaca` },
  };
  return <button style={{...base,...variants[variant]}} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Input({ label, value, onChange, type="text", required, placeholder }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      {label && <label style={{ fontSize:12, fontWeight:600, color:G.muted, textTransform:"uppercase", letterSpacing:.5 }}>{label}{required&&<span style={{color:G.red}}> *</span>}</label>}
      <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ padding:"10px 14px", borderRadius:10, border:`1.5px solid ${G.border}`, fontSize:14,
          background:G.card, color:G.text, outline:"none", width:"100%", boxSizing:"border-box" }}
        onFocus={e=>e.target.style.borderColor=G.light}
        onBlur={e=>e.target.style.borderColor=G.border}
      />
    </div>
  );
}

// ─── Print Job Detail ─────────────────────────────────────────────────────
function printJob(job) {
  const s = STATUSES[job.status] || STATUSES.quote;
  const rows = [
    ["Bill To",          job.billTo||job.customer],
    ["Job Name",         job.jobName],
    ["Quote / Hold #",   job.quoteHoldNum],
    ["Customer P.O.",    job.customerPo],
    ["Status",           s.label],
    ["Amount",           fmt$(job.amount)],
    ["Sq Ft",            job.sqft ? `${job.sqft} sqft` : ""],
    ["Install Type",     job.installType],
    ["End-Use Segment",  job.endUseSegment],
    ["Project Type",     job.projectType],
    ["Schedule",         job.scheduleStatus],
    ["Start Date",       fmtDate(job.start)],
    ["Close Date",       fmtDate(job.close)],
    ["Sales Rep 1",      job.salesRep1],
    ["Sales Rep 2",      job.salesRep2],
    ["Project Manager",  job.projectManager],
    ["Location",         job.address],
    ["Notes",            job.notes],
  ].filter(([,v])=>v);

  const html = `<!DOCTYPE html><html><head><title>Job Detail — ${job.billTo||job.customer}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 32px; color: #0d1f14; }
    .header { display:flex; align-items:center; justify-content:space-between; border-bottom: 3px solid #2d6e44; padding-bottom:16px; margin-bottom:24px; }
    .logo { font-size:22px; font-weight:900; color:#2d6e44; letter-spacing:-0.5px; }
    .logo span { color:#b8922a; }
    .job-title { font-size:20px; font-weight:800; margin:0 0 4px; }
    .badge { display:inline-block; padding:3px 12px; border-radius:99px; font-size:12px; font-weight:700; background:${s.bg}; color:${s.text}; border:1px solid ${s.dot}; }
    .amount { font-size:28px; font-weight:900; color:#2d6e44; margin:12px 0 20px; }
    table { width:100%; border-collapse:collapse; }
    td { padding: 9px 12px; font-size:14px; border-bottom:1px solid #d4e8da; vertical-align:top; }
    td:first-child { font-weight:600; color:#5a7a65; width:38%; }
    .footer { margin-top:32px; font-size:11px; color:#9ca3af; text-align:center; border-top:1px solid #d4e8da; padding-top:12px; }
    @media print { body { padding:16px; } }
  </style></head><body>
  <div class="header">
    <div class="logo">Fairway<span>Stone</span> CRM</div>
    <div style="font-size:12px;color:#9ca3af;">Printed ${new Date().toLocaleDateString()}</div>
  </div>
  <div class="job-title">${job.billTo||job.customer}</div>
  <span class="badge">${s.label}</span>
  <div class="amount">${fmt$(job.amount)}</div>
  <table>${rows.map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</table>
  <div class="footer">FairwayStone CRM &nbsp;·&nbsp; Job #${job.id}</div>
  <script>window.onload=()=>{ window.print(); }</script>
  </body></html>`;

  const w = window.open("","_blank","width=750,height=900");
  w.document.write(html);
  w.document.close();
}

// ─── Job Form Modal ────────────────────────────────────────────────────────
const BLANK = {
  customer:"", billTo:"", jobName:"", customerPo:"", quoteHoldNum:"",
  jobType:"", material:"", installType:"", endUseSegment:"", projectType:"", scheduleStatus:"",
  status:"quote", amount:"", sqft:"",
  salesRep1:"", salesRep2:"", projectManager:"",
  start:"", close:"", notes:"", address:"",
};

const MODAL_TABS = [
  { key:"info",      label:"📋 Job Info" },
  { key:"financials",label:"💰 Financials" },
  { key:"schedule",  label:"📅 Schedule" },
  { key:"team",      label:"👥 Team" },
];

function JobModal({ job, onSave, onClose }) {
  const [f,        setF]        = useState(job ? {
    customer:       job.customer,
    billTo:         job.billTo||"",
    jobName:        job.jobName||"",
    customerPo:     job.customerPo||"",
    quoteHoldNum:   job.quoteHoldNum||"",
    jobType:        job.jobType||"",
    material:       job.material||"",
    installType:    job.installType||"",
    endUseSegment:  job.endUseSegment||"",
    projectType:    job.projectType||"",
    scheduleStatus: job.scheduleStatus||"",
    status:         job.status,
    amount:         String(job.amount||""),
    sqft:           String(job.sqft||""),
    salesRep1:      job.salesRep1||"",
    salesRep2:      job.salesRep2||"",
    projectManager: job.projectManager||"",
    start:          job.start||"",
    close:          job.close||"",
    notes:          job.notes||"",
    address:        job.address||"",
  } : { ...BLANK, start:today() });
  const [saving,   setSaving]   = useState(false);
  const [saveErr,  setSaveErr]  = useState("");
  const [activeTab,setActiveTab]= useState("info");
  const set = k => v => setF(p=>({...p,[k]:v}));

  const handleSubmit = async () => {
    if (!f.customer.trim() && !f.billTo.trim()) { setSaveErr("Enter a customer name or bill-to company."); setActiveTab("info"); return; }
    setSaving(true); setSaveErr("");
    try {
      const data = { ...f, amount:parseFloat(f.amount)||0, sqft:parseFloat(f.sqft)||0 };
      if (!data.customer.trim()) data.customer = data.billTo;
      await onSave(data);
    } catch(e) {
      setSaveErr(e?.message || String(e));
      setSaving(false);
    }
  };

  // Backdrop click to close
  const handleBackdrop = e => { if (e.target === e.currentTarget) onClose(); };

  const isMob = useIsMobile();
  return (
    <div onClick={handleBackdrop} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", display:"flex", alignItems:isMob?"flex-end":"center", justifyContent:"center", zIndex:1000, padding:isMob?"0":"16px" }}>
      <div style={{ background:G.card, borderRadius:isMob?"20px 20px 0 0":"20px", width:"100%", maxWidth:620, maxHeight:"94vh", display:"flex", flexDirection:"column", boxShadow:isMob?"0 -8px 40px rgba(0,0,0,.35)":"0 24px 64px rgba(0,0,0,.35)" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 24px 0" }}>
          <h2 style={{ margin:0, fontSize:19, fontWeight:800, color:G.text }}>{job ? "Edit Job" : "Add New Job"}</h2>
          <button onClick={onClose} style={{ background:G.mint, border:"none", width:32, height:32, borderRadius:"50%", fontSize:18, cursor:"pointer", color:G.dark, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>

        {/* Tab bar */}
        <div style={{ display:"flex", borderBottom:`1.5px solid ${G.border}`, margin:"14px 24px 0", gap:0 }}>
          {MODAL_TABS.map(t => (
            <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{
              flex:1, padding:"10px 4px", border:"none", background:"transparent",
              fontSize:12, fontWeight:activeTab===t.key?700:500,
              color:activeTab===t.key?G.light:G.muted,
              borderBottom:activeTab===t.key?`2.5px solid ${G.light}`:"2.5px solid transparent",
              cursor:"pointer", whiteSpace:"nowrap", transition:"all .12s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

            {activeTab==="info" && <>
              <div style={{ gridColumn:"1/-1" }}>
                <ComboInput label="Bill To Customer *" value={f.billTo} onChange={v=>{ set("billTo")(v); if(!f.customer) set("customer")(v); }} optKey="billTo" placeholder="Billing company name" />
              </div>
              <Input label="Customer Name" value={f.customer} onChange={set("customer")} placeholder="Individual if different" />
              <Input label="Quote / Hold #" value={f.quoteHoldNum} onChange={set("quoteHoldNum")} placeholder="e.g. 9219-4" />
              <div style={{ gridColumn:"1/-1" }}>
                <Input label="Job Name" value={f.jobName} onChange={set("jobName")} placeholder="Project / site name" />
              </div>
              <Input label="Customer P.O. #" value={f.customerPo} onChange={set("customerPo")} placeholder="e.g. 18013649-000" />
              <Input label="Address / Location" value={f.address} onChange={set("address")} placeholder="City or job site" />
            </>}

            {activeTab==="financials" && <>
              <Input label="Amount ($)" value={f.amount} onChange={set("amount")} type="number" placeholder="0" />
              <Input label="Sq Ft"      value={f.sqft}   onChange={set("sqft")}   type="number" placeholder="0" />
              <div style={{ display:"flex", flexDirection:"column", gap:5, gridColumn:"1/-1" }}>
                <label style={{ fontSize:12, fontWeight:600, color:G.muted, textTransform:"uppercase", letterSpacing:.5 }}>Status</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {Object.entries(STATUSES).map(([k,v])=>(
                    <button key={k} onClick={()=>set("status")(k)} style={{
                      padding:"8px 16px", borderRadius:20, border:`2px solid ${f.status===k?v.dot:G.border}`,
                      background:f.status===k?v.bg:"#f9fafb", color:f.status===k?v.text:G.muted,
                      fontWeight:f.status===k?700:500, fontSize:13, cursor:"pointer", transition:"all .12s",
                    }}>{v.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <Input label="Notes" value={f.notes} onChange={set("notes")} placeholder="Any additional notes..." />
              </div>
            </>}

            {activeTab==="schedule" && <>
              <Input label="Start Date"  value={f.start} onChange={set("start")} type="date" />
              <Input label="Close Date"  value={f.close} onChange={set("close")} type="date" />
              <ComboInput label="Install Type"    value={f.installType}    onChange={set("installType")}    optKey="installType"    placeholder="Install, Fab..." />
              <ComboInput label="Schedule Status" value={f.scheduleStatus} onChange={set("scheduleStatus")} optKey="scheduleStatus" placeholder="scheduled, hold..." />
              <ComboInput label="End-Use Segment" value={f.endUseSegment}  onChange={set("endUseSegment")}  optKey="endUseSegment"  placeholder="SAR, AUR..." />
              <ComboInput label="Project Type"    value={f.projectType}    onChange={set("projectType")}    optKey="projectType"    placeholder="Custom Hi..." />
              <ComboInput label="Job Category"    value={f.jobType}        onChange={set("jobType")}        optKey="jobType"        placeholder="Kitchen, Bathroom..." />
              <ComboInput label="Material"        value={f.material}       onChange={set("material")}       optKey="material"       placeholder="Granite, Quartz..." />
            </>}

            {activeTab==="team" && <>
              <ComboInput label="Sales Rep 1"     value={f.salesRep1}      onChange={set("salesRep1")}      optKey="salesRep"       placeholder="Name..." />
              <ComboInput label="Sales Rep 2"     value={f.salesRep2}      onChange={set("salesRep2")}      optKey="salesRep"       placeholder="Optional" />
              <div style={{ gridColumn:"1/-1" }}>
                <ComboInput label="Project Manager" value={f.projectManager} onChange={set("projectManager")} optKey="projectManager" placeholder="Name..." />
              </div>
            </>}

          </div>
        </div>

        {/* Footer */}
        {saveErr && (
          <div style={{ margin:"0 24px 8px", padding:"10px 14px", background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:10, fontSize:13, color:G.red }}>
            ⚠ {saveErr}
          </div>
        )}
        <div style={{ display:"flex", gap:10, padding:"12px 24px 24px", justifyContent:"space-between", alignItems:"center", borderTop:`1px solid ${G.border}` }}>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {MODAL_TABS.map((t) => (
              <button key={t.key} onClick={()=>setActiveTab(t.key)}
                style={{ width:8, height:8, borderRadius:"50%", border:"none", cursor:"pointer", background:activeTab===t.key?G.light:G.border, padding:0, transition:"background .12s" }} />
            ))}
            {job && (
              <button onClick={()=>printJob({...f, id:job.id, amount:parseFloat(f.amount)||0})}
                style={{ marginLeft:8, padding:"5px 12px", borderRadius:8, border:`1.5px solid ${G.border}`, background:"#f9fafb", color:G.muted, fontWeight:600, fontSize:12, cursor:"pointer" }}>
                🖨 Print
              </button>
            )}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <Btn variant="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
            <Btn onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : job ? "Save Changes" : "Add Job"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────
function Dashboard({ jobs, onAdd, onEdit, onStatusChange, onNavigate }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [sel,   setSel]   = useState(null);
  const todayStr = today();

  const stats = useMemo(() => {
    const active   = jobs.filter(j=>j.status!=="lost"&&j.status!=="won");
    const pipeline = active.reduce((s,j)=>s+j.amount,0);
    const won      = jobs.filter(j=>j.status==="won").reduce((s,j)=>s+j.amount,0);
    const quotes   = jobs.filter(j=>j.status==="quote").length;
    const open     = jobs.filter(j=>j.status==="open"||j.status==="in_progress").length;
    return { pipeline, won, quotes, open, total:jobs.length };
  }, [jobs]);

  // Calendar state
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();

  const jobsByDate = useMemo(() => {
    const map = {};
    jobs.forEach(j => {
      const key = j.start||j.close; if (!key) return;
      const [y,m,d] = key.split("-").map(Number);
      if (y===year && m-1===month) {
        const dk = String(d);
        if (!map[dk]) map[dk]=[];
        map[dk].push(j);
      }
    });
    return map;
  }, [jobs, year, month]);

  const monthStats = useMemo(() => {
    const arr = Object.values(jobsByDate).flat();
    return {
      pipeline: arr.filter(j=>j.status!=="won"&&j.status!=="lost").reduce((s,j)=>s+j.amount,0),
      won:      arr.filter(j=>j.status==="won").reduce((s,j)=>s+j.amount,0),
      count:    arr.length,
    };
  }, [jobsByDate]);

  const selJobs   = sel ? (jobsByDate[String(sel)]||[]) : [];
  const prevMonth = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); setSel(null); };
  const nextMonth = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); setSel(null); };

  const cells = [];
  for (let i=0;i<firstDay;i++) cells.push(null);
  for (let d=1;d<=daysInMonth;d++) cells.push(d);

  const StatCard = ({label,value,sub,icon,grad,onClick}) => (
    <div onClick={onClick} style={{
      background:`linear-gradient(135deg,${grad[0]} 0%,${grad[1]} 100%)`, borderRadius:18, padding:20, color:"#fff",
      boxShadow:`0 4px 16px ${grad[0]}44`, cursor:onClick?"pointer":"default",
      transition:"transform .12s, box-shadow .12s",
    }}
    onMouseEnter={e=>{ if(onClick){ e.currentTarget.style.transform="scale(1.03)"; e.currentTarget.style.boxShadow=`0 8px 24px ${grad[0]}66`; } }}
    onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=`0 4px 16px ${grad[0]}44`; }}>
      <div style={{ fontSize:24, marginBottom:4 }}>{icon}</div>
      <div style={{ fontSize:24, fontWeight:800, letterSpacing:-1 }}>{value}</div>
      <div style={{ fontSize:12, opacity:.85, marginTop:2 }}>{label}</div>
      {sub&&<div style={{ fontSize:11, opacity:.7, marginTop:2 }}>{sub}</div>}
      {onClick&&<div style={{ fontSize:10, opacity:.6, marginTop:6 }}>tap to view →</div>}
    </div>
  );

  // ── This Week strip ──
  const WeekStrip = () => {
    const todayD  = new Date();
    const dayOfWk = todayD.getDay(); // 0=Sun
    const weekDays = [];
    for (let i=0; i<7; i++) {
      const d = new Date(todayD);
      d.setDate(todayD.getDate() - dayOfWk + i);
      const iso = d.toISOString().split("T")[0];
      const dayJobs = jobs.filter(j => (j.start||j.close)===iso);
      const isToday = iso === todayD.toISOString().split("T")[0];
      weekDays.push({ d, iso, dayJobs, isToday });
    }
    const DAY_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    return (
      <div style={{ background:G.card, borderRadius:16, padding:"14px 16px", marginBottom:20, boxShadow:`0 2px 12px ${G.border}` }}>
        <div style={{ fontSize:12, fontWeight:700, color:G.muted, textTransform:"uppercase", letterSpacing:.6, marginBottom:10 }}>This Week</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6 }}>
          {weekDays.map(({ d, iso, dayJobs, isToday }) => {
            const total = dayJobs.reduce((s,j)=>s+j.amount,0);
            const hasWon = dayJobs.some(j=>j.status==="won");
            return (
              <div key={iso} onClick={()=>{ if(dayJobs.length){ setYear(d.getFullYear()); setMonth(d.getMonth()); setSel(d.getDate()); }}}
                style={{
                  borderRadius:12, padding:"8px 4px", textAlign:"center", cursor:dayJobs.length?"pointer":"default",
                  background:isToday?G.dark:dayJobs.length?G.mint:"#f9fafb",
                  border:`1.5px solid ${isToday?G.light:dayJobs.length?G.soft:G.border}`,
                  transition:"transform .1s",
                }}
                onMouseEnter={e=>{ if(dayJobs.length) e.currentTarget.style.transform="scale(1.04)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform=""; }}>
                <div style={{ fontSize:10, fontWeight:700, color:isToday?"#fff":G.muted, marginBottom:3 }}>{DAY_SHORT[d.getDay()]}</div>
                <div style={{ fontSize:14, fontWeight:800, color:isToday?"#fff":G.text }}>{d.getDate()}</div>
                {dayJobs.length>0
                  ? <div style={{ fontSize:10, fontWeight:700, color:isToday?G.goldLt:G.light, marginTop:3 }}>{dayJobs.length} job{dayJobs.length!==1?"s":""}</div>
                  : <div style={{ fontSize:10, color:G.border, marginTop:3 }}>—</div>
                }
                {total>0 && <div style={{ fontSize:9, color:isToday?G.mint:G.muted, marginTop:1 }}>{fmt$(total)}</div>}
                {hasWon && <div style={{ fontSize:9, color:G.goldLt }}>★ won</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* ── Golf Course Hero Banner ── */}
      <div style={{ borderRadius:20, overflow:"hidden", marginBottom:24, position:"relative", boxShadow:`0 4px 24px rgba(0,0,0,.18)` }}>
        {/* SVG golf course illustration */}
        <svg viewBox="0 0 800 220" xmlns="http://www.w3.org/2000/svg" style={{ display:"block", width:"100%", height:"auto" }}>
          {/* Sky */}
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a8d8f0"/>
              <stop offset="100%" stopColor="#d4eef9"/>
            </linearGradient>
            <linearGradient id="hill1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a9e52"/>
              <stop offset="100%" stopColor="#2d7a35"/>
            </linearGradient>
            <linearGradient id="hill2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5cb865"/>
              <stop offset="100%" stopColor="#3d9645"/>
            </linearGradient>
            <linearGradient id="green" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6dd475"/>
              <stop offset="100%" stopColor="#4ab852"/>
            </linearGradient>
          </defs>
          <rect width="800" height="220" fill="url(#sky)"/>
          {/* Clouds */}
          <ellipse cx="120" cy="55" rx="55" ry="22" fill="white" opacity=".9"/>
          <ellipse cx="145" cy="45" rx="38" ry="20" fill="white" opacity=".9"/>
          <ellipse cx="95"  cy="50" rx="32" ry="16" fill="white" opacity=".9"/>
          <ellipse cx="360" cy="38" rx="45" ry="18" fill="white" opacity=".85"/>
          <ellipse cx="385" cy="30" rx="30" ry="16" fill="white" opacity=".85"/>
          <ellipse cx="340" cy="35" rx="28" ry="14" fill="white" opacity=".85"/>
          <ellipse cx="620" cy="50" rx="50" ry="20" fill="white" opacity=".8"/>
          <ellipse cx="648" cy="40" rx="34" ry="18" fill="white" opacity=".8"/>
          {/* Far hill */}
          <path d="M0,160 Q200,90 400,130 Q600,160 800,110 L800,220 L0,220 Z" fill="url(#hill1)"/>
          {/* Mid hill */}
          <path d="M0,185 Q150,140 320,160 Q500,180 680,145 Q740,135 800,150 L800,220 L0,220 Z" fill="url(#hill2)"/>
          {/* Foreground green */}
          <path d="M0,200 Q250,175 500,190 Q650,198 800,180 L800,220 L0,220 Z" fill="url(#green)"/>
          {/* Hole cup shadow */}
          <ellipse cx="630" cy="194" rx="14" ry="5" fill="#2a6e2a" opacity=".5"/>
          {/* Hole cup */}
          <ellipse cx="630" cy="192" rx="10" ry="4" fill="#1a3a1a"/>
          {/* Flag pole */}
          <line x1="630" y1="192" x2="630" y2="145" stroke="#e8e8e8" strokeWidth="2.5" strokeLinecap="round"/>
          {/* Flag */}
          <path d="M630,145 L660,155 L630,165 Z" fill="#e53535"/>
          {/* Fairway stripe highlights */}
          <path d="M0,210 Q200,200 400,207 Q600,213 800,205" fill="none" stroke="#7ae07a" strokeWidth="3" opacity=".35"/>
        </svg>

        {/* Overlay text + button */}
        <div style={{
          position:"absolute", inset:0, display:"flex", flexDirection:"column",
          justifyContent:"center", padding:"0 28px",
          background:"linear-gradient(90deg,rgba(10,31,18,.55) 0%,rgba(10,31,18,.1) 60%,transparent 100%)",
        }}>
          <div style={{ color:"#fff", fontWeight:900, fontSize:26, letterSpacing:-.5, textShadow:"0 2px 8px rgba(0,0,0,.4)" }}>
            FairwayStone CRM
          </div>
          <div style={{ color:"rgba(255,255,255,.85)", fontSize:13, marginTop:4, textShadow:"0 1px 4px rgba(0,0,0,.3)" }}>
            {stats.total} jobs · {fmt$(stats.pipeline)} active pipeline
          </div>
          <div style={{ marginTop:14 }}>
            <Btn onClick={onAdd} variant="gold">+ Add Job</Btn>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:24 }}>
        <StatCard label="Active Pipeline" value={fmt$(stats.pipeline)} icon="💰" grad={[G.light,G.mid]}         onClick={()=>onNavigate&&onNavigate("jobs","open")} />
        <StatCard label="Won Revenue"     value={fmt$(stats.won)}      icon="🏆" grad={[G.gold,"#8a6a1a"]}      onClick={()=>onNavigate&&onNavigate("jobs","won")} />
        <StatCard label="Open Quotes"     value={stats.quotes}         icon="📋" grad={["#d97706","#b45309"]} sub="awaiting approval" onClick={()=>onNavigate&&onNavigate("jobs","quote")} />
        <StatCard label="Active Jobs"     value={stats.open}           icon="🔧" grad={[G.soft,G.light]} sub="in progress" onClick={()=>onNavigate&&onNavigate("jobs","open")} />
        <StatCard label="Customers"       value={[...new Set(jobs.map(j=>j.billTo||j.customer))].length} icon="👥" grad={["#6366f1","#4338ca"]} onClick={()=>onNavigate&&onNavigate("customers")} />
      </div>

      {/* This week strip */}
      <WeekStrip />

      {/* ── Monthly Stats Banner ── */}
      <div style={{ background:`linear-gradient(135deg,${G.dark} 0%,${G.mid} 100%)`, borderRadius:16, padding:"16px 22px", marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={prevMonth} style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:8, padding:"5px 12px", cursor:"pointer", color:"#fff", fontSize:16 }}>←</button>
          <span style={{ color:"#fff", fontWeight:800, fontSize:18, minWidth:160, textAlign:"center" }}>{MO_NAMES[month]} {year}</span>
          <button onClick={nextMonth} style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:8, padding:"5px 12px", cursor:"pointer", color:"#fff", fontSize:16 }}>→</button>
        </div>
        <div style={{ display:"flex", gap:28 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ color:G.mint, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:.5 }}>Month Pipeline</div>
            <div style={{ color:"#fff", fontWeight:800, fontSize:20 }}>{fmt$(monthStats.pipeline)}</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ color:G.goldLt, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:.5 }}>Month Won</div>
            <div style={{ color:G.goldLt, fontWeight:800, fontSize:20 }}>{fmt$(monthStats.won)}</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ color:G.mint, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:.5 }}>Jobs Scheduled</div>
            <div style={{ color:"#fff", fontWeight:800, fontSize:20 }}>{monthStats.count}</div>
          </div>
        </div>
      </div>

      {/* ── Calendar ── */}
      <div style={{ background:G.card, borderRadius:18, overflow:"hidden", boxShadow:`0 2px 12px ${G.border}`, marginBottom:24 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", background:G.mint }}>
          {WEEKDAYS.map(d=><div key={d} style={{ padding:"8px 0", textAlign:"center", fontSize:11, fontWeight:700, color:G.dark }}>{d.slice(0,1)}</div>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
          {cells.map((d,i)=>{
            if (!d) return <div key={`e${i}`} style={{ minHeight:52, background:"#fafafa", borderRight:`1px solid ${G.border}`, borderBottom:`1px solid ${G.border}` }} />;
            const dk=String(d), dayJobs=jobsByDate[dk]||[];
            const dateStr=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const isToday=dateStr===todayStr, isSel=sel===d;
            const hasWon=dayJobs.some(j=>j.status==="won");
            return (
              <div key={d} onClick={()=>setSel(isSel?null:d)} style={{
                minHeight:52, padding:"4px 4px", cursor:"pointer", position:"relative",
                borderRight:`1px solid ${G.border}`, borderBottom:`1px solid ${G.border}`,
                background:isSel?G.mint:isToday?"#f0fdf4":"white",
                boxShadow:isSel?`inset 0 0 0 2px ${G.light}`:isToday?`inset 0 0 0 1.5px ${G.soft}`:"none",
                transition:"background .1s",
              }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, fontWeight:isToday?800:500, color:isToday?G.light:G.text,
                    background:isToday?G.mint:"transparent", borderRadius:99, padding:isToday?"1px 5px":"0",
                    lineHeight:1.4 }}>{d}</span>
                  {hasWon&&<span style={{ color:G.gold, fontSize:8 }}>★</span>}
                </div>
                {dayJobs.length>0&&(
                  <div style={{ marginTop:2, display:"flex", flexDirection:"column", gap:1 }}>
                    {dayJobs.slice(0,1).map(j=>{
                      const s=STATUSES[j.status]||STATUSES.quote;
                      return <div key={j.id} style={{ fontSize:9, borderRadius:3, padding:"1px 3px", background:s.bg, color:s.text, borderLeft:`2px solid ${s.dot}`, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{j.billTo||j.customer}</div>;
                    })}
                    {dayJobs.length>1&&<div style={{ fontSize:9, color:G.muted }}>+{dayJobs.length-1}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {sel && selJobs.length>0 && (
        <div style={{ background:G.card, borderRadius:16, padding:18, marginBottom:20, boxShadow:`0 2px 12px ${G.border}` }}>
          <h3 style={{ margin:"0 0 12px", fontSize:15, fontWeight:700, color:G.text }}>{MO_NAMES[month]} {sel} — {selJobs.length} job{selJobs.length!==1?"s":""}</h3>
          {selJobs.map((j,idx)=>(
            <div key={j.id} onClick={()=>onEdit&&onEdit(j)} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"10px 0", borderBottom:idx<selJobs.length-1?`1px solid ${G.border}`:"none",
              gap:8, cursor:"pointer", borderRadius:8,
              transition:"background .1s",
            }}
            onMouseEnter={e=>e.currentTarget.style.background=G.mint}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:14, color:G.text }}>{j.billTo||j.customer}</div>
                <div style={{ fontSize:12, color:G.muted }}>{[j.jobName, j.installType, j.projectType].filter(Boolean).join(" · ")}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontWeight:700, color:G.light, fontSize:15 }}>{fmt$(j.amount)}</div>
                <Badge status={j.status} />
              </div>
              <span style={{ fontSize:16, color:G.muted }}>›</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Recent Jobs ── */}
      {(() => {
        const recent = [...jobs].sort((a,b)=>b.id-a.id).slice(0,8);
        if (!recent.length) return null;
        return (
          <div style={{ background:G.card, borderRadius:16, padding:"16px 18px", marginBottom:20, boxShadow:`0 2px 12px ${G.border}` }}>
            <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700, color:G.text }}>🕐 Recently Added</h3>
            {recent.map((j,idx)=>(
              <div key={j.id} onClick={()=>onEdit&&onEdit(j)} style={{
                display:"flex", alignItems:"center", gap:10, padding:"9px 0",
                borderBottom:idx<recent.length-1?`1px solid ${G.border}`:"none",
                cursor:"pointer",
              }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:G.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{j.billTo||j.customer}</div>
                  <div style={{ fontSize:11, color:G.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{j.jobName||j.address||"—"}</div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:G.light }}>{fmt$(j.amount)}</div>
                  <Badge status={j.status} />
                </div>
                {(j.status==="quote"||j.status==="open"||j.status==="in_progress") && onStatusChange && (
                  <button
                    onClick={e=>{ e.stopPropagation(); onStatusChange(j.id, j.status==="quote"?"won":"won"); }}
                    style={{ padding:"4px 10px", borderRadius:8, border:`1.5px solid ${G.gold}`, background:"#fffbeb", color:G.gold, fontWeight:700, fontSize:11, cursor:"pointer", flexShrink:0 }}>
                    {j.status==="quote"?"Won":"Done"}
                  </button>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Active Jobs This Month ── */}
      {(() => {
        const monthJobs = Object.values(jobsByDate).flat()
          .filter(j=>j.status!=="won"&&j.status!=="lost")
          .sort((a,b)=>b.id-a.id);
        if (!monthJobs.length) return null;
        return (
          <div style={{ background:G.card, borderRadius:16, padding:"16px 18px", marginBottom:20, boxShadow:`0 2px 12px ${G.border}` }}>
            <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700, color:G.text }}>📅 Active Jobs — {MO_NAMES[month]}</h3>
            {monthJobs.map((j,idx)=>(
              <div key={j.id} onClick={()=>onEdit&&onEdit(j)} style={{
                display:"flex", alignItems:"center", gap:10, padding:"9px 0",
                borderBottom:idx<monthJobs.length-1?`1px solid ${G.border}`:"none",
                cursor:"pointer",
              }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:G.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{j.billTo||j.customer}</div>
                  <div style={{ fontSize:11, color:G.muted }}>{[j.installType, j.projectManager&&`PM: ${j.projectManager}`, fmtDate(j.start)].filter(Boolean).join(" · ")}</div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:G.light }}>{fmt$(j.amount)}</div>
                  <Badge status={j.status} />
                </div>
                {onStatusChange && (
                  <button
                    onClick={e=>{ e.stopPropagation(); onStatusChange(j.id, j.status==="quote"?"won":"won"); }}
                    style={{ padding:"4px 10px", borderRadius:8, border:`1.5px solid ${G.light}`, background:G.mint, color:G.dark, fontWeight:700, fontSize:11, cursor:"pointer", flexShrink:0 }}>
                    {j.status==="quote"?"Won":"Complete"}
                  </button>
                )}
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// ─── Jobs List ────────────────────────────────────────────────────────────
const JOB_GROUPS = [
  { key:"quoted",  label:"Quoted",  statuses:["quote"],               icon:"📋" },
  { key:"active",  label:"Active",  statuses:["open","in_progress"],  icon:"🔧" },
  { key:"won",     label:"Won",     statuses:["won"],                  icon:"🏆" },
  { key:"lost",    label:"Lost",    statuses:["lost"],                 icon:"📁" },
];

function JobsView({ jobs, onAdd, onEdit, onDelete, onBulkDelete, onStatusChange, initialFilter, onFilterUsed }) {
  const [search,    setSearch]    = useState("");
  const [collapsed, setCollapsed] = useState(() => {
    // If navigating to a specific status, expand that group
    const base = { won:true, lost:true };
    if (initialFilter==="won")   base.won=false;
    if (initialFilter==="lost")  base.lost=false;
    return base;
  });
  const [exporting, setExporting] = useState(false);
  const [selected,  setSelected]  = useState(new Set());

  // Scroll to the relevant group when arriving from dashboard
  useEffect(()=>{ if(initialFilter && onFilterUsed) onFilterUsed(); }, []);

  const filtered = useMemo(() => {
    const base = [...jobs].sort((a,b)=>b.id-a.id);
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(j =>
      (j.customer||"").toLowerCase().includes(q)
      || (j.billTo||"").toLowerCase().includes(q)
      || (j.jobName||"").toLowerCase().includes(q)
      || (j.address||"").toLowerCase().includes(q)
      || (j.projectManager||"").toLowerCase().includes(q)
      || (j.salesRep1||"").toLowerCase().includes(q)
      || (j.quoteHoldNum||"").toLowerCase().includes(q)
      || (j.notes||"").toLowerCase().includes(q)
    );
  }, [jobs, search]);

  const allIds           = filtered.map(j=>j.id);
  const allChecked       = allIds.length>0 && allIds.every(id=>selected.has(id));
  const someChecked      = allIds.some(id=>selected.has(id));
  const selectedFiltered = allIds.filter(id=>selected.has(id));
  const toggleAll        = () => setSelected(allChecked ? new Set() : new Set(allIds));
  const toggle           = id => setSelected(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleGroup      = key => setCollapsed(c=>({...c,[key]:!c[key]}));

  const JobRow = ({ j, isLast }) => (
    <div style={{
      display:"flex", alignItems:"flex-start", gap:12, padding:"12px 18px",
      borderBottom:isLast?"none":`1px solid ${G.border}`,
      background:selected.has(j.id)?G.mint:"white", transition:"background .1s",
    }}>
      <input type="checkbox" checked={selected.has(j.id)} onChange={()=>toggle(j.id)}
        style={{ width:16, height:16, cursor:"pointer", marginTop:4, accentColor:G.light }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontWeight:700, fontSize:15, color:G.text }}>{j.billTo||j.customer}</span>
          {j.scheduleStatus && <span style={{ fontSize:11, background:G.mint, color:G.dark, borderRadius:6, padding:"1px 7px", fontWeight:600 }}>{j.scheduleStatus}</span>}
        </div>
        {j.jobName && <div style={{ fontSize:13, color:G.text, marginTop:2, fontWeight:500 }}>📍 {j.jobName}</div>}
        <div style={{ fontSize:12, color:G.muted, marginTop:3 }}>
          {[j.quoteHoldNum&&`#${j.quoteHoldNum}`, j.installType, j.projectType, j.endUseSegment].filter(Boolean).join(" · ")}
        </div>
        <div style={{ fontSize:12, color:G.muted, marginTop:2 }}>
          {[j.projectManager&&`PM: ${j.projectManager}`, j.salesRep1&&`Rep: ${j.salesRep1}`, j.address].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <div style={{ fontWeight:800, fontSize:15, color:G.light }}>{fmt$(j.amount)}</div>
        <div style={{ fontSize:11, color:G.muted, marginBottom:6 }}>{fmtDate(j.start)}</div>
        <div style={{ display:"flex", gap:5, justifyContent:"flex-end", flexWrap:"wrap" }}>
          {j.status==="quote" && onStatusChange && (
            <button onClick={()=>onStatusChange(j.id,"won")}
              style={{ padding:"4px 10px", borderRadius:8, border:`1.5px solid ${G.gold}`, background:"#fffbeb", color:G.gold, fontWeight:700, fontSize:11, cursor:"pointer" }}>
              🏆 Won
            </button>
          )}
          {(j.status==="open"||j.status==="in_progress") && onStatusChange && (
            <button onClick={()=>onStatusChange(j.id,"won")}
              style={{ padding:"4px 10px", borderRadius:8, border:`1.5px solid ${G.light}`, background:G.mint, color:G.dark, fontWeight:700, fontSize:11, cursor:"pointer" }}>
              ✓ Done
            </button>
          )}
          {(j.status==="quote"||j.status==="open"||j.status==="in_progress") && onStatusChange && (
            <button onClick={()=>onStatusChange(j.id,"lost")}
              style={{ padding:"4px 8px", borderRadius:8, border:`1.5px solid ${G.border}`, background:"#f9fafb", color:G.muted, fontWeight:700, fontSize:11, cursor:"pointer" }}>
              ✗
            </button>
          )}
          <Btn variant="ghost" small onClick={()=>onEdit(j)}>Edit</Btn>
          <Btn variant="danger" small onClick={()=>onDelete(j.id)}>🗑</Btn>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:G.text }}>📋 Jobs</h1>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          {selectedFiltered.length>0 && (
            <Btn variant="danger" small onClick={()=>{ onBulkDelete(selectedFiltered); setSelected(new Set()); }}>
              🗑 {selectedFiltered.length} Selected
            </Btn>
          )}
          <button onClick={async()=>{ setExporting(true); try{ await exportJobsToExcel(filtered); }finally{ setExporting(false); } }}
            disabled={exporting}
            style={{ padding:"7px 14px", borderRadius:10, border:`1.5px solid ${G.border}`, background:G.card, color:G.dark, fontSize:13, fontWeight:600, cursor:"pointer" }}>
            {exporting?"Exporting…":"⬇ Export"}
          </button>
          <Btn onClick={onAdd} variant="gold">+ Add Job</Btn>
        </div>
      </div>

      {/* Search */}
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search jobs, customer, PM, rep, quote #..."
        style={{ width:"100%", boxSizing:"border-box", padding:"10px 14px", borderRadius:10, border:`1.5px solid ${G.border}`, fontSize:14, background:G.card, color:G.text, outline:"none", marginBottom:18 }} />

      {/* Bulk select bar */}
      {someChecked && (
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", background:G.mint, borderRadius:10, marginBottom:12 }}>
          <input type="checkbox" checked={allChecked} onChange={toggleAll}
            ref={el=>{ if(el) el.indeterminate=someChecked&&!allChecked; }}
            style={{ width:16, height:16, cursor:"pointer", accentColor:G.light }} />
          <span style={{ fontSize:13, fontWeight:600, color:G.dark }}>{selectedFiltered.length} selected</span>
        </div>
      )}

      {/* Grouped sections */}
      {filtered.length===0 && (
        <div style={{ textAlign:"center", padding:48, color:G.muted, background:G.card, borderRadius:18 }}>No jobs found</div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {JOB_GROUPS.map(grp => {
          const grpJobs = filtered.filter(j => grp.statuses.includes(j.status));
          if (grpJobs.length===0) return null;
          const total   = grpJobs.reduce((s,j)=>s+j.amount,0);
          const isOpen  = !collapsed[grp.key];
          const sv      = STATUSES[grp.statuses[0]];
          return (
            <div key={grp.key} style={{ background:G.card, borderRadius:18, overflow:"hidden", boxShadow:`0 2px 12px ${G.border}` }}>
              {/* Group header */}
              <div onClick={()=>toggleGroup(grp.key)} style={{
                display:"flex", alignItems:"center", gap:10, padding:"12px 18px",
                background:`linear-gradient(135deg,${sv.bg} 0%,#fff 100%)`,
                cursor:"pointer", userSelect:"none",
                borderBottom:isOpen?`1px solid ${G.border}`:"none",
              }}>
                <span style={{ fontSize:16 }}>{grp.icon}</span>
                <span style={{ fontWeight:800, fontSize:15, color:sv.text, flex:1 }}>{grp.label}</span>
                <span style={{ fontSize:12, fontWeight:700, background:sv.bg, color:sv.text, border:`1px solid ${sv.dot}`, borderRadius:20, padding:"2px 10px" }}>
                  {grpJobs.length} job{grpJobs.length!==1?"s":""}
                </span>
                <span style={{ fontSize:13, fontWeight:800, color:G.light, minWidth:80, textAlign:"right" }}>{fmt$(total)}</span>
                <span style={{ fontSize:12, color:G.muted, marginLeft:4 }}>{isOpen?"▲":"▼"}</span>
              </div>
              {/* Rows */}
              {isOpen && grpJobs.map((j,idx)=>(
                <JobRow key={j.id} j={j} isLast={idx===grpJobs.length-1} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Urgency color for job chips ──────────────────────────────────────────
// Based on close date proximity. Won/Lost use their own status color.
function getUrgency(job) {
  if (job.status==="won")  return { dot:"#16a34a", bg:"#dcfce7", text:"#14532d", label:"Won"    };
  if (job.status==="lost") return { dot:"#9ca3af", bg:"#f9fafb", text:"#6b7280", label:"Lost"   };
  if (!job.close)          return { dot:"#ef4444", bg:"#fef2f2", text:"#991b1b", label:"No date" };
  const days = Math.round((new Date(job.close+"T12:00:00") - new Date()) / 86400000);
  if (days < 0)            return { dot:"#ef4444", bg:"#fef2f2", text:"#991b1b", label:"Overdue" };
  if (days <= 14)          return { dot:"#16a34a", bg:"#dcfce7", text:"#14532d", label:"≤14 days" };
  if (days <= 45)          return { dot:"#f59e0b", bg:"#fffbeb", text:"#92400e", label:"15–45 days" };
  return                          { dot:"#ef4444", bg:"#fef2f2", text:"#991b1b", label:">45 days" };
}

// ─── Archive helpers ──────────────────────────────────────────────────────
function loadArchivedCustomers() {
  try { return JSON.parse(localStorage.getItem("crm_archived")||"[]"); } catch { return []; }
}
function toggleArchive(name) {
  const list = loadArchivedCustomers();
  const idx  = list.indexOf(name);
  if (idx>=0) list.splice(idx,1); else list.push(name);
  localStorage.setItem("crm_archived", JSON.stringify(list));
}

// ─── Quote base parser ────────────────────────────────────────────────────
// "10229-4" → "10229"   "9172-1" → "9172"   "MISC" → "MISC"
function baseQuote(q) {
  if (!q) return null;
  const m = q.match(/^(.+)-\d+$/);
  return m ? m[1] : q;
}

// ─── Job Chip ─────────────────────────────────────────────────────────────
function JobChip({ job, onClick }) {
  const u = getUrgency(job);
  const label = job.quoteHoldNum || job.jobName || `#${job.id}`;
  const display = label.length > 22 ? label.slice(0,20)+"…" : label;
  const [hov, setHov] = useState(false);
  return (
    <div onClick={()=>onClick(job)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      title={[job.jobName, fmt$(job.amount), job.close?`Close: ${fmtDate(job.close)}`:"No close date"].filter(Boolean).join(" · ")}
      style={{
        display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20,
        background:hov?u.bg:"#f7faf8", border:`1.5px solid ${u.dot}`,
        cursor:"pointer", transition:"all .12s", fontSize:12, fontWeight:600,
        color:hov?u.text:G.text, boxShadow:hov?`0 2px 8px ${u.dot}44`:"none", whiteSpace:"nowrap",
      }}>
      <span style={{ width:7, height:7, borderRadius:"50%", background:u.dot, flexShrink:0 }} />
      {display}
      <span style={{ fontSize:11, color:G.muted, fontWeight:500 }}>{fmt$(job.amount)}</span>
    </div>
  );
}

// ─── Quote Group Chip ─────────────────────────────────────────────────────
// Shows a collapsed parent chip; click expands to show sub-iterations inline
function QuoteGroupChip({ base, jobs, onClick }) {
  const [open, setOpen] = useState(false);
  // Use the urgency of the most urgent sub-job for the parent dot
  const worst = jobs.reduce((a,b) => {
    const au = getUrgency(a), bu = getUrgency(b);
    const order = ["#ef4444","#f59e0b","#16a34a","#9ca3af"];
    return order.indexOf(au.dot) <= order.indexOf(bu.dot) ? a : b;
  });
  const u = getUrgency(worst);
  const total = jobs.reduce((s,j)=>s+j.amount,0);
  return (
    <div style={{ display:"inline-flex", flexDirection:"column", gap:4 }}>
      {/* Parent chip */}
      <div onClick={()=>setOpen(o=>!o)}
        style={{
          display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20,
          background:open?u.bg:"#f7faf8", border:`1.5px solid ${u.dot}`,
          cursor:"pointer", transition:"all .12s", fontSize:12, fontWeight:700,
          color:open?u.text:G.text, whiteSpace:"nowrap",
        }}>
        <span style={{ width:7, height:7, borderRadius:"50%", background:u.dot, flexShrink:0 }} />
        {base}
        <span style={{ fontSize:10, fontWeight:800, background:u.dot, color:"#fff", borderRadius:99, padding:"1px 6px" }}>
          {jobs.length}
        </span>
        <span style={{ fontSize:11, color:G.muted, fontWeight:500 }}>{fmt$(total)}</span>
        <span style={{ fontSize:10, color:G.muted }}>{open?"▲":"▼"}</span>
      </div>
      {/* Sub-chips — shown when expanded */}
      {open && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:4, paddingLeft:10, borderLeft:`2px solid ${u.dot}33` }}>
          {jobs.map(j=>(
            <div key={j.id} onClick={()=>onClick(j)}
              style={{
                display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px",
                borderRadius:16, border:`1.5px solid ${getUrgency(j).dot}`,
                background:getUrgency(j).bg, cursor:"pointer", fontSize:11, fontWeight:600,
                color:getUrgency(j).text, whiteSpace:"nowrap", transition:"opacity .1s",
              }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:getUrgency(j).dot, flexShrink:0 }} />
              {j.quoteHoldNum||`#${j.id}`}
              <span style={{ fontSize:10, color:G.muted, fontWeight:500 }}>{fmt$(j.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Customer Card ────────────────────────────────────────────────────────
function CustomerCard({ c, onJobClick, isArchived, onToggleArchive }) {
  // Group jobs by base quote number
  const groups = useMemo(() => {
    const map = {};
    c.jobs.forEach(j => {
      const base = baseQuote(j.quoteHoldNum) || `_id_${j.id}`;
      if (!map[base]) map[base] = { base, jobs:[] };
      map[base].jobs.push(j);
    });
    // Sort groups newest first (by max job id in group)
    return Object.values(map).sort((a,b)=>Math.max(...b.jobs.map(j=>j.id))-Math.max(...a.jobs.map(j=>j.id)));
  }, [c.jobs]);

  const statusCounts = useMemo(()=>{
    const m={};
    c.jobs.forEach(j=>{ m[j.status]=(m[j.status]||0)+1; });
    return m;
  },[c.jobs]);

  return (
    <div style={{ background:isArchived?"#f9fafb":G.card, borderRadius:18, padding:"16px 18px 18px",
      boxShadow:`0 2px 12px ${G.border}`, opacity:isArchived?.7:1 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div style={{ fontWeight:800, fontSize:15, color:isArchived?G.muted:G.text, lineHeight:1.3, flex:1, marginRight:8 }}>{c.name}</div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
          <div style={{ fontWeight:800, fontSize:15, color:G.light }}>{fmt$(c.total)}</div>
          <div style={{ fontSize:11, color:G.muted }}>{c.jobs.length} job{c.jobs.length!==1?"s":""}</div>
          <button onClick={onToggleArchive}
            style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:8, border:`1px solid ${G.border}`,
              background:"#f9fafb", color:G.muted, cursor:"pointer", marginTop:2 }}>
            {isArchived ? "📤 Unarchive" : "📦 Archive"}
          </button>
        </div>
      </div>
      {/* Status badges */}
      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
        {Object.entries(statusCounts).map(([st,n])=>{
          const sv=STATUSES[st]||STATUSES.quote;
          return <span key={st} style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10, background:sv.bg, color:sv.text }}>{sv.label} ×{n}</span>;
        })}
      </div>
      {/* Quote groups */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {groups.map(g => g.jobs.length===1
          ? <JobChip key={g.base} job={g.jobs[0]} onClick={onJobClick} />
          : <QuoteGroupChip key={g.base} base={g.base} jobs={g.jobs} onClick={onJobClick} />
        )}
      </div>
    </div>
  );
}

// ─── Customers ────────────────────────────────────────────────────────────
function CustomersView({ jobs, onJobClick }) {
  const [search,      setSearch]      = useState("");
  const [showArchived,setShowArchived]= useState(false);
  const [archived,    setArchived]    = useState(()=>loadArchivedCustomers());

  const handleToggleArchive = name => {
    toggleArchive(name);
    setArchived(loadArchivedCustomers());
  };

  const customers = useMemo(() => {
    const map = {};
    jobs.forEach(j => {
      const name = j.billTo || j.customer || "Unknown";
      if (!map[name]) map[name] = { name, jobs:[], total:0 };
      map[name].jobs.push(j);
      map[name].total += j.amount;
    });
    return Object.values(map)
      .sort((a,b)=>b.total-a.total)
      .map(c=>({ ...c, jobs:[...c.jobs].sort((a,b)=>b.id-a.id) }));
  }, [jobs]);

  const active   = useMemo(()=>customers.filter(c=>!archived.includes(c.name)), [customers,archived]);
  const archList = useMemo(()=>customers.filter(c=> archived.includes(c.name)), [customers,archived]);

  const applySearch = list => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.jobs.some(j=>(j.jobName||"").toLowerCase().includes(q)||(j.quoteHoldNum||"").toLowerCase().includes(q))
    );
  };

  const visibleActive   = applySearch(active);
  const visibleArchived = applySearch(archList);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, flexWrap:"wrap", gap:10 }}>
        <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:G.text }}>👥 Customers</h1>
        <span style={{ fontSize:13, color:G.muted }}>{active.length} active · {archList.length} archived</span>
      </div>

      {/* Legend */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center", marginBottom:14 }}>
        <span style={{ fontSize:11, fontWeight:700, color:G.muted, textTransform:"uppercase", letterSpacing:.5, marginRight:4 }}>Chip color = close date:</span>
        {[
          { dot:"#16a34a", label:"≤ 14 days" },
          { dot:"#f59e0b", label:"15–45 days" },
          { dot:"#ef4444", label:"> 45 days / overdue / no date" },
          { dot:"#9ca3af", label:"Lost" },
        ].map(l=>(
          <span key={l.label} style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, color:G.muted }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:l.dot, display:"inline-block" }} />
            {l.label}
          </span>
        ))}
        <span style={{ fontSize:11, color:G.muted, marginLeft:8 }}>· Chips with a <b>number badge</b> have multiple sub-quotes — click to expand</span>
      </div>

      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customers or jobs…"
        style={{ width:"100%", boxSizing:"border-box", padding:"9px 14px", borderRadius:10, border:`1.5px solid ${G.border}`, fontSize:14, background:G.card, color:G.text, outline:"none", marginBottom:20 }} />

      {/* Active customers */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16, marginBottom:24 }}>
        {visibleActive.map(c=>(
          <CustomerCard key={c.name} c={c} onJobClick={onJobClick} isArchived={false} onToggleArchive={()=>handleToggleArchive(c.name)} />
        ))}
        {visibleActive.length===0 && (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:40, color:G.muted }}>No customers found</div>
        )}
      </div>

      {/* Archived section */}
      {archList.length>0 && (
        <div>
          <button onClick={()=>setShowArchived(s=>!s)}
            style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:`1.5px solid ${G.border}`, borderRadius:10, padding:"8px 16px", cursor:"pointer", color:G.muted, fontWeight:600, fontSize:13, marginBottom:16 }}>
            📦 {showArchived?"Hide":"Show"} Archived ({archList.length})
          </button>
          {showArchived && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
              {visibleArchived.map(c=>(
                <CustomerCard key={c.name} c={c} onJobClick={onJobClick} isArchived={true} onToggleArchive={()=>handleToggleArchive(c.name)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Import History helpers ────────────────────────────────────────────────
function loadImportHistory() {
  try { const r = localStorage.getItem("crm_import_history"); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveImportHistory(entry) {
  try {
    const hist = loadImportHistory();
    hist.unshift(entry); // newest first
    localStorage.setItem("crm_import_history", JSON.stringify(hist.slice(0, 50)));
  } catch {}
}

// ─── Import Tab ───────────────────────────────────────────────────────────
function ImportView({ onImportDone }) {
  const [dragging, setDragging] = useState(false);
  const [file,     setFile]     = useState(null);
  const [parsed,   setParsed]   = useState([]);
  const [errors,   setErrors]   = useState([]);
  const [importing,setImporting]= useState(false);
  const [parsing,  setParsing]  = useState(false);
  const [done,     setDone]     = useState(null);
  const [history,  setHistory]  = useState([]);
  const inputRef = useRef(null);

  useEffect(() => { setHistory(loadImportHistory()); }, []);

  const handleFile = useCallback(async f => {
    if (!f) return;
    setFile(f); setParsed([]); setErrors([]); setDone(null); setParsing(true);
    try {
      const XLSX = await loadXLSX();
      const buf  = await f.arrayBuffer();
      const wb   = XLSX.read(buf, { type:"array", cellText:true, cellDates:false });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const { jobs, errors:errs } = parseImportSheet(ws, XLSX);
      setParsed(jobs); setErrors(errs);
    } catch(e) {
      setErrors([String(e.message||e)]);
    } finally { setParsing(false); }
  }, []);

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, [handleFile]);

  const doImport = async () => {
    if (!parsed.length) return;
    setImporting(true);
    try {
      // Deduplicate by id — keep last occurrence (in case Excel has duplicate Job #s)
      const seen = new Map();
      parsed.forEach(j => seen.set(j.id, j));
      const unique = Array.from(seen.values()).map(jobToRow);

      // Supabase has a max batch size — chunk into 200 rows at a time
      const CHUNK = 200;
      for (let i = 0; i < unique.length; i += CHUNK) {
        const chunk = unique.slice(i, i + CHUNK);
        const { error } = await supabase.from("jobs").upsert(chunk, { onConflict:"id" });
        if (error) throw error;
      }

      const entry = { filename: file?.name||"unknown", date: new Date().toISOString(), count: unique.length };
      saveImportHistory(entry);
      setHistory(loadImportHistory());
      setDone({ count:unique.length });
      onImportDone();
    } catch(e) {
      setErrors(prev=>[...prev, String(e.message||e)]);
    } finally { setImporting(false); }
  };

  const reset = () => { setFile(null); setParsed([]); setErrors([]); setDone(null); };
  const clearHistory = () => { try { localStorage.removeItem("crm_import_history"); } catch {} setHistory([]); };

  const fmtHistDate = iso => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US",{ month:"short", day:"numeric", year:"numeric" }) + " at " + d.toLocaleTimeString("en-US",{ hour:"numeric", minute:"2-digit" });
  };

  return (
    <div>
      <h1 style={{ margin:"0 0 6px", fontSize:26, fontWeight:800, color:G.text }}>⬇ Import Jobs</h1>
      <p style={{ margin:"0 0 24px", color:G.muted, fontSize:14 }}>Drop your monthly Excel spreadsheet to sync all jobs automatically.</p>

      {/* ── Import History ── */}
      {history.length > 0 && !file && !done && (
        <div style={{ background:G.card, borderRadius:16, padding:18, marginBottom:24, boxShadow:`0 2px 12px ${G.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ fontWeight:700, fontSize:15, color:G.text }}>📂 Import History</span>
            <button onClick={clearHistory} style={{ background:"none", border:"none", fontSize:12, color:G.muted, cursor:"pointer", padding:"2px 8px" }}>Clear history</button>
          </div>
          {history.map((h,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 0", borderBottom: i<history.length-1?`1px solid ${G.border}`:"none" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:18 }}>📄</span>
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color:G.text }}>{h.filename}</div>
                  <div style={{ fontSize:11, color:G.muted, marginTop:1 }}>{fmtHistDate(h.date)}</div>
                </div>
              </div>
              <span style={{ background:G.mint, color:G.dark, borderRadius:8, padding:"3px 10px", fontSize:12, fontWeight:700 }}>
                {h.count} jobs
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Drop Zone ── */}
      {!file && (
        <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
          onDrop={onDrop} onClick={()=>inputRef.current?.click()}
          style={{ border:`2.5px dashed ${dragging?G.light:G.border}`, borderRadius:20, padding:"48px 32px",
            textAlign:"center", cursor:"pointer", background:dragging?G.mint:G.bg, transition:"all .2s",
            boxShadow:dragging?`0 0 0 4px ${G.light}22`:"none" }}>
          <div style={{ fontSize:52, marginBottom:14 }}>📥</div>
          <div style={{ fontSize:18, fontWeight:700, color:G.text, marginBottom:6 }}>
            {dragging ? "Drop it!" : "Drop your Excel file here"}
          </div>
          <div style={{ fontSize:13, color:G.muted, marginBottom:18 }}>or click to browse — .xlsx, .xls</div>
          <Btn variant="ghost" small>📁 Browse File</Btn>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }}
            onChange={e=>{ if(e.target.files[0]) handleFile(e.target.files[0]); }} />
        </div>
      )}

      {parsing && <div style={{ textAlign:"center", padding:32, color:G.muted }}>⚙ Parsing spreadsheet...</div>}

      {errors.length>0 && (
        <div style={{ background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:14, padding:16, marginBottom:16 }}>
          <div style={{ fontWeight:700, color:G.red, marginBottom:6 }}>⚠ Issues:</div>
          {errors.map((e,i)=><div key={i} style={{ fontSize:13, color:G.red }}>{e}</div>)}
        </div>
      )}

      {done && (
        <div style={{ background:"#f0fdf4", border:`1.5px solid ${G.border}`, borderRadius:14, padding:18, textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:8 }}>✅</div>
          <div style={{ fontWeight:700, fontSize:18, color:G.text }}>Import Complete!</div>
          <div style={{ color:G.muted, fontSize:14, marginTop:4 }}>{done.count} jobs synced.</div>
          <div style={{ marginTop:14 }}><Btn variant="ghost" small onClick={reset}>Import Another</Btn></div>
        </div>
      )}

      {/* ── Preview Table ── */}
      {parsed.length>0 && !done && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <span style={{ fontWeight:700, fontSize:16, color:G.text }}>{parsed.length} jobs found in <em>{file?.name}</em></span>
            <div style={{ display:"flex", gap:8 }}>
              <Btn variant="ghost" small onClick={reset}>Clear</Btn>
              <Btn variant="gold" onClick={doImport} disabled={importing}>
                {importing ? "Syncing..." : `⬆ Sync ${parsed.length} Jobs`}
              </Btn>
            </div>
          </div>
          <div style={{ background:G.card, borderRadius:16, overflow:"hidden", boxShadow:`0 2px 12px ${G.border}` }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:G.mint }}>
                    {["Bill To Customer","Job Name","Quote #","Type","Segment","Project Type","PM","Amount","Status"].map(h=>(
                      <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontWeight:700, color:G.dark, textTransform:"uppercase", fontSize:11, letterSpacing:.3, whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0,60).map((j,i)=>(
                    <tr key={j.id} style={{ borderTop:`1px solid ${G.border}`, background:i%2===0?"transparent":G.bg }}>
                      <td style={{ padding:"8px 12px", fontWeight:600, color:G.text, whiteSpace:"nowrap" }}>{j.billTo||j.customer}</td>
                      <td style={{ padding:"8px 12px", color:G.muted, maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{j.jobName||"—"}</td>
                      <td style={{ padding:"8px 12px", color:G.muted, whiteSpace:"nowrap" }}>{j.quoteHoldNum||"—"}</td>
                      <td style={{ padding:"8px 12px", color:G.muted }}>{j.installType||"—"}</td>
                      <td style={{ padding:"8px 12px", color:G.muted }}>{j.endUseSegment||"—"}</td>
                      <td style={{ padding:"8px 12px", color:G.muted, whiteSpace:"nowrap" }}>{j.projectType||"—"}</td>
                      <td style={{ padding:"8px 12px", color:G.muted, whiteSpace:"nowrap" }}>{j.projectManager||"—"}</td>
                      <td style={{ padding:"8px 12px", fontWeight:700, color:G.light, whiteSpace:"nowrap" }}>{fmt$(j.amount)}</td>
                      <td style={{ padding:"8px 12px" }}><Badge status={j.status} /></td>
                    </tr>
                  ))}
                  {parsed.length>60&&<tr><td colSpan={9} style={{ padding:"10px 12px", textAlign:"center", color:G.muted, fontSize:12 }}>...and {parsed.length-60} more</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────
function CalendarView({ jobs, onAdd }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [sel,   setSel]   = useState(null);
  const todayStr = today();

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();

  const jobsByDate = useMemo(() => {
    const map = {};
    jobs.forEach(j => {
      const key = j.start||j.close; if (!key) return;
      const [y,m,d] = key.split("-").map(Number);
      if (y===year && m-1===month) {
        const dk = String(d);
        if (!map[dk]) map[dk]=[];
        map[dk].push(j);
      }
    });
    return map;
  }, [jobs, year, month]);

  const monthStats = useMemo(() => {
    const arr = Object.values(jobsByDate).flat();
    return {
      pipeline: arr.filter(j=>j.status!=="won"&&j.status!=="lost").reduce((s,j)=>s+j.amount,0),
      won:      arr.filter(j=>j.status==="won").reduce((s,j)=>s+j.amount,0),
    };
  }, [jobsByDate]);

  const selJobs  = sel ? (jobsByDate[String(sel)]||[]) : [];
  const prevMonth = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); setSel(null); };
  const nextMonth = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); setSel(null); };

  const cells = [];
  for (let i=0;i<firstDay;i++) cells.push(null);
  for (let d=1;d<=daysInMonth;d++) cells.push(d);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div>
          <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:G.text }}>📅 Calendar</h1>
          <div style={{ fontSize:13, color:G.muted, marginTop:3 }}>
            Pipeline: <b style={{color:G.light}}>{fmt$(monthStats.pipeline)}</b>
            &nbsp;&nbsp;Won: <b style={{color:G.gold}}>{fmt$(monthStats.won)}</b>
          </div>
        </div>
        <Btn onClick={onAdd} variant="gold" small>+ Add Job</Btn>
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:20, marginBottom:14 }}>
        <button onClick={prevMonth} style={{ background:G.card, border:`1.5px solid ${G.border}`, borderRadius:10, padding:"6px 14px", cursor:"pointer", fontSize:16, color:G.text }}>←</button>
        <span style={{ fontSize:20, fontWeight:800, color:G.text, minWidth:180, textAlign:"center" }}>{MO_NAMES[month]} {year}</span>
        <button onClick={nextMonth} style={{ background:G.card, border:`1.5px solid ${G.border}`, borderRadius:10, padding:"6px 14px", cursor:"pointer", fontSize:16, color:G.text }}>→</button>
      </div>
      <div style={{ background:G.card, borderRadius:18, overflow:"hidden", boxShadow:`0 2px 12px ${G.border}` }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", background:G.mint }}>
          {WEEKDAYS.map(d=><div key={d} style={{ padding:"10px 0", textAlign:"center", fontSize:12, fontWeight:700, color:G.dark }}>{d}</div>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
          {cells.map((d,i)=>{
            if (!d) return <div key={`e${i}`} style={{ minHeight:70, background:"#fafafa", borderRight:`1px solid ${G.border}`, borderBottom:`1px solid ${G.border}` }} />;
            const dk=String(d), dayJobs=jobsByDate[dk]||[];
            const dateStr=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const isToday=dateStr===todayStr, isSel=sel===d;
            const hasWon=dayJobs.some(j=>j.status==="won");
            const dayTotal=dayJobs.reduce((s,j)=>s+j.amount,0);
            return (
              <div key={d} onClick={()=>setSel(isSel?null:d)} style={{
                minHeight:70, padding:"6px 7px", cursor:"pointer", position:"relative",
                borderRight:`1px solid ${G.border}`, borderBottom:`1px solid ${G.border}`,
                background:isSel?G.mint:isToday?"#f0fdf4":"white",
                boxShadow:isSel?`inset 0 0 0 2px ${G.light}`:isToday?`inset 0 0 0 1.5px ${G.soft}`:"none",
              }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:13, fontWeight:isToday?800:500, color:isToday?G.light:G.text,
                    background:isToday?G.mint:"transparent", borderRadius:99, padding:isToday?"1px 6px":"0" }}>{d}</span>
                  {hasWon&&<span style={{ color:G.gold, fontSize:9 }}>★</span>}
                </div>
                <div style={{ marginTop:3, display:"flex", flexDirection:"column", gap:2 }}>
                  {dayJobs.slice(0,2).map(j=>{
                    const s=STATUSES[j.status]||STATUSES.quote;
                    return <div key={j.id} style={{ fontSize:10, borderRadius:4, padding:"1px 5px", background:s.bg, color:s.text, borderLeft:`2px solid ${s.dot}`, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{j.billTo||j.customer}</div>;
                  })}
                  {dayJobs.length>2&&<div style={{ fontSize:10, color:G.muted, paddingLeft:2 }}>+{dayJobs.length-2} more</div>}
                </div>
                {dayTotal>0&&<div style={{ position:"absolute", bottom:4, right:6, fontSize:9, color:G.muted, fontWeight:600 }}>{fmt$(dayTotal)}</div>}
              </div>
            );
          })}
        </div>
      </div>
      {sel&&selJobs.length>0&&(
        <div style={{ marginTop:14, background:G.card, borderRadius:16, padding:18, boxShadow:`0 2px 12px ${G.border}` }}>
          <h3 style={{ margin:"0 0 12px", fontSize:15, fontWeight:700, color:G.text }}>{MO_NAMES[month]} {sel} — {selJobs.length} job{selJobs.length!==1?"s":""}</h3>
          {selJobs.map(j=>(
            <div key={j.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${G.border}` }}>
              <div>
                <div style={{ fontWeight:600, fontSize:14, color:G.text }}>{j.billTo||j.customer}</div>
                <div style={{ fontSize:12, color:G.muted }}>{[j.installType,j.projectType,j.projectManager&&`PM: ${j.projectManager}`].filter(Boolean).join(" · ")}</div>
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



// ─── App Shell ────────────────────────────────────────────────────────────
export default function CountertopCRM() {
  const [tab,        setTab]        = useState("dashboard");
  const [jobFilter,  setJobFilter]  = useState("all");
  const [jobs,       setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");
  const [modal,   setModal]   = useState(null);
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const fetchJobs = useCallback(async () => {
    setDbError("");
    const { data, error } = await supabase.from("jobs").select("*").order("created_at",{ ascending:false });
    if (error) { console.error("Supabase:", error); setDbError(error.message); setJobs([]); }
    else { setJobs((data||[]).map(rowToJob)); }
    setLoading(false);
  }, []);

  useEffect(()=>{ fetchJobs(); }, [fetchJobs]);

  const handleSave = async (formData) => {
    const isEdit = modal && modal !== "add";
    const job = { ...formData, id:isEdit?modal.id:Date.now(), createdAt:isEdit?modal.createdAt:today() };
    persistJobOpts(job);
    const { error } = await supabase.from("jobs").upsert(jobToRow(job),{ onConflict:"id" });
    if (error) throw new Error(error.message);
    setModal(null);
    await fetchJobs();
    showToast(isEdit?"Job updated!":"Job added!");
  };

  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase.from("jobs").update({ status: newStatus }).eq("id", id);
    if (error) { showToast("Error: "+error.message,"error"); return; }
    await fetchJobs();
    const msgs = { won:"🏆 Marked as Won!", lost:"Marked as Lost", open:"Marked as Open" };
    showToast(msgs[newStatus]||"Status updated");
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this job?")) return;
    const { error } = await supabase.from("jobs").delete().eq("id",id);
    if (error) { showToast("Error: "+error.message,"error"); return; }
    await fetchJobs(); showToast("Job deleted");
  };

  const handleBulkDelete = async (ids) => {
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} job${ids.length!==1?"s":""}?`)) return;
    const { error } = await supabase.from("jobs").delete().in("id",ids);
    if (error) { showToast("Error: "+error.message,"error"); return; }
    await fetchJobs(); showToast(`${ids.length} job${ids.length!==1?"s":""} deleted`);
  };

  const isMobile = useIsMobile();

  const TABS = [
    ["dashboard","⛳","Dashboard"],
    ["jobs","📋","Jobs"],
    ["customers","👥","Customers"],
    ["import","⬇","Import"],
  ];

  // Count badges for tabs
  const tabCounts = useMemo(() => ({
    jobs:      jobs.filter(j=>j.status!=="won"&&j.status!=="lost").length,
    customers: [...new Set(jobs.map(j=>j.billTo||j.customer))].length,
  }), [jobs]);

  return (
    <div style={{ minHeight:"100vh", background:G.bg, fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif" }}>
      {/* Topbar */}
      <div style={{ background:`linear-gradient(135deg,${G.darkest} 0%,${G.dark} 60%,${G.mid} 100%)`, padding:"0 16px", boxShadow:"0 2px 16px rgba(0,0,0,.35)", position:"sticky", top:0, zIndex:200 }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"flex", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 0", marginRight:16, flexShrink:0 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:`linear-gradient(135deg,${G.goldLt},${G.gold})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:`0 2px 8px ${G.gold}66` }}>⛳</div>
            {!isMobile && (
              <div>
                <div style={{ color:"#fff", fontWeight:800, fontSize:15, letterSpacing:-.3 }}>FairwayStone</div>
                <div style={{ color:G.mint, fontSize:10, opacity:.8, letterSpacing:.2 }}>COUNTERTOP CRM</div>
              </div>
            )}
          </div>
          {/* Desktop nav — hidden on mobile */}
          {!isMobile && (
            <nav style={{ display:"flex", gap:2, overflow:"auto" }}>
              {TABS.map(([id,icon,label])=>(
                <button key={id} onClick={()=>setTab(id)} style={{
                  background:tab===id?`linear-gradient(135deg,${G.light}cc,${G.mid}cc)`:"transparent",
                  border:"none", color:tab===id?"#fff":`${G.mint}bb`,
                  padding:"16px 14px", cursor:"pointer", fontSize:13, fontWeight:tab===id?700:500,
                  borderBottom:tab===id?`2.5px solid ${G.goldLt}`:"2.5px solid transparent",
                  transition:"all .15s", whiteSpace:"nowrap", position:"relative",
                }}>
                  {icon} {label}
                  {tabCounts[id]>0 && (
                    <span style={{ marginLeft:5, fontSize:10, fontWeight:800, background:G.gold, color:"#fff", borderRadius:99, padding:"1px 6px", verticalAlign:"middle" }}>
                      {tabCounts[id]}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          )}
          {/* Mobile: show current tab name */}
          {isMobile && (
            <span style={{ color:"#fff", fontWeight:700, fontSize:15, flex:1, textAlign:"center" }}>
              {TABS.find(t=>t[0]===tab)?.[2]||""}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:1280, margin:"0 auto", padding:isMobile?"16px 12px 90px":"28px 20px" }}>
        {dbError && (
          <div style={{ background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:14, padding:"14px 20px", marginBottom:20, display:"flex", alignItems:"flex-start", gap:12 }}>
            <span style={{ fontSize:20 }}>⚠️</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, color:G.red, marginBottom:4 }}>Database connection error</div>
              <div style={{ fontSize:13, color:"#7f1d1d", fontFamily:"monospace" }}>{dbError}</div>
              <div style={{ fontSize:12, color:G.muted, marginTop:6 }}>Check <b>NEXT_PUBLIC_SUPABASE_URL</b> and <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> in Vercel → Settings → Environment Variables.</div>
            </div>
            <button onClick={fetchJobs} style={{ background:"none", border:`1px solid #fecaca`, borderRadius:8, padding:"4px 12px", fontSize:12, color:G.red, cursor:"pointer" }}>Retry</button>
          </div>
        )}
        {loading ? (
          <div style={{ textAlign:"center", padding:80, color:G.muted }}>
            <div style={{ fontSize:40, marginBottom:12 }}>⛳</div>
            <div>Loading your jobs...</div>
          </div>
        ) : (
          <>
            {tab==="dashboard" && <Dashboard    jobs={jobs} onAdd={()=>setModal("add")} onEdit={j=>setModal(j)} onStatusChange={handleStatusChange} onNavigate={(t,f)=>{ setTab(t); if(f) setJobFilter(f); }} />}
            {tab==="jobs"      && <JobsView     jobs={jobs} onAdd={()=>setModal("add")} onEdit={j=>setModal(j)} onDelete={handleDelete} onBulkDelete={handleBulkDelete} onStatusChange={handleStatusChange} initialFilter={jobFilter} onFilterUsed={()=>setJobFilter("all")} />}
            {tab==="customers" && <CustomersView jobs={jobs} onJobClick={j=>setModal(j)} />}
            {tab==="import"    && <ImportView   onImportDone={()=>{ fetchJobs(); showToast("Import complete!"); }} />}
          </>
        )}
      </div>

      {modal && (
        <JobModal
          job={modal==="add" ? null : modal}
          onSave={handleSave}
          onClose={()=>setModal(null)}
        />
      )}

      {/* Mobile bottom nav */}
      {isMobile && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:300,
          background:`linear-gradient(135deg,${G.darkest} 0%,${G.dark} 100%)`,
          display:"flex", borderTop:`1px solid rgba(255,255,255,.1)`,
          paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
          {TABS.map(([id,icon,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{
              flex:1, padding:"10px 4px 8px", border:"none", background:"transparent",
              display:"flex", flexDirection:"column", alignItems:"center", gap:3,
              cursor:"pointer", position:"relative",
            }}>
              <span style={{ fontSize:20, lineHeight:1 }}>{icon}</span>
              <span style={{ fontSize:9, fontWeight:tab===id?800:500, color:tab===id?G.goldLt:`${G.mint}99`, letterSpacing:.2 }}>{label}</span>
              {tab===id && <span style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:28, height:2, background:G.goldLt, borderRadius:99 }} />}
              {tabCounts[id]>0 && tab!==id && (
                <span style={{ position:"absolute", top:6, right:"50%", marginRight:-18, fontSize:8, fontWeight:800, background:G.gold, color:"#fff", borderRadius:99, padding:"1px 4px", lineHeight:1.4 }}>
                  {tabCounts[id]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom:isMobile?72:24, left:"50%", transform:"translateX(-50%)",
          background:toast.type==="error"?G.red:G.light, color:"#fff", padding:"12px 24px",
          borderRadius:12, fontWeight:600, fontSize:14, boxShadow:"0 4px 20px rgba(0,0,0,.3)", zIndex:9999,
          whiteSpace:"nowrap" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}