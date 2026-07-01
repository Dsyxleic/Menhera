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
  if (r.game_mode_id) {
    const { data: mode } = await sb.from("game_modes").select("name").eq("id", r.game_mode_id).single();
    if (mode) metaParts.push(`Modo: ${mode.name}`);
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

  const grid0 = r.grid || {};
  const personaIds = (grid0.wonder?.personas || []).filter((s) => s && s.personaId).map((s) => s.personaId);
  let personaMap = {};
  if (personaIds.length) {
    const { data: personas } = await sb.from("personas").select("*").in("id", personaIds);
    (personas || []).forEach((p) => (personaMap[p.id] = p));
  }

  if (r.wonder_knife || personaIds.length) {
    document.getElementById("rv-wonder").classList.remove("hidden");
    const personaHtml = (grid0.wonder?.personas || [])
      .filter((s) => s && s.personaId)
      .map((s) => {
        const p = personaMap[s.personaId];
        return `<span class="export-persona">${p && p.avatar_url ? `<img src="${p.avatar_url}" />` : ""}${p ? escapeHtml(p.name) : ""}${s.skillLabel ? ` — ${escapeHtml(s.skillLabel)}` : ""}</span>`;
      })
      .join("  ");
    document.getElementById("rv-wonder").innerHTML = `
      <strong>Wonder</strong> —
      ${r.wonder_knife ? `Cuchillo: ${escapeHtml(r.wonder_knife)} &nbsp; ` : ""}
      ${personaHtml}
    `;
  }

  const grid = r.grid || { columns: [], turns: [] };
  const { data: chars } = await sb.from("characters").select("*").in("id", grid.columns.filter(Boolean));
  const charMap = {};
  (chars || []).forEach((c) => (charMap[c.id] = c));

  const TAG_COLORS = { hl: "#e8c34a", navi: "#9fe6a0", teurgia: "#9fd0f0", miku: "#39c5bb", extra: "#c99ee8" };

  let html = `<table class="export-table" style="width:100%;">
    <thead><tr>${grid.columns.map((id) => {
      const c = charMap[id];
      return `<th style="background:${c ? c.color_bg : "#2c1f21"}; color:${c ? c.color_text : "#efe6dd"}">
        ${c && c.avatar_url ? `<img src="${c.avatar_url}" class="th-avatar" />` : ""}
        ${c ? escapeHtml(c.name) : "—"}
      </th>`;
    }).join("")}</tr></thead>
    <tbody>`;

  (grid.turns || []).forEach((turn) => {
    const turnColor = turn.tag ? TAG_COLORS[turn.tag] : null;
    const rowStyle = turnColor ? ` style="background:${turnColor}29;"` : "";
    const maxRows = Math.max(1, ...turn.cells.map((c) => c.length));
    for (let row = 0; row < maxRows; row++) {
      html += `<tr${rowStyle}>`;
      turn.cells.forEach((cell) => {
        const entry = cell[row];
        const color = entry?.tag ? TAG_COLORS[entry.tag] : null;
        const style = color ? `style="background:${color}2e; color:${color}; font-weight:600;"` : "";
        html += `<td ${style}>${entry ? escapeHtml(entry.actionLabel || "") : ""}</td>`;
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

  document.getElementById("rv-delete-btn").addEventListener("click", async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) return;
    if (!confirm("¿Eliminar esta rotación? No se puede deshacer.")) return;
    const { error } = await sb.from("rotations").delete().eq("id", id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    window.location.href = "library.html";
  });
});
