(function () {
  const MESSAGES_KEY = "three-d-store-messages-v1";

  const renderMessages = () => {
    const tbody = document.getElementById("messagesTableBody");
    if (!tbody) return;
    const messages = JSON.parse(localStorage.getItem(MESSAGES_KEY) || "[]");
    if (!messages.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="muted">Mesaj bulunamadı.</td></tr>';
      return;
    }
    tbody.innerHTML = messages
      .map(
        (msg) => `
      <tr>
        <td>${new Date(msg.createdAt).toLocaleString()}</td>
        <td>${Utils.escapeHTML(msg.name)}</td>
        <td>${Utils.escapeHTML(msg.email)}</td>
        <td>${Utils.escapeHTML(msg.message)}</td>
        <td><button class="btn btn-outline" data-delete="${msg.id}">Sil</button></td>
      </tr>
    `
      )
      .join("");

    tbody.querySelectorAll("button[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-delete"));
        const filtered = messages.filter((m) => m.id !== id);
        localStorage.setItem(MESSAGES_KEY, JSON.stringify(filtered));
        Utils.showToast("Mesaj silindi");
        renderMessages();
      });
    });
  };

  document.addEventListener("DOMContentLoaded", renderMessages);
  window.MessagesManager = { renderMessages };
})();
