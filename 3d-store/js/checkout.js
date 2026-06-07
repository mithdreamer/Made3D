document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("[data-checkout-form]");
  if (!form) return;

  renderCheckoutSummary();
  form.addEventListener("submit", handleCheckout);
  window.addEventListener("store:cart-change", renderCheckoutSummary);
});

function renderCheckoutSummary() {
  const summary = document.querySelector("[data-checkout-summary]");
  const cart = Store.getCart();
  const totals = Store.getCartTotals(cart);

  if (!cart.length) {
    summary.innerHTML = `
      <div class="empty-state">
        <h2>Sepette urun yok</h2>
        <p>Checkout adimina gecmeden once urun eklemelisin.</p>
        <a class="button" href="products.html">Urunlere git</a>
      </div>
    `;
    document.querySelector("[data-checkout-submit]").disabled = true;
    return;
  }

  document.querySelector("[data-checkout-submit]").disabled = false;

  summary.innerHTML = `
    <h2>Siparis ozeti</h2>
    <div class="order-items">
      ${cart.map((item) => `
        <div class="order-item">
          <span>${item.name} x ${item.quantity}</span>
          <strong>${Store.formatCurrency(item.price * item.quantity)}</strong>
        </div>
      `).join("")}
    </div>
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
  `;
}

function handleCheckout(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const cart = Store.getCart();

  if (!cart.length) {
    Store.showToast("Sepetin bos.");
    return;
  }

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  const totals = Store.getCartTotals(cart);
  const order = {
    id: `TD-${Date.now().toString().slice(-7)}`,
    createdAt: new Date().toISOString(),
    customer: data,
    items: cart,
    totals
  };

  Store.saveOrder(order);
  Store.clearCart();
  form.reset();

  const success = document.querySelector("[data-checkout-success]");
  success.classList.add("show");
  success.querySelector("[data-order-id]").textContent = order.id;
  Store.showToast("Siparis kaydi olusturuldu.");
}
