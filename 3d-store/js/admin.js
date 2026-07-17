(function () {
  const ADMIN_AUTH_KEY = "three-d-store-admin-auth-v1";
  const ADMIN_EMAIL = "admin@3dstore.local";
  const ADMIN_PASSWORD = "1234";

  function isAuthenticated() {
    return localStorage.getItem(ADMIN_AUTH_KEY) === "true";
  }

  function requireAuth() {
    if (!isAuthenticated()) {
      window.location.href = "login.html";
    }
  }

  function bindLogout() {
    document.querySelectorAll("[data-admin-logout]").forEach((button) => {
      button.addEventListener("click", () => {
        localStorage.removeItem(ADMIN_AUTH_KEY);
        window.location.href = "login.html";
      });
    });
  }

  function bindLogin(form) {
    const errorNode = form.querySelector(".form-error");

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const email = (formData.get("email") || "").toString().trim();
      const password = (formData.get("password") || "").toString();

      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        localStorage.setItem(ADMIN_AUTH_KEY, "true");
        window.location.href = "dashboard.html";
        return;
      }

      errorNode.textContent = "E-posta veya şifre hatalı.";
    });
  }

  function renderAdminNavigation() {
    const navigation = document.querySelector("[data-admin-nav]");
    if (!navigation) return;

    navigation.innerHTML = `
      <div class="admin-brand">
        <a href="dashboard.html">MAde3D</a>
      </div>
      <nav class="admin-links">
        <a href="dashboard.html">Kontrol Paneli</a>
        <a href="products-admin.html">Ürünler</a>
        <a href="orders-admin.html">Siparişler</a>
        <a href="customers-admin.html">Mesajlar</a>
      </nav>
      <button class="button secondary" type="button" data-admin-logout>Çıkış</button>
    `;

    bindLogout();
  }

  async function initDashboard() {
    const productCountNode = document.querySelector("[data-product-count]");
    const orderCountNode = document.querySelector("[data-order-count]");
    const messageCountNode = document.querySelector("[data-message-count]");
    const latestProductsNode = document.querySelector("[data-latest-products]");

    const products = await Store.loadProducts("../data/products.json");
    const orders = Store.getOrders();
    const messages = Store.getMessages();

    if (productCountNode) productCountNode.textContent = products.length;
    if (orderCountNode) orderCountNode.textContent = orders.length;
    if (messageCountNode) messageCountNode.textContent = messages.length;

    if (latestProductsNode) {
      latestProductsNode.innerHTML = products.slice(0, 5).map((product) => `
        <li>${product.name} <span>${product.category}</span></li>
      `).join("");
    }
  }

  async function initProductsAdmin() {
    const productTable = document.querySelector("[data-product-table]");
    const productForm = document.querySelector("[data-product-form]");
    const categorySelect = document.querySelector("[name='category']");
    const submitButton = document.querySelector("[data-product-submit]");
    const resetButton = document.querySelector("[data-product-reset]");
    const formMessage = document.querySelector("[data-form-message]");

    let products = await Store.loadProducts("../data/products.json");
    let categories = await Store.loadCategories("../data/categories.json");
    let editingId = null;

    function renderCategories() {
      if (!categorySelect) return;
      if (!categories.length) {
        categorySelect.innerHTML = `<option value="">Kategori yok</option>`;
        return;
      }
      categorySelect.innerHTML = categories.map((category) => `
        <option value="${category.id}">${category.name}</option>
      `).join("");
    }

    function saveCategories() {
      Store.saveCategories(categories);
    }

    function categoryIdFromName(name) {
      const trMap = {
        "ç": "c",
        "ğ": "g",
        "ı": "i",
        "i": "i",
        "ö": "o",
        "ş": "s",
        "ü": "u",
        "Ç": "c",
        "Ğ": "g",
        "İ": "i",
        "I": "i",
        "Ö": "o",
        "Ş": "s",
        "Ü": "u"
      };

      return name
        .trim()
        .replace(/[çğıiöşüÇĞİIÖŞÜ]/g, (char) => trMap[char] || char)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || `kategori-${Date.now()}`;
    }

    function renderCategoryManager() {
      const categoryManager = document.querySelector("[data-category-manager]");
      if (!categoryManager) return;
      categoryManager.innerHTML = `
        <div class="category-form-group">
          <input type="text" id="new-category-name" placeholder="Kategori adı" />
          <button type="button" class="button small" data-add-category>Ekle</button>
          <button type="button" class="button small" data-export-categories>Dışa aktar</button>
        </div>
        <p class="admin-note small">Not: Kategoriler yalnızca tarayıcıda saklanır. Kalıcı değişiklik için indirilen ` + "categories.json" + ` dosyasını repo içindeki data/categories.json ile değiştirip commit/push yapın.</p>
        <div class="category-list">
          ${categories.map((cat) => `
            <div class="category-item">
              <span>${cat.name}</span>
              <button type="button" class="button small secondary" data-delete-category="${cat.id}">Sil</button>
            </div>
          `).join("")}
        </div>
      `;
      bindCategoryActions();
    }

    function bindCategoryActions() {
      document.querySelector("[data-add-category]")?.addEventListener("click", () => {
        const input = document.querySelector("#new-category-name");
        const name = input.value.trim();
        if (!name) {
          Store.showToast("Kategori adı giriniz.");
          return;
        }
        const id = categoryIdFromName(name);
        const duplicate = categories.some((category) => (
          category.id === id || category.name.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR")
        ));

        if (duplicate) {
          Store.showToast("Bu kategori zaten var.");
          return;
        }

        const newCategory = {
          id,
          name,
          description: ""
        };
        categories.push(newCategory);
        saveCategories();
        renderCategoryManager();
        renderCategories();
        Store.showToast("Kategori eklendi.");
      });

      document.querySelectorAll("[data-delete-category]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.deleteCategory;
          const hasProducts = products.some((product) => product.category === id);
          if (hasProducts) {
            Store.showToast("Bu kategoriye bagli urun var. Once urun kategorilerini degistirin.");
            return;
          }
          if (!confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) return;
          categories = categories.filter((c) => c.id !== id);
          saveCategories();
          renderCategoryManager();
          renderCategories();
          Store.showToast("Kategori silindi.");
        });
      });

      document.querySelector("[data-export-categories]")?.addEventListener("click", () => {
        try {
          const blob = new Blob([JSON.stringify(categories, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "categories.json";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          Store.showToast("Kategoriler indirildi. Dosyayı repoya ekleyip pushlayın.");
        } catch (err) {
          console.error(err);
          Store.showToast("Dışa aktarılırken hata oluştu.");
        }
      });
    }

    function renderTable() {
      if (!productTable) return;
      const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
      productTable.innerHTML = products.map((product) => `
        <tr>
          <td>${product.id}</td>
          <td>${product.name}</td>
          <td>${categoryMap.get(product.category) || product.category}</td>
          <td>${product.price}</td>
          <td>${product.stock}</td>
          <td>${product.featured ? "Evet" : "Hayır"}</td>
          <td class="actions">
            <button type="button" class="button small" data-edit-product="${product.id}">Düzenle</button>
            <button type="button" class="button small secondary" data-delete-product="${product.id}">Sil</button>
          </td>
        </tr>
      `).join("");
      bindTableActions();
    }

    function bindTableActions() {
      productTable.querySelectorAll("[data-edit-product]").forEach((button) => {
        button.addEventListener("click", () => {
          const productId = button.dataset.editProduct;
          const product = products.find((item) => item.id === productId);
          if (!product) return;
          editingId = product.id;
          fillForm(product);
          submitButton.textContent = "Güncelle";
          formMessage.textContent = "Ürün düzenleme modunda.";
        });
      });

      productTable.querySelectorAll("[data-delete-product]").forEach((button) => {
        button.addEventListener("click", () => {
          const productId = button.dataset.deleteProduct;
          if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
          products = products.filter((item) => item.id !== productId);
          Store.saveProducts(products);
          renderTable();
          resetForm();
          Store.showToast("Ürün silindi.");
        });
      });
    }

    function fillForm(product) {
      productForm.querySelector("[name=id]").value = product.id;
      productForm.querySelector("[name=name]").value = product.name;
      productForm.querySelector("[name=category]").value = product.category;
      productForm.querySelector("[name=price]").value = product.price;
      productForm.querySelector("[name=oldPrice]").value = product.oldPrice || "";
      productForm.querySelector("[name=rating]").value = product.rating || 0;
      productForm.querySelector("[name=stock]").value = product.stock || 0;
      productForm.querySelector("[name=material]").value = product.material || "";
      productForm.querySelector("[name=finish]").value = product.finish || "";
      productForm.querySelector("[name=palette]").value = product.palette || "teal";
      productForm.querySelector("[name=shape]").value = product.shape || "stand";
      productForm.querySelector("[name=tags]").value = (product.tags || []).join(", ");
      productForm.querySelector("[name=image]").value = product.image || "";
      productForm.querySelector("[name=description]").value = product.description || "";
      productForm.querySelector("[name=featured]").checked = Boolean(product.featured);
      productForm.querySelector("[name=id]").disabled = true;
    }

    function resetForm() {
      editingId = null;
      productForm.reset();
      productForm.querySelector("[name=id]").disabled = false;
      submitButton.textContent = "Kaydet";
      formMessage.textContent = "Yeni ürün ekleyebilir veya mevcut ürünü düzenleyebilirsiniz.";
    }

    function collectProductData() {
      const formData = new FormData(productForm);
      const id = (formData.get("id") || "").toString().trim();
      const name = (formData.get("name") || "").toString().trim();
      return {
        id,
        name,
        category: (formData.get("category") || categories[0]?.id || "workspace").toString(),
        price: Number(formData.get("price") || 0),
        oldPrice: Number(formData.get("oldPrice") || 0),
        rating: Number(formData.get("rating") || 0),
        stock: Number(formData.get("stock") || 0),
        material: (formData.get("material") || "").toString().trim(),
        finish: (formData.get("finish") || "").toString().trim(),
        palette: (formData.get("palette") || "teal").toString().trim(),
        shape: (formData.get("shape") || "stand").toString().trim(),
        tags: ((formData.get("tags") || "").toString().split(",") || []).map((tag) => tag.trim()).filter(Boolean),
        image: (formData.get("image") || "").toString().trim(),
        description: (formData.get("description") || "").toString().trim(),
        featured: formData.get("featured") === "on"
      };
    }

    productForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const productData = collectProductData();

      if (!productData.id || !productData.name) {
        Store.showToast("Ürün ID ve adı zorunludur.");
        return;
      }

      const existingIndex = products.findIndex((item) => item.id === productData.id);
      if (editingId && existingIndex >= 0) {
        const existingProduct = products[existingIndex];
        products[existingIndex] = {
          ...existingProduct,
          ...productData,
          features: existingProduct.features || [],
          specs: existingProduct.specs || {}
        };
        Store.showToast("Ürün güncellendi.");
      } else if (existingIndex >= 0) {
        Store.showToast("Bu ID zaten kullanılıyor. Başka bir ID seçin.");
        return;
      } else {
        products.unshift({
          ...productData,
          tags: productData.tags,
          features: [],
          specs: {}
        });
        Store.showToast("Yeni ürün eklendi.");
      }

      Store.saveProducts(products);
      renderTable();
      resetForm();
    });

    resetButton.addEventListener("click", () => {
      resetForm();
    });

    renderCategories();
    renderCategoryManager();
    renderTable();
    resetForm();
  }

  function initOrdersAdmin() {
    const ordersRoot = document.querySelector("[data-orders-admin]");
    const debugNode = document.querySelector("[data-orders-debug]");
    if (!ordersRoot) return;

    const orders = Store.getOrders();
    
    // Debug bilgisi
    const debugInfo = {
      "localStorage key": "three-d-store-orders-v1",
      "siparış sayısı": orders.length,
      "ilk 3 sipariş": orders.slice(0, 3),
      "ham localStorage": localStorage.getItem("three-d-store-orders-v1")?.substring(0, 200) + "..."
    };
    
    if (debugNode) {
      debugNode.innerHTML = `<strong>Debug:</strong><br/>` + 
        Object.entries(debugInfo).map(([k, v]) => 
          `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`
        ).join("<br/>");
    }

    if (!orders.length) {
      ordersRoot.innerHTML = `
        <div class="empty-state">
          <h2>Henüz sipariş yok</h2>
          <p>Checkout demo kayıtları yerel tarayıcıda tutulur.</p>
        </div>
      `;
      return;
    }

    ordersRoot.innerHTML = orders.map((order) => `
      <article class="admin-card admin-order">
        <div class="order-header">
          <strong>Sipariş ${order.id}</strong>
          <span>${new Date(order.createdAt).toLocaleString("tr-TR")}</span>
        </div>
        <div class="order-meta">
          <span>${order.customer.name || order.customer.email}</span>
          <span>${Store.formatCurrency(order.totals.total)}</span>
        </div>
        <div class="order-items">
          ${order.items.map((item) => `<div>${item.name} x ${item.quantity}</div>`).join("")}
        </div>
      </article>
    `).join("");
  }

  function initCustomersAdmin() {
    const messagesRoot = document.querySelector("[data-customers-admin]");
    if (!messagesRoot) return;

    const messages = Store.getMessages();
    if (!messages.length) {
      messagesRoot.innerHTML = `
        <div class="empty-state">
          <h2>Henüz iletişim mesajı yok</h2>
          <p>Ziyaretçiler bu sayfadan mesaj gönderdiğinde burada listelenecek.</p>
        </div>
      `;
      return;
    }

    messagesRoot.innerHTML = messages.map((message) => `
      <article class="admin-card admin-message">
        <div class="message-meta">
          <strong>${message.name}</strong>
          <span>${message.email}</span>
          <span>${message.topic}</span>
          <span>${new Date(message.submittedAt).toLocaleString("tr-TR")}</span>
        </div>
        <p>${message.message}</p>
      </article>
    `).join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.querySelector("[data-admin-login]");
    if (loginForm) {
      bindLogin(loginForm);
      return;
    }

    requireAuth();
    renderAdminNavigation();
    bindLogout();

    if (document.querySelector("[data-admin-dashboard]")) {
      initDashboard();
    }

    if (document.querySelector("[data-products-admin]")) {
      initProductsAdmin();
    }

    if (document.querySelector("[data-orders-admin]")) {
      initOrdersAdmin();
    }

    if (document.querySelector("[data-customers-admin]")) {
      initCustomersAdmin();
    }
  });
})();
