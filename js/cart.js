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
          ? `<a class="btn btn-primary" href="${Utils.pagePath("checkout.html")}">Sipariş bilgilerine geç</a>`
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

      const editableItems = await Promise.all(items.map(async (item) => {
        try {
          return {
            ...item,
            colorOptions: (await Store.getProductColors(item.productId))
              .filter((row) => row.color_master?.is_active === true),
            colorOptionsAvailable: true
          };
        } catch (error) {
          console.error(`${item.name} renk seçenekleri yüklenemedi:`, error);
          return {
            ...item,
            colorOptions: [],
            colorOptionsAvailable: false
          };
        }
      }));
      list.innerHTML = editableItems
        .map(
          (item) => `
            <article class="cart-item" data-cart-line="${item.productId}" data-cart-line-color="${Utils.escapeHTML(item.variantId || "")}">
              <img src="${Utils.imageUrl(item.image)}" alt="${Utils.escapeHTML(item.name)}">
              <div>
                <h3><a href="${Utils.pagePath("product-detail.html")}?slug=${item.slug}">${Utils.escapeHTML(item.name)}</a></h3>
                <p class="muted">${Utils.money(item.price)} x ${item.quantity}</p>
                ${item.variant ? `<p class="muted"><strong>Renk:</strong> ${Utils.escapeHTML(item.variant)}</p>` : ""}
                ${item.active ? "" : `<p class="muted">Bu ürün şu anda satış için aktif değil.</p>`}
              </div>
              <div class="cart-line-actions stack-sm">
                <button class="btn btn-outline" type="button" data-edit-cart ${item.colorOptionsAvailable ? "" : "disabled"}>Düzenle</button>
                <button class="btn btn-outline" type="button" data-remove-cart="${item.productId}" data-cart-color="${Utils.escapeHTML(item.variantId || "")}">Kaldır</button>
              </div>
              ${item.colorOptionsAvailable ? "" : `<p class="cart-edit-warning" role="status">Renk seçenekleri şu anda yüklenemedi. Sepeti görüntüleyebilir veya ürünü kaldırabilirsiniz; düzenlemek için sayfayı yenileyin.</p>`}
              <form class="cart-edit-form" data-cart-edit-form hidden>
                <div class="cart-edit-fields">
                  <label>Adet<input name="quantity" type="number" min="1" max="${item.stock}" value="${item.quantity}" required></label>
                  ${item.colorOptions.length ? `<label>Renk<select name="variantId" required>${item.colorOptions.map((row) => {
                    const name = row.color_master?.name_tr || row.color_master?.name_en || row.color_code;
                    return `<option value="${Utils.escapeHTML(row.color_code)}" ${row.color_code === item.variantId ? "selected" : ""}>${Utils.escapeHTML(name)}</option>`;
                  }).join("")}</select></label>` : `<input name="variantId" type="hidden" value="${Utils.escapeHTML(item.variantId || "")}">`}
                </div>
                <div class="cart-edit-buttons"><button class="btn btn-primary" type="submit">Değişiklikleri kaydet</button><button class="btn btn-outline" type="button" data-cancel-cart-edit>Vazgeç</button></div>
              </form>
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
            <h2>Sipariş için ürün bulunamadı</h2>
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
                  <span>${Utils.escapeHTML(item.name)}${item.variant ? ` (${Utils.escapeHTML(item.variant)})` : ""} x ${item.quantity}</span>
                  <strong>${Utils.money(item.price * item.quantity)}</strong>
                </li>
              `
            )
            .join("")}
        </ul>
      `;
      renderSummary(totalsBox, items);
    } catch (error) {
      console.error("Sipariş özeti yüklenemedi:", error);
      document.querySelector("#checkoutContent").innerHTML = `
        <div class="empty-state">
          <h2>Sipariş özeti yüklenemedi</h2>
          <p class="muted">${Utils.escapeHTML(error.message || "Sepet bilgisi alınamadı.")}</p>
          <a class="btn btn-primary" href="${Utils.pagePath("cart.html")}">Sepete dön</a>
        </div>
      `;
      return;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (form.dataset.submitting === "true") return;

      const data = new FormData(form);
      const submitButton = form.querySelector('[type="submit"]');
      const formMessage = form.querySelector("[data-checkout-message]");

      form.dataset.submitting = "true";
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sipariş oluşturuluyor...";
      }
      if (formMessage) {
        formMessage.hidden = true;
        formMessage.textContent = "";
      }

      try {
        const order = await Store.createOrder({
          customer: {
            name: data.get("name"),
            email: data.get("email"),
            phone: data.get("phone"),
            address: data.get("address"),
            city: data.get("city"),
            district: data.get("district")
          },
          note: data.get("note")
        });
        updateCounters();
        window.location.href = `${Utils.pagePath("order-success.html")}?order=${encodeURIComponent(order.id)}`;
      } catch (error) {
        console.error("Sipariş oluşturulamadı:", error);
        const message = error.message || "Sipariş oluşturulamadı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.";
        if (formMessage) {
          formMessage.textContent = message;
          formMessage.hidden = false;
          formMessage.focus();
        }
        Utils.showToast(message);
        form.dataset.submitting = "false";
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Siparişi oluştur";
        }
      }
    });
  };

  document.addEventListener("click", async (event) => {
    const addButton = event.target.closest("[data-add-to-cart]");
    const removeButton = event.target.closest("[data-remove-cart]");
    const editButton = event.target.closest("[data-edit-cart]");
    const cancelEditButton = event.target.closest("[data-cancel-cart-edit]");
    if (editButton) editButton.closest("[data-cart-line]").querySelector("[data-cart-edit-form]").hidden = false;
    if (cancelEditButton) cancelEditButton.closest("[data-cart-line]").querySelector("[data-cart-edit-form]").hidden = true;

    if (addButton) {
      try {
        const detail = addButton.closest("#productDetail");
        const selectedColor = detail?.querySelector('input[name="product-color"]:checked');
        await Store.addToCart(addButton.dataset.addToCart, 1, {
          colorCode: selectedColor?.value || ""
        });
        updateCounters();
        Utils.showToast("Ürün sepete eklendi.");
      } catch (error) {
        Utils.showToast(error.message || "Ürün sepete eklenemedi.");
      }
    }

    if (removeButton) {
      Store.removeFromCart(removeButton.dataset.removeCart, removeButton.dataset.cartColor || "");
      updateCounters();
      await renderCartPage();
    }
  });

  document.addEventListener("submit", async (event) => {
    if (!event.target.matches("[data-cart-edit-form]")) return;
    event.preventDefault();
    const form = event.target;
    const line = form.closest("[data-cart-line]");
    const data = new FormData(form);
    const submitButton = form.querySelector('[type="submit"]');
    try {
      submitButton.disabled = true;
      await Store.editCartItem(line.dataset.cartLine, line.dataset.cartLineColor || "", { quantity: data.get("quantity"), variantId: data.get("variantId") || "" });
      updateCounters();
      await renderCartPage();
      Utils.showToast("Sepetiniz güncellendi.");
    } catch (error) {
      Utils.showToast(error.message || "Sepet güncellenemedi.");
      submitButton.disabled = false;
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
