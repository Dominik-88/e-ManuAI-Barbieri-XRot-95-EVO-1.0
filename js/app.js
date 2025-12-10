/* ==========================================
   APP.JS - Main Controller (Secured)
   ========================================== */

import { validateMessage, calculateRPM, getAIResponseMock, logger } from './modules-core.js';

// Global State
let map = null;
let machineState = { rpm: 0, temp: 60, tilt: 0, engineOn: false };

// UI Cache
const ui = {};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        cacheDOMElements();
        setupEventListeners();
        setupKeyboardNavigation();
        
        // Remove Loader
        const loader = document.getElementById('globalLoader');
        if (loader) loader.style.display = 'none';

        // Init DB (Dynamický import pro oddělení concerns)
        // V produkci by db.js měl být také modul
        if (window.XRotDB) {
            window.db = new window.XRotDB();
            await window.db.init();
            showToast('Systém připraven', 'success');
        }

        updateUI();

    } catch (error) {
        console.error("Critical Init Error:", error);
        showToast('Chyba inicializace systému', 'error');
    }
});

function cacheDOMElements() {
    ui.rpm = document.getElementById('span_1');
    ui.temp = document.getElementById('temp_val');
    ui.tilt = document.getElementById('tilt_val');
    ui.btnStart = document.getElementById('btn_start');
    ui.chatForm = document.getElementById('chat_form');
    ui.chatInput = document.getElementById('chat_input');
    ui.chatMsgs = document.getElementById('chat_messages');
}

/* --- UI UPDATES (Security: textContent) --- */
function updateUI() {
    if (ui.rpm) ui.rpm.textContent = machineState.rpm;
    if (ui.temp) ui.temp.textContent = `${machineState.temp}°C`;
    if (ui.tilt) ui.tilt.textContent = `${machineState.tilt}°`;
}

/* --- MAPA (Lazy Load + Error Handling) --- */
function initMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;
    
    if (map) {
        setTimeout(() => map.invalidateSize(), 200);
        return;
    }

    try {
        if (typeof L === 'undefined') throw new Error('Leaflet library not loaded');

        map = L.map('map').setView([49.195060, 16.606837], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);

        L.marker([49.195060, 16.606837]).addTo(map)
            .bindPopup(createPopupContent('XRot 95 EVO', 'Status: Standby')) // Helper pro bezpečné HTML
            .openPopup();

    } catch (e) {
        logger.error(e);
        mapContainer.textContent = 'Mapu nelze načíst (Offline nebo chyba knihovny).';
        mapContainer.style.display = 'flex';
        mapContainer.style.alignItems = 'center';
        mapContainer.style.justifyContent = 'center';
        mapContainer.style.color = 'red';
    }
}

// Helper pro bezpečný obsah popupu (pokud musíme použít HTML v Leafletu)
function createPopupContent(title, status) {
    const div = document.createElement('div');
    const h3 = document.createElement('h3');
    h3.textContent = title;
    const p = document.createElement('p');
    p.textContent = status;
    div.appendChild(h3);
    div.appendChild(p);
    return div;
}

/* --- EVENT LISTENERS --- */
function setupEventListeners() {
    // Engine Start/Stop
    if (ui.btnStart) {
        ui.btnStart.addEventListener('click', () => {
            machineState.engineOn = !machineState.engineOn;
            machineState.rpm = calculateRPM(machineState.engineOn, false);
            
            ui.btnStart.textContent = machineState.engineOn ? "STOP MOTORU" : "START MOTORU";
            ui.btnStart.className = machineState.engineOn ? "btn btn-danger" : "btn btn-primary";
            ui.btnStart.setAttribute('aria-pressed', machineState.engineOn);
            
            showToast(machineState.engineOn ? 'Motor nastartován' : 'Motor zastaven', 'info');
            updateUI();
        });
    }

    // Chat Submit
    if (ui.chatForm) {
        ui.chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msg = ui.chatInput.value;
            
            const validation = validateMessage(msg);
            if (!validation.isValid) {
                showToast(validation.error, 'error');
                return;
            }

            addChatMessage(validation.sanitized, 'user');
            ui.chatInput.value = '';

            const response = await getAIResponseMock(validation.sanitized);
            if (response.success) {
                addChatMessage(response.text, 'bot');
            } else {
                showToast(response.errorDetail || 'Chyba AI', 'error');
            }
        });
    }

    // Tab Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => handleTabSwitch(e.currentTarget));
        // A11y: Enter key support
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTabSwitch(e.currentTarget);
            }
        });
    });
}

function handleTabSwitch(target) {
    // UI Update
    document.querySelectorAll('.nav-item').forEach(i => {
        i.classList.remove('active');
        i.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.module').forEach(m => m.classList.add('hidden'));
    
    // Activate target
    target.classList.add('active');
    target.setAttribute('aria-selected', 'true');
    const moduleId = target.getAttribute('data-target');
    const moduleEl = document.getElementById(moduleId);
    
    if (moduleEl) {
        moduleEl.classList.remove('hidden');
        if (moduleId === 'module_map') initMap();
    }
}

/* --- CHAT UTILS (Security: createElement) --- */
function addChatMessage(text, sender) {
    if (!ui.chatMsgs) return;
    
    const div = document.createElement('div');
    div.style.textAlign = sender === 'user' ? 'right' : 'left';
    div.style.margin = '10px 0';
    
    const bubble = document.createElement('span');
    bubble.style.background = sender === 'user' ? '#667eea' : '#ffffff';
    bubble.style.color = sender === 'user' ? 'white' : '#333';
    bubble.style.padding = '8px 12px';
    bubble.style.borderRadius = '15px';
    bubble.style.display = 'inline-block';
    bubble.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
    
    // SECURITY: Použití textContent brání HTML injection/XSS
    bubble.textContent = text;
    
    div.appendChild(bubble);
    ui.chatMsgs.appendChild(div);
    ui.chatMsgs.scrollTop = ui.chatMsgs.scrollHeight;
}

/* --- TOAST SYSTEM (UX) --- */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function setupKeyboardNavigation() {
    // Placeholder pro budoucí pokročilou navigaci klávesnicí
    // Zajišťuje, že všechny prvky s tabindex="0" reagují standardně
}
