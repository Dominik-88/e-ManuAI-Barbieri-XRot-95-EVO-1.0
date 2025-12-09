/* ============================================================
   BARBIERI XROT 95 EVO — SYSTEM CORE
   Autor: Dominik Schmied
   Verze: 5.0 (Production / Real Data)
============================================================ */

import { db } from './db.js';

let appState = {
  mth: 0.0,
  activeTab: 'dash'
};

// 1. START SYSTÉMU
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await db.init();
    appState.mth = await db.getMth();
  } catch (e) {
    console.error("DB Init failed:", e);
  }
  
  renderApp();
  setupGlobalListeners();
  
  // Detekce připojení pro aktualizaci statusu
  window.addEventListener('online', updateHeader);
  window.addEventListener('offline', updateHeader);
});

// 2. HLAVNÍ RENDERER
function renderApp() {
  const container = document.getElementById('moduleContainer');
  
  // Renderování obsahu podle záložky
  if (appState.activeTab === 'dash') renderDashboard(container);
  else if (appState.activeTab === 'service') renderServiceBook(container);
  else if (appState.activeTab === 'manual') renderManual(container);
  else if (appState.activeTab === 'map') renderMap(container);

  renderNavigation();
  updateHeader();
}

function updateHeader() {
  // Aktualizace stavu v hlavičce (pokud elementy existují v index.html)
  // Poznámka: index.html musí být kompatibilní
}

// 3. SPODNÍ NAVIGACE
function renderNavigation() {
  // Zkontrolujeme, zda navigace již existuje
  if (document.getElementById('bottom-nav')) return;

  const nav = document.createElement('nav');
  nav.id = 'bottom-nav';
  nav.innerHTML = `
    <button class="nav-btn active" onclick="window.switchTab('dash')"><i class="fa-solid fa-gauge-high"></i><br>PŘEHLED</button>
    <button class="nav-btn" onclick="window.switchTab('service')"><i class="fa-solid fa-wrench"></i><br>SERVIS</button>
    <button class="nav-btn" onclick="window.switchTab('manual')"><i class="fa-solid fa-book"></i><br>MANUÁL</button>
    <button class="nav-btn" onclick="window.switchTab('map')"><i class="fa-solid fa-map"></i><br>MAPA</button>
  `;
  document.body.appendChild(nav);
  
  // Vložení stylů pro navigaci
  const style = document.createElement('style');
  style.innerHTML = `
    #bottom-nav { position: fixed; bottom: 0; left: 0; width: 100%; background: #0a0a0c; border-top: 1px solid #333; display: flex; justify-content: space-around; padding-bottom: env(safe-area-inset-bottom); z-index: 900; }
    .nav-btn { background: none; border: none; color: #666; padding: 10px; font-family: sans-serif; font-size: 0.6rem; width: 100%; text-align: center; }
    .nav-btn i { font-size: 1.2rem; margin-bottom: 4px; display: block; }
    .nav-btn.active { color: #00f3ff; border-top: 2px solid #00f3ff; background: rgba(0, 243, 255, 0.05); }
    #moduleContainer { padding-bottom: 80px; }
  `;
  document.head.appendChild(style);
}

// 4. OBSAH: PŘEHLED (DASHBOARD)
function renderDashboard(container) {
  const isOnline = navigator.onLine;
  
  container.innerHTML = `
    <div class="cyber-ui">
      
      <div class="status-panel">
        <div class="status-item">
          <div class="label">PŘIPOJENÍ</div>
          <div class="value" style="color:${isOnline ? '#00f3ff' : '#ff003c'}">
            ${isOnline ? 'LTE / ONLINE' : 'OFFLINE'}
          </div>
        </div>
        <div class="status-item">
          <div class="label">GPS / RTK</div>
          <div class="value" style="color:#555">NO SIGNAL</div>
        </div>
        <div class="status-item" onclick="window.editMth()">
          <div class="label">MOTOHODINY</div>
          <div class="value clickable" style="color:#fff; text-decoration:underline;">${appState.mth.toFixed(1)}</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <h3><i class="fa-solid fa-microchip"></i> LIVE DIAGNOSTIKA</h3>
          <span style="background:#222; color:#555; padding:2px 5px; font-size:0.6rem;">OFFLINE</span>
        </div>
        <div class="diag-grid">
          <div class="diag-box"><span>TEPLOTA</span><strong>---</strong></div>
          <div class="diag-box"><span>TLAK OLEJE</span><strong>NO SIGNAL</strong></div>
          <div class="diag-box"><span>NÁKLON</span><strong>---</strong></div>
          <div class="diag-box"><span>NAPĚTÍ</span><strong>---</strong></div>
        </div>
        <div style="font-size:0.7rem; color:#444; margin-top:10px; font-style:italic;">
          * Hardware stroje není připojen. Zobrazení live dat není k dispozici.
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3><i class="fa-solid fa-bolt"></i> RYCHLÉ AKCE</h3></div>
        <div class="quick-actions">
          <button class="btn-cyber" onclick="window.openServiceModal()">
            <i class="fa-solid fa-plus"></i> NOVÝ ZÁZNAM
          </button>
          <button class="btn-cyber-outline" onclick="window.exportData()">
            <i class="fa-solid fa-file-export"></i> EXPORT DAT
          </button>
        </div>
      </div>

    </div>
  `;
}

