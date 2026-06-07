document.addEventListener("DOMContentLoaded", () => {
  const list = document.querySelector("[data-cart-list]");
  if (!list) return;

  renderCart();
  window.addEventListener("store:cart-change", renderCart);
});

function renderCart() {
  const list = document.querySelector("[data-cart-list]");
  const summary = document.querySelector("[data-cart-summary]");
  const cart = Store.getCart();
  const totals = Store.getCartTotals(cart);

  if (!cart.length) {
    list.innerHTML = `
      <div class="empty-state">
        <h2>Sepetin bos</h2>
        <p>Uretime hazir 3D baski urunlerini inceleyip sepete ekleyebilirsin.</p>
        <a class="button" href="products.html">Urunlere git</a>
      </div>
    `;
  } else {
    list.innerHTML = cart.map((item) => `
      <article class="cart-item">
        ${Store.productVisual(item)}
        <div>
          <h3>${item.name}</h3>
          <p>${item.material || "3D baski"} · ${Store.formatCurrency(item.price)}</p>
          <div class="cart-actions">
            <div class="qty-control" aria-label="${item.name} adet">
              <button type="button" data-cart-action="decrease" data-id="${item.id}" aria-label="Azalt">-</button>
              <span>${item.quantity}</span>
              <button type="button" data-cart-action="increase" data-id="${item.id}" aria-label="Artir">+</button>
            </div>
            <button class="text-button" type="button" data-cart-action="remove" data-id="${item.id}">Kaldir</button>
          </div>
        </div>
        <strong class="line-total">${Store.formatCurrency(item.price * item.quantity)}</strong>
      </article>
    `).join("");
  }

  summary.innerHTML = summaryTemplate(totals, cart.length);

  list.querySelectorAll("[data-cart-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = Store.getCart().find((cartItem) => cartItem.id === button.dataset.id);
      if (!item && button.dataset.cartAction !== "remove") return;

      if (button.dataset.cartAction === "increase") {
        Store.setQuantity(button.dataset.id, item.quantity + 1);
      }

      if (button.dataset.cartAction === "decrease") {
        Store.setQuantity(button.dataset.id, item.quantity - 1);
      }

      if (button.dataset.cartAction === "remove") {
        Store.removeFromCart(button.dataset.id);
      }
    });
  });
}

function summaryTemplate(totals, hasItems) {
  return `
    <h2>Siparis ozeti</h2>
    <div class="summary-row">
      <span>Ara toplam</span>
      <strong>${Store.formatCurrency(totals.subtotal)}</strong>
    </div>
    <div class="summary-row">
      <span>Kargo</span>
      <strong>${totals.shipping === 0 ? "Ucretsiz" : Store.formatCurrency(totals.shipping)}</strong>
    </div>
    <div class="summary-row summary-total">
      <span>Toplam</span>
      <strong>${Store.formatCurrency(totals.total)}</strong>
    </div>
    <a class="button full ${hasItems ? "" : "secondary"}" href="${hasItems ? "checkout.html" : "products.html"}">
      ${hasItems ? "Odeme adimina gec" : "Urunlere don"}
    </a>
    <small>Bu demo kart bilgisi almaz; siparis kaydi tarayicinda simule edilir.</small>
  `;
}
