const { test, expect } = require("@playwright/test");
const path = require("path");

test("MAde3D storefront and admin demo flow", async ({ page }) => {
  await page.goto("http://localhost:8080/");
  await expect(page).toHaveTitle(/MAde3D/);
  await expect(page.getByRole("heading", { name: /3D baskı/i })).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(4);
  await expect(page.locator(".category-tile")).toHaveCount(5);

  await page.locator("[data-add-to-cart]").first().click();
  await expect(page.locator("[data-cart-count]").first()).toHaveText("1");

  await page.goto("http://localhost:8080/pages/cart.html");
  await expect(page.locator(".cart-item")).toHaveCount(1);
  await page.getByRole("link", { name: /Ödemeye geç/i }).click();

  await page.getByLabel("Ad Soyad").fill("Test Müşteri");
  await page.getByLabel("Telefon").fill("+90 555 000 00 00");
  await page.getByLabel("E-posta").fill("test@example.com");
  await page.getByLabel("Şehir").fill("İstanbul");
  await page.getByLabel("Adres").fill("Test adresi");
  await page.getByLabel("Sipariş notu").fill("Mat turkuaz renk tercih edilir.");
  await page.getByRole("button", { name: /Siparişi oluştur/i }).click();
  await expect(page).toHaveURL(/order-success\.html\?order=/);
  await expect(page.getByText(/MAde-2026-/)).toBeVisible();

  await page.goto("http://localhost:8080/admin/");
  await expect(page).toHaveURL(/admin\/login\.html/);
  await page.getByLabel("Kullanıcı adı").fill("admin");
  await page.getByLabel("Şifre").fill("123456");
  await page.getByRole("button", { name: /Giriş yap/i }).click();
  await expect(page).toHaveURL(/admin\/index\.html/);
  await expect(page.getByText("MAde3D Admin")).toBeVisible();

  await page.goto("http://localhost:8080/admin/products.html");
  await expect(page.locator("#productsTableBody tr")).toHaveCount(8);

  await page.goto("http://localhost:8080/admin/categories.html");
  await expect(page.locator("#categoriesTableBody tr")).toHaveCount(5);

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
