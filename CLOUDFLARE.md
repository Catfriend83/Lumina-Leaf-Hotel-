# Lumina Leaf Hotel auf Cloudflare Pages

Unabhängige Kopie des vollständigen Hotelprojekts, Ausgangsstand Version 92.
Die ursprüngliche ChatGPT-Website wird durch dieses Repository nicht verändert.

## Veröffentlichung über GitHub

1. In Cloudflare **Workers & Pages → Create application → Pages → Connect to Git** öffnen.
2. GitHub verbinden und **Catfriend83/Lumina-Leaf-Hotel-** auswählen.
3. Produktionsbranch: **main**. Framework: **None**.
4. Build-Befehl: **npm run build**.
5. Build-Ausgabeverzeichnis: **dist**. Stammverzeichnis: leer lassen.
6. **Save and Deploy** wählen.

Alle Laufzeitdateien, Texturen, Three.js-Abhängigkeiten und mehrteiligen 3D-Downloads sind im Repository enthalten. Für die statische Website sind keine Datenbank und keine API-Schlüssel erforderlich.

## Lokale Prüfung

Node.js verwenden und im Projektordner `npm run build` ausführen.
Der Befehl prüft die JavaScript-Dateien und die Prüfsummen der vollständigen Modell-Downloads.

## Aktueller Veröffentlichungsstand

Dieses Repository ist die Vorbereitung für Cloudflare Pages.
Eine erfolgreiche Veröffentlichung ist erst durch eine bestätigte Cloudflare-Deployment-URL belegt.

Dokumentation:
- https://developers.cloudflare.com/pages/get-started/git-integration/
- https://developers.cloudflare.com/pages/functions/wrangler-configuration/
