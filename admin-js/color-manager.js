(function () {
  let colors = [];
  let activeFilter = "all";

  const getFilteredColors = () => {
    if (activeFilter === "active") return colors.filter((color) => color.is_active !== false);
    if (activeFilter === "inactive") return colors.filter((color) => color.is_active === false);
    return colors;
  };

  const updateSummary = () => {
    const activeCount = colors.filter((color) => color.is_active !== false).length;
    const inactiveCount = colors.length - activeCount;
    const summary = document.querySelector("#colorsSummary");
    if (summary) {
      summary.textContent = `${colors.length} renk · ${activeCount} satışa açık · ${inactiveCount} satışa kapalı`;
    }
  };

  const render = () => {
    const body = document.querySelector("#colorsTableBody");
    if (!body) return;
    const filteredColors = getFilteredColors();

    body.innerHTML = filteredColors.length
      ? filteredColors.map((color) => {
          const name = color.name_tr || color.name_en || color.code;
          const isActive = color.is_active !== false;
          return `
            <tr>
              <td>
                <span class="color-management-swatch" style="background-color: ${Utils.escapeHTML(color.hex_code || "#ffffff")}" aria-hidden="true"></span>
              </td>
              <td><strong>${Utils.escapeHTML(name)}</strong></td>
              <td>${Utils.escapeHTML(color.name_en || "-")}</td>
              <td><code>${Utils.escapeHTML(color.code)}</code></td>
              <td><code>${Utils.escapeHTML(color.hex_code || "-")}</code></td>
              <td><span class="badge ${isActive ? "color-status-active" : "color-status-inactive"}">${isActive ? "Satışa açık" : "Satışa kapalı"}</span></td>
              <td>
                <button
                  class="btn ${isActive ? "btn-outline" : "btn-primary"} color-status-button"
                  type="button"
                  data-color-code="${Utils.escapeHTML(color.code)}"
                  data-next-active="${isActive ? "false" : "true"}"
                >${isActive ? "Satışa kapat" : "Satışa aç"}</button>
              </td>
            </tr>
          `;
        }).join("")
      : `<tr><td colspan="7"><div class="empty-state"><h2>Bu filtrede renk yok</h2></div></td></tr>`;

    updateSummary();
  };

  const bindEvents = () => {
    document.querySelector("#colorStatusFilter")?.addEventListener("change", (event) => {
      activeFilter = event.target.value;
      render();
    });

    document.querySelector("#colorsTableBody")?.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-color-code]");
      if (!button) return;

      const colorCode = button.dataset.colorCode;
      const nextActive = button.dataset.nextActive === "true";
      const color = colors.find((item) => item.code === colorCode);
      const name = color?.name_tr || color?.name_en || colorCode;

      button.disabled = true;
      button.textContent = "Kaydediliyor...";

      try {
        const updated = await Store.updateColorActiveStatus(colorCode, nextActive);
        colors = colors.map((item) => item.code === colorCode ? { ...item, ...updated } : item);
        render();
        Utils.showToast(`${name} ${nextActive ? "satışa açıldı" : "satışa kapatıldı"}.`);
      } catch (error) {
        console.error("Renk durumu güncellenemedi:", error);
        render();
        Utils.showToast(error.message || "Renk durumu güncellenemedi.");
      }
    });
  };

  const init = async () => {
    const body = document.querySelector("#colorsTableBody");
    if (!body) return;

    try {
      colors = await Store.getAllColors();
      render();
      bindEvents();
    } catch (error) {
      console.error("Renk yönetimi yüklenemedi:", error);
      body.innerHTML = `<tr><td colspan="7"><div class="empty-state"><h2>Renkler yüklenemedi</h2><p class="muted">${Utils.escapeHTML(error.message || "Supabase verisi alınamadı.")}</p></div></td></tr>`;
    }
  };

  window.ColorManager = { init };
})();
