(function () {
  "use strict";

  const NON_SD_CAP = 12; // inkl. statsministern
  const SD_FLOOR = 12;
  const TOTAL = PORTFOLIOS.length; // 24

  const candidatesById = {};
  CANDIDATES.forEach((c) => (candidatesById[c.id] = c));

  const portfoliosById = {};
  PORTFOLIOS.forEach((p) => (portfoliosById[p.id] = p));

  // state: slotId -> candidateId | null
  let state = {};
  PORTFOLIOS.forEach((p) => (state[p.id] = p.fixed || null));

  // Om Liberalerna antas ha kommit in i riksdagen 2026. Av förvalt läge: nej.
  let lInParliament = false;

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
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ slots: state, lInParliament })
      );
    } catch (e) {
      /* ignore quota errors */
    }
  }

  function isCandidateAvailable(c) {
    return lInParliament || c.party !== "L";
  }

  function findSlotOfCandidate(candidateId) {
    for (const p of PORTFOLIOS) {
      if (state[p.id] === candidateId) return p.id;
    }
    return null;
  }

  function countNonSD(excludeSlotIds) {
    let count = 0;
    PORTFOLIOS.forEach((p) => {
      if (excludeSlotIds.includes(p.id)) return;
      const occ = state[p.id];
      if (occ && candidatesById[occ].party !== "SD") count++;
    });
    return count;
  }

  function countSD() {
    let count = 0;
    PORTFOLIOS.forEach((p) => {
      const occ = state[p.id];
      if (occ && candidatesById[occ].party === "SD") count++;
    });
    return count;
  }

  function countFilled() {
    return PORTFOLIOS.filter((p) => !!state[p.id]).length;
  }

  function canAssign(slotId, candidateId) {
    const candidate = candidatesById[candidateId];
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

  // ---------- rendering ----------

  const deptsEl = document.getElementById("departments");
  const filledCountEl = document.getElementById("filledCount");
  const filledBarEl = document.getElementById("filledBar");
  const sdCountEl = document.getElementById("sdCount");
  const sdBarEl = document.getElementById("sdBar");
  const partyChipsEl = document.getElementById("partyChips");
  const capBannerEl = document.getElementById("capBanner");

  function initials(name) {
    return name
      .split(" ")
      .filter((w) => w.length && /[A-Za-zÅÄÖåäö]/.test(w[0]))
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  }

  function avatarStyle(party) {
    return `background:${PARTIES[party].color}`;
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
      const section = document.createElement("section");
      section.className = "dept";
      const h2 = document.createElement("h2");
      h2.textContent = dept;
      section.appendChild(h2);

      const grid = document.createElement("div");
      grid.className = "dept-grid";
      grouped[dept].forEach((p) => grid.appendChild(renderPostCard(p)));
      section.appendChild(grid);

      deptsEl.appendChild(section);
    });
  }

  function renderPostCard(p) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "post" + (p.fixed ? " fixed" : "");
    btn.setAttribute("data-slot", p.id);

    const title = document.createElement("div");
    title.className = "post-title";
    title.textContent = p.title;
    btn.appendChild(title);

    const occId = state[p.id];
    if (occId) {
      const c = candidatesById[occId];
      const row = document.createElement("div");
      row.className = "post-person";

      const av = document.createElement("div");
      av.className = "avatar";
      av.style = avatarStyle(c.party);
      av.textContent = initials(c.name);
      row.appendChild(av);

      const info = document.createElement("div");
      const nameLine = document.createElement("div");
      nameLine.className = "person-name";
      nameLine.textContent = c.name;
      info.appendChild(nameLine);

      const roleLine = document.createElement("div");
      roleLine.className = "person-role";
      const tag = document.createElement("span");
      tag.className = "party-tag";
      tag.style = `background:${PARTIES[c.party].color}`;
      tag.textContent = c.party;
      roleLine.appendChild(tag);
      roleLine.appendChild(document.createTextNode(" " + (c.role || "")));
      info.appendChild(roleLine);

      row.appendChild(info);
      btn.appendChild(row);
    } else {
      const empty = document.createElement("div");
      empty.className = "post-empty";
      const av = document.createElement("div");
      av.className = "avatar-empty";
      empty.appendChild(av);
      empty.appendChild(document.createTextNode("Tom post — klicka för att välja"));
      btn.appendChild(empty);
    }

    if (!p.fixed) {
      btn.addEventListener("click", () => openPicker(p.id));
    }
    return btn;
  }

  function renderStatus() {
    const filled = countFilled();
    const sd = countSD();

    filledCountEl.textContent = `${filled} / ${TOTAL}`;
    filledBarEl.style.width = `${(filled / TOTAL) * 100}%`;

    sdCountEl.textContent = `${sd} / ${SD_FLOOR}`;
    const sdPct = Math.min(100, (sd / SD_FLOOR) * 100);
    sdBarEl.style.width = `${sdPct}%`;
    sdBarEl.classList.toggle("met", sd >= SD_FLOOR);

    const counts = { M: 0, L: 0, KD: 0, SD: 0 };
    PORTFOLIOS.forEach((p) => {
      const occ = state[p.id];
      if (occ) counts[candidatesById[occ].party]++;
    });
    partyChipsEl.innerHTML = "";
    const visibleParties = lInParliament ? ["M", "L", "KD", "SD"] : ["M", "KD", "SD"];
    visibleParties.forEach((party) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = PARTIES[party].color;
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(`${party} ${counts[party]}`));
      partyChipsEl.appendChild(chip);
    });

    const nonSDNow = countNonSD([]);
    capBannerEl.hidden = nonSDNow < NON_SD_CAP;
  }

  function renderAll() {
    renderDepartments();
    renderStatus();
  }

  // ---------- picker modal ----------

  const backdrop = document.getElementById("modalBackdrop");
  const modalTitle = document.getElementById("modalTitle");
  const modalSub = document.getElementById("modalSub");
  const modalBlocked = document.getElementById("modalBlocked");
  const modalClose = document.getElementById("modalClose");
  const searchInput = document.getElementById("candidateSearch");
  const partyTabsEl = document.getElementById("partyTabs");
  const candidateListEl = document.getElementById("candidateList");
  const clearSlotBtn = document.getElementById("clearSlotBtn");

  let activeSlotId = null;
  let activePartyFilter = "ALL";

  function openPicker(slotId) {
    activeSlotId = slotId;
    activePartyFilter = "ALL";
    searchInput.value = "";
    const p = portfoliosById[slotId];
    modalTitle.textContent = p.title;
    modalSub.textContent = p.dept;
    clearSlotBtn.hidden = !state[slotId];
    renderPartyTabs();
    renderCandidateList();
    backdrop.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => searchInput.focus(), 0);
  }

  function closePicker() {
    backdrop.hidden = true;
    activeSlotId = null;
    document.body.style.overflow = "";
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
      const b = document.createElement("button");
      b.type = "button";
      b.className = "party-tab" + (activePartyFilter === t.id ? " active" : "");
      b.textContent = t.label;
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
    const nonSDAtCap =
      activeSlotId &&
      countNonSD([activeSlotId, findSlotOfCandidate(state[activeSlotId] || "")].filter(Boolean)) >=
        NON_SD_CAP;

    let list = CANDIDATES.filter((c) => {
      if (!isCandidateAvailable(c)) return false;
      if (activePartyFilter !== "ALL" && c.party !== activePartyFilter) return false;
      if (query && !c.name.toLowerCase().includes(query)) return false;
      return true;
    });

    list = list.slice().sort((a, b) => a.name.localeCompare(b.name, "sv"));

    candidateListEl.innerHTML = "";

    if (list.length === 0) {
      const li = document.createElement("li");
      li.className = "candidate-empty-msg";
      li.textContent =
        !lInParliament && (activePartyFilter === "L" || activePartyFilter === "ALL")
          ? "Liberalerna är avstängda — slå på \"L kom in i riksdagen\" högst upp för att välja L-kandidater."
          : "Inga kandidater matchar.";
      candidateListEl.appendChild(li);
    }

    list.forEach((c) => {
      const li = document.createElement("li");
      const row = document.createElement("button");
      row.type = "button";
      row.className = "candidate-row";
      const isSelected = state[activeSlotId] === c.id;
      const elsewhereSlot = findSlotOfCandidate(c.id);
      const isElsewhere = elsewhereSlot && elsewhereSlot !== activeSlotId;
      if (isSelected) row.classList.add("selected");
      if (isElsewhere) row.classList.add("elsewhere");

      const blocked = c.party !== "SD" && nonSDAtCap && !isSelected;
      if (blocked) row.disabled = true;

      const av = document.createElement("div");
      av.className = "avatar";
      av.style = avatarStyle(c.party);
      av.textContent = initials(c.name);
      row.appendChild(av);

      const main = document.createElement("div");
      main.className = "candidate-main";
      const nameEl = document.createElement("span");
      nameEl.className = "person-name";
      nameEl.textContent = c.name;
      main.appendChild(nameEl);
      const roleEl = document.createElement("div");
      roleEl.className = "person-role";
      let roleText = c.role || "";
      if (isElsewhere) {
        roleText += ` · sitter just nu på: ${portfoliosById[elsewhereSlot].title}`;
      }
      roleEl.textContent = roleText;
      main.appendChild(roleEl);
      row.appendChild(main);

      const tag = document.createElement("span");
      tag.className = "party-tag";
      tag.style = `background:${PARTIES[c.party].color}`;
      tag.textContent = c.party;
      row.appendChild(tag);

      row.addEventListener("click", () => {
        if (blocked) {
          modalBlocked.hidden = false;
          return;
        }
        const targetTitle = portfoliosById[activeSlotId].title;
        const ok = assign(activeSlotId, c.id);
        if (!ok) {
          modalBlocked.hidden = false;
          return;
        }
        renderAll();
        closePicker();
        showToast(`${c.name} (${c.party}) tillsatt som ${targetTitle}.`);
      });

      li.appendChild(row);
      candidateListEl.appendChild(li);
    });

    modalBlocked.hidden = !nonSDAtCap;
  }

  searchInput.addEventListener("input", renderCandidateList);
  modalClose.addEventListener("click", closePicker);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closePicker();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !backdrop.hidden) closePicker();
  });
  clearSlotBtn.addEventListener("click", () => {
    if (!activeSlotId) return;
    clearSlot(activeSlotId);
    renderAll();
    closePicker();
  });

  // ---------- toast ----------

  const toastEl = document.getElementById("toast");
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.hidden = true), 2600);
  }

  // ---------- L-toggle ----------

  const lToggle = document.getElementById("lToggle");
  const lSwitchLabel = document.getElementById("lSwitchLabel");

  function renderLToggle() {
    lToggle.setAttribute("aria-checked", String(lInParliament));
    lSwitchLabel.innerHTML = lInParliament
      ? 'Liberalerna tog sig <strong>in</strong> i riksdagen 2026'
      : 'Liberalerna tog sig <strong>inte</strong> in i riksdagen 2026';
  }

  lToggle.addEventListener("click", () => {
    lInParliament = !lInParliament;
    if (!lInParliament) {
      // Liberalerna åker ur riksdagen: töm alla poster som just nu innehas av L.
      PORTFOLIOS.forEach((p) => {
        if (p.fixed) return;
        const occ = state[p.id];
        if (occ && candidatesById[occ].party === "L") state[p.id] = null;
      });
    }
    saveState();
    renderLToggle();
    renderAll();
  });

  // ---------- top actions ----------

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (!confirm("Nollställ hela regeringen (utom statsministern)?")) return;
    PORTFOLIOS.forEach((p) => {
      if (!p.fixed) state[p.id] = null;
    });
    saveState();
    renderAll();
  });

  document.getElementById("exampleBtn").addEventListener("click", () => {
    const overrides = lInParliament ? {} : EXAMPLE_FILL_NO_L_OVERRIDES;
    PORTFOLIOS.forEach((p) => {
      if (p.fixed) return;
      state[p.id] = overrides[p.id] || EXAMPLE_FILL[p.id] || null;
    });
    saveState();
    renderAll();
    showToast("Ett troligt förslag är ifyllt — 12 av 24 statsråd är nu SD.");
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
    showToast(`Regeringen är slumpad — ${countSD()} av ${TOTAL} statsråd är SD.`);
  });

  document.getElementById("shareBtn").addEventListener("click", async () => {
    const lines = [];
    lines.push("Min regering:");
    PORTFOLIOS.forEach((p) => {
      const occId = state[p.id];
      const c = occId ? candidatesById[occId] : null;
      lines.push(`- ${p.title}: ${c ? `${c.name} (${c.party})` : "—"}`);
    });
    const sd = countSD();
    const filled = countFilled();
    lines.push("");
    lines.push(`SD-statsråd: ${sd} av ${TOTAL} (${filled} poster tillsatta totalt)`);
    const text = lines.join("\n");

    try {
      await navigator.clipboard.writeText(text);
      showToast("Sammanfattningen är kopierad till urklipp.");
    } catch (e) {
      window.prompt("Kopiera manuellt:", text);
    }
  });

  // ---------- init ----------

  loadState();
  renderLToggle();
  renderAll();
})();
