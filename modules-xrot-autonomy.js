/* ============================================================
   XROT95 ULTIMATE MANUAL — MODULE: AUTONOMY CORE
   Autor: Barbieri Systems 2025
   Funkce: Telemetrie, RTK, Compass Drive, Autonomie, Simulátory
============================================================ */

import { db } from './db.js';

/* ============================================================
   GLOBÁLNÍ STAV A KONSTANTY
============================================================ */
export const XRotAutonomy = (() => {

  let currentMachine = null;
  let telemetryInterval = null;
  let chartInstance = null;
  let telemetryData = [];
  let mapInstance = null;
  let simRunning = false;
  let currentMode = 'Overview';

  const TAB_IDS = ['Overview','Telemetry','Compass','RTK','Autonomy','Simulators','Logs'];

  /* ============================================================
     INIT
  ============================================================ */
  async function init(machine) {
    if (machine.id !== 'XROT95') throw new Error('Autonomy modul je dostupný pouze pro XROT95 EVO.');
    currentMachine = machine;
    const root = document.querySelector('#module-autonomy');
    root.innerHTML = renderLayout();
    attachEvents(root);
    switchTab('Overview');
  }

  /* ============================================================
     UI LAYOUT
  ============================================================ */
  function renderLayout() {
    return `
      <header class="module-header">
        <h2>🤖 Autonomy Core — ${currentMachine.name}</h2>
        <nav class="autonomy-tabs">
          ${TAB_IDS.map(t=>`<button class="tab-btn" data-tab="${t}">${t}</button>`).join('')}
        </nav>
      </header>
      <section id="autonomy-body" class="autonomy-body"></section>
    `;
  }

  function renderOverviewHTML() {
    return `
      <div class="overview">
        <h3>📊 Přehled systému</h3>
        <div id="overview-health" class="health-grid"></div>
        <div id="overview-last-service"></div>
      </div>
    `;
  }

  function renderTelemetryHTML() {
    return `
      <div class="telemetry">
        <canvas id="telemetry-chart" height="180"></canvas>
        <div class="telemetry-controls">
          <button id="telemetry-start">▶️ Start</button>
          <button id="telemetry-stop" disabled>⏹ Stop</button>
          <button id="telemetry-export">📤 Export CSV</button>
        </div>
        <table id="telemetry-table" class="telemetry-table"></table>
      </div>
    `;
  }

  function renderCompassHTML() {
    return `
      <div class="compass">
        <h3>🧭 Compass Drive</h3>
        <label>Režim:
          <select id="compass-mode">
            <option value="mode1">Mode 1</option>
            <option value="mode2">Mode 2</option>
            <option value="s-mode">S-Mode</option>
          </select>
        </label>
        <label>Hladkost řízení: <input type="range" id="compass-smooth" min="0" max="100" value="50"></label>
        <canvas id="compass-graph" height="150"></canvas>
      </div>
    `;
  }

  function renderRTKHTML() {
    return `
      <div class="rtk">
        <h3>📡 RTK / GPS / CZEPOS</h3>
        <label>IP <input id="rtk-ip" placeholder="192.168.0.100"></label>
        <label>Port <input id="rtk-port" placeholder="2101"></label>
        <label>Mountpoint <input id="rtk-mp" placeholder="CZEPOS"></label>
        <button id="rtk-connect">🔌 Připojit</button>
        <div id="rtk-status">Status: <b>NONE</b></div>
        <div id="rtk-map" style="height:250px;margin-top:10px;"></div>
      </div>
    `;
  }

  function renderAutonomyHTML() {
    return `
      <div class="autonomy">
        <h3>🧭 Autonomní plánovač</h3>
        <div class="planner-controls">
          <label>A-bod: <input type="text" id="pointA" placeholder="x,y"></label>
          <label>B-bod: <input type="text" id="pointB" placeholder="x,y"></label>
          <label>Overlap (cm): <input type="number" id="overlap" value="30"></label>
          <button id="planner-generate">📐 Vytvořit trasu</button>
        </div>
        <canvas id="planner-canvas" width="600" height="400" style="border:1px solid var(--border);"></canvas>
      </div>
    `;
  }

  function renderSimulatorsHTML() {
    return `
      <div class="simulators">
        <h3>⚙️ Simulátory</h3>
        <div class="sim-section">
          <h4>Telemetry SIM</h4>
          <label>Rate (points/sec): <input id="sim-rate" type="number" value="2"></label>
          <label>Noise level: <input id="sim-noise" type="number" value="5"></label>
          <button id="sim-start">▶️ Spustit</button>
          <button id="sim-stop" disabled>⏹ Zastavit</button>
        </div>
        <div class="sim-section">
          <h4>BeaconNet LED SIM</h4>
          <button id="sim-led-normal">Normal</button>
          <button id="sim-led-error">Error</button>
          <button id="sim-led-emergency">Emergency</button>
          <div id="sim-leds" class="leds"></div>
        </div>
      </div>
    `;
  }

  /* ============================================================
     EVENTY A OVLÁDÁNÍ
  ============================================================ */
  function attachEvents(root) {
    root.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
  }

  function switchTab(tab) {
    currentMode = tab;
    const body = document.querySelector('#autonomy-body');
    switch(tab) {
      case 'Overview': body.innerHTML = renderOverviewHTML(); renderOverview(); break;
      case 'Telemetry': body.innerHTML = renderTelemetryHTML(); initTelemetry(); break;
      case 'Compass': body.innerHTML = renderCompassHTML(); initCompass(); break;
      case 'RTK': body.innerHTML = renderRTKHTML(); initRTK(); break;
      case 'Autonomy': body.innerHTML = renderAutonomyHTML(); initPlanner(); break;
      case 'Simulators': body.innerHTML = renderSimulatorsHTML(); initSimulators(); break;
      default: body.innerHTML = `<p>Modul zatím není implementován.</p>`;
    }
  }

  /* ============================================================
     OVERVIEW
  ============================================================ */
  async function renderOverview() {
    const logs = await db.getServicesByMachine('XROT95', { sort: 'desc' });
    const health = `
      <div>Teplota: <span id="h-temp">68°C</span></div>
      <div>Napětí: <span id="h-voltage">48.2V</span></div>
      <div>RTK status: <span id="h-rtk">FLOAT</span></div>
    `;
    document.querySelector('#overview-health').innerHTML = health;
    if (logs.length) {
      document.querySelector('#overview-last-service').innerHTML =
        `<p>Poslední servis: ${new Date(logs[0].date).toLocaleDateString()} – ${logs[0].type}</p>`;
    }
  }

  /* ============================================================
     TELEMETRY
  ============================================================ */
  async function initTelemetry() {
    const ctx = document.getElementById('telemetry-chart').getContext('2d');
    if (!chartInstance) {
      const { Chart } = await import('https://cdn.jsdelivr.net/npm/chart.js');
      chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            { label: 'RPM', borderColor: '#0ff', data: [] },
            { label: 'Teplota', borderColor: '#f80', data: [] }
          ]
        },
        options: { animation: false, scales: { x: { display:false } } }
      });
    }

    document.getElementById('telemetry-start').onclick = startTelemetry;
    document.getElementById('telemetry-stop').onclick = stopTelemetry;
    document.getElementById('telemetry-export').onclick = exportTelemetry;
  }

  async function startTelemetry() {
    telemetryData = [];
    document.getElementById('telemetry-start').disabled = true;
    document.getElementById('telemetry-stop').disabled = false;
    telemetryInterval = setInterval(async () => {
      const point = generateTelemetryPoint();
      telemetryData.push(point);
      await db.addTelemetry(point);
      updateTelemetryChart(point);
    }, 1000);
  }

  function stopTelemetry() {
    clearInterval(telemetryInterval);
    document.getElementById('telemetry-start').disabled = false;
    document.getElementById('telemetry-stop').disabled = true;
  }

  function generateTelemetryPoint() {
    return {
      machineId: 'XROT95',
      ts: new Date().toISOString(),
      rpm: 3000 + Math.random() * 800,
      temp: 60 + Math.random() * 30,
      tilt: Math.random() * 5,
      voltage: 48 + Math.random() * 0.5,
      rtkStatus: 'FIX'
    };
  }

  function updateTelemetryChart(p) {
    const d = chartInstance.data;
    d.labels.push('');
    d.datasets[0].data.push(p.rpm);
    d.datasets[1].data.push(p.temp);
    if (d.labels.length > 30) {
      d.labels.shift();
      d.datasets.forEach(ds => ds.data.shift());
    }
    chartInstance.update('none');
  }

  async function exportTelemetry() {
    const data = await db.queryTelemetry('XROT95');
    const csv = data.map(d => `${d.ts},${d.rpm},${d.temp},${d.tilt}`).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'telemetry.csv';
    a.click();
  }

  /* ============================================================
     COMPASS
  ============================================================ */
  function initCompass() {
    const ctx = document.getElementById('compass-graph').getContext('2d');
    import('https://cdn.jsdelivr.net/npm/chart.js').then(({ Chart }) => {
      const chart = new Chart(ctx, {
        type: 'line',
        data: { labels:[], datasets:[{label:'Servo Response',borderColor:'#0f0',data:[]}] },
        options: { animation:false, scales:{x:{display:false}} }
      });
      const smoothInput = document.getElementById('compass-smooth');
      smoothInput.oninput = () => {
        const val = parseInt(smoothInput.value);
        chart.data.labels.push('');
        chart.data.datasets[0].data.push(val + Math.random()*5);
        if(chart.data.labels.length>20){chart.data.labels.shift();chart.data.datasets[0].data.shift();}
        chart.update('none');
      };
    });
  }

  /* ============================================================
     RTK / GPS
  ============================================================ */
  async function initRTK() {
    const { map, tileLayer, circle } = await import('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet-src.esm.js');
    const mapEl = document.getElementById('rtk-map');
    mapInstance = map(mapEl).setView([49.19,16.61],13);
    tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(mapInstance);
    document.getElementById('rtk-connect').onclick = () => {
      const ip = document.getElementById('rtk-ip').value;
      document.getElementById('rtk-status').innerHTML = `Status: <b>FIX (via ${ip})</b>`;
      circle([49.19,16.61],{radius:20,color:'green'}).addTo(mapInstance);
    };
  }

  /* ============================================================
     AUTONOMY PLANNER
  ============================================================ */
  function initPlanner() {
    const canvas = document.getElementById('planner-canvas');
    const ctx = canvas.getContext('2d');
    document.getElementById('planner-generate').onclick = () => {
      const a = parseCoords(document.getElementById('pointA').value);
      const b = parseCoords(document.getElementById('pointB').value);
      const overlap = parseFloat(document.getElementById('overlap').value);
      drawRoute(ctx,a,b,overlap);
    };
  }

  function parseCoords(str) {
    const [x,y] = str.split(',').map(Number);
    return {x,y};
  }

  function drawRoute(ctx,a,b,overlap) {
    ctx.clearRect(0,0,600,400);
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.lineTo(b.x,b.y);
    ctx.stroke();
    for(let i=1;i<=5;i++){
      const dx = (overlap*i);
      ctx.beginPath();
      ctx.moveTo(a.x+dx,a.y);
      ctx.lineTo(b.x+dx,b.y);
      ctx.strokeStyle = i%2===0?'#0f0':'#08f';
      ctx.stroke();
    }
  }

  /* ============================================================
     SIMULÁTORY
  ============================================================ */
  function initSimulators() {
    const leds = document.getElementById('sim-leds');
    leds.innerHTML = '<div class="led"></div>'.repeat(5);
    const ledElems = leds.querySelectorAll('.led');
    const setLED = (color) => ledElems.forEach(l => l.style.background = color);

    document.getElementById('sim-start').onclick = () => {
      simRunning = true;
      document.getElementById('sim-stop').disabled = false;
      telemetryInterval = setInterval(() => {
        const p = generateTelemetryPoint();
        db.addTelemetry(p);
      }, 1000 / parseInt(document.getElementById('sim-rate').value));
    };
    document.getElementById('sim-stop').onclick = () => {
      simRunning = false;
      clearInterval(telemetryInterval);
    };

    document.getElementById('sim-led-normal').onclick = () => setLED('lime');
    document.getElementById('sim-led-error').onclick = () => setLED('orange');
    document.getElementById('sim-led-emergency').onclick = () => setLED('red');
  }

  /* ============================================================
     EXPORT
  ============================================================ */
  return { init, switchTab };

})();