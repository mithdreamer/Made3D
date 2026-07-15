(function () {
  const applySettingsText = () => {
    const settings = Store.getSettings();
    document.querySelectorAll("[data-setting]").forEach((element) => {
      const key = element.dataset.setting;
      if (settings[key]) element.textContent = settings[key];
    });
  };

  const bindContactForm = () => {
    const form = document.querySelector("#contactForm");
    if (!form) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = {
        id: Date.now(),
        name: form.elements["name"].value,
        email: form.elements["email"].value,
        message: form.elements["message"].value,
        createdAt: new Date().toISOString(),
      };
      const MESSAGES_KEY = "three-d-store-messages-v1";
      const messages = JSON.parse(localStorage.getItem(MESSAGES_KEY) || "[]");
      messages.unshift(data);
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
      form.reset();
      Utils.showToast("Mesaj alındı ve admin'de kaydedildi.");
    });
  };

  const renderAboutPage = () => {
    const image = document.querySelector("#aboutImage");
    const frame = document.querySelector("#aboutImageFrame");
    if (!image || !frame) return;
    const aboutImage = Store.getSettings().aboutImage;
    if (!aboutImage) return;
    image.src = aboutImage;
    frame.classList.remove("is-hidden");
  };

  const initPublicPage = () => {
    const page = document.body.dataset.page;
    applySettingsText();
    if (page === "home") Products.renderHome();
    if (page === "products") Products.renderProductsPage();
    if (page === "product-detail") Products.renderDetailPage();
    if (page === "cart") Cart.renderCartPage();
    if (page === "checkout") Cart.renderCheckoutPage();
    if (page === "order-success") Orders.renderOrderSuccess();
    if (page === "about") renderAboutPage();
    bindContactForm();
  };

  document.addEventListener("DOMContentLoaded", () => {
    (Store.ready || Promise.resolve()).then(initPublicPage);
  });
})();
