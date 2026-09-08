(function () {
  "use strict";

  const NON_SD_CAP = 12; // inkl. statsministern
  const SD_FLOOR = 12;
  const TOTAL = PORTFOLIOS.length; // 24
  const SITE_URL = "https://blagulregering.se";

  const candidatesById = {};
  CANDIDATES.forEach((c) => (candidatesById[c.id] = c));

  const portfoliosById = {};
  PORTFOLIOS.forEach((p) => (portfoliosById[p.id] = p));

  // Personer som är låsta till en post (statsministern) får aldrig erbjudas eller
  // slumpas till någon annan post.
  const fixedCandidateIds = new Set(PORTFOLIOS.filter((p) => p.fixed).map((p) => p.fixed));

  // De "tunga" departementen som lyfts fram i resultatet när SD håller dem.
  const HEAVY_POSTS = [
    { id: "justitie", stem: "Justitie" },
    { id: "forsvar", stem: "Försvars" },
    { id: "utrikes", stem: "Utrikes" },
    { id: "finans", stem: "Finans" },
  ];

  // Kortnamn för posterna i resultatrutorna.
  const SHORT_TITLES = {
    pm: "Statsmin.", eu: "EU", arbetsm: "Arbetsm.", jamstalld: "Jämställdh.",
    finans: "Finans", civil: "Civil", finansm: "Finansmarkn.", forsvar: "Försvar",
    civforsvar: "Civilt förs.", justitie: "Justitie", migration: "Migration",
    energi: "Energi", klimat: "Klimat", kultur: "Kultur", landsbygd: "Landsbygd",
    infra: "Infrastr.", social: "Social", aldre: "Äldre", socialtj: "Socialtj.",
    sjukvard: "Sjukvård", utbintegr: "Utbildning", gymhogsk: "Högskola",
    utrikes: "Utrikes", bistand: "Bistånd",
  };

  // state: slotId -> candidateId | null
  let state = {};
  PORTFOLIOS.forEach((p) => (state[p.id] = p.fixed || null));

  // Om Liberalerna antas ha kommit in i riksdagen 2026. Förvalt: nej.
  let lInParliament = false;

  // En nivå ångra för de åtgärder som skriver över många poster på en gång.
  let undoSnapshot = null;

  const STORAGE_KEY = "blagulregering-state-v2";

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const savedSlots = saved.slots || {};
      PORTFOLIOS.forEach((p) => {
        if (p.fixed) return;
        if (savedSlots[p.id] && candidatesById[savedSlots[p.id]]) {
          state[p.id] = savedSlots[p.id];
        }
      });
      if (typeof saved.lInParliament === "boolean") {
        lInParliament = saved.lInParliament;
      }
    } catch (e) {
      /* ignore corrupt storage */
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ slots: state, lInParliament }));
    } catch (e) {
      /* ignore quota errors */
    }
  }

  function takeSnapshot() {
    undoSnapshot = { slots: Object.assign({}, state), lInParliament };
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

  function surname(name) {
    const parts = name.trim().split(" ");
    return parts[parts.length - 1];
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
  }

  // ---------- rendering ----------

  const deptsEl = document.getElementById("departments");
  const heroSeatsEl = document.getElementById("heroSeats");
  const meterEl = document.getElementById("meter");
  const meterTrackEl = document.getElementById("meterTrack");
  const sdCountEl = document.getElementById("sdCount");
  const capLeftEl = document.getElementById("capLeft");
  const filledCountEl = document.getElementById("filledCount");
  const capBannerEl = document.getElementById("capBanner");
  const resultEl = document.getElementById("result");
  const resultTitleEl = document.getElementById("resultTitle");
  const resultSubEl = document.getElementById("resultSub");
  const resultSeatsEl = document.getElementById("resultSeats");
  const resultNoteEl = document.getElementById("resultNote");
  const shareCtaEl = document.getElementById("shareCta");
  const shareCtaBtn = document.getElementById("shareCtaBtn");

  // Sätena visas i en fast ordning: SD-poster först, sedan övriga, sedan tomma.
  // Så blir bilden läsbar direkt: hur mycket gult är det?
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
  }

  function renderMeter() {
    const { sd, other } = orderedSlots();
    meterTrackEl.innerHTML = "";
    // SD fyller från vänster mot strecket vid 12; M/L/KD fyller från höger och
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
      `${sd.length} av ${TOTAL} poster är SD. Minst ${SD_FLOOR} krävs. ${other.length} poster är M, L eller KD.`
    );
  }

  function renderDepartments() {
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
      grouped[dept].forEach((p) => grid.appendChild(renderPostCard(p)));
      section.appendChild(grid);
      deptsEl.appendChild(section);
    });
  }

  function renderPostCard(p) {
    const btn = el("button", "post" + (p.fixed ? " fixed" : ""));
    btn.type = "button";
    btn.setAttribute("data-slot", p.id);
    if (p.fixed) btn.setAttribute("aria-disabled", "true");

    btn.appendChild(el("div", "post-title", p.title));

    const occId = state[p.id];
    if (occId) {
      const c = candidatesById[occId];
      btn.classList.add(c.party);
      const row = el("div", "post-person");

      const av = el("div", "avatar", initials(c.name));
      av.setAttribute("aria-hidden", "true");
      paintParty(av, c.party);
      row.appendChild(av);

      const info = el("div");
      info.appendChild(el("div", "person-name", c.name));
      const roleLine = el("div", "person-role");
      const tag = el("span", "party-tag", c.party);
      paintParty(tag, c.party);
      roleLine.appendChild(tag);
      roleLine.appendChild(document.createTextNode(" " + (c.role || "")));
      info.appendChild(roleLine);
      row.appendChild(info);
      btn.appendChild(row);
    } else {
      const empty = el("div", "post-empty");
      const av = el("div", "avatar-empty");
      av.setAttribute("aria-hidden", "true");
      empty.appendChild(av);
      empty.appendChild(document.createTextNode("Välj statsråd"));
      btn.appendChild(empty);
    }

    if (!p.fixed) {
      btn.addEventListener("click", () => openPicker(p.id, btn));
    }
    return btn;
  }

  function heavyPostsHeldBySD() {
    return HEAVY_POSTS.filter((h) => partyOfSlot(h.id) === "SD").map((h) => ({
      stem: h.stem,
      name: candidatesById[state[h.id]].name,
    }));
  }

  function joinSv(items) {
    if (items.length <= 1) return items.join("");
    return items.slice(0, -1).join(", ") + " och " + items[items.length - 1];
  }

  function renderResult(filled, sd) {
    const complete = filled === TOTAL;
    resultEl.hidden = !complete;
    shareCtaEl.hidden = !complete;
    document.body.classList.toggle("has-cta", complete);
    if (!complete) return;

    resultTitleEl.innerHTML = "";
    const num = el("span", "num", `${sd} av ${TOTAL}`);
    resultTitleEl.appendChild(num);
    resultTitleEl.appendChild(
      document.createTextNode(sd === 1 ? " statsråd är Sverigedemokrat" : " statsråd är Sverigedemokrater")
    );

    resultSubEl.textContent =
      "Så här kan Ulf Kristerssons nästa regering se ut när minst tolv poster måste gå till SD.";

    renderSeatGrid(resultSeatsEl, true);

    const heavy = heavyPostsHeldBySD();
    resultNoteEl.innerHTML = "";
    if (heavy.length) {
      const depts = joinSv(heavy.map((h, i) => (i < heavy.length - 1 ? h.stem + "-" : h.stem + "departementet")));
      const strong = el("strong", null, depts.replace(/-$/, ""));
      resultNoteEl.appendChild(document.createTextNode("Sverigedemokraterna tar "));
      resultNoteEl.appendChild(strong);
      resultNoteEl.appendChild(document.createTextNode(": " + joinSv(heavy.map((h) => h.name)) + "."));
    } else {
      resultNoteEl.textContent =
        "I den här regeringen håller M och KD de tunga departementen – och SD har tolv andra.";
    }

    shareCtaBtn.textContent = `Dela: ${sd} av ${TOTAL} är SD`;
  }

  function renderStatus() {
    const filled = countFilled();
    const sd = countSD();
    const nonSD = countNonSD([]);

    sdCountEl.textContent = String(sd);
    capLeftEl.textContent = String(Math.max(0, NON_SD_CAP - nonSD));
    filledCountEl.textContent = `${filled} / ${TOTAL}`;

    renderMeter();
    renderSeatGrid(heroSeatsEl, false);

    const atCap = nonSD >= NON_SD_CAP;
    const complete = filled === TOTAL;
    capBannerEl.hidden = !(atCap && !complete);
    capBannerEl.textContent =
      "Taket är nått: 12 av 24 platser (inklusive statsministern) är redan M, L eller KD. " +
      "Ska Ulf kunna bilda regering måste resten bli SD – nästa lediga post kan bara gå till Sverigedemokraterna.";

    renderResult(filled, sd);
  }

  function renderAll() {
    renderDepartments();
    renderStatus();
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
  const pageRegions = ["header", "#statusbar", "#capBanner", "#result", "main", ".bottom-actions", "footer", "#shareCta"]
    .map((s) => document.querySelector(s))
    .filter(Boolean);

  let activeSlotId = null;
  let activePartyFilter = "ALL";
  let openerEl = null;

  function openPicker(slotId, opener) {
    activeSlotId = slotId;
    activePartyFilter = "ALL";
    openerEl = opener || null;
    searchInput.value = "";
    const p = portfoliosById[slotId];
    modalTitle.textContent = p.title;
    modalSub.textContent = p.dept;
    clearSlotBtn.hidden = !state[slotId];
    renderPartyTabs();
    renderCandidateList();
    backdrop.hidden = false;
    pageRegions.forEach((r) => (r.inert = true));
    document.body.style.overflow = "hidden";
    // På mobil skymmer tangentbordet halva listan om sökfältet fokuseras direkt;
    // låt dialogen få fokus och låt användaren välja att söka.
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
      // Kortet ritades om; hitta det nya kortet för samma post.
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
      { id: "L", label: "L" },
      { id: "KD", label: "KD" },
      { id: "SD", label: "SD" },
    ];
    partyTabsEl.innerHTML = "";
    tabs.forEach((t) => {
      if (t.id === "L" && !lInParliament) return;
      const b = el("button", "party-tab", t.label);
      b.type = "button";
      b.setAttribute("aria-pressed", String(activePartyFilter === t.id));
      b.addEventListener("click", () => {
        activePartyFilter = t.id;
        renderPartyTabs();
        renderCandidateList();
      });
      partyTabsEl.appendChild(b);
    });
  }

  function renderCandidateList() {
    const query = searchInput.value.trim().toLowerCase();
    const nonSDAtCap = activeSlotId && countNonSD([activeSlotId]) >= NON_SD_CAP;

    let list = CANDIDATES.filter((c) => {
      if (!isCandidateAvailable(c)) return false;
      if (activePartyFilter !== "ALL" && c.party !== activePartyFilter) return false;
      if (query && !c.name.toLowerCase().includes(query)) return false;
      return true;
    });

    list = list.slice().sort(
      (a, b) =>
        surname(a.name).localeCompare(surname(b.name), "sv") || a.name.localeCompare(b.name, "sv")
    );

    candidateListEl.innerHTML = "";

    if (list.length === 0) {
      candidateListEl.appendChild(el("li", "candidate-empty-msg", "Inga kandidater matchar."));
    }

    list.forEach((c) => {
      const li = el("li");
      const row = el("button", "candidate-row");
      row.type = "button";
      const isSelected = state[activeSlotId] === c.id;
      const elsewhereSlot = findSlotOfCandidate(c.id);
      const isElsewhere = elsewhereSlot && elsewhereSlot !== activeSlotId;
      if (isSelected) row.classList.add("selected");
      if (isElsewhere) row.classList.add("elsewhere");

      const blocked = c.party !== "SD" && nonSDAtCap && !isSelected;
      if (blocked) {
        row.disabled = true;
        row.setAttribute("aria-describedby", "modalBlocked");
      }

      const av = el("div", "avatar", initials(c.name));
      av.setAttribute("aria-hidden", "true");
      paintParty(av, c.party);
      row.appendChild(av);

      const main = el("div", "candidate-main");
      main.appendChild(el("span", "person-name", c.name));
      let roleText = c.role || "";
      if (isElsewhere) roleText += ` · sitter just nu på: ${portfoliosById[elsewhereSlot].title}`;
      main.appendChild(el("div", "person-role", roleText));
      row.appendChild(main);

      const tag = el("span", "party-tag", c.party);
      paintParty(tag, c.party);
      row.appendChild(tag);

      row.addEventListener("click", () => {
        const targetTitle = portfoliosById[activeSlotId].title;
        const ok = assign(activeSlotId, c.id);
        if (!ok) {
          modalBlocked.hidden = false;
          return;
        }
        undoSnapshot = null;
        renderAll();
        closePicker();
        showToast(`${c.name} (${c.party}) tillsatt som ${targetTitle}.`);
      });

      li.appendChild(row);
      candidateListEl.appendChild(li);
    });

    modalBlocked.hidden = !nonSDAtCap;
  }

  function focusablesInModal() {
    return Array.from(
      modalEl.querySelectorAll('button:not([disabled]):not([hidden]), input:not([disabled])')
    ).filter((n) => n.offsetParent !== null);
  }

  searchInput.addEventListener("input", renderCandidateList);
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
    clearSlot(activeSlotId);
    renderAll();
    closePicker();
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

  toastAction.addEventListener("click", () => {
    const fn = toastHandler;
    toastEl.hidden = true;
    toastHandler = null;
    if (fn) fn();
  });

  function undoAction() {
    return { label: "Ångra", onClick: restoreSnapshot };
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
    const hadContent = countFilled() > 1;
    if (hadContent) takeSnapshot();
    else undoSnapshot = null;
    const overrides = lInParliament ? {} : EXAMPLE_FILL_NO_L_OVERRIDES;
    PORTFOLIOS.forEach((p) => {
      if (p.fixed) return;
      state[p.id] = overrides[p.id] || EXAMPLE_FILL[p.id] || null;
    });
    saveState();
    renderAll();
    showToast(`Ett troligt förslag är ifyllt: ${countSD()} av ${TOTAL} statsråd är SD.`, hadContent ? undoAction() : null);
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
    const hadContent = countFilled() > 1;
    if (hadContent) takeSnapshot();
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
    renderAll();
    showToast(`Regeringen är slumpad: ${countSD()} av ${TOTAL} statsråd är SD.`, hadContent ? undoAction() : null);
  });

  // ---------- share ----------

  function buildShareText() {
    const sd = countSD();
    const filled = countFilled();
    const lines = [];
    lines.push(`${sd} av ${TOTAL} statsråd i min Kristersson-regering är SD.`);
    if (filled < TOTAL) lines.push(`(${filled} av ${TOTAL} poster tillsatta.)`);
    lines.push("");
    PORTFOLIOS.forEach((p) => {
      const occId = state[p.id];
      const c = occId ? candidatesById[occId] : null;
      lines.push(`${p.title}: ${c ? `${c.name} (${c.party})` : "–"}`);
    });
    return lines.join("\n");
  }

  async function share() {
    const text = buildShareText();
    const textWithLink = text + `\n\nBygg din egen: ${SITE_URL}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, text, url: SITE_URL });
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(textWithLink);
      showToast("Din regering är kopierad – klistra in där du vill dela den.");
    } catch (e) {
      window.prompt("Kopiera manuellt:", textWithLink);
    }
  }
  ["shareBtn", "shareTopBtn", "shareCtaBtn"].forEach((id) =>
    document.getElementById(id).addEventListener("click", share)
  );

  // Dölj den fasta dela-knappen på mobil när resultatrutan (som har sin egen) syns.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        const visible = entries.some((en) => en.isIntersecting);
        shareCtaEl.classList.toggle("is-behind-result", visible);
        shareCtaEl.style.visibility = visible ? "hidden" : "";
      },
      { threshold: 0.2 }
    ).observe(resultEl);
  }

  // ---------- init ----------

  loadState();
  renderLToggle();
  renderAll();
  if (countFilled() > 1) {
    showToast("Din sparade regering är laddad.", { label: "Börja om", onClick: resetAll });
  }
})();
