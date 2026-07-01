// ============================================================
// MENHERA — Vista de rotación (solo lectura)
// ============================================================

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function loadRotation() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    document.getElementById("rv-title").textContent = "Rotación no encontrada";
    return;
  }

  const { data: r, error } = await sb.from("rotations").select("*").eq("id", id).single();
  if (error || !r) {
    document.getElementById("rv-title").textContent = "Rotación no encontrada";
    return;
  }

  document.getElementById("rv-title").textContent = r.title;
  document.getElementById("rv-edit-link").href = `tactic-maker.html?id=${r.id}`;

  const metaParts = [];
  if (r.boss_id) {
    const { data: boss } = await sb.from("bosses").select("name").eq("id", r.boss_id).single();
    if (boss) metaParts.push(`Jefe: ${boss.name}`);
  }
  if (r.dps_character_id) {
    const { data: c } = await sb.from("characters").select("name").eq("id", r.dps_character_id).single();
    if (c) metaParts.push(`DPS: ${c.name}`);
  }
  document.getElementById("rv-meta").textContent = metaParts.join("   //   ");

  if (r.notes) {
    document.getElementById("rv-notes").classList.remove("hidden");
    document.getElementById("rv-notes").innerHTML = `<strong>Notas:</strong> ${escapeHtml(r.notes)}`;
  }

  if (r.wonder_knife || r.wonder_persona) {
    document.getElementById("rv-wonder").classList.remove("hidden");
    document.getElementById("rv-wonder").innerHTML = `
      <strong>Wonder</strong> —
      ${r.wonder_knife ? `Cuchillo: ${escapeHtml(r.wonder_knife)}` : ""}
      ${r.wonder_persona ? ` &nbsp; Persona: ${escapeHtml(r.wonder_persona)}` : ""}
    `;
  }

  const grid = r.grid || { columns: [], turns: [] };
  const { data: chars } = await sb.from("characters").select("*").in("id", grid.columns.filter(Boolean));
  const charMap = {};
  (chars || []).forEach((c) => (charMap[c.id] = c));

  let html = `<table class="export-table" style="width:100%;">
    <thead><tr>${grid.columns.map((id) => {
      const c = charMap[id];
      return `<th style="background:${c ? c.color_bg : "#2c1f21"}; color:${c ? c.color_text : "#efe6dd"}">${c ? escapeHtml(c.name) : "—"}</th>`;
    }).join("")}</tr></thead>
    <tbody>`;

  (grid.turns || []).forEach((turn) => {
    const maxRows = Math.max(1, ...turn.cells.map((c) => c.length));
    for (let row = 0; row < maxRows; row++) {
      html += "<tr>";
      turn.cells.forEach((cell) => {
        const entry = cell[row];
        html += `<td class="${entry?.highlight ? "hl" : ""}">${entry ? escapeHtml(entry.actionLabel || "") : ""}</td>`;
      });
      html += "</tr>";
    }
  });

  html += `</tbody></table>`;
  document.getElementById("rv-target").innerHTML = `<div class="export-sheet">${html}</div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  loadRotation();
  MenheraAuth.onChange(() => {
    document.querySelectorAll("[data-admin-only]").forEach((el) => {
      el.classList.toggle("hidden", !MenheraAuth.getIsAdmin());
    });
  });
});
