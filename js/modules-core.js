/* =========================================================
   MODULE: CORE LOGIC & SECURITY
   ========================================================= */

const DEBUG_MODE = true;

export const logger = {
    log: (msg) => { if (DEBUG_MODE) console.log(`[LOG]: ${msg}`); },
    warn: (msg) => console.warn(`[WARN]: ${msg}`),
    error: (msg) => console.error(`[ERROR]: ${msg}`)
};

/**
 * Validace a sanitizace vstupu (Security fix)
 * @param {string} message 
 */
export function validateMessage(message) {
    if (typeof message !== 'string') {
        return { isValid: false, error: 'Neplatný formát dat.' };
    }
    
    // Trim
    const trimmed = message.trim();
    
    // Validace délky
    if (trimmed.length === 0) return { isValid: false, error: 'Zpráva nesmí být prázdná.' };
    if (trimmed.length > 250) return { isValid: false, error: 'Zpráva je příliš dlouhá (max 250 znaků).' };
    
    // Sanitizace (odstranění nebezpečných znaků pro HTML kontext)
    // Používáme textContent v DOMu, ale pro jistotu čistíme i string
    const sanitized = trimmed
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    return { isValid: true, error: null, sanitized };
}

export function calculateRPM(isEngineOn, isPtoOn) {
    if (!isEngineOn) return 0;
    return isPtoOn ? 3200 : 1450;
}

export async function getAIResponseMock(msg) {
    try {
        await new Promise(resolve => setTimeout(resolve, 600)); // Simulace sítě

        const lower = msg.toLowerCase();
        let responseText = "Nerozumím dotazu. Zkuste se zeptat na olej, svah nebo GPS.";

        if (lower.includes('olej')) responseText = "Olej SAE 10W-30, interval výměny 50 motohodin.";
        else if (lower.includes('svah')) responseText = "Bezpečnostní limit náklonu je 45°.";
        else if (lower.includes('start')) responseText = "Pro start stiskněte tlačítko 'START MOTORU'.";
        
        return { success: true, text: responseText };
    } catch (error) {
        return { success: false, text: "Chyba AI modulu.", errorDetail: error.message };
    }
}
