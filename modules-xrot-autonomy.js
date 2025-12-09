/* ============================================================
   XROT95 ULTIMATE MANUAL — MODULE: AUTONOMY CORE
   Autor: Barbieri Systems 2025
   Verze: 2.0 (Auditovaná dle manuálu XROT 95 EVO)
   Funkce: Telemetrie, RTK/CZEPOS, Compass Drive 2.0, Autonomie
============================================================ */

import { db } from './db.js';

export const XRotAutonomy = (() => {

  /* -------------------- STAV A KONSTANTY -------------------- */
  let currentMachine = null;
  let telemetryInterval = null;
  let chartInstance = null;
  let mapInstance = null;
  let simRunning = false;
  
  [span_7](start_span)[span_8](start_span)// Limity náklonu dle manuálu[span_7](end_span)[span_8](end_span)
  const LIMITS = {
    TILT_WARN: 35, // Snížení rychlosti, žlutý maják
    TILT_DANGER: 45, // Kritický limit, červený maják
    [span_9](start_span)RPM_MAX: 3600  // Kawasaki FS730V max RPM[span_9](end_span)
  };

  const TAB_IDS = ['Overview', 'Telemetry', 'Compass', 'RTK', 'Autonomy', 'Simulators'];

  /* -------------------- INIT -------------------- */
  async function init(machine) {
    if (machine.id !== 'XROT95') throw new Error('Autonomy modul je dostupný pouze pro XROT95 EVO.');
    currentMachine = machine;
    const root = document.querySelector('#moduleContent'); // Oprava selektoru pro SPA shell
    root.innerHTML = renderLayout();
    attachEvents(root);
    switchTab('Overview');
  }

  /* -------------------- UI LAYOUT -------------------- */
  function renderLayout() {
    return `
      <header class="module-header" style="margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h2 style="margin:0; color:var(--accent);">🤖 Autonomy Core v2.0</h2>
          <span style="font-size:0.8rem; color:#666;">Compass Servo Drive R54</span>
        </div>
        <nav class="autonomy-tabs" style="margin-top:15px; display:flex; gap:10px; overflow-x:auto;">
          ${TAB_IDS.map(t => `<button class="tab-btn" data-tab="${t}" style="flex:1; min-width:80px;">${t}</button>`).join('')}
        </nav>
      </header>
      <section id="autonomy-body" class="autonomy-body"></section>
    `;
  }

  [span_10](start_span)[span_11](start_span)/* --- TAB: OVERVIEW [cite: 476-482] --- */
  function renderOverviewHTML() {
    return `
      <div class="overview-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
        
        <div class="panel" style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px;">
          <h3 style="margin-top:0; border-bottom:1px solid var(--border); padding-bottom:10px;">🖥️ System Hardware</h3>
          <ul style="list-style:none; padding:0; font-size:0.9rem; line-height:1.8;">
            <li><b>Jednotka:</b> Compass Servo Drive 2.0 (R54)</li>
            <li><b>CPU:</b> Broadcom BCM2837 (1.4 GHz)</li>
            <li><b>GNSS:</b> u-blox ZED-F9P (L1/L2 RTK)</li>
            <li><b>IMU:</b> Bosch BNO055 (9-axis)</li>
            <li><b>Konektivita:</b> LTE MIMO / Wi-Fi / BT</li>
            <li><b>Firmware:</b> v1.9.6.6 [Stable]</li>
          </ul>
        </div>

        <div class="panel" style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px;">
          <h3 style="margin-top:0; border-bottom:1px solid var(--border); padding-bottom:10px;">⚕️ Health Check</h3>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>Teplota CPU: <span style="color:var(--ok)">42°C</span></div>
            <div>Napětí (48V): <span style="color:var(--ok)">50.4V</span></div>
            <div>Baterie Rádio: <span style="color:var(--ok)">85%</span></div>
            <div>CAN-BUS: <span style="color:var(--ok)">ONLINE</span></div>
          </div>
          <div style="margin-top:15px; padding:10px; background:rgba(0,255,0,0.1); border:1px solid var(--ok); border-radius:4px; text-align:center;">
            SYSTEM READY
          </div>
        </div>
      </div>
    `;
  }

  [cite_start]/* --- TAB: TELEMETRY & TILT[span_10](end_span)[span_11](end_span) --- */
  function renderTelemetryHTML() {
    return `
      <div class="telemetry">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h3>📉 Live Telemetrie & Náklon</h3>
          <div class="telemetry-controls">
            <button id="telemetry-start">▶️ Start</button>
            <button id="telemetry-stop" disabled>⏹ Stop</button>
            <button id="telemetry-export">📤 Export GPX/CSV</button>
          </div>
        </div>
        
        <div style="position:relative; height:200px; margin-bottom:20px;">
          <canvas id="telemetry-chart"></canvas>
        </div>

        <div class="tilt-monitor" style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
          <div style="background:#111; padding:15px; border-radius:8px; text-align:center;">
            <div style="font-size:0.8rem; color:#888;">PITCH (Podélný)</div>
            <div id="val-pitch" style="font-size:2rem; font-weight:bold;">0°</div>
            <div style="font-size:0.7rem; color:var(--warn);">Limit: 45° (Danger)</div>
          </div>
          <div style="background:#111; padding:15px; border-radius:8px; text-align:center;">
            <div style="font-size:0.8rem; color:#888;">ROLL (Boční)</div>
            <div id="val-roll" style="font-size:2rem; font-weight:bold;">0°</div>
            <div style="font-size:0.7rem; color:var(--warn);">Limit: 45° (Danger)</div>
          </div>
        </div>
      </div>
    `;
  }

  [span_12](start_span)/* --- TAB: COMPASS DRIVE[span_12](end_span) --- */
  function renderCompassHTML() {
    return `
      <div class="compass">
        <h3>🧭 Compass Drive 2.0 Nastavení</h3>
        <p style="font-size:0.85rem; color:#aaa; margin-bottom:20px;">
          Vyberte autonomní režim podle typu terénu a požadované trajektorie.
        </p>
        
        <label style="display:block; margin-bottom:15px;">
          <span style="display:block; margin-bottom:5px;">Režim Autonomie:</span>
          <select id="compass-mode" style="width:100%; padding:10px; background:#111; color:#fff; border:1px solid var(--border); border-radius:4px;">
            <option value="mode1">MODE 1: Přímý směr (Rovné pruhy A-B)</option>
            <option value="mode2">MODE 2: Souběžné pruhy (Referenční křivka)</option>
            <option value="mode3">MODE 3: Obvodové sečení (Kopírování)</option>
            <option value="smode4">S-MODE 4: Učená trasa s offsetem</option>
            <option value="smode5">S-MODE 5: Komplexní opakovaná trasa</option>
          </select>
        </label>

        <label style="display:block; margin-bottom:15px;">
          <span style="display:block; margin-bottom:5px;">Překrytí (Overlap):</span>
          <div style="display:flex; gap:10px; align-items:center;">
            <input type="range" id="overlap-range" min="-20" max="20" value="5" style="flex:1;">
            <span id="overlap-val">5 cm</span>
          </div>
          <small style="color:#666;">Doporučení: 0-5cm roviny | [span_13](start_span)10-15cm svahy[span_13](end_span)</small>
        </label>

        <div style="margin-top:20px; padding:15px; border:1px solid var(--accent); border-radius:4px;">
          <h4 style="margin:0 0 10px 0;">🎮 Rychlé ovládání (Klávesové zkratky)</h4>
          <ul style="font-size:0.8rem; padding-left:20px; color:#ccc;">
            <li><b>SHIFT + A:</b> Uložit bod A</li>
            <li><b>SHIFT + B:</b> Uložit bod B</li>
            <li><b>SHIFT (2s):</b> START Autonomie (AUTO)</li>
            <li><b>Joystick:</b> Okamžité přerušení (Manual Override)</li>
          </ul>
        </div>
      </div>
    `;
  }

  [span_14](start_span)/* --- TAB: RTK / CZEPOS[span_14](end_span) --- */
  function renderRTKHTML() {
    return `
      <div class="rtk">
        <h3>📡 RTK Korekce (NTRIP Client)</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
          <label>Host <input id="rtk-host" value="rtk.cuzk.cz" style="width:100%; padding:8px; background:#111; border:1px solid var(--border); color:#fff;"></label>
          <label>Port <input id="rtk-port" value="2101" style="width:100%; padding:8px; background:#111; border:1px solid var(--border); color:#fff;"></label>
          <label>Mountpoint <input id="rtk-mp" value="MAX3" style="width:100%; padding:8px; background:#111; border:1px solid var(--border); color:#fff;"></label>
          <label>User <input id="rtk-user" placeholder="CZEPOS_login" style="width:100%; padding:8px; background:#111; border:1px solid var(--border); color:#fff;"></label>
        </div>
        
        <button id="rtk-connect" style="width:100%; padding:12px; background:var(--accent); color:#000; font-weight:bold; border:none; border-radius:4px;">
          🔌 Připojit k CZEPOS
        </button>
        
        <div id="rtk-log" style="margin-top:15px; font-family:monospace; font-size:0.8rem; color:#888;">
          Status: <span id="rtk-status_text">DISCONNECTED</span>
        </div>

        <div id="rtk-map" style="height:300px; margin-top:20px; border-radius:8px; border:1px solid var(--border);"></div>
      </div>
    `;
  }

  [span_15](start_span)[span_16](start_span)/* --- TAB: SIMULATORS (BeaconNet) [cite: 167-170] --- */
  function renderSimulatorsHTML() {
    return `
      <div class="simulators">
        <h3>⚙️ Diagnostika & Simulace</h3>
        
        <div class="sim-section" style="margin-bottom:30px;">
          <h4 style="border-bottom:1px solid var(--border); padding-bottom:5px;">🚨 BeaconNet LED Status</h4>
          <p style="font-size:0.8rem; color:#aaa;">Simulace vizuální signalizace stroje.</p>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:15px;">
            <button id="sim-led-green" style="flex:1; padding:10px; border:1px solid #3cff8d; background:rgba(60,255,141,0.1); color:#fff;">🟢 Motor ON</button>
            <button id="sim-led-white" style="flex:1; padding:10px; border:1px solid #fff; background:rgba(255,255,255,0.1); color:#fff;">⚪ GPS Fix</button>
            <button id="sim-led-yellow" style="flex:1; padding:10px; border:1px solid #f5cb42; background:rgba(245,203,66,0.1); color:#fff;">🟡 PTO / Warn</button>
            <button id="sim-led-red" style="flex:1; padding:10px; border:1px solid #ff3256; background:rgba(255,50,86,0.1); color:#fff;">🔴 ALARM / Stop</button>
          </div>
          <div id="sim-beacon-visual" style="height:40px; border-radius:20px; background:#333; transition:0.3s; box-shadow:0 0 10px #000 inset;"></div>
        </div>

        <div class="sim-section">
          <h4 style="border-bottom:1px solid var(--border); padding-bottom:5px;">📈 Generátor Telemetrie</h4>
          <div style="display:flex; gap:10px; align-items:center;">
            <label>Rate: <input id="sim-rate" type="number" value="2" style="width:50px; padding:5px; background:#111; color:#fff; border:1px solid var(--border);"> Hz</label>
            <button id="sim-tilt-trigger" style="padding:5px 10px; background:var(--danger); border:none; color:#fff; border-radius:4px;">⚠️ Simulovat náklon >45°</button>
          </div>
        </div>
      </div>
    `;
  }

  /* -------------------- EVENT HANDLING -------------------- */
  function attachEvents(root) {
    // Tabs navigation
    root.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.tab-btn').forEach(b => {
          b.style.borderBottom = 'none';
          b.style.color = '#fff';
        });
        btn.style.borderBottom = '2px solid var(--accent)';
        btn.style.color = 'var(--accent)';
        switchTab(btn.dataset.tab);
      });
    });
  }

  function switchTab(tab) {
    const body = document.querySelector('#autonomy-body');
    // Clear intervals when switching
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    
    switch(tab) {
      case 'Overview': body.innerHTML = renderOverviewHTML(); break;
      case 'Telemetry': body.innerHTML = renderTelemetryHTML(); initTelemetry(); break;
      case 'Compass': body.innerHTML = renderCompassHTML(); initCompassEvents(); break;
      case 'RTK': body.innerHTML = renderRTKHTML(); initRTK(); break;
      case 'Autonomy': body.innerHTML = `<p style="padding:20px;">Plánovač tras (Canvas) je integrován v sekci RTK.</p>`; break;
      case 'Simulators': body.innerHTML = renderSimulatorsHTML(); initSimulators(); break;
    }
  }

  /* -------------------- LOGIC: TELEMETRY -------------------- */
  async function initTelemetry() {
    const ctx = document.getElementById('telemetry-chart').getContext('2d');
    const { Chart } = await import('https://cdn.jsdelivr.net/npm/chart.js');
    
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { label: 'RPM', borderColor: '#3cff8d', data: [], yAxisID: 'y' },
          { label: 'Pitch (°)', borderColor: '#ff3256', data: [], yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: { display: false },
          y: { type: 'linear', display: true, position: 'left', min: 0, max: 4000, title: {display:true, text:'RPM'} },
          y1: { type: 'linear', display: true, position: 'right', min: -60, max: 60, title: {display:true, text:'Sklon'} }
        }
      }
    });

    document.getElementById('telemetry-start').onclick = startTelemetry;
    document.getElementById('telemetry-stop').onclick = stopTelemetry;
    document.getElementById('telemetry-export').onclick = exportData;
  }

  function startTelemetry() {
    if (simRunning) return;
    simRunning = true;
    document.getElementById('telemetry-start').disabled = true;
    document.getElementById('telemetry-stop').disabled = false;

    telemetryInterval = setInterval(async () => {
      const point = generateDataPoint();
      
      // Update UI
      document.getElementById('val-pitch').innerText = point.pitch.toFixed(1) + "°";
      document.getElementById('val-roll').innerText = point.roll.toFixed(1) + "°";
      
      [cite_start]// Safety Check[span_15](end_span)[span_16](end_span)
      const maxTilt = Math.max(Math.abs(point.pitch), Math.abs(point.roll));
      if (maxTilt > LIMITS.TILT_DANGER) {
        document.getElementById('val-pitch').style.color = 'red';
        [span_17](start_span)// V reálu by zde došlo k vypnutí motoru (E107)[span_17](end_span)
      } else if (maxTilt > LIMITS.TILT_WARN) {
        document.getElementById('val-pitch').style.color = 'yellow';
      } else {
        document.getElementById('val-pitch').style.color = 'white';
      }

      // Update Chart
      const d = chartInstance.data;
      d.labels.push(new Date().toLocaleTimeString());
      d.datasets[0].data.push(point.rpm);
      d.datasets[1].data.push(point.pitch);
      
      if (d.labels.length > 50) {
        d.labels.shift();
        d.datasets.forEach(ds => ds.data.shift());
      }
      chartInstance.update('none');

      // Save to DB
      await db.addTelemetry(point);

    }, 1000); // 1 Hz default
  }

  function stopTelemetry() {
    simRunning = false;
    clearInterval(telemetryInterval);
    document.getElementById('telemetry-start').disabled = false;
    document.getElementById('telemetry-stop').disabled = true;
  }

  function generateDataPoint() {
    // Simulace dat odpovídající motoru Kawasaki FS730V
    return {
      machineId: 'XROT95',
      ts: new Date().toISOString(),
      [span_18](start_span)rpm: 3000 + Math.random() * 600, // Max 3600[span_18](end_span)
      pitch: (Math.random() * 10) - 5, // Normal flat op
      roll: (Math.random() * 4) - 2,
      lat: 49.19 + (Math.random()*0.0001),
      lon: 16.61 + (Math.random()*0.0001),
      rtk: 'FIX'
    };
  }

  async function exportData() {
    const data = await db.queryTelemetry('XROT95');
    [span_19](start_span)// Simple GPX Structure as mentioned in manual[span_19](end_span)
    let gpx = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="CompassDrive"><trk><trkseg>`;
    data.forEach(pt => {
      gpx += `<trkpt lat="${pt.lat}" lon="${pt.lon}"><time>${pt.ts}</time><extensions><rpm>${Math.round(pt.rpm)}</rpm></extensions></trkpt>`;
    });
    gpx += `</trkseg></trk></gpx>`;
    
    const blob = new Blob([gpx], {type: 'application/gpx+xml'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `XROT_Track_${new Date().toISOString().slice(0,10)}.gpx`;
    a.click();
  }

  /* --- LOGIC: COMPASS EVENTS --- */
  function initCompassEvents() {
    const range = document.getElementById('overlap-range');
    const display = document.getElementById('overlap-val');
    if (range && display) {
      range.oninput = () => display.innerText = range.value + " cm";
    }
  }

  /* --- LOGIC: RTK MAP --- */
  async function initRTK() {
    const { map, tileLayer, circle } = await import('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet-src.esm.js');
    const mapEl = document.getElementById('rtk-map');
    if (!mapEl) return;

    if (!mapInstance) {
      mapInstance = map(mapEl).setView([49.195060, 16.606837], 13); // Default Brno
      tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OSM Contributors'
      }).addTo(mapInstance);
    }

    document.getElementById('rtk-connect').onclick = () => {
      const host = document.getElementById('rtk-host').value;
      const mp = document.getElementById('rtk-mp').value;
      document.getElementById('rtk-status_text').innerHTML = 
        `<b style="color:var(--ok)">FIXED</b> (Connected to ${host}/${mp})`;
      
      // Simulate position fix
      const pos = [49.195060, 16.606837];
      mapInstance.setView(pos, 18);
      circle(pos, {radius: 5, color: '#3cff8d', fillColor: '#3cff8d', fillOpacity: 0.5}).addTo(mapInstance)
        .bindPopup("XROT 95 EVO<br>RTK Precision: 1.2 cm").openPopup();
    };
  }

  /* --- LOGIC: SIMULATORS (BEACONNET) --- */
  function initSimulators() {
    const visual = document.getElementById('sim-beacon-visual');
    
    const setBeacon = (color, shadow) => {
      visual.style.backgroundColor = color;
      visual.style.boxShadow = `0 0 20px ${shadow}`;
    };

    document.getElementById('sim-led-green').onclick = () => setBeacon('#3cff8d', '#3cff8d'); // Motor ON
    document.getElementById('sim-led-white').onclick = () => setBeacon('#ffffff', '#ffffff'); // GPS Fix
    document.getElementById('sim-led-yellow').onclick = () => setBeacon('#f5cb42', '#f5cb42'); // Warn/PTO
    document.getElementById('sim-led-red').onclick = () => setBeacon('#ff3256', '#ff3256'); // Alarm

    // Simulation Trigger for Tilt
    document.getElementById('sim-tilt-trigger').onclick = () => {
      // Inject dangerous value directly into chart if active
      if (chartInstance) {
        const d = chartInstance.data;
        d.datasets[1].data.push(50); // > 45 deg
        chartInstance.update('none');
        document.getElementById('val-pitch').innerText = "50.0°";
        document.getElementById('val-pitch').style.color = "red";
        setBeacon('#ff3256', '#ff3256'); // Auto trigger Red Beacon
        alert("E107: RIZIKO PŘEVRÁCENÍ! Motor STOP.");
      }
    };
  }

  /* -------------------- PUBLIC API -------------------- */
  return { init, switchTab };

})();
