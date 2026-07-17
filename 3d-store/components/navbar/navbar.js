(function () {
  const link = (href, label, key) => {
    const page = document.body.dataset.page;
    return `<a href="${href}" class="${page === key ? "is-active" : ""}">${label}</a>`;
  };

  const renderNavbar = () => {
    const mount = document.querySelector("[data-component='navbar']");
    if (!mount) return;
    const settings = Store.getSettings();
    mount.innerHTML = `
      <header class="site-header">
        <div class="container navbar">
          <a class="brand" href="${Utils.rootPath()}index.html">
            <span class="brand-mark">${Utils.escapeHTML(settings.shortName || "FS")}</span>
            <span>${Utils.escapeHTML(settings.siteName || "MAde3D")}</span>
          </a>
          <nav class="nav-links" aria-label="Ana menü">
            ${link(`${Utils.rootPath()}index.html`, "Ana sayfa", "home")}
            ${link(Utils.pagePath("products.html"), "Ürünler", "products")}
            ${link(Utils.pagePath("about.html"), "Hakkımızda", "about")}
            ${link(Utils.pagePath("contact.html"), "İletişim", "contact")}
          </nav>
          <div class="nav-actions">
            <a class="btn btn-outline cart-link" href="${Utils.pagePath("cart.html")}" aria-label="Sepet">
              Sepet
              <span class="cart-count" data-cart-count>0</span>
            </a>
            <button class="icon-btn btn-outline nav-toggle" type="button" aria-label="Menüyü aç">☰</button>
          </div>
        </div>
      </header>
    `;

    mount.querySelector(".nav-toggle")?.addEventListener("click", () => {
      mount.querySelector(".site-header")?.classList.toggle("is-open");
    });
    window.Cart?.updateCounters();
  };

  document.addEventListener("DOMContentLoaded", () => {
    (Store.ready || Promise.resolve()).then(renderNavbar);
  });
  window.Navbar = { renderNavbar };
})();
