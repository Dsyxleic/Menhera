// ============================================================
// MENHERA — Puntuaciones semanales
// ============================================================

let CURRENT_WEEK_ID = null;
let CURRENT_ENTRIES = { A: {}, B: {} }; // puesto -> {nombre, puntos}

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

document.addEventListener("DOMContentLoaded", () => {
  loadWeeks();

  document.getElementById("week-select").addEventListener("change", (e) => {
    CURRENT_WEEK_ID = e.target.value;
    loadWeekEntries();
  });
  document.getElementById("new-week-btn").addEventListener("click", createWeek);
  document.getElementById("save-lb-btn").addEventListener("click", saveLeaderboard);

  MenheraAuth.onChange(() => renderTables());
});
