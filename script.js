(function () {
  "use strict";

  const NON_SD_CAP = 12; // inkl. statsministern
  const SD_FLOOR = 12;
  const TOTAL = PORTFOLIOS.length; // 24
  const SITE_URL = "https://blagulregering.se";
  const SENDER = "En kampanj från Centerpartiets ungdomsförbund";

  const candidatesById = {};
  CANDIDATES.forEach((c) => (candidatesById[c.id] = c));

  const portfoliosById = {};
  PORTFOLIOS.forEach((p) => (portfoliosById[p.id] = p));

  // Personer som är låsta till en post (statsministern) får aldrig erbjudas eller
  // slumpas till någon annan post.
  const fixedCandidateIds = new Set(PORTFOLIOS.filter((p) => p.fixed).map((p) => p.fixed));

  // De "tunga" departementen som lyfts fram i resultatet när SD håller dem.
  const HEAVY_POSTS = [
    { id: "justitie", dept: "Justitiedepartementet" },
    { id: "forsvar", dept: "Försvarsdepartementet" },
    { id: "utrikes", dept: "Utrikesdepartementet" },
    { id: "finans", dept: "Finansdepartementet" },
  ];

  // Kortnamn för posterna i resultatrutorna.
  const SHORT_TITLES = {
    pm: "Statsmin.", eu: "EU", arbetsm: "Arbetsm.", jamstalld: "Jämställdh.",
    finans: "Finans", civil: "Civil", finansm: "Finansm.", forsvar: "Försvar",
    civforsvar: "Civilt förs.", justitie: "Justitie", migration: "Migration",
    energi: "Energi", klimat: "Klimat", kultur: "Kultur", landsbygd: "Landsbygd",
    infra: "Infrastr.", social: "Social", aldre: "Äldre", socialtj: "Socialtj.",
    sjukvard: "Sjukvård", utbintegr: "Utbildning", gymhogsk: "Högskola",
    utrikes: "Utrikes", bistand: "Bistånd",
  };

  // Nyckelord per post som matchas mot kandidaternas roll för gruppen "Föreslagna".
  const POST_KEYWORDS = {
    eu: ["eu"], arbetsm: ["arbetsmarknad"], jamstalld: ["jämställdhet"],
    finans: ["finansminister", "ekonomisk", "finansutskott"], civil: ["civilminister"],
    finansm: ["finansmarknad"], forsvar: ["försvar"], civforsvar: ["civilt försvar", "försvar"],
    justitie: ["justitie", "rättspolit", "polis"], migration: ["migration"],
    energi: ["energi", "näring"], klimat: ["klimat", "miljö"], kultur: ["kultur", "idrott"],
    landsbygd: ["landsbygd", "jordbruk"], infra: ["infrastruktur", "bostad", "trafik"],
    social: ["socialminister", "socialpolit"], aldre: ["äldre", "socialförsäkring"],
    socialtj: ["socialtjänst", "familje"], sjukvard: ["sjukvård"],
    utbintegr: ["utbildning", "integration"], gymhogsk: ["gymnasie", "högskole", "forskning", "utbildning"],
    utrikes: ["utrikes"], bistand: ["bistånd", "utrikeshandel"],
  };

  // state: slotId -> candidateId | null
  let state = {};
  PORTFOLIOS.forEach((p) => (state[p.id] = p.fixed || null));

  // Om Liberalerna antas ha kommit in i riksdagen 2026. Förvalt: ja.
  let lInParliament = true;

  // En nivå ångra.
  let undoSnapshot = null;
  let wasComplete = false;
  let wasAtCap = false;

  const STORAGE_KEY = "blagulregering-state-v3";

  // ---------- URL-tillstånd ----------
  // Regeringen kodas i adressens hash så att en delad länk öppnar samma resultat.
  // Format: #g=<24 tecken: kandidatindex i base36, "-" för tom><&l=1 om L räknas med>

  const candidateIndex = {};
  CANDIDATES.forEach((c, i) => (candidateIndex[c.id] = i));

  function encodeState() {
    const g = PORTFOLIOS.map((p) => {
      const id = state[p.id];
      return id && candidateIndex[id] !== undefined ? candidateIndex[id].toString(36).padStart(2, "0") : "--";
    }).join("");
    return `g=${g}${lInParliament ? "&l=1" : ""}`;
  }

  function decodeState(hash) {
    const m = /(?:^|[#&])g=([0-9a-z-]{48})/.exec(hash || "");
    if (!m) return null;
    const slots = {};
    for (let i = 0; i < TOTAL; i++) {
      const code = m[1].slice(i * 2, i * 2 + 2);
      const p = PORTFOLIOS[i];
      if (p.fixed || code === "--") continue;
      const idx = parseInt(code, 36);
      const c = CANDIDATES[idx];
      if (c && !fixedCandidateIds.has(c.id)) slots[p.id] = c.id;
    }
    return { slots, lInParliament: /(?:^|[&#])l=1/.test(hash) };
  }

  function applySlots(slots) {
    // Ingen person på två poster, och taket får inte överskridas: fyll SD först, sedan övriga.
    PORTFOLIOS.forEach((p) => { if (!p.fixed) state[p.id] = null; });
    const seen = new Set([...fixedCandidateIds]);
    const entries = Object.entries(slots).filter(([, id]) => candidatesById[id]);
    entries.sort(([, a], [, b]) => (candidatesById[a].party === "SD" ? -1 : 1) - (candidatesById[b].party === "SD" ? -1 : 1));
    entries.forEach(([slotId, id]) => {
      if (!portfoliosById[slotId] || portfoliosById[slotId].fixed || seen.has(id)) return;
      if (candidatesById[id].party === "L" && !lInParliament) return;
      if (candidatesById[id].party !== "SD" && countNonSD([slotId]) >= NON_SD_CAP) return;
      state[slotId] = id;
      seen.add(id);
    });
  }

  function loadState() {
    const fromHash = decodeState(location.hash);
    if (fromHash) {
      lInParliament = fromHash.lInParliament;
      applySlots(fromHash.slots);
      return "hash";
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return "empty";
      const saved = JSON.parse(raw);
      if (typeof saved.lInParliament === "boolean") lInParliament = saved.lInParliament;
      applySlots(saved.slots || {});
      return "storage";
    } catch (e) {
      return "empty";
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ slots: state, lInParliament }));
    } catch (e) {
      /* ignore quota errors */
    }
    try {
      const hash = countFilled() > 1 ? "#" + encodeState() : "";
      if (hash !== location.hash && (hash || location.hash)) {
        history.replaceState(null, "", location.pathname + location.search + hash);
      }
    } catch (e) {
      /* ignore */
    }
  }

  function shareUrl() {
    return `${SITE_URL}/#${encodeState()}`;
  }

  function snapshotOf() {
    return { slots: Object.assign({}, state), lInParliament };
  }
  function sameAsSnapshot(snap) {
    return !!snap && snap.lInParliament === lInParliament &&
      PORTFOLIOS.every((p) => (snap.slots[p.id] || null) === (state[p.id] || null));
  }
  function takeSnapshot() {
    undoSnapshot = snapshotOf();
  }
  function settleSnapshot() {
    if (sameAsSnapshot(undoSnapshot)) undoSnapshot = null;
    return !!undoSnapshot;
  }

  function restoreSnapshot() {
    if (!undoSnapshot) return;
    state = Object.assign({}, undoSnapshot.slots);
    lInParliament = undoSnapshot.lInParliament;
    undoSnapshot = null;
    saveState();
    renderLToggle();
    renderAll();
    showToast("Ångrat.");
  }

  function isCandidateAvailable(c) {
    if (fixedCandidateIds.has(c.id)) return false;
    return lInParliament || c.party !== "L";
  }

  function findSlotOfCandidate(candidateId) {
    for (const p of PORTFOLIOS) {
      if (state[p.id] === candidateId) return p.id;
    }
    return null;
  }

  function partyOfSlot(slotId) {
    const occ = state[slotId];
    return occ ? candidatesById[occ].party : null;
  }

  function countNonSD(excludeSlotIds) {
    let count = 0;
    PORTFOLIOS.forEach((p) => {
      if (excludeSlotIds.includes(p.id)) return;
      const party = partyOfSlot(p.id);
      if (party && party !== "SD") count++;
    });
    return count;
  }

  function countSD() {
    return PORTFOLIOS.filter((p) => partyOfSlot(p.id) === "SD").length;
  }

  function countFilled() {
    return PORTFOLIOS.filter((p) => !!state[p.id]).length;
  }

  function canAssign(slotId, candidateId) {
    const candidate = candidatesById[candidateId];
    if (!candidate || portfoliosById[slotId].fixed || fixedCandidateIds.has(candidateId)) return false;
    if (candidate.party === "SD") return true;
    const oldSlotId = findSlotOfCandidate(candidateId);
    const excludes = [slotId];
    if (oldSlotId && oldSlotId !== slotId) excludes.push(oldSlotId);
    return countNonSD(excludes) < NON_SD_CAP;
  }

  function assign(slotId, candidateId) {
    if (!canAssign(slotId, candidateId)) return false;
    const oldSlotId = findSlotOfCandidate(candidateId);
    if (oldSlotId) state[oldSlotId] = null;
    state[slotId] = candidateId;
    saveState();
    return true;
  }

  function clearSlot(slotId) {
    if (portfoliosById[slotId].fixed) return;
    state[slotId] = null;
    saveState();
  }

  // ---------- helpers ----------

  function initials(name) {
    return name
      .split(" ")
      .filter((w) => w.length && /[A-Za-zÅÄÖåäö]/.test(w[0]))
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  }

  function avatarEl(candidate) {
    var av = el("span", "avatar");
    var img = document.createElement("img");
    img.src = "photos/" + candidate.id + ".jpg";
    img.alt = "";
    img.loading = "lazy";
    img.className = "avatar-img";
    img.onerror = function () {
      img.remove();
      av.textContent = initials(candidate.name);
    };
    av.appendChild(img);
    return av;
  }

  function surname(name) {
    const parts = name.trim().split(" ");
    return parts[parts.length - 1];
  }

  // "soder" ska hitta "Söder": vik ihop diakritiska tecken vid sökning.
  function fold(s) {
    return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function paintParty(node, party) {
    node.classList.add(party);
    node.style.background = PARTIES[party].color;
    node.style.color = PARTIES[party].text;
  }

  function nonSDPartiesLabel() {
    return lInParliament ? "M/KD/L" : "M/KD";
  }

  // ---------- rendering ----------

  const deptsEl = document.getElementById("departments");
  const heroSeatsEl = document.getElementById("heroSeats");
  const statusbarEl = document.getElementById("statusbar");
  const meterEl = document.getElementById("meter");
  const meterTrackEl = document.getElementById("meterTrack");
  const sdCountEl = document.getElementById("sdCount");
  const capLeftEl = document.getElementById("capLeft");
  const capPartiesEl = document.getElementById("capParties");
  const capLineEl = document.getElementById("capLine");
  const filledCountEl = document.getElementById("filledCount");
  const announcerEl = document.getElementById("announcer");
  const resultEl = document.getElementById("result");
  const resultTitleEl = document.getElementById("resultTitle");
  const resultSubEl = document.getElementById("resultSub");
  const resultSeatsEl = document.getElementById("resultSeats");
  const resultNoteEl = document.getElementById("resultNote");
  const resultQuoteEl = document.getElementById("resultQuote");
  const resultUndoBtn = document.getElementById("resultUndoBtn");
  const shareCtaEl = document.getElementById("shareCta");
  const shareCtaBtn = document.getElementById("shareCtaBtn");
  const shareTopBtn = document.getElementById("shareTopBtn");

  // Sätena visas i en fast ordning: SD-poster först, sedan övriga, sedan tomma.
  function orderedSlots() {
    const sd = [], other = [], empty = [];
    PORTFOLIOS.forEach((p) => {
      const party = partyOfSlot(p.id);
      if (!party) empty.push(p);
      else if (party === "SD") sd.push(p);
      else other.push(p);
    });
    return { sd, other, empty };
  }

  function renderSeatGrid(container, withLabels) {
    const { sd, other, empty } = orderedSlots();
    container.innerHTML = "";
    sd.concat(other, empty).forEach((p) => {
      const party = partyOfSlot(p.id);
      const seat = el("div", "seat");
      if (withLabels) seat.setAttribute("role", "listitem");
      if (!party) {
        seat.classList.add("empty");
        if (withLabels) seat.setAttribute("aria-label", `${p.title}: tom`);
      } else {
        const c = candidatesById[state[p.id]];
        paintParty(seat, party);
        if (withLabels) {
          seat.appendChild(el("span", "seat-init", initials(c.name)));
          seat.appendChild(el("span", "seat-post", SHORT_TITLES[p.id] || p.title));
          seat.setAttribute("aria-label", `${p.title}: ${c.name} (${PARTIES[party].name})`);
        } else {
          seat.textContent = party === "SD" ? "SD" : party;
          seat.setAttribute("aria-hidden", "true");
        }
      }
      container.appendChild(seat);
    });
    if (!withLabels) {
      container.setAttribute(
        "aria-label",
        `${TOTAL} statsrådsposter: ${sd.length} SD, ${other.length} ${nonSDPartiesLabel()}, ${empty.length} tomma.`
      );
    }
  }

  function renderMeter() {
    const { sd, other } = orderedSlots();
    meterTrackEl.innerHTML = "";
    // SD fyller från vänster mot strecket vid 12; M/KD/L fyller från höger och
    // kan aldrig passera det. Tomma rutor blir kvar i mitten.
    const cells = new Array(TOTAL).fill(null);
    sd.forEach((p, i) => (cells[i] = "SD"));
    other.forEach((p, i) => (cells[TOTAL - 1 - i] = partyOfSlot(p.id)));
    cells.forEach((party) => {
      const seg = el("div", "seg");
      if (party) paintParty(seg, party);
      meterTrackEl.appendChild(seg);
    });
    meterEl.setAttribute(
      "aria-label",
      `${sd.length} av ${TOTAL} poster är SD. Minst ${SD_FLOOR} krävs. ${other.length} poster är ${nonSDPartiesLabel()}.`
    );
  }

  function renderDepartments(atCap) {
    const order = [];
    const grouped = {};
    PORTFOLIOS.forEach((p) => {
      if (!grouped[p.dept]) {
        grouped[p.dept] = [];
        order.push(p.dept);
      }
      grouped[p.dept].push(p);
    });

    deptsEl.innerHTML = "";
    order.forEach((dept) => {
      const section = el("section", "dept");
      section.appendChild(el("h2", null, dept));
      const grid = el("div", "dept-grid");
      grouped[dept].forEach((p) => grid.appendChild(renderPostCard(p, atCap)));
      section.appendChild(grid);
      deptsEl.appendChild(section);
    });
  }

  function renderPostCard(p, atCap) {
    // Den låsta statsministerposten är ingen knapp: den går inte att ändra.
    const card = el(p.fixed ? "div" : "button", "post" + (p.fixed ? " fixed" : ""));
    if (!p.fixed) card.type = "button";
    card.setAttribute("data-slot", p.id);

    card.appendChild(el("span", "post-title", p.title));

    const occId = state[p.id];
    if (occId) {
      const c = candidatesById[occId];
      card.classList.add(c.party);
      const row = el("span", "post-person");

      const av = avatarEl(c);
      av.setAttribute("aria-hidden", "true");
      paintParty(av, c.party);
      row.appendChild(av);

      const info = el("span");
      info.appendChild(el("span", "person-name", c.name));
      const roleLine = el("span", "person-role");
      const tag = el("span", "party-tag", c.party);
      paintParty(tag, c.party);
      roleLine.appendChild(tag);
      roleLine.appendChild(document.createTextNode(" " + (c.role || "")));
      info.appendChild(roleLine);
      row.appendChild(info);
      card.appendChild(row);

      if (c.quote) {
        const q = el("span", "post-quote");
        q.appendChild(document.createTextNode("“" + c.quote.text + "”"));
        const src = document.createElement("a");
        src.className = "post-quote-source";
        src.href = c.quote.url;
        src.target = "_blank";
        src.rel = "noopener";
        src.textContent = c.quote.source;
        src.addEventListener("click", function(e) { e.stopPropagation(); });
        q.appendChild(src);
        card.appendChild(q);
      }
    } else {
      const empty = el("span", "post-empty");
      const av = el("span", "avatar-empty");
      av.setAttribute("aria-hidden", "true");
      empty.appendChild(av);
      if (atCap) {
        card.classList.add("only-sd");
        empty.appendChild(document.createTextNode("Blir SD – välj vem"));
      } else {
        empty.appendChild(document.createTextNode("Välj statsråd"));
      }
      card.appendChild(empty);
    }

    if (!p.fixed) {
      card.addEventListener("click", () => openPicker(p.id, card));
    }
    return card;
  }

  function heavyPostsHeldBySD() {
    return HEAVY_POSTS.filter((h) => partyOfSlot(h.id) === "SD").map((h) => ({
      dept: h.dept,
      name: candidatesById[state[h.id]].name,
    }));
  }

  function joinSv(items) {
    if (items.length <= 1) return items.join("");
    return items.slice(0, -1).join(", ") + " och " + items[items.length - 1];
  }

  function heavyNote() {
    const heavy = heavyPostsHeldBySD();
    if (!heavy.length) return { lead: "", strong: "", tail: "I den här regeringen håller M och KD de tunga departementen – och SD har tolv andra." };
    const depts = joinSv(heavy.map((h) => h.dept));
    return { lead: "Sverigedemokraterna tar ", strong: depts, tail: ": " + joinSv(heavy.map((h) => h.name)) + "." };
  }

  function pickResultQuote() {
    var heavyIds = HEAVY_POSTS.map(function (h) { return h.id; });
    var sdCandidates = [];
    PORTFOLIOS.forEach(function (p) {
      var occId = state[p.id];
      if (!occId) return;
      var c = candidatesById[occId];
      if (c.party !== "SD" || !c.quote) return;
      var priority = heavyIds.indexOf(p.id) >= 0 ? 0 : 1;
      sdCandidates.push({ c: c, post: p, priority: priority });
    });
    if (!sdCandidates.length) return null;
    sdCandidates.sort(function (a, b) { return a.priority - b.priority; });
    return sdCandidates[0];
  }

  function renderResult(filled, sd) {
    const complete = filled === TOTAL;
    resultEl.hidden = !complete;
    shareCtaEl.hidden = !complete;
    document.body.classList.toggle("has-cta", complete);
    if (!complete) return;

    resultTitleEl.innerHTML = "";
    resultTitleEl.appendChild(el("span", "num", `${sd} av ${TOTAL}`));
    resultTitleEl.appendChild(
      document.createTextNode(sd === 1 ? " statsråd är Sverigedemokrat" : " statsråd är Sverigedemokrater")
    );

    resultSubEl.textContent =
      "Så här kan Ulf Kristerssons nästa Tidöregering se ut när minst tolv poster måste gå till SD.";

    renderSeatGrid(resultSeatsEl, true);

    const note = heavyNote();
    resultNoteEl.innerHTML = "";
    if (note.lead) resultNoteEl.appendChild(document.createTextNode(note.lead));
    if (note.strong) resultNoteEl.appendChild(el("strong", null, note.strong));
    resultNoteEl.appendChild(document.createTextNode(note.tail));

    var q = pickResultQuote();
    resultQuoteEl.innerHTML = "";
    if (q) {
      resultQuoteEl.hidden = false;
      resultQuoteEl.appendChild(document.createTextNode("”" + q.c.quote.text + "”"));
      var cite = el("cite", null, q.c.name + ", din " + q.post.title.toLowerCase());
      resultQuoteEl.appendChild(cite);
    } else {
      resultQuoteEl.hidden = true;
    }

    resultUndoBtn.hidden = !undoSnapshot;
    shareCtaBtn.textContent = `Dela: ${sd} av ${TOTAL} är SD`;
  }

  function announce(text) {
    announcerEl.textContent = "";
    setTimeout(() => (announcerEl.textContent = text), 30);
  }

  function renderStatus() {
    const filled = countFilled();
    const sd = countSD();
    const nonSD = countNonSD([]);
    const left = Math.max(0, NON_SD_CAP - nonSD);
    const complete = filled === TOTAL;
    const atCap = nonSD >= NON_SD_CAP && !complete;
    const empty = TOTAL - filled;

    sdCountEl.textContent = String(sd);
    capLeftEl.textContent = String(left);
    capPartiesEl.textContent = nonSDPartiesLabel();
    filledCountEl.textContent = `${filled} / ${TOTAL}`;

    renderMeter();
    renderSeatGrid(heroSeatsEl, false);

    // Taket: statusraden byter tillstånd i stället för en banner som hamnar utanför skärmen.
    statusbarEl.classList.toggle("at-cap", atCap);
    capLineEl.hidden = !atCap;
    capLineEl.textContent = atCap
      ? `Taket är nått – ${empty === 1 ? "den sista posten" : `de ${empty} poster som är kvar`} blir Sverigedemokraternas.`
      : "";
    if (atCap && !wasAtCap && document.body.dataset.ready) {
      document.body.classList.add("cap-just-reached");
      setTimeout(() => document.body.classList.remove("cap-just-reached"), 1600);
    }
    wasAtCap = atCap;

    shareTopBtn.disabled = filled <= 1;

    renderResult(filled, sd);

    if (complete) {
      announce(`Regeringen är komplett. ${sd} av ${TOTAL} statsråd är SD.`);
    } else if (atCap) {
      announce(`Taket är nått. ${nonSD} av ${TOTAL} poster är ${nonSDPartiesLabel()}. De ${empty} som är kvar blir SD.`);
    } else {
      announce(`${sd} SD-statsråd av minst ${SD_FLOOR}. ${left} platser kvar för ${nonSDPartiesLabel()}. ${filled} av ${TOTAL} tillsatta.`);
    }

    // Första gången regeringen blir komplett: visa resultatkortet direkt under statusraden.
    if (complete && !wasComplete && document.body.dataset.ready) {
      const top = resultEl.getBoundingClientRect().top + window.scrollY - statusbarEl.offsetHeight - 8;
      window.scrollTo({ top, behavior: "smooth" });
    }
    wasComplete = complete;
    requestAnimationFrame(updateCta);
    return { filled, sd, complete, atCap };
  }

  function renderAll() {
    const nonSD = countNonSD([]);
    const atCap = nonSD >= NON_SD_CAP && countFilled() < TOTAL;
    renderDepartments(atCap);
    if (personGridEl) renderPersonBrowser();
    return renderStatus();
  }

  // ---------- picker modal ----------

  const backdrop = document.getElementById("modalBackdrop");
  const modalEl = backdrop.querySelector(".modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalSub = document.getElementById("modalSub");
  const modalBlocked = document.getElementById("modalBlocked");
  const modalClose = document.getElementById("modalClose");
  const searchInput = document.getElementById("candidateSearch");
  const partyTabsEl = document.getElementById("partyTabs");
  const candidateListEl = document.getElementById("candidateList");
  const clearSlotBtn = document.getElementById("clearSlotBtn");
  const pageRegions = ["header", "#statusbar", "#result", "main", "#personPanel", ".bottom-actions", "footer", "#shareCta"]
    .map((s) => document.querySelector(s))
    .filter(Boolean);

  let activeSlotId = null;
  let activePartyFilter = "ALL";
  let openerEl = null;
  let showAll = false;

  function openPicker(slotId, opener) {
    activeSlotId = slotId;
    openerEl = opener || null;
    searchInput.value = "";
    showAll = false;
    const p = portfoliosById[slotId];
    modalTitle.textContent = p.title;
    modalSub.textContent = p.dept;
    clearSlotBtn.hidden = !state[slotId];
    // Vid taket är bara SD möjligt för en tom post: börja på SD-fliken.
    const atCapForSlot = countNonSD([slotId]) >= NON_SD_CAP;
    activePartyFilter = atCapForSlot && !state[slotId] ? "SD" : "ALL";
    renderPartyTabs();
    renderCandidateList();
    backdrop.hidden = false;
    pageRegions.forEach((r) => (r.inert = true));
    document.body.style.overflow = "hidden";
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    setTimeout(() => (coarse ? modalEl : searchInput).focus(), 0);
  }

  function closePicker() {
    backdrop.hidden = true;
    activeSlotId = null;
    pageRegions.forEach((r) => (r.inert = false));
    document.body.style.overflow = "";
    if (openerEl && document.contains(openerEl)) {
      openerEl.focus();
    } else if (openerEl) {
      const slot = openerEl.getAttribute("data-slot");
      const again = slot && deptsEl.querySelector(`.post[data-slot="${slot}"]`);
      if (again) again.focus();
    }
    openerEl = null;
  }

  function renderPartyTabs() {
    const tabs = [
      { id: "ALL", label: "Alla" },
      { id: "M", label: "M" },
      { id: "KD", label: "KD" },
      { id: "L", label: "L" },
      { id: "SD", label: "SD" },
    ];
    // När M/KD nästan är slut används SD-fliken hela tiden: lägg den först.
    const left = Math.max(0, NON_SD_CAP - countNonSD([]));
    partyTabsEl.classList.toggle("sd-first", left < 3);
    partyTabsEl.innerHTML = "";
    tabs.forEach((t) => {
      if (t.id === "L" && !lInParliament) return;
      const b = el("button", "party-tab", t.label);
      b.type = "button";
      b.setAttribute("data-party", t.id);
      b.setAttribute("aria-pressed", String(activePartyFilter === t.id));
      if (t.id !== "ALL") {
        const n = CANDIDATES.filter((c) => c.party === t.id && isCandidateAvailable(c)).length;
        b.appendChild(el("span", "tab-count", String(n)));
      }
      b.addEventListener("click", () => {
        activePartyFilter = t.id;
        showAll = false;
        renderPartyTabs();
        renderCandidateList();
      });
      partyTabsEl.appendChild(b);
    });
  }

  function isSuggestedFor(c, slotId) {
    const p = portfoliosById[slotId];
    const role = fold(c.role || "");
    if (role.includes(fold(p.title))) return true;
    return (POST_KEYWORDS[slotId] || []).some((kw) => role.includes(fold(kw)));
  }

  function renderCandidateList() {
    const query = fold(searchInput.value.trim());
    const nonSDAtCap = activeSlotId && countNonSD([activeSlotId]) >= NON_SD_CAP;

    let list = CANDIDATES.filter((c) => {
      if (!isCandidateAvailable(c)) return false;
      if (activePartyFilter !== "ALL" && c.party !== activePartyFilter) return false;
      if (query && !fold(c.name).includes(query)) return false;
      return true;
    });

    const bySurname = (a, b) =>
      surname(a.name).localeCompare(surname(b.name), "sv") || a.name.localeCompare(b.name, "sv");
    list = list.slice().sort(bySurname);

    candidateListEl.innerHTML = "";

    if (list.length === 0) {
      const li = el("li", "candidate-empty-msg", "Inga kandidater matchar. ");
      const clear = el("button", "btn btn-ghost", "Rensa sökning");
      clear.type = "button";
      clear.addEventListener("click", () => {
        searchInput.value = "";
        renderCandidateList();
        searchInput.focus();
      });
      li.appendChild(clear);
      candidateListEl.appendChild(li);
      modalBlocked.hidden = !nonSDAtCap;
      return;
    }

    // Utan sökning: lyft dem vars roll hör till posten (nuvarande innehavare, talespersoner)
    // och fäll ihop resten bakom en knapp så att listan inte är en telefonkatalog.
    let suggested = [];
    let rest = list;
    if (!query && activeSlotId) {
      suggested = list.filter((c) => isSuggestedFor(c, activeSlotId));
      if (suggested.length) rest = list.filter((c) => !suggested.includes(c));
    }

    const addGroup = (label, items) => {
      if (label) candidateListEl.appendChild(el("li", "candidate-group", label));
      items.forEach((c) => candidateListEl.appendChild(renderCandidateRow(c, nonSDAtCap)));
    };
    if (suggested.length) {
      addGroup("Föreslagna för posten", suggested);
      if (showAll || rest.length <= 6) {
        addGroup("Alla", rest);
      } else {
        const li = el("li");
        const more = el("button", "btn btn-ghost candidate-showall", `Visa alla ${rest.length} namn`);
        more.type = "button";
        more.addEventListener("click", () => {
          showAll = true;
          renderCandidateList();
        });
        li.appendChild(more);
        candidateListEl.appendChild(li);
      }
    } else {
      addGroup(null, rest);
    }

    modalBlocked.hidden = !nonSDAtCap;
  }

  function renderCandidateRow(c, nonSDAtCap) {
    const li = el("li");
    const row = el("button", "candidate-row");
    row.type = "button";
    const isSelected = state[activeSlotId] === c.id;
    const elsewhereSlot = findSlotOfCandidate(c.id);
    const isElsewhere = elsewhereSlot && elsewhereSlot !== activeSlotId;
    if (isSelected) row.classList.add("selected");
    if (isElsewhere) row.classList.add("elsewhere");

    // Blockerade rader förblir fokuserbara så att förklaringen (aria-describedby) nås.
    const blocked = c.party !== "SD" && nonSDAtCap && !isSelected;
    if (blocked) {
      row.setAttribute("aria-disabled", "true");
      row.setAttribute("aria-describedby", "modalBlocked");
    }

    const av = avatarEl(c);
    av.setAttribute("aria-hidden", "true");
    paintParty(av, c.party);
    row.appendChild(av);

    const main = el("span", "candidate-main");
    main.appendChild(el("span", "person-name", c.name));
    let roleText = c.role || "";
    if (isElsewhere) roleText += ` · sitter just nu på: ${portfoliosById[elsewhereSlot].title}`;
    main.appendChild(el("span", "person-role", roleText));
    row.appendChild(main);

    const tag = el("span", "party-tag", c.party);
    paintParty(tag, c.party);
    row.appendChild(tag);

    row.addEventListener("click", () => {
      if (blocked) {
        modalBlocked.hidden = false;
        return;
      }
      const targetTitle = portfoliosById[activeSlotId].title;
      takeSnapshot();
      const ok = assign(activeSlotId, c.id);
      if (!ok) {
        undoSnapshot = null;
        modalBlocked.hidden = false;
        return;
      }
      const canUndo = settleSnapshot();
      const r = renderAll();
      closePicker();
      if (!r.complete) showToast(`${c.name} (${c.party}) blir ${targetTitle}.`, canUndo ? undoAction() : null);
    });

    li.appendChild(row);
    return li;
  }

  function focusablesInModal() {
    return Array.from(
      modalEl.querySelectorAll('button:not([disabled]):not([hidden]), input:not([disabled])')
    ).filter((n) => n.offsetParent !== null);
  }

  searchInput.addEventListener("input", () => {
    showAll = false;
    renderCandidateList();
  });
  modalClose.addEventListener("click", closePicker);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closePicker();
  });
  document.addEventListener("keydown", (e) => {
    if (backdrop.hidden) return;
    if (e.key === "Escape") {
      closePicker();
      return;
    }
    if (e.key === "Tab") {
      const items = focusablesInModal();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === modalEl)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  clearSlotBtn.addEventListener("click", () => {
    if (!activeSlotId) return;
    takeSnapshot();
    clearSlot(activeSlotId);
    renderAll();
    closePicker();
    showToast("Posten är tömd.", undoAction());
  });

  // ---------- toast ----------

  const toastEl = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");
  const toastAction = document.getElementById("toastAction");
  let toastTimer = null;
  let toastHandler = null;

  function showToast(msg, action) {
    toastMsg.textContent = msg;
    if (action) {
      toastAction.textContent = action.label;
      toastAction.hidden = false;
      toastHandler = action.onClick;
    } else {
      toastAction.hidden = true;
      toastHandler = null;
    }
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.hidden = true), action ? 7000 : 2800);
  }
  function hideToast() {
    clearTimeout(toastTimer);
    toastEl.hidden = true;
  }

  toastAction.addEventListener("click", () => {
    const fn = toastHandler;
    toastEl.hidden = true;
    toastHandler = null;
    if (fn) fn();
  });
  resultUndoBtn.addEventListener("click", restoreSnapshot);

  function undoAction() {
    return { label: "Ångra", onClick: restoreSnapshot };
  }

  function afterBulkAction(result, message) {
    const canUndo = settleSnapshot();
    resultUndoBtn.hidden = !canUndo;
    if (result.complete) {
      hideToast();
    } else {
      showToast(message, canUndo ? undoAction() : null);
    }
  }

  // ---------- L-toggle ----------

  const lToggle = document.getElementById("lToggle");

  function renderLToggle() {
    lToggle.setAttribute("aria-checked", String(lInParliament));
  }

  lToggle.addEventListener("click", () => {
    const turningOff = lInParliament;
    const lSeated = PORTFOLIOS.filter((p) => !p.fixed && partyOfSlot(p.id) === "L").length;
    if (turningOff && lSeated) takeSnapshot();
    lInParliament = !lInParliament;
    if (!lInParliament) {
      PORTFOLIOS.forEach((p) => {
        if (!p.fixed && partyOfSlot(p.id) === "L") state[p.id] = null;
      });
    }
    saveState();
    renderLToggle();
    renderAll();
    if (turningOff && lSeated) {
      showToast(`Liberalerna räknas inte längre med – ${lSeated} ${lSeated === 1 ? "post" : "poster"} tömdes.`, undoAction());
    }
  });

  // ---------- top actions ----------

  function resetAll() {
    if (countFilled() <= 1) return;
    takeSnapshot();
    PORTFOLIOS.forEach((p) => {
      if (!p.fixed) state[p.id] = null;
    });
    saveState();
    renderAll();
    showToast("Regeringen är tömd.", undoAction());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.getElementById("resetBtn").addEventListener("click", resetAll);
  document.getElementById("resetBottomBtn").addEventListener("click", resetAll);

  document.getElementById("exampleBtn").addEventListener("click", () => {
    if (countFilled() > 1) takeSnapshot();
    else undoSnapshot = null;
    const overrides = lInParliament ? {} : EXAMPLE_FILL_NO_L_OVERRIDES;
    PORTFOLIOS.forEach((p) => {
      if (p.fixed) return;
      state[p.id] = overrides[p.id] || EXAMPLE_FILL[p.id] || null;
    });
    saveState();
    const r = renderAll();
    afterBulkAction(r, `Förslag ifyllt: ${r.sd} av ${TOTAL} statsråd är SD.`);
  });

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  document.getElementById("randomBtn").addEventListener("click", () => {
    if (countFilled() > 1) takeSnapshot();
    else undoSnapshot = null;
    const openSlots = shuffle(PORTFOLIOS.filter((p) => !p.fixed).map((p) => p.id));

    const guaranteedSD = GUARANTEED_SD_IDS.filter((id) => candidatesById[id]);
    const otherSD = shuffle(
      CANDIDATES.filter((c) => c.party === "SD" && !guaranteedSD.includes(c.id)).map((c) => c.id)
    );
    const neededMoreSD = Math.max(0, SD_FLOOR - guaranteedSD.length);
    const sdPicks = guaranteedSD.concat(otherSD.slice(0, neededMoreSD));

    const nonSDSlotCount = openSlots.length - sdPicks.length; // = NON_SD_CAP - 1 (pm)
    const nonSDPool = shuffle(
      CANDIDATES.filter((c) => c.party !== "SD" && isCandidateAvailable(c)).map((c) => c.id)
    );
    const nonSDPicks = nonSDPool.slice(0, nonSDSlotCount);

    const allPicks = shuffle(sdPicks.concat(nonSDPicks));

    PORTFOLIOS.forEach((p) => {
      if (!p.fixed) state[p.id] = null;
    });
    openSlots.forEach((slotId, i) => {
      state[slotId] = allPicks[i] || null;
    });

    saveState();
    const r = renderAll();
    afterBulkAction(r, `Slumpad regering: ${r.sd} av ${TOTAL} statsråd är SD.`);
  });

  // ---------- share ----------

  // Resultatkortet som bild för delning i sociala medier.
  const shareCanvas = document.getElementById("shareCanvas");

  function wrapText(ctx, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    words.forEach((w) => {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  async function renderShareImage(format) {
    const W = 1080;
    const H = format === "story" ? 1902 : 1350;
    const PAD = 80;
    var isStory = format === "story";
    shareCanvas.width = W;
    shareCanvas.height = H;
    var ctx = shareCanvas.getContext("2d");
    try { await document.fonts.load('400 120px "Archivo Black"'); } catch (e) { /* fallback */ }
    var DISPLAY = '"Archivo Black", "Arial Black", Impact, sans-serif';
    var SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

    var g = ctx.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, "#0b1f3a");
    g.addColorStop(1, "#122a4d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    var sd = countSD();
    var y = isStory ? 200 : PAD + 10;
    ctx.textBaseline = "top";

    ctx.font = `400 36px ${SANS}`;
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.fillText("Är det här verkligen en regering du vill ha?", PAD, y);
    y += isStory ? 72 : 60;

    ctx.font = `400 120px ${DISPLAY}`;
    ctx.fillStyle = "#DDBA27";
    ctx.fillText(sd + " av " + TOTAL, PAD, y);
    y += 130;

    ctx.font = `400 44px ${DISPLAY}`;
    ctx.fillStyle = "#fff";
    ctx.fillText(sd === 1 ? "statsråd är Sverigedemokrat" : "statsråd är Sverigedemokrater", PAD, y);
    y += isStory ? 80 : 68;

    ctx.fillStyle = "#DDBA27";
    ctx.fillRect(PAD, y, 60, 3);
    y += isStory ? 40 : 32;

    var cols = 6, gap = 10, size = Math.floor((W - PAD * 2 - gap * (cols - 1)) / cols);
    var gridW = cols * size + (cols - 1) * gap;
    var gx = PAD;
    var { sd: sdSlots, other, empty } = orderedSlots();
    var seats = sdSlots.concat(other, empty);
    seats.forEach(function (p, i) {
      var cx = gx + (i % cols) * (size + gap);
      var cy = y + Math.floor(i / cols) * (size + gap);
      var party = partyOfSlot(p.id);
      roundRect(ctx, cx, cy, size, size, 14);
      if (!party) {
        ctx.strokeStyle = "rgba(255,255,255,.25)";
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
      }
      ctx.fillStyle = PARTIES[party].color;
      ctx.fill();
      var c = candidatesById[state[p.id]];
      ctx.fillStyle = PARTIES[party].text;
      ctx.textAlign = "center";
      ctx.font = `800 32px ${SANS}`;
      ctx.fillText(initials(c.name), cx + size / 2, cy + size / 2 - 10);
      ctx.textAlign = "left";
    });
    y += 4 * (size + gap) - gap + (isStory ? 40 : 30);

    var note = heavyNote();
    ctx.font = `600 24px ${SANS}`;
    var plain = note.lead + note.strong + note.tail;
    var lines = wrapText(ctx, plain, W - PAD * 2).slice(0, 3);
    lines.forEach(function (l) {
      var x = PAD;
      var idx = note.strong ? l.indexOf(note.strong) : -1;
      if (idx >= 0) {
        var before = l.slice(0, idx), mid = l.slice(idx, idx + note.strong.length), after = l.slice(idx + note.strong.length);
        ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillText(before, x, y); x += ctx.measureText(before).width;
        ctx.fillStyle = "#DDBA27"; ctx.font = `700 24px ${SANS}`; ctx.fillText(mid, x, y); x += ctx.measureText(mid).width;
        ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = `600 24px ${SANS}`; ctx.fillText(after, x, y);
      } else {
        ctx.fillStyle = "rgba(255,255,255,.7)";
        ctx.fillText(l, x, y);
      }
      y += 34;
    });

    ctx.textAlign = "center";
    ctx.font = `700 20px ${SANS}`;
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.fillText("blagulregering.se", W / 2, H - PAD + 6);
    ctx.textAlign = "left";

    return new Promise(function (resolve) { shareCanvas.toBlob(function (blob) {
      shareCanvas.width = shareCanvas.height = 0;
      resolve(blob);
    }, "image/png"); });
  }

  async function share() {
    if (countFilled() <= 1) return;
    const sd = countSD();
    const url = shareUrl();
    const shortText = `${sd} av ${TOTAL} statsråd i min Kristersson-regering är SD. Bygg din egen: ${url}\n${SENDER}.`;

    if (navigator.share) {
      try {
        const payload = { title: document.title, text: shortText, url };
        if (countFilled() === TOTAL && navigator.canShare) {
          const blob = await renderShareImage("post");
          if (blob) {
            const file = new File([blob], "blagul-regering.png", { type: "image/png" });
            if (navigator.canShare({ files: [file] })) payload.files = [file];
          }
        }
        await navigator.share(payload);
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast("Länken är kopierad.");
    } catch (e) {
      window.prompt("Kopiera länken:", url);
    }
  }
  ["shareBtn", "shareTopBtn", "shareCtaBtn"].forEach((id) =>
    document.getElementById(id).addEventListener("click", share)
  );

  function saveImage(format) {
    return async function () {
      const blob = await renderShareImage(format);
      if (!blob) return;
      const suffix = format === "story" ? "-story" : "-post";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "blagul-regering" + suffix + ".png";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 1000);
      showToast("Bilden är sparad.");
    };
  }
  document.getElementById("saveStoryBtn").addEventListener("click", saveImage("story"));
  document.getElementById("savePostBtn").addEventListener("click", saveImage("post"));

  // Dölj den fasta dela-knappen på mobil när resultatkortet (som har sin egen) syns.
  function updateCta() {
    if (resultEl.hidden) return;
    const r = resultEl.getBoundingClientRect();
    const visible = r.bottom > 80 && r.top < window.innerHeight * 0.8;
    shareCtaEl.style.visibility = visible ? "hidden" : "";
  }
  window.addEventListener("scroll", updateCta, { passive: true });
  window.addEventListener("resize", updateCta);

  // ---------- view tabs ----------

  var tabPosts = document.getElementById("tabPosts");
  var tabPersons = document.getElementById("tabPersons");
  var deptPanel = document.getElementById("departments");
  var personPanel = document.getElementById("personPanel");

  function switchTab(tab) {
    var isPerson = tab === "persons";
    tabPosts.classList.toggle("active", !isPerson);
    tabPersons.classList.toggle("active", isPerson);
    tabPosts.setAttribute("aria-selected", String(!isPerson));
    tabPersons.setAttribute("aria-selected", String(isPerson));
    deptPanel.hidden = isPerson;
    personPanel.hidden = !isPerson;
    if (isPerson) renderPersonBrowser();
  }
  tabPosts.addEventListener("click", function () { switchTab("posts"); });
  tabPersons.addEventListener("click", function () { switchTab("persons"); });

  // ---------- person browser + post picker ----------

  const personGridEl = document.getElementById("personGrid");
  const postPickerBackdrop = document.getElementById("postPickerBackdrop");
  const postPickerModal = postPickerBackdrop.querySelector(".modal");
  const postPickerTitle = document.getElementById("postPickerTitle");
  const postPickerSub = document.getElementById("postPickerSub");
  const postPickerClose = document.getElementById("postPickerClose");
  const postPickerList = document.getElementById("postPickerList");
  const postPickerFoot = document.getElementById("postPickerFoot");
  const removePersonBtn = document.getElementById("removePersonBtn");
  const personPageRegions = ["header", "#statusbar", "#result", "main", "#personPanel", ".bottom-actions", "footer", "#shareCta", "#modalBackdrop"]
    .map((s) => document.querySelector(s))
    .filter(Boolean);

  let activePersonId = null;
  let postPickerOpener = null;

  function renderPersonBrowser() {
    personGridEl.innerHTML = "";
    var srHead = el("h2", "sr-only", "Alla kandidater");
    personGridEl.appendChild(srHead);
    var parties = lInParliament ? ["SD", "M", "KD", "L"] : ["SD", "M", "KD"];
    parties.forEach(function (party) {
      var group = el("div", "person-party-group");
      group.appendChild(el("h3", "person-party-label", PARTIES[party].name));
      var grid = el("div", "person-grid");
      CANDIDATES.filter(function (c) { return c.party === party && isCandidateAvailable(c); })
        .sort(function (a, b) { return surname(a.name).localeCompare(surname(b.name), "sv") || a.name.localeCompare(b.name, "sv"); })
        .forEach(function (c) { grid.appendChild(renderPersonCard(c)); });
      group.appendChild(grid);
      personGridEl.appendChild(group);
    });
  }

  function renderPersonCard(c) {
    var isFixed = fixedCandidateIds.has(c.id);
    var card = el(isFixed ? "div" : "button", "person-card" + (isFixed ? " fixed" : ""));
    if (!isFixed) card.type = "button";

    var row = el("span", "post-person");
    var av = avatarEl(c);
    av.setAttribute("aria-hidden", "true");
    paintParty(av, c.party);
    row.appendChild(av);

    var info = el("span");
    info.appendChild(el("span", "person-name", c.name));
    var roleLine = el("span", "person-role");
    var tag = el("span", "party-tag", c.party);
    paintParty(tag, c.party);
    roleLine.appendChild(tag);
    roleLine.appendChild(document.createTextNode(" " + (c.role || "")));
    info.appendChild(roleLine);
    row.appendChild(info);
    card.appendChild(row);

    var currentSlot = findSlotOfCandidate(c.id);
    if (currentSlot) {
      card.classList.add("seated");
      card.appendChild(el("span", "person-assignment", portfoliosById[currentSlot].title));
    }

    if (c.quote) {
      var q = el("span", "post-quote");
      q.appendChild(document.createTextNode("“" + c.quote.text + "”"));
      var src = document.createElement("a");
      src.className = "post-quote-source";
      src.href = c.quote.url;
      src.target = "_blank";
      src.rel = "noopener";
      src.textContent = c.quote.source;
      src.addEventListener("click", function(e) { e.stopPropagation(); });
      q.appendChild(src);
      card.appendChild(q);
    }

    if (!isFixed) {
      card.addEventListener("click", function () { openPostPicker(c.id, card); });
    }
    return card;
  }

  function openPostPicker(candidateId, opener) {
    activePersonId = candidateId;
    postPickerOpener = opener || null;
    var c = candidatesById[candidateId];
    postPickerTitle.textContent = c.name;
    postPickerSub.textContent = c.party + " · " + (c.role || "");
    var currentSlot = findSlotOfCandidate(candidateId);
    postPickerFoot.hidden = !currentSlot;
    renderPostPickerList();
    postPickerBackdrop.hidden = false;
    personPageRegions.forEach(function (r) { r.inert = true; });
    document.body.style.overflow = "hidden";
    setTimeout(function () { postPickerModal.focus(); }, 0);
  }

  function closePostPicker() {
    postPickerBackdrop.hidden = true;
    activePersonId = null;
    personPageRegions.forEach(function (r) { r.inert = false; });
    document.body.style.overflow = "";
    if (postPickerOpener && document.contains(postPickerOpener)) {
      postPickerOpener.focus();
    }
    postPickerOpener = null;
  }

  function renderPostPickerList() {
    postPickerList.innerHTML = "";
    var c = candidatesById[activePersonId];
    var currentSlot = findSlotOfCandidate(activePersonId);
    var lastDept = "";

    PORTFOLIOS.forEach(function (p) {
      if (p.fixed) return;

      if (p.dept !== lastDept) {
        lastDept = p.dept;
        var header = el("li", "candidate-group", p.dept);
        header.setAttribute("role", "presentation");
        postPickerList.appendChild(header);
      }

      var li = el("li");
      var row = el("button", "post-row");
      row.type = "button";
      var isSelected = currentSlot === p.id;
      if (isSelected) row.classList.add("selected");

      var canDo = canAssign(p.id, activePersonId);
      if (!canDo && !isSelected) {
        row.setAttribute("aria-disabled", "true");
      }

      var info = el("span", "post-row-info");
      info.appendChild(el("span", "post-row-title", p.title));
      var occupantId = state[p.id];
      if (occupantId && occupantId !== activePersonId) {
        var occ = candidatesById[occupantId];
        info.appendChild(el("span", "post-row-occupant", occ.name + " (" + occ.party + ") sitter här"));
      }
      row.appendChild(info);

      if (isSelected) {
        var check = el("span", "party-tag", "✓");
        check.style.background = "var(--navy)";
        row.appendChild(check);
      }

      row.addEventListener("click", function () {
        if (!canDo && !isSelected) return;
        if (isSelected) {
          takeSnapshot();
          clearSlot(p.id);
          renderAll();
          renderPersonBrowser();
          closePostPicker();
          showToast(c.name + " borttagen från " + p.title + ".", undoAction());
          return;
        }
        takeSnapshot();
        var ok = assign(p.id, activePersonId);
        if (!ok) {
          undoSnapshot = null;
          return;
        }
        var canUndo = settleSnapshot();
        var r = renderAll();
        renderPersonBrowser();
        closePostPicker();
        if (!r.complete) showToast(c.name + " (" + c.party + ") blir " + p.title + ".", canUndo ? undoAction() : null);
      });

      li.appendChild(row);
      postPickerList.appendChild(li);
    });
  }

  postPickerClose.addEventListener("click", closePostPicker);
  postPickerBackdrop.addEventListener("click", function (e) {
    if (e.target === postPickerBackdrop) closePostPicker();
  });
  document.addEventListener("keydown", function (e) {
    if (postPickerBackdrop.hidden) return;
    if (e.key === "Escape") {
      closePostPicker();
      e.stopPropagation();
    }
  });
  removePersonBtn.addEventListener("click", function () {
    if (!activePersonId) return;
    var slot = findSlotOfCandidate(activePersonId);
    if (!slot) return;
    var c = candidatesById[activePersonId];
    var title = portfoliosById[slot].title;
    takeSnapshot();
    clearSlot(slot);
    renderAll();
    renderPersonBrowser();
    closePostPicker();
    showToast(c.name + " borttagen från " + title + ".", undoAction());
  });

  // ---------- init ----------

  const source = loadState();
  renderLToggle();
  renderAll();
  document.body.dataset.ready = "1";
  if (source === "hash" && countFilled() === TOTAL) {
    // En delad länk: visa resultatet direkt.
    const top = resultEl.getBoundingClientRect().top + window.scrollY - statusbarEl.offsetHeight - 8;
    window.scrollTo({ top, behavior: "instant" });
  } else if (source === "storage" && countFilled() > 1) {
    showToast("Din sparade regering är laddad.", { label: "Börja om", onClick: resetAll });
  }
})();
