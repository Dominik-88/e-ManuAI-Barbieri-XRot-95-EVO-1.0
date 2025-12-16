/* ==========================================
   CORE MODULE TESTS
   Verze: 3.0 - Comprehensive Test Suite
   ========================================== */

import { 
    validateMessage, 
    validateNumber,
    calculateRPM, 
    calculateFuelConsumption,
    analyzeTilt,
    getAIResponseMock,
    createTelemetrySnapshot,
    aggregateTelemetry,
    formatDate,
    XRotError,
    handleError
} from '../js/modules-core.js';

describe('XRot Core Module - Validation', () => {
    
    test('validateMessage should reject empty strings', () => {
        const result = validateMessage('   ');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('prázdná');
    });
    
    test('validateMessage should reject null/undefined', () => {
        expect(validateMessage(null).isValid).toBe(false);
        expect(validateMessage(undefined).isValid).toBe(false);
    });
    
    test('validateMessage should sanitize HTML entities', () => {
        const dangerous = '<script>alert("xss")</script>';
        const result = validateMessage(dangerous);
        
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toContain('&lt;script&gt;');
        expect(result.sanitized).not.toContain('<script>');
    });
    
    test('validateMessage should sanitize quotes and slashes', () => {
        const result = validateMessage('Test "quote" and /slash/');
        
        expect(result.sanitized).toContain('&quot;');
        expect(result.sanitized).toContain('&#x2F;');
    });
    
    test('validateMessage should enforce length limits', () => {
        const longMessage = 'a'.repeat(501);
        const result = validateMessage(longMessage);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('500');
    });
    
    test('validateNumber should validate numeric inputs', () => {
        expect(validateNumber('42').isValid).toBe(true);
        expect(validateNumber('42').value).toBe(42);
        expect(validateNumber('3.14').value).toBeCloseTo(3.14);
    });
    
    test('validateNumber should reject invalid numbers', () => {
        expect(validateNumber('abc').isValid).toBe(false);
        expect(validateNumber('').isValid).toBe(false);
        expect(validateNumber(null).isValid).toBe(false);
    });
    
    test('validateNumber should enforce min/max bounds', () => {
        expect(validateNumber('5', 0, 10).isValid).toBe(true);
        expect(validateNumber('15', 0, 10).isValid).toBe(false);
        expect(validateNumber('-5', 0, 10).isValid).toBe(false);
    });
});

describe('XRot Core Module - Motor Calculations', () => {
    
    test('calculateRPM should return 0 when engine is off', () => {
        expect(calculateRPM(false, false, 0)).toBe(0);
        expect(calculateRPM(false, true, 50)).toBe(0);
    });
    
    test('calculateRPM should return idle RPM when PTO is inactive', () => {
        expect(calculateRPM(true, false, 0)).toBe(800);
    });
    
    test('calculateRPM should return working RPM when PTO is active', () => {
        const rpm = calculateRPM(true, true, 0);
        expect(rpm).toBeGreaterThanOrEqual(3200);
    });
    
    test('calculateRPM should scale with load', () => {
        const rpmLow = calculateRPM(true, true, 0);
        const rpmHigh = calculateRPM(true, true, 100);
        
        expect(rpmHigh).toBeGreaterThan(rpmLow);
        expect(rpmHigh).toBeLessThanOrEqual(3600);
    });
    
    test('calculateFuelConsumption should handle zero RPM', () => {
        expect(calculateFuelConsumption(0, 10)).toBe(0);
    });
    
    test('calculateFuelConsumption should calculate correctly', () => {
        const consumption = calculateFuelConsumption(3200, 10);
        const parsed = parseFloat(consumption);
        
        expect(parsed).toBeGreaterThan(0);
        expect(parsed).toBeLessThan(200); // Sanity check
    });
});

describe('XRot Core Module - Safety Checks', () => {
    
    test('analyzeTilt should detect safe tilt', () => {
        const result = analyzeTilt(5, 5);
        
        expect(result.status).toBe('NORMAL');
        expect(result.severity).toBe(0);
        expect(result.isSafe).toBe(true);
    });
    
    test('analyzeTilt should detect warning tilt', () => {
        const result = analyzeTilt(12, 12);
        
        expect(result.status).toBe('WARNING');
        expect(result.severity).toBe(1);
        expect(result.isSafe).toBe(false);
    });
    
    test('analyzeTilt should detect critical tilt', () => {
        const result = analyzeTilt(20, 20);
        
        expect(result.status).toBe('CRITICAL');
        expect(result.severity).toBe(2);
        expect(result.isSafe).toBe(false);
    });
    
    test('analyzeTilt should calculate total tilt correctly', () => {
        const result = analyzeTilt(3, 4);
        expect(parseFloat(result.total)).toBeCloseTo(5, 1);
    });
});

