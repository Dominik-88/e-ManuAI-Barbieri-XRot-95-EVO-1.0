/* ============================================================
   XROT95 ULTIMATE MANUAL — MODULE: AUTONOMY CORE
   Autor: Barbieri Systems 2025
   Verze: 3.1 (Clean & Fix)
============================================================ */

import { db } from './db.js';

// --- STAV A PROMĚNNÉ ---
let telemetryInterval = null;
let chartInstance = null;
let mapInstance = null;

/* ============================================================
   HLAVNÍ EXPORT (INIT)
============================================================ */
export async function init(machineId, container, toastFn) {
  // 1. Render Základního Layoutu
  container.innerHTML = `
    <div style="height: 100%; display: flex; flex-direction: column;">
      
      <div style="background:#111; border-bottom:1px solid #333; padding:15px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h2 style="margin:0; font-size:1.1rem; color:#18f0ff;">🤖 Autonomy Core</h2>
          <span style="font-family:monospace; font-size:0.8rem; color:#666;">FW: v1.9.6.6</span>
        </div>
        
        <div style="display:flex; gap:10px; margin-top:15px; overflow-x:auto;">
          <button class="tab-btn active" onclick="window.switchTab('Overview')">Přehled</button>
          <button class="tab-btn" onclick="window.switchTab('Telemetry')">Data</button>
          <button class="tab-btn" onclick="window.switchTab('Compass')">Compass</button>
          <button class="tab-btn" onclick="window.switchTab('RTK')">RTK</button>
        </div>
      </div>

      <div id="tab-content" style="flex:1; overflow-y:auto; padding:15px;"></div>
    </div>
    
    <style>
      .tab-btn { flex:1; background:#222; color:#fff; border:none; padding:10px; border-radius:4px; font-size:0.9rem; min-width:80px; }
      .tab-btn.active { background:#18f0ff; color:#000; font-weight:bold; }
    </style>
  `;

  // 2. Definice globální funkce pro přepínání (aby fungovala v HTML onclick)
  window.switchTab = (tab) => {
    const content = document.getElementById('tab-content');
    
    // Zastavit staré procesy
    if(telemetryInterval) clearInterval(telemetryInterval);
    
    // Aktualizace tlačítek
    document.querySelectorAll('.tab-btn').forEach(b => {
        const isActive = b.innerText.includes(tab === 'Telemetry' ? 'Data' : (tab === 'Overview' ? 'Přehled' : tab));
        b.className = isActive ? 'tab-btn active' : 'tab-btn';
    });

    // Vykreslení obsahu
    if (tab === 'Overview') content.innerHTML = renderOverview();
    if (tab === 'Telemetry') renderTelemetry(content);
    if (tab === 'Compass') content.innerHTML = renderCompass();
    if (tab === 'RTK') content.innerHTML = renderRTK();
  };

  // 3. Spustit první záložku
  window.switchTab('Overview');
  if(toastFn) toastFn("Autonomy Core Načteno");
}

/* ============================================================
   HTML ŠABLONY (RENDERY)
============================================================ */

function renderOverview() {
  return `
    <div style="background:#111; padding:15px; border-radius:8px; border:1px solid #333;">
      <h3 style="margin-top:0; color:#fff;">🖥️ System Info (R54)</h3>
      <ul style="color:#ccc; line-height:1.8; list-style:none; padding:0;">
        <li><b>Model:</b> X-ROT 95 EVO</li>
        <li><b>Jednotka:</b> Compass Servo Drive 2.0</li>
        <li><b>GNSS:</b> u-blox ZED-F9P</li>
        <li><b>Status:</b> <span style="color:#3cff8d">SYSTEM READY</span></li>
      </ul>
      <div style="margin-top:20px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div style="background:#222; padding:10px; border-radius:4px; text-align:center;">Temp: 45°C</div>
        <div style="background:#222; padding:10px; border-radius:4px; text-align:center;">Bat: 50.2V</div>
      </div>
    </div>
  `;
}

