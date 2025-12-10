/* ==========================================
   DB.JS - IndexedDB Wrapper (Ukládání dat)
   ========================================== */

class XRotDB {
    constructor() {
        this.db = null;
        this.dbName = 'XRotDB';
        this.version = 1;
    }
    
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = (event) => {
                console.error("DB Error:", event.target.error);
                reject(request.error);
            };

            request.onsuccess = (event) => {
                this.db = request.result;
                console.log('✓ Database initialized');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 1. Store pro servisní záznamy
                if (!db.objectStoreNames.contains('serviceRecords')) {
                    const srvStore = db.createObjectStore('serviceRecords', { keyPath: 'id', autoIncrement: true });
                    srvStore.createIndex('date', 'date', { unique: false });
                }
                
                // 2. Store pro logy motoru
                if (!db.objectStoreNames.contains('engineLogs')) {
                    const logStore = db.createObjectStore('engineLogs', { keyPath: 'id', autoIncrement: true });
                    logStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }
    
    // Přidání dat
    async add(storeName, data) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // Čtení všech dat
    async getAll(storeName) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// Inicializace a export
const db = new XRotDB();
db.init().catch(console.error);
// ... (kód třídy XRotDB zůstává stejný) ...

// Na konci souboru:
window.XRotDB = XRotDB; 