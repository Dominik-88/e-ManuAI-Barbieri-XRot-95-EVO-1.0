/* ============================================================
   XROT95 ULTIMATE MANUAL — MODULE: AUTONOMY CORE
   Autor: Barbieri Systems 2025
   Verze: 3.0 (Clean Build)
============================================================ */

import { db } from './db.js';

// --- STAV A KONSTANTY ---
let chartInstance = null;
let telemetryInterval = null;
let mapInstance = null;
const LIMITS = { TILT_DANGER: 45, TILT_WARN: 35 };

/* ============================================================
   HLAVNÍ EXPORT (INIT)
============================================================ */
export async function init(id, container, toastFn) {
  // 1. Render Layout (Základní kostra)
  container.innerHTML = `
    <div style="height: 100%; display: flex; flex-direction: column;">
      
      <div style="background:#111; border-bottom:1px solid #333; padding:15px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h2 style="margin:0; font-size:1.1rem; color:#18f0ff;">🤖 Autonomy Core</h2>
          <span style="font-family:monospace; font-size:0.8rem; color:#666;">FW: v1.9.6</span>
        </div>
        
        <nav id="auto-tabs" style="display:flex; gap:10px; margin-top:15px; overflow-x:auto;">
          <button class="tab-btn" onclick="window.xrotTab('Overview')">Přehled</button>
          <button class="tab-btn" onclick="window.xrotTab('Telemetry')">Data</button>
          <button class="tab-btn" onclick="window.xrotTab('Compass')">Compass</button>
          <button class="tab-btn" onclick="window.xrotTab('RTK')">RTK</button>
        </nav>
      </div>

      <div id="tab-content" style="flex:1; overflow-y:auto; padding:15px;"></div>
    </div>
    
    <style>
      .tab-btn { flex:1; background:#222; color:#fff; border:none; padding:10px; border-radius:4px; font-size:0.9rem; min-width:80px; }
      .tab-btn.active { background:#18f0ff; color:#000; font-weight:bold; }
    </style>
  `;

  // 2. Globální funkce pro přepínání tabů (aby fungovala v HTML onclick)
  window.xrotTab = (tab) => {
    const content = document.getElementById('tab-content');
    
    // Cleanup
    if(telemetryInterval) clearInterval(telemetryInterval);
    if(chartInstance) { chartInstance.destroy(); chartInstance = null; }

    // UI Update
    document.querySelectorAll('.tab-btn').forEach(b => {
        if(b.innerText.includes(tab === 'Telemetry' ? 'Data' : (tab === 'Overview' ? 'Přehled' : tab))) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });

    // Render Logic
    if (tab === 'Overview') content.innerHTML = getOverviewHTML();
    if (tab === 'Telemetry') { content.innerHTML = getTelemetryHTML(); startChart(); }
    if (tab === 'Compass') content.innerHTML = getCompassHTML();
    if (tab === 'RTK') { content.innerHTML = getRTKHTML(); startMap(); }
  };

  // 3. Spustit výchozí tab
  window.xrotTab('Overview');
  if(toastFn) toastFn("Modul načten");
}

/* ============================================================
   HTML ŠABLONY
============================================================ */

function getOverviewHTML() {
  return `
    <div style="background:#111; padding:15px; border-radius:8px; border:1px solid #333;">
      <h3>🖥️ System Info (R54)</h3>
      <ul style="color:#ccc; line-height:1.8; list-style:none; padding:0;">
        <li><b>Model:</b> X-ROT 95 EVO</li>
        <li><b>Jednotka:</b> Compass Servo Drive 2.0</li>
        <li><b>GNSS:</b> u-blox ZED-F9P</li>
        <li><b>Status:</b> <span style="color:#3cff8d">SYSTEM READY</span></li>
      </ul>
      <div style="margin-top:20px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div style="background:#222; padding:10px; border-radius:4px;">Temp: 45°C</div>
        <div style="background:#222; padding:10px; border-radius:4px;">Bat: 50.2V</div>
      </div>
    </div>
  `;
}

