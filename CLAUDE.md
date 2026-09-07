# CLAUDE.md

Kampanjsajt (Centerstudenter) för valet 2026: bygg en M–L–KD–SD-regering där minst 12 av 24
statsråd måste vara SD. Läs `README.md` för hur logiken fungerar.

## Fakta om projektet
- Helt statisk sajt: `index.html`, `style.css`, `script.js`, `data.js`. Inget byggsteg, inga
  npm-beroenden, inga ramverk. Vanilla JS i en IIFE. Behåll det så; introducera inte bundlers
  eller ramverk för småändringar.
- `server.js` är bara en fallback för Node-hostar. Den serverar en allowlist av filer; lägg till
  nya publika filer i `PUBLIC_FILES` där om de ska kunna nås.
- Språk: all UI-text och alla kommentarer är på svenska. Skriv ny text på svenska.
- Allt politiskt innehåll (personer, roller, poster) ligger i `data.js`. Ändra aldrig namn eller
  roller där utan att användaren har bekräftat att uppgifterna är korrekta; det är en
  kampanjsajt om verkliga personer.

## Verifiering
- `node --check script.js && node --check data.js` efter varje JS-ändring.
- Om `data.js` ändras: kontrollera att alla id:n i `EXAMPLE_FILL`, `EXAMPLE_FILL_NO_L_OVERRIDES`
  och `GUARANTEED_SD_IDS` finns i `CANDIDATES`, och att `EXAMPLE_FILL` ger exakt 12 SD.
- Kör `node server.js` och testa i webbläsare på både desktop och mobil bredd (modalen är en
  bottom-sheet under 640 px).
- Om formatet på sparat state ändras: bumpa `STORAGE_KEY` i `script.js`.
