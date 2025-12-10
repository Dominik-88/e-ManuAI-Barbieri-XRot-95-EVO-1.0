/* ============================================================
   BARBIERI XROT 95 EVO — CORE SYSTEM
   Autor: Dominik Schmied
   Verze: 4.0 (Real Data Only)
============================================================ */

import { db } from './db.js';

let currentMth = 0.0;
let refreshInterval = null;

export async function init(id, container) {
  
  // Načtení uložených MTH z DB (pokud existují)
  try {
    const settings = await db.getSetting('machine_mth');
    if(settings) currentMth = parseFloat(settings.value);
  } catch(e) { console.log("První spuštění, MTH = 0"); }

  // 1. RENDER LAYOUTU
  container.innerHTML = `
    <div class="cyber-ui">
      
      <div class="search-bar">
        <i class="fa-solid fa-search"></i>
        <input type="text" id="global-search" placeholder="Vyhledat v systému..." onkeyup="window.handleSearch(this)">
      </div>

      <div class="status-panel">
        <div class="status-item">
          <div class="label">PŘIPOJENÍ</div>
          <div class="value" id="net-status" style="color:var(--danger)">DETEKCE...</div>
        </div>
        <div class="status-item">
          <div class="label">GPS / RTK</div>
          <div class="value" style="color:#555">NO SIGNAL</div>
        </div>
        <div class="status-item">
          <div class="label">MOTOHODINY</div>
          <div class="value clickable" onclick="window.editMth()" id="val-mth">${currentMth.toFixed(1)}</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <h3><i class="fa-solid fa-microchip"></i> LIVE DIAGNOSTIKA</h3>
          <span class="badge-offline">OFFLINE</span>
        </div>
        <div class="diag-grid">
          <div class="diag-box">
            <span>TEPLOTA MOTORU</span>
            <strong>---</strong>
          </div>
          <div class="diag-box">
            <span>TLAK OLEJE</span>
            <strong>---</strong>
          </div>
          <div class="diag-box">
            <span>NÁKLON (X/Y)</span>
            <strong>--- / ---</strong>
          </div>
          <div class="diag-box">
            <span>NAPĚTÍ (48V)</span>
            <strong>---</strong>
          </div>
        </div>
        <div class="warning-text">
          * Hodnoty nejsou k dispozici. Hardware není připojen.
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <h3><i class="fa-solid fa-wrench"></i> SERVISNÍ DENÍK</h3>
        </div>
        
        <div class="quick-actions">
          <button class="btn-cyber" onclick="window.openServiceModal()">
            <i class="fa-solid fa-plus"></i> NOVÝ ZÁZNAM
          </button>
          <button class="btn-cyber-outline" onclick="window.exportData()">
            <i class="fa-solid fa-file-export"></i> EXPORT DAT
          </button>
        </div>

        <div id="last-service-info" style="margin-top:15px; font-size:0.9rem; color:#888;">
          Načítání historie...
        </div>
      </div>

    </div>

    <div id="serviceModal" class="modal hidden">
      <div class="modal-content">
        <h3>ZAPSAT SERVIS</h3>
        <form onsubmit="window.saveService(event)">
          <label>Datum</label>
          <input type="date" id="s-date" required class="cyber-input">
          
          <label>Stav MTH</label>
          <input type="number" id="s-mth" step="0.1" required class="cyber-input">
          
          <label>Typ úkonu</label>
          <select id="s-type" class="cyber-input">
            <option value="Běžná údržba">Běžná údržba</option>
            <option value="Oprava">Oprava</option>
            <option value="Výměna oleje">Výměna oleje</option>
            <option value="Kontrola">Kontrola</option>
            <option value="Tankování">Tankování</option>
          </select>

          <label>Popis / Poznámka</label>
          <textarea id="s-desc" rows="3" class="cyber-input" placeholder="Detaily..."></textarea>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" onclick="window.closeModal()">ZRUŠIT</button>
            <button type="submit" class="btn-confirm">ULOŽIT</button>
          </div>
        </form>
      </div>
    </div>

    <style>
      .cyber-ui { padding: 15px; display: flex; flex-direction: column; gap: 15px; }
      
      /* Search */
      .search-bar { display: flex; align-items: center; background: #111; border: 1px solid #333; padding: 10px; border-radius: 4px; }
      .search-bar input { background: transparent; border: none; color: #fff; width: 100%; margin-left: 10px; outline: none; font-family: var(--font-body); }
      
      /* Status Grid */
      .status-panel { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
      .status-item { background: var(--panel); border: var(--panel-border); padding: 10px; text-align: center; border-radius: 4px; }
      .status-item .label { font-size: 0.6rem; color: var(--text-dim); margin-bottom: 5px; }
      .status-item .value { font-family: var(--font-head); font-weight: 700; font-size: 1.1rem; color: #fff; }
      .clickable { cursor: pointer; text-decoration: underline; text-decoration-style: dotted; }

      /* Panels */
      .panel { background: var(--panel); border: var(--panel-border); padding: 15px; border-radius: 6px; }
      .panel-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #222; padding-bottom: 10px; margin-bottom: 10px; }
      .panel h3 { margin: 0; font-size: 1rem; color: var(--accent); font-family: var(--font-head); }
      
      .badge-offline { background: #222; color: #555; padding: 2px 6px; font-size: 0.7rem; border-radius: 2px; border: 1px solid #333; }

      /* Real Diagnostics Grid */
      .diag-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .diag-box { background: #050505; border: 1px solid #222; padding: 10px; display: flex; justify-content: space-between; align-items: center; }
      .diag-box span { font-size: 0.7rem; color: #777; }
      .diag-box strong { color: #444; font-family: monospace; }
      
      .warning-text { font-size: 0.7rem; color: #444; margin-top: 10px; font-style: italic; }

      /* Buttons */
      .quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .btn-cyber { background: var(--accent); color: #000; border: none; padding: 12px; font-weight: bold; font-family: var(--font-head); cursor: pointer; clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); }
      .btn-cyber-outline { background: transparent; color: var(--accent); border: 1px solid var(--accent); padding: 12px; font-weight: bold; font-family: var(--font-head); cursor: pointer; }

      /* Modal */
      .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px); }
      .hidden { display: none; }
      .modal-content { background: #111; border: 1px solid var(--accent); padding: 20px; width: 90%; max-width: 400px; box-shadow: 0 0 30px rgba(0, 243, 255, 0.1); }
      .modal-content h3 { color: var(--accent); margin-top: 0; border-bottom: 1px solid #333; padding-bottom: 10px; }
      
      .cyber-input { width: 100%; background: #050505; border: 1px solid #333; color: #fff; padding: 10px; margin-bottom: 15px; margin-top: 5px; font-family: monospace; }
      .cyber-input:focus { border-color: var(--accent); outline: none; }
      
      .modal-actions { display: flex; gap: 10px; margin-top: 10px; }
      .btn-confirm { flex: 1; background: var(--accent); border: none; padding: 10px; font-weight: bold; cursor: pointer; }
      .btn-cancel { flex: 1; background: #333; color: #fff; border: none; padding: 10px; cursor: pointer; }
    </style>
  `;

  // 2. INICIALIZACE LOGIKY (Funkce)
  initLogic();
}

