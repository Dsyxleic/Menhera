// ============================================================
// MENHERA — Biblioteca de rotaciones
// ============================================================

let ALL_ROTATIONS = [];
let BOSS_MAP = {};
let CHAR_MAP = {};
let MODE_MAP = {};

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function loadLibrary() {
  const [{ data: rotations }, { data: bosses }, { data: chars }, { data: modes }] = await Promise.all([
    sb.from("rotations").select("*").order("created_at", { ascending: false }),
    sb.from("bosses").select("*").order("name"),
    sb.from("characters").select("*").order("sort_order"),
    sb.from("game_modes").select("*").order("name"),
  ]);

  ALL_ROTATIONS = rotations || [];
  (bosses || []).forEach((b) => (BOSS_MAP[b.id] = b.name));
  (chars || []).forEach((c) => (CHAR_MAP[c.id] = c.name));
  (modes || []).forEach((m) => (MODE_MAP[m.id] = m.name));

  const bossFilter = document.getElementById("filter-boss");
  bossFilter.innerHTML =
    `<option value="">Todos</option>` +
    (bosses || []).map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join("");

  const modeFilter = document.getElementById("filter-mode");
  modeFilter.innerHTML =
    `<option value="">Todos</option>` +
    (modes || []).map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join("");

  const dpsFilter = document.getElementById("filter-dps");
  dpsFilter.innerHTML =
    `<option value="">Todos</option>` +
    (chars || []).map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");

  renderList();
}

function renderList() {
  const bossVal = document.getElementById("filter-boss").value;
  const modeVal = document.getElementById("filter-mode").value;
  const dpsVal = document.getElementById("filter-dps").value;
  const search = document.getElementById("filter-search").value.trim().toLowerCase();

  const filtered = ALL_ROTATIONS.filter((r) => {
    if (bossVal && r.boss_id !== bossVal) return false;
    if (modeVal && r.game_mode_id !== modeVal) return false;
    if (dpsVal && r.dps_character_id !== dpsVal) return false;
    if (search && !r.title.toLowerCase().includes(search)) return false;
    return true;
  });

  const list = document.getElementById("rotation-list");

  if (filtered.length === 0) {
    list.innerHTML = `<p class="dim">No hay rotaciones que coincidan con el filtro.</p>`;
    return;
  }

  list.innerHTML = filtered
    .map((r) => {
      const bossName = r.boss_id ? BOSS_MAP[r.boss_id] : null;
      const modeName = r.game_mode_id ? MODE_MAP[r.game_mode_id] : null;
      const dpsName = r.dps_character_id ? CHAR_MAP[r.dps_character_id] : null;
      return `
        <div class="rotation-card panel">
          <div class="rotation-card-title">${escapeHtml(r.title)}</div>
          <div class="rotation-card-meta">
            ${bossName ? `<span><span class="tag">Jefe</span> ${escapeHtml(bossName)}</span>` : ""}
            ${modeName ? `<span><span class="tag">Modo</span> ${escapeHtml(modeName)}</span>` : ""}
            ${dpsName ? `<span><span class="tag">DPS</span> ${escapeHtml(dpsName)}</span>` : ""}
          </div>
          <div class="rotation-card-actions">
            <a class="btn btn-ghost" href="rotation-view.html?id=${r.id}">Ver</a>
            <a class="btn btn-ghost hidden" data-admin-only href="tactic-maker.html?id=${r.id}">Editar</a>
          </div>
        </div>
      `;
    })
    .join("");

  document.querySelectorAll("[data-admin-only]").forEach((el) => {
    el.classList.toggle("hidden", !MenheraAuth.getIsAdmin());
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadLibrary();
  document.getElementById("filter-boss").addEventListener("change", renderList);
  document.getElementById("filter-mode").addEventListener("change", renderList);
  document.getElementById("filter-dps").addEventListener("change", renderList);
  document.getElementById("filter-search").addEventListener("input", renderList);
  MenheraAuth.onChange(() => renderList());
});
