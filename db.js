/* ============================================================
   XROT95 ULTIMATE MANUAL — IndexedDB WRAPPER
   Databáze: xrot-manual-db (verze 1)
   Autor: Barbieri Systems 2025
============================================================ */

export const db = (() => {
  const DB_NAME = "xrot-manual-db";
  const DB_VERSION = 1;
  let instance = null;

  /* -------------------- VALIDACE -------------------- */
  const sanitize = (val) => {
    if (typeof val === "string") return val.replace(/[<>]/g, "");
    if (typeof val === "object" && val !== null)
      return JSON.parse(JSON.stringify(val));
    return val;
  };
  const uuid = () => "id-" + Math.random().toString(36).slice(2) + Date.now();

  /* -------------------- INIT -------------------- */
  function open() {
    return new Promise((resolve, reject) => {
      if (instance) return resolve(instance);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onupgradeneeded = (e) => {
        const dbx = e.target.result;
        // Machines
        if (!dbx.objectStoreNames.contains("machines")) {
          const store = dbx.createObjectStore("machines", { keyPath: "id" });
          store.createIndex("type", "type");
          store.createIndex("name", "name");
        }
        // Service logs
        if (!dbx.objectStoreNames.contains("service_logs")) {
          const store = dbx.createObjectStore("service_logs", { keyPath: "id" });
          store.createIndex("machineId", "machineId");
          store.createIndex("date", "date");
          store.createIndex("type", "type");
        }
        // Telemetry
        if (!dbx.objectStoreNames.contains("xrot_telemetry")) {
          const store = dbx.createObjectStore("xrot_telemetry", { keyPath: "id", autoIncrement: true });
          store.createIndex("machineId", "machineId");
          store.createIndex("ts", "ts");
        }
        // Settings
        if (!dbx.objectStoreNames.contains("settings")) {
          dbx.createObjectStore("settings", { keyPath: "key" });
        }
        // Simulations
        if (!dbx.objectStoreNames.contains("simulations")) {
          dbx.createObjectStore("simulations", { keyPath: "id" });
        }
      };
      req.onsuccess = () => {
        instance = req.result;
        instance.onversionchange = () => {
          instance.close();
          alert("Nová verze databáze – aktualizujte stránku.");
        };
        resolve(instance);
      };
    });
  }

  /* -------------------- GENERICKÉ METODY -------------------- */
  async function withStore(store, mode, fn) {
    const dbx = await open();
    return new Promise((resolve, reject) => {
      const tx = dbx.transaction(store, mode);
      const st = tx.objectStore(store);
      const result = fn(st);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
    });
  }

  /* -------------------- MACHINES -------------------- */
  const addMachine = async (obj) => {
    obj = sanitize(obj);
    obj.createdAt = new Date().toISOString();
    return withStore("machines", "readwrite", (st) => st.put(obj));
  };
  const getMachine = async (id) =>
    withStore("machines", "readonly", (st) => st.get(id));
  const getMachines = async () =>
    withStore("machines", "readonly", (st) => st.getAll());
  const updateMachine = async (id, patch) => {
    const dbx = await open();
    const tx = dbx.transaction("machines", "readwrite");
    const st = tx.objectStore("machines");
    const obj = await new Promise((res) => {
      const req = st.get(id);
      req.onsuccess = () => res(req.result);
    });
    if (!obj) throw new Error("Machine not found");
    Object.assign(obj, sanitize(patch), { updatedAt: new Date().toISOString() });
    st.put(obj);
  };
  const deleteMachine = (id) =>
    withStore("machines", "readwrite", (st) => st.delete(id));

  /* -------------------- SERVICE LOGS -------------------- */
  const addService = async (log) => {
    log.id = log.id || uuid();
    log.createdAt = new Date().toISOString();
    log = sanitize(log);
    await withStore("service_logs", "readwrite", (st) => st.put(log));
    try { if (typeof onServiceAdded === "function") onServiceAdded(log); } catch {}
    return log.id;
  };
  const getServicesByMachine = async (machineId, opts = {}) => {
    const { limit = 1000, sort = "desc", filter = null } = opts;
    const dbx = await open();
    const tx = dbx.transaction("service_logs", "readonly");
    const st = tx.objectStore("service_logs").index("machineId");
    const req = st.getAll(IDBKeyRange.only(machineId));
    return new Promise((res) => {
      req.onsuccess = () => {
        let data = req.result;
        if (filter) data = data.filter(filter);
        data.sort((a, b) => (sort === "desc" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
        res(data.slice(0, limit));
      };
    });
  };
  const updateService = async (id, patch) => {
    const dbx = await open();
    const tx = dbx.transaction("service_logs", "readwrite");
    const st = tx.objectStore("service_logs");
    const obj = await new Promise((res) => {
      const req = st.get(id);
      req.onsuccess = () => res(req.result);
    });
    if (!obj) throw new Error("Service record not found");
    Object.assign(obj, sanitize(patch));
    st.put(obj);
  };
  const deleteService = (id) =>
    withStore("service_logs", "readwrite", (st) => st.delete(id));

  /* -------------------- TELEMETRY -------------------- */
  const addTelemetry = async (point) => {
    point = sanitize(point);
    if (!point.machineId) point.machineId = "XROT95";
    point.ts = point.ts || new Date().toISOString();
    await withStore("xrot_telemetry", "readwrite", (st) => st.put(point));
    try { if (typeof onTelemetryPoint === "function") onTelemetryPoint(point.machineId, point); } catch {}
    await pruneTelemetry(point.machineId);
  };

  const queryTelemetry = async (machineId, fromTs, toTs) => {
    const dbx = await open();
    const tx = dbx.transaction("xrot_telemetry", "readonly");
    const st = tx.objectStore("xrot_telemetry").index("machineId");
    const req = st.getAll(IDBKeyRange.only(machineId));
    return new Promise((res) => {
      req.onsuccess = () => {
        let data = req.result;
        if (fromTs || toTs) {
          data = data.filter((d) => (!fromTs || d.ts >= fromTs) && (!toTs || d.ts <= toTs));
        }
        res(data);
      };
    });
  };

  const clearTelemetry = (machineId) =>
    withStore("xrot_telemetry", "readwrite", (st) => {
      const req = st.index("machineId").getAllKeys(machineId);
      req.onsuccess = () => req.result.forEach((key) => st.delete(key));
    });

  const pruneTelemetry = async (machineId, max = 5000) => {
    const data = await queryTelemetry(machineId);
    if (data.length > max) {
      const toRemove = data.slice(0, data.length - max);
      const dbx = await open();
      const tx = dbx.transaction("xrot_telemetry", "readwrite");
      const st = tx.objectStore("xrot_telemetry");
      toRemove.forEach((d) => st.delete(d.id));
      console.log("Pruned", toRemove.length, "telemetry points");
    }
  };

  /* -------------------- SETTINGS -------------------- */
  const setSetting = async (key, value) =>
    withStore("settings", "readwrite", (st) => st.put({ key, value }));
  const getSetting = async (key) =>
    withStore("settings", "readonly", (st) => st.get(key));

  /* -------------------- SIMULATIONS -------------------- */
  const saveSimulation = async (sim) => {
    sim.id = sim.id || uuid();
    sim = sanitize(sim);
    return withStore("simulations", "readwrite", (st) => st.put(sim));
  };
  const listSimulations = async (machineId) => {
    const dbx = await open();
    const tx = dbx.transaction("simulations", "readonly");
    const st = tx.objectStore("simulations");
    const req = st.getAll();
    return new Promise((res) => {
      req.onsuccess = () => res(req.result.filter((x) => x.machineId === machineId));
    });
  };
  const getSimulation = async (id) =>
    withStore("simulations", "readonly", (st) => st.get(id));

  /* -------------------- EXPORT / IMPORT -------------------- */
  const exportDB = async () => {
    const dbx = await open();
    const stores = ["machines", "service_logs", "xrot_telemetry", "settings", "simulations"];
    const data = {};
    for (const s of stores) {
      const tx = dbx.transaction(s, "readonly");
      const st = tx.objectStore(s);
      const req = st.getAll();
      data[s] = await new Promise((r) => { req.onsuccess = () => r(req.result); });
    }
    return data;
  };

  const importDB = async (data) => {
    const dbx = await open();
    for (const [storeName, arr] of Object.entries(data)) {
      const tx = dbx.transaction(storeName, "readwrite");
      const st = tx.objectStore(storeName);
      arr.forEach((o) => st.put(o));
    }
  };

  return {
    open,
    addMachine, getMachine, getMachines, updateMachine, deleteMachine,
    addService, getServicesByMachine, updateService, deleteService,
    addTelemetry, queryTelemetry, clearTelemetry,
    setSetting, getSetting,
    saveSimulation, listSimulations, getSimulation,
    exportDB, importDB,
  };
})();

/* ============================================================
   HOOKS — připraveno pro budoucí rozšíření
============================================================ */
export function onTelemetryPoint(machineId, point) {
  // Hook volaný při novém telemetrickém bodě
  // Lze použít pro cloud sync / logování
}
export function onServiceAdded(record) {
  // Hook volaný při přidání servisního záznamu
}
export function simulateBLE(message) {
  console.log("Simulované BLE:", message);
}