// 5. OBSAH: SERVISNÍ KNIHA
async function renderServiceBook(container) {
  const records = await db.getRecords();
  
  let html = `
    <div class="cyber-ui">
      <div class="panel">
        <div class="panel-head"><h3><i class="fa-solid fa-list"></i> HISTORIE ÚKONŮ</h3></div>
        <div class="history-list">
  `;

  if (!records || records.length === 0) {
    html += `<div style="padding:20px; text-align:center; color:#666;">Žádné záznamy v paměti.</div>`;
  } else {
    // Seřadit od nejnovějšího
    records.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(r => {
      html += `
        <div class="history-item" style="border-left:2px solid #00f3ff; padding:10px; margin-bottom:10px; background:#111;">
          <div style="display:flex; justify-content:space-between; color:#888; font-size:0.8rem;">
            <span>${new Date(r.date).toLocaleDateString()}</span>
            <strong>${r.mth} MTH</strong>
          </div>
          <div style="margin-top:5px;">
            <span style="background:#222; padding:2px 6px; font-size:0.7rem; color:#fff;">${r.type}</span>
            <p style="margin:5px 0 0 0; font-size:0.9rem; color:#ccc;">${r.desc}</p>
          </div>
        </div>
      `;
    });
  }
  
  html += `</div></div></div>`;
  container.innerHTML = html;
}

// 6. OBSAH: MANUÁL
function renderManual(container) {
  container.innerHTML = `
    <div class="cyber-ui">
      <div class="panel">
        <input type="text" id="manual-search" style="width:100%; padding:12px; background:#000; border:1px solid #333; color:#fff;" placeholder="Hledat (např. 'olej', '107')..." oninput="window.searchManual(this)">
        <div id="manual-results" style="margin-top:10px;"></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>TECHNICKÁ DATA (KAWASAKI FS730V)</h3></div>
        <div style="font-size:0.9rem; line-height:1.8; color:#ccc;">
          <div>MOTOR: <b>Kawasaki FS730V EFI</b></div>
          <div>VÝKON: <b>23 HP (17 kW)</b></div>
          <div>OLEJ: <b>10W-40 (2.1 L)</b></div>
          <div>HYDRAULIKA: <b>ISO VG 46 (10 L)</b></div>
          <div>SVAH MAX: <b>55° (Limit mazání)</b></div>
          <div>NÁDRŽ: <b>32 L (2x 16L)</b></div>
        </div>
      </div>
    </div>
  `;
}

// 7. OBSAH: MAPA
function renderMap(container) {
  container.innerHTML = `
    <div class="cyber-ui">
      <div class="panel" style="height:400px; display:flex; align-items:center; justify-content:center; background:#111; border:1px solid #333;">
        <div style="text-align:center; color:#666;">
          <i class="fa-solid fa-satellite-dish fa-3x"></i><br><br>
          GPS MODUL NENÍ PŘIPOJEN.<br>Nelze načíst polohu stroje.
        </div>
      </div>
    </div>
  `;
}

/* ============================================================
   GLOBÁLNÍ FUNKCE (WINDOW)
============================================================ */

