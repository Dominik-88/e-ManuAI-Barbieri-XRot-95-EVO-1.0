# 🤖 Barbieri XRot 95 EVO - Control Unit (v2.0)

Profesionální webová aplikace (PWA) pro telemetrii, diagnostiku a vzdálené ovládání autonomního stroje Barbieri XRot 95.

## 🏗 Architektura

Projekt je postaven na moderním Vanilla JS (ES Modules) s důrazem na testovatelnost a offline funkčnost.

- **UI Layer**: `index.html`, `style.css` (Glassmorphism design)
- **Logic Layer**: `js/modules-core.js` (Čisté funkce, validace, AI mock)
- **Controller**: `js/app.js` (Propojení DOM a logiky)
- **Persistence**: IndexedDB (`db.js`)
- **Offline**: Service Worker (`sw.js`)

## 🚀 Quickstart

1.  **Instalace závislostí:**
    ```bash
    npm install
    ```

2.  **Spuštění lokálního serveru:**
    ```bash
    npm start
    ```
    Aplikace poběží na `http://localhost:3000`.

## 🛠 Skripty

- `npm start` - Spustí vývojový server.
- `npm test` - Spustí sadu unit testů (Jest).
- `npm run lint` - Zkontroluje kvalitu kódu (ESLint).
- `npm run lint:fix` - Automaticky opraví formátovací chyby.
- `npm run build` - Připraví složku `dist/` pro produkci.

## ✅ Testování

Projekt používá **Jest** pro unit testy. Pokrytí zahrnuje:
- Validace vstupů (XSS ochrana).
- Výpočty RPM motoru.
- Error handling AI modulu.

Spuštění testů:
```bash
npm test
