(function () {
  const render = (product) => {
    const category = Utils.getCategoryName(product.categoryId);
    const discount = product.oldPrice > product.price;
    return `
      <article class="product-card">
        <a class="product-card-image" href="${Utils.productPath(product)}" aria-label="${Utils.escapeHTML(product.name)} detay">
          <img src="${Utils.getImage(product)}" alt="${Utils.escapeHTML(product.name)}" loading="lazy">
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
            <button class="icon-btn btn-primary" type="button" data-add-to-cart="${product.id}" title="Sepete ekle" aria-label="Sepete ekle" ${product.stock <= 0 ? "disabled" : ""}>
              +
            </button>
          </div>
        </div>
      </article>
    `;
  };

  window.ProductCard = { render };
})();
