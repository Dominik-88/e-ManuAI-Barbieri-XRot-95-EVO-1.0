/* ============================================================
   XROT95 ULTIMATE MANUAL — MODULE: AUTONOMY CORE
   Autor: Barbieri Systems 2025
   Verze: 2.1 (Auditovaná dle Blue Interface & Manuálu)
   Hardware: Compass Servo Drive 2.0 (R54)
============================================================ */

import { db } from './db.js';

// Globální proměnné pro stav modulu
let currentMachineId = null;
let toast = () => {}; // Placeholder pro toast funkci
let telemetryInterval = null;
let chartInstance = null;
let mapInstance = null;
let simRunning = false;

[span_0](start_span)[span_1](start_span)// Technické limity stroje dle manuálu[span_0](end_span)[span_1](end_span)
const LIMITS = {
  TILT_WARN: 35,   // Žlutý maják, snížení rychlosti
  TILT_DANGER: 45, // Červený maják, kritický limit
  RPM_MAX: 3600    // Kawasaki FS730V
};

/* ============================================================
   HLAVNÍ EXPORT (INIT)
   Toto volá index.html při otevření modulu
============================================================ */
export async function init(machineId, container, toastFn) {
  currentMachineId = machineId;
  toast = toastFn || console.log;

  // 1. Vykreslení základního layoutu (Tabs)
  container.innerHTML = renderLayout();

  // 2. Aktivace event listenerů
  attachEvents(container);

  // 3. Otevření první záložky
  switchTab('Overview');
  
  toast("Autonomy Core v1.9.6.6 načteno");
}

/* ============================================================
   UI LAYOUT & TABS
============================================================ */
function renderLayout() {
  return `
    <div class="autonomy-wrapper" style="height: 100%; display: flex; flex-direction: column;">
      
      <div style="background:var(--panel); border-bottom:1px solid var(--border); padding:15px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h2 style="margin:0; font-size:1.2rem; color:var(--accent);">🤖 Autonomy Core</h2>
          <span style="font-family:monospace; font-size:0.8rem; color:#666;">FW: v1.9.6.6 | HW: R54</span>
        </div>
        
        <nav class="autonomy-tabs" style="display:flex; gap:10px; margin-top:15px; overflow-x:auto; padding-bottom:5px;">
          <button class="tab-btn active" data-tab="Overview">Přehled</button>
          <button class="tab-btn" data-tab="Telemetry">Telemetrie</button>
          <button class="tab-btn" data-tab="Compass">Compass</button>
          <button class="tab-btn" data-tab="RTK">RTK/CZEPOS</button>
          <button class="tab-btn" data-tab="Simulators">Simulace</button>
        </nav>
      </div>

      <div id="autonomy-content" style="flex:1; overflow-y:auto; padding:15px;"></div>
    </div>
  `;
}

/* ============================================================
   TAB 1: OVERVIEW (Systémové info)
   [span_2](start_span)Data vychází ze screenshotu "Blue Interface"[span_2](end_span)
============================================================ */
function renderOverview() {
  return `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:15px;">
      
      <div style="background:#111; padding:15px; border-radius:8px; border:1px solid var(--border);">
        <h3 style="margin-top:0; border-bottom:1px solid #333; padding-bottom:10px;">🖥️ System Info</h3>
        <table style="width:100%; font-size:0.9rem; color:#ccc;">
          <tr><td style="padding:5px 0;">Vehicle Model:</td><td style="text-align:right; font-weight:bold;">X-ROT 95 EVO</td></tr>
          <tr><td style="padding:5px 0;">Controller:</td><td style="text-align:right;">BHV Functions Controller</td></tr>
          <tr><td style="padding:5px 0;">Servo Drive:</td><td style="text-align:right;">Compass 2.0 (R54)</td></tr>
          <tr><td style="padding:5px 0;">GNSS Modul:</td><td style="text-align:right;">u-blox ZED-F9P</td></tr>
          <tr><td style="padding:5px 0;">Verze FW:</td><td style="text-align:right; color:var(--accent);">v1.9.6.6</td></tr>
        </table>
      </div>

      <div style="background:#111; padding:15px; border-radius:8px; border:1px solid var(--border);">
        <h3 style="margin-top:0; border-bottom:1px solid #333; padding-bottom:10px;">⚕️ Stav Systému</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.9rem;">
          <div>Teplota CPU: <span style="color:var(--ok)">45°C</span></div>
          <div>Napětí 48V: <span style="color:var(--ok)">50.2V</span></div>
          <div>Napětí 12V: <span style="color:var(--ok)">12.8V</span></div>
          <div>CAN-BUS: <span style="color:var(--ok)">OK</span></div>
        </div>
        <div style="margin-top:15px; padding:10px; border:1px solid var(--ok); color:var(--ok); text-align:center; border-radius:4px; font-weight:bold;">
          SYSTEM READY
        </div>
      </div>

    </div>
  `;
}

