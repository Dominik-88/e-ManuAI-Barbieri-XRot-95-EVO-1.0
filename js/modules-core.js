export const logger = {
    log: (msg) => console.log(`[LOG] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`)
};

export function validateMessage(msg) {
    if (!msg || msg.trim() === "") return { isValid: false, error: "Prázdná zpráva" };
    return { isValid: true, sanitized: msg.replace(/</g, "&lt;") };
}

export function calculateRPM(engineOn) {
    return engineOn ? 3200 : 0;
}

export async function getAIResponseMock(msg) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({ success: true, text: "Jsem AI XRot. Systém běží normálně." });
        }, 500);
    });
}
