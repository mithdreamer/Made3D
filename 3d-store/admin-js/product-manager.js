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

  const renderProductsTable = () => {
    const body = document.querySelector("#productsTableBody");
    const count = document.querySelector("#productsCount");
    if (!body) return;

    const products = Store.getProducts({ includeInactive: true });
    if (count) count.textContent = `${products.length} ürün`;
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
                <td>${Utils.escapeHTML(Utils.getCategoryName(product.categoryId))}</td>
                <td>${Utils.money(product.price)}</td>
                <td>${product.stock}</td>
                <td><span class="badge">${product.active ? "Yayında" : "Pasif"}</span></td>
                <td>
                  <div class="table-actions">
                    <a class="btn btn-outline" href="${Utils.adminPath("edit-product.html")}?id=${product.id}">Düzenle</a>
                    <button class="btn btn-danger" type="button" data-delete-product="${product.id}">Sil</button>
                  </div>
                </td>
              </tr>
            `
          )
          .join("")
      : `<tr><td colspan="7"><div class="empty-state"><h2>Ürün yok</h2><p class="muted">İlk ürününüzü ekleyerek başlayın.</p></div></td></tr>`;
  };

  const fillCategorySelect = () => {
    const select = document.querySelector("#categoryId");
    if (!select) return;
    select.innerHTML = Store.getCategories()
      .map((category) => `<option value="${category.id}">${Utils.escapeHTML(category.name)}</option>`)
      .join("");
  };

  const loadProductForm = () => {
    const form = document.querySelector("#productForm");
    if (!form) return;
    fillCategorySelect();

    const editId = Utils.getParam("id");
    const product = editId ? Store.getProductById(editId, { includeInactive: true }) : null;
    if (editId && !product) {
      form.innerHTML = `<div class="empty-state"><h2>Ürün bulunamadı</h2><a class="btn btn-primary" href="${Utils.adminPath("products.html")}">Ürünlere dön</a></div>`;
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
      const saved = Store.upsertProduct({
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
      Utils.showToast("Ürün kaydedildi.");
      window.location.href = `${Utils.adminPath("edit-product.html")}?id=${saved.id}`;
    });
  };

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-product]");
    if (!button) return;
    const product = Store.getProductById(button.dataset.deleteProduct, { includeInactive: true });
    if (!product) return;
    if (!confirm(`${product.name} silinsin mi?`)) return;
    Store.deleteProduct(product.id);
    Store.syncRemoteCatalog?.();
    renderProductsTable();
    Utils.showToast("Ürün silindi.");
  });

  window.ProductManager = {
    renderProductsTable,
    loadProductForm
  };
})();
