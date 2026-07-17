(function () {
  const sortProducts = (products, sortBy) => {
    const sorted = [...products];
    if (sortBy === "price-asc") sorted.sort((a, b) => a.price - b.price);
    if (sortBy === "price-desc") sorted.sort((a, b) => b.price - a.price);
    if (sortBy === "name") sorted.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    if (sortBy === "newest") sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sorted;
  };

  const renderHome = () => {
    const featured = document.querySelector("#featuredProducts");
    const stats = document.querySelector("#homeStats");
    if (featured) {
      const products = Store.getProducts().filter((product) => product.featured).slice(0, 4);
      featured.innerHTML = products.map(ProductCard.render).join("");
    }
    if (stats) {
      const products = Store.getProducts();
      const categories = Store.getCategories();
      stats.innerHTML = `
        <div class="admin-card metric"><span class="muted">Aktif ürün</span><strong>${products.length}</strong></div>
        <div class="admin-card metric"><span class="muted">Kategori</span><strong>${categories.length}</strong></div>
        <div class="admin-card metric"><span class="muted">Demo sipariş</span><strong>${Store.getOrders().length}</strong></div>
      `;
    }
    Categories.renderCategoryTiles("#homeCategories");
  };

  const renderProductsPage = () => {
    const grid = document.querySelector("#productGrid");
    const categoryFilter = document.querySelector("#categoryFilter");
    const search = document.querySelector("#productSearch");
    const sort = document.querySelector("#sortFilter");
    const resultCount = document.querySelector("#resultCount");
    if (!grid || !categoryFilter || !search || !sort) return;

    const selectedCategory = Utils.getParam("category") || "all";
    categoryFilter.innerHTML = `
      <option value="all">Tüm kategoriler</option>
      ${Store.getCategories()
        .map((category) => `<option value="${category.id}">${Utils.escapeHTML(category.name)}</option>`)
        .join("")}
    `;
    categoryFilter.value = selectedCategory;

    const render = () => {
      const query = search.value.trim().toLocaleLowerCase("tr-TR");
      let products = Store.getProducts().filter((product) => {
        const matchesCategory = categoryFilter.value === "all" || product.categoryId === categoryFilter.value;
        const matchesSearch =
          !query ||
          product.name.toLocaleLowerCase("tr-TR").includes(query) ||
          product.shortDescription.toLocaleLowerCase("tr-TR").includes(query) ||
          product.sku.toLocaleLowerCase("tr-TR").includes(query);
        return matchesCategory && matchesSearch;
      });
      products = sortProducts(products, sort.value);
      resultCount.textContent = `${products.length} ürün`;
      grid.innerHTML = products.length
        ? products.map(ProductCard.render).join("")
        : `<div class="empty-state full-span"><h2>Ürün bulunamadı</h2><p class="muted">Filtreleri temizleyerek tekrar deneyin.</p></div>`;
    };

    [categoryFilter, search, sort].forEach((input) => input.addEventListener("input", render));
    render();
  };

  const renderDetailPage = () => {
    const container = document.querySelector("#productDetail");
    if (!container) return;

    const slug = Utils.getParam("slug") || Utils.getParam("id");
    const product = Store.getProductBySlug(slug);
    if (!product) {
      container.innerHTML = `
        <div class="empty-state full-span">
          <h1>Ürün bulunamadı</h1>
          <p class="muted">Aradığınız ürün yayından kaldırılmış olabilir.</p>
          <a class="btn btn-primary" href="${Utils.pagePath("products.html")}">Ürünlere dön</a>
        </div>
      `;
      return;
    }

    const images = product.images?.length ? product.images.map(Utils.imageUrl) : [Utils.getImage(product)];
    container.innerHTML = `
      <div class="product-gallery">
        <img class="product-main-image" src="${images[0]}" alt="${Utils.escapeHTML(product.name)}" data-main-product-image>
        <div class="thumb-row">
          ${images
            .map(
              (src, index) => `
                <img class="${index === 0 ? "is-active" : ""}" src="${src}" alt="${Utils.escapeHTML(product.name)} görsel ${index + 1}" data-product-thumb>
              `
            )
            .join("")}
        </div>
      </div>
      <section class="stack">
        <span class="badge">${Utils.escapeHTML(Utils.getCategoryName(product.categoryId))}</span>
        <h1>${Utils.escapeHTML(product.name)}</h1>
        <p class="muted">${Utils.escapeHTML(product.shortDescription)}</p>
        <div class="cluster">
          <strong class="price" style="font-size:1.7rem">${Utils.money(product.price)}</strong>
          ${product.oldPrice > product.price ? `<span class="old-price">${Utils.money(product.oldPrice)}</span>` : ""}
          <span class="badge">${product.stock > 0 ? `${product.stock} stok` : "Stok yok"}</span>
        </div>
        <p>${Utils.escapeHTML(product.description || "")}</p>
        <div class="cluster">
          <button class="btn btn-primary" type="button" data-add-to-cart="${product.id}" ${product.stock <= 0 ? "disabled" : ""}>Sepete ekle</button>
          <a class="btn btn-outline" href="${Utils.pagePath("products.html")}">Alışverişe devam et</a>
        </div>
      </section>
    `;

    container.querySelectorAll("[data-product-thumb]").forEach((thumb) => {
      thumb.addEventListener("click", () => {
        container.querySelector("[data-main-product-image]").src = thumb.src;
        container.querySelectorAll("[data-product-thumb]").forEach((item) => item.classList.remove("is-active"));
        thumb.classList.add("is-active");
      });
    });
  };

  window.Products = {
    renderHome,
    renderProductsPage,
    renderDetailPage
  };
})();
