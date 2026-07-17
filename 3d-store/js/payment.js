(function () {
  const methodLabels = {
    creditCard: "Kredi kartı simülasyonu",
    bankTransfer: "Havale/EFT",
    cashOnDelivery: "Kapıda ödeme"
  };

  const providerLabels = {
    iyzico: "İyzico",
    paytr: "PayTR",
    shopier: "Shopier",
    manual: "Manuel ödeme"
  };

  const getSettings = () => Store.getPaymentSettings();

  const getProviderLabel = (providerId = getSettings().activeProvider) =>
    providerLabels[providerId] || "Manuel ödeme";

  const getAvailableMethods = () => {
    const settings = getSettings();
    if (settings.enabled === false) return [methodLabels.cashOnDelivery];
    return Object.entries(settings.methods || {})
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => methodLabels[key])
      .filter(Boolean);
  };

  const populateCheckoutMethods = (select) => {
    if (!select) return;
    const methods = getAvailableMethods();
    select.innerHTML = methods
      .map((method) => `<option value="${Utils.escapeHTML(method)}">${Utils.escapeHTML(method)}</option>`)
      .join("");
  };

  const getInitialPaymentStatus = (method) => {
    const normalized = String(method || "").toLocaleLowerCase("tr-TR");
    if (normalized.includes("kredi kart")) return "paid";
    return "pending";
  };

  window.Payment = {
    getSettings,
    getProviderLabel,
    getAvailableMethods,
    populateCheckoutMethods,
    getInitialPaymentStatus
  };
})();
