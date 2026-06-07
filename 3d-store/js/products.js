document.addEventListener("DOMContentLoaded", async () => {
  const featuredGrid = document.querySelector("[data-featured-products]");
  const productGrid = document.querySelector("[data-product-grid]");
  const detailRoot = document.querySelector("[data-product-detail]");

  if (!featuredGrid && !productGrid && !detailRoot) return;

  try {
    const [products, categories] = await Promise.all([
      Store.loadJson("../data/products.json"),
      Store.loadJson("../data/categories.json")
    ]);

    const categoryMap = new Map(categories.map((category) => [category.id, category.name]));

    if (featuredGrid) {
      renderProductCards(featuredGrid, products.filter((product) => product.featured).slice(0, 4), categoryMap);
    }

    if (productGrid) {
      initProductsPage(products, categories, categoryMap);
    }

    if (detailRoot) {
      renderDetailPage(detailRoot, products, categoryMap);
    }
  } catch (error) {
    const target = featuredGrid || productGrid || detailRoot;
    target.innerHTML = `
      <div class="empty-state">
        <h2>Urunler yuklenemedi</h2>
        <p>Yerel sunucuyu proje klasorunden calistirdigindan emin ol.</p>
      </div>
    `;
    console.error(error);
  }
});

function initProductsPage(products, categories, categoryMap) {
  const grid = document.querySelector("[data-product-grid]");
  const search = document.querySelector("[data-product-search]");
  const sort = document.querySelector("[data-product-sort]");
  const filters = document.querySelector("[data-category-filters]");
  const resultCount = document.querySelector("[data-result-count]");
  const state = {
    category: "all",
    search: "",
    sort: "featured"
  };

  filters.innerHTML = [
    `<button class="filter-button active" type="button" data-category="all">Tum urunler</button>`,
    ...categories.map((category) => (
      `<button class="filter-button" type="button" data-category="${category.id}">${category.name}</button>`
    ))
  ].join("");

  function applyFilters() {
    const term = state.search.trim().toLocaleLowerCase("tr-TR");
    let visible = products.filter((product) => {
      const matchesCategory = state.category === "all" || product.category === state.category;
      const text = `${product.name} ${product.description} ${product.tags.join(" ")}`.toLocaleLowerCase("tr-TR");
      return matchesCategory && (!term || text.includes(term));
    });

    visible = visible.sort((a, b) => {
      if (state.sort === "price-asc") return a.price - b.price;
      if (state.sort === "price-desc") return b.price - a.price;
      if (state.sort === "rating") return b.rating - a.rating;
      return Number(b.featured) - Number(a.featured) || b.rating - a.rating;
    });

    resultCount.textContent = `${visible.length} urun`;
    renderProductCards(grid, visible, categoryMap);
  }

  filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;

    state.category = button.dataset.category;
    filters.querySelectorAll(".filter-button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    applyFilters();
  });

  search.addEventListener("input", () => {
    state.search = search.value;
    applyFilters();
  });

  sort.addEventListener("change", () => {
    state.sort = sort.value;
    applyFilters();
  });

  applyFilters();
}

function renderProductCards(root, products, categoryMap) {
  if (!products.length) {
    root.innerHTML = `
      <div class="empty-state">
        <h2>Uygun urun bulunamadi</h2>
        <p>Filtreleri degistirerek tekrar dene.</p>
      </div>
    `;
    return;
  }

  root.innerHTML = products.map((product) => productCard(product, categoryMap)).join("");

  root.querySelectorAll("[data-add-product]").forEach((button) => {
    button.addEventListener("click", () => {
      const product = products.find((item) => item.id === button.dataset.addProduct);
      Store.addToCart(product);
    });
  });
}

function productCard(product, categoryMap) {
  return `
    <article class="product-card">
      <a class="product-link" href="product-detail.html?id=${encodeURIComponent(product.id)}" aria-label="${product.name} detay">
        ${Store.productVisual(product)}
      </a>
      <div class="product-body">
        <span class="product-kicker">${categoryMap.get(product.category) || "3D Baski"}</span>
        <h3><a href="product-detail.html?id=${encodeURIComponent(product.id)}">${product.name}</a></h3>
        <p>${product.description}</p>
        <div class="product-foot">
          <div>
            <span class="price">${Store.formatCurrency(product.price)}</span>
            <span class="old-price">${Store.formatCurrency(product.oldPrice)}</span>
          </div>
          <button class="mini-add" type="button" data-add-product="${product.id}" aria-label="${product.name} sepete ekle">+</button>
        </div>
      </div>
    </article>
  `;
}

function renderDetailPage(root, products, categoryMap) {
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get("id") || products[0].id;
  const product = products.find((item) => item.id === requestedId) || products[0];
  const related = products
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 4);

  document.title = `${product.name} | 3D Store`;

  root.innerHTML = `
    <div class="detail-layout">
      <div class="detail-media">
        ${Store.productVisual(product)}
      </div>
      <div class="detail-content">
        <p class="eyebrow">${categoryMap.get(product.category) || "3D Baski"}</p>
        <h1>${product.name}</h1>
        <p class="lead">${product.description}</p>
        <div class="detail-meta">
          <span class="pill">${product.material}</span>
          <span class="pill">${product.finish}</span>
          <span class="pill">${product.printTime} baski</span>
          <span class="pill">${product.leadTime} teslim</span>
          <span class="pill">${product.rating} puan</span>
        </div>
        <div class="buy-panel">
          <div>
            <span class="price">${Store.formatCurrency(product.price)}</span>
            <span class="old-price">${Store.formatCurrency(product.oldPrice)}</span>
          </div>
          <div class="qty-row">
            <label for="detail-quantity">Adet</label>
            <input id="detail-quantity" type="number" min="1" max="${product.stock}" value="1">
            <button class="button" type="button" data-detail-add="${product.id}">Sepete ekle</button>
          </div>
          <small>Stok: ${product.stock} adet. 1500 TL ve uzeri siparislerde kargo ucretsiz.</small>
        </div>
        <h2>Ozellikler</h2>
        <ul class="feature-list">
          ${product.features.map((feature) => `<li>${feature}</li>`).join("")}
        </ul>
        <h2>Teknik bilgiler</h2>
        <ul class="spec-list">
          ${Object.entries(product.specs).map(([key, value]) => `<li><span>${key}</span><strong>${value}</strong></li>`).join("")}
        </ul>
      </div>
    </div>
    ${related.length ? `
      <section class="section">
        <div class="section-head">
          <div>
            <p class="eyebrow">Benzer urunler</p>
            <h2>Ayni kategoriden secimler</h2>
          </div>
        </div>
        <div class="product-grid" data-related-grid></div>
      </section>
    ` : ""}
  `;

  root.querySelector("[data-detail-add]").addEventListener("click", () => {
    const quantity = root.querySelector("#detail-quantity").value;
    Store.addToCart(product, quantity);
  });

  const relatedGrid = root.querySelector("[data-related-grid]");
  if (relatedGrid) {
    renderProductCards(relatedGrid, related, categoryMap);
  }
}
