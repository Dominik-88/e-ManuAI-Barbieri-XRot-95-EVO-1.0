/* ============================================================
   XROT95 ULTIMATE MANUAL — MODULE: SERVICE BOOK
   Autor: Barbieri Systems 2025
============================================================ */

import { db } from './db.js';

/* ============================================================
   UI KOMPONENTA: SERVISNÍ KNIHA
============================================================ */

export const ServiceBook = (() => {

  /* -------------------- STAV -------------------- */
  let currentMachine = null;
  let serviceList = [];
  let sortDir = 'desc';

  /* -------------------- INIT -------------------- */
  async function init(machine) {
    currentMachine = machine;
    const root = document.querySelector('#module-servicebook');
    root.innerHTML = renderLayout();
    attachEvents(root);
    await refreshList();
  }

  /* -------------------- UI -------------------- */
  function renderLayout() {
    return `
      <header class="module-header">
        <h2>🧰 Servisní kniha — <span id="sb-machine-name">${currentMachine.name}</span></h2>
        <div class="sb-tools">
          <button id="sb-add">+ Nový záznam</button>
          <button id="sb-export">📤 Export</button>
          <button id="sb-import">📥 Import</button>
          <input id="sb-search" placeholder="Hledat..." aria-label="Hledat v servisní knize">
        </div>
      </header>
      <section id="sb-form" class="hidden" aria-live="polite"></section>
      <section id="sb-stats"></section>
      <section id="sb-list" class="sb-list"></section>
      <input type="file" id="sb-import-file" accept="application/json" hidden>
    `;
  }

  function renderForm(record = {}) {
    return `
      <form id="sb-form-inner">
        <label>Datum <input type="date" id="sb-date" value="${record.date ? record.date.split('T')[0] : ''}" required></label>
        <label>Motohodiny <input type="number" id="sb-mth" value="${record.mth || ''}" step="0.1" required></label>
        <label>Typ úkonu
          <select id="sb-type" required>
            <option value="">– Vyber –</option>
            <option value="oil_change">Výměna oleje</option>
            <option value="filter_change">Výměna filtru</option>
            <option value="inspection">Prohlídka</option>
            <option value="repair">Oprava</option>
            <option value="custom">Jiné</option>
          </select>
        </label>
        <label>Mechanik <input type="text" id="sb-mechanic" value="${record.mechanic || ''}" maxlength="50"></label>
        <label>Popis <textarea id="sb-desc" rows="2">${record.desc || ''}</textarea></label>
        <label>Náklady (Kč) <input type="number" id="sb-cost" value="${record.cost || ''}" step="0.1"></label>
        <label>Příloha <input type="file" id="sb-attachment"></label>
        <div class="sb-form-actions">
          <button type="submit">💾 Uložit</button>
          <button type="button" id="sb-cancel">Zrušit</button>
        </div>
      </form>
    `;
  }

  function renderStats(data) {
    if (!data.length) return `<p>Žádné servisní záznamy.</p>`;
    const last = data[0];
    const avg = (data.reduce((a, b) => a + (b.cost || 0), 0) / data.length).toFixed(1);
    const maxMth = Math.max(...data.map((x) => x.mth || 0));
    const next50 = Math.ceil(maxMth / 50) * 50 + 50;
    const next100 = Math.ceil(maxMth / 100) * 100 + 100;
    const next500 = Math.ceil(maxMth / 500) * 500 + 500;
    return `
      <div class="sb-stats-grid">
        <div>🕓 Poslední servis: <strong>${new Date(last.date).toLocaleDateString()}</strong></div>
        <div>⏱ Motohodiny: <strong>${maxMth}</strong></div>
        <div>💰 Průměrná cena: <strong>${avg} Kč</strong></div>
        <div>🔧 Další servis za 50 h: <strong>${next50 - maxMth}</strong></div>
        <div>🔧 Další servis za 100 h: <strong>${next100 - maxMth}</strong></div>
        <div>🔧 Další servis za 500 h: <strong>${next500 - maxMth}</strong></div>
      </div>
    `;
  }

  function renderListItem(rec) {
    const cost = rec.cost ? `<span class="sb-cost">${rec.cost} Kč</span>` : '';
    return `
      <div class="sb-item" data-id="${rec.id}">
        <div class="sb-main">
          <b>${new Date(rec.date).toLocaleDateString()}</b> — ${rec.type}
          <span class="sb-mth">${rec.mth} mth</span>
        </div>
        <div class="sb-meta">${rec.mechanic || '-'} · ${rec.desc || ''}</div>
        ${cost}
        <div class="sb-actions">
          <button class="sb-edit" title="Upravit">✏️</button>
          <button class="sb-delete" title="Smazat">🗑️</button>
        </div>
      </div>
    `;
  }

  /* -------------------- OVLÁDÁNÍ -------------------- */
  function attachEvents(root) {
    root.querySelector('#sb-add').onclick = () => showForm();
    root.querySelector('#sb-cancel')?.addEventListener('click', hideForm);
    root.querySelector('#sb-search').addEventListener('input', debounce(filterList, 200));
    root.querySelector('#sb-export').onclick = exportJSON;
    root.querySelector('#sb-import').onclick = () => root.querySelector('#sb-import-file').click();
    root.querySelector('#sb-import-file').onchange = importJSON;
  }

  async function showForm(record = {}) {
    const form = document.querySelector('#sb-form');
    form.classList.remove('hidden');
    form.innerHTML = renderForm(record);
    form.querySelector('#sb-cancel').onclick = hideForm;
    form.querySelector('#sb-form-inner').onsubmit = async (e) => {
      e.preventDefault();
      const log = collectForm(record.id);
      await db.addService(log);
      hideForm();
      await refreshList();
      toast('Záznam uložen');
    };
  }

  function hideForm() {
    const form = document.querySelector('#sb-form');
    form.classList.add('hidden');
  }

  function collectForm(id) {
    const date = document.querySelector('#sb-date').value;
    const mth = parseFloat(document.querySelector('#sb-mth').value);
    const type = document.querySelector('#sb-type').value;
    const mechanic = document.querySelector('#sb-mechanic').value.trim();
    const desc = document.querySelector('#sb-desc').value.trim();
    const cost = parseFloat(document.querySelector('#sb-cost').value || 0);
    return {
      id: id || undefined,
      machineId: currentMachine.id,
      date: new Date(date).toISOString(),
      mth,
      type,
      mechanic,
      desc,
      cost,
    };
  }

  async function refreshList() {
    serviceList = await db.getServicesByMachine(currentMachine.id, { sort: sortDir });
    document.querySelector('#sb-stats').innerHTML = renderStats(serviceList);
    const listHTML = serviceList.map(renderListItem).join('');
    const listEl = document.querySelector('#sb-list');
    listEl.innerHTML = listHTML;
    listEl.querySelectorAll('.sb-edit').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.sb-item').dataset.id;
        const rec = serviceList.find((r) => r.id === id);
        showForm(rec);
      })
    );
    listEl.querySelectorAll('.sb-delete').forEach((btn) =>
      btn.addEventListener('click', async (e) => {
        const id = e.target.closest('.sb-item').dataset.id;
        if (confirm('Smazat záznam?')) {
          await db.deleteService(id);
          await refreshList();
        }
      })
    );
  }

  function filterList(e) {
    const q = e.target.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    document.querySelectorAll('.sb-item').forEach((el) => {
      const text = el.textContent.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      el.style.display = text.includes(q) ? '' : 'none';
    });
  }

  async function exportJSON() {
    const data = await db.getServicesByMachine(currentMachine.id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${currentMachine.id}_servicebook.json`;
    a.click();
  }

  async function importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const records = JSON.parse(text);
    for (const r of records) await db.addService(r);
    await refreshList();
    toast('Import dokončen');
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => t.classList.remove('show'), 2500);
    setTimeout(() => t.remove(), 3000);
  }

  /* -------------------- PUBLIC -------------------- */
  return { init, refreshList };
})();