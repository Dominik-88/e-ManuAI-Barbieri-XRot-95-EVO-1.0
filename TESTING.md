# 🧪 XROT95 Ultimate Manual — TESTING & QA GUIDE

Verze: 1.0  
Datum: 2025-12-09  
Autor: Barbieri Systems / Open Web Labs

---

## 🎯 Cíl

Tento dokument slouží pro **ruční i automatizované testování** SPA aplikace **XROT95 Ultimate Manual**.

Testuje se funkčnost:
- IndexedDB (CRUD operace)
- Servisní kniha
- Autonomy Core a simulátory
- PWA offline chování
- UI a UX toků
- Telemetrie a její pruning

---

## 🧩 1️⃣ Testovací prostředí

### Doporučené prohlížeče
- Chrome ≥ 121
- Edge ≥ 121
- Firefox ≥ 120 (s podporou IndexedDB a PWA)

### Příprava
1. Otevři soubor `index.html` přes **lokální server** (např. `npx serve`).
2. V nastavení prohlížeče vymaž data webu (Application → Storage → Clear site data).
3. Obnov stránku (Ctrl + R) a spusť testy.

---

## ⚙️ 2️⃣ Automatický test harness

V prohlížeči otevři **Konzoli (F12 → Console)**  
a spusť:

```js
window.runXrotSelfTest()