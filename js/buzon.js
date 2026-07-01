// ============================================================
// MENHERA — Buzón de mensajes
// ============================================================

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function sendMessage() {
  const statusEl = document.getElementById("msg-status");
  const author = document.getElementById("msg-author").value.trim();
  const content = document.getElementById("msg-content").value.trim();

  if (!content) {
    statusEl.textContent = "Escribe algo antes de enviar.";
    return;
  }

  statusEl.textContent = "Enviando…";

  const { error } = await sb.from("messages").insert({
    author: author || null,
    content,
  });

  if (error) {
    statusEl.textContent = "Error: " + error.message;
    return;
  }

  statusEl.textContent = "Enviado ✓ Gracias.";
  document.getElementById("msg-author").value = "";
  document.getElementById("msg-content").value = "";

  if (MenheraAuth.getIsAdmin()) loadInbox();
}

async function loadInbox() {
  const list = document.getElementById("inbox-list");
  list.innerHTML = `<p class="dim">Cargando…</p>`;

  const { data, error } = await sb.from("messages").select("*").order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = `<p class="dim">Error: ${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="dim">No hay mensajes todavía.</p>`;
    return;
  }

  list.innerHTML = data
    .map(
      (m) => `
      <div class="inbox-item panel ${m.is_read ? "" : "is-unread"}" data-id="${m.id}">
        <div class="inbox-item-meta">
          <span>${escapeHtml(m.author || "Anónimo")} — ${new Date(m.created_at).toLocaleString("es-ES")}</span>
        </div>
        <div class="inbox-item-content">${escapeHtml(m.content)}</div>
        <div class="inbox-item-actions">
          ${m.is_read ? "" : `<button class="btn btn-ghost mark-read-btn">Marcar como leído</button>`}
          <button class="btn btn-ghost delete-msg-btn">Eliminar</button>
        </div>
      </div>
    `
    )
    .join("");

  list.querySelectorAll(".mark-read-btn").forEach((btn) => {
    btn.onclick = async (e) => {
      const id = e.target.closest(".inbox-item").dataset.id;
      await sb.from("messages").update({ is_read: true }).eq("id", id);
      loadInbox();
    };
  });

  list.querySelectorAll(".delete-msg-btn").forEach((btn) => {
    btn.onclick = async (e) => {
      const id = e.target.closest(".inbox-item").dataset.id;
      await sb.from("messages").delete().eq("id", id);
      loadInbox();
    };
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("send-msg-btn").addEventListener("click", sendMessage);

  MenheraAuth.onChange(({ isAdmin }) => {
    document.getElementById("inbox-section").classList.toggle("hidden", !isAdmin);
    if (isAdmin) loadInbox();
  });
});
