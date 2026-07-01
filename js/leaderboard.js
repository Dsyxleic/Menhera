// ============================================================
// MENHERA — Puntuaciones semanales
// ============================================================

let CURRENT_WEEK_ID = null;
let CURRENT_ENTRIES = { A: {}, B: {} }; // puesto -> {nombre, puntos}
const COMPANY_LABELS = { A: "Guild 1", B: "Guild 2" };

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function loadWeeks() {
  const { data } = await sb.from("leaderboard_weeks").select("*").order("created_at", { ascending: false });
  const select = document.getElementById("week-select");

  if (!data || data.length === 0) {
    select.innerHTML = `<option value="">Sin semanas todavía</option>`;
    renderTables();
    return;
  }

  select.innerHTML = data.map((w) => `<option value="${w.id}">${escapeHtml(w.week_label)}</option>`).join("");
  CURRENT_WEEK_ID = select.value;
  await loadWeekEntries();
}

async function loadWeekEntries() {
  CURRENT_ENTRIES = { A: {}, B: {} };
  if (!CURRENT_WEEK_ID) { renderTables(); return; }

  const { data } = await sb
    .from("leaderboard_entries")
    .select("*")
    .eq("week_id", CURRENT_WEEK_ID);

  (data || []).forEach((e) => {
    CURRENT_ENTRIES[e.company][e.puesto] = { nombre: e.nombre, puntos: e.puntos };
  });

  renderTables();
}

function renderTables() {
  const isAdmin = MenheraAuth.getIsAdmin();
  ["A", "B"].forEach((company) => {
    const table = document.getElementById("table-" + company);
    let html = `<thead><tr><th>Puesto</th><th>Nombre</th><th>Puntos</th></tr></thead><tbody>`;

    for (let puesto = 1; puesto <= 30; puesto++) {
      const entry = CURRENT_ENTRIES[company][puesto] || { nombre: "", puntos: "" };
      if (isAdmin) {
        html += `
          <tr data-company="${company}" data-puesto="${puesto}">
            <td class="puesto">${puesto}</td>
            <td><input type="text" class="lb-nombre" value="${escapeHtml(entry.nombre)}" /></td>
            <td><input type="number" class="lb-puntos" value="${entry.puntos}" /></td>
          </tr>
        `;
      } else {
        html += `
          <tr>
            <td class="puesto">${puesto}</td>
            <td>${escapeHtml(entry.nombre)}</td>
            <td>${entry.puntos ? Number(entry.puntos).toLocaleString("es-ES") : ""}</td>
          </tr>
        `;
      }
    }

    html += `</tbody>`;
    table.innerHTML = html;
  });
}

async function saveLeaderboard() {
  const statusEl = document.getElementById("lb-status");
  if (!CURRENT_WEEK_ID) {
    statusEl.textContent = "Crea o elige una semana primero.";
    return;
  }
  statusEl.textContent = "Guardando…";

  const rows = [];
  ["A", "B"].forEach((company) => {
    document.querySelectorAll(`#table-${company} tbody tr`).forEach((tr) => {
      const puesto = parseInt(tr.dataset.puesto, 10);
      const nombre = tr.querySelector(".lb-nombre").value.trim();
      const puntosRaw = tr.querySelector(".lb-puntos").value;
      if (!nombre && !puntosRaw) return;
      rows.push({
        week_id: CURRENT_WEEK_ID,
        company,
        puesto,
        nombre: nombre || "—",
        puntos: puntosRaw ? parseInt(puntosRaw, 10) : 0,
      });
    });
  });

  const { error } = await sb
    .from("leaderboard_entries")
    .upsert(rows, { onConflict: "week_id,company,puesto" });

  statusEl.textContent = error ? "Error: " + error.message : "Guardado ✓";
  if (!error) await loadWeekEntries();
}

async function createWeek() {
  const label = prompt("Nombre de la semana (ej. 'Semana 27 — 23-29 jun 2026'):");
  if (!label) return;
  const { data, error } = await sb.from("leaderboard_weeks").insert({ week_label: label.trim() }).select().single();
  if (error) { alert("Error: " + error.message); return; }
  await loadWeeks();
  document.getElementById("week-select").value = data.id;
  CURRENT_WEEK_ID = data.id;
  await loadWeekEntries();
}

// ---------------- Importar desde texto pegado ----------------