function initLogic() {
  
  // Kontrola připojení (Skutečná)
  const updateOnlineStatus = () => {
    const el = document.getElementById('net-status');
    if(navigator.onLine) {
      el.innerText = "LTE / ONLINE";
      el.style.color = "var(--accent)";
    } else {
      el.innerText = "OFFLINE";
      el.style.color = "var(--danger)";
    }
  };
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  // Editace MTH
  window.editMth = async () => {
    const newVal = prompt("Nastavit aktuální stav MTH:", currentMth);
    if(newVal && !isNaN(newVal)) {
      currentMth = parseFloat(newVal);
      document.getElementById('val-mth').innerText = currentMth.toFixed(1);
      await db.setSetting('machine_mth', currentMth); // Uložit do DB
    }
  };

  // Modální okno
  window.openServiceModal = () => {
    document.getElementById('serviceModal').classList.remove('hidden');
    // Předvyplnit aktuální datum a MTH
    document.getElementById('s-date').valueAsDate = new Date();
    document.getElementById('s-mth').value = currentMth;
  };
  
  window.closeModal = () => {
    document.getElementById('serviceModal').classList.add('hidden');
  };

  // Uložení servisu
  window.saveService = async (e) => {
    e.preventDefault();
    const record = {
      machineId: 'XROT95',
      date: document.getElementById('s-date').value,
      mth: document.getElementById('s-mth').value,
      type: document.getElementById('s-type').value,
      desc: document.getElementById('s-desc').value,
      timestamp: Date.now()
    };
    
    await db.addService(record);
    window.closeModal();
    alert("Záznam uložen do servisní knihy.");
    loadLastService();
  };

  // Načtení posledního servisu
  async function loadLastService() {
    const logs = await db.getServicesByMachine('XROT95');
    const el = document.getElementById('last-service-info');
    if(logs.length > 0) {
      const last = logs[0];
      el.innerHTML = `
        <div style="border-left: 2px solid var(--accent); padding-left: 10px;">
          <div style="color:#fff; font-weight:bold;">${last.type}</div>
          <div style="font-size:0.8rem;">${last.date} | ${last.mth} Mth</div>
          <div style="color:#666;">${last.desc}</div>
        </div>
      `;
    } else {
      el.innerText = "Žádná historie servisů.";
    }
  }
  loadLastService();

  // Vyhledávání (Dummy implementation for visuals, expandable)
  window.handleSearch = (input) => {
    // Zde by byla logika filtrace
    console.log("Searching: " + input.value);
  };

  // Export Dat
  window.exportData = async () => {
    const data = await db.exportDB();
    const blob = new Blob([JSON.stringify(data, null, 2)], {type : 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `XROT_BACKUP_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };
}
