(function () {
  const orderStatuses = [
    ["new", "Yeni"],
    ["preparing", "Hazırlanıyor"],
    ["shipped", "Kargoda"],
    ["completed", "Tamamlandı"],
    ["cancelled", "İptal"]
  ];

  const paymentStatuses = [
    ["pending", "Bekliyor"],
    ["paid", "Ödendi"],
    ["failed", "Başarısız"],
    ["refunded", "İade edildi"]
  ];

  const shipmentStatuses = [
    ["pending", "Bekliyor"],
    ["preparing", "Hazırlanıyor"],
    ["shipped", "Kargoya verildi"],
    ["delivered", "Teslim edildi"],
    ["returned", "İade"]
  ];

  const providers = [
    ["iyzico", "İyzico"],
    ["paytr", "PayTR"],
    ["shopier", "Shopier"],
    ["manual", "Manuel ödeme"]
  ];

  const selectOptions = (items, selected) =>
    items
      .map(
        ([value, label]) =>
          `<option value="${Utils.escapeHTML(value)}" ${value === selected ? "selected" : ""}>${Utils.escapeHTML(label)}</option>`
      )
      .join("");

  const paymentStatusLabel = (status) =>
    paymentStatuses.find(([value]) => value === status)?.[1] || "Bekliyor";

  const shipmentStatusLabel = (status) =>
    shipmentStatuses.find(([value]) => value === status)?.[1] || "Bekliyor";

  const paymentStatusClass = (status) => {
    if (status === "paid") return "status-completed";
    if (status === "failed") return "status-cancelled";
    if (status === "refunded") return "status-shipped";
    return "status-preparing";
  };

  const carrierName = (carrierId) => {
    const carrier = Store.getShippingSettings().carriers.find(
      (item) => item.id === carrierId || item.name === carrierId
    );
    return carrier?.name || carrierId || "Henüz seçilmedi";
  };

  const providerName = (providerId) =>
    providers.find(([value]) => value === providerId)?.[1] || providerId || "Manuel ödeme";

  const carrierOptions = (selected) => {
    const settings = Store.getShippingSettings();
    const carriers = settings.carriers.filter(
      (carrier) => carrier.active !== false || carrier.id === selected || carrier.name === selected
    );

    if (selected && !carriers.some((carrier) => carrier.id === selected || carrier.name === selected)) {
      carriers.push({
        id: selected,
        name: selected
      });
    }

    return carriers
      .map((carrier) => {
        const isSelected = carrier.id === selected || carrier.name === selected;
        return `<option value="${Utils.escapeHTML(carrier.id)}" ${isSelected ? "selected" : ""}>${Utils.escapeHTML(carrier.name)}</option>`;
      })
      .join("");
  };

  const statusSelect = (order) => `
    <select data-order-status="${order.id}" aria-label="Sipariş durumu">
      ${selectOptions(orderStatuses, order.status || "new")}
    </select>
  `;

  const buildTrackingUrl = (carrierId, trackingNumber, customUrl) => {
    const carrier = Store.getShippingSettings().carriers.find((item) => item.id === carrierId || item.name === carrierId);
    const template = customUrl || carrier?.trackingUrl || "";
    if (!template) return "";
    if (template.includes("{trackingNumber}")) {
      return template.replace("{trackingNumber}", encodeURIComponent(trackingNumber || ""));
    }
    return template;
  };

  const renderOrdersTable = () => {
    const body = document.querySelector("#ordersTableBody");
    const count = document.querySelector("#ordersCount");
    if (!body) return;
    const orders = Store.getOrders();
    if (count) count.textContent = `${orders.length} sipariş`;
    body.innerHTML = orders.length
      ? orders
          .map(
            (order) => `
              <tr>
                <td><strong>${order.number}</strong><div class="muted">${Utils.formatDate(order.createdAt)}</div></td>
                <td>${Utils.escapeHTML(order.customer.name)}<div class="muted">${Utils.escapeHTML(order.customer.phone)}</div></td>
                <td>${Utils.money(order.total)}</td>
                <td>
                  <span class="badge ${paymentStatusClass(order.paymentStatus)}">${paymentStatusLabel(order.paymentStatus)}</span>
                  <div class="muted">${Utils.escapeHTML(order.paymentMethod || "Kapıda ödeme")}</div>
                </td>
                <td>
                  <strong>${Utils.escapeHTML(carrierName(order.cargoCompany))}</strong>
                  <div class="muted">${Utils.escapeHTML(order.trackingNumber || shipmentStatusLabel(order.shipmentStatus))}</div>
                </td>
                <td>${statusSelect(order)}</td>
                <td>
                  <a class="btn btn-outline" href="${Utils.adminPath("order-detail.html")}?id=${order.id}">Detay</a>
                </td>
              </tr>
            `
          )
          .join("")
      : `<tr><td colspan="7"><div class="empty-state"><h2>Sipariş yok</h2><p class="muted">Ödeme formu tamamlandığında sipariş burada görünür.</p></div></td></tr>`;
  };

  const renderOrderDetail = () => {
    const container = document.querySelector("#orderDetail");
    if (!container) return;
    const order = Store.getOrderById(Utils.getParam("id"));
    if (!order) {
      container.innerHTML = `<div class="empty-state"><h1>Sipariş bulunamadı</h1><a class="btn btn-primary" href="${Utils.adminPath("orders.html")}">Siparişlere dön</a></div>`;
      return;
    }

    const selectedCarrier = order.cargoCompany || Store.getShippingSettings().defaultCarrier;

    container.innerHTML = `
      <div class="feature-band">
        <div>
          <span class="badge ${Utils.statusClass(order.status)}">${Utils.statusLabel(order.status)}</span>
          <h1>${order.number}</h1>
          <p class="muted">${Utils.formatDate(order.createdAt)}</p>
        </div>
        <div class="field">
          <label for="detailStatus">Durum</label>
          ${statusSelect(order).replace("data-order-status", "id=\"detailStatus\" data-order-status")}
        </div>
      </div>

      <div class="grid grid-2 page-block">
        <section class="admin-card stack-sm">
          <h2>Müşteri</h2>
          <p><strong>${Utils.escapeHTML(order.customer.name)}</strong></p>
          <p class="muted">${Utils.escapeHTML(order.customer.email)}<br>${Utils.escapeHTML(order.customer.phone)}</p>
          <p>${Utils.escapeHTML(order.customer.address)}<br>${Utils.escapeHTML(order.customer.city)}</p>
        </section>

        <form class="admin-card stack-sm" data-order-payment-form="${order.id}">
          <h2>Ödeme</h2>
          <div class="field">
            <label for="paymentStatus">Ödeme durumu</label>
            <select id="paymentStatus" name="paymentStatus">
              ${selectOptions(paymentStatuses, order.paymentStatus || "pending")}
            </select>
          </div>
          <div class="field">
            <label for="paymentMethod">Ödeme yöntemi</label>
            <input id="paymentMethod" name="paymentMethod" value="${Utils.escapeHTML(order.paymentMethod || "")}">
          </div>
          <div class="field">
            <label for="paymentProvider">Sağlayıcı</label>
            <select id="paymentProvider" name="paymentProvider">
              ${selectOptions(providers, order.paymentProvider || "manual")}
            </select>
          </div>
          <div class="field">
            <label for="transactionId">İşlem numarası</label>
            <input id="transactionId" name="transactionId" value="${Utils.escapeHTML(order.transactionId || "")}">
          </div>
          <button class="btn btn-primary" type="submit">Ödemeyi kaydet</button>
        </form>

        <form class="admin-card stack-sm" data-order-shipping-form="${order.id}">
          <h2>Kargo</h2>
          <div class="field">
            <label for="shipmentStatus">Kargo durumu</label>
            <select id="shipmentStatus" name="shipmentStatus">
              ${selectOptions(shipmentStatuses, order.shipmentStatus || "pending")}
            </select>
          </div>
          <div class="field">
            <label for="cargoCompany">Kargo firması</label>
            <select id="cargoCompany" name="cargoCompany">
              ${carrierOptions(selectedCarrier)}
            </select>
          </div>
          <div class="field">
            <label for="trackingNumber">Takip numarası</label>
            <input id="trackingNumber" name="trackingNumber" value="${Utils.escapeHTML(order.trackingNumber || "")}">
          </div>
          <div class="field">
            <label for="trackingUrl">Takip adresi</label>
            <input id="trackingUrl" name="trackingUrl" value="${Utils.escapeHTML(order.trackingUrl || "")}" placeholder="https://.../{trackingNumber}">
          </div>
          <button class="btn btn-primary" type="submit">Kargoyu kaydet</button>
        </form>

        <section class="admin-card stack-sm">
          <h2>Özet</h2>
          <p>${Utils.escapeHTML(providerName(order.paymentProvider))}</p>
          <p class="muted">${Utils.escapeHTML(order.note || "Not yok")}</p>
          <div class="summary-row"><span>Ara toplam</span><strong>${Utils.money(order.subtotal)}</strong></div>
          <div class="summary-row"><span>Kargo</span><strong>${order.shipping ? Utils.money(order.shipping) : "Ücretsiz"}</strong></div>
          <div class="summary-row total"><span>Toplam</span><strong>${Utils.money(order.total)}</strong></div>
        </section>
      </div>

      <div class="table-wrap">
        <table>
          <thead><tr><th>Ürün</th><th>Adet</th><th>Birim</th><th>Toplam</th></tr></thead>
          <tbody>
            ${order.items
              .map(
                (item) => `
                  <tr>
                    <td>${Utils.escapeHTML(item.name)}</td>
                    <td>${item.quantity}</td>
                    <td>${Utils.money(item.price)}</td>
                    <td>${Utils.money(item.price * item.quantity)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  };

  document.addEventListener("change", (event) => {
    if (!event.target.matches("[data-order-status]")) return;
    Store.updateOrderStatus(event.target.dataset.orderStatus, event.target.value);
    renderOrdersTable();
    renderOrderDetail();
    Utils.showToast("Sipariş durumu güncellendi.");
  });

  document.addEventListener("submit", (event) => {
    const paymentForm = event.target.closest("[data-order-payment-form]");
    if (!paymentForm) return;
    event.preventDefault();
    const data = new FormData(paymentForm);
    Store.updateOrderPayment(paymentForm.dataset.orderPaymentForm, {
      paymentStatus: data.get("paymentStatus"),
      paymentMethod: data.get("paymentMethod"),
      paymentProvider: data.get("paymentProvider"),
      transactionId: data.get("transactionId")
    });
    renderOrdersTable();
    renderOrderDetail();
    Utils.showToast("Ödeme bilgisi kaydedildi.");
  });

  document.addEventListener("submit", (event) => {
    const shippingForm = event.target.closest("[data-order-shipping-form]");
    if (!shippingForm) return;
    event.preventDefault();
    const data = new FormData(shippingForm);
    const trackingNumber = String(data.get("trackingNumber") || "").trim();
    const shipmentStatus = data.get("shipmentStatus");
    const settings = Store.getShippingSettings();

    if (settings.trackingRequired && shipmentStatus === "shipped" && !trackingNumber) {
      Utils.showToast("Kargoya verildi durumunda takip numarası girin.");
      return;
    }

    Store.updateOrderShipping(shippingForm.dataset.orderShippingForm, {
      cargoCompany: data.get("cargoCompany"),
      shipmentStatus,
      trackingNumber,
      trackingUrl: buildTrackingUrl(data.get("cargoCompany"), trackingNumber, String(data.get("trackingUrl") || "").trim())
    });
    renderOrdersTable();
    renderOrderDetail();
    Utils.showToast("Kargo bilgisi kaydedildi.");
  });

  window.OrderManager = {
    renderOrdersTable,
    renderOrderDetail
  };
})();