function importPastedText(company) {
  const statusEl = document.getElementById("lb-status");
  const raw = document.getElementById("import-text-" + company).value;
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  if (lines.length === 0) {
    statusEl.textContent = "Pega algo de texto primero.";
    return;
  }

  let count = 0;
  lines.forEach((line, i) => {
    // admite separadores por coma, tabulador, o 2+ espacios
    const parts = line.split(/\t|,|\s{2,}/).map((p) => p.trim()).filter((p) => p !== "");
    if (parts.length < 2) return;

    let puesto, nombre, puntosRaw;
    if (parts.length >= 3 && /^\d+$/.test(parts[0])) {
      // formato: puesto, nombre, puntos
      puesto = parseInt(parts[0], 10);
      puntosRaw = parts[parts.length - 1];
      nombre = parts.slice(1, parts.length - 1).join(" ");
    } else {
      // formato: nombre, puntos (sin puesto explícito -> orden de aparición)
      puesto = i + 1;
      puntosRaw = parts[parts.length - 1];
      nombre = parts.slice(0, parts.length - 1).join(" ");
    }

    const puntos = parseInt(puntosRaw.replace(/[^\d]/g, ""), 10);
    if (!nombre || isNaN(puntos) || puesto < 1 || puesto > 30) return;

    CURRENT_ENTRIES[company][puesto] = { nombre, puntos };
    count++;
  });

  renderTables();
  statusEl.textContent = `Importadas ${count} filas en ${COMPANY_LABELS[company]} — revisa y dale a "Guardar puntuaciones".`;
}

document.addEventListener("DOMContentLoaded", () => {
  loadWeeks();

  document.getElementById("week-select").addEventListener("change", (e) => {
    CURRENT_WEEK_ID = e.target.value;
    loadWeekEntries();
  });
  document.getElementById("new-week-btn").addEventListener("click", createWeek);
  document.getElementById("save-lb-btn").addEventListener("click", saveLeaderboard);
  document.getElementById("export-lb-img-btn").addEventListener("click", exportLeaderboardImage);
  document.getElementById("import-btn-A").addEventListener("click", () => importPastedText("A"));
  document.getElementById("import-btn-B").addEventListener("click", () => importPastedText("B"));

  MenheraAuth.onChange(({ isAdmin }) => {
    document.getElementById("lb-root").classList.toggle("hidden", !isAdmin);
    document.getElementById("lb-private-notice").classList.toggle("hidden", isAdmin);
    if (isAdmin) renderTables();
  });
});

async function exportLeaderboardImage() {
  const weekLabel = document.getElementById("week-select").selectedOptions[0]?.textContent || "Puntuaciones";

  // Construimos una versión de solo lectura (sin inputs) para que la imagen quede limpia
  const wrap = document.createElement("div");
  wrap.style.background = "#0a0908";
  wrap.style.padding = "20px";
  wrap.style.display = "inline-block";

  const title = document.createElement("div");
  title.style.fontFamily = "'Anton', sans-serif";
  title.style.color = "#efe6dd";
  title.style.fontSize = "22px";
  title.style.marginBottom = "14px";
  title.textContent = weekLabel;
  wrap.appendChild(title);

  const cols = document.createElement("div");
  cols.style.display = "flex";
  cols.style.gap = "24px";

  ["A", "B"].forEach((company) => {
    const col = document.createElement("div");
    const h = document.createElement("div");
    h.style.fontFamily = "'Anton', sans-serif";
    h.style.color = "#efe6dd";
    h.style.fontSize = "16px";
    h.style.marginBottom = "8px";
    h.textContent = COMPANY_LABELS[company];
    col.appendChild(h);

    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";
    table.style.fontFamily = "Inter, sans-serif";
    table.style.fontSize = "13px";

    let rowsHtml = `<tr>
      <th style="text-align:left; padding:6px 10px; color:#a89c95; border-bottom:1px solid #2c1f21;">Puesto</th>
      <th style="text-align:left; padding:6px 10px; color:#a89c95; border-bottom:1px solid #2c1f21;">Nombre</th>
      <th style="text-align:left; padding:6px 10px; color:#a89c95; border-bottom:1px solid #2c1f21;">Puntos</th>
    </tr>`;
    for (let puesto = 1; puesto <= 30; puesto++) {
      const entry = CURRENT_ENTRIES[company][puesto];
      if (!entry || !entry.nombre) continue;
      rowsHtml += `<tr>
        <td style="padding:5px 10px; color:#ff3b47; font-family:monospace; border-bottom:1px solid #2c1f21;">${puesto}</td>
        <td style="padding:5px 10px; color:#efe6dd; border-bottom:1px solid #2c1f21;">${escapeHtml(entry.nombre)}</td>
        <td style="padding:5px 10px; color:#efe6dd; border-bottom:1px solid #2c1f21;">${Number(entry.puntos).toLocaleString("es-ES")}</td>
      </tr>`;
    }
    table.innerHTML = rowsHtml;
    col.appendChild(table);
    cols.appendChild(col);
  });

  wrap.appendChild(cols);
  wrap.style.position = "fixed";
  wrap.style.left = "-9999px";
  document.body.appendChild(wrap);

  const canvas = await html2canvas(wrap, { backgroundColor: "#0a0908", scale: 2 });
  document.body.removeChild(wrap);

  const link = document.createElement("a");
  link.download = `menhera-${weekLabel.replace(/[^a-z0-9\-_ ]/gi, "").trim()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
