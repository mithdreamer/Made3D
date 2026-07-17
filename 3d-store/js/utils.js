(function () {
  const currency = new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0
  });

  const escapeHTML = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const rootPath = () => {
    const path = window.location.pathname.replace(/\\/g, "/");
    return path.includes("/pages/") || path.includes("/admin/") ? "../" : "";
  };

  const pagePath = (file) => `${rootPath()}pages/${file}`;
  const adminPath = (file) => `${rootPath()}admin/${file}`;

  const productPath = (product) =>
    `${pagePath("product-detail.html")}?slug=${encodeURIComponent(product.slug || product.id)}`;

  const getParam = (name) => new URLSearchParams(window.location.search).get(name);

  const formatDate = (dateValue) =>
    new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(dateValue));

  const status = {
    new: "Yeni",
    preparing: "Hazırlanıyor",
    shipped: "Kargoda",
    completed: "Tamamlandı",
    cancelled: "İptal"
  };

  const statusClass = (value) => `status-${value || "new"}`;
  const statusLabel = (value) => status[value] || "Yeni";

  const getCategoryName = (categoryId) => {
    const category = window.Store?.getCategories({ includeInactive: true }).find((item) => item.id === categoryId);
    return category?.name || "Kategorisiz";
  };

  const imageFallback = () =>
    `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900">
        <rect width="900" height="900" fill="#f0f5f1"/>
        <text x="450" y="450" text-anchor="middle" font-family="Arial" font-size="38" fill="#65717e">Ürün görseli</text>
      </svg>
    `)}`;

  const imageUrl = (src) => {
    if (!src) return imageFallback();
    if (/^(data:|blob:|https?:|\/)/i.test(src)) return src;
    if (src.startsWith("assets/")) return `${rootPath()}${src}`;
    return src;
  };

  const getImage = (product) => imageUrl(product?.images?.[0]);

  const showToast = (message) => {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => toast.remove(), 220);
    }, 2600);
  };

  const downloadJSON = (filename, data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  window.Utils = {
    money: (value) => currency.format(Number(value) || 0),
    escapeHTML,
    rootPath,
    pagePath,
    adminPath,
    productPath,
    getParam,
    formatDate,
    statusLabel,
    statusClass,
    getCategoryName,
    imageUrl,
    getImage,
    showToast,
    downloadJSON
  };
})();
