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
    // New fields
    customerPo:     r.customer_po||"",
    quoteHoldNum:   r.quote_hold_num||"",
    installType:    r.install_type||"",
    endUseSegment:  r.end_use_segment||"",
    projectType:    r.project_type||"",
    scheduleStatus: r.schedule_status||"",
    billTo:         r.bill_to||"",
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
    sales_rep1:      j.salesRep1||null,
    sales_rep2:      j.salesRep2||null,
    project_manager: j.projectManager||null,
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

    const address = [jobName, location].filter(Boolean).join(" — ");

    const job = {
      id:             numId,
      customer:       billTo || "Unknown",
      billTo,
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

// ─── Job Form Modal ────────────────────────────────────────────────────────
const BLANK = {
  customer:"", billTo:"", customerPo:"", quoteHoldNum:"",
  jobType:"", material:"", installType:"", endUseSegment:"", projectType:"", scheduleStatus:"",
  status:"quote", amount:"", sqft:"",
  salesRep1:"", salesRep2:"", projectManager:"",
  start:"", close:"", notes:"", address:"",
};

function JobModal({ job, onSave, onClose }) {
  const [f,       setF]       = useState(job ? {
    customer:       job.customer,
    billTo:         job.billTo||"",
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
  const [saving,  setSaving]  = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const set = k => v => setF(p=>({...p,[k]:v}));

  const handleSubmit = async () => {
    if (!f.customer.trim() && !f.billTo.trim()) { setSaveErr("Enter a customer name or bill-to company."); return; }
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

  const SectionHead = ({ title }) => (
    <div style={{ gridColumn:"1/-1", borderBottom:`1.5px solid ${G.border}`, paddingBottom:6, marginTop:6 }}>
      <span style={{ fontSize:11, fontWeight:800, color:G.muted, textTransform:"uppercase", letterSpacing:.8 }}>{title}</span>
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:G.card, borderRadius:20, padding:28, width:"100%", maxWidth:640, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,.35)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:G.text }}>{job ? "Edit Job" : "Add New Job"}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:G.muted }}>&times;</button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>

          <SectionHead title="Customer & Reference" />
          <ComboInput label="Bill To Customer" value={f.billTo}       onChange={v=>{ set("billTo")(v); if(!f.customer) set("customer")(v); }} optKey="billTo" placeholder="Company or customer name" />
          <Input      label="Customer Name"    value={f.customer}    onChange={set("customer")} placeholder="Same as Bill To, or individual" />
          <Input      label="Customer P.O. #"  value={f.customerPo}  onChange={set("customerPo")} placeholder="e.g. 18013649-000" />
          <Input      label="Quote / Hold #"   value={f.quoteHoldNum} onChange={set("quoteHoldNum")} placeholder="e.g. 9219-4" />

          <SectionHead title="Job Classification" />
          <ComboInput label="Type"             value={f.installType}    onChange={set("installType")}    optKey="installType"    placeholder="Install, Fab..." />
          <ComboInput label="End-Use Segment"  value={f.endUseSegment}  onChange={set("endUseSegment")}  optKey="endUseSegment"  placeholder="SAR, AUR..." />
          <ComboInput label="Project Type"     value={f.projectType}    onChange={set("projectType")}    optKey="projectType"    placeholder="Custom Hi, Production Low..." />
          <ComboInput label="Schedule"         value={f.scheduleStatus} onChange={set("scheduleStatus")} optKey="scheduleStatus" placeholder="scheduled, hold..." />
          <ComboInput label="Job Category"     value={f.jobType}        onChange={set("jobType")}        optKey="jobType"        placeholder="Kitchen, Bathroom..." />
          <ComboInput label="Material"         value={f.material}       onChange={set("material")}       optKey="material"       placeholder="Granite, Quartz..." />

          <SectionHead title="Team" />
          <ComboInput label="Sales Rep 1"      value={f.salesRep1}      onChange={set("salesRep1")}      optKey="salesRep"       placeholder="Name..." />
          <ComboInput label="Sales Rep 2"      value={f.salesRep2}      onChange={set("salesRep2")}      optKey="salesRep"       placeholder="Name (optional)" />
          <div style={{ gridColumn:"1/-1" }}>
            <ComboInput label="Project Manager" value={f.projectManager} onChange={set("projectManager")} optKey="projectManager" placeholder="Name..." />
          </div>

          <SectionHead title="Financials & Status" />
          <Input label="Amount ($)"  value={f.amount} onChange={set("amount")} type="number" placeholder="0" />
          <Input label="Sq Ft"       value={f.sqft}   onChange={set("sqft")}   type="number" placeholder="0" />
          <div style={{ gridColumn:"1/-1", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            <Input label="Start Date" value={f.start} onChange={set("start")} type="date" />
            <Input label="Close Date" value={f.close} onChange={set("close")} type="date" />
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontSize:12, fontWeight:600, color:G.muted, textTransform:"uppercase", letterSpacing:.5 }}>Status</label>
              <select value={f.status} onChange={e=>set("status")(e.target.value)}
                style={{ padding:"10px 14px", borderRadius:10, border:`1.5px solid ${G.border}`, fontSize:14, background:G.card, color:G.text, outline:"none", height:44 }}>
                {Object.entries(STATUSES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          <SectionHead title="Location & Notes" />
          <div style={{ gridColumn:"1/-1" }}>
            <Input label="Address / Location" value={f.address} onChange={set("address")} placeholder="Job site address or city" />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <Input label="Notes" value={f.notes} onChange={set("notes")} placeholder="Any additional notes..." />
          </div>

        </div>

        {saveErr && (
          <div style={{ marginTop:14, padding:"10px 14px", background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:10, fontSize:13, color:G.red }}>
            ⚠ {saveErr}
          </div>
        )}
        <div style={{ display:"flex", gap:10, marginTop:20, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
          <Btn onClick={handleSubmit} disabled={saving}>
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
    const active   = jobs.filter(j=>j.status!=="lost"&&j.status!=="won");
    const pipeline = active.reduce((s,j)=>s+j.amount,0);
    const won      = jobs.filter(j=>j.status==="won").reduce((s,j)=>s+j.amount,0);
    const quotes   = jobs.filter(j=>j.status==="quote").length;
    const open     = jobs.filter(j=>j.status==="open"||j.status==="in_progress").length;
    return { pipeline, won, quotes, open, total:jobs.length };
  }, [jobs]);

  const recent = useMemo(()=>[...jobs].sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||"")).slice(0,6),[jobs]);

  const StatCard = ({label,value,sub,icon,grad}) => (
    <div style={{ background:`linear-gradient(135deg,${grad[0]} 0%,${grad[1]} 100%)`, borderRadius:18, padding:22, color:"#fff", boxShadow:`0 4px 16px ${grad[0]}44` }}>
      <div style={{ fontSize:26, marginBottom:4 }}>{icon}</div>
      <div style={{ fontSize:26, fontWeight:800, letterSpacing:-1 }}>{value}</div>
      <div style={{ fontSize:13, opacity:.85, marginTop:2 }}>{label}</div>
      {sub&&<div style={{ fontSize:11, opacity:.7, marginTop:3 }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={{ margin:0, fontSize:28, fontWeight:800, color:G.text }}>⛳ Dashboard</h1>
          <p style={{ margin:"4px 0 0", color:G.muted, fontSize:14 }}>Your pipeline overview</p>
        </div>
        <Btn onClick={onAdd} variant="gold">+ Add Job</Btn>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14, marginBottom:28 }}>
        <StatCard label="Active Pipeline" value={fmt$(stats.pipeline)} icon="💰" grad={[G.light,G.mid]} />
        <StatCard label="Won Revenue"     value={fmt$(stats.won)}      icon="🏆" grad={[G.gold,"#8a6a1a"]} />
        <StatCard label="Open Quotes"     value={stats.quotes}         icon="📋" grad={["#d97706","#b45309"]} sub="awaiting approval" />
        <StatCard label="Active Jobs"     value={stats.open}           icon="🔧" grad={[G.soft,G.light]} sub="in progress" />
        <StatCard label="Total Jobs"      value={stats.total}          icon="📅" grad={["#6366f1","#4338ca"]} />
      </div>
      <div style={{ background:G.card, borderRadius:18, padding:22, boxShadow:`0 2px 12px ${G.border}` }}>
        <h2 style={{ margin:"0 0 16px", fontSize:16, fontWeight:700, color:G.text }}>Recent Jobs</h2>
        {recent.length===0 && <p style={{ color:G.muted, fontSize:14 }}>No jobs yet — add one or import your spreadsheet.</p>}
        {recent.map(j=>(
          <div key={j.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${G.border}` }}>
            <div>
              <div style={{ fontWeight:600, fontSize:14, color:G.text }}>{j.billTo||j.customer}</div>
              <div style={{ fontSize:12, color:G.muted }}>{[j.installType,j.projectType,j.address].filter(Boolean).join(" · ")}</div>
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
    const matchQ = !q
      || (j.customer||"").toLowerCase().includes(q)
      || (j.billTo||"").toLowerCase().includes(q)
      || (j.address||"").toLowerCase().includes(q)
      || (j.projectManager||"").toLowerCase().includes(q)
      || (j.salesRep1||"").toLowerCase().includes(q)
      || (j.quoteHoldNum||"").toLowerCase().includes(q)
      || (j.notes||"").toLowerCase().includes(q);
    const matchS = filterStatus==="all" || j.status===filterStatus;
    return matchQ && matchS;
  }), [jobs, search, filterStatus]);

  const allIds      = filtered.map(j=>j.id);
  const allChecked  = allIds.length>0 && allIds.every(id=>selected.has(id));
  const someChecked = allIds.some(id=>selected.has(id));
  const selectedFiltered = allIds.filter(id=>selected.has(id));

  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(allIds));
  const toggle    = id => setSelected(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:G.text }}>📋 Jobs</h1>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {selectedFiltered.length>0 && (
            <Btn variant="danger" small onClick={()=>{ onBulkDelete(selectedFiltered); setSelected(new Set()); }}>
              🗑 Delete {selectedFiltered.length} Selected
            </Btn>
          )}
          <Btn onClick={onAdd} variant="gold">+ Add Job</Btn>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search jobs, customer, PM, rep..."
          style={{ flex:1, minWidth:180, padding:"9px 14px", borderRadius:10, border:`1.5px solid ${G.border}`, fontSize:14, background:G.card, color:G.text, outline:"none" }} />
        <select value={filterStatus} onChange={e=>{ setFilterStatus(e.target.value); setSelected(new Set()); }}
          style={{ padding:"9px 14px", borderRadius:10, border:`1.5px solid ${G.border}`, fontSize:14, background:G.card, color:G.text, outline:"none" }}>
          <option value="all">All Statuses</option>
          {Object.entries(STATUSES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div style={{ background:G.card, borderRadius:18, overflow:"hidden", boxShadow:`0 2px 12px ${G.border}` }}>
        {filtered.length>0 && (
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 18px", background:G.mint, borderBottom:`1px solid ${G.border}` }}>
            <input type="checkbox" checked={allChecked} onChange={toggleAll}
              ref={el=>{ if(el) el.indeterminate=someChecked&&!allChecked; }}
              style={{ width:16, height:16, cursor:"pointer", accentColor:G.light }} />
            <span style={{ fontSize:12, fontWeight:600, color:G.dark }}>
              {someChecked ? `${selectedFiltered.length} selected` : `${filtered.length} job${filtered.length!==1?"s":""}`}
            </span>
          </div>
        )}
        {filtered.length===0 && <div style={{ padding:36, textAlign:"center", color:G.muted }}>No jobs found</div>}
        {filtered.map((j,idx)=>(
          <div key={j.id} style={{
            display:"flex", alignItems:"flex-start", gap:12, padding:"12px 18px",
            borderBottom:idx<filtered.length-1?`1px solid ${G.border}`:"none",
            background:selected.has(j.id)?G.mint:"white", transition:"background .1s",
          }}>
            <input type="checkbox" checked={selected.has(j.id)} onChange={()=>toggle(j.id)}
              style={{ width:16, height:16, cursor:"pointer", marginTop:4, accentColor:G.light }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontWeight:700, fontSize:15, color:G.text }}>{j.billTo||j.customer}</span>
                <Badge status={j.status} />
                {j.scheduleStatus && <span style={{ fontSize:11, background:G.mint, color:G.dark, borderRadius:6, padding:"1px 7px", fontWeight:600 }}>{j.scheduleStatus}</span>}
              </div>
              <div style={{ fontSize:12, color:G.muted, marginTop:3 }}>
                {[j.quoteHoldNum&&`#${j.quoteHoldNum}`, j.installType, j.projectType, j.endUseSegment].filter(Boolean).join(" · ")}
              </div>
              <div style={{ fontSize:12, color:G.muted, marginTop:2 }}>
                {[j.projectManager&&`PM: ${j.projectManager}`, j.salesRep1&&`Rep: ${j.salesRep1}`, j.address].filter(Boolean).join(" · ")}
              </div>
              {j.notes&&<div style={{ fontSize:11, color:G.muted, marginTop:2, fontStyle:"italic" }}>{j.notes.slice(0,80)}{j.notes.length>80?"…":""}</div>}
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ fontWeight:800, fontSize:16, color:G.light }}>{fmt$(j.amount)}</div>
              <div style={{ fontSize:11, color:G.muted }}>{fmtDate(j.start)} → {fmtDate(j.close)}</div>
              <div style={{ display:"flex", gap:6, marginTop:6, justifyContent:"flex-end" }}>
                <Btn variant="ghost" small onClick={()=>onEdit(j)}>Edit</Btn>
                <Btn variant="danger" small onClick={()=>onDelete(j.id)}>🗑</Btn>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Customers ────────────────────────────────────────────────────────────
function CustomersView({ jobs }) {
  const customers = useMemo(() => {
    const map = {};
    jobs.forEach(j => {
      const name = j.billTo||j.customer;
      if (!map[name]) map[name] = { name, jobs:[], total:0 };
      map[name].jobs.push(j);
      map[name].total += j.amount;
    });
    return Object.values(map).sort((a,b)=>b.total-a.total);
  }, [jobs]);

  return (
    <div>
      <h1 style={{ margin:"0 0 20px", fontSize:26, fontWeight:800, color:G.text }}>👥 Customers</h1>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
        {customers.map(c=>(
          <div key={c.name} style={{ background:G.card, borderRadius:16, padding:18, boxShadow:`0 2px 10px ${G.border}` }}>
            <div style={{ width:42, height:42, borderRadius:"50%", background:`linear-gradient(135deg,${G.light},${G.mid})`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:18, marginBottom:10 }}>
              {c.name[0]?.toUpperCase()}
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
  const [dragging, setDragging] = useState(false);
  const [file,     setFile]     = useState(null);
  const [parsed,   setParsed]   = useState([]);
  const [errors,   setErrors]   = useState([]);
  const [importing,setImporting]= useState(false);
  const [parsing,  setParsing]  = useState(false);
  const [done,     setDone]     = useState(null);
  const inputRef = useRef(null);

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

      setDone({ count:unique.length });
      onImportDone();
    } catch(e) {
      setErrors(prev=>[...prev, String(e.message||e)]);
    } finally { setImporting(false); }
  };

  const reset = () => { setFile(null); setParsed([]); setErrors([]); setDone(null); };

  return (
    <div>
      <h1 style={{ margin:"0 0 6px", fontSize:26, fontWeight:800, color:G.text }}>⬇ Import Jobs</h1>
      <p style={{ margin:"0 0 24px", color:G.muted, fontSize:14 }}>Drop your monthly Excel spreadsheet to sync all jobs automatically.</p>

      {!file && (
        <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
          onDrop={onDrop} onClick={()=>inputRef.current?.click()}
          style={{ border:`2.5px dashed ${dragging?G.light:G.border}`, borderRadius:20, padding:"52px 32px",
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

      {parsed.length>0 && !done && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <span style={{ fontWeight:700, fontSize:16, color:G.text }}>{parsed.length} jobs found in {file?.name}</span>
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
                    {["Bill To","Quote #","Type","Segment","Project Type","PM","Amount","Status"].map(h=>(
                      <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontWeight:700, color:G.dark, textTransform:"uppercase", fontSize:11, letterSpacing:.3 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0,60).map((j,i)=>(
                    <tr key={j.id} style={{ borderTop:`1px solid ${G.border}`, background:i%2===0?"transparent":G.bg }}>
                      <td style={{ padding:"8px 12px", fontWeight:600, color:G.text }}>{j.billTo||j.customer}</td>
                      <td style={{ padding:"8px 12px", color:G.muted }}>{j.quoteHoldNum||"—"}</td>
                      <td style={{ padding:"8px 12px", color:G.muted }}>{j.installType||"—"}</td>
                      <td style={{ padding:"8px 12px", color:G.muted }}>{j.endUseSegment||"—"}</td>
                      <td style={{ padding:"8px 12px", color:G.muted }}>{j.projectType||"—"}</td>
                      <td style={{ padding:"8px 12px", color:G.muted }}>{j.projectManager||"—"}</td>
                      <td style={{ padding:"8px 12px", fontWeight:700, color:G.light }}>{fmt$(j.amount)}</td>
                      <td style={{ padding:"8px 12px" }}><Badge status={j.status} /></td>
                    </tr>
                  ))}
                  {parsed.length>60&&<tr><td colSpan={8} style={{ padding:"10px 12px", textAlign:"center", color:G.muted, fontSize:12 }}>...and {parsed.length-60} more</td></tr>}
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

// ─── Map View ─────────────────────────────────────────────────────────────
function MapView({ jobs }) {
  const mapRef  = useRef(null);
  const leafRef = useRef(null);
  const markRef = useRef([]);

  useEffect(() => {
    if (leafRef.current) return;
    const load = async () => {
      if (!window.L) {
        await new Promise((res,rej)=>{
          const css=document.createElement("link"); css.rel="stylesheet";
          css.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
          document.head.appendChild(css);
          const s=document.createElement("script");
          s.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
          s.onload=res; s.onerror=rej; document.head.appendChild(s);
        });
      }
      if (!mapRef.current) return;
      leafRef.current = window.L.map(mapRef.current).setView([31.5,-99.5],6);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{ attribution:"© OpenStreetMap" }).addTo(leafRef.current);
    };
    load();
    return ()=>{ if(leafRef.current){leafRef.current.remove();leafRef.current=null;} };
  }, []);

  useEffect(()=>{
    if(!leafRef.current) return;
    markRef.current.forEach(m=>m.remove()); markRef.current=[];
    jobs.filter(j=>j.lat&&j.lng).forEach(j=>{
      const s=STATUSES[j.status]||STATUSES.quote;
      const icon=window.L.divIcon({html:`<div style="width:14px;height:14px;border-radius:50%;background:${s.dot};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,className:"",iconAnchor:[7,7]});
      const m=window.L.marker([j.lat,j.lng],{icon}).addTo(leafRef.current);
      m.bindPopup(`<b>${j.billTo||j.customer}</b><br/>${j.address}<br/>${fmt$(j.amount)}`);
      markRef.current.push(m);
    });
  },[jobs]);

  return (
    <div>
      <h1 style={{ margin:"0 0 6px", fontSize:26, fontWeight:800, color:G.text }}>🗺 Map</h1>
      <p style={{ margin:"0 0 16px", color:G.muted, fontSize:14 }}>{jobs.filter(j=>j.lat&&j.lng).length} of {jobs.length} jobs plotted</p>
      <div ref={mapRef} style={{ height:520, borderRadius:18, overflow:"hidden", boxShadow:`0 2px 16px ${G.border}` }} />
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────
export default function CountertopCRM() {
  const [tab,     setTab]     = useState("dashboard");
  const [jobs,    setJobs]    = useState([]);
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

  const TABS = [
    ["dashboard","⛳ Dashboard"],
    ["jobs","📋 Jobs"],
    ["customers","👥 Customers"],
    ["import","⬇ Import"],
    ["calendar","📅 Calendar"],
    ["map","🗺 Map"],
  ];

  return (
    <div style={{ minHeight:"100vh", background:G.bg, fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif" }}>
      {/* Topbar */}
      <div style={{ background:`linear-gradient(135deg,${G.darkest} 0%,${G.dark} 60%,${G.mid} 100%)`, padding:"0 24px", boxShadow:"0 2px 16px rgba(0,0,0,.35)", position:"sticky", top:0, zIndex:200 }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"flex", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 0", marginRight:24, flexShrink:0 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg,${G.goldLt},${G.gold})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, boxShadow:`0 2px 8px ${G.gold}66` }}>⛳</div>
            <div>
              <div style={{ color:"#fff", fontWeight:800, fontSize:15, letterSpacing:-.3 }}>FairwayStone</div>
              <div style={{ color:G.mint, fontSize:10, opacity:.8, letterSpacing:.2 }}>COUNTERTOP CRM</div>
            </div>
          </div>
          <nav style={{ display:"flex", gap:2, overflow:"auto" }}>
            {TABS.map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id)} style={{
                background:tab===id?`linear-gradient(135deg,${G.light}cc,${G.mid}cc)`:"transparent",
                border:"none", color:tab===id?"#fff":`${G.mint}bb`,
                padding:"18px 16px", cursor:"pointer", fontSize:13, fontWeight:tab===id?700:500,
                borderBottom:tab===id?`2.5px solid ${G.goldLt}`:"2.5px solid transparent",
                transition:"all .15s", whiteSpace:"nowrap",
              }}>{label}</button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:1280, margin:"0 auto", padding:"28px 20px" }}>
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
            {tab==="dashboard" && <Dashboard    jobs={jobs} onAdd={()=>setModal("add")} />}
            {tab==="jobs"      && <JobsView     jobs={jobs} onAdd={()=>setModal("add")} onEdit={j=>setModal(j)} onDelete={handleDelete} onBulkDelete={handleBulkDelete} />}
            {tab==="customers" && <CustomersView jobs={jobs} />}
            {tab==="import"    && <ImportView   onImportDone={()=>{ fetchJobs(); showToast("Import complete!"); }} />}
            {tab==="calendar"  && <CalendarView  jobs={jobs} onAdd={()=>setModal("add")} />}
            {tab==="map"       && <MapView       jobs={jobs} />}
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

      {toast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
          background:toast.type==="error"?G.red:G.light, color:"#fff", padding:"12px 24px",
          borderRadius:12, fontWeight:600, fontSize:14, boxShadow:"0 4px 20px rgba(0,0,0,.3)", zIndex:9999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}