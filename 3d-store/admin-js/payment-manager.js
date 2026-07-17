(function () {
  const providers = [
    {
      id: "iyzico",
      name: "İyzico",
      status: "Hazır",
      note: "Taksit, kart saklama ve callback alanları hazır."
    },
    {
      id: "paytr",
      name: "PayTR",
      status: "Hazır",
      note: "Merchant ID, API anahtarı ve gizli anahtar alanları hazır."
    },
    {
      id: "shopier",
      name: "Shopier",
      status: "Harici",
      note: "Link veya yönlendirme bazlı ödeme akışı için ayrıldı."
    },
    {
      id: "manual",
      name: "Manuel ödeme",
      status: "MVP",
      note: "Havale/EFT ve kapıda ödeme sipariş akışında kullanılabilir."
    }
  ];

  const defaultSettings = () => Store.getDefaultPaymentSettings();

  const fillForm = (form, settings) => {
    form.elements.activeProvider.value = settings.activeProvider || "iyzico";
    form.elements.mode.value = settings.mode || "test";
    form.elements.paymentEnabled.checked = settings.enabled !== false;
    form.elements.creditCard.checked = Boolean(settings.methods?.creditCard);
    form.elements.bankTransfer.checked = Boolean(settings.methods?.bankTransfer);
    form.elements.cashOnDelivery.checked = Boolean(settings.methods?.cashOnDelivery);
    form.elements.installmentsEnabled.checked = Boolean(settings.installments?.enabled);
    form.elements.cardStorageEnabled.checked = Boolean(settings.cardStorage?.enabled);
    form.elements.maxInstallmentCount.value = settings.installments?.maxCount ?? 6;
    form.elements.minInstallmentAmount.value = settings.installments?.minAmount ?? 500;
    form.elements.merchantId.value = settings.credentials?.merchantId || "";
    form.elements.apiKey.value = settings.credentials?.apiKey || "";
    form.elements.secretKey.value = settings.credentials?.secretKey || "";
    form.elements.callbackUrl.value = settings.callbackUrl || "";
    form.elements.bankName.value = settings.bankTransfer?.bankName || "";
    form.elements.accountHolder.value = settings.bankTransfer?.accountHolder || "";
    form.elements.iban.value = settings.bankTransfer?.iban || "";
  };

  const readForm = (form) => ({
    enabled: form.elements.paymentEnabled.checked,
    activeProvider: form.elements.activeProvider.value,
    mode: form.elements.mode.value,
    methods: {
      creditCard: form.elements.creditCard.checked,
      bankTransfer: form.elements.bankTransfer.checked,
      cashOnDelivery: form.elements.cashOnDelivery.checked
    },
    credentials: {
      merchantId: form.elements.merchantId.value.trim(),
      apiKey: form.elements.apiKey.value.trim(),
      secretKey: form.elements.secretKey.value.trim()
    },
    callbackUrl: form.elements.callbackUrl.value.trim(),
    installments: {
      enabled: form.elements.installmentsEnabled.checked,
      maxCount: Number(form.elements.maxInstallmentCount.value) || 1,
      minAmount: Number(form.elements.minInstallmentAmount.value) || 0
    },
    cardStorage: {
      enabled: form.elements.cardStorageEnabled.checked
    },
    bankTransfer: {
      bankName: form.elements.bankName.value.trim(),
      accountHolder: form.elements.accountHolder.value.trim(),
      iban: form.elements.iban.value.trim()
    }
  });

  const renderProviderCards = () => {
    const container = document.querySelector("#paymentProviderCards");
    if (!container) return;
    const settings = Store.getPaymentSettings();
    container.innerHTML = providers
      .map((provider) => {
        const isActive = provider.id === settings.activeProvider;
        return `
          <article class="admin-card stack-sm">
            <span class="badge">${isActive ? "Seçili" : provider.status}</span>
            <h3>${provider.name}</h3>
            <p class="muted">${provider.note}</p>
            <strong>${settings.mode === "live" && isActive ? "Canlı mod" : isActive ? "Test modu" : "Pasif"}</strong>
          </article>
        `;
      })
      .join("");
  };

  const bindPaymentSettings = () => {
    const form = document.querySelector("#paymentSettingsForm");
    if (!form) return;

    fillForm(form, Store.getPaymentSettings());
    renderProviderCards();

    form.addEventListener("change", renderProviderCards);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      Store.savePaymentSettings(readForm(form));
      renderProviderCards();
      Utils.showToast("Ödeme ayarları kaydedildi.");
    });

    document.querySelector("#resetPaymentSettings")?.addEventListener("click", () => {
      Store.savePaymentSettings(defaultSettings());
      fillForm(form, Store.getPaymentSettings());
      renderProviderCards();
      Utils.showToast("Ödeme ayarları varsayılanlara döndü.");
    });
  };

  window.PaymentManager = {
    bindPaymentSettings,
    renderProviderCards
  };
})();
