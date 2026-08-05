const { test, expect } = require("@playwright/test");
const path = require("path");
const productsSeed = require("../data/products.json");
const categoriesSeed = require("../data/categories.json");

const SUPABASE_ORIGIN = "https://zkrqlmdouceszgnkxnzh.supabase.co";

const toDatabaseCategory = (category, index) => ({
  id: category.id,
  name: category.name,
  slug: category.slug,
  description: category.description || "",
  is_active: category.active !== false,
  sort_order: index,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z"
});

const toDatabaseProduct = (product) => {
  const category = categoriesSeed.find((item) => item.id === product.categoryId) || {};
  return {
    id: product.id,
    product_code: product.sku || "",
    name: product.name,
    slug: product.slug,
    category_id: product.categoryId,
    category_name: category.name || "",
    category_slug: category.slug || "",
    short_description: product.shortDescription || "",
    description: product.description || "",
    price: product.price,
    old_price: product.oldPrice || null,
    stock: product.stock,
    currency_code: "TRY",
    base_unit: "adet",
    is_active: product.active !== false,
    is_featured: Boolean(product.featured),
    primary_image_url: product.images?.[0] || "",
    primary_image_object_key: "",
    primary_image_alt: product.name,
    created_at: product.createdAt,
    updated_at: product.updatedAt || product.createdAt
  };
};

