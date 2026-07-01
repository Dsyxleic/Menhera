// ============================================================
// MENHERA — Roster de personajes
// ============================================================

let CHAR_CACHE = [];

async function loadCharacters() {
  const grid = document.getElementById("character-grid");
  const { data, error } = await sb
    .from("characters")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    grid.innerHTML = `<p class="dim">Error cargando personajes: ${error.message}</p>`;
    return;
  }

  CHAR_CACHE = data || [];

  if (CHAR_CACHE.length === 0) {
    grid.innerHTML = `<p class="dim">Todavía no hay personajes. Añade el primero arriba.</p>`;
    return;
  }

  grid.innerHTML = CHAR_CACHE
    .map(
      (c) => `
      <div class="char-card panel" data-id="${c.id}" style="--card-accent:${c.color_bg};">
        <div class="char-card-img" data-link-target="${c.link_url ? escapeHtml(c.link_url) : ""}">
          ${c.avatar_url ? `<img src="${c.avatar_url}" alt="${escapeHtml(c.name)}" />` : `<span class="no-img">Sin imagen</span>`}
          ${c.link_url ? `<span class="link-badge" title="Tiene link externo">🔗</span>` : ""}
        </div>
        <div class="char-card-body">
          <div class="char-card-name">${escapeHtml(c.name)}</div>
          <div class="char-card-sub">${escapeHtml(c.subtype || c.role || "")}</div>
        </div>
      </div>
    `
    )
    .join("");

  grid.querySelectorAll(".char-card-img").forEach((img) => {
    img.addEventListener("click", (e) => {
      const url = img.dataset.linkTarget;
      if (url) {
        e.stopPropagation();
        window.open(url, "_blank", "noopener");
      }
    });
  });

  grid.querySelectorAll(".char-card").forEach((card) => {
    card.addEventListener("click", () => openCharModal(card.dataset.id));
  });
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// ---------------- Crear personaje ----------------

async function saveNewCharacter() {
  const statusEl = document.getElementById("char-save-status");
  const name = document.getElementById("new-name").value.trim();
  const subtype = document.getElementById("new-subtype").value.trim();
  const role = document.getElementById("new-role").value.trim();
  const colorBg = document.getElementById("new-color-bg").value;
  const colorText = document.getElementById("new-color-text").value;
  const linkUrl = document.getElementById("new-link").value.trim();
  const fileInput = document.getElementById("new-image");

  if (!name) {
    statusEl.textContent = "Ponle un nombre al personaje.";
    return;
  }

  statusEl.textContent = "Guardando…";

  let avatarUrl = null;
  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const { error: uploadError } = await sb.storage
      .from("character-images")
      .upload(path, file);

    if (uploadError) {
      statusEl.textContent = "Error subiendo imagen: " + uploadError.message;
      return;
    }
    const { data: urlData } = sb.storage.from("character-images").getPublicUrl(path);
    avatarUrl = urlData.publicUrl;
  }

  const { error } = await sb.from("characters").insert({
    name,
    subtype,
    role,
    color_bg: colorBg,
    color_text: colorText,
    avatar_url: avatarUrl,
    link_url: linkUrl || null,
    sort_order: CHAR_CACHE.length,
  });

  if (error) {
    statusEl.textContent = "Error: " + error.message;
    return;
  }

  statusEl.textContent = "Guardado ✓";
  document.getElementById("new-name").value = "";
  document.getElementById("new-subtype").value = "";
  document.getElementById("new-role").value = "";
  document.getElementById("new-link").value = "";
  fileInput.value = "";
  await loadCharacters();
}

// ---------------- Modal: detalle + skills ----------------

async function openCharModal(id) {
  const c = CHAR_CACHE.find((x) => x.id === id);
  if (!c) return;

  document.getElementById("modal-char-name").textContent = c.name;
  document.getElementById("char-modal").classList.remove("hidden");

  const isAdmin = MenheraAuth.getIsAdmin();
  const body = document.getElementById("modal-body");
  body.innerHTML = `<p class="dim">Cargando skills…</p>`;

  const { data: actions, error } = await sb
    .from("character_actions")
    .select("*")
    .eq("character_id", id)
    .order("sort_order", { ascending: true });

  if (error) {
    body.innerHTML = `<p class="dim">Error: ${error.message}</p>`;
    return;
  }

  body.innerHTML = `
    ${
      isAdmin
        ? `
      <div style="display:flex; gap:8px; margin-bottom:16px; align-items:center;">
        <input id="edit-link-url" placeholder="Link externo (https://…)" value="${c.link_url ? escapeHtml(c.link_url) : ""}" style="flex:1;" />
        <button class="btn btn-ghost" id="save-link-btn">Guardar link</button>
      </div>
    `
        : ""
    }
    <div id="action-list">
      ${(actions || [])
        .map(
          (a) => `
        <div class="action-row" data-action-id="${a.id}">
          <span>${escapeHtml(a.label)}</span>
          ${isAdmin ? `<button class="btn btn-ghost del-action-btn">Eliminar</button>` : ""}
        </div>
      `
        )
        .join("") || `<p class="dim">Sin skills todavía.</p>`}
    </div>
    ${
      isAdmin
        ? `
      <div style="display:flex; gap:8px; margin-top:16px;">
        <input id="new-action-label" placeholder="ej. Skill 3, Rebelión, Golpe Especial…" style="flex:1;" />
        <button class="btn btn-primary" id="add-action-btn">Añadir</button>
      </div>
    `
        : ""
    }
  `;

  if (isAdmin) {
    document.getElementById("save-link-btn").onclick = async () => {
      const url = document.getElementById("edit-link-url").value.trim();
      await sb.from("characters").update({ link_url: url || null }).eq("id", id);
      await loadCharacters();
    };

    document.getElementById("add-action-btn").onclick = async () => {
      const label = document.getElementById("new-action-label").value.trim();
      if (!label) return;
      await sb.from("character_actions").insert({ character_id: id, label, sort_order: (actions || []).length });
      openCharModal(id);
    };

    body.querySelectorAll(".del-action-btn").forEach((btn) => {
      btn.onclick = async (e) => {
        const row = e.target.closest(".action-row");
        await sb.from("character_actions").delete().eq("id", row.dataset.actionId);
        openCharModal(id);
      };
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadCharacters();

  document.getElementById("modal-close-btn").addEventListener("click", () => {
    document.getElementById("char-modal").classList.add("hidden");
  });
  document.getElementById("char-modal").addEventListener("click", (e) => {
    if (e.target.id === "char-modal") e.target.classList.add("hidden");
  });

  document.getElementById("toggle-add-btn").addEventListener("click", () => {
    document.getElementById("add-character-panel").classList.toggle("hidden");
  });
  document.getElementById("save-character-btn").addEventListener("click", saveNewCharacter);

  MenheraAuth.onChange(() => loadCharacters());
});
