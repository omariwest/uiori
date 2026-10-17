export function initFaq() {
  document.querySelectorAll(".faq-question").forEach((button) => {
    const panelId = button.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : null;

    if (!panel) return;

    button.addEventListener("click", () => {
      const isOpen = button.getAttribute("aria-expanded") === "true";

      button.setAttribute("aria-expanded", String(!isOpen));
      panel.classList.toggle("is-open", !isOpen);
      panel.setAttribute("aria-hidden", String(isOpen));
      panel.inert = isOpen;
    });
  });
}