describe('XRot Core Module - AI Mock', () => {
    
    test('getAIResponseMock should reject empty messages', async () => {
        const response = await getAIResponseMock('');
        
        expect(response.success).toBe(false);
        expect(response.errorDetail).toBeTruthy();
    });
    
    test('getAIResponseMock should return response for valid input', async () => {
        const response = await getAIResponseMock('test');
        
        expect(response.success).toBe(true);
        expect(response.text).toBeTruthy();
        expect(typeof response.text).toBe('string');
    });
    
    test('getAIResponseMock should match patterns', async () => {
        const servisResponse = await getAIResponseMock('servis');
        expect(servisResponse.text).toContain('servis');
        
        const olejResponse = await getAIResponseMock('olej');
        expect(olejResponse.text).toContain('olej');
    });
    
    test('getAIResponseMock should include timestamp', async () => {
        const response = await getAIResponseMock('test');
        
        expect(response.timestamp).toBeTruthy();
        expect(typeof response.timestamp).toBe('number');
    });
});

describe('XRot Core Module - Telemetry', () => {
    
    test('createTelemetrySnapshot should create valid snapshot', () => {
        const machineState = {
            rpm: 3200,
            temp: 75,
            tilt: 5,
            battery: 95,
            engineOn: true,
            gps: { lat: 49.195, lon: 16.606 }
        };
        
        const snapshot = createTelemetrySnapshot(machineState);
        
        expect(snapshot.timestamp).toBeTruthy();
        expect(snapshot.rpm).toBe(3200);
        expect(snapshot.temp).toBe(75);
        expect(snapshot.engineOn).toBe(true);
        expect(snapshot.gps).toEqual(machineState.gps);
    });
    
    test('createTelemetrySnapshot should handle missing values', () => {
        const snapshot = createTelemetrySnapshot({});
        
        expect(snapshot.rpm).toBe(0);
        expect(snapshot.temp).toBe(0);
        expect(snapshot.battery).toBe(100);
        expect(snapshot.gps).toBeNull();
    });
    
    test('aggregateTelemetry should aggregate correctly', () => {
        const logs = [
            { timestamp: Date.now(), rpm: 3000, temp: 70, tilt: 5 },
            { timestamp: Date.now(), rpm: 3200, temp: 75, tilt: 6 },
            { timestamp: Date.now(), rpm: 3100, temp: 72, tilt: 5 }
        ];
        
        const aggregated = aggregateTelemetry(logs, 5);
        
        expect(aggregated.length).toBeGreaterThan(0);
        expect(aggregated[0].avgRPM).toBeCloseTo(3100, 0);
        expect(aggregated[0].count).toBe(3);
    });
    
    test('aggregateTelemetry should handle empty logs', () => {
        const result = aggregateTelemetry([]);
        expect(result).toEqual([]);
    });
});

describe('XRot Core Module - Utilities', () => {
    
    test('formatDate should format dates correctly', () => {
        const timestamp = new Date('2024-01-15T14:30:00').getTime();
        
        const short = formatDate(timestamp, 'short');
        expect(short).toContain('15');
        
        const long = formatDate(timestamp, 'long');
        expect(long).toBeTruthy();
        
        const time = formatDate(timestamp, 'time');
        expect(time).toContain(':');
    });
});

describe('XRot Core Module - Error Handling', () => {
    
    test('XRotError should create custom error', () => {
        const error = new XRotError('Test error', 'TEST_001', 'warning');
        
        expect(error.message).toBe('Test error');
        expect(error.code).toBe('TEST_001');
        expect(error.severity).toBe('warning');
        expect(error.timestamp).toBeTruthy();
    });
    
    test('handleError should process errors correctly', () => {
        const error = new Error('Test error');
        const result = handleError(error, 'TEST_CONTEXT');
        
        expect(result.message).toBe('Test error');
        expect(result.context).toBe('TEST_CONTEXT');
        expect(result.timestamp).toBeTruthy();
    });
    
    test('handleError should handle unknown errors', () => {
        const result = handleError({}, 'TEST');
        
        expect(result.message).toContain('Neznámá chyba');
        expect(result.code).toBe('UNKNOWN');
    });
});

describe('XRot Core Module - Integration Tests', () => {
    
    test('Full workflow: validate -> calculate -> telemetry', () => {
        // 1. Validate input
        const validation = validateMessage('Start motor');
        expect(validation.isValid).toBe(true);
        
        // 2. Calculate RPM
        const rpm = calculateRPM(true, true, 50);
        expect(rpm).toBeGreaterThan(0);
        
        // 3. Create telemetry
        const snapshot = createTelemetrySnapshot({ rpm, temp: 75, tilt: 5 });
        expect(snapshot.rpm).toBe(rpm);
        expect(snapshot.timestamp).toBeTruthy();
    });
    
    test('Safety workflow: tilt detection and validation', () => {
        const tiltX = 18;
        const tiltY = 10;
        
        const tiltAnalysis = analyzeTilt(tiltX, tiltY);
        
        expect(tiltAnalysis.status).not.toBe('NORMAL');
        expect(tiltAnalysis.severity).toBeGreaterThan(0);
        
        if (!tiltAnalysis.isSafe) {
            // System should trigger warning
            expect(['WARNING', 'CRITICAL']).toContain(tiltAnalysis.status);
        }
    });
});