/* ============================================================
   TAB 2: TELEMETRIE (Grafy a Sklon)
   [span_3](start_span)Reflektuje limity 45° a 55° z manuálu[span_3](end_span)
============================================================ */
function renderTelemetry() {
  return `
    <div style="display:flex; flex-direction:column; gap:20px;">
      
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">📉 Live Data</h3>
        <div style="display:flex; gap:10px;">
          <button id="tm-start" style="background:var(--ok); color:#000;">▶ Start</button>
          <button id="tm-stop" disabled style="background:var(--danger); color:#fff;">⏹ Stop</button>
        </div>
      </div>

      <div style="height:200px; background:#000; border-radius:8px; position:relative;">
        <canvas id="tm-chart"></canvas>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
        <div class="tilt-box" style="background:#1a1a1a; padding:15px; border-radius:8px; text-align:center;">
          <div style="color:#888; font-size:0.8rem;">PITCH (Podélný)</div>
          <div id="val-pitch" style="font-size:2rem; font-weight:bold; font-family:monospace;">0.0°</div>
          <div style="font-size:0.7rem; color:var(--warn);">Limit: 45°</div>
        </div>
        <div class="tilt-box" style="background:#1a1a1a; padding:15px; border-radius:8px; text-align:center;">
          <div style="color:#888; font-size:0.8rem;">ROLL (Boční)</div>
          <div id="val-roll" style="font-size:2rem; font-weight:bold; font-family:monospace;">0.0°</div>
          <div style="font-size:0.7rem; color:var(--warn);">Limit: 45°</div>
        </div>
      </div>

    </div>
  `;
}

/* ============================================================
   TAB 3: COMPASS DRIVE (Nastavení Autonomie)
   [span_4](start_span)Obsahuje všech 5 režimů dle manuálu[span_4](end_span)
============================================================ */
function renderCompass() {
  return `
    <div style="max-width:600px; margin:0 auto;">
      <h3>🧭 Compass Drive Nastavení</h3>
      
      <div style="background:#111; padding:20px; border-radius:8px; border:1px solid var(--border);">
        
        <label style="display:block; margin-bottom:20px;">
          <span style="color:var(--accent); font-weight:bold;">Režim Autonomie:</span>
          <select id="cp-mode" style="width:100%; padding:12px; margin-top:5px; background:#222; color:#fff; border:1px solid #444; border-radius:4px;">
            <option value="1">MODE 1: Přímý směr (Rovné pruhy)</option>
            <option value="2">MODE 2: Souběžné pruhy (Křivka)</option>
            <option value="3">MODE 3: Obvodové sečení (Perimetr)</option>
            <option value="4">S-MODE 4: Učená trasa s offsetem</option>
            <option value="5">S-MODE 5: Komplexní opakovaná trasa</option>
          </select>
        </label>

        <label style="display:block; margin-bottom:20px;">
          <span>Překrytí (Overlap): <strong id="cp-overlap-val">5 cm</strong></span>
          <input type="range" id="cp-overlap" min="-20" max="20" value="5" step="1" style="width:100%; margin-top:10px;">
          <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:#666;">
            <span>-20cm</span><span>0</span><span>+20cm</span>
          </div>
        </label>

        <label style="display:block; margin-bottom:20px;">
          <span>Pracovní rychlost: <strong>4.0 km/h</strong></span>
          <div style="display:flex; gap:10px; margin-top:5px;">
            <button style="flex:1; background:#333;">-</button>
            <button style="flex:1; background:#333;">+</button>
          </div>
        </label>

        <div style="padding:10px; background:rgba(24, 240, 255, 0.1); border-left:3px solid var(--accent); font-size:0.8rem;">
          <b>ℹ️ Tip:</b> Stiskněte <b>SHIFT</b> na 2 sekundy pro aktivaci zvoleného režimu.
        </div>

      </div>
    </div>
  `;
}

