/* ==========================================
   DB.JS - IndexedDB Wrapper (ES Module)
   Verze: 2.1 - Production Ready
   ========================================== */

class XRotDB {
    constructor() {
        this.db = null;
        this.dbName = 'XRotDB';
        this.version = 2; // Zvýšeno kvůli nové structure
        this.initialized = false;
    }
    
    async init() {
        if (this.initialized && this.db) return this.db;
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => {
                console.error('[DB] Init Error:', request.error);
                reject(new Error(`Database init failed: ${request.error}`));
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.initialized = true;
                console.log('[DB] ✓ Initialized successfully');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 1. Servisní záznamy
                if (!db.objectStoreNames.contains('serviceRecords')) {
                    const srvStore = db.createObjectStore('serviceRecords', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    srvStore.createIndex('machineId', 'machineId', { unique: false });
                    srvStore.createIndex('date', 'date', { unique: false });
                    srvStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                // 2. Logy motoru (telemetrie)
                if (!db.objectStoreNames.contains('engineLogs')) {
                    const logStore = db.createObjectStore('engineLogs', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    logStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                // 3. Nastavení (key-value store)
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }
    
    // ========== CRUD OPERACE ==========
    
    async add(storeName, data) {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.add({
                ...data,
                timestamp: data.timestamp || Date.now()
            });
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(`Add failed: ${request.error}`));
        });
    }
    
    async getAll(storeName) {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(`GetAll failed: ${request.error}`));
        });
    }
    
    async getById(storeName, id) {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(`GetById failed: ${request.error}`));
        });
    }
    
    async delete(storeName, id) {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(new Error(`Delete failed: ${request.error}`));
        });
    }
    
    // ========== SPECIALIZOVANÉ METODY ==========
    
    async addService(record) {
        return this.add('serviceRecords', {
            machineId: record.machineId || 'XROT95',
            date: record.date || new Date().toISOString().split('T')[0],
            mth: parseFloat(record.mth) || 0,
            type: record.type || 'Záznam',
            desc: record.desc || '',
            timestamp: Date.now()
        });
    }
    
    async getServicesByMachine(machineId) {
        const allServices = await this.getAll('serviceRecords');
        return allServices
            .filter(s => s.machineId === machineId)
            .sort((a, b) => b.timestamp - a.timestamp);
    }
    
    async setSetting(key, value) {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('settings', 'readwrite');
            const store = tx.objectStore('settings');
            const request = store.put({ key, value });
            
            request.onsuccess = () => resolve({ key, value });
            request.onerror = () => reject(new Error(`SetSetting failed: ${request.error}`));
        });
    }
    
    async getSetting(key) {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('settings', 'readonly');
            const store = tx.objectStore('settings');
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(new Error(`GetSetting failed: ${request.error}`));
        });
    }
    
    async addTelemetry(data) {
        return this.add('engineLogs', {
            rpm: data.rpm || 0,
            temp: data.temp || 0,
            tilt: data.tilt || 0,
            battery: data.battery || 100,
            gps: data.gps || null
        });
    }
    
    async getTelemetryLast24h() {
        const allLogs = await this.getAll('engineLogs');
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        return allLogs.filter(log => log.timestamp > oneDayAgo);
    }
    
    async pruneTelemetry(keepDays = 7) {
        await this.ensureInit();
        const cutoff = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
        
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('engineLogs', 'readwrite');
            const store = tx.objectStore('engineLogs');
            const index = store.index('timestamp');
            const range = IDBKeyRange.upperBound(cutoff);
            const request = index.openCursor(range);
            
            let deletedCount = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    deletedCount++;
                    cursor.continue();
                } else {
                    console.log(`[DB] Pruned ${deletedCount} old telemetry records`);
                    resolve(deletedCount);
                }
            };
            
            request.onerror = () => reject(new Error(`Prune failed: ${request.error}`));
        });
    }
    
    async exportDB() {
        const services = await this.getAll('serviceRecords');
        const logs = await this.getAll('engineLogs');
        const settings = await this.getAll('settings');
        
        return {
            version: this.version,
            exported: new Date().toISOString(),
            serviceRecords: services,
            engineLogs: logs,
            settings: settings
        };
    }
    
    async importDB(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid import data');
        }
        
        await this.ensureInit();
        
        // Import services
        if (Array.isArray(data.serviceRecords)) {
            for (const record of data.serviceRecords) {
                await this.add('serviceRecords', record);
            }
        }
        
        // Import settings
        if (Array.isArray(data.settings)) {
            for (const setting of data.settings) {
                await this.setSetting(setting.key, setting.value);
            }
        }
        
        return true;
    }
    
    async clearAllData() {
        await this.ensureInit();
        const stores = ['serviceRecords', 'engineLogs', 'settings'];
        
        for (const storeName of stores) {
            await new Promise((resolve, reject) => {
                const tx = this.db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const request = store.clear();
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(new Error(`Clear ${storeName} failed`));
            });
        }
        
        return true;
    }
    
    // Helper pro zajištění inicializace
    async ensureInit() {
        if (!this.initialized || !this.db) {
            await this.init();
        }
    }
}

// Singleton instance + export
const db = new XRotDB();
export { db, XRotDB };
export default db;
