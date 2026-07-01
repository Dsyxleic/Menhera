// ============================================================
// MENHERA — Constructor de rotación
// ============================================================

let ROSTER = [];
let PERSONAS = [];
let PERSONA_SKILLS_CACHE = {};
let COLUMN_COUNT = 4;
let TURNS = []; // [{ cells: [ [entry,...], [entry,...], ... ] }]
let WONDER_PERSONAS = [null, null, null]; // [{ personaId, skillLabel }, ...]
let EDITING_ROTATION_ID = null;

// Paleta de etiquetas de color para las acciones (fácil de ampliar)
const TAG_DEFS = [
  { key: "hl", label: "HL", color: "#e8c34a" },
  { key: "navi", label: "Navi", color: "#9fe6a0" },
  { key: "teurgia", label: "Teurgia", color: "#9fd0f0" },
  { key: "miku", label: "Miku", color: "#39c5bb" },
  { key: "extra", label: "Extra", color: "#c99ee8" },
];

function tagDef(key) {
  return TAG_DEFS.find((t) => t.key === key) || null;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function emptyEntry(characterId) {
  return { id: uid(), characterId: characterId || "", actionLabel: "", tag: null };
}

function newTurn() {
  const cells = [];
  for (let i = 0; i < COLUMN_COUNT; i++) cells.push([]);
  return { tag: null, cells };
}

// ---------------- Carga inicial ----------------

async function loadRosterAndBosses() {
  const { data: chars } = await sb.from("characters").select("*").order("sort_order");
  ROSTER = chars || [];

  const { data: bosses } = await sb.from("bosses").select("*").order("name");
  const bossSelect = document.getElementById("rot-boss");
  bossSelect.innerHTML =
    `<option value="">— Sin jefe —</option>` +
    (bosses || []).map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join("");

  const { data: modes } = await sb.from("game_modes").select("*").order("name");
  const modeSelect = document.getElementById("rot-mode");
  modeSelect.innerHTML =
    `<option value="">— Sin especificar —</option>` +
    (modes || []).map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join("");

  const dpsSelect = document.getElementById("rot-dps");
  dpsSelect.innerHTML =
    `<option value="">— Sin especificar —</option>` +
    ROSTER.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");

  renderColumnSelectors();
}

async function loadPersonasData() {
  const { data: personas } = await sb.from("personas").select("*").order("sort_order");
  PERSONAS = personas || [];

  const { data: skills } = await sb.from("persona_skills").select("*").order("sort_order");
  PERSONA_SKILLS_CACHE = {};
  (skills || []).forEach((s) => {
    if (!PERSONA_SKILLS_CACHE[s.persona_id]) PERSONA_SKILLS_CACHE[s.persona_id] = [];
    PERSONA_SKILLS_CACHE[s.persona_id].push(s);
  });

  renderWonderPersonaSlots();
}

async function createGameMode() {
  const name = prompt("Nombre del modo de juego:");
  if (!name) return;
  const { error } = await sb.from("game_modes").insert({ name: name.trim() });
  if (error) { alert("Error: " + error.message); return; }
  await loadRosterAndBosses();
}

function renderWonderPersonaSlots() {
  const box = document.getElementById("wonder-persona-slots");
  box.innerHTML = "";

  for (let i = 0; i < 3; i++) {
    const slot = WONDER_PERSONAS[i] || { personaId: "", skillLabel: "" };
    const persona = PERSONAS.find((p) => p.id === slot.personaId);
    const skills = persona ? PERSONA_SKILLS_CACHE[persona.id] || [] : [];

    const div = document.createElement("div");
    div.className = "persona-slot";

    const avatar = document.createElement(persona?.avatar_url ? "img" : "div");
    avatar.className = "persona-slot-avatar" + (persona?.avatar_url ? "" : " placeholder");
    if (persona?.avatar_url) {
      avatar.src = persona.avatar_url;
    } else {
      avatar.textContent = "Sin foto";
    }
    div.appendChild(avatar);

    const personaSelect = document.createElement("select");
    personaSelect.innerHTML =
      `<option value="">— Elegir persona —</option>` +
      PERSONAS.map((p) => `<option value="${p.id}" ${slot.personaId === p.id ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join("");
    personaSelect.onchange = () => {
      WONDER_PERSONAS[i] = { personaId: personaSelect.value, skillLabel: "" };
      renderWonderPersonaSlots();
    };
    div.appendChild(personaSelect);

    const skillSelect = document.createElement("select");
    skillSelect.innerHTML =
      `<option value="">— Elegir skill —</option>` +
      skills.map((s) => `<option value="${escapeHtml(s.label)}" ${slot.skillLabel === s.label ? "selected" : ""}>${escapeHtml(s.label)}</option>`).join("") +
      `<option value="__custom__">✎ Escribir manualmente…</option>`;
    skillSelect.disabled = !persona;
    skillSelect.onchange = () => {
      if (skillSelect.value === "__custom__") {
        const custom = prompt("Escribe la skill:", slot.skillLabel || "");
        WONDER_PERSONAS[i] = { personaId: slot.personaId, skillLabel: custom || "" };
      } else {
        WONDER_PERSONAS[i] = { personaId: slot.personaId, skillLabel: skillSelect.value };
      }
      renderWonderPersonaSlots();
    };
    div.appendChild(skillSelect);

    box.appendChild(div);
  }
}

function renderColumnSelectors() {
  const box = document.getElementById("column-selectors");
  const current = getColumnAssignments();

  box.innerHTML = "";
  for (let i = 0; i < COLUMN_COUNT; i++) {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <label>Columna ${i + 1}</label>
      <select data-col="${i}" class="col-select">
        <option value="">— Elegir personaje —</option>
        ${ROSTER.map(
          (c) => `<option value="${c.id}" ${current[i] === c.id ? "selected" : ""}>${escapeHtml(c.name)}</option>`
        ).join("")}
      </select>
    `;
    box.appendChild(wrap);
  }

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.gap = "8px";
  controls.style.alignItems = "flex-end";
  controls.innerHTML = `
    <button class="btn btn-ghost" id="col-minus-btn" type="button">− Columna</button>
    <button class="btn btn-ghost" id="col-plus-btn" type="button">+ Columna</button>
  `;
  box.appendChild(controls);

  document.getElementById("col-plus-btn").onclick = () => {
    COLUMN_COUNT++;
    TURNS.forEach((t) => t.cells.push([]));
    renderColumnSelectors();
    renderTurns();
  };
  document.getElementById("col-minus-btn").onclick = () => {
    if (COLUMN_COUNT <= 1) return;
    COLUMN_COUNT--;
    TURNS.forEach((t) => t.cells.pop());
    renderColumnSelectors();
    renderTurns();
  };

  box.querySelectorAll(".col-select").forEach((sel) => {
    sel.addEventListener("change", () => renderTurns());
  });
}

function getColumnAssignments() {
  const selects = document.querySelectorAll(".col-select");
  const arr = [];
  selects.forEach((s) => arr.push(s.value));
  return arr;
}

// ---------------- Turnos ----------------

function addTurn() {
  TURNS.push(newTurn());
  renderTurns();
}

function renderTurns() {
  const container = document.getElementById("turns-container");
  const assignments = getColumnAssignments();
  container.innerHTML = "";

  TURNS.forEach((turn, turnIdx) => {
    const row = document.createElement("div");
    row.className = "turn-row";

    const turnTagDef = tagDef(turn.tag);

    const idxEl = document.createElement("div");
    idxEl.className = "turn-index";
    if (turnTagDef) {
      idxEl.style.background = hexToRgba(turnTagDef.color, 0.22);
      idxEl.style.borderColor = turnTagDef.color;
      idxEl.style.color = turnTagDef.color;
    }

    const idxNum = document.createElement("div");
    idxNum.textContent = turnIdx + 1;
    idxEl.appendChild(idxNum);

    const idxDots = document.createElement("div");
    idxDots.className = "turn-tag-dots";
    TAG_DEFS.forEach((t) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "tag-dot" + (turn.tag === t.key ? " is-active" : "");
      dot.style.background = t.color;
      dot.title = "Colorear turno: " + t.label;
      dot.onclick = () => {
        turn.tag = turn.tag === t.key ? null : t.key;
        renderTurns();
      };
      idxDots.appendChild(dot);
    });
    idxEl.appendChild(idxDots);

    row.appendChild(idxEl);

    const colsWrap = document.createElement("div");
    colsWrap.className = "turn-cols";
    colsWrap.style.gridTemplateColumns = `repeat(${COLUMN_COUNT}, 1fr)`;
    colsWrap.style.display = "grid";

    for (let colIdx = 0; colIdx < COLUMN_COUNT; colIdx++) {
      const charId = assignments[colIdx] || "";
      const character = ROSTER.find((c) => c.id === charId);

      const cell = document.createElement("div");
      cell.className = "turn-cell";
      if (turnTagDef) {
        cell.style.background = hexToRgba(turnTagDef.color, 0.10);
        cell.style.borderTopColor = turnTagDef.color;
      }

      const head = document.createElement("div");
      head.className = "turn-cell-head";
      head.innerHTML = character
        ? `${character.avatar_url ? `<img src="${character.avatar_url}" alt="" class="head-avatar" />` : ""}<span>${escapeHtml(character.name)}</span>`
        : `<span>Columna ${colIdx + 1}</span>`;
      cell.appendChild(head);

      turn.cells[colIdx].forEach((entry) => {
        cell.appendChild(renderEntryRow(entry, character));
      });

      const addBtn = document.createElement("button");
      addBtn.className = "entry-add-btn";
      addBtn.type = "button";
      addBtn.textContent = "+ acción";
      addBtn.onclick = () => {
        turn.cells[colIdx].push(emptyEntry(charId));
        renderTurns();
      };
      cell.appendChild(addBtn);

      colsWrap.appendChild(cell);
    }

    row.appendChild(colsWrap);

    const removeWrap = document.createElement("div");
    removeWrap.style.gridColumn = "2 / -1";
    removeWrap.style.textAlign = "right";
    removeWrap.innerHTML = `<button class="btn btn-ghost turn-remove-btn" type="button">Eliminar turno</button>`;
    removeWrap.querySelector("button").onclick = () => {
      TURNS.splice(turnIdx, 1);
      renderTurns();
    };

    container.appendChild(row);
    container.appendChild(removeWrap);
  });
}

function renderEntryRow(entry, character) {
  const div = document.createElement("div");
  div.className = "entry-row";
  const tag = tagDef(entry.tag);
  if (tag) {
    div.style.background = hexToRgba(tag.color, 0.18);
    div.style.borderLeft = `3px solid ${tag.color}`;
  }

  if (character?.avatar_url) {
    const avatar = document.createElement("img");
    avatar.src = character.avatar_url;
    avatar.className = "entry-avatar";
    div.appendChild(avatar);
  }

  const actionOptions = character
    ? ROSTER_ACTIONS_CACHE[character.id] || []
    : [];

  const select = document.createElement("select");
  select.innerHTML =
    `<option value="">Elegir acción…</option>` +
    actionOptions.map((a) => `<option value="${escapeHtml(a.label)}" ${entry.actionLabel === a.label ? "selected" : ""}>${escapeHtml(a.label)}</option>`).join("") +
    `<option value="__custom__" ${entry.actionLabel && !actionOptions.find(a=>a.label===entry.actionLabel) ? "selected" : ""}>✎ Escribir manualmente…</option>`;

  select.onchange = () => {
    if (select.value === "__custom__") {
      const custom = prompt("Escribe el nombre de la acción:", entry.actionLabel || "");
      entry.actionLabel = custom || "";
      renderTurns();
    } else {
      entry.actionLabel = select.value;
    }
  };

  const tagsWrap = document.createElement("div");
  tagsWrap.className = "tag-dots";
  TAG_DEFS.forEach((t) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "tag-dot" + (entry.tag === t.key ? " is-active" : "");
    dot.style.background = t.color;
    dot.title = t.label;
    dot.onclick = () => {
      entry.tag = entry.tag === t.key ? null : t.key;
      renderTurns();
    };
    tagsWrap.appendChild(dot);
  });

  const delBtn = document.createElement("button");
  delBtn.className = "btn btn-ghost";
  delBtn.type = "button";
  delBtn.textContent = "✕";
  delBtn.onclick = () => {
    for (const cell of TURNS.flatMap((t) => t.cells)) {
      const i = cell.indexOf(entry);
      if (i >= 0) cell.splice(i, 1);
    }
    renderTurns();
  };

  div.appendChild(select);
  div.appendChild(tagsWrap);
  div.appendChild(delBtn);
  return div;
}

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ---------------- Cache de acciones por personaje ----------------