const installSupabaseMock = async (page) => {
  const db = {
    categories: categoriesSeed.map(toDatabaseCategory),
    products: productsSeed.map(toDatabaseProduct),
    product_images: productsSeed.flatMap((product, productIndex) =>
      (product.images || []).map((src, imageIndex) => ({
        id: `img-${product.id}-${imageIndex}`,
        product_id: product.id,
        storage_provider: "local_test",
        bucket_name: "test",
        object_key: "",
        public_url: src,
        original_file_name: path.basename(src),
        mime_type: "image/svg+xml",
        size_bytes: 0,
        alt_text: product.name,
        sort_order: imageIndex,
        is_primary: imageIndex === 0,
        created_at: product.createdAt || `2026-01-0${productIndex + 1}T00:00:00.000Z`,
        updated_at: product.updatedAt || product.createdAt
      }))
    )
  };

  const json = (body, status = 200, headers = {}) => ({
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });

  const eqValue = (url, name) => {
    const value = url.searchParams.get(name) || "";
    return value.startsWith("eq.") ? value.slice(3) : "";
  };

  const applyFilters = (url, rows) => {
    let nextRows = [...rows];
    for (const column of ["id", "slug", "product_id"]) {
      const value = eqValue(url, column);
      if (value) nextRows = nextRows.filter((row) => row[column] === value);
    }

    const isActive = eqValue(url, "is_active");
    if (isActive) {
      nextRows = nextRows.filter((row) => String(row.is_active) === isActive);
    }

    return nextRows;
  };

  const applyOrders = (url, rows) => {
    let nextRows = [...rows];
    for (const orderParam of [...url.searchParams.getAll("order")].reverse()) {
      const [column, direction] = orderParam.split(".");
      nextRows = nextRows.sort((left, right) => {
        const a = left[column] ?? "";
        const b = right[column] ?? "";
        const compare = typeof a === "number" && typeof b === "number"
          ? a - b
          : String(a).localeCompare(String(b));
        return direction === "desc" ? -compare : compare;
      });
    }
    return nextRows;
  };

  await page.route(`${SUPABASE_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (url.pathname.startsWith("/auth/v1/token")) {
      return route.fulfill(json({
        access_token: "test-access-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "test-refresh-token",
        user: {
          id: "admin-user",
          email: "admin@example.test",
          app_metadata: { role: "admin" }
        }
      }));
    }

    if (url.pathname.startsWith("/auth/v1/user")) {
      const authorized = request.headers().authorization === "Bearer test-access-token";
      return route.fulfill(authorized
        ? json({ id: "admin-user", email: "admin@example.test", app_metadata: { role: "admin" } })
        : json({ message: "No session" }, 401));
    }

    const table = url.pathname.replace(/^\/rest\/v1\//, "");
    if (!table || table === url.pathname) {
      return route.fulfill(json({ message: "Not found" }, 404));
    }

    const sourceRows = table === "storefront_products"
      ? db.products.filter((product) => product.is_active)
      : db[table];

    if (!sourceRows) {
      return route.fulfill(json({ message: "Unknown table" }, 404));
    }

    if (method === "GET") {
      const rows = applyOrders(url, applyFilters(url, sourceRows));
      const wantsSingle = (request.headers().accept || "").includes("application/vnd.pgrst.object+json");
      return route.fulfill(json(wantsSingle ? rows[0] || null : rows));
    }

    if (method === "PATCH" && table === "products") {
      const productId = eqValue(url, "id");
      const payload = JSON.parse(request.postData() || "{}");
      const product = db.products.find((item) => item.id === productId);
      if (!product) return route.fulfill(json({ message: "Not found" }, 404));
      Object.assign(product, payload);
      return route.fulfill(json(product, 200));
    }

    return route.fulfill(json({ message: "Method not allowed" }, 405));
  });
};

test("MAde3D storefront and admin demo flow", async ({ page }) => {
  const adminEmail = process.env.MADE3D_ADMIN_EMAIL;
  const adminPassword = process.env.MADE3D_ADMIN_PASSWORD;

  await installSupabaseMock(page);

  await page.goto("http://localhost:8080/");
  await expect(page).toHaveTitle(/MAde3D/);
  await expect(page.getByRole("heading", { name: /3D baskı/i })).toBeVisible();
  await expect(page.locator(".category-tile").first()).toBeVisible();

  await page.goto("http://localhost:8080/pages/products.html");
  await expect(page.locator(".product-card").first()).toBeVisible();
  await page.locator(".product-card-title a").first().click();
  await expect(page.locator("[data-main-product-image]")).toBeVisible();
  await expect(page.locator("[data-product-thumb]").first()).toBeVisible();
  await page.goto("http://localhost:8080/pages/products.html");
  await page.locator("[data-add-to-cart]").first().click();
  await expect(page.locator("[data-cart-count]").first()).toHaveText("1");

  await page.goto("http://localhost:8080/pages/cart.html");
  await expect(page.locator(".cart-item")).toHaveCount(1);
  await page.getByRole("link", { name: /Sipariş bilgilerine geç/i }).click();

  await page.getByLabel("Ad Soyad").fill("Test Müşteri");
  await page.getByLabel("Telefon").fill("+90 555 000 00 00");
  await page.getByLabel("E-posta").fill("test@example.com");
  await page.getByLabel("Şehir").fill("İstanbul");
  await page.getByLabel("İlçe").fill("Kadıköy");
  await page.getByLabel("Adres").fill("Test adresi");
  await page.getByLabel("Sipariş notu").fill("Mat turkuaz renk tercih edilir.");
  await page.getByLabel(/Teslimat bilgilerimi/).check();
  await page.getByRole("button", { name: /Siparişi oluştur/i }).click();
  await expect(page).toHaveURL(/order-success\.html\?order=/);
  await expect(page.getByText(/MAde-2026-/)).toBeVisible();

  await page.goto("http://localhost:8080/admin/");
  await expect(page).toHaveURL(/admin\/login\.html/);
  if (!adminEmail || !adminPassword) {
    test.info().annotations.push({
      type: "note",
      description: "Admin Supabase Auth akisi icin MADE3D_ADMIN_EMAIL ve MADE3D_ADMIN_PASSWORD gerekir."
    });
    return;
  }

  await page.getByLabel("E-posta").fill(adminEmail);
  await page.getByLabel("Şifre").fill(adminPassword);
  await page.getByRole("button", { name: /Giriş yap/i }).click();
  await expect(page).toHaveURL(/admin\/index\.html/);
  await expect(page.getByText("MAde3D Admin")).toBeVisible();

  await page.goto("http://localhost:8080/admin/products.html");
  await expect(page.locator("#productsTableBody tr").first()).toBeVisible();

  await page.goto("http://localhost:8080/admin/categories.html");
  await expect(page.locator("#categoriesTableBody tr").first()).toBeVisible();

  await page.goto("http://localhost:8080/admin/orders.html");
  await expect(page.locator("#ordersTableBody tr").first()).toContainText("MAde-2026-");

  await page.goto("http://localhost:8080/admin/payment-settings.html");
  await page.getByLabel("Havale/EFT").check();
  await page.getByRole("button", { name: /Ödeme ayarlarını kaydet/i }).click();
  await expect(page.locator(".toast")).toContainText("Ödeme ayarları kaydedildi.");

  await page.goto("http://localhost:8080/admin/shipping-settings.html");
  await page.getByLabel("Sabit kargo ücreti").fill("109");
  await page.getByRole("button", { name: /Kargo ayarlarını kaydet/i }).click();
  await expect(page.locator(".toast")).toContainText("Kargo ayarları kaydedildi.");

  await page.goto("http://localhost:8080/admin/settings.html");
  await page.setInputFiles("#aboutImageFiles", path.join(process.cwd(), "assets/images/fidget.png"));
  await expect(page.locator("#aboutImagePreview img")).toBeVisible();
  await page.getByRole("button", { name: /Ayarları kaydet/i }).click();
  await expect(page.locator(".toast")).toContainText("Ayarlar kaydedildi.");

  await page.goto("http://localhost:8080/pages/about.html");
  await expect(page.locator("#aboutImageFrame")).not.toHaveClass(/is-hidden/);
  await expect(page.locator("#aboutImage")).toBeVisible();
});