function getTelemetryHTML() {
  return `
    <h3>📉 Live Telemetrie</h3>
    <div style="margin-bottom:20px;">
      <button onclick="window.toggleSim(true)" style="background:#3cff8d; border:none; padding:10px 20px; border-radius:4px;">▶ Start</button>
      <button onclick="window.toggleSim(false)" style="background:#ff3256; color:#fff; border:none; padding:10px 20px; border-radius:4px;">⏹ Stop</button>
    </div>
    
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
      <div style="background:#1a1a1a; padding:15px; text-align:center; border-radius:8px;">
        <div style="color:#888; font-size:0.8rem;">PITCH</div>
        <div id="val-pitch" style="font-size:2rem; font-weight:bold;">0°</div>
      </div>
      <div style="background:#1a1a1a; padding:15px; text-align:center; border-radius:8px;">
        <div style="color:#888; font-size:0.8rem;">ROLL</div>
        <div id="val-roll" style="font-size:2rem; font-weight:bold;">0°</div>
      </div>
    </div>

    <div style="height:250px;"><canvas id="tm-chart"></canvas></div>
  `;
}

function getCompassHTML() {
  return `
    <h3>🧭 Compass Drive</h3>
    <div style="background:#111; padding:20px; border-radius:8px;">
      <label style="display:block; margin-bottom:15px;">Režim Autonomie:
        <select style="width:100%; padding:12px; margin-top:5px; background:#222; color:#fff; border:1px solid #444; border-radius:4px;">
          <option>MODE 1: Přímý směr</option>
          <option>MODE 2: Křivka</option>
          <option>MODE 3: Perimetr</option>
          <option>S-MODE 4: Offset</option>
          <option>S-MODE 5: Komplexní</option>
        </select>
      </label>
      <div style="padding:10px; background:rgba(24, 240, 255, 0.1); border-left:3px solid #18f0ff; font-size:0.8rem;">
        Stiskněte <b>SHIFT</b> na 2 sekundy pro aktivaci.
      </div>
    </div>
  `;
}

function getRTKHTML() {
  return `
    <h3>📡 RTK (CZEPOS)</h3>
    <div style="background:#111; padding:15px; border-radius:8px; margin-bottom:15px;">
      <div style="margin-bottom:10px;">Host: <b style="color:#fff">rtk.cuzk.cz</b></div>
      <div style="margin-bottom:10px;">Port: <b style="color:#fff">2101</b></div>
      <div style="margin-bottom:10px;">Mount: <b style="color:#fff">MAX3</b></div>
      <button style="width:100%; padding:15px; background:#18f0ff; font-weight:bold; border:none; border-radius:4px;">PŘIPOJIT</button>
    </div>
    <div id="rtk-map" style="height:300px; background:#222; border-radius:8px;"></div>
  `;
}

/* ============================================================
   LOGIKA FUNKCÍ
============================================================ */

async function startChart() {
  const ctx = document.getElementById('tm-chart');
  if(!ctx) return;

  // Import Chart.js bezpečně
  try {
    const { Chart } = await import('https://cdn.jsdelivr.net/npm/chart.js@auto/+esm');
    
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{ label: 'Náklon (°)', data: [], borderColor: '#ff3256', tension: 0.4 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: { y: { min: -60, max: 60 } }
      }
    });

    window.toggleSim = (state) => {
      if(state) {
        if(telemetryInterval) return;
        telemetryInterval = setInterval(() => {
          const pitch = (Math.random() * 10) - 5;
          const roll = (Math.random() * 6) - 3;
          
          document.getElementById('val-pitch').innerText = pitch.toFixed(1) + '°';
          document.getElementById('val-roll').innerText = roll.toFixed(1) + '°';
          
          if(chartInstance) {
            chartInstance.data.labels.push('');
            chartInstance.data.datasets[0].data.push(pitch);
            if(chartInstance.data.labels.length > 30) {
              chartInstance.data.labels.shift();
              chartInstance.data.datasets[0].data.shift();
            }
            chartInstance.update();
          }
        }, 800);
      } else {
        clearInterval(telemetryInterval);
        telemetryInterval = null;
      }
    };

  } catch(e) {
    ctx.parentElement.innerHTML = '<p style="color:red">Chyba grafu. Jste online?</p>';
  }
}

async function startMap() {
  const el = document.getElementById('rtk-map');
  if(!el) return;
  
  try {
    const { map, tileLayer, circle } = await import('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet-src.esm.js');
    
    if(!mapInstance) {
      mapInstance = map(el).setView([49.195, 16.606], 13);
      tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: 'OSM'
      }).addTo(mapInstance);
      
      circle([49.195, 16.606], {radius: 50, color: 'lime'}).addTo(mapInstance)
        .bindPopup("X-ROT 95 EVO").openPopup();
    }
  } catch(e) {
    el.innerHTML = '<p style="color:red; padding:20px;">Mapa vyžaduje internet.</p>';
  }
}
