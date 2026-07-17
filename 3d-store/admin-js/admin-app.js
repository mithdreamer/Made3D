(function () {
  const renderDashboard = () => {
    const metrics = document.querySelector("#dashboardMetrics");
    const latest = document.querySelector("#latestOrders");
    if (!metrics) return;
    const products = Store.getProducts({ includeInactive: true });
    const activeProducts = products.filter((product) => product.active !== false);
    const orders = Store.getOrders();
    const revenue = orders.reduce((sum, order) => sum + order.total, 0);

    metrics.innerHTML = `
      <div class="admin-card metric"><span class="muted">Toplam ürün</span><strong>${products.length}</strong></div>
      <div class="admin-card metric"><span class="muted">Yayındaki ürün</span><strong>${activeProducts.length}</strong></div>
      <div class="admin-card metric"><span class="muted">Sipariş</span><strong>${orders.length}</strong></div>
      <div class="admin-card metric"><span class="muted">Ciro</span><strong>${Utils.money(revenue)}</strong></div>
    `;

    if (latest) {
      latest.innerHTML = orders.slice(0, 5).length
        ? `<ul class="mini-list">${orders
            .slice(0, 5)
            .map(
              (order) => `
                <li>
                  <span><strong>${order.number}</strong><br><span class="muted">${Utils.escapeHTML(order.customer.name)}</span></span>
                  <span class="text-right">${Utils.money(order.total)}<br><span class="badge ${Utils.statusClass(order.status)}">${Utils.statusLabel(order.status)}</span></span>
                </li>
              `
            )
            .join("")}</ul>`
        : `<div class="empty-state"><h2>Sipariş yok</h2></div>`;
    }
  };

  const bindSettings = () => {
    const form = document.querySelector("#settingsForm");
    if (!form) return;
    const settings = Store.getSettings();

    const setAboutImage = (image) => {
      const hidden = document.querySelector("#aboutImage");
      const preview = document.querySelector("#aboutImagePreview");
      if (hidden) hidden.value = image || "";
      if (!preview) return;
      preview.innerHTML = image
        ? `<img src="${image}" alt="Hakkımızda fotoğrafı önizleme">`
        : `<p class="muted">Henüz fotoğraf seçilmedi.</p>`;
    };

    Object.entries(settings).forEach(([key, value]) => {
      if (form.elements[key]) form.elements[key].value = value;
    });
    setAboutImage(settings.aboutImage || "");

    const aboutImageFiles = document.querySelector("#aboutImageFiles");
    aboutImageFiles?.addEventListener("change", async () => {
      const uploaded = await ImageUpload.filesToImages(aboutImageFiles.files);
      setAboutImage(uploaded[0] || "");
      aboutImageFiles.value = "";
    });

    document.querySelector("#clearAboutImage")?.addEventListener("click", () => setAboutImage(""));

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      Store.saveSettings({
        siteName: data.get("siteName"),
        shortName: data.get("shortName"),
        phone: data.get("phone"),
        email: data.get("email"),
        address: data.get("address"),
        adminUsername: data.get("adminUsername"),
        adminPassword: data.get("adminPassword"),
        heroTitle: data.get("heroTitle"),
        heroSubtitle: data.get("heroSubtitle"),
        aboutImage: data.get("aboutImage"),
        shippingFee: Number(data.get("shippingFee")) || 0,
        freeShippingThreshold: Number(data.get("freeShippingThreshold")) || 0
      });
      await Store.syncRemoteCatalog?.();
      Utils.showToast("Ayarlar kaydedildi.");
    });

    document.querySelector("#resetDemo")?.addEventListener("click", async () => {
      if (!confirm("Demo veriler geri yüklensin mi? Mevcut tarayıcı verileri silinir.")) return;
      Store.resetDemo();
      await Store.syncRemoteCatalog?.();
      window.location.reload();
    });
  };

  const bindExport = () => {
    document.addEventListener("click", (event) => {
      if (!event.target.closest("[data-export-store]")) return;
      Utils.downloadJSON("MAde3D-store-data.json", Store.exportData());
    });
  };

  const initAdminPage = () => {
    if (window.AdminAuth && !AdminAuth.isAuthenticated()) return;
    const page = document.body.dataset.adminPage;
    bindExport();
    if (page === "dashboard") renderDashboard();
    if (page === "products") ProductManager.renderProductsTable();
    if (page === "product-form") ProductManager.loadProductForm();
    if (page === "categories") {
      CategoryManager.renderCategories();
      CategoryManager.bindCategoryForm();
    }
    if (page === "orders") OrderManager.renderOrdersTable();
    if (page === "order-detail") OrderManager.renderOrderDetail();
    if (page === "settings") bindSettings();
    if (page === "payment-settings") PaymentManager.bindPaymentSettings();
    if (page === "shipping-settings") ShippingManager.bindShippingSettings();
  };

  document.addEventListener("DOMContentLoaded", () => {
    (Store.ready || Promise.resolve()).then(initAdminPage);
  });
})();
