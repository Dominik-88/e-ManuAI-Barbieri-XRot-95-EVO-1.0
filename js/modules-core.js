/* =========================================================
   MODULE: CORE LOGIC & VALIDATION
   ========================================================= */

// Debug flag - v produkci (build) by se měl nastavit na false
const DEBUG_MODE = true;

/**
 * Bezpečný logger, který funguje jen v debug režimu
 */
export const logger = {
    log: (msg) => { if (DEBUG_MODE) console.log(`[LOG]: ${msg}`); },
    warn: (msg) => console.warn(`[WARN]: ${msg}`),
    error: (msg) => console.error(`[ERROR]: ${msg}`)
};

/**
 * Validuje vstupní zprávu pro AI
 * @param {string} message 
 * @returns {object} { isValid: boolean, error: string|null, sanitized: string }
 */
export function validateMessage(message) {
    if (typeof message !== 'string') {
        return { isValid: false, error: 'Input must be a string', sanitized: '' };
    }
    const trimmed = message.trim();
    if (trimmed.length === 0) {
        return { isValid: false, error: 'Message cannot be empty', sanitized: '' };
    }
    if (trimmed.length > 500) {
        return { isValid: false, error: 'Message too long (max 500 chars)', sanitized: '' };
    }
    // Ochrana proti XSS (základní)
    const sanitized = trimmed.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return { isValid: true, error: null, sanitized };
}

/**
 * Vypočítá otáčky na základě stavu motoru
 * @param {boolean} isEngineOn 
 * @param {boolean} isPtoOn 
 * @returns {number} RPM
 */
export function calculateRPM(isEngineOn, isPtoOn) {
    if (!isEngineOn) return 0;
    // PTO přidává zátěž, ale motor drží pracovní otáčky
    return isPtoOn ? 3200 : 1450;
}

/**
 * Simuluje AI odpověď s error handlingem
 * @param {string} msg 
 * @returns {Promise<{success: boolean, text: string}>}
 */
export async function getAIResponseMock(msg) {
    try {
        const validation = validateMessage(msg);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        // Simulace asynchronního volání API
        await new Promise(resolve => setTimeout(resolve, 500));

        const lower = validation.sanitized.toLowerCase();
        let responseText = "Nerozumím dotazu.";

        if (lower.includes('olej')) responseText = "Olej SAE 10W-30, interval 50h.";
        else if (lower.includes('svah')) responseText = "Max náklon 45°.";
        else if (lower.includes('start')) responseText = "Startování motoru...";

        return { success: true, text: responseText };

    } catch (error) {
        logger.error(`AI Module Error: ${error.message}`);
        return { 
            success: false, 
            text: "Omlouvám se, došlo k chybě systému.", 
            errorDetail: error.message 
        };
    }
}
