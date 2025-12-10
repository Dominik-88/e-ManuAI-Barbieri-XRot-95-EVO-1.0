/* =================================================================
   BARBIERI XROT 95 EVO - CONTROL UNIT CORE (v2.0)
   Digital Twin & Simulation Logic
   ================================================================= */

// 1. KONFIGURACE A LIMITY
const CONFIG = {
    MAX_TILT_CRITICAL: 45, // Kritický úhel (převrácení)
    MAX_TILT_WARNING: 35,  // Varovný úhel
    MAX_TEMP: 115,         // Max teplota motoru (°C)
    MAX_LOAD: 60,          // Max proud na nože (A)
    IDLE_RPM: 1450,        // Volnoběh
    WORK_RPM: 3200         // Pracovní otáčky
};

// 2. STAV STROJE (Data Store)
let machine = {
    running: false,
    pto: false,
    rpm: 0,
    temp: 55,
    tilt: 0,
    load: 0
};

let simInterval = null;

// 3. UI ELEMENTY (Načteme je až po startu DOM, abychom předešli chybám)
let ui = {};

// 4. FUNKCE PRO LOGOVÁNÍ
function sysLog(msg, type = "normal") {
    if (!ui.log) return;
    const time = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.innerText = `[${time}] ${msg}`;
    ui.log.prepend(div);
}

// 5. SIMULAČNÍ SMYČKA (Digital Twin)
function runSimulation() {
    if (!machine.running) return;

    // A) Simulace Otáček (kolísání)
    let target = machine.pto ? CONFIG.WORK_RPM : CONFIG.IDLE_RPM;
    machine.rpm = Math.floor(target + (Math.random() * 60 - 30));

    // B) Simulace Teploty (roste při zátěži)
    let heat = machine.pto ? 0.05 : 0.01;
    if (machine.temp < 95) machine.temp += heat;

    // C) Simulace Zátěže (náhodné špičky při sečení)
    if (machine.pto) {
        machine.load = Math.floor(20 + Math.random() * 15);
        if (Math.random() > 0.96) machine.load += 35; // Náraz na hustou trávu
    } else {
        machine.load = 0;
    }

    // D) Simulace Náklonu (Terén)
    machine.tilt = Math.max(0, Math.min(50, machine.tilt + (Math.random() * 2 - 1)));

    updateUI();
    runWatchdogs();
}

// 6. WATCHDOGS (Bezpečnostní logika)
function runWatchdogs() {
    // Náklon
    if (machine.tilt > CONFIG.MAX_TILT_CRITICAL) {
        triggerEmergency(`KRITICKÝ NÁKLON: ${machine.tilt.toFixed(1)}°`);
    } else if (machine.tilt > CONFIG.MAX_TILT_WARNING) {
        ui.cardTilt.style.border = "2px solid #f59e0b"; // Oranžová
        ui.tiltBar.style.backgroundColor = "#f59e0b";
        if(Math.random() > 0.9) sysLog(`VAROVÁNÍ: Svah ${machine.tilt.toFixed(1)}°`, "warn");
    } else {
        ui.cardTilt.style.border = "1px solid #e2e8f0";
        ui.tiltBar.style.backgroundColor = "#10b981"; // Zelená
    }

    // Přetížení PTO
    if (machine.load > CONFIG.MAX_LOAD) {
        sysLog(`PŘETÍŽENÍ NOŽŮ (${machine.load}A) - STOP`, "error");
        togglePTO(true); // Vynucené vypnutí
    }

    // Teplota
    if (machine.temp > CONFIG.MAX_TEMP) {
        triggerEmergency(`PŘEHŘÁTÍ MOTORU: ${machine.temp.toFixed(1)}°C`);
    }
}

// 7. AKTUALIZACE GRAFIKY
function updateUI() {
    if (!ui.rpm) return;
    ui.rpm.innerText = machine.rpm;
    ui.temp.innerText = machine.temp.toFixed(1) + "°C";
    ui.load.innerText = machine.load + " A";
    ui.tilt.innerText = machine.tilt.toFixed(1) + "°";
    
    // Progress bar náklonu
    let p = (machine.tilt / 50) * 100;
    ui.tiltBar.style.width = `${Math.min(p, 100)}%`;
}

