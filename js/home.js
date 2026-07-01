// ============================================================
// MENHERA — Inicio: últimas rotaciones
// ============================================================

function escapeHtmlHome(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "justo ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  return `hace ${days} día${days === 1 ? "" : "s"}`;
}

async function loadRecentRotations() {
  const box = document.getElementById("recent-rotations");

  const { data, error } = await sb
    .from("rotations")
    .select("id, title, created_at, boss_id")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error || !data || data.length === 0) {
    box.innerHTML = `<p class="dim">Todavía no hay rotaciones publicadas — <a href="tactic-maker.html">crea la primera</a>.</p>`;
    return;
  }

  const bossIds = [...new Set(data.filter((r) => r.boss_id).map((r) => r.boss_id))];
  let bossMap = {};
  if (bossIds.length) {
    const { data: bosses } = await sb.from("bosses").select("id, name").in("id", bossIds);
    (bosses || []).forEach((b) => (bossMap[b.id] = b.name));
  }

  box.innerHTML = data
    .map(
      (r) => `
      <a class="recent-item" href="rotation-view.html?id=${r.id}">
        <span class="recent-item-title">${escapeHtmlHome(r.title)}${r.boss_id && bossMap[r.boss_id] ? ` <span class="dim">— ${escapeHtmlHome(bossMap[r.boss_id])}</span>` : ""}</span>
        <span class="recent-item-meta">${timeAgo(r.created_at)}</span>
      </a>
    `
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", loadRecentRotations);
