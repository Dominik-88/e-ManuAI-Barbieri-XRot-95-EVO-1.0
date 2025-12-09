/* ============================================================
   XROT95 ULTIMATE MANUAL — MODULE: AUTONOMY CORE
   Autor: Barbieri Systems 2025
   Verze: 2.2 (Fix Import/Export)
============================================================ */

import { db } from './db.js';

// --- STAV ---
let chartInstance = null;
let telemetryInterval = null;
const LIMITS = { TILT_DANGER: 45, TILT_WARN: 35 };

/* ============================================================
   HLAVNÍ EXPORT (INIT)
   Toto je funkce, kterou volá index.html
============================================================ */
export async function init(machineId, container, toastFn) {
  // 1. Render Layout
  container.innerHTML = `
    <div class="autonomy-ui">
      <div style="display:flex; gap:10px; overflow-x:auto; border-bottom:1px solid #333; padding-bottom:10px; margin-bottom:15px;">
        <button class="tab-btn active" onclick="window.switchTab('Overview')">Přehled</button>
        <button class="tab-btn" onclick="window.switchTab('Telemetry')">Telemetrie</button>
        <button class="tab-btn" onclick="window.switchTab('Compass')">Compass</button>
        <button class="tab-btn" onclick="window.switchTab('RTK')">RTK</button>
      </div>
      <div id="tab-content"></div>
    </div>
  `;

  // 2. Global Helper for Tabs
  window.switchTab = (tab) => {
    const content = document.getElementById('tab-content');
    if(telemetryInterval) clearInterval(telemetryInterval); // Stop old processes
    
    // Highlight buttons
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.style.background = b.innerText.includes(tab) ? 'var(--accent)' : '#222';
        b.style.color = b.innerText.includes(tab) ? '#000' : '#fff';
    });

    if (tab === 'Overview') content.innerHTML = renderOverview();
    if (tab === 'Telemetry') renderTelemetry(content);
    if (tab === 'Compass') content.innerHTML = renderCompass();
    if (tab === 'RTK') content.innerHTML = renderRTK();
  };

  // 3. Start Default Tab
  window.switchTab('Overview');
}

/* ============================================================
   RENDERERY
============================================================ */

function renderOverview() {
  return `
    <div style="background:#111; padding:15px; border-radius:8px;">
      <h3>🖥️ System Info (R54)</h3>
      <ul style="color:#ccc; line-height:1.8;">
        <li><b>Model:</b> X-ROT 95 EVO</li>
        <li><b>Firmware:</b> v1.9.6.6</li>
        <li><b>GNSS:</b> u-blox ZED-F9P</li>
        <li><b>Status:</b> <span style="color:lime">ONLINE</span></li>
      </ul>
    </div>
  `;
}

function renderTelemetry(container) {
  container.innerHTML = `
    <h3>📉 Live Data</h3>
    <div style="display:flex; gap:10px; margin-bottom:15px;">
      <button id="tm-start" style="background:#22c55e; border:none; padding:10px; border-radius:4px;">▶ Start</button>
      <button id="tm-stop" style="background:#ef4444; color:#fff; border:none; padding:10px; border-radius:4px;">⏹ Stop</button>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
      <div style="background:#222; padding:10px; text-align:center; border-radius:8px;">
        <small>PITCH</small><br><b id="val-pitch" style="font-size:1.5rem">0°</b>
      </div>
      <div style="background:#222; padding:10px; text-align:center; border-radius:8px;">
        <small>ROLL</small><br><b id="val-roll" style="font-size:1.5rem">0°</b>
      </div>
    </div>
    <div style="height:200px;"><canvas id="tm-chart"></canvas></div>
  `;

  setTimeout(initChart, 100);
}

function renderCompass() {
  return `
    <h3>🧭 Compass Drive</h3>
    <label>Režim: 
      <select style="width:100%; padding:10px; margin-top:5px; background:#222; color:#fff; border:1px solid #444;">
        <option>MODE 1: Přímý směr</option>
        <option>MODE 2: Křivka</option>
        <option>MODE 3: Perimetr</option>
        <option>S-MODE 4: Offset</option>
        <option>S-MODE 5: Komplexní</option>
      </select>
    </label>
  `;
}

function renderRTK() {
  return `
    <h3>📡 RTK (CZEPOS)</h3>
    <div style="background:#111; padding:15px;">
      <p>Host: <b>rtk.cuzk.cz</b></p>
      <p>Port: <b>2101</b></p>
      <p>Mount: <b>MAX3</b></p>
      <button style="width:100%; padding:15px; background:var(--accent); border:none; font-weight:bold;">PŘIPOJIT</button>
    </div>
  `;
}

/* ============================================================
   LOGIKA GRAFU
============================================================ */
async function initChart() {
  const ctx = document.getElementById('tm-chart');
  if(!ctx) return;
  
  // Načtení Chart.js dynamicky
  const { Chart } = await import('https://cdn.jsdelivr.net/npm/chart.js@auto/+esm');
  
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { 
      labels: [], 
      datasets: [{ label: 'Náklon', data: [], borderColor: '#ff3256' }] 
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  document.getElementById('tm-start').onclick = () => {
    telemetryInterval = setInterval(() => {
      const pitch = (Math.random() * 10) - 5;
      const el = document.getElementById('val-pitch');
      if(el) {
        el.innerText = pitch.toFixed(1) + '°';
        if(Math.abs(pitch) > 45) el.style.color = 'red';
        else el.style.color = 'white';
        
        chartInstance.data.labels.push('');
        chartInstance.data.datasets[0].data.push(pitch);
        if(chartInstance.data.labels.length > 20) {
            chartInstance.data.labels.shift();
            chartInstance.data.datasets[0].data.shift();
        }
        chartInstance.update('none');
      }
    }, 500);
  };

  document.getElementById('tm-stop').onclick = () => clearInterval(telemetryInterval);
}
