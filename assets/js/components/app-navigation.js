export function initAppNavigation() {
  const toggle = document.querySelector(".app-menu-toggle");
  const drawer = document.querySelector("#app-navigation-drawer");
  const closeButton = drawer?.querySelector(".app-drawer-close") || null;

  if (!toggle || !drawer || typeof drawer.showModal !== "function") return;

  const desktopQuery = window.matchMedia("(min-width: 1025px)");
  let closeTimer;

  function syncExpanded() {
    toggle.setAttribute("aria-expanded", String(drawer.open));
  }

  function finishClose() {
    window.clearTimeout(closeTimer);
    if (drawer.open) drawer.close();
    drawer.classList.remove("is-visible");
    document.body.classList.remove("app-drawer-open");
    syncExpanded();
  }

  function closeDrawer() {
    if (!drawer.open) return;
    drawer.classList.remove("is-visible");
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 180;
    closeTimer = window.setTimeout(finishClose, duration);
  }

  function openDrawer() {
    if (drawer.open || desktopQuery.matches) return;
    window.clearTimeout(closeTimer);
    drawer.showModal();
    document.body.classList.add("app-drawer-open");
    syncExpanded();
    window.requestAnimationFrame(() => drawer.classList.add("is-visible"));
    const focusTarget = closeButton || drawer.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
    if (focusTarget) focusTarget.focus({ preventScroll: true });
  }

  toggle.addEventListener("click", openDrawer);
  if (closeButton) closeButton.addEventListener("click", closeDrawer);

  drawer.addEventListener("click", (event) => {
    if (event.target === drawer) closeDrawer();
  });

  drawer.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDrawer();
  });

  drawer.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeDrawer);
  });

  drawer.addEventListener("close", () => {
    drawer.classList.remove("is-visible");
    document.body.classList.remove("app-drawer-open");
    syncExpanded();
  });

  desktopQuery.addEventListener("change", (event) => {
    if (event.matches) finishClose();
  });

  syncExpanded();
}

initAppNavigation();