let ROSTER_ACTIONS_CACHE = {};

async function loadAllActions() {
  const { data } = await sb.from("character_actions").select("*").order("sort_order");
  ROSTER_ACTIONS_CACHE = {};
  (data || []).forEach((a) => {
    if (!ROSTER_ACTIONS_CACHE[a.character_id]) ROSTER_ACTIONS_CACHE[a.character_id] = [];
    ROSTER_ACTIONS_CACHE[a.character_id].push(a);
  });
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// ---------------- Guardar / cargar rotación ----------------

async function saveRotation() {
  const statusEl = document.getElementById("save-status");
  const title = document.getElementById("rot-title").value.trim();
  if (!title) {
    statusEl.textContent = "Ponle un título a la rotación.";
    return;
  }

  const grid = {
    columns: getColumnAssignments(),
    turns: TURNS,
    wonder: {
      knife: document.getElementById("wonder-knife").value.trim(),
      personas: WONDER_PERSONAS,
    },
  };

  const payload = {
    title,
    notes: document.getElementById("rot-notes").value.trim(),
    boss_id: document.getElementById("rot-boss").value || null,
    game_mode_id: document.getElementById("rot-mode").value || null,
    dps_character_id: document.getElementById("rot-dps").value || null,
    wonder_knife: grid.wonder.knife,
    grid,
    updated_at: new Date().toISOString(),
  };

  statusEl.textContent = "Guardando…";

  let error;
  if (EDITING_ROTATION_ID) {
    ({ error } = await sb.from("rotations").update(payload).eq("id", EDITING_ROTATION_ID));
  } else {
    payload.created_by = MenheraAuth.getUser()?.id || null;
    const res = await sb.from("rotations").insert(payload).select().single();
    error = res.error;
    if (!error) EDITING_ROTATION_ID = res.data.id;
  }

  statusEl.textContent = error ? "Error: " + error.message : "Guardado ✓";
}

async function loadRotationForEdit(id) {
  const { data, error } = await sb.from("rotations").select("*").eq("id", id).single();
  if (error || !data) return;

  EDITING_ROTATION_ID = data.id;
  document.getElementById("rot-title").value = data.title || "";
  document.getElementById("rot-notes").value = data.notes || "";
  document.getElementById("wonder-knife").value = data.wonder_knife || "";
  if (data.boss_id) document.getElementById("rot-boss").value = data.boss_id;
  if (data.game_mode_id) document.getElementById("rot-mode").value = data.game_mode_id;
  if (data.dps_character_id) document.getElementById("rot-dps").value = data.dps_character_id;

  const grid = data.grid || { columns: [], turns: [] };
  COLUMN_COUNT = grid.columns?.length || 4;
  TURNS = grid.turns || [];
  WONDER_PERSONAS = grid.wonder?.personas || [null, null, null];

  renderColumnSelectors();
  // reaplicar selección de columnas guardadas
  const selects = document.querySelectorAll(".col-select");
  selects.forEach((s, i) => { if (grid.columns && grid.columns[i]) s.value = grid.columns[i]; });

  renderTurns();
  renderWonderPersonaSlots();
}

// ---------------- Nuevo jefe ----------------

async function createBoss() {
  const name = prompt("Nombre del jefe:");
  if (!name) return;
  const { error } = await sb.from("bosses").insert({ name: name.trim() });
  if (error) { alert("Error: " + error.message); return; }
  await loadRosterAndBosses();
}

// ---------------- Exportar como imagen ----------------

function renderExportPreview() {
  const target = document.getElementById("export-target");
  const assignments = getColumnAssignments();
  const title = document.getElementById("rot-title").value.trim() || "Rotación sin título";
  const notes = document.getElementById("rot-notes").value.trim();
  const knife = document.getElementById("wonder-knife").value.trim();

  const personaHtml = WONDER_PERSONAS
    .filter((s) => s && s.personaId)
    .map((s) => {
      const p = PERSONAS.find((x) => x.id === s.personaId);
      return `<span class="export-persona">${p && p.avatar_url ? `<img src="${p.avatar_url}" />` : ""}${p ? escapeHtml(p.name) : ""}${s.skillLabel ? ` — ${escapeHtml(s.skillLabel)}` : ""}</span>`;
    })
    .join("");

  let html = `<div class="export-sheet">
    <div class="export-title">${escapeHtml(title)}</div>
    ${notes ? `<div class="export-notes">${escapeHtml(notes)}</div>` : ""}
    ${knife || personaHtml ? `<div class="export-wonder">${knife ? `<strong>Cuchillo:</strong> ${escapeHtml(knife)} &nbsp; ` : ""}${personaHtml}</div>` : ""}
    <table class="export-table">
      <thead><tr>${assignments.map((id) => {
        const c = ROSTER.find((x) => x.id === id);
        return `<th style="background:${c ? c.color_bg : "#2c1f21"}; color:${c ? c.color_text : "#efe6dd"}">
          ${c && c.avatar_url ? `<img src="${c.avatar_url}" class="th-avatar" />` : ""}
          ${c ? escapeHtml(c.name) : "—"}
        </th>`;
      }).join("")}</tr></thead>
      <tbody>`;

  TURNS.forEach((turn, i) => {
    const turnTag = tagDef(turn.tag);
    const rowStyle = turnTag ? ` style="background:${hexToRgba(turnTag.color, 0.16)};"` : "";
    const maxRows = Math.max(1, ...turn.cells.map((c) => c.length));
    for (let r = 0; r < maxRows; r++) {
      html += `<tr${rowStyle}>`;
      turn.cells.forEach((cell) => {
        const entry = cell[r];
        const tag = entry ? tagDef(entry.tag) : null;
        const style = tag ? `style="background:${hexToRgba(tag.color, 0.28)}; color:${tag.color}; font-weight:600;"` : "";
        html += `<td ${style}>${entry ? escapeHtml(entry.actionLabel || "") : ""}</td>`;
      });
      html += "</tr>";
    }
  });

  html += `</tbody></table></div>`;
  target.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("preview-btn").addEventListener("click", () => {
    renderExportPreview();
    document.getElementById("export-modal").classList.remove("hidden");
  });
  document.getElementById("export-close-btn").addEventListener("click", () => {
    document.getElementById("export-modal").classList.add("hidden");
  });
  document.getElementById("download-img-btn").addEventListener("click", async () => {
    const target = document.getElementById("export-target");
    const canvas = await html2canvas(target, { backgroundColor: "#0a0908", scale: 2 });
    const link = document.createElement("a");
    link.download = "rotacion-menhera.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
});

// ---------------- Exportar / importar como archivo (para invitados) ----------------

function exportRotationJSON() {
  const title = document.getElementById("rot-title").value.trim();
  if (!title) {
    document.getElementById("save-status").textContent = "Ponle un título antes de exportar.";
    return;
  }

  const data = {
    title,
    notes: document.getElementById("rot-notes").value.trim(),
    boss_id: document.getElementById("rot-boss").value || null,
    game_mode_id: document.getElementById("rot-mode").value || null,
    dps_character_id: document.getElementById("rot-dps").value || null,
    wonder_knife: document.getElementById("wonder-knife").value.trim(),
    grid: {
      columns: getColumnAssignments(),
      turns: TURNS,
      wonder: {
        knife: document.getElementById("wonder-knife").value.trim(),
        personas: WONDER_PERSONAS,
      },
    },
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const filename = title.replace(/[^a-z0-9\-_ ]/gi, "").trim() + ".menhera.json";
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  document.getElementById("save-status").textContent =
    `Descargado "${filename}" — mándaselo a 1x10d por Discord para que lo publique.`;
}

async function importRotationJSON(file) {
  const statusEl = document.getElementById("save-status");
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch (e) {
    statusEl.textContent = "Ese archivo no es válido.";
    return;
  }

  EDITING_ROTATION_ID = null; // se guardará como rotación nueva

  document.getElementById("rot-title").value = data.title || "";
  document.getElementById("rot-notes").value = data.notes || "";
  document.getElementById("wonder-knife").value = data.wonder_knife || data.grid?.wonder?.knife || "";
  if (data.boss_id) document.getElementById("rot-boss").value = data.boss_id;
  if (data.game_mode_id) document.getElementById("rot-mode").value = data.game_mode_id;
  if (data.dps_character_id) document.getElementById("rot-dps").value = data.dps_character_id;

  const grid = data.grid || { columns: [], turns: [] };
  COLUMN_COUNT = grid.columns?.length || 4;
  TURNS = grid.turns || [];
  WONDER_PERSONAS = grid.wonder?.personas || [null, null, null];

  renderColumnSelectors();
  const selects = document.querySelectorAll(".col-select");
  selects.forEach((s, i) => { if (grid.columns && grid.columns[i]) s.value = grid.columns[i]; });

  renderTurns();
  renderWonderPersonaSlots();

  statusEl.textContent = "Archivo importado — revísalo y dale a \"Guardar rotación\" para archivarlo.";
}

// ---------------- Init ----------------

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("add-turn-btn").addEventListener("click", addTurn);
  document.getElementById("save-rotation-btn").addEventListener("click", saveRotation);
  document.getElementById("new-boss-btn").addEventListener("click", createBoss);
  document.getElementById("new-mode-btn").addEventListener("click", createGameMode);
  document.getElementById("export-json-btn").addEventListener("click", exportRotationJSON);
  document.getElementById("import-json-input").addEventListener("change", (e) => {
    if (e.target.files[0]) importRotationJSON(e.target.files[0]);
    e.target.value = "";
  });

  await loadAllActions();
  await loadRosterAndBosses();
  await loadPersonasData();

  const params = new URLSearchParams(window.location.search);
  const editId = params.get("id");

  if (editId) {
    await loadRotationForEdit(editId);
  } else {
    addTurn();
  }

  MenheraAuth.onChange(({ isAdmin }) => {
    document.getElementById("guest-notice").classList.toggle("hidden", isAdmin);
  });
});
