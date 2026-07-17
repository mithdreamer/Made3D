(function () {
  const getSettings = () => Store.getShippingSettings();

  const getActiveCarriers = () => getSettings().carriers.filter((carrier) => carrier.active !== false);

  const getCarrierById = (carrierId) =>
    getSettings().carriers.find((carrier) => carrier.id === carrierId || carrier.name === carrierId);

  const getCarrierName = (carrierId) => getCarrierById(carrierId)?.name || carrierId || "";

  const buildTrackingUrl = (carrierId, trackingNumber, fallbackUrl = "") => {
    const carrier = getCarrierById(carrierId);
    const template = fallbackUrl || carrier?.trackingUrl || "";
    if (!template || !trackingNumber) return "";
    return template.replace("{trackingNumber}", encodeURIComponent(trackingNumber));
  };

  window.Shipping = {
    getSettings,
    getActiveCarriers,
    getCarrierById,
    getCarrierName,
    buildTrackingUrl
  };
})();
