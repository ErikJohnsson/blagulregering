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
| `data.js`    | **Allt politiskt innehåll.** Partier + färger, de 24 ministerposterna, kandidatpoolen (90 personer), exempelregeringen och listan över SD-namn som alltid slumpas in. Globala `const`-variabler som `script.js` läser. |
| `script.js`  | All logik och rendering. En enda IIFE, inga beroenden. |
| `style.css`  | All styling. Ljust tema, CSS-variabler i `:root`. Rubriker i Archivo Black (självhostad i `fonts/`), övrig text i systemtypsnitt. **Gult betyder alltid SD**; använd aldrig `--gold` som dekor. |
| `test/`      | End-to-end-tester (`npm test`), se nedan. |
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
  icke-SD. *Testa ett troligt förslag* laddar `EXAMPLE_FILL` (med `EXAMPLE_FILL_NO_L_OVERRIDES`
  när L är av). *Börja om* tömmer allt utom PM. Alla tre, liksom L-brytaren när L-statsråd sitter,
  tar en ögonblicksbild först och erbjuder **Ångra** i toasten.
* **Taket**: när 12 poster (inkl. PM) är M/KD/L byter statusraden till gult med raden
  "Taket är nått", tomma kort får klassen `only-sd`, och väljaren öppnar på SD-fliken.
* **Föreslagna**: väljaren lyfter först kandidater vars roll matchar posten (`POST_KEYWORDS`
  + posttiteln); resten ligger bakom "Visa alla N namn", sorterade på efternamn. Sökningen viker
  ihop diakritiska tecken. Partiflikarna visar antal; SD-fliken läggs först när färre än tre
  M/KD-platser är kvar. Blockerade rader är `aria-disabled` (fokuserbara) i stället för `disabled`.
* **Avsändare**: "En kampanj från Centerpartiets ungdomsförbund" i hero, resultatkort, footer, deltext och
  metabeskrivningar.
* **Resultat**: när alla 24 poster är fyllda visas `#result` under statusraden: rubrik med
  SD-antalet, ett 24-rutors sätesgaller (SD först), vilka tunga departement SD håller
  (`HEAVY_POSTS`) och dela-knappen. På mobil visas dessutom en fast dela-knapp längst ner.
* **Dela**: systemets delningsmeny på mobil (`navigator.share`) med resultatkortet som PNG
  (1080×1080, ritas i `renderShareImage` på ett `<canvas>`) när regeringen är komplett; annars
  urklipp. Texten inleds med SD-antalet och slutar med länken och avsändaren. "Spara som bild"
  laddar ner samma PNG.
* **Länk med tillstånd**: regeringen kodas i adressens hash (`#g=<48 tecken>&l=1`, se
  `encodeState`/`decodeState`). En delad länk öppnar samma regering och scrollar till resultatet;
  en ren adress använder `localStorage`. Hashen uppdateras vid varje ändring.
* **Sätesgallren** (hero, statusrad, resultat) ritas av `renderSeatGrid`/`renderMeter` i fast
  ordning: SD från vänster, M/L/KD från höger, tomma i mitten. Strecket i mätaren står vid 12.
* **Persistens**: `localStorage`-nyckeln `blagulregering-state-v2`. Höj versionen i nyckeln om
  du ändrar formatet så gamla besökare inte får trasigt state.

## Ändra innehåll

Allt som är text, namn, roller eller poster ändras i `data.js` (eller i `index.html` för
rubriker/ingress/footer). Kandidat-id:n måste vara unika och alla id:n i `EXAMPLE_FILL`,
`EXAMPLE_FILL_NO_L_OVERRIDES` och `GUARANTEED_SD_IDS` måste finnas i `CANDIDATES`.
Snabb kontroll efter ändring:

```sh
npm test          # 71 end-to-end-tester i headless Chrome (kräver Google Chrome installerat)
```

Testerna i `test/logic-test.html` laddar den riktiga sidan i en iframe och klickar sig igenom
spärren, flytt av personer, L-brytaren, slump, exempel, delning och sparat tillstånd.

## Publicera på Loopia

Sajten är statisk, så den läggs direkt i webbhotellets `public_html`. Filer som ska upp:

`index.html  style.css  script.js  data.js  favicon.svg  apple-touch-icon.png  og-image.png  robots.txt  sitemap.xml  .htaccess`

`server.js`, `package.json`, `assets-src/`, `README.md`, `CLAUDE.md` och `deploy.sh` ska **inte** upp.

### Första gången
1. Registrera domänen `blagulregering.se` och koppla den till webbhotellet i Loopia Kundzon.
2. Aktivera SSL-certifikat (Let's Encrypt) för domänen under *Webbhotell > SSL*.
3. Skapa/hämta FTP-uppgifter under *Webbhotell > FTP-konton*.
4. Se till att domänen pekar på mappen `public_html` (standard).

### Varje deploy
```sh
LOOPIA_USER='ditt-ftp-konto' LOOPIA_PASS='lösenord' ./deploy.sh
```
Skriptet syntaxkollar JS, kräver TLS mot FTP-servern och laddar upp exakt fillistan ovan.
Alternativ: dra samma filer till `public_html` i Loopias filhanterare eller i en FTP-klient.

### Delningsbild
`og-image.png` (1200×630) renderas från `assets-src/og-image.html` med headless Chrome:
```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --hide-scrollbars --window-size=1200,630 --screenshot="$PWD/og-image.png" "file://$PWD/assets-src/og-image.html"
```
Ändra texten i HTML-filen och kör om. Facebook/LinkedIn cachar bilden; använd deras
"sharing debugger" för att tömma cachen efter en ändring.
