"use client";

import { useState, useMemo, useEffect, useRef } from "react";

// ─── Theme ────────────────────────────────────────────────────────────────────
const G = {
  dark:   "#1a3c2b", // deep forest green (header, primary)
  mid:    "#2d5a3d", // fairway green
  light:  "#4a7c59", // rough green
  gold:   "#b8922a", // trophy gold
  goldLt: "#d4a843", // light gold
  parch:  "#f2ede4", // parchment / fairway sand
  card:   "#ffffff",
  border: "#e2ddd4",
  text:   "#1c1a16",
  muted:  "#6b6456",
};

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUSES = {
  quote:       { label:"Quoted",      bg:"bg-amber-50",    text:"text-amber-800",  dot:"bg-amber-500",   hex:"#d97706", calCls:"bg-amber-50 text-amber-800 border-l-[3px] border-amber-400" },
  open:        { label:"Open",        bg:"bg-green-50",    text:"text-green-800",  dot:"bg-green-500",   hex:"#16a34a", calCls:"bg-green-50 text-green-800 border-l-[3px] border-green-500" },
  in_progress: { label:"In Progress", bg:"bg-emerald-50",  text:"text-emerald-800",dot:"bg-emerald-500", hex:"#059669", calCls:"bg-emerald-50 text-emerald-800 border-l-[3px] border-emerald-500" },
  won:         { label:"Won ✓",       bg:"bg-green-100",   text:"text-green-900",  dot:"bg-green-700",   hex:"#15803d", calCls:"bg-green-100 text-green-900 border-l-[3px] border-green-700" },
  lost:        { label:"Lost",        bg:"bg-stone-100",   text:"text-stone-600",  dot:"bg-stone-400",   hex:"#78716c", calCls:"bg-stone-100 text-stone-600 border-l-[3px] border-stone-400" },
};
const WEEKDAYS  = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const MO_NAMES  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MATERIALS = ["Granite","Quartz","Marble","Quartzite","Soapstone","Laminate","Butcher Block","Concrete","Other"];
const JOB_TYPES = ["Kitchen","Bathroom","Laundry Room","Outdoor Kitchen","Bar","Office","Other"];

