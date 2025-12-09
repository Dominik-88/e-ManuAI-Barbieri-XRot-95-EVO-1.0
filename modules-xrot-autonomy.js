/* ============================================================
   XROT95 AUTONOMY CORE 3.0
   Design: Cyber Industrial | Data: Connected to DB
============================================================ */
import { db } from './db.js';

let currentId = null;
let refreshInterval = null;

export async function init(id, container) {
  currentId = id;
  
  // 1. Základní Layout
  container.innerHTML = `
    <div class="xrot-ui">
      <div class="dash-header">
        <div>
          <h2 style="margin:0; color:#fff;">X-ROT 95 EVO</h2>
          <div style="font-size:0.75rem; color:var(--text-dim); margin-top:4px;">
            <i class="fa-solid fa-circle" style="color:var(--ok); font-size:0.6rem;"></i> Connected (LTE)
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:1.2rem; font-weight:bold; color:var(--accent);">1,245.5 <span style="font-size:0.7rem;">MTH</span></div>
        </div>
      </div>

      <div class="tabs">
        <button class="t-btn active" onclick="window.setTab('Dash')"><i class="fa-solid fa-gauge"></i> Přehled</button>
        <button class="t-btn" onclick="window.setTab('Data')"><i class="fa-solid fa-chart-line"></i> Data</button>
        <button class="t-btn" onclick="window.setTab('GPS')"><i class="fa-solid fa-map-location"></i> GPS</button>
        <button class="t-btn" onclick="window.setTab('Tech')"><i class="fa-solid fa-book"></i> Manuál</button>
      </div>

      <div id="x-content"></div>
    </div>

    <style>
      .xrot-ui { display: flex; flex-direction: column; height: 100%; }
      .dash-header { padding: 20px; background: linear-gradient(180deg, rgba(0,240,255,0.05) 0%, transparent 100%); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); }
      .tabs { display: flex; padding: 10px 15px; gap: 10px; overflow-x: auto; background: rgba(0,0,0,0.3); }
      .t-btn { flex: 1; padding: 10px; background: transparent; border: 1px solid var(--border); color: var(--text-dim); border-radius: 8px; font-size: 0.8rem; white-space: nowrap; transition: 0.2s; }
      .t-btn.active { background: var(--accent); color: #000; font-weight: bold; border-color: var(--accent); box-shadow: 0 0 15px rgba(0,240,255,0.3); }
      #x-content { padding: 20px; flex: 1; overflow-y: auto; }
      
      /* WIDGETS */
      .widget { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; margin-bottom: 15px; }
      .w-title { font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); margin-bottom: 10px; letter-spacing: 1px; }
      .stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
      .stat-row:last-child { border: none; }
      
      .health-ok { color: var(--ok); font-weight: bold; }
      .health-warn { color: var(--warn); font-weight: bold; }
    </style>
  `;

  // 2. Tab Logic
  window.setTab = (tab) => {
    document.querySelectorAll('.t-btn').forEach(b => {
      b.classList.toggle('active', b.innerText.includes(tab === 'Dash' ? 'Přehled' : tab));
    });
    
    const c = document.getElementById('x-content');
    if (tab === 'Dash') renderDashboard(c);
    else if (tab === 'Data') c.innerHTML = '<div class="widget"><h3 class="w-title">Live Telemetrie</h3><p>Simulace grafů...</p></div>';
    else if (tab === 'GPS') c.innerHTML = '<div class="widget"><h3 class="w-title">RTK Status</h3><p>Připojeno k CZEPOS</p></div>';
    else if (tab === 'Tech') c.innerHTML = '<div class="widget"><h3 class="w-title">Manuál</h3><p>Technická specifikace...</p></div>';
  };

  // 3. Load Data & Render Dash
  window.setTab('Dash');
}

async function renderDashboard(container) {
  // Fetch data from DB
  const logs = await db.getServicesByMachine(currentId, { limit: 1 });
  const lastService = logs.length > 0 ? logs[0] : null;
  
  // Calculate maintenance logic
  const currentMth = 1245.5;
  const nextServiceMth = Math.ceil(currentMth / 50) * 50; // Interval 50h
  const hoursLeft = (nextServiceMth - currentMth).toFixed(1);
  const statusColor = hoursLeft < 10 ? 'var(--warn)' : 'var(--ok)';

  container.innerHTML = `
    <div class="widget" style="border-left: 4px solid ${statusColor};">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div class="w-title">Údržba (Servis za)</div>
          <div style="font-size:1.8rem; font-weight:bold; color:${statusColor};">${hoursLeft} <span style="font-size:1rem;">h</span></div>
        </div>
        <i class="fa-solid fa-wrench" style="font-size:2rem; color:rgba(255,255,255,0.1);"></i>
      </div>
      <div style="margin-top:10px; font-size:0.8rem; color:#888;">
        Příští interval: <b>${nextServiceMth} Mth</b> (Výměna oleje)
      </div>
    </div>

    <div class="widget">
      <div class="w-title">Poslední Servisní Záznam</div>
      ${lastService ? `
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
          <b style="color:#fff;">${lastService.type}</b>
          <span style="color:#888;">${new Date(lastService.date).toLocaleDateString()}</span>
        </div>
        <div style="font-size:0.85rem; color:#ccc;">${lastService.desc}</div>
        <div style="font-size:0.8rem; color:var(--accent); margin-top:5px;">${lastService.mth} Mth</div>
      ` : '<div style="color:#666; font-style:italic;">Zatím žádný záznam.</div>'}
      
      <button onclick="window.addQuickLog()" style="width:100%; margin-top:15px; padding:10px; background:rgba(255,255,255,0.1); border:1px solid #444; color:#fff; border-radius:6px; cursor:pointer;">
        <i class="fa-solid fa-plus"></i> Zapsat Rychlý Servis
      </button>
    </div>

    <div class="widget">
      <div class="w-title">Diagnostika (Live)</div>
      <div class="stat-row">
        <span>Teplota Motoru</span>
        <span class="health-ok">85°C</span>
      </div>
      <div class="stat-row">
        <span>Baterie (Pojezd)</span>
        <span class="health-ok">50.2V</span>
      </div>
      <div class="stat-row">
        <span>Tlak Oleje</span>
        <span class="health-ok">OK</span>
      </div>
      <div class="stat-row">
        <span>RTK Signál</span>
        <span class="health-warn">FLOAT (30cm)</span>
      </div>
    </div>
  `;

  // Quick Action Logic
  window.addQuickLog = async () => {
    const note = prompt("Popis servisu:", "Běžná kontrola");
    if(note) {
      await db.addService({
        machineId: currentId,
        date: new Date().toISOString(),
        mth: currentMth,
        type: "Rychlý Záznam",
        desc: note,
        cost: 0
      });
      renderDashboard(container); // Refresh
    }
  };
}
