(function () {
  const renderCategoryTiles = async (selector) => {
    const container = document.querySelector(selector);
    if (!container) return;
    const [products, categories] = await Promise.all([
      Store.getProducts(),
      Store.getCategories()
    ]);
    container.innerHTML = categories
      .map((category) => {
        const count = products.filter((product) => product.categoryId === category.id).length;
        return `
          <a class="category-tile" href="${Utils.pagePath("products.html")}?category=${category.id}">
            <span class="badge">${count} ürün</span>
            <strong>${Utils.escapeHTML(category.name)}</strong>
            <span class="muted">${Utils.escapeHTML(category.description || "")}</span>
          </a>
        `;
      })
      .join("");
  };

  window.Categories = { renderCategoryTiles };
})();
