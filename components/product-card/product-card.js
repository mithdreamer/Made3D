(function () {
  const render = (product) => {
    const category = product.categoryName || Utils.getCategoryName(product.categoryId);
    const discount = product.oldPrice > product.price;
    return `
      <article class="product-card">
        <a class="product-card-image" href="${Utils.productPath(product)}" aria-label="${Utils.escapeHTML(product.name)} detay">
          <img src="${Utils.getImage(product)}" alt="${Utils.escapeHTML(product.name)}" loading="lazy" onerror="this.onerror=null;this.src=Utils.imageFallback()">
          ${discount ? '<span class="badge product-card-badge">Fırsat</span>' : ""}
        </a>
        <div class="product-card-body">
          <div class="stack-sm">
            <span class="badge">${Utils.escapeHTML(category)}</span>
            <h3 class="product-card-title">
              <a href="${Utils.productPath(product)}">${Utils.escapeHTML(product.name)}</a>
            </h3>
            <p class="product-card-meta">${Utils.escapeHTML(product.shortDescription || "")}</p>
          </div>
          <div class="product-card-foot">
            <div>
              <strong class="price">${Utils.money(product.price)}</strong>
              ${discount ? `<span class="old-price">${Utils.money(product.oldPrice)}</span>` : ""}
            </div>
            <button class="icon-btn btn-primary" type="button" data-add-to-cart="${product.id}" data-product-stock="${Number(product.stock) || 0}" data-product-url="${Utils.productPath(product)}" title="Sepete ekle" aria-label="Sepete ekle">
              +
            </button>
          </div>
        </div>
      </article>
    `;
  };

  window.ProductCard = { render };
})();