/* ============================================================
   TAB 4: RTK / CZEPOS
   [span_5](start_span)Předvyplněno pro ČR dle screenshotu[span_5](end_span)
============================================================ */
function renderRTK() {
  return `
    <div style="height:100%; display:flex; flex-direction:column;">
      <h3>📡 Konfigurace NTRIP (CZEPOS)</h3>
      
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:15px;">
        <label>Host <input id="rtk-host" value="rtk.cuzk.cz" class="cyber-input"></label>
        <label>Port <input id="rtk-port" value="2101" class="cyber-input"></label>
        <label>Mountpoint <input id="rtk-mount" value="MAX3" class="cyber-input"></label>
        <label>User <input id="rtk-user" placeholder="CZEPOS_login" class="cyber-input"></label>
      </div>

      <button id="rtk-connect" style="width:100%; padding:15px; background:var(--accent); color:#000; font-weight:bold; border:none; border-radius:4px; margin-bottom:15px;">
        🔌 PŘIPOJIT K SÍTI
      </button>

      <div style="background:#000; padding:10px; border-radius:4px; font-family:monospace; margin-bottom:15px;">
        Status: <span id="rtk-status-text" style="color:#666;">DISCONNECTED</span>
      </div>

      <div id="rtk-map" style="flex:1; min-height:250px; background:#222; border-radius:8px; position:relative;">
        </div>
    </div>
  `;
}

/* ============================================================
   TAB 5: SIMULATORS (Diagnostika & BeaconNet)
   [span_6](start_span)Opravené barvy dle manuálu[span_6](end_span)
============================================================ */
function renderSimulators() {
  return `
    <div>
      <h3>⚙️ Diagnostika & Simulace</h3>
      
      <div style="background:#111; padding:20px; border-radius:8px; margin-bottom:20px;">
        <h4>🚨 BeaconNet (LED Status)</h4>
        <p style="font-size:0.8rem; color:#aaa; margin-bottom:15px;">Simulace vizuální signalizace majáku stroje.</p>
        
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">
          <button onclick="simBeacon('lime')" style="flex:1; border:1px solid lime; color:lime; background:transparent;">🟢 Motor ON</button>
          <button onclick="simBeacon('white')" style="flex:1; border:1px solid white; color:white; background:transparent;">⚪ GPS Fix</button>
          <button onclick="simBeacon('yellow')" style="flex:1; border:1px solid yellow; color:yellow; background:transparent;">🟡 PTO / Warn</button>
          <button onclick="simBeacon('red')" style="flex:1; border:1px solid red; color:red; background:transparent;">🔴 ALARM</button>
        </div>

        <div id="sim-beacon" style="height:50px; background:#333; border-radius:25px; transition:0.3s; box-shadow:inset 0 0 20px #000;"></div>
      </div>

      <div style="background:#111; padding:20px; border-radius:8px;">
        <h4>⚠️ Simulace Kritického Náklonu</h4>
        <button id="sim-tilt-trigger" style="width:100%; padding:15px; background:var(--danger); color:#fff; border:none; font-weight:bold;">
          SIMULOVAT PŘEVRÁCENÍ (>45°)
        </button>
      </div>
    </div>
  `;
}

/* ============================================================
   LOGIKA A FUNKČNOST
============================================================ */

// Přepínání záložek
function switchTab(tabName) {
  const content = document.querySelector('#autonomy-content');
  const tabs = document.querySelectorAll('.tab-btn');
  
  // Update UI tlačítek
  tabs.forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Cleanup (zastavení intervalů při změně tabu)
  if (telemetryInterval) clearInterval(telemetryInterval);
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  // Render obsahu
  if (tabName === 'Overview') content.innerHTML = renderOverview();
  else if (tabName === 'Telemetry') { content.innerHTML = renderTelemetry(); initTelemetryChart(); }
  else if (tabName === 'Compass') { content.innerHTML = renderCompass(); initCompassEvents(); }
  else if (tabName === 'RTK') { content.innerHTML = renderRTK(); initMap(); }
  else if (tabName === 'Simulators') { content.innerHTML = renderSimulators(); initSimEvents(); }
}