const SEED = [
  { id:1,  customer:"Smith Residence",    jobType:"Kitchen",         material:"Quartz",    status:"open",        amount:4800,  sqft:45,  start:"2026-03-15", close:"2026-04-20", notes:"White quartz, undermount sink",  address:"Austin, TX",        lat:30.2672, lng:-97.7431, createdAt:"2026-02-10" },
  { id:2,  customer:"Rodriguez Family",   jobType:"Bathroom",        material:"Marble",    status:"quote",       amount:2200,  sqft:28,  start:"2026-04-01", close:"2026-05-10", notes:"Carrara marble, two vanities",   address:"Houston, TX",       lat:29.7604, lng:-95.3698, createdAt:"2026-02-18" },
  { id:3,  customer:"Thompson Build",     jobType:"Kitchen",         material:"Granite",   status:"won",         amount:6500,  sqft:62,  start:"2026-02-10", close:"2026-03-28", notes:"Black galaxy granite",           address:"Dallas, TX",        lat:32.7767, lng:-96.7970, createdAt:"2026-01-10" },
  { id:4,  customer:"Chen Residence",     jobType:"Outdoor Kitchen", material:"Granite",   status:"in_progress", amount:8200,  sqft:80,  start:"2026-03-20", close:"2026-05-15", notes:"Weather-resistant granite",      address:"San Antonio, TX",   lat:29.4241, lng:-98.4936, createdAt:"2026-03-01" },
  { id:5,  customer:"Williams Builders",  jobType:"Kitchen",         material:"Quartz",    status:"quote",       amount:12400, sqft:140, start:"2026-04-10", close:"2026-06-01", notes:"4 units, new construction",      address:"Fort Worth, TX",    lat:32.7555, lng:-97.3308, createdAt:"2026-02-25" },
  { id:6,  customer:"Patel Home",         jobType:"Kitchen",         material:"Quartzite", status:"open",        amount:5600,  sqft:55,  start:"2026-04-05", close:"2026-05-20", notes:"Super White quartzite",          address:"Plano, TX",         lat:33.0198, lng:-96.6989, createdAt:"2026-03-10" },
  { id:7,  customer:"Anderson Project",   jobType:"Bar",             material:"Concrete",  status:"lost",        amount:3100,  sqft:30,  start:"2026-03-01", close:"2026-04-15", notes:"Custom concrete bar top",        address:"Arlington, TX",     lat:32.7357, lng:-97.1081, createdAt:"2026-02-15" },
  { id:8,  customer:"Martinez LLC",       jobType:"Kitchen",         material:"Quartz",    status:"won",         amount:9800,  sqft:95,  start:"2026-01-15", close:"2026-02-28", notes:"Commercial remodel",             address:"Corpus Christi, TX",lat:27.8006, lng:-97.3964, createdAt:"2026-01-01" },
  { id:9,  customer:"Hayes Residence",    jobType:"Bathroom",        material:"Marble",    status:"quote",       amount:3400,  sqft:32,  start:"2026-04-12", close:"2026-06-15", notes:"Master bath, double vanity",     address:"Lubbock, TX",       lat:33.5779, lng:-101.855, createdAt:"2026-02-12" },
  { id:10, customer:"Griffin Builders",   jobType:"Kitchen",         material:"Quartz",    status:"in_progress", amount:7200,  sqft:75,  start:"2026-03-25", close:"2026-05-30", notes:"New build, 3 kitchens",          address:"El Paso, TX",       lat:31.7619, lng:-106.485, createdAt:"2026-03-05" },
  { id:11, customer:"Smith Residence",    jobType:"Bathroom",        material:"Marble",    status:"quote",       amount:1800,  sqft:22,  start:"2026-05-01", close:"2026-04-22", notes:"Master bath refresh",            address:"Austin, TX",        lat:30.2672, lng:-97.7431, createdAt:"2026-04-01" },
  { id:12, customer:"Williams Builders",  jobType:"Kitchen",         material:"Granite",   status:"open",        amount:8900,  sqft:90,  start:"2026-04-15", close:"2026-07-01", notes:"Phase 2, 2 kitchens",            address:"Fort Worth, TX",    lat:32.7555, lng:-97.3308, createdAt:"2026-03-22" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt      = (n) => "$" + Number(n || 0).toLocaleString();
const parseAmt = (v) => parseFloat(String(v).replace(/[^0-9.]/g,"")) || 0;
const TODAY    = new Date();
const TODAYSTR = `${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,"0")}-${String(TODAY.getDate()).padStart(2,"0")}`;
const daysUntil = (ds) => Math.ceil((new Date(ds+"T00:00:00") - TODAY) / 86400000);
const daysSince = (ds) => Math.floor((TODAY - new Date(ds+"T00:00:00")) / 86400000);
const longDate  = (ds) => ds ? new Date(ds+"T00:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}) : "";
const shortDate = (ds) => ds ? new Date(ds+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "";

// ─── PDF: Single Job Quote ────────────────────────────────────────────────────
function printJobQuote(job) {
  const ppsf = job.sqft && job.amount ? `$${(job.amount/job.sqft).toFixed(2)}/sf` : null;
  const qn   = `QT-${String(job.id).padStart(4,"0")}`;
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Quote ${qn}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;background:#f5f2ea;color:#1c1a16;padding:0}
  .wrap{max-width:700px;margin:0 auto;background:#fff;min-height:100vh}
  .header{background:#1a3c2b;color:#fff;padding:32px 40px;display:flex;justify-content:space-between;align-items:flex-start}
  .brand{font-size:22px;font-weight:800;letter-spacing:-.3px}
  .brand-flag{font-size:12px;color:#9dbfad;margin-top:3px;font-weight:400}
  .qnum{text-align:right}.qnum .num{font-size:20px;font-weight:700;color:#d4a843}
  .qnum .dt{font-size:11px;color:#9dbfad;margin-top:3px}
  .body{padding:36px 40px}
  .customer-block{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid #e8e3d8}
  .cname{font-size:28px;font-weight:800;color:#1a3c2b;letter-spacing:-.5px}
  .caddr{font-size:13px;color:#6b6456;margin-top:4px}
  .status-pill{display:inline-block;padding:5px 14px;border-radius:99px;font-size:12px;font-weight:700;background:#d4e8db;color:#1a3c2b}
  .section{margin-bottom:24px}
  .sec-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#9dbfad;margin-bottom:12px}
  .specs{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .spec label{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#a8a090;display:block;margin-bottom:3px}
  .spec .val{font-size:15px;font-weight:600;color:#1c1a16}
  .amount-bar{background:linear-gradient(135deg,#1a3c2b,#2d5a3d);border-radius:16px;padding:24px 32px;display:flex;justify-content:space-between;align-items:center;margin:28px 0;color:#fff}
  .amt-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9dbfad}
  .amt-val{font-size:40px;font-weight:900;letter-spacing:-1px;color:#d4a843}
  .notes-box{background:#f8f5ef;border:1px solid #e2ddd4;border-radius:10px;padding:16px 20px;font-size:14px;color:#44403c;line-height:1.7}
  .confirm{background:#f8f5ef;border:2px solid #c8b888;border-radius:14px;padding:28px 32px;margin-top:28px}
  .confirm-h{font-size:13px;font-weight:700;color:#1a3c2b;margin-bottom:20px;display:flex;align-items:center;gap:8px}
  .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px}
  .sig-item{border-top:1.5px solid #b0a88c;padding-top:10px;margin-top:20px}
  .sig-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#7a7060;font-weight:600}
  .sig-note{font-size:11px;color:#bbb;margin-top:4px}
  .awarded{font-size:14px;font-weight:700;color:#1a3c2b;display:flex;gap:20px;align-items:center}
  .check{display:inline-block;width:18px;height:18px;border:2px solid #1a3c2b;border-radius:4px;margin-right:4px;vertical-align:middle}
  .footer{text-align:center;font-size:10px;color:#c0b8a8;padding:24px 40px;border-top:1px solid #e8e3d8;margin-top:32px}
  @media print{body{background:#fff} .wrap{box-shadow:none} @page{margin:.6in}}
</style></head><body>
<div class="wrap">
  <div class="header">
    <div><div class="brand">⛳ CounterTop Pro</div><div class="brand-flag">Professional Countertop Sales & Installation</div></div>
    <div class="qnum"><div class="num">${qn}</div><div class="dt">Issued ${shortDate(TODAYSTR)}</div><div class="dt">Valid 30 days</div></div>
  </div>
  <div class="body">
    <div class="customer-block">
      <div><div class="cname">${job.customer}</div>${job.address?`<div class="caddr">📍 ${job.address}</div>`:""}</div>
      <div class="status-pill">${STATUSES[job.status]?.label||job.status}</div>
    </div>
    <div class="section">
      <div class="sec-label">Job Specifications</div>
      <div class="specs">
        <div class="spec"><label>Job Type</label><div class="val">${job.jobType}</div></div>
        <div class="spec"><label>Material</label><div class="val">${job.material}</div></div>
        ${job.sqft?`<div class="spec"><label>Square Footage</label><div class="val">${job.sqft} sq ft</div></div>`:""}
        <div class="spec"><label>Start Date</label><div class="val">${shortDate(job.start)}</div></div>
        <div class="spec"><label>Est. Completion</label><div class="val">${shortDate(job.close)}</div></div>
        ${ppsf?`<div class="spec"><label>Unit Rate</label><div class="val">${ppsf}</div></div>`:""}
      </div>
    </div>
    ${job.notes?`<div class="section"><div class="sec-label">Notes & Specifications</div><div class="notes-box">${job.notes}</div></div>`:""}
    <div class="amount-bar"><div><div class="amt-label">Total Quote Amount</div></div><div class="amt-val">${fmt(job.amount)}</div></div>
    <div class="confirm">
      <div class="confirm-h">✅ Builder Confirmation</div>
      <div class="sig-grid">
        <div><div class="sig-item"><div class="sig-lbl">Signature</div><div class="sig-note">Confirms acceptance of quote</div></div></div>
        <div><div class="sig-item"><div class="sig-lbl">Date Signed</div><div class="sig-note">&nbsp;</div></div></div>
        <div><div class="sig-item"><div class="sig-lbl">Printed Name</div><div class="sig-note">&nbsp;</div></div></div>
        <div><div class="sig-item"><div class="awarded"><span class="check"></span>YES &nbsp;&nbsp; <span class="check"></span>NO</div><div class="sig-note">Circle to confirm job award</div></div></div>
      </div>
    </div>
  </div>
  <div class="footer">${qn} · CounterTop Pro · Quote valid 30 days from ${shortDate(TODAYSTR)}</div>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
</body></html>`;
  const w = window.open("","_blank","width=840,height=1060");
  if (!w) { alert("Allow pop-ups to export PDF."); return; }
  w.document.write(html); w.document.close();
}

// ─── PDF: Monthly Report ──────────────────────────────────────────────────────
function printMonthlyReport(monthLabel, jobsList) {
  const total    = jobsList.reduce((s,j)=>s+j.amount,0);
  const won      = jobsList.filter(j=>j.status==="won");
  const pipeline = jobsList.filter(j=>["quote","open","in_progress"].includes(j.status));
  const rows = jobsList.map(j=>`
    <tr>
      <td>${j.customer}</td><td>${j.jobType}</td><td>${j.material}</td>
      <td><span style="background:${STATUSES[j.status]?.hex||"#999"};color:#fff;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:600;white-space:nowrap">${STATUSES[j.status]?.label||j.status}</span></td>
      <td style="font-weight:700">${fmt(j.amount)}</td>
      <td>${j.sqft?j.sqft+" sf":"—"}</td>
      <td style="white-space:nowrap">${j.close}</td>
    </tr>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Pipeline Report – ${monthLabel}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;background:#fff;color:#1c1a16}
  .header{background:#1a3c2b;color:#fff;padding:28px 40px;display:flex;justify-content:space-between;align-items:center}
  .brand{font-size:20px;font-weight:800}.title{font-size:13px;color:#9dbfad;margin-top:2px}
  .month-label{font-size:22px;font-weight:800;color:#d4a843;text-align:right}
  .sub-label{font-size:11px;color:#9dbfad;margin-top:2px;text-align:right}
  .body{padding:32px 40px}
  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
  .sum-card{background:#f8f5ef;border:1px solid #e2ddd4;border-radius:10px;padding:14px 18px}
  .sum-card label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#9a9280;display:block;margin-bottom:4px}
  .sum-card .val{font-size:20px;font-weight:800;color:#1a3c2b}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#1a3c2b;color:#fff;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:600}
  td{padding:10px 12px;border-bottom:1px solid #f0ede6;vertical-align:middle}
  tr:nth-child(even) td{background:#faf8f4}
  .footer{text-align:center;font-size:10px;color:#c0b8a8;padding:20px 40px;border-top:1px solid #e8e3d8;margin-top:24px}
  @media print{@page{margin:.6in}}
</style></head><body>
<div class="header">
  <div><div class="brand">⛳ CounterTop Pro</div><div class="title">Pipeline Report</div></div>
  <div><div class="month-label">${monthLabel}</div><div class="sub-label">Generated ${shortDate(TODAYSTR)}</div></div>
</div>
<div class="body">
  <div class="summary">
    <div class="sum-card"><label>Total Jobs</label><div class="val">${jobsList.length}</div></div>
    <div class="sum-card"><label>Total Value</label><div class="val">${fmt(total)}</div></div>
    <div class="sum-card"><label>Pipeline</label><div class="val">${fmt(pipeline.reduce((s,j)=>s+j.amount,0))}</div></div>
    <div class="sum-card"><label>Won</label><div class="val">${fmt(won.reduce((s,j)=>s+j.amount,0))}</div></div>
  </div>
  ${jobsList.length===0
    ? `<p style="text-align:center;color:#9a9280;padding:40px">No jobs closing in ${monthLabel}</p>`
    : `<table><thead><tr><th>Customer</th><th>Type</th><th>Material</th><th>Status</th><th>Quote</th><th>Sq Ft</th><th>Close</th></tr></thead><tbody>${rows}</tbody></table>`
  }
</div>
<div class="footer">CounterTop Pro · Pipeline Report · ${monthLabel}</div>
<script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
</body></html>`;
  const w = window.open("","_blank","width=920,height=1060");
  if (!w) { alert("Allow pop-ups to export PDF."); return; }
  w.document.write(html); w.document.close();
}

// ─── PDF: Customer Jobs ───────────────────────────────────────────────────────
function printCustomerJobs(name, jobsList) {
  const total = jobsList.reduce((s,j)=>s+j.amount,0);
  const rows  = jobsList.map(j=>`
    <tr>
      <td>${j.jobType}</td><td>${j.material}</td>
      <td><span style="background:${STATUSES[j.status]?.hex||"#999"};color:#fff;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:600">${STATUSES[j.status]?.label||j.status}</span></td>
      <td style="font-weight:700">${fmt(j.amount)}</td>
      <td>${j.sqft?j.sqft+" sf":"—"}</td>
      <td style="white-space:nowrap">${j.close}</td>
      <td style="font-size:12px;color:#6b6456;max-width:160px">${j.notes||""}</td>
    </tr>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Jobs – ${name}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;background:#fff;color:#1c1a16}
  .header{background:#1a3c2b;color:#fff;padding:28px 40px}
  .brand{font-size:14px;color:#9dbfad;font-weight:600;margin-bottom:6px}
  .cname{font-size:28px;font-weight:900;letter-spacing:-.5px;color:#fff}
  .caddr{font-size:13px;color:#9dbfad;margin-top:4px}
  .body{padding:28px 40px}
  .total-bar{background:#1a3c2b;color:#fff;border-radius:12px;padding:16px 24px;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
  .total-bar span{font-size:12px;color:#9dbfad;font-weight:600;text-transform:uppercase;letter-spacing:.08em}
  .total-bar strong{font-size:28px;font-weight:900;color:#d4a843}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#2d5a3d;color:#fff;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:600}
  td{padding:10px 12px;border-bottom:1px solid #f0ede6;vertical-align:top}
  tr:nth-child(even) td{background:#faf8f4}
  .footer{text-align:center;font-size:10px;color:#c0b8a8;padding:20px 40px;border-top:1px solid #e8e3d8;margin-top:24px}
  @media print{@page{margin:.6in}}
</style></head><body>
<div class="header">
  <div class="brand">⛳ CounterTop Pro — Customer Summary</div>
  <div class="cname">${name}</div>
  ${jobsList[0]?.address?`<div class="caddr">📍 ${jobsList[0].address}</div>`:""}
</div>
<div class="body">
  <div class="total-bar"><span>All-Time Total · ${jobsList.length} job${jobsList.length!==1?"s":""}</span><strong>${fmt(total)}</strong></div>
  <table><thead><tr><th>Type</th><th>Material</th><th>Status</th><th>Quote</th><th>Sq Ft</th><th>Close</th><th>Notes</th></tr></thead>
  <tbody>${rows}</tbody></table>
</div>
<div class="footer">CounterTop Pro · Customer Report · ${name} · ${shortDate(TODAYSTR)}</div>
<script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
</body></html>`;
  const w = window.open("","_blank","width=920,height=1060");
  if (!w) { alert("Allow pop-ups to export PDF."); return; }
  w.document.write(html); w.document.close();
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Badge({ status }) {
  const s = STATUSES[status] || {};
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
function StatCard({ label, value, sub, bg = "#fff" }) {
  return (
    <div className="rounded-2xl p-4 shadow-sm flex flex-col gap-0.5 border border-stone-200" style={{ background: bg }}>
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: G.muted }}>{label}</p>
      <p className="text-2xl font-black leading-tight" style={{ color: G.dark }}>{value}</p>
      {sub && <p className="text-xs leading-snug mt-0.5" style={{ color: G.muted }}>{sub}</p>}
    </div>
  );
}
function GoldBtn({ onClick, children, small }) {
  return (
    <button onClick={onClick}
      className={`font-bold rounded-xl transition-all active:scale-95 ${small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}`}
      style={{ background: G.gold, color: "#fff" }}>
      {children}
    </button>
  );
}
function GreenBtn({ onClick, children, small, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`font-bold rounded-xl transition-all active:scale-95 disabled:opacity-40 ${small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}`}
      style={{ background: G.dark, color: "#fff" }}>
      {children}
    </button>
  );
}
function OutlineBtn({ onClick, children, small }) {
  return (
    <button onClick={onClick}
      className={`font-semibold rounded-xl border transition-all active:scale-95 ${small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}`}
      style={{ borderColor: G.border, color: G.muted, background: "#fff" }}>
      {children}
    </button>
  );
}

// ─── Empty form ───────────────────────────────────────────────────────────────
const mkEmpty = (close="") => ({
  customer:"", jobType:"Kitchen", material:"Quartz", status:"quote",
  amount:"", sqft:"", start:"", close, notes:"", address:"",
  lat:null, lng:null, createdAt:TODAYSTR,
});

// ═════════════════════════════════════════════════════════════════════════════
export default function CountertopCRM() {
  const [jobs,         setJobs]         = useState(SEED);
  const [tab,          setTab]          = useState("dashboard");
  const [showForm,     setShowForm]     = useState(false);
  const [editId,       setEditId]       = useState(null);
  const [form,         setForm]         = useState(() => mkEmpty());
  const [calMonth,     setCalMonth]     = useState(() => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [selectedDay,  setSelectedDay]  = useState(null);
  const [filter,       setFilter]       = useState("all");
  const [search,       setSearch]       = useState("");
  const [sortCol,      setSortCol]      = useState("close");
  const [sortDir,      setSortDir]      = useState("asc");
  const [expandedCust, setExpandedCust] = useState(null);
  const [mapError,     setMapError]     = useState(null);
  const [geocoding,    setGeocoding]    = useState(false);
  const [showExport,   setShowExport]   = useState(false);
  const [exportMY,     setExportMY]     = useState(`${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,"0")}`);
  const [isMobile,     setIsMobile]     = useState(false);

  const mapRef  = useRef(null);
  const mapInst = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ── Map ───────────────────────────────────────────────────────────────────
  const buildMap = (jobsArr) => {
    if (!mapRef.current || mapInst.current) return;
    const L = window.L; if (!L) return;
    const m = L.map(mapRef.current).setView([31.5,-99.5],6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{ attribution:"© OpenStreetMap" }).addTo(m);
    jobsArr.filter(j=>j.lat&&j.lng).forEach(j=>{
      const col = STATUSES[j.status]?.hex||"#888";
      L.circleMarker([j.lat,j.lng],{ radius:11,fillColor:col,color:"#fff",weight:2.5,opacity:1,fillOpacity:0.9 }).addTo(m)
       .bindPopup(`<div style="font-family:system-ui,sans-serif;min-width:160px;padding:4px"><b style="font-size:13px">${j.customer}</b><br><span style="color:#666;font-size:12px">${j.jobType} · ${j.material}</span>${j.address?`<br><span style="color:#999;font-size:11px">${j.address}</span>`:""}<br><b style="font-size:15px;display:block;margin:6px 0">${fmt(j.amount)}</b><span style="background:${col};color:#fff;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:600">${STATUSES[j.status]?.label||j.status}</span><br><span style="color:#aaa;font-size:11px;margin-top:4px;display:block">Close: ${j.close}</span></div>`);
    });
    const pts = jobsArr.filter(j=>j.lat&&j.lng);
    if (pts.length) m.fitBounds(L.latLngBounds(pts.map(j=>[j.lat,j.lng])),{padding:[60,60]});
    mapInst.current = m;
  };
  const loadAndBuildMap = (jobsArr) => {
    if (window.L) { buildMap(jobsArr); return; }
    if (!document.querySelector('link[href*="leaflet"]')) {
      const l=document.createElement("link"); l.rel="stylesheet";
      l.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(l);
    }
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    s.onload=()=>buildMap(jobsArr); s.onerror=()=>setMapError("Map library unavailable.");
    document.head.appendChild(s);
  };
  useEffect(()=>{
    if (tab!=="map") { if(mapInst.current){mapInst.current.remove();mapInst.current=null;} return; }
    if (mapInst.current) { mapInst.current.remove(); mapInst.current=null; }
    const t=setTimeout(()=>loadAndBuildMap(jobs),250);
    return ()=>clearTimeout(t);
  },[tab,jobs]); // eslint-disable-line

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(()=>{
    const active  = jobs.filter(j=>["quote","open","in_progress"].includes(j.status));
    const won     = jobs.filter(j=>j.status==="won");
    const lost    = jobs.filter(j=>j.status==="lost");
    const decided = won.length+lost.length;
    const pipeline= active.reduce((s,j)=>s+j.amount,0);
    const revenue = won.reduce((s,j)=>s+j.amount,0);
    const followUp= active.filter(j=>["quote","open"].includes(j.status)&&daysSince(j.createdAt)>=30);
    return { activeCount:active.length, pipeline, revenue, decided, followUp,
      avgDeal:active.length?Math.round(pipeline/active.length):0,
      closeRate:decided>0?Math.round((won.length/decided)*100):0,
      closeRateSub:`${won.length}W / ${decided} decided` };
  },[jobs]);

  // ── Calendar ──────────────────────────────────────────────────────────────
  const calCells = useMemo(()=>{
    const y=calMonth.getFullYear(), m=calMonth.getMonth();
    const cells=[];
    for (let i=0;i<new Date(y,m,1).getDay();i++) cells.push(null);
    for (let d=1;d<=new Date(y,m+1,0).getDate();d++) {
      const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      cells.push({ d, ds, jobs:jobs.filter(j=>j.close===ds) });
    }
    while (cells.length%7!==0) cells.push(null);
    return cells;
  },[jobs,calMonth]);

  const calLabel    = MO_NAMES[calMonth.getMonth()]+" "+calMonth.getFullYear();
  const calPipeline = useMemo(()=>{
    const y=calMonth.getFullYear(),m=calMonth.getMonth();
    return jobs.filter(j=>{const d=new Date(j.close+"T00:00:00");return d.getFullYear()===y&&d.getMonth()===m&&["quote","open","in_progress"].includes(j.status);}).reduce((s,j)=>s+j.amount,0);
  },[jobs,calMonth]);
  const selJobs = useMemo(()=>selectedDay?jobs.filter(j=>j.close===selectedDay):[],[jobs,selectedDay]);

  // ── Customer groups ───────────────────────────────────────────────────────
  const custGroups = useMemo(()=>{
    const g={};
    jobs.forEach(j=>{
      if (!g[j.customer]) g[j.customer]={name:j.customer,jobs:[],total:0,won:0,pipeline:0,address:j.address||""};
      g[j.customer].jobs.push(j); g[j.customer].total+=j.amount;
      if (j.status==="won") g[j.customer].won+=j.amount;
      else if (["quote","open","in_progress"].includes(j.status)) g[j.customer].pipeline+=j.amount;
    });
    return Object.values(g).sort((a,b)=>b.total-a.total);
  },[jobs]);

  // ── Filtered jobs ─────────────────────────────────────────────────────────
  const displayJobs = useMemo(()=>{
    let list=jobs.filter(j=>filter==="all"||j.status===filter)
      .filter(j=>{ const q=search.toLowerCase(); return !q||j.customer.toLowerCase().includes(q)||j.jobType.toLowerCase().includes(q)||j.material.toLowerCase().includes(q); });
    list.sort((a,b)=>{ let av=a[sortCol]??"",bv=b[sortCol]??""; if(typeof av==="string"){av=av.toLowerCase();bv=bv.toLowerCase();} return sortDir==="asc"?(av>bv?1:-1):(av<bv?1:-1); });
    return list;
  },[jobs,filter,search,sortCol,sortDir]);

  const upcoming = useMemo(()=>
    jobs.filter(j=>["quote","open","in_progress"].includes(j.status)).map(j=>({...j,days:daysUntil(j.close)})).sort((a,b)=>a.days-b.days).slice(0,6),
    [jobs]);

  // ── Export month jobs ─────────────────────────────────────────────────────
  const exportJobs = useMemo(()=>{
    if (!exportMY) return [];
    const [yr,mo] = exportMY.split("-").map(Number);
    return jobs.filter(j=>{ const d=new Date(j.close+"T00:00:00"); return d.getFullYear()===yr&&d.getMonth()===mo-1; });
  },[jobs,exportMY]);

  // ── Month options for export ──────────────────────────────────────────────
  const monthOptions = useMemo(()=>{
    const opts=[];
    for (let i=-3;i<9;i++) {
      const d=new Date(TODAY.getFullYear(),TODAY.getMonth()+i,1);
      const val=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      opts.push({ val, label:`${MO_NAMES[d.getMonth()]} ${d.getFullYear()}` });
    }
    return opts;
  },[]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const openNew   = (closeDate="") => { setForm(mkEmpty(closeDate)); setEditId(null); setShowForm(true); };
  const openEdit  = (j) => { setForm({...j,amount:String(j.amount),sqft:String(j.sqft||"")}); setEditId(j.id); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditId(null); };

  const saveJob = async () => {
    if (!form.customer.trim()||!form.amount||!form.start||!form.close) return;
    setGeocoding(true);
    let lat=form.lat,lng=form.lng;
    if (form.address&&(!lat||!lng)) {
      try {
        const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.address)}&limit=1`);
        const d=await r.json(); if(d[0]){lat=+d[0].lat;lng=+d[0].lon;}
      } catch {}
    }
    const parsed={...form,amount:parseAmt(form.amount),sqft:parseAmt(form.sqft)||0,lat,lng};
    setJobs(prev=>editId?prev.map(j=>j.id===editId?{...parsed,id:editId}:j):[...prev,{...parsed,id:Date.now()}]);
    setGeocoding(false); closeForm();
  };
  const deleteJob   = (id) => setJobs(prev=>prev.filter(j=>j.id!==id));
  const toggleSort  = (col) => { if(sortCol===col)setSortDir(d=>d==="asc"?"desc":"asc"); else{setSortCol(col);setSortDir("asc");} };
  const Arr = ({col}) => <span style={{opacity:.4,fontSize:10,marginLeft:2}}>{sortCol===col?(sortDir==="asc"?"▲":"▼"):"↕"}</span>;
  const prevMonth = () => setCalMonth(d=>new Date(d.getFullYear(),d.getMonth()-1,1));
  const nextMonth = () => setCalMonth(d=>new Date(d.getFullYear(),d.getMonth()+1,1));
  const goToday   = () => { setCalMonth(new Date(TODAY.getFullYear(),TODAY.getMonth(),1)); setSelectedDay(TODAYSTR); };
  const jumpDay   = (ds) => { const d=new Date(ds+"T00:00:00"); setCalMonth(new Date(d.getFullYear(),d.getMonth(),1)); setSelectedDay(ds); setTab("dashboard"); };

  // ─── Input style ─────────────────────────────────────────────────────────
  const inp = "w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 bg-stone-50 focus:bg-white transition-colors";
  const focusRing = { boxShadow:`0 0 0 3px ${G.gold}33` };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: G.parch, fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif" }}>

      {/* ── HEADER ── */}
      <header style={{ background: G.dark }} className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shadow-xl">
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">⛳ CounterTop Pro</h1>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color:"#9dbfad" }}>Sales & Job Tracker</p>
        </div>
        <div className="flex items-center gap-2">
          {stats.followUp.length>0 && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold" style={{ background:"rgba(212,168,67,.18)", color:"#d4a843", border:`1px solid rgba(212,168,67,.35)` }}>
              🔔 {stats.followUp.length} follow-up{stats.followUp.length>1?"s":""}
            </div>
          )}
          <button onClick={()=>setShowExport(true)}
            className="rounded-xl px-3 py-1.5 text-xs font-bold border transition-all"
            style={{ borderColor:"rgba(212,168,67,.5)", color:"#d4a843", background:"rgba(212,168,67,.1)" }}>
            Export Report
          </button>
          <GoldBtn onClick={()=>openNew()}>+ New Job</GoldBtn>
        </div>
      </header>

      {/* ── NAV ── */}
      <nav className="flex overflow-x-auto border-b" style={{ background:"#fff", borderColor: G.border }}>
        {[["dashboard","📅 Dashboard"],["jobs","📋 Jobs"],["customers","👥 Customers"],["map","🗺️ Map"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)}
            className="py-3 px-4 sm:px-5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors"
            style={{ borderBottomColor: tab===id?G.gold:"transparent", color: tab===id?G.dark:G.muted }}>
            {lbl}
          </button>
        ))}
      </nav>

      <main className="max-w-7xl mx-auto px-3 sm:px-5 py-4 space-y-4">

        {/* ═══ DASHBOARD ═══ */}
        {tab==="dashboard" && <>

          {/* 1. CALENDAR (top) */}
          <div className="rounded-2xl overflow-hidden shadow-sm border" style={{ borderColor: G.border }}>
            {/* Calendar header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ background: G.dark }}>
              <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-xl text-white text-xl font-black transition-colors hover:opacity-70">‹</button>
              <div className="text-center">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">{calLabel}</h2>
                {calPipeline>0 && <p className="text-xs font-semibold" style={{ color:"#d4a843" }}>{fmt(calPipeline)} pipeline this month</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={goToday} className="text-xs font-bold px-3 py-1 rounded-lg" style={{ background: G.gold, color:"#fff" }}>Today</button>
                <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-xl text-white text-xl font-black hover:opacity-70">›</button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7" style={{ background: G.mid }}>
              {WEEKDAYS.map(d=>(
                <div key={d} className="py-1.5 text-center text-xs font-bold uppercase tracking-widest" style={{ color:"#9dbfad" }}>{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 bg-white">
              {calCells.map((cell,i)=>{
                const isToday    = cell?.ds===TODAYSTR;
                const isSelected = cell?.ds===selectedDay;
                const hasJobs    = (cell?.jobs?.length||0)>0;
                return (
                  <div key={i}
                    onClick={()=>cell&&setSelectedDay(cell.ds===selectedDay?null:cell.ds)}
                    onDoubleClick={()=>cell&&openNew(cell.ds)}
                    className="border-r border-b last:border-r-0 relative transition-colors select-none"
                    style={{
                      minHeight: "clamp(56px,12vw,88px)",
                      borderColor: G.border,
                      background: !cell ? G.parch : isSelected ? "#f0f7f3" : "#fff",
                      cursor: cell ? "pointer" : "default",
                      outline: isSelected ? `2px solid ${G.light}` : "none",
                      outlineOffset: -2,
                    }}>
                    {cell && (
                      <div className="p-1 sm:p-1.5">
                        <div className="flex items-start justify-between">
                          <span className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full text-xs font-bold"
                            style={{ background: isToday?G.gold:"transparent", color: isToday?"#fff":G.muted }}>
                            {cell.d}
                          </span>
                          {/* mobile + button */}
                          <button onClick={e=>{e.stopPropagation();openNew(cell.ds);}}
                            className="opacity-0 group-hover:opacity-100 text-xs w-4 h-4 flex items-center justify-center rounded-full sm:hidden"
                            style={{ color: G.muted }}>+</button>
                        </div>
                        <div className="mt-0.5 space-y-px">
                          {cell.jobs.slice(0, isMobile ? 2 : 3).map(j=>(
                            <div key={j.id} className={`text-xs px-1 sm:px-1.5 py-px sm:py-0.5 rounded font-semibold truncate leading-tight ${STATUSES[j.status]?.calCls||""}`}
                              style={{ fontSize: "clamp(9px,2.2vw,12px)" }}>
                              {j.customer.split(" ")[0]}
                            </div>
                          ))}
                          {cell.jobs.length>3 && <div className="text-xs px-1 font-medium" style={{ color:G.muted }}>+{cell.jobs.length-3}</div>}
                        </div>
                        {hasJobs && (
                          <div className="absolute bottom-1 right-1 text-xs font-bold hidden sm:block" style={{ color:G.muted, fontSize:10 }}>
                            {fmt(cell.jobs.reduce((s,j)=>s+j.amount,0))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend + hint */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-t" style={{ background:"#faf8f4", borderColor:G.border }}>
              {Object.entries(STATUSES).map(([k,s])=>(
                <span key={k} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color:G.muted }}>
                  <span className={`w-2.5 h-2.5 rounded-sm ${s.dot}`} />{s.label}
                </span>
              ))}
              <span className="text-xs ml-auto hidden sm:block italic" style={{ color:G.border }}>Double-tap a date to add a job</span>
            </div>
          </div>

          {/* SELECTED DAY PANEL */}
          {selectedDay && (
            <div className="rounded-2xl overflow-hidden shadow-sm border" style={{ borderColor: G.gold+"66" }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ background:"#fef8ee" }}>
                <div>
                  <h3 className="font-bold text-sm sm:text-base" style={{ color:G.dark }}>{longDate(selectedDay)}</h3>
                  {selJobs.length>0 && <p className="text-xs mt-0.5" style={{ color:G.muted }}>{selJobs.length} job{selJobs.length>1?"s":""} · {fmt(selJobs.reduce((s,j)=>s+j.amount,0))} total</p>}
                </div>
                <div className="flex items-center gap-2">
                  <GoldBtn small onClick={()=>openNew(selectedDay)}>+ Add Job</GoldBtn>
                  <button onClick={()=>setSelectedDay(null)} className="w-7 h-7 flex items-center justify-center rounded-full text-base" style={{ color:G.muted }}>✕</button>
                </div>
              </div>
              {selJobs.length===0 && <div className="px-4 py-6 text-center text-sm" style={{ color:G.muted, background:"#fff" }}>No jobs closing on this date. Double-tap or tap "+ Add Job" to create one.</div>}
              {selJobs.map(j=>(
                <div key={j.id} className="flex items-center gap-3 px-4 py-3 border-t flex-wrap" style={{ borderColor:G.border, background:"#fff" }}>
                  <div className={`w-1 self-stretch rounded-full ${STATUSES[j.status]?.dot}`} style={{ minHeight:40 }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm sm:text-base" style={{ color:G.dark }}>{j.customer}</p>
                    <p className="text-xs" style={{ color:G.muted }}>{j.jobType} · {j.material}{j.sqft?` · ${j.sqft} sf`:""}</p>
                    {j.notes && <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color:G.muted }}>{j.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <div className="text-right">
                      <p className="font-black text-lg sm:text-xl" style={{ color:G.dark }}>{fmt(j.amount)}</p>
                      {j.sqft ? <p className="text-xs" style={{ color:G.muted }}>${(j.amount/j.sqft).toFixed(0)}/sf</p> : null}
                    </div>
                    <Badge status={j.status} />
                    <OutlineBtn small onClick={()=>openEdit(j)}>Edit</OutlineBtn>
                    <GreenBtn small onClick={()=>printJobQuote(j)}>📄 PDF</GreenBtn>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. JOB DASHBOARD */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Active Jobs"    value={stats.activeCount}    sub="Quoted+Open+In Prog" />
            <StatCard label="Pipeline"       value={fmt(stats.pipeline)}   sub="Potential revenue" bg="#f0f7f3" />
            <StatCard label="Revenue Closed" value={fmt(stats.revenue)}    sub="Won & closed" bg="#f0f7f3" />
            <StatCard label="Avg Deal"       value={fmt(stats.avgDeal)}    sub="Active pipeline" />
            <StatCard label="Close Rate"     value={`${stats.closeRate}%`} sub={stats.closeRateSub} bg={stats.closeRate>=50?"#f0f7f3":"#fff"} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl p-4 border shadow-sm" style={{ background:"#fff", borderColor:G.border }}>
              <h2 className="font-bold mb-3 text-sm sm:text-base" style={{ color:G.dark }}>Upcoming Closures</h2>
              {upcoming.length===0 && <p className="text-sm" style={{ color:G.muted }}>No active jobs.</p>}
              {upcoming.map(j=>(
                <div key={j.id} className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor:G.border }}>
                  <div className={`w-1 rounded-full flex-shrink-0 ${STATUSES[j.status]?.dot}`} style={{ height:36 }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color:G.dark }}>{j.customer}</p>
                    <p className="text-xs" style={{ color:G.muted }}>{j.jobType} · {j.material}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm" style={{ color:G.dark }}>{fmt(j.amount)}</p>
                    <p className={`text-xs font-semibold ${j.days<0?"text-red-500":j.days<14?"text-amber-600":"text-stone-400"}`}>
                      {j.days<0?`${Math.abs(j.days)}d overdue`:`${j.days}d left`}
                    </p>
                  </div>
                  <button onClick={()=>jumpDay(j.close)} title="Jump to calendar" className="text-xs w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-green-50" style={{ color:G.light }}>📅</button>
                </div>
              ))}
            </div>

            <div className="rounded-2xl p-4 border shadow-sm" style={{ background:"#fff", borderColor:G.border }}>
              <h2 className="font-bold mb-3 text-sm sm:text-base" style={{ color:G.dark }}>Pipeline by Status</h2>
              {(()=>{
                const vals=Object.keys(STATUSES).map(k=>jobs.filter(j=>j.status===k).reduce((s,j)=>s+j.amount,0));
                const mx=Math.max(...vals,1);
                return Object.entries(STATUSES).map(([key,s],i)=>(
                  <div key={key} className="flex items-center gap-2 mb-2.5 last:mb-0">
                    <span className="text-xs font-semibold w-24 flex-shrink-0" style={{ color:G.muted }}>{s.label}</span>
                    <div className="flex-1 rounded-full h-4 overflow-hidden" style={{ background:G.border }}>
                      <div className="h-4 rounded-full flex items-center justify-end pr-1.5 transition-all" style={{ width:`${(vals[i]/mx)*100}%`, background:s.hex }}>
                        {vals[i]>0 && <span className="text-white text-xs font-bold leading-none">{jobs.filter(j=>j.status===key).length}</span>}
                      </div>
                    </div>
                    <span className="text-xs font-bold w-14 text-right flex-shrink-0" style={{ color:G.dark }}>{fmt(vals[i])}</span>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* 3. FOLLOW-UP */}
          {stats.followUp.length>0 && (
            <div className="rounded-2xl p-4 border" style={{ background:"#fef8ee", borderColor:"#e8d090" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔔</span>
                <h2 className="font-bold text-sm sm:text-base" style={{ color:G.dark }}>Follow-Up Needed</h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background:G.gold }}>{stats.followUp.length}</span>
                <span className="text-xs hidden sm:block" style={{ color:G.muted }}>— no update in 30+ days</span>
              </div>
              <div className="space-y-2">
                {stats.followUp.map(j=>(
                  <div key={j.id} className="flex items-center gap-3 bg-white border rounded-xl px-4 py-2.5 flex-wrap gap-y-2" style={{ borderColor:G.border }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color:G.dark }}>{j.customer}</p>
                      <p className="text-xs" style={{ color:G.muted }}>{j.jobType} · {j.material}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge status={j.status} />
                      <div className="text-right">
                        <p className="font-bold text-sm" style={{ color:G.dark }}>{fmt(j.amount)}</p>
                        <p className="text-xs font-semibold" style={{ color:G.gold }}>{daysSince(j.createdAt)}d since added</p>
                      </div>
                      <OutlineBtn small onClick={()=>openEdit(j)}>Edit</OutlineBtn>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>}

        {/* ═══ JOBS ═══ */}
        {tab==="jobs" && <>
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="text" placeholder="Search customer, type, material…" value={search} onChange={e=>setSearch(e.target.value)}
              className={inp+" flex-1"} style={{ fontFamily:"inherit" }} />
            <select value={filter} onChange={e=>setFilter(e.target.value)} className={inp} style={{ fontFamily:"inherit" }}>
              <option value="all">All Statuses</option>
              {Object.entries(STATUSES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-sm border" style={{ borderColor:G.border }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background:G.dark }} className="text-white text-xs uppercase tracking-wide">
                    {[["customer","Customer"],["jobType","Type"],["material","Material"],["status","Status"],["amount","Quote"],["sqft","Sq Ft"],["close","Close"]].map(([c,l])=>(
                      <th key={c} onClick={()=>toggleSort(c)} className="px-3 sm:px-4 py-3 text-left cursor-pointer hover:opacity-80 whitespace-nowrap select-none">
                        {l}<Arr col={c} />
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center w-8">🔔</th>
                    <th className="px-3 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayJobs.length===0 && <tr><td colSpan={9} className="text-center py-12 text-sm" style={{ color:G.muted }}>No jobs found.</td></tr>}
                  {displayJobs.map((j,i)=>{
                    const days=daysUntil(j.close);
                    const fu=["quote","open"].includes(j.status)&&daysSince(j.createdAt)>=30;
                    const ppsf=j.sqft&&j.amount?(j.amount/j.sqft).toFixed(0):null;
                    return (
                      <tr key={j.id} className="border-b transition-colors" style={{ borderColor:G.border, background:i%2===0?"#fff":"#faf8f4", borderLeft:fu?`3px solid ${G.gold}`:"" }}>
                        <td className="px-3 sm:px-4 py-3 font-semibold whitespace-nowrap" style={{ color:G.dark }}>{j.customer}</td>
                        <td className="px-3 py-3 whitespace-nowrap" style={{ color:G.muted }}>{j.jobType}</td>
                        <td className="px-3 py-3 whitespace-nowrap" style={{ color:G.muted }}>{j.material}</td>
                        <td className="px-3 py-3 whitespace-nowrap"><Badge status={j.status} /></td>
                        <td className="px-3 py-3 font-bold whitespace-nowrap" style={{ color:G.dark }}>
                          {fmt(j.amount)}{ppsf&&<span className="block text-xs font-normal" style={{ color:G.muted }}>${ppsf}/sf</span>}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap" style={{ color:G.muted }}>{j.sqft?`${j.sqft} sf`:"—"}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={`font-medium text-xs sm:text-sm ${days<0?"text-red-500":days<14?"text-amber-600":"text-stone-500"}`}>{j.close}</span>
                        </td>
                        <td className="px-3 py-3 text-center">{fu&&<span title={`${daysSince(j.createdAt)}d no update`}>🔔</span>}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex gap-1.5">
                            <OutlineBtn small onClick={()=>openEdit(j)}>Edit</OutlineBtn>
                            <OutlineBtn small onClick={()=>jumpDay(j.close)}>📅</OutlineBtn>
                            <button onClick={()=>deleteJob(j.id)} className="text-xs px-2 py-1 rounded-lg font-semibold border transition-all" style={{ borderColor:"#fecaca", color:"#ef4444", background:"#fff9f9" }}>Del</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 flex justify-between text-xs border-t" style={{ borderColor:G.border, background:"#faf8f4", color:G.muted }}>
              <span>{displayJobs.length} job{displayJobs.length!==1?"s":""}</span>
              <span className="font-bold" style={{ color:G.dark }}>Total: {fmt(displayJobs.reduce((s,j)=>s+j.amount,0))}</span>
            </div>
          </div>
        </>}

        {/* ═══ CUSTOMERS ═══ */}
        {tab==="customers" && <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Customers"    value={custGroups.length} />
            <StatCard label="Pipeline"     value={fmt(custGroups.reduce((s,c)=>s+c.pipeline,0))} bg="#f0f7f3" />
            <StatCard label="Won"          value={fmt(custGroups.reduce((s,c)=>s+c.won,0))} bg="#f0f7f3" />
          </div>
          <div className="space-y-3">
            {custGroups.map(cg=>{
              const open=expandedCust===cg.name;
              return (
                <div key={cg.name} className="rounded-2xl overflow-hidden shadow-sm border" style={{ borderColor:G.border }}>
                  <div className="flex items-center justify-between px-4 py-4 cursor-pointer hover:opacity-95 transition-opacity bg-white" onClick={()=>setExpandedCust(open?null:cg.name)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white flex-shrink-0" style={{ background:G.dark }}>
                        {cg.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm sm:text-base" style={{ color:G.dark }}>{cg.name}</p>
                        <p className="text-xs" style={{ color:G.muted }}>{cg.jobs.length} job{cg.jobs.length!==1?"s":""} · {[...new Set(cg.jobs.map(j=>j.jobType))].join(", ")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-5">
                      {cg.pipeline>0&&<div className="text-right hidden sm:block"><p className="text-xs" style={{ color:G.muted }}>Pipeline</p><p className="font-bold text-sm" style={{ color:G.light }}>{fmt(cg.pipeline)}</p></div>}
                      {cg.won>0&&<div className="text-right hidden sm:block"><p className="text-xs" style={{ color:G.muted }}>Won</p><p className="font-bold text-sm text-green-700">{fmt(cg.won)}</p></div>}
                      <div className="text-right"><p className="text-xs" style={{ color:G.muted }}>Total</p><p className="font-black text-sm sm:text-base" style={{ color:G.dark }}>{fmt(cg.total)}</p></div>
                      <GreenBtn small onClick={e=>{e.stopPropagation();printCustomerJobs(cg.name,cg.jobs);}}>📄 PDF</GreenBtn>
                      <span style={{ color:G.border, fontSize:16 }}>{open?"▲":"▼"}</span>
                    </div>
                  </div>
                  {open && (
                    <div className="border-t overflow-x-auto" style={{ borderColor:G.border }}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs uppercase" style={{ background:"#faf8f4", color:G.muted }}>
                            <th className="px-4 py-2 text-left font-semibold">Type</th>
                            <th className="px-4 py-2 text-left font-semibold">Material</th>
                            <th className="px-4 py-2 text-left font-semibold">Status</th>
                            <th className="px-4 py-2 text-left font-semibold">Amount</th>
                            <th className="px-4 py-2 text-left font-semibold">$/sf</th>
                            <th className="px-4 py-2 text-left font-semibold">Close</th>
                            <th className="px-4 py-2 text-left font-semibold">Notes</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {cg.jobs.map(j=>(
                            <tr key={j.id} className="border-t hover:bg-green-50/30 transition-colors" style={{ borderColor:G.border }}>
                              <td className="px-4 py-2.5" style={{ color:G.dark }}>{j.jobType}</td>
                              <td className="px-4 py-2.5" style={{ color:G.muted }}>{j.material}</td>
                              <td className="px-4 py-2.5"><Badge status={j.status} /></td>
                              <td className="px-4 py-2.5 font-bold" style={{ color:G.dark }}>{fmt(j.amount)}</td>
                              <td className="px-4 py-2.5 text-xs" style={{ color:G.muted }}>{j.sqft?`$${(j.amount/j.sqft).toFixed(0)}/sf`:"—"}</td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-xs" style={{ color:G.muted }}>{j.close}</td>
                              <td className="px-4 py-2.5 text-xs max-w-xs truncate" style={{ color:G.muted }}>{j.notes}</td>
                              <td className="px-4 py-2.5"><OutlineBtn small onClick={()=>openEdit(j)}>Edit</OutlineBtn></td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t" style={{ borderColor:"#d1c9bb", background:"#f5f2ea" }}>
                            <td colSpan={3} className="px-4 py-2.5 text-xs font-black uppercase tracking-wide" style={{ color:G.muted }}>Customer Total</td>
                            <td className="px-4 py-2.5 font-black" style={{ color:G.dark }}>{fmt(cg.total)}</td>
                            <td colSpan={4} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>}

        {/* ═══ MAP ═══ */}
        {tab==="map" && <>
          <div className="rounded-2xl p-3 sm:p-4 border shadow-sm flex items-center justify-between flex-wrap gap-3 bg-white" style={{ borderColor:G.border }}>
            <div>
              <h2 className="font-bold" style={{ color:G.dark }}>Job Locations</h2>
              <p className="text-xs mt-0.5" style={{ color:G.muted }}>{jobs.filter(j=>j.lat&&j.lng).length} of {jobs.length} plotted · Click pin for details</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.entries(STATUSES).map(([k,s])=>(
                <span key={k} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color:G.muted }}>
                  <span className="w-3 h-3 rounded-full border-2 border-white shadow" style={{ background:s.hex }} />{s.label}
                </span>
              ))}
            </div>
          </div>
          {mapError
            ? <div className="rounded-2xl p-10 text-center border" style={{ background:"#fff5f5", borderColor:"#fecaca" }}><p className="font-bold text-red-600">{mapError}</p></div>
            : <div className="rounded-2xl overflow-hidden shadow-sm border" style={{ height:480, borderColor:G.border }}><div ref={mapRef} style={{ width:"100%",height:"100%" }} /></div>
          }
        </>}

      </main>

      {/* ═══ EXPORT MODAL ═══ */}
      {showExport && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center p-3 sm:p-6" style={{ background:"rgba(26,60,43,.6)", zIndex:9999, backdropFilter:"blur(4px)" }}>
          <div className="w-full max-w-md rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl" style={{ background:"#fff" }}>
            <div className="px-6 py-5 flex items-center justify-between" style={{ background:G.dark }}>
              <div>
                <h2 className="font-black text-white text-lg">Export Report</h2>
                <p className="text-xs mt-0.5" style={{ color:"#9dbfad" }}>Choose a month to generate a PDF pipeline report</p>
              </div>
              <button onClick={()=>setShowExport(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-white text-xl" style={{ background:"rgba(255,255,255,.1)" }}>×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color:G.muted }}>Select Month</label>
                <select value={exportMY} onChange={e=>setExportMY(e.target.value)} className={inp} style={{ fontFamily:"inherit" }}>
                  {monthOptions.map(o=><option key={o.val} value={o.val}>{o.label}</option>)}
                </select>
              </div>

              <div className="rounded-2xl p-4 border" style={{ background:G.parch, borderColor:G.border }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color:G.muted }}>Preview</p>
                {exportJobs.length===0
                  ? <p className="text-sm" style={{ color:G.muted }}>No jobs closing in this month.</p>
                  : <>
                    <p className="font-black text-2xl" style={{ color:G.dark }}>{fmt(exportJobs.reduce((s,j)=>s+j.amount,0))}</p>
                    <p className="text-xs mt-0.5" style={{ color:G.muted }}>{exportJobs.length} job{exportJobs.length!==1?"s":""} · {monthOptions.find(o=>o.val===exportMY)?.label}</p>
                    <div className="mt-3 space-y-1.5">
                      {exportJobs.slice(0,5).map(j=>(
                        <div key={j.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUSES[j.status]?.dot}`} />
                            <span className="truncate font-medium" style={{ color:G.dark }}>{j.customer}</span>
                          </div>
                          <span className="font-bold flex-shrink-0 ml-2" style={{ color:G.dark }}>{fmt(j.amount)}</span>
                        </div>
                      ))}
                      {exportJobs.length>5 && <p className="text-xs" style={{ color:G.muted }}>+{exportJobs.length-5} more</p>}
                    </div>
                  </>
                }
              </div>

              <div className="flex gap-3">
                <GoldBtn onClick={()=>{ printMonthlyReport(monthOptions.find(o=>o.val===exportMY)?.label||exportMY, exportJobs); setShowExport(false); }}>
                  📄 Generate PDF
                </GoldBtn>
                <OutlineBtn onClick={()=>setShowExport(false)}>Cancel</OutlineBtn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ JOB FORM MODAL ═══ */}
      {showForm && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6" style={{ background:"rgba(26,60,43,.65)", zIndex:9999, backdropFilter:"blur(6px)" }}>
          <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl" style={{ maxHeight:"94vh", overflowY:"auto" }}>
            <div className="px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between sticky top-0 z-10" style={{ background:G.dark }}>
              <h2 className="font-black text-white text-lg">{editId?"Edit Job":"New Job / Quote"}</h2>
              <button onClick={closeForm} className="w-8 h-8 flex items-center justify-center rounded-full text-white text-xl" style={{ background:"rgba(255,255,255,.1)" }}>×</button>
            </div>
            <div className="p-5 sm:p-6 space-y-4" style={{ background:"#fff" }}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color:G.muted }}>Customer Name *</label>
                <input type="text" value={form.customer} onChange={e=>setForm({...form,customer:e.target.value})} placeholder="e.g. Williams Builders" className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color:G.muted }}>Job Type</label>
                  <select value={form.jobType} onChange={e=>setForm({...form,jobType:e.target.value})} className={inp}>{JOB_TYPES.map(t=><option key={t}>{t}</option>)}</select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color:G.muted }}>Material</label>
                  <select value={form.material} onChange={e=>setForm({...form,material:e.target.value})} className={inp}>{MATERIALS.map(m=><option key={m}>{m}</option>)}</select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color:G.muted }}>Status</label>
                  <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className={inp}>
                    {Object.entries(STATUSES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color:G.muted }}>Quote Amount ($) *</label>
                  <input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00" min="0" className={inp} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color:G.muted }}>Square Footage</label>
                  <input type="number" value={form.sqft} onChange={e=>setForm({...form,sqft:e.target.value})} placeholder="sq ft" min="0" className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color:G.muted }}>Price / sq ft</label>
                  <div className="rounded-xl border px-4 py-2.5 text-sm font-bold" style={{ borderColor:G.border, background:G.parch, color:G.dark }}>
                    {form.sqft&&form.amount?`$${(parseAmt(form.amount)/parseAmt(form.sqft)).toFixed(2)}/sf`:<span className="font-normal" style={{ color:G.muted }}>Auto-calculated</span>}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color:G.muted }}>Start Date *</label>
                  <input type="date" value={form.start} onChange={e=>setForm({...form,start:e.target.value})} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color:G.muted }}>Expected Close *</label>
                  <input type="date" value={form.close} onChange={e=>setForm({...form,close:e.target.value})} className={inp} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color:G.muted }}>Address / City <span className="font-normal normal-case" style={{ color:G.border }}>(for map)</span></label>
                <input type="text" value={form.address} onChange={e=>setForm({...form,address:e.target.value,lat:null,lng:null})} placeholder="e.g. Austin, TX" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color:G.muted }}>Notes</label>
                <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} placeholder="Material details, measurements, special requests…" className={inp+" resize-none"} />
              </div>
              <div className="flex gap-2 pt-1">
                <GoldBtn onClick={saveJob}>
                  {geocoding?"Saving…":editId?"Save Changes":"Add Job"}
                </GoldBtn>
                {editId && <GreenBtn onClick={()=>printJobQuote({...form,amount:parseAmt(form.amount),sqft:parseAmt(form.sqft)||0})}>📄 PDF</GreenBtn>}
                <OutlineBtn onClick={closeForm}>Cancel</OutlineBtn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}