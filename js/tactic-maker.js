// ============================================================
// MENHERA — Constructor de rotación
// ============================================================

let ROSTER = [];
let COLUMN_COUNT = 4;
let TURNS = []; // [{ cells: [ [entry,...], [entry,...], ... ] }]
let EDITING_ROTATION_ID = null;

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function emptyEntry(characterId) {
  return { id: uid(), characterId: characterId || "", actionLabel: "", highlight: false };
}

function newTurn() {
  const cells = [];
  for (let i = 0; i < COLUMN_COUNT; i++) cells.push([]);
  return { cells };
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

  const dpsSelect = document.getElementById("rot-dps");
  dpsSelect.innerHTML =
    `<option value="">— Sin especificar —</option>` +
    ROSTER.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");

  renderColumnSelectors();
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

    const idxEl = document.createElement("div");
    idxEl.className = "turn-index";
    idxEl.textContent = turnIdx + 1;
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

      const head = document.createElement("div");
      head.className = "turn-cell-head";
      head.textContent = character ? character.name : `Columna ${colIdx + 1}`;
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
  div.className = "entry-row" + (entry.highlight ? " is-highlight" : "");

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

  const highlightBtn = document.createElement("button");
  highlightBtn.className = "btn btn-ghost";
  highlightBtn.type = "button";
  highlightBtn.title = "Marcar como highlight";
  highlightBtn.textContent = "★";
  highlightBtn.style.color = entry.highlight ? "var(--red-glow)" : "var(--bone-dim)";
  highlightBtn.onclick = () => {
    entry.highlight = !entry.highlight;
    renderTurns();
  };

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
  div.appendChild(highlightBtn);
  div.appendChild(delBtn);
  return div;
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
      persona: document.getElementById("wonder-persona").value.trim(),
    },
  };

  const payload = {
    title,
    notes: document.getElementById("rot-notes").value.trim(),
    boss_id: document.getElementById("rot-boss").value || null,
    dps_character_id: document.getElementById("rot-dps").value || null,
    wonder_knife: grid.wonder.knife,
    wonder_persona: grid.wonder.persona,
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
  document.getElementById("wonder-persona").value = data.wonder_persona || "";
  if (data.boss_id) document.getElementById("rot-boss").value = data.boss_id;
  if (data.dps_character_id) document.getElementById("rot-dps").value = data.dps_character_id;

  const grid = data.grid || { columns: [], turns: [] };
  COLUMN_COUNT = grid.columns?.length || 4;
  TURNS = grid.turns || [];

  renderColumnSelectors();
  // reaplicar selección de columnas guardadas
  const selects = document.querySelectorAll(".col-select");
  selects.forEach((s, i) => { if (grid.columns && grid.columns[i]) s.value = grid.columns[i]; });

  renderTurns();
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

  let html = `<div class="export-sheet">
    <div class="export-title">${escapeHtml(title)}</div>
    ${notes ? `<div class="export-notes">${escapeHtml(notes)}</div>` : ""}
    <table class="export-table">
      <thead><tr>${assignments.map((id) => {
        const c = ROSTER.find((x) => x.id === id);
        return `<th style="background:${c ? c.color_bg : "#2c1f21"}; color:${c ? c.color_text : "#efe6dd"}">${c ? escapeHtml(c.name) : "—"}</th>`;
      }).join("")}</tr></thead>
      <tbody>`;

  TURNS.forEach((turn, i) => {
    const maxRows = Math.max(1, ...turn.cells.map((c) => c.length));
    for (let r = 0; r < maxRows; r++) {
      html += "<tr>";
      turn.cells.forEach((cell) => {
        const entry = cell[r];
        html += `<td class="${entry?.highlight ? "hl" : ""}">${entry ? escapeHtml(entry.actionLabel || "") : ""}</td>`;
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

// ---------------- Init ----------------

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("add-turn-btn").addEventListener("click", addTurn);
  document.getElementById("save-rotation-btn").addEventListener("click", saveRotation);
  document.getElementById("new-boss-btn").addEventListener("click", createBoss);

  await loadAllActions();
  await loadRosterAndBosses();

  const params = new URLSearchParams(window.location.search);
  const editId = params.get("id");

  if (editId) {
    await loadRotationForEdit(editId);
  } else {
    addTurn();
  }

  MenheraAuth.onChange(({ isAdmin }) => {
    document.getElementById("maker-root").classList.toggle("hidden", !isAdmin);
    document.getElementById("readonly-notice").classList.toggle("hidden", isAdmin);
  });
});
