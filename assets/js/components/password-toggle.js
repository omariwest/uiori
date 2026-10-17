document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
  const inputId = toggle.getAttribute("aria-controls");
  const input = inputId ? document.getElementById(inputId) : null;
  const label = toggle.dataset.passwordLabel;

  if (!input || !label) return;

  toggle.addEventListener("click", () => {
    const shouldShow = input.type === "password";

    input.type = shouldShow ? "text" : "password";

    toggle.classList.toggle("is-visible", shouldShow);

    toggle.setAttribute(
      "aria-label",
      `${shouldShow ? "Hide" : "Show"} ${label}`,
    );
  });
});
