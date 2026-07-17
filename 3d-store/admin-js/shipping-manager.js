(function () {
  const defaultSettings = () => Store.getDefaultShippingSettings();

  const carrierIds = ["yurtici", "aras", "mng", "ptt", "ups", "other"];
  const shippingModes = ["manual", "own-contract", "platform-integration"];

  const normalizeShippingMode = (mode) => {
    if (mode === "integration-ready") return "own-contract";
    return shippingModes.includes(mode) ? mode : "manual";
  };

  const normalizeCarrier = (carrierId) => (carrierIds.includes(carrierId) ? carrierId : "other");

  const fillForm = (form, settings) => {
    form.elements.defaultCarrier.value = normalizeCarrier(settings.defaultCarrier);
    form.elements.shippingMode.value = normalizeShippingMode(settings.mode);
    form.elements.trackingRequired.checked = Boolean(settings.trackingRequired);
    form.elements.customerTrackingVisible.checked = settings.customerTrackingVisible !== false;
    form.elements.shippingFee.value = Store.getSettings().shippingFee ?? 0;
    form.elements.freeShippingThreshold.value = Store.getSettings().freeShippingThreshold ?? 0;
    form.elements.defaultDesi.value = settings.defaultDesi ?? 1;
    form.elements.labelFormat.value = settings.labelFormat || "a4";
    form.elements.apiUsername.value = settings.credentials?.apiUsername || "";
    form.elements.apiPasswordToken.value = settings.credentials?.apiPasswordToken || "";
    form.elements.customerCode.value = settings.credentials?.customerCode || "";
    form.elements.branchCode.value = settings.credentials?.branchCode || "";
    form.elements.senderName.value = settings.sender?.name || "";
    form.elements.senderPhone.value = settings.sender?.phone || "";
    form.elements.senderAddress.value = settings.sender?.address || "";
  };

  const renderCarrierRows = () => {
    const body = document.querySelector("#cargoCompaniesTable");
    if (!body) return;
    const settings = Store.getShippingSettings();
    body.innerHTML = settings.carriers
      .map(
        (carrier) => `
          <tr data-carrier-row="${carrier.id}">
            <td>
              <input type="checkbox" data-carrier-active="${carrier.id}" ${carrier.active ? "checked" : ""} aria-label="${carrier.name} aktif">
            </td>
            <td>
              <strong>${Utils.escapeHTML(carrier.name)}</strong>
              ${settings.defaultCarrier === carrier.id ? `<div class="muted">Varsayılan</div>` : ""}
            </td>
            <td><span class="badge">${carrier.integrationReady ? "Entegrasyon hazır" : "Manuel"}</span></td>
            <td>
              <div class="field">
                <label class="sr-only" for="tracking-${carrier.id}">${carrier.name} takip adresi</label>
                <input id="tracking-${carrier.id}" value="${Utils.escapeHTML(carrier.trackingUrl || "")}" data-carrier-tracking="${carrier.id}">
              </div>
            </td>
          </tr>
        `
      )
      .join("");
  };

  const readCarriers = () => {
    const settings = Store.getShippingSettings();
    return settings.carriers.map((carrier) => {
      const active = document.querySelector(`[data-carrier-active="${carrier.id}"]`)?.checked;
      const trackingUrl = document.querySelector(`[data-carrier-tracking="${carrier.id}"]`)?.value.trim();
      return {
        ...carrier,
        active: Boolean(active),
        trackingUrl: trackingUrl || ""
      };
    });
  };

  const readForm = (form) => {
    const defaultCarrier = normalizeCarrier(form.elements.defaultCarrier.value);
    return {
      defaultCarrier,
      mode: normalizeShippingMode(form.elements.shippingMode.value),
      trackingRequired: form.elements.trackingRequired.checked,
      customerTrackingVisible: form.elements.customerTrackingVisible.checked,
      labelFormat: form.elements.labelFormat.value,
      defaultDesi: Number(form.elements.defaultDesi.value) || 0,
      credentials: {
        apiUsername: form.elements.apiUsername.value.trim(),
        apiPasswordToken: form.elements.apiPasswordToken.value.trim(),
        customerCode: form.elements.customerCode.value.trim(),
        branchCode: form.elements.branchCode.value.trim()
      },
      sender: {
        name: form.elements.senderName.value.trim(),
        phone: form.elements.senderPhone.value.trim(),
        address: form.elements.senderAddress.value.trim()
      },
      carriers: readCarriers().map((carrier) =>
        carrier.id === defaultCarrier ? { ...carrier, active: true } : carrier
      )
    };
  };

  const bindShippingSettings = () => {
    const form = document.querySelector("#shippingSettingsForm");
    if (!form) return;

    fillForm(form, Store.getShippingSettings());
    renderCarrierRows();

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      Store.saveSettings({
        shippingFee: Number(form.elements.shippingFee.value) || 0,
        freeShippingThreshold: Number(form.elements.freeShippingThreshold.value) || 0
      });
      Store.saveShippingSettings(readForm(form));
      fillForm(form, Store.getShippingSettings());
      renderCarrierRows();
      Utils.showToast("Kargo ayarları kaydedildi.");
    });

    document.querySelector("#resetShippingSettings")?.addEventListener("click", () => {
      Store.saveShippingSettings(defaultSettings());
      fillForm(form, Store.getShippingSettings());
      renderCarrierRows();
      Utils.showToast("Kargo ayarları varsayılanlara döndü.");
    });
  };

  window.ShippingManager = {
    bindShippingSettings,
    renderCarrierRows
  };
})();
