export function initAppNavigation() {
  const toggle = document.querySelector(".app-menu-toggle");
  const drawer = document.querySelector("#app-navigation-drawer");

  if (!toggle || !drawer || typeof drawer.show !== "function") return;

  const desktopQuery = window.matchMedia("(min-width: 1025px)");
  let closeTimer;

  function syncExpanded() {
    const open = drawer.open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      open ? "Close navigation" : toggle.classList.contains("admin-menu-toggle")
        ? "Open admin navigation"
        : "Open account navigation",
    );
    toggle.classList.toggle("is-open", open);
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
    drawer.show();
    document.body.classList.add("app-drawer-open");
    syncExpanded();
    window.requestAnimationFrame(() => drawer.classList.add("is-visible"));
  }

  toggle.addEventListener("click", () => {
    if (drawer.open) closeDrawer();
    else openDrawer();
  });

  drawer.addEventListener("click", (event) => {
    if (event.target === drawer) closeDrawer();
  });

  drawer.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (!link.classList.contains("is-account-locked")) closeDrawer();
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.open) closeDrawer();
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
