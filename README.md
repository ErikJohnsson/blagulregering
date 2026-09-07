# Blågul regering

Kampanjsajt inför riksdagsvalet 2026: ett interaktivt tankeexperiment där besökaren
sätter ihop en M–L–KD–SD-regering, statsråd för statsråd. Regeln som driver sajten är att
**minst 12 av 24 statsråd måste vara SD** (spärren räknas som ett tak på 12 icke-SD-poster,
inklusive statsministern). Poängen: visa hur få poster som faktiskt blir kvar för M, L och KD.

Sajten är helt statisk: ingen backend, ingen databas, inget byggsteg. Allt tillstånd sparas
i besökarens webbläsare via `localStorage`.

## Filer

| Fil          | Innehåll |
|--------------|----------|
| `index.html` | Sidans struktur: header med L-brytare, klistrig statusrad, `<main id="departments">` som fylls av JS, footer, väljar-modal, toast. |
| `data.js`    | **Allt politiskt innehåll.** Partier + färger, de 24 ministerposterna, kandidatpoolen (92 personer), exempelregeringen och listan över SD-namn som alltid slumpas in. Globala `const`-variabler som `script.js` läser. |
| `script.js`  | All logik och rendering. En enda IIFE, inga beroenden. |
| `style.css`  | All styling. Ljust tema, systemtypsnitt, CSS-variabler i `:root`. |
| `server.js`  | Minimal Node-server (allowlist av filer) för hostar som kräver en process. Behövs inte på statiska hostar. |

## Köra lokalt

```sh
node server.js          # http://localhost:3000
PORT=8080 node server.js
```

Eller öppna `index.html` direkt i webbläsaren; det fungerar också eftersom inget hämtas via fetch.

## Så fungerar logiken (`script.js`)

* **State** är ett objekt `{ slotId: candidateId | null }` plus flaggan `lInParliament`.
  Statsministerposten är låst (`fixed: "kristersson"` i `data.js`).
* **Spärren**: `canAssign(slot, candidate)` tillåter alltid SD. För icke-SD räknas hur många
  icke-SD-poster som redan är fyllda (exklusive posten som fylls och kandidatens ev. gamla post)
  och kräver `< 12`. Konstanterna heter `NON_SD_CAP` och `SD_FLOOR`.
* **En person, en post**: att välja någon som redan sitter på en annan post flyttar personen.
* **L-brytaren** (`lInParliament`): av som standard. När den är av döljs L-kandidater,
  L-chipen i statusraden försvinner och alla L-innehavare töms från posterna.
* **Knappar**: *Slumpa* tar de garanterade SD-namnen + fler SD upp till 12, sedan 11 slumpade
  icke-SD. *Troligt förslag* laddar `EXAMPLE_FILL` (med `EXAMPLE_FILL_NO_L_OVERRIDES` när L är
  av). *Sammanfatta* kopierar en textlista till urklipp. *Nollställ* tömmer allt utom PM.
* **Persistens**: `localStorage`-nyckeln `blagulregering-state-v2`. Höj versionen i nyckeln om
  du ändrar formatet så gamla besökare inte får trasigt state.

## Ändra innehåll

Allt som är text, namn, roller eller poster ändras i `data.js` (eller i `index.html` för
rubriker/ingress/footer). Kandidat-id:n måste vara unika och alla id:n i `EXAMPLE_FILL`,
`EXAMPLE_FILL_NO_L_OVERRIDES` och `GUARANTEED_SD_IDS` måste finnas i `CANDIDATES`.
Snabb kontroll efter ändring:

```sh
node --check data.js && node --check script.js
```
