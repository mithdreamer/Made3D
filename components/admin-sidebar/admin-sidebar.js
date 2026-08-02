(function () {
  const item = (href, label, key) => {
    const page = document.body.dataset.adminPage;
    return `<a href="${href}" class="${page === key ? "is-active" : ""}">${label}</a>`;
  };

  const renderAdminSidebar = () => {
    const mount = document.querySelector("[data-component='admin-sidebar']");
    if (!mount) return;
    const settings = Store.getSettings();
    mount.innerHTML = `
      <aside class="admin-sidebar">
        <a class="brand" href="${Utils.adminPath("index.html")}">
          <span class="brand-mark">${Utils.escapeHTML(settings.shortName || "FS")}</span>
          <span>MAde3D Admin</span>
        </a>
        <nav class="admin-nav" aria-label="Admin menü">
          ${item(Utils.adminPath("index.html"), "Dashboard", "dashboard")}
          ${item(Utils.adminPath("products.html"), "Ürünler", "products")}
          ${item(Utils.adminPath("categories.html"), "Kategoriler", "categories")}
          ${item(Utils.adminPath("colors.html"), "Renk Yönetimi", "colors")}
          ${item(Utils.adminPath("messages.html"), "Mesajlar", "messages")}
          ${item(Utils.adminPath("orders.html"), "Siparişler", "orders")}
          ${item(Utils.adminPath("payment-settings.html"), "Ödeme", "payment-settings")}
          ${item(Utils.adminPath("shipping-settings.html"), "Kargo", "shipping-settings")}
          ${item(Utils.adminPath("settings.html"), "Ayarlar", "settings")}
        </nav>
        <div class="admin-sidebar-footer">
          <a class="btn btn-outline" href="${Utils.rootPath()}index.html">Siteye dön</a>
          <button class="btn btn-secondary" type="button" data-export-store>Veriyi indir</button>
          <button class="btn btn-danger" type="button" data-admin-logout>Çıkış yap</button>
        </div>
      </aside>
    `;
  };

  document.addEventListener("DOMContentLoaded", () => {
    Promise.all([
      Store.ready || Promise.resolve(),
      window.AdminAuth?.requireAdminSession?.() || Promise.resolve()
    ]).then(([_, session]) => {
      if (window.AdminAuth && !session) return;
      renderAdminSidebar();
    }).catch((error) => {
      console.error("Admin sidebar yuklenemedi:", error);
    });
  });
  window.AdminSidebar = { renderAdminSidebar };
})();
