// ============================================================
// MENHERA — Sesión / estado de administrador
// ============================================================

window.MenheraAuth = (function () {
  let currentUser = null;
  let isAdmin = false;
  const listeners = [];

  async function init() {
    const { data: { session } } = await sb.auth.getSession();
    await applySession(session);

    sb.auth.onAuthStateChange(async (_event, session) => {
      await applySession(session);
    });
  }

  async function applySession(session) {
    currentUser = session ? session.user : null;
    isAdmin = false;

    if (currentUser) {
      // Comprueba si el usuario está en la tabla admins.
      // Como la tabla admins bloquea el acceso directo (policy false),
      // usamos una función RPC segura para comprobarlo.
      const { data, error } = await sb.rpc("is_admin");
      if (!error) isAdmin = !!data;
    }

    listeners.forEach((fn) => fn({ user: currentUser, isAdmin }));
    renderSessionSlot();
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  async function login(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error;
  }

  async function logout() {
    await sb.auth.signOut();
  }

  function renderSessionSlot() {
    const slot = document.getElementById("session-slot");
    if (!slot) return;

    if (currentUser && isAdmin) {
      slot.innerHTML = `
        <span class="session-pill is-admin">◉ ADMIN — ${currentUser.email}</span>
        <button class="btn btn-ghost" id="logout-btn">Salir</button>
      `;
      document.getElementById("logout-btn").onclick = () => logout();
    } else if (currentUser) {
      slot.innerHTML = `
        <span class="session-pill">Sesión sin permisos de edición</span>
        <button class="btn btn-ghost" id="logout-btn">Salir</button>
      `;
      document.getElementById("logout-btn").onclick = () => logout();
    } else {
      slot.innerHTML = `<a class="btn btn-ghost" href="login.html">Acceso admin</a>`;
    }

    // Muestra/oculta cualquier elemento marcado con [data-admin-only]
    document.querySelectorAll("[data-admin-only]").forEach((el) => {
      el.classList.toggle("hidden", !isAdmin);
    });
  }

  return { init, onChange, login, logout, getIsAdmin: () => isAdmin, getUser: () => currentUser };
})();

document.addEventListener("DOMContentLoaded", () => {
  window.MenheraAuth.init();
});
