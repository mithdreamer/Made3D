(function () {
  const getCount = () => Store.getCart().reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);

  const updateCounters = () => {
    document.querySelectorAll("[data-cart-count]").forEach((item) => {
      item.textContent = String(getCount());
    });
  };

  const renderSummary = (container, items = [], options = {}) => {
    const totals = Store.calculateCart(items);
    container.innerHTML = `
      <div class="summary-row"><span>Ara toplam</span><strong>${Utils.money(totals.subtotal)}</strong></div>
      <div class="summary-row"><span>Kargo</span><strong>${totals.shipping ? Utils.money(totals.shipping) : "Ücretsiz"}</strong></div>
      <div class="summary-row total"><span>Genel toplam</span><strong>${Utils.money(totals.total)}</strong></div>
      ${
        options.checkout
          ? `<a class="btn btn-primary" href="${Utils.pagePath("checkout.html")}">Ödemeye geç</a>`
          : ""
      }
    `;
  };

  const renderUnavailable = (list, summary, message) => {
    list.innerHTML = `
      <div class="empty-state">
        <h2>Sepet yüklenemedi</h2>
        <p class="muted">${Utils.escapeHTML(message)}</p>
        <a class="btn btn-primary" href="${Utils.pagePath("products.html")}">Ürünlere git</a>
      </div>
    `;
    summary.innerHTML = "";
  };

  const renderCartPage = async () => {
    const list = document.querySelector("#cartItems");
    const summary = document.querySelector("#cartSummary");
    if (!list || !summary) return;

    try {
      const items = await Store.getCartItems();
      if (!items.length) {
        list.innerHTML = `
          <div class="empty-state">
            <h2>Sepetiniz boş</h2>
            <p class="muted">Ürünleri inceleyip sepete ekleyerek devam edebilirsiniz.</p>
            <a class="btn btn-primary" href="${Utils.pagePath("products.html")}">Ürünlere git</a>
          </div>
        `;
        summary.innerHTML = "";
        return;
      }

      list.innerHTML = items
        .map(
          (item) => `
            <article class="cart-item">
              <img src="${Utils.imageUrl(item.image)}" alt="${Utils.escapeHTML(item.name)}">
              <div>
                <h3><a href="${Utils.pagePath("product-detail.html")}?slug=${item.slug}">${Utils.escapeHTML(item.name)}</a></h3>
                <p class="muted">${Utils.money(item.price)} x ${item.quantity}</p>
                ${item.active ? "" : `<p class="muted">Bu ürün şu anda satış için aktif değil.</p>`}
              </div>
              <div class="cart-line-actions stack-sm">
                <label class="sr-only" for="qty-${item.productId}">Adet</label>
                <input id="qty-${item.productId}" type="number" min="1" max="${item.stock}" value="${item.quantity}" data-cart-qty="${item.productId}">
                <button class="btn btn-outline" type="button" data-remove-cart="${item.productId}">Kaldır</button>
              </div>
            </article>
          `
        )
        .join("");

      renderSummary(summary, items, { checkout: true });
    } catch (error) {
      console.error("Sepet yüklenemedi:", error);
      renderUnavailable(list, summary, error.message || "Sepet bilgisi alınamadı.");
    }
  };

  const renderCheckoutPage = async () => {
    const itemsBox = document.querySelector("#checkoutItems");
    const totalsBox = document.querySelector("#checkoutTotals");
    const form = document.querySelector("#checkoutForm");
    if (!itemsBox || !totalsBox || !form) return;

    try {
      const items = await Store.getCartItems();
      if (!items.length) {
        document.querySelector("#checkoutContent").innerHTML = `
          <div class="empty-state">
            <h2>Ödeme için ürün bulunamadı</h2>
            <p class="muted">Sepetinize ürün ekleyerek yeniden deneyin.</p>
            <a class="btn btn-primary" href="${Utils.pagePath("products.html")}">Ürünlere git</a>
          </div>
        `;
        return;
      }

      itemsBox.innerHTML = `
        <ul class="mini-list">
          ${items
            .map(
              (item) => `
                <li>
                  <span>${Utils.escapeHTML(item.name)} x ${item.quantity}</span>
                  <strong>${Utils.money(item.price * item.quantity)}</strong>
                </li>
              `
            )
            .join("")}
        </ul>
      `;
      renderSummary(totalsBox, items);
      window.Payment?.populateCheckoutMethods(form.elements.paymentMethod);
    } catch (error) {
      console.error("Ödeme özeti yüklenemedi:", error);
      document.querySelector("#checkoutContent").innerHTML = `
        <div class="empty-state">
          <h2>Ödeme özeti yüklenemedi</h2>
          <p class="muted">${Utils.escapeHTML(error.message || "Sepet bilgisi alınamadı.")}</p>
          <a class="btn btn-primary" href="${Utils.pagePath("cart.html")}">Sepete dön</a>
        </div>
      `;
      return;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);

      try {
        const order = await Store.createOrder({
          customer: {
            name: data.get("name"),
            email: data.get("email"),
            phone: data.get("phone"),
            address: data.get("address"),
            city: data.get("city")
          },
          paymentMethod: data.get("paymentMethod"),
          note: data.get("note")
        });
        updateCounters();
        window.location.href = `${Utils.pagePath("order-success.html")}?order=${encodeURIComponent(order.id)}`;
      } catch (error) {
        console.error("Sipariş oluşturulamadı:", error);
        Utils.showToast(error.message || "Sipariş oluşturulamadı.");
      }
    });
  };

  document.addEventListener("click", async (event) => {
    const addButton = event.target.closest("[data-add-to-cart]");
    const removeButton = event.target.closest("[data-remove-cart]");

    if (addButton) {
      try {
        await Store.addToCart(addButton.dataset.addToCart, 1);
        updateCounters();
        Utils.showToast("Ürün sepete eklendi.");
      } catch (error) {
        Utils.showToast(error.message || "Ürün sepete eklenemedi.");
      }
    }

    if (removeButton) {
      Store.removeFromCart(removeButton.dataset.removeCart);
      updateCounters();
      await renderCartPage();
    }
  });

  document.addEventListener("change", async (event) => {
    if (!event.target.matches("[data-cart-qty]")) return;

    try {
      await Store.updateCartItem(event.target.dataset.cartQty, event.target.value);
      updateCounters();
      await renderCartPage();
    } catch (error) {
      Utils.showToast(error.message || "Sepet güncellenemedi.");
      await renderCartPage();
    }
  });

  document.addEventListener("DOMContentLoaded", updateCounters);

  window.Cart = {
    getCount,
    updateCounters,
    renderCartPage,
    renderCheckoutPage
  };
})();
