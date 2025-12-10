/* BARBIERI XROT 95 EVO - HLAVNÍ APLIKAČNÍ LOGIKA (app.js)
   Verze: Safe-Build (Odolná proti chybějícím HTML prvkům)
*/

// =================================================================
// 1. BEZPEČNOSTNÍ FUNKCE (Anti-Crash System)
// =================================================================
// Tato funkce zajistí, že pokud prvek v HTML chybí, vrátí "falešný" prvek,
// do kterého se dá zapisovat, ale nic se nestane. Aplikace tak nespadne.
function getEl(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`⚠️ Varování: Prvek s ID '${id}' nebyl v HTML nalezen. Používám virtuální náhradu.`);
        return document.createElement("div"); // Vrací neviditelný "dummy" prvek
    }
    return element;
}

// =================================================================
// 2. DEFINICE PROMĚNNÝCH (Používáme bezpečný výběr)
// =================================================================

// Časovače a displeje (To, co vám dělalo chybu "span_1")
const span_1 = getEl("span_1"); // Hodiny / Minuty
const span_2 = getEl("span_2"); // Minuty / Sekundy
const span_3 = getEl("span_3"); // Sekundy / Setiny
const span_4 = getEl("span_4"); // Případné milisekundy

// Ovládací prvky (Tlačítka)
const btnStart = getEl("btn_start");
const btnStop  = getEl("btn_stop");
const btnReset = getEl("btn_reset");

// Senzory a Kamera
const cameraView = getEl("camera_feed");
const gyroDisplay = getEl("gyro_data");

// Systémové proměnné
let timerInterval = null;
let startTime = 0;
let elapsedTime = 0;
let isRunning = false;

// =================================================================
// 3. FUNKCE APLIKACE
// =================================================================

// --- Funkce: Hodiny / Stopky ---
function updateDisplay(timeInMs) {
    // Převod času na formát HH:MM:SS
    let date = new Date(timeInMs);
    let min = date.getUTCMinutes();
    let sec = date.getUTCSeconds();
    let ms  = Math.floor(date.getUTCMilliseconds() / 10);

    // Bezpečný zápis do HTML (díky getEl to nespadne, i když prvky chybí)
    span_1.innerText = min < 10 ? "0" + min : min;
    span_2.innerText = sec < 10 ? "0" + sec : sec;
    span_3.innerText = ms < 10 ? "0" + ms : ms;
}

function startTimer() {
    if (!isRunning) {
        startTime = Date.now() - elapsedTime;
        timerInterval = setInterval(() => {
            elapsedTime = Date.now() - startTime;
            updateDisplay(elapsedTime);
        }, 10);
        isRunning = true;
    }
}

function stopTimer() {
    if (isRunning) {
        clearInterval(timerInterval);
        isRunning = false;
    }
}

function resetTimer() {
    stopTimer();
    elapsedTime = 0;
    updateDisplay(0);
}

// --- Funkce: Inicializace (Spustí se po načtení stránky) ---
function initApp() {
    console.log("XROT 95 System: Booting sequence...");
    
    // Nastavení událostí na tlačítka (pokud existují)
    btnStart.addEventListener("click", startTimer);
    btnStop.addEventListener("click", stopTimer);
    btnReset.addEventListener("click", resetTimer);

    // Reset displeje na 00:00:00
    updateDisplay(0);

    // Zde můžete volat další funkce (např. GPS, Kamera)
    // startCamera(); 
    // initSensors();
    
    console.log("XROT 95 System: Ready.");
}

// =================================================================
// 4. PWA SERVICE WORKER (Pro instalaci jako aplikace)
// =================================================================
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js') // Odkaz na service worker (zatím volitelné)
    .then(reg => console.log('Service Worker registrován', reg))
    .catch(err => console.log('Service Worker chyba', err));
}

// =================================================================
// SPUŠTĚNÍ APLIKACE
// =================================================================
// Čekáme, až se načte celé HTML, pak spustíme logiku
window.addEventListener("DOMContentLoaded", initApp);