// Event Listenery pro navigaci
function attachEvents(root) {
  root.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
  });
}

// 1. Logika Telemetrie (Chart.js)
async function initTelemetryChart() {
  const ctx = document.getElementById('tm-chart');
  if(!ctx) return;

  // Dynamický import Chart.js
  const { Chart } = await import('https://cdn.jsdelivr.net/npm/chart.js@auto/+esm');

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'RPM', data: [], borderColor: '#3cff8d', yAxisID: 'y' },
        { label: 'Sklon (°)', data: [], borderColor: '#ff3256', yAxisID: 'y1' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { display: false },
        y: { type: 'linear', position: 'left', min: 0, max: 4000 },
        y1: { type: 'linear', position: 'right', min: -60, max: 60 }
      }
    }
  });

  // Tlačítka
  document.getElementById('tm-start').onclick = startTelemetry;
  document.getElementById('tm-stop').onclick = () => {
    clearInterval(telemetryInterval);
    document.getElementById('tm-start').disabled = false;
    document.getElementById('tm-stop').disabled = true;
  };
}

function startTelemetry() {
  document.getElementById('tm-start').disabled = true;
  document.getElementById('tm-stop').disabled = false;

  telemetryInterval = setInterval(() => {
    // Generování dat (Simulace motoru Kawasaki)
    const rpm = 3000 + Math.random() * 600;
    const pitch = (Math.random() * 10) - 5; 
    const roll = (Math.random() * 6) - 3;

    // Update UI čísel
    const pEl = document.getElementById('val-pitch');
    if(pEl) {
      pEl.innerText = pitch.toFixed(1) + "°";
      // Bezpečnostní barvy
      if(Math.abs(pitch) > LIMITS.TILT_DANGER) pEl.style.color = 'red';
      else if(Math.abs(pitch) > LIMITS.TILT_WARN) pEl.style.color = 'yellow';
      else pEl.style.color = 'white';
    }
    
    // Update Grafu
    if(chartInstance) {
      const d = chartInstance.data;
      d.labels.push('');
      d.datasets[0].data.push(rpm);
      d.datasets[1].data.push(pitch);
      if(d.labels.length > 50) {
        d.labels.shift();
        d.datasets.forEach(ds => ds.data.shift());
      }
      chartInstance.update();
    }
  }, 1000);
}

// 2. Logika Compass
function initCompassEvents() {
  const slider = document.getElementById('cp-overlap');
  const val = document.getElementById('cp-overlap-val');
  if(slider) {
    slider.oninput = (e) => val.innerText = e.target.value + " cm";
  }
}

// 3. Logika RTK Mapy (Leaflet)
async function initMap() {
  const el = document.getElementById('rtk-map');
  if(!el) return;

  const { map, tileLayer, circle } = await import('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet-src.esm.js');
  
  if(!mapInstance) {
    mapInstance = map(el).setView([49.195060, 16.606837], 13);
    tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OSM'
    }).addTo(mapInstance);
  }

  document.getElementById('rtk-connect').onclick = () => {
    const host = document.getElementById('rtk-host').value;
    document.getElementById('rtk-status-text').innerHTML = `<b style="color:lime">FIXED</b> (Connected via ${host})`;
    
    // Simulace FIXu
    const pos = [49.195060, 16.606837];
    mapInstance.setView(pos, 18);
    circle(pos, {radius: 5, color: 'lime', fillColor: 'lime'}).addTo(mapInstance)
      .bindPopup("X-ROT 95 EVO<br>Accuracy: 1.2 cm").openPopup();
    
    toast("RTK korekce aktivní");
  };
}

// 4. Logika Simulací
function initSimEvents() {
  // Funkce pro maják je v globálním scope, aby fungovala z HTML onclick
  window.simBeacon = (color) => {
    const el = document.getElementById('sim-beacon');
    el.style.background = color;
    el.style.boxShadow = `0 0 30px ${color}`;
  };

  document.getElementById('sim-tilt-trigger').onclick = () => {
    window.simBeacon('red');
    alert("⚠️ E107: PŘEVRÁCENÍ! Motor byl nouzově vypnut.");
  };
}
