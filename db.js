/* ============================================================
   XROT95 DATABASE CORE - REAL DATA ONLY
   Zdroj dat: BARB_INVE.pdf, Barb aktualni.pdf
============================================================ */

export const db = (() => {
  const DB_NAME = "xrot-pro-db";
  const DB_VERSION = 2;
  let dbInstance = null;

  [span_1](start_span)/* --- 1. HARD DATA Z MANUÁLU[span_1](end_span) --- */
  const MAINTENANCE_SCHEDULE = [
    { hours: 50, task: "Výměna motorového oleje (První záběh)", type: "oil", note: "Agip Rotra MP SAE 10W-30 (2.2 L)" },
    { hours: 50, task: "Kontrola napnutí pásů", type: "check", note: "Vůle max 10-15mm při tlaku 5kg" },
    { hours: 100, task: "Výměna vzduchového filtru", type: "filter", note: "Papírová vložka + Pěnový předfiltr" },
    { hours: 200, task: "Výměna motorového oleje (Pravidelná)", type: "oil", note: "Každých 200 Mth" },
    { hours: 200, task: "Mazání spojů a čepů", type: "lube", note: "Dle schématu mazání (Obr. 21)" },
    { hours: 500, task: "Výměna hydraulického oleje", type: "hydraulics", note: "ISO VG 46 (10 L)" },
    { hours: 500, task: "Výměna oleje v převodovce", type: "gearbox", note: "SAE 80W90 (0.5 L)" }
  ];

  [span_2](start_span)/* --- 2. CHYBOVÉ KÓDY[span_2](end_span) --- */
  const ERROR_CODES = {
    "101": "Chyba CAN1 (Dálkový ovladač) - Restartujte jednotku",
    "102": "Chyba CAN2 (Driver) - Restartujte jednotku",
    "103": "Chyba CAN3 (ECU) - Restartujte jednotku",
    "104": "Rozpojený nouzový obvod - Zkontrolujte STOP tlačítka",
    "106": "Upozornění na tlak oleje - Zkontrolujte hladinu",
    "107": "PŘEVRÁCENÍ STROJE - Postavte stroj na pásy, čekejte 30 min",
    "204": "Přetížení Driveru 1 - Snižte rychlost / zátěž",
    "208": "Teplota Driveru - Nechte vychladnout"
  };

  [span_3](start_span)/* --- 3. TECHNICKÁ SPECIFIKACE[span_3](end_span) --- */
  const TECH_SPECS = {
    engine: "Kawasaki FS730V EFI (23 HP)",
    oil_cap: "2.1 L (SAE 10W-40)",
    fuel_cap: "32 L (2x 15L nádrže)",
    slope_max: "55° (Limit motoru)",
    weight: "480 kg",
    pressure: "168 g/cm²"
  };

  /* --- INDEXED DB LOGIKA --- */
  async function init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("service_log")) {
          db.createObjectStore("service_log", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      };
      req.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };
      req.onerror = (e) => reject(e);
    });
  }

  async function addRecord(record) {
    const tx = dbInstance.transaction("service_log", "readwrite");
    return new Promise((resolve) => {
      tx.objectStore("service_log").add(record);
      tx.oncomplete = () => resolve(true);
    });
  }

  async function getRecords() {
    const tx = dbInstance.transaction("service_log", "readonly");
    return new Promise((resolve) => {
      const req = tx.objectStore("service_log").getAll();
      req.onsuccess = () => resolve(req.result);
    });
  }

  async function getMth() {
    const tx = dbInstance.transaction("settings", "readonly");
    return new Promise((resolve) => {
      const req = tx.objectStore("settings").get("mth");
      req.onsuccess = () => resolve(req.result ? req.result.value : 0.0);
    });
  }

  async function setMth(value) {
    const tx = dbInstance.transaction("settings", "readwrite");
    tx.objectStore("settings").put({ key: "mth", value: parseFloat(value) });
  }

  return { 
    init, addRecord, getRecords, getMth, setMth, 
    SCHEDULE: MAINTENANCE_SCHEDULE, 
    ERRORS: ERROR_CODES,
    SPECS: TECH_SPECS
  };
})();
