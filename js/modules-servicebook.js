/* ============================================================
   SERVICE BOOK MODULE (GENERIC)
   Verze: 2.0 (Fixed Init Export)
============================================================ */
import { db } from '../db/db.js';

let currentMachineId = null;

// TOTO BYLO CHYBNĚ - NYNÍ OPRAVENO:
export async function init(machineId, container) {
  currentMachineId = machineId;
  container.innerHTML = `
    <div style="padding:20px;">
      <h2 style="color:#fff; margin-top:0;">Servisní Kniha</h2>
      <div id="sb-list">Načítání...</div>
      <button onclick="window.sbAdd()" style="position:fixed; bottom:20px; right:20px; width:50px; height:50px; border-radius:25px; background:var(--accent); border:none; font-size:24px; color:#000; box-shadow:0 4px 15px rgba(0,0,0,0.5);">+</button>
    </div>
  `;
  refreshList();

  window.sbAdd = async () => {
    const desc = prompt("Popis úkonu:");
    if(desc) {
      await db.addService({
        machineId: currentMachineId,
        date: new Date().toISOString(),
        type: "Záznam",
        desc: desc
      });
      refreshList();
    }
  }
}

async function refreshList() {
  const logs = await db.getServicesByMachine(currentMachineId);
  const el = document.getElementById('sb-list');
  
  if(logs.length === 0) {
    el.innerHTML = '<p style="color:#666;">Žádné záznamy.</p>';
    return;
  }

  el.innerHTML = logs.map(l => `
    <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px; margin-bottom:10px; border-left:3px solid var(--accent);">
      <div style="font-weight:bold; color:#fff;">${l.type}</div>
      <div style="font-size:0.8rem; color:#888;">${new Date(l.date).toLocaleDateString()}</div>
      <div style="margin-top:5px; color:#ccc;">${l.desc}</div>
    </div>
  `).join('');
}