window.switchTab = (tab) => {
  appState.activeTab = tab;
  renderApp();
  
  // Update tlačítek
  document.querySelectorAll('.nav-btn').forEach(btn => {
    if(btn.innerText.includes(tab === 'dash' ? 'PŘEHLED' : (tab === 'service' ? 'SERVIS' : (tab === 'manual' ? 'MANUÁL' : 'MAPA')))) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
};

window.editMth = async () => {
  const newVal = prompt("Nastavit motohodiny:", appState.mth);
  if (newVal && !isNaN(newVal)) {
    appState.mth = parseFloat(newVal);
    await db.setMth(appState.mth);
    renderApp();
  }
};

// --- SERVISNÍ MODAL ---
window.openServiceModal = () => {
  // Vytvoření modalu pokud neexistuje
  let modal = document.getElementById('serviceModal');
  if(!modal) {
    const div = document.createElement('div');
    div.id = 'serviceModal';
    div.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:999; display:flex; justify-content:center; align-items:center;';
    div.innerHTML = `
      <div style="background:#111; border:1px solid #00f3ff; padding:20px; width:90%; max-width:400px;">
        <h3 style="color:#00f3ff; margin-top:0;">ZAPSAT SERVIS</h3>
        <form onsubmit="window.saveService(event)">
          <div style="margin-bottom:10px;">
            <label style="color:#888; font-size:0.8rem;">Datum</label>
            <input type="date" id="s-date" required style="width:100%; padding:10px; background:#000; border:1px solid #333; color:#fff;">
          </div>
          <div style="margin-bottom:10px;">
            <label style="color:#888; font-size:0.8rem;">Stav MTH</label>
            <input type="number" id="s-mth" step="0.1" required style="width:100%; padding:10px; background:#000; border:1px solid #333; color:#fff;">
          </div>
          <div style="margin-bottom:10px;">
            <label style="color:#888; font-size:0.8rem;">Typ</label>
            <select id="s-type" style="width:100%; padding:10px; background:#000; border:1px solid #333; color:#fff;">
              <option>Běžná údržba</option><option>Oprava</option><option>Výměna oleje</option><option>Tankování</option>
            </select>
          </div>
          <div style="margin-bottom:15px;">
            <label style="color:#888; font-size:0.8rem;">Popis</label>
            <textarea id="s-desc" style="width:100%; padding:10px; background:#000; border:1px solid #333; color:#fff;" placeholder="Detaily..."></textarea>
          </div>
          <div style="display:flex; gap:10px;">
            <button type="button" onclick="document.getElementById('serviceModal').remove()" style="flex:1; padding:10px; background:#333; color:#fff; border:none;">ZRUŠIT</button>
            <button type="submit" style="flex:1; padding:10px; background:#00f3ff; border:none; font-weight:bold;">ULOŽIT</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(div);
    document.getElementById('s-date').valueAsDate = new Date();
    document.getElementById('s-mth').value = appState.mth;
  }
};

window.saveService = async (e) => {
  e.preventDefault();
  const rec = {
    date: document.getElementById('s-date').value,
    mth: parseFloat(document.getElementById('s-mth').value),
    type: document.getElementById('s-type').value,
    desc: document.getElementById('s-desc').value
  };
  await db.addRecord(rec);
  
  if (rec.mth > appState.mth) {
    appState.mth = rec.mth;
    await db.setMth(appState.mth);
  }
  
  document.getElementById('serviceModal').remove();
  renderApp();
  alert("Záznam uložen.");
};

window.searchManual = (input) => {
  const q = input.value.toLowerCase();
  const res = document.getElementById('manual-results');
  res.innerHTML = '';
  
  if (q.length < 2) return;

  // Vyhledávání v DB (Hard Data)
  if(db.ERRORS) {
    Object.entries(db.ERRORS).forEach(([code, desc]) => {
      if (code.includes(q) || desc.toLowerCase().includes(q)) {
        res.innerHTML += `<div style="padding:10px; border-bottom:1px solid #333; border-left:3px solid red; margin-bottom:5px;"><b>E${code}</b>: ${desc}</div>`;
      }
    });
  }
  if(db.SCHEDULE) {
    db.SCHEDULE.forEach(item => {
      if (item.task.toLowerCase().includes(q) || item.note.toLowerCase().includes(q)) {
        res.innerHTML += `<div style="padding:10px; border-bottom:1px solid #333; border-left:3px solid orange; margin-bottom:5px;"><b>${item.hours}h</b>: ${item.task} <br><small style="color:#888">${item.note}</small></div>`;
      }
    });
  }
};

window.exportData = async () => {
  const records = await db.getRecords();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = `XROT_BACKUP_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
};

/* --- POMOCNÉ STYLY PRO APP.JS --- */
const style = document.createElement('style');
style.innerHTML = `
  .cyber-ui { padding: 15px; display: flex; flex-direction: column; gap: 15px; }
  .status-panel { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .status-item { background: #0a0a0c; border: 1px solid #333; padding: 10px; text-align: center; border-radius: 4px; }
  .status-item .label { font-size: 0.6rem; color: #666; margin-bottom: 5px; }
  .status-item .value { font-family: sans-serif; font-weight: 700; font-size: 1.1rem; }
  
  .panel { background: #0a0a0c; border: 1px solid #333; padding: 15px; border-radius: 6px; }
  .panel-head { border-bottom: 1px solid #222; padding-bottom: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; }
  .panel-head h3 { margin: 0; color: #00f3ff; font-size: 0.9rem; }
  
  .diag-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .diag-box { background: #000; border: 1px solid #222; padding: 10px; display: flex; justify-content: space-between; }
  .diag-box span { font-size: 0.7rem; color: #666; }
  .diag-box strong { font-family: monospace; color: #888; }
  
  .quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .btn-cyber { background: #00f3ff; color: #000; border: none; padding: 12px; font-weight: bold; cursor: pointer; }
  .btn-cyber-outline { background: transparent; border: 1px solid #00f3ff; color: #00f3ff; padding: 12px; font-weight: bold; cursor: pointer; }
`;
document.head.appendChild(style);
