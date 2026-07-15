(function () {
  let editingId = null;

  const resetForm = () => {
    const form = document.querySelector("#categoryForm");
    if (!form) return;
    form.reset();
    form.elements.active.checked = true;
    editingId = null;
    document.querySelector("#categorySubmit").textContent = "Kategori ekle";
  };

  const renderCategories = () => {
    const body = document.querySelector("#categoriesTableBody");
    if (!body) return;
    const products = Store.getProducts({ includeInactive: true });
    const categories = Store.getCategories({ includeInactive: true });
    body.innerHTML = categories.length
      ? categories
          .map((category) => {
            const count = products.filter((product) => product.categoryId === category.id).length;
            return `
              <tr>
                <td><strong>${Utils.escapeHTML(category.name)}</strong><div class="muted">${Utils.escapeHTML(category.slug)}</div></td>
                <td>${Utils.escapeHTML(category.description || "")}</td>
                <td>${count}</td>
                <td><span class="badge">${category.active ? "Aktif" : "Pasif"}</span></td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-outline" type="button" data-edit-category="${category.id}">Düzenle</button>
                    <button class="btn btn-danger" type="button" data-delete-category="${category.id}">Sil</button>
                  </div>
                </td>
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="5"><div class="empty-state"><h2>Kategori yok</h2></div></td></tr>`;
  };

  const bindCategoryForm = () => {
    const form = document.querySelector("#categoryForm");
    if (!form) return;
    resetForm();
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      Store.upsertCategory({
        id: editingId,
        name: data.get("name"),
        description: data.get("description"),
        active: data.get("active") === "on"
      });
      await Store.syncRemoteCatalog?.();
      renderCategories();
      resetForm();
      Utils.showToast("Kategori kaydedildi.");
    });

    document.querySelector("#categoryCancel")?.addEventListener("click", resetForm);
  };

  document.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-edit-category]");
    const remove = event.target.closest("[data-delete-category]");

    if (edit) {
      const category = Store.getCategories({ includeInactive: true }).find((item) => item.id === edit.dataset.editCategory);
      const form = document.querySelector("#categoryForm");
      if (!category || !form) return;
      editingId = category.id;
      form.elements.name.value = category.name;
      form.elements.description.value = category.description || "";
      form.elements.active.checked = category.active !== false;
      document.querySelector("#categorySubmit").textContent = "Kaydet";
    }

    if (remove) {
      try {
        if (!confirm("Kategori silinsin mi?")) return;
        Store.deleteCategory(remove.dataset.deleteCategory);
        Store.syncRemoteCatalog?.();
        renderCategories();
        Utils.showToast("Kategori silindi.");
      } catch (error) {
        Utils.showToast(error.message);
      }
    }
  });

  window.CategoryManager = {
    renderCategories,
    bindCategoryForm
  };
})();
