// ============================================================
// MENHERA — Header y footer compartidos
// Se inyectan en <div id="site-header"></div> y <div id="site-footer"></div>
// ============================================================

function renderHeader(activePage) {
  const el = document.getElementById("site-header");
  if (!el) return;

  const links = [
    { href: "index.html", ch: "01", label: "INICIO", key: "home" },
    { href: "tactic-maker.html", ch: "02", label: "CONSTRUCTOR", key: "maker" },
    { href: "library.html", ch: "03", label: "BIBLIOTECA", key: "library" },
    { href: "leaderboard.html", ch: "04", label: "PUNTUACIONES", key: "leaderboard" },
    { href: "characters.html", ch: "05", label: "PERSONAJES", key: "characters" },
    { href: "personas.html", ch: "06", label: "PERSONAS", key: "personas" },
  ];

  el.innerHTML = `
    <header class="site-header">
      <div class="wrap">
        <div class="logo">
          <span class="mark">MENHERA</span>
          <span class="sub">P5:TPX</span>
        </div>
        <nav class="nav-channels">
          ${links
            .map(
              (l) =>
                `<a href="${l.href}" data-ch="${l.ch}" class="${l.key === activePage ? "active" : ""}">${l.label}</a>`
            )
            .join("")}
        </nav>
        <div class="session-slot" id="session-slot"></div>
      </div>
    </header>
    <div class="channel-bar"></div>
  `;
}

function renderFooter() {
  const el = document.getElementById("site-footer");
  if (!el) return;

  el.innerHTML = `
    <footer class="site-footer">
      <div class="wrap">
        <div class="footer-brand">MENHERA</div>
        <div class="footer-credits">
          <span><span class="label">Discord</span>1x10d</span>
          <span><span class="label">Contacto</span>dsyxleic24@gmail.com</span>
        </div>
      </div>
    </footer>
  `;
}

function mountChrome(activePage) {
  renderHeader(activePage);
  renderFooter();
}