// 8. OVLÁDÁNÍ
function startEngine() {
    ui.btnStart.disabled = true;
    ui.btnStart.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> STARTOVÁNÍ...';
    sysLog("Startovací sekvence...", "warn");

    setTimeout(() => {
        machine.running = true;
        machine.rpm = CONFIG.IDLE_RPM;
        
        ui.btnStart.innerHTML = '<i class="fa-solid fa-check"></i> BĚŽÍ';
        ui.btnStart.classList.add('btn-success');
        ui.btnStart.style.background = "#10b981";
        
        ui.btnStop.disabled = false;
        ui.btnPto.disabled = false;
        sysLog("Motor NASTARTOVÁN", "success");
        
        simInterval = setInterval(runSimulation, 500);
    }, 2000);
}

function stopEngine() {
    clearInterval(simInterval);
    machine.running = false;
    machine.pto = false;
    machine.rpm = 0;
    machine.load = 0;

    // Reset UI
    ui.btnStart.disabled = false;
    ui.btnStart.innerHTML = '<i class="fa-solid fa-play"></i> START MOTORU';
    ui.btnStart.style.background = "";
    ui.btnPto.disabled = true;
    ui.btnPto.innerHTML = '<i class="fa-solid fa-fan"></i> PTO (Nože)';
    ui.btnPto.classList.remove('btn-danger');

    sysLog("Motor ZASTAVEN", "warn");
    updateUI();
}

function togglePTO(forceOff = false) {
    if (forceOff) machine.pto = false;
    else machine.pto = !machine.pto;

    if (machine.pto) {
        ui.btnPto.classList.add('btn-danger');
        ui.btnPto.innerHTML = '<i class="fa-solid fa-cog fa-spin"></i> PTO AKTIVNÍ';
        sysLog("PTO SEPNUTO", "warn");
    } else {
        ui.btnPto.classList.remove('btn-danger');
        ui.btnPto.innerHTML = '<i class="fa-solid fa-fan"></i> PTO (Nože)';
        sysLog("PTO ODPOJENO");
    }
}

function triggerEmergency(msg) {
    stopEngine();
    ui.alertMsg.innerText = msg;
    ui.alert.style.display = "flex";
    sysLog(`EMERGENCY: ${msg}`, "error");
}

window.emergencyReset = function() {
    ui.alert.style.display = "none";
    machine.tilt = 0; // Reset senzoru
    machine.temp = 60;
    sysLog("Systém restartován", "success");
    updateUI();
}

// 9. INIT - ZDE SE VŠECHNO PROPOJÍ
document.addEventListener('DOMContentLoaded', () => {
    // Namapujeme prvky z HTML do proměnné ui
    ui = {
        rpm: document.getElementById('rpm_val'),
        temp: document.getElementById('temp_val'),
        tilt: document.getElementById('tilt_val'),
        tiltBar: document.getElementById('tilt_bar'),
        load: document.getElementById('load_val'),
        log: document.getElementById('system_log'),
        alert: document.getElementById('critical_alert'),
        alertMsg: document.getElementById('alert_message'),
        cardTilt: document.getElementById('card_tilt'),
        btnStart: document.getElementById('btn_start'),
        btnStop: document.getElementById('btn_stop'),
        btnPto: document.getElementById('btn_pto')
    };

    sysLog("Systém připraven.");
    updateUI();

    // Eventy tlačítek
    if(ui.btnStart) ui.btnStart.addEventListener('click', startEngine);
    if(ui.btnStop) ui.btnStop.addEventListener('click', stopEngine);
    if(ui.btnPto) ui.btnPto.addEventListener('click', () => togglePTO(false));

    // Generátor částic
    const pc = document.getElementById('particles');
    if (pc) {
        for(let i=0; i<20; i++) {
            let p = document.createElement('div');
            p.className = 'particle';
            p.style.left = Math.random()*100+'vw';
            p.style.top = Math.random()*100+'vh';
            p.style.animationDuration = (Math.random()*10+10)+'s';
            p.style.width = p.style.height = (Math.random()*5+2)+'px';
            pc.appendChild(p);
        }
    }
});
