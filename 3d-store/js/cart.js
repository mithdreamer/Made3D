(function () {
  const getCount = () => Store.getCart().reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);

  const updateCounters = () => {
    document.querySelectorAll("[data-cart-count]").forEach((item) => {
      item.textContent = String(getCount());
    });
  };

  const renderSummary = (container, options = {}) => {
    const totals = Store.calculateCart();
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

  const renderCartPage = () => {
    const list = document.querySelector("#cartItems");
    const summary = document.querySelector("#cartSummary");
    if (!list || !summary) return;

    const items = Store.getCartItems();
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

    renderSummary(summary, { checkout: true });
  };

  const renderCheckoutPage = () => {
    const itemsBox = document.querySelector("#checkoutItems");
    const totalsBox = document.querySelector("#checkoutTotals");
    const form = document.querySelector("#checkoutForm");
    if (!itemsBox || !totalsBox || !form) return;

    const items = Store.getCartItems();
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
    renderSummary(totalsBox);
    window.Payment?.populateCheckoutMethods(form.elements.paymentMethod);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const order = Store.createOrder({
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
    });
  };

  document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-to-cart]");
    const removeButton = event.target.closest("[data-remove-cart]");

    if (addButton) {
      try {
        Store.addToCart(addButton.dataset.addToCart, 1);
        updateCounters();
        Utils.showToast("Ürün sepete eklendi.");
      } catch (error) {
        Utils.showToast(error.message || "Ürün sepete eklenemedi.");
      }
    }

    if (removeButton) {
      Store.removeCartItem(removeButton.dataset.removeCart);
      updateCounters();
      renderCartPage();
    }
  });

  document.addEventListener("change", (event) => {
    if (!event.target.matches("[data-cart-qty]")) return;
    Store.updateCartItem(event.target.dataset.cartQty, event.target.value);
    updateCounters();
    renderCartPage();
  });

  document.addEventListener("DOMContentLoaded", updateCounters);

  window.Cart = {
    getCount,
    updateCounters,
    renderCartPage,
    renderCheckoutPage
  };
})();
