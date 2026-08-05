(function () {
  const renderOrderSuccess = async () => {
    const container = document.querySelector("#orderSuccess");
    if (!container) return;

    const orderId = Utils.getParam("order");
    const order = await Store.getOrderById(orderId);
    if (!order) {
      container.innerHTML = `
        <div class="empty-state">
          <h1>Sipariş bulunamadı</h1>
          <p class="muted">Sipariş bilgisi bu tarayıcıda kayıtlı değil.</p>
          <a class="btn btn-primary" href="${Utils.pagePath("products.html")}">Ürünlere dön</a>
        </div>
      `;
      return;
    }

    const shippingSettings = Store.getShippingSettings();
    const trackingVisible = shippingSettings.customerTrackingVisible !== false && order.trackingNumber;
    const carrier = shippingSettings.carriers.find(
      (item) => item.id === order.cargoCompany || item.name === order.cargoCompany
    );

    container.innerHTML = `
      <div class="empty-state">
        <span class="badge">Sipariş alındı</span>
        <h1>${order.number}</h1>
        <p class="muted">Siparişiniz başarıyla alındı. Sipariş ve teslimat ayrıntıları için sizinle iletişime geçeceğiz.</p>
        <div class="summary-row" style="width:min(420px,100%)">
          <span>Ödeme durumu</span>
          <strong>Henüz ödeme alınmadı</strong>
        </div>
        <div class="order-success-items" style="width:min(520px,100%)">
          <h2>Sipariş özeti</h2>
          ${(order.items || [])
            .map(
              (item) => `<div class="summary-row">
                <span>${Utils.escapeHTML(item.name)}${item.colorName ? ` · ${Utils.escapeHTML(item.colorName)}` : ""} × ${item.quantity}</span>
                <strong>${Utils.money(item.price * item.quantity)}</strong>
              </div>`
            )
            .join("")}
        </div>
        ${
          trackingVisible
            ? `<div class="summary-row" style="width:min(420px,100%)">
                <span>Kargo</span>
                <strong>${Utils.escapeHTML(carrier?.name || order.cargoCompany || "")} / ${Utils.escapeHTML(order.trackingNumber)}</strong>
              </div>`
            : ""
        }
        <div class="summary-row total" style="width:min(420px,100%)">
          <span>Toplam</span>
          <strong>${Utils.money(order.total)}</strong>
        </div>
        <div class="cluster">
          <a class="btn btn-primary" href="${Utils.pagePath("products.html")}">Alışverişe devam et</a>
        </div>
      </div>
    `;
  };

  window.Orders = { renderOrderSuccess };
})();
