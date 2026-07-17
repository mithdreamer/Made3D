(function () {
  const renderFooter = () => {
    const mount = document.querySelector("[data-component='footer']");
    if (!mount) return;
    const settings = Store.getSettings();
    mount.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-grid">
            <div>
              <a class="brand" href="${Utils.rootPath()}index.html">
                <span class="brand-mark">${Utils.escapeHTML(settings.shortName || "FS")}</span>
                <span>${Utils.escapeHTML(settings.siteName || "MAde3D")}</span>
              </a>
              <p>Kişiye özel 3D baskı, prototip üretim ve dekoratif ürünler için MAde3D vitrini.</p>
            </div>
            <div>
              <h3>Mağaza</h3>
              <div class="footer-links">
                <a href="${Utils.pagePath("products.html")}">Ürünler</a>
                <a href="${Utils.pagePath("cart.html")}">Sepet</a>
                <a href="${Utils.pagePath("checkout.html")}">Ödeme</a>
              </div>
            </div>
            <div>
              <h3>Kurumsal</h3>
              <div class="footer-links">
                <a href="${Utils.pagePath("about.html")}">Hakkımızda</a>
                <a href="${Utils.pagePath("contact.html")}">İletişim</a>
                <a href="${Utils.adminPath("index.html")}">Admin Panel</a>
              </div>
            </div>
            <div>
              <h3>İletişim</h3>
              <div class="footer-links">
                <a href="tel:${Utils.escapeHTML(settings.phone)}">${Utils.escapeHTML(settings.phone)}</a>
                <a href="mailto:${Utils.escapeHTML(settings.email)}">${Utils.escapeHTML(settings.email)}</a>
                <span>${Utils.escapeHTML(settings.address)}</span>
              </div>
            </div>
          </div>
          <div class="footer-bottom">
            <span>© ${new Date().getFullYear()} ${Utils.escapeHTML(settings.siteName || "MAde3D")}</span>
            <span>MAde3D demo mağaza</span>
          </div>
        </div>
      </footer>
    `;
  };

  document.addEventListener("DOMContentLoaded", () => {
    (Store.ready || Promise.resolve()).then(renderFooter);
  });
  window.Footer = { renderFooter };
})();
