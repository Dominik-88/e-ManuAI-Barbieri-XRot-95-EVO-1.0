/* ==========================================
   APP.JS - Core Logic (Fixed & Safe)
   ========================================== */

// 1. GLOBAL STATE
let map = null;
let machineState = {
    rpm: 0,
    temp: 60,
    tilt: 0,
    engineOn: false
};

// 2. WAIT FOR DOM (Oprava chyby "Can't find variable")
document.addEventListener('DOMContentLoaded', () => {
    console.log('✓ DOM Loaded - Initializing App');
    
    // Inicializace UI
    updateUI();
    setupEventListeners();
    
    // Schování loaderu
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
});

// 3. MAP LOGIC (Lazy Loading)
function initMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return; 
    
    // Pokud už mapa existuje, jen ji překreslíme (fix šedé plochy)
    if (map) {
        setTimeout(() => map.invalidateSize(), 100);
        return;
    }

    try {
        console.log('Initializing Leaflet Map...');
        map = L.map('map').setView([49.195060, 16.606837], 15); // Default Brno
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Marker stroje
        L.marker([49.195060, 16.606837]).addTo(map)
            .bindPopup('<b>XRot 95 EVO</b><br>Status: Standby')
            .openPopup();
            
    } catch (e) {
        console.error('Map Error:', e);
        mapContainer.innerHTML = '<p style="color:red; text-align:center; padding:20px;">Mapa nedostupná (Offline?)</p>';
    }
}

// 4. AI LOGIC (Simulace backendu)
async function getAIResponse(userMessage) {
    const lower = userMessage.toLowerCase();
    
    // Simulace myšlení (Loading)
    await new Promise(r => setTimeout(r, 800));

    try {
        // Fallback logika (protože nemáme backend)
        if (lower.includes('olej') || lower.includes('servis')) {
            return "Manuál (Kap. 7): Výměna motorového oleje každých 50 motohodin. Typ: SAE 10W-30.";
        }
        if (lower.includes('svah') || lower.includes('náklon') || lower.includes('převrátí')) {
            return "⚠️ VAROVÁNÍ: Max. náklon je 45°. Při 50° se aktivuje nouzové zastavení motoru.";
        }
        if (lower.includes('gps') || lower.includes('poloha')) {
            return "GPS Status: RTK FIX. Přesnost ±2cm. Satelitů: 12.";
        }
        
        return "Jsem AI asistent XRot. Mohu pomoci se servisem, náklony nebo GPS. Zkuste se zeptat konkrétněji.";
        
    } catch (error) {
        console.error("AI Error:", error);
        return "Chyba komunikace s AI modulem.";
    }
}

// 5. UI UPDATES (Bezpečný přístup k elementům)
function updateUI() {
    // Používáme ID 'span_1' pro RPM, aby to sedělo s vaším screenshotem chyby
    const elRpm = document.getElementById('span_1');
    const elTemp = document.getElementById('temp_val');
    const elTilt = document.getElementById('tilt_val');

    if (elRpm) elRpm.innerText = machineState.rpm;
    if (elTemp) elTemp.innerText = machineState.temp + "°C";
    if (elTilt) elTilt.innerText = machineState.tilt + "°";
}

// 6. EVENT LISTENERS
function setupEventListeners() {
    // Start Button
    const btnStart = document.getElementById('btn_start');
    if (btnStart) {
        btnStart.addEventListener('click', () => {
            machineState.engineOn = !machineState.engineOn;
            
            if (machineState.engineOn) {
                machineState.rpm = 1450; // Volnoběh
                btnStart.innerText = "STOP MOTORU";
                btnStart.classList.replace('btn-primary', 'btn-danger');
                
                // Uložení do DB
                if(typeof db !== 'undefined') {
                    db.add('engineLogs', { event: 'START', date: new Date() });
                }
            } else {
                machineState.rpm = 0;
                btnStart.innerText = "START MOTORU";
                btnStart.classList.replace('btn-danger', 'btn-primary');
            }
            updateUI();
        });
    }

    // Chat
    const chatBtn = document.getElementById('chat_send');
    const chatInput = document.getElementById('chat_input');
    
    if (chatBtn && chatInput) {
        chatBtn.addEventListener('click', async () => {
            const msg = chatInput.value.trim();
            if (!msg) return; 
            
            addChatMessage(msg, 'user');
            chatInput.value = '';
            
            const response = await getAIResponse(msg);
            addChatMessage(response, 'bot');
        });
    }

    // Přepínání záložek (Tabs)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Reset aktivní třídy
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.module').forEach(m => m.classList.add('hidden'));
            
            // Aktivace nové
            e.currentTarget.classList.add('active');
            const targetId = e.currentTarget.getAttribute('data-target');
            const targetModule = document.getElementById(targetId);
            
            if (targetModule) {
                targetModule.classList.remove('hidden');
                // Pokud je to mapa, inicializuj ji
                if (targetId === 'module_map') {
                    setTimeout(initMap, 100);
                }
            }
        });
    });
}

function addChatMessage(text, sender) {
    const container = document.getElementById('chat_messages');
    if (!container) return;
    
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
    bubble.innerText = text;
    
    div.appendChild(bubble);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}
