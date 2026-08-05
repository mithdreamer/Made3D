(function () {
  const sortProducts = (products, sortBy) => {
    const sorted = [...products];

    if (sortBy === "price-asc") {
      sorted.sort((a, b) => a.price - b.price);
    }

    if (sortBy === "price-desc") {
      sorted.sort((a, b) => b.price - a.price);
    }

    if (sortBy === "name") {
      sorted.sort((a, b) =>
        a.name.localeCompare(b.name, "tr")
      );
    }

    if (sortBy === "newest") {
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
      );
    }

    return sorted;
  };

  const renderError = (container, message) => {
    if (!container) return;

    container.innerHTML = `
      <div class="empty-state full-span">
        <h2>Bir hata oluştu</h2>
        <p class="muted">${Utils.escapeHTML(message)}</p>
      </div>
    `;
  };

  const renderHome = async () => {
    const featuredContainer =
      document.querySelector("#featuredProducts");

    const statsContainer =
      document.querySelector("#homeStats");

    try {
      /*
       * Supabase sorgusu asenkron olduğu için ürünlerin
       * gelmesini await ile bekliyoruz.
       */
      const products = await Store.getProducts();

      if (featuredContainer) {
        const featuredProducts = products
          .filter((product) => product.featured)
          .slice(0, 4);

        featuredContainer.innerHTML =
          featuredProducts.length > 0
            ? featuredProducts
                .map(ProductCard.render)
                .join("")
            : `
              <div class="empty-state full-span">
                <h2>Öne çıkan ürün bulunamadı</h2>
                <p class="muted">
                  Öne çıkan ürünler burada gösterilecektir.
                </p>
              </div>
            `;
      }

      if (statsContainer) {
        const categories = await Store.getCategories();
        statsContainer.innerHTML = `
          <div class="admin-card metric">
            <span class="muted">Aktif ürün</span>
            <strong>${products.length}</strong>
          </div>

          <div class="admin-card metric">
            <span class="muted">Kategori</span>
            <strong>${categories.length}</strong>
          </div>

          <div class="admin-card metric">
            <span class="muted">Sipariş yönetimi</span>
            <strong>Admin</strong>
          </div>
        `;
      }

      await Categories.renderCategoryTiles("#homeCategories");
    } catch (error) {
      console.error("Ana sayfa ürünleri yüklenemedi:", error);

      renderError(
        featuredContainer,
        "Ürünler şu anda yüklenemiyor."
      );
    }
  };

  const renderProductsPage = async () => {
    const grid = document.querySelector("#productGrid");
    const categoryFilter =
      document.querySelector("#categoryFilter");
    const search =
      document.querySelector("#productSearch");
    const sort =
      document.querySelector("#sortFilter");
    const resultCount =
      document.querySelector("#resultCount");

    if (
      !grid ||
      !categoryFilter ||
      !search ||
      !sort
    ) {
      return;
    }

    try {
      /*
       * Ürünleri sayfa açılırken bir defa Supabase'den alıyoruz.
       * Filtreleme ve sıralama sırasında yeniden sorgu göndermiyoruz.
       */
      const allProducts = await Store.getProducts();

      const categories = await Store.getCategories();
      const selectedCategory =
        Utils.getParam("category") || "all";

      categoryFilter.innerHTML = `
        <option value="all">Tüm kategoriler</option>

        ${categories
          .map(
            (category) => `
              <option value="${category.id}">
                ${Utils.escapeHTML(category.name)}
              </option>
            `
          )
          .join("")}
      `;

      categoryFilter.value = selectedCategory;

      const render = () => {
        const query = search.value
          .trim()
          .toLocaleLowerCase("tr-TR");

        let products = allProducts.filter(
          (product) => {
            const productName = (
              product.name || ""
            ).toLocaleLowerCase("tr-TR");

            const shortDescription = (
              product.shortDescription || ""
            ).toLocaleLowerCase("tr-TR");

            const sku = (
              product.sku || ""
            ).toLocaleLowerCase("tr-TR");

            const matchesCategory =
              categoryFilter.value === "all" ||
              product.categoryId ===
                categoryFilter.value;

            const matchesSearch =
              !query ||
              productName.includes(query) ||
              shortDescription.includes(query) ||
              sku.includes(query);

            return (
              matchesCategory &&
              matchesSearch
            );
          }
        );

        products = sortProducts(
          products,
          sort.value
        );

        if (resultCount) {
          resultCount.textContent =
            `${products.length} ürün`;
        }

        grid.innerHTML =
          products.length > 0
            ? products
                .map(ProductCard.render)
                .join("")
            : `
              <div class="empty-state full-span">
                <h2>Ürün bulunamadı</h2>
                <p class="muted">
                  Filtreleri temizleyerek tekrar deneyin.
                </p>
              </div>
            `;
      };

      [categoryFilter, search, sort].forEach(
        (input) => {
          input.addEventListener(
            "input",
            render
          );
        }
      );

      render();
    } catch (error) {
      console.error(
        "Ürün listesi yüklenemedi:",
        error
      );

      renderError(
        grid,
        "Ürünler Supabase üzerinden alınamadı."
      );

      if (resultCount) {
        resultCount.textContent = "0 ürün";
      }
    }
  };

  const renderDetailPage = async () => {
    const container =
      document.querySelector("#productDetail");

    if (!container) return;

    try {
      const slug =
        Utils.getParam("slug") ||
        Utils.getParam("id");

      const product = await Store.getProductBySlug(slug);

      if (!product) {
        container.innerHTML = `
          <div class="empty-state full-span">
            <h1>Ürün bulunamadı</h1>
            <p class="muted">
              Aradığınız ürün yayından kaldırılmış olabilir.
            </p>
            <a
              class="btn btn-primary"
              href="${Utils.pagePath("products.html")}"
            >
              Ürünlere dön
            </a>
          </div>
        `;

        return;
      }

      let galleryImages = [];
      try {
        galleryImages = await Store.getProductImages(product.id);
      } catch (error) {
        console.warn("Urun galerisi yuklenemedi:", error);
      }

      let productColorRows = [];
      try {
        productColorRows = await Store.getProductColors(product.id);
      } catch (error) {
        console.warn("Urun renkleri yuklenemedi:", error);
      }

      const activeProductColors = productColorRows
        .filter((row) => row.color_master?.is_active === true)
        .map((row) => ({
          code: row.color_code,
          name: row.color_master.name_tr || row.color_master.name_en || row.color_code,
          hexCode: row.color_master.hex_code || "#d9d9d9",
          isPrimary: Boolean(row.is_primary)
        }));

      const defaultColor =
        activeProductColors.find((color) => color.isPrimary) ||
        activeProductColors[0] ||
        null;

      const hasColorAssignments = productColorRows.length > 0;
      const hasPurchasableColor = activeProductColors.length > 0;

      const images = galleryImages.length
        ? galleryImages.map((image) => Utils.imageUrl(image.src || image.objectKey))
        : product.images?.length > 0
          ? product.images.map(Utils.imageUrl)
          : [Utils.getImage(product)];

      container.innerHTML = `
        <div class="product-gallery">
          <img
            class="product-main-image"
            src="${images[0]}"
            alt="${Utils.escapeHTML(product.name)}"
            data-main-product-image
            onerror="this.onerror=null;this.src=Utils.imageFallback()"
          >

          <div class="thumb-row">
            ${images
              .map(
                (src, index) => `
                  <img
                    class="${index === 0 ? "is-active" : ""}"
                    src="${src}"
                    alt="${Utils.escapeHTML(product.name)} görsel ${index + 1}"
                    data-product-thumb
                    onerror="this.onerror=null;this.src=Utils.imageFallback()"
                  >
                `
              )
              .join("")}
          </div>
        </div>

        <section class="stack">
          <span class="badge">
            ${Utils.escapeHTML(
              product.categoryName ||
                Utils.getCategoryName(
                  product.categoryId
                )
            )}
          </span>

          <h1>
            ${Utils.escapeHTML(product.name)}
          </h1>

          <p class="muted">
            ${Utils.escapeHTML(
              product.shortDescription || ""
            )}
          </p>

          <div class="cluster">
            <strong
              class="price"
              style="font-size: 1.7rem"
            >
              ${Utils.money(product.price)}
            </strong>

            ${
              product.oldPrice > product.price
                ? `
                  <span class="old-price">
                    ${Utils.money(product.oldPrice)}
                  </span>
                `
                : ""
            }

            <span class="badge">
              ${
                product.stock > 0
                  ? `${product.stock} stok`
                  : "Stok yok"
              }
            </span>
          </div>

          <p>
            ${Utils.escapeHTML(
              product.description || ""
            )}
          </p>

          ${
            hasPurchasableColor
              ? `
                <fieldset class="product-color-picker" data-product-color-picker>
                  <legend>Renk seçimi</legend>
                  <p class="product-color-selection">
                    Seçili renk:
                    <strong data-selected-color-name>${Utils.escapeHTML(defaultColor.name)}</strong>
                  </p>
                  <p class="muted">Siparişe devam etmek için aşağıdaki renklerden birini seçmelisiniz.</p>
                  <div class="product-color-options">
                    ${activeProductColors
                      .map(
                        (color) => `
                          <label class="product-color-option" title="${Utils.escapeHTML(color.name)}">
                            <input
                              type="radio"
                              name="product-color"
                              value="${Utils.escapeHTML(color.code)}"
                              data-color-name="${Utils.escapeHTML(color.name)}"
                              ${color.code === defaultColor.code ? "checked" : ""}
                            >
                            <span
                              class="product-color-swatch"
                              style="--product-color: ${Utils.escapeHTML(color.hexCode)}"
                              aria-hidden="true"
                            ></span>
                            <span>${Utils.escapeHTML(color.name)}</span>
                          </label>
                        `
                      )
                      .join("")}
                  </div>
                </fieldset>
              `
              : hasColorAssignments
                ? `
                  <div class="product-color-unavailable" role="status">
                    Bu ürünün renk seçenekleri şu anda satışa kapalıdır.
                  </div>
                `
                : ""
          }

          <div class="cluster">
            <button
              class="btn btn-primary"
              type="button"
              data-add-to-cart="${product.id}"
              ${
                product.stock <= 0 ||
                (hasColorAssignments && !hasPurchasableColor)
                  ? "disabled"
                  : ""
              }
            >
              Sepete ekle
            </button>

            <a
              class="btn btn-outline"
              href="${Utils.pagePath("products.html")}"
            >
              Alışverişe devam et
            </a>
          </div>
        </section>
      `;

      container
        .querySelectorAll("[data-product-thumb]")
        .forEach((thumb) => {
          thumb.addEventListener(
            "click",
            () => {
              const mainImage =
                container.querySelector(
                  "[data-main-product-image]"
                );

              if (mainImage) {
                mainImage.src = thumb.src;
              }

              container
                .querySelectorAll(
                  "[data-product-thumb]"
                )
                .forEach((item) => {
                  item.classList.remove(
                    "is-active"
                  );
                });

              thumb.classList.add("is-active");
            }
          );
        });

      container
        .querySelectorAll('input[name="product-color"]')
        .forEach((input) => {
          input.addEventListener("change", () => {
            const selectedName = container.querySelector(
              "[data-selected-color-name]"
            );

            if (selectedName && input.checked) {
              selectedName.textContent = input.dataset.colorName || input.value;
            }
          });
        });
    } catch (error) {
      console.error(
        "Ürün detayı yüklenemedi:",
        error
      );

      renderError(
        container,
        "Ürün bilgileri şu anda yüklenemiyor."
      );
    }
  };

  window.Products = {
    renderHome,
    renderProductsPage,
    renderDetailPage
  };
})();
