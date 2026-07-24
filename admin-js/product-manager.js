(function () {
  const getFormImages = () => {
    const hidden = document.querySelector("#productImages");
    try {
      return hidden?.value ? JSON.parse(hidden.value) : [];
    } catch {
      return [];
    }
  };

  const setFormImages = (images) => {
    const hidden = document.querySelector("#productImages");
    const preview = document.querySelector("#imagePreview");
    if (hidden) hidden.value = JSON.stringify(images);
    ImageUpload.renderPreview(preview, images.map(Utils.imageUrl));
  };

  const getCategoryMap = async () => {
    const categories = await Store.getCategories({ includeInactive: true });
    return new Map(categories.map((category) => [category.id, category.name]));
  };

  const renderProductsTable = async () => {
    const body = document.querySelector("#productsTableBody");
    const count = document.querySelector("#productsCount");
    if (!body) return;

    try {
      const [products, categoryMap] = await Promise.all([
        Store.getProducts({ includeInactive: true }),
        getCategoryMap()
      ]);

      if (count) count.textContent = `${products.length} urun`;
      body.innerHTML = products.length
        ? products
            .map(
              (product) => `
                <tr>
                  <td><img class="table-image" src="${Utils.getImage(product)}" alt="${Utils.escapeHTML(product.name)}"></td>
                  <td>
                    <strong>${Utils.escapeHTML(product.name)}</strong>
                    <div class="muted">${Utils.escapeHTML(product.sku || "SKU yok")}</div>
                  </td>
                  <td>${Utils.escapeHTML(product.categoryName || categoryMap.get(product.categoryId) || "Kategorisiz")}</td>
                  <td>${Utils.money(product.price)}</td>
                  <td>${product.stock}</td>
                  <td><span class="badge">${product.active ? "Yayinda" : "Pasif"}</span></td>
                  <td>
                    <div class="table-actions">
                      <a class="btn btn-outline" href="${Utils.adminPath("edit-product.html")}?id=${product.id}">Duzenle</a>
                      <button class="btn btn-danger" type="button" data-delete-product="${product.id}">Sil</button>
                    </div>
                  </td>
                </tr>
              `
            )
            .join("")
        : `<tr><td colspan="7"><div class="empty-state"><h2>Urun yok</h2><p class="muted">Ilk urununuzu ekleyerek baslayin.</p></div></td></tr>`;
    } catch (error) {
      console.error("Urun tablosu yuklenemedi:", error);
      body.innerHTML = `<tr><td colspan="7"><div class="empty-state"><h2>Urunler yuklenemedi</h2><p class="muted">${Utils.escapeHTML(error.message || "Supabase verisi alinamadi.")}</p></div></td></tr>`;
      if (count) count.textContent = "0 urun";
    }
  };

  const fillCategorySelect = async () => {
    const select = document.querySelector("#categoryId");
    if (!select) return;
    const categories = await Store.getCategories();
    select.innerHTML = categories
      .map((category) => `<option value="${category.id}">${Utils.escapeHTML(category.name)}</option>`)
      .join("");
  };

  const loadProductForm = async () => {
    const form = document.querySelector("#productForm");
    if (!form) return;

    try {
      await fillCategorySelect();

      const editId = Utils.getParam("id");
      const product = editId ? await Store.getProductById(editId, { includeInactive: true }) : null;
      if (editId && !product) {
        form.innerHTML = `<div class="empty-state"><h2>Urun bulunamadi</h2><a class="btn btn-primary" href="${Utils.adminPath("products.html")}">Urunlere don</a></div>`;
        return;
      }

      if (product) {
        form.elements.name.value = product.name;
        form.elements.sku.value = product.sku || "";
        form.elements.categoryId.value = product.categoryId || "";
        form.elements.price.value = product.price;
        form.elements.oldPrice.value = product.oldPrice || "";
        form.elements.stock.value = product.stock;
        form.elements.shortDescription.value = product.shortDescription || "";
        form.elements.description.value = product.description || "";
        form.elements.featured.checked = Boolean(product.featured);
        form.elements.active.checked = product.active !== false;
        setFormImages(product.images || []);
      } else {
        form.elements.active.checked = true;
        setFormImages([]);
      }

      const fileInput = document.querySelector("#imageFiles");
      fileInput?.addEventListener("change", async () => {
        const uploaded = await ImageUpload.filesToImages(fileInput.files);
        setFormImages([...getFormImages(), ...uploaded].slice(0, 6));
        fileInput.value = "";
      });

      document.querySelector("#clearImages")?.addEventListener("click", () => setFormImages([]));

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(form);

        try {
          const saved = await Store.upsertProduct({
            id: product?.id,
            createdAt: product?.createdAt,
            name: data.get("name"),
            sku: data.get("sku"),
            categoryId: data.get("categoryId"),
            price: data.get("price"),
            oldPrice: data.get("oldPrice"),
            stock: data.get("stock"),
            shortDescription: data.get("shortDescription"),
            description: data.get("description"),
            featured: data.get("featured") === "on",
            active: data.get("active") === "on",
            images: getFormImages()
          });
          await Store.syncRemoteCatalog?.();
          Utils.showToast("Urun kaydedildi.");
          window.location.href = `${Utils.adminPath("edit-product.html")}?id=${saved.id}`;
        } catch (error) {
          console.error("Urun kaydedilemedi:", error);
          Utils.showToast(error.message || "Urun kaydedilemedi.");
        }
      });
    } catch (error) {
      console.error("Urun formu yuklenemedi:", error);
      form.innerHTML = `<div class="empty-state"><h2>Urun formu yuklenemedi</h2><p class="muted">${Utils.escapeHTML(error.message || "Supabase verisi alinamadi.")}</p></div>`;
    }
  };

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete-product]");
    if (!button) return;

    try {
      const product = await Store.getProductById(button.dataset.deleteProduct, { includeInactive: true });
      if (!product) return;
      if (!confirm(`${product.name} silinsin mi?`)) return;
      await Store.deleteProduct(product.id);
      await Store.syncRemoteCatalog?.();
      await renderProductsTable();
      Utils.showToast("Urun silindi.");
    } catch (error) {
      console.error("Urun silinemedi:", error);
      Utils.showToast(error.message || "Urun silinemedi.");
    }
  });

  window.ProductManager = {
    renderProductsTable,
    loadProductForm
  };
})();
