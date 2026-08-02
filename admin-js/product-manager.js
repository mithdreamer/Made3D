(function () {
  const getCategoryMap = async () => {
    const categories = await Store.getCategories({ includeInactive: true });
    return new Map(categories.map((category) => [category.id, category.name]));
  };

  const showFormMessage = (form, message, type = "info") => {
    if (!form) return;
    let node = document.querySelector("#productFormMessage");
    if (!node) {
      node = document.createElement("div");
      node.id = "productFormMessage";
      form.parentNode?.insertBefore(node, form);
    }

    node.className = `form-message is-${type}`;
    node.textContent = message || "";
  };

  const clearFormMessage = () => {
    const node = document.querySelector("#productFormMessage");
    if (node) node.remove();
  };

  const serializeImages = (items) =>
    items.map((item) => ({
      id: item.id || "",
      objectKey: item.objectKey || "",
      src: item.src || "",
      publicUrl: item.publicUrl || "",
      originalName: item.originalName || "",
      contentType: item.contentType || "",
      sizeBytes: item.sizeBytes || 0,
      altText: item.altText || "",
      isPrimary: Boolean(item.isPrimary),
      sortOrder: item.sortOrder || 0,
      status: item.status || "saved",
      error: item.error || ""
    }));

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
                  <td><img class="table-image" src="${Utils.getImage(product)}" alt="${Utils.escapeHTML(product.name)}" onerror="this.onerror=null;this.src=Utils.imageFallback()"></td>
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

  const loadExistingImages = async (product) => {
    if (!product?.id) return [];

    try {
      const images = await Store.getProductImages(product.id);
      if (images.length) return images.map(ImageUpload.normalizeExistingImage);
    } catch (error) {
      console.warn("Urun gorselleri yuklenemedi:", error);
    }

    return (product.images || []).map((src, index) =>
      ImageUpload.normalizeExistingImage({
        src,
        originalName: `Gorsel ${index + 1}`,
        isPrimary: index === 0,
        sortOrder: index
      })
    );
  };

  const deleteRemovedImages = async (originalImageIds, currentItems) => {
    const currentSavedIds = new Set(currentItems.filter((item) => item.id).map((item) => item.id));
    const removedIds = [...originalImageIds].filter((imageId) => !currentSavedIds.has(imageId));

    for (const imageId of removedIds) {
      await Store.deleteProductImage(imageId);
    }

    return removedIds.length;
  };

  const persistImageState = async (product, originalImageIds, items) => {
    const uploadedWithoutRecord = items
      .filter((item) => item.status === "uploaded" && item.objectKey && !item.id)
      .map((item, index) => ({
        ...item,
        isPrimary: false,
        sortOrder: items.findIndex((candidate) => ImageUpload.itemKey(candidate) === ImageUpload.itemKey(item)),
        altText: item.altText || `${product.name} urun gorseli ${index + 1}`
      }));

    let metadataFailures = [];
    if (uploadedWithoutRecord.length) {
      try {
        await Store.createProductImages(product.id, uploadedWithoutRecord);
      } catch (error) {
        if (!Array.isArray(error.failedImages)) throw error;
        metadataFailures = error.failedImages;
      }
    }

    await deleteRemovedImages(originalImageIds, items);

    const latestImages = await Store.getProductImages(product.id);
    if (!latestImages.length) return { images: [], failed: metadataFailures };

    const latestById = new Map(latestImages.map((image) => [image.id, image]));
    const latestByObjectKey = new Map(latestImages.map((image) => [image.objectKey, image]));

    const orderedIds = items
      .map((item) => {
        if (item.id && latestById.has(item.id)) return item.id;
        if (item.objectKey && latestByObjectKey.has(item.objectKey)) return latestByObjectKey.get(item.objectKey).id;
        return "";
      })
      .filter(Boolean);

    if (orderedIds.length) {
      await Store.updateProductImageOrder(product.id, orderedIds);
    }

    const primaryItem = items.find((item) => item.isPrimary) || items[0];
    const primaryId =
      (primaryItem?.id && latestById.has(primaryItem.id) ? primaryItem.id : "") ||
      (primaryItem?.objectKey && latestByObjectKey.get(primaryItem.objectKey)?.id) ||
      orderedIds[0] ||
      "";

    if (primaryId) {
      await Store.setPrimaryProductImage(product.id, primaryId);
    }

    return {
      images: await Store.getProductImages(product.id),
      failed: metadataFailures
    };
  };

  const loadProductForm = async () => {
    const form = document.querySelector("#productForm");
    if (!form) return;

    let imageItems = [];
    let originalImageIds = new Set();
    let currentProduct = null;
    let availableColors = [];
    let selectedColors = [];

    const renderColorOptions = () => {
      const container = document.querySelector("#productColorOptions");
      const errorNode = document.querySelector("#productColorError");
      if (!container) return;

      if (!availableColors.length) {
        container.innerHTML = `<p class="muted">Aktif renk seçeneği bulunamadı.</p>`;
        return;
      }

      const selectedByCode = new Map(
        selectedColors.map((color) => [color.color_code, color])
      );

      container.innerHTML = availableColors
        .map((color) => {
          const selectedColor = selectedByCode.get(color.code);
          const isSelected = Boolean(selectedColor);
          const isPrimary = Boolean(selectedColor?.is_primary);

          return `
            <div class="product-color-option">
              <label class="product-color-select">
                <input
                  type="checkbox"
                  data-color-select="${Utils.escapeHTML(color.code)}"
                  ${isSelected ? "checked" : ""}
                >
                <span
                  class="product-color-swatch"
                  style="background-color: ${Utils.escapeHTML(color.hex_code || "#ffffff")}"
                ></span>
                <span>${Utils.escapeHTML(color.name_tr || color.name_en || color.code)}</span>
              </label>

              <label class="product-color-primary">
                <input
                  type="radio"
                  name="primaryProductColor"
                  data-color-primary="${Utils.escapeHTML(color.code)}"
                  ${isPrimary ? "checked" : ""}
                  ${isSelected ? "" : "disabled"}
                >
                Ana renk
              </label>
            </div>
          `;
        })
        .join("");

      if (errorNode) {
        errorNode.hidden = true;
        errorNode.textContent = "";
      }
    };

    const setFormImages = (items) => {
      imageItems = ImageUpload.ensurePrimary(items).slice(0, ImageUpload.maxImages());
      const hidden = document.querySelector("#productImages");
      const preview = document.querySelector("#imagePreview");
      if (hidden) hidden.value = JSON.stringify(serializeImages(imageItems));
      ImageUpload.renderPreview(preview, imageItems);
    };

    const moveImage = (imageId, direction) => {
      const index = imageItems.findIndex((item) => ImageUpload.itemKey(item) === imageId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= imageItems.length) return;
      const next = [...imageItems];
      [next[index], next[target]] = [next[target], next[index]];
      setFormImages(next);
    };

    try {
      await fillCategorySelect();
      availableColors = await Store.getActiveColors();

      const editId = Utils.getParam("id");
      currentProduct = editId ? await Store.getProductById(editId, { includeInactive: true }) : null;
      if (editId && !currentProduct) {
        form.innerHTML = `<div class="empty-state"><h2>Urun bulunamadi</h2><a class="btn btn-primary" href="${Utils.adminPath("products.html")}">Urunlere don</a></div>`;
        return;
      }

      if (currentProduct) {
        form.elements.name.value = currentProduct.name;
        form.elements.sku.value = currentProduct.sku || "";
        form.elements.categoryId.value = currentProduct.categoryId || "";
        form.elements.price.value = currentProduct.price;
        form.elements.oldPrice.value = currentProduct.oldPrice || "";
        form.elements.stock.value = currentProduct.stock;
        form.elements.shortDescription.value = currentProduct.shortDescription || "";
        form.elements.description.value = currentProduct.description || "";
        form.elements.featured.checked = Boolean(currentProduct.featured);
        form.elements.active.checked = currentProduct.active !== false;
        setFormImages(await loadExistingImages(currentProduct));
        originalImageIds = new Set(imageItems.filter((item) => item.id).map((item) => item.id));
      } else {
        form.elements.active.checked = true;
        setFormImages([]);
      }
      if (currentProduct) {
        const productColors = await Store.getProductColors(currentProduct.id);

        selectedColors = productColors.map((color, index) => ({
          color_code: color.color_code,
          is_primary: Boolean(color.is_primary),
          display_order: Number(color.display_order ?? index)
        }));
      } else {
        selectedColors = [];
      }

      renderColorOptions();

      document
        .querySelector("#productColorOptions")
        ?.addEventListener("change", (event) => {
          const selectInput = event.target.closest("[data-color-select]");
          const primaryInput = event.target.closest("[data-color-primary]");

          if (selectInput) {
            const colorCode = selectInput.dataset.colorSelect;

            if (selectInput.checked) {
              const hasPrimaryColor = selectedColors.some(
                (color) => color.is_primary
              );

              selectedColors.push({
                color_code: colorCode,
                is_primary: !hasPrimaryColor,
                display_order: selectedColors.length
              });
            } else {
              const removedColor = selectedColors.find(
                (color) => color.color_code === colorCode
              );

              selectedColors = selectedColors.filter(
                (color) => color.color_code !== colorCode
              );

              if (
                removedColor?.is_primary &&
                selectedColors.length > 0
              ) {
                selectedColors[0].is_primary = true;
              }
            }

            selectedColors.forEach((color, index) => {
              color.display_order = index;
            });

            renderColorOptions();
            return;
          }

          if (primaryInput && primaryInput.checked) {
            const colorCode = primaryInput.dataset.colorPrimary;

            selectedColors = selectedColors.map((color) => ({
              ...color,
              is_primary: color.color_code === colorCode
            }));

            renderColorOptions();
          }
        });

      const fileInput = document.querySelector("#imageFiles");
      fileInput?.addEventListener("change", () => {
        const { items, errors } = ImageUpload.createPendingItems(fileInput.files, imageItems);
        if (errors.length) Utils.showToast(errors.join(" "));
        setFormImages([...imageItems, ...items]);
        fileInput.value = "";
      });

      document.querySelector("#imagePreview")?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-image-action]");
        if (!button) return;

        const imageId = button.dataset.imageId;
        const action = button.dataset.imageAction;

        if (action === "primary") {
          setFormImages(imageItems.map((item) => ({ ...item, isPrimary: ImageUpload.itemKey(item) === imageId })));
        }

        if (action === "up") moveImage(imageId, -1);
        if (action === "down") moveImage(imageId, 1);
        if (action === "remove") {
          setFormImages(imageItems.filter((item) => ImageUpload.itemKey(item) !== imageId));
        }
      });

      document.querySelector("#clearImages")?.addEventListener("click", () => setFormImages([]));

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearFormMessage();

        const submit = form.querySelector("[type='submit']");
        const originalSubmitText = submit?.textContent || "";
        const data = new FormData(form);

        try {
          if (submit) {
            submit.disabled = true;
            submit.textContent = "Kaydediliyor...";
          }
          showFormMessage(form, "Urun kaydediliyor.", "info");

          const saved = await Store.upsertProduct({
            id: currentProduct?.id,
            createdAt: currentProduct?.createdAt,
            name: data.get("name"),
            sku: data.get("sku"),
            categoryId: data.get("categoryId"),
            price: data.get("price"),
            oldPrice: data.get("oldPrice"),
            stock: data.get("stock"),
            shortDescription: data.get("shortDescription"),
            description: data.get("description"),
            featured: data.get("featured") === "on",
            active: data.get("active") === "on"
          });

          currentProduct = saved;
          if (!Utils.getParam("id")) {
            window.history.replaceState({}, "", `${Utils.adminPath("edit-product.html")}?id=${saved.id}`);
          }

          showFormMessage(form, "Gorseller yukleniyor.", "info");
          const uploadResult = await ImageUpload.uploadPendingImages(imageItems, saved.id, {
            onChange: setFormImages
          });
          setFormImages(uploadResult.items);

          let databaseImageError = null;
          let imageStateResult = { images: [], failed: [] };
          try {
            imageStateResult = await persistImageState(saved, originalImageIds, imageItems);
            const metadataFailureKeys = new Set(
              imageStateResult.failed.map((item) => ImageUpload.itemKey(item) || item.objectKey)
            );
            const failureByKey = new Map(
              imageStateResult.failed.map((item) => [ImageUpload.itemKey(item) || item.objectKey, item])
            );
            const retryableImages = imageItems
              .filter((item) => {
                const key = ImageUpload.itemKey(item) || item.objectKey;
                return (["pending", "error"].includes(item.status) && item.file) || metadataFailureKeys.has(key);
              })
              .map((item) => {
                const key = ImageUpload.itemKey(item) || item.objectKey;
                const failure = failureByKey.get(key);
                if (!failure) return item;
                return {
                  ...item,
                  objectKey: "",
                  publicUrl: "",
                  src: item.previewSrc || item.src,
                  status: "error",
                  error: failure.rollbackError
                    ? `${failure.error} R2 temizligi tamamlanamadi: ${failure.rollbackError}`
                    : failure.error || "Gorsel metadata kaydi olusturulamadi."
                };
              });
            setFormImages([
              ...imageStateResult.images.map(ImageUpload.normalizeExistingImage),
              ...retryableImages
            ]);
            originalImageIds = new Set(imageItems.filter((item) => item.id).map((item) => item.id));
          } catch (error) {
            databaseImageError = error;
            console.error("Gorsel kayitlari tamamlanamadi:", error);
          }

          await Store.getProducts({ includeInactive: true });
          await Store.syncRemoteCatalog?.();

          if (uploadResult.failed.length || imageStateResult.failed.length || databaseImageError) {
            const failedNames = [
              ...uploadResult.failed,
              ...imageStateResult.failed
            ]
              .map((item) => item.originalName || item.objectKey || "gorsel")
              .filter(Boolean);
            const message = failedNames.length
              ? `Urun kaydedildi, ancak su gorseller tamamlanamadi: ${failedNames.join(", ")}. Tekrar kaydedebilirsiniz.`
              : `Urun kaydedildi, ancak bazi gorsel islemleri tamamlanamadi. ${databaseImageError?.message || "Tekrar kaydedebilirsiniz."}`;
            showFormMessage(form, message, "warning");
            Utils.showToast(message);
            return;
          }

          Utils.showToast("Urun kaydedildi.");
          window.location.href = `${Utils.adminPath("edit-product.html")}?id=${saved.id}`;
        } catch (error) {
          console.error("Urun kaydedilemedi:", error);
          const message = error.message || "Urun kaydedilemedi.";
          showFormMessage(form, message, "error");
          Utils.showToast(message);
        } finally {
          if (submit) {
            submit.disabled = false;
            submit.textContent = originalSubmitText;
          }
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
