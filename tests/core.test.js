// Testujeme čistou logiku bez závislosti na prohlížeči
import { validateMessage, calculateRPM, getAIResponseMock } from '../js/modules-core.js';

describe('XRot Core Module Tests', () => {

    // Test 1: Validace prázdného vstupu
    test('validateMessage should reject empty strings', () => {
        const result = validateMessage('   ');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Message cannot be empty');
    });

    // Test 2: XSS Sanitizace
    test('validateMessage should sanitize HTML tags', () => {
        const result = validateMessage('<script>alert("hack")</script>');
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toContain('&lt;script&gt;');
    });

    // Test 3: Logika RPM (Motor vypnutý)
    test('calculateRPM should return 0 when engine is off', () => {
        expect(calculateRPM(false, false)).toBe(0);
        expect(calculateRPM(false, true)).toBe(0);
    });

    // Test 4: Logika RPM (Pracovní otáčky)
    test('calculateRPM should return 3200 when PTO is active', () => {
        expect(calculateRPM(true, true)).toBe(3200);
    });

    // Test 5: Async AI Error Handling
    test('getAIResponseMock should handle invalid input gracefully', async () => {
        const response = await getAIResponseMock(''); // Invalid empty
        expect(response.success).toBe(false);
        expect(response.text).toContain('chybě');
        expect(response.errorDetail).toBe('Message cannot be empty');
    });
});
