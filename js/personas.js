// ============================================================
// MENHERA — Roster de Personas
// ============================================================

let PERSONA_CACHE = [];

function escapeHtmlP(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function loadPersonas() {
  const grid = document.getElementById("persona-grid");
  const { data, error } = await sb.from("personas").select("*").order("sort_order", { ascending: true });

  if (error) {
    grid.innerHTML = `<p class="dim">Error cargando personas: ${error.message}</p>`;
    return;
  }

  PERSONA_CACHE = data || [];

  if (PERSONA_CACHE.length === 0) {
    grid.innerHTML = `<p class="dim">Todavía no hay personas. Añade la primera arriba.</p>`;
    return;
  }

  grid.innerHTML = PERSONA_CACHE
    .map(
      (p) => `
      <div class="char-card panel" data-id="${p.id}">
        <div class="char-card-img" data-link-target="${p.link_url ? escapeHtmlP(p.link_url) : ""}">
          ${p.avatar_url ? `<img src="${p.avatar_url}" alt="${escapeHtmlP(p.name)}" />` : `<span class="no-img">Sin imagen</span>`}
          ${p.link_url ? `<span class="link-badge" title="Tiene link externo">🔗</span>` : ""}
        </div>
        <div class="char-card-body">
          <div class="char-card-name">${escapeHtmlP(p.name)}</div>
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
    card.addEventListener("click", () => openPersonaModal(card.dataset.id));
  });
}

async function saveNewPersona() {
  const statusEl = document.getElementById("persona-save-status");
  const name = document.getElementById("new-persona-name").value.trim();
  const linkUrl = document.getElementById("new-persona-link").value.trim();
  const fileInput = document.getElementById("new-persona-image");

  if (!name) {
    statusEl.textContent = "Ponle un nombre a la persona.";
    return;
  }

  statusEl.textContent = "Guardando…";

  let avatarUrl = null;
  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `personas/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const { error: uploadError } = await sb.storage.from("character-images").upload(path, file);
    if (uploadError) {
      statusEl.textContent = "Error subiendo imagen: " + uploadError.message;
      return;
    }
    const { data: urlData } = sb.storage.from("character-images").getPublicUrl(path);
    avatarUrl = urlData.publicUrl;
  }

  const { error } = await sb.from("personas").insert({
    name,
    avatar_url: avatarUrl,
    link_url: linkUrl || null,
    sort_order: PERSONA_CACHE.length,
  });

  if (error) {
    statusEl.textContent = "Error: " + error.message;
    return;
  }

  statusEl.textContent = "Guardado ✓";
  document.getElementById("new-persona-name").value = "";
  document.getElementById("new-persona-link").value = "";
  fileInput.value = "";
  await loadPersonas();
}

async function openPersonaModal(id) {
  const p = PERSONA_CACHE.find((x) => x.id === id);
  if (!p) return;

  document.getElementById("persona-modal-name").textContent = p.name;
  document.getElementById("persona-modal").classList.remove("hidden");

  const isAdmin = MenheraAuth.getIsAdmin();
  const body = document.getElementById("persona-modal-body");
  body.innerHTML = `<p class="dim">Cargando skills…</p>`;

  const { data: skills, error } = await sb
    .from("persona_skills")
    .select("*")
    .eq("persona_id", id)
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
        <input id="edit-persona-link-url" placeholder="Link externo (https://…)" value="${p.link_url ? escapeHtmlP(p.link_url) : ""}" style="flex:1;" />
        <button class="btn btn-ghost" id="save-persona-link-btn">Guardar link</button>
      </div>
    `
        : ""
    }
    <div id="persona-skill-list">
      ${(skills || [])
        .map(
          (s) => `
        <div class="action-row" data-skill-id="${s.id}">
          <span>${escapeHtmlP(s.label)}</span>
          ${isAdmin ? `<button class="btn btn-ghost del-skill-btn">Eliminar</button>` : ""}
        </div>
      `
        )
        .join("") || `<p class="dim">Sin skills todavía.</p>`}
    </div>
    ${
      isAdmin
        ? `
      <div style="display:flex; gap:8px; margin-top:16px;">
        <input id="new-persona-skill" placeholder="ej. Teurgia, buff, curación…" style="flex:1;" />
        <button class="btn btn-primary" id="add-persona-skill-btn">Añadir</button>
      </div>
    `
        : ""
    }
  `;

  if (isAdmin) {
    document.getElementById("save-persona-link-btn").onclick = async () => {
      const url = document.getElementById("edit-persona-link-url").value.trim();
      await sb.from("personas").update({ link_url: url || null }).eq("id", id);
      await loadPersonas();
    };

    document.getElementById("add-persona-skill-btn").onclick = async () => {
      const label = document.getElementById("new-persona-skill").value.trim();
      if (!label) return;
      await sb.from("persona_skills").insert({ persona_id: id, label, sort_order: (skills || []).length });
      openPersonaModal(id);
    };

    body.querySelectorAll(".del-skill-btn").forEach((btn) => {
      btn.onclick = async (e) => {
        const row = e.target.closest(".action-row");
        await sb.from("persona_skills").delete().eq("id", row.dataset.skillId);
        openPersonaModal(id);
      };
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadPersonas();

  document.getElementById("persona-modal-close-btn").addEventListener("click", () => {
    document.getElementById("persona-modal").classList.add("hidden");
  });
  document.getElementById("persona-modal").addEventListener("click", (e) => {
    if (e.target.id === "persona-modal") e.target.classList.add("hidden");
  });

  document.getElementById("toggle-add-persona-btn").addEventListener("click", () => {
    document.getElementById("add-persona-panel").classList.toggle("hidden");
  });
  document.getElementById("save-persona-btn").addEventListener("click", saveNewPersona);

  MenheraAuth.onChange(() => loadPersonas());
});