function renderTelemetry(container) {
  container.innerHTML = `
    <h3 style="margin-top:0;">📉 Live Telemetrie</h3>
    <div style="margin-bottom:20px; display:flex; gap:10px;">
      <button onclick="window.toggleSim(true)" style="flex:1; background:#3cff8d; border:none; padding:12px; border-radius:4px; font-weight:bold;">▶ Start</button>
      <button onclick="window.toggleSim(false)" style="flex:1; background:#ff3256; color:#fff; border:none; padding:12px; border-radius:4px; font-weight:bold;">⏹ Stop</button>
    </div>
    
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
      <div style="background:#1a1a1a; padding:15px; text-align:center; border-radius:8px;">
        <div style="color:#888; font-size:0.8rem;">PITCH (Sklon)</div>
        <div id="val-pitch" style="font-size:2rem; font-weight:bold; color:#fff;">0°</div>
      </div>
      <div style="background:#1a1a1a; padding:15px; text-align:center; border-radius:8px;">
        <div style="color:#888; font-size:0.8rem;">ROLL (Náklon)</div>
        <div id="val-roll" style="font-size:2rem; font-weight:bold; color:#fff;">0°</div>
      </div>
    </div>

    <div style="height:250px; background:#000; border-radius:8px; position:relative;">
        <canvas id="tm-chart"></canvas>
    </div>
  `;
  
  // Spustit graf po vykreslení HTML
  setTimeout(initChart, 100);
}

function renderCompass() {
  return `
    <h3 style="margin-top:0;">🧭 Compass Drive</h3>
    <div style="background:#111; padding:20px; border-radius:8px;">
      <label style="display:block; margin-bottom:15px; color:#ccc;">Režim Autonomie:
        <select style="width:100%; padding:12px; margin-top:8px; background:#222; color:#fff; border:1px solid #444; border-radius:4px; font-size:1rem;">
          <option>MODE 1: Přímý směr</option>
          <option>MODE 2: Křivka</option>
          <option>MODE 3: Perimetr</option>
          <option>S-MODE 4: Offset</option>
          <option>S-MODE 5: Komplexní</option>
        </select>
      </label>
      <div style="padding:15px; background:rgba(24, 240, 255, 0.1); border-left:3px solid #18f0ff; font-size:0.9rem; color:#fff;">
        ℹ️ Pro aktivaci stiskněte tlačítko <b>SHIFT</b> na ovladači po dobu 2 sekund.
      </div>
    </div>
  `;
}

function renderRTK() {
  return `
    <h3 style="margin-top:0;">📡 RTK (CZEPOS)</h3>
    <div style="background:#111; padding:15px; border-radius:8px;">
      <p style="margin:5px 0; color:#ccc;">Host: <b style="color:#fff;">rtk.cuzk.cz</b></p>
      <p style="margin:5px 0; color:#ccc;">Port: <b style="color:#fff;">2101</b></p>
      <p style="margin:5px 0; color:#ccc;">Mount: <b style="color:#fff;">MAX3</b></p>
      <button style="width:100%; padding:15px; margin-top:15px; background:#18f0ff; border:none; font-weight:bold; border-radius:4px;">🔌 PŘIPOJIT</button>
    </div>
    <div id="rtk-map" style="height:300px; background:#222; margin-top:15px; border-radius:8px;"></div>
  `;
}

/* ============================================================
   LOGIKA GRAFU A SIMULACE
============================================================ */
async function initChart() {
  const ctx = document.getElementById('tm-chart');
  if(!ctx) return;

  try {
    // Dynamický import Chart.js
    const { Chart } = await import('https://cdn.jsdelivr.net/npm/chart.js@auto/+esm');
    
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Sklon (°)',
          data: [],
          borderColor: '#ff3256',
          borderWidth: 2,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: { y: { min: -60, max: 60, grid: { color: '#333' } }, x: { display: false } },
        plugins: { legend: { labels: { color: '#fff' } } }
      }
    });

    // Simulace dat
    window.toggleSim = (state) => {
      if(state) {
        if(telemetryInterval) return;
        telemetryInterval = setInterval(() => {
          const pitch = (Math.random() * 10) - 5;
          const roll = (Math.random() * 6) - 3;
          
          const elP = document.getElementById('val-pitch');
          const elR = document.getElementById('val-roll');
          
          if(elP) {
            elP.innerText = pitch.toFixed(1) + '°';
            elP.style.color = Math.abs(pitch) > 45 ? '#ff3256' : '#fff';
          }
          if(elR) {
            elR.innerText = roll.toFixed(1) + '°';
          }
          
          if(chartInstance) {
            chartInstance.data.labels.push('');
            chartInstance.data.datasets[0].data.push(pitch);
            if(chartInstance.data.labels.length > 30) {
              chartInstance.data.labels.shift();
              chartInstance.data.datasets[0].data.shift();
            }
            chartInstance.update();
          }
        }, 500);
      } else {
        clearInterval(telemetryInterval);
        telemetryInterval = null;
      }
    };

  } catch(e) {
    console.error(e);
    ctx.parentElement.innerHTML = '<p style="color:red; text-align:center; padding-top:50px;">Chyba načítání grafu (zkontrolujte internet).</p>';
  }
}
