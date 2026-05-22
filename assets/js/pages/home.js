export function initHomePage() {
  const select = document.querySelector('[data-country-jump]');
  if (!select) return;
  select.addEventListener('change', () => {
    if (select.value) window.location.href = `/countries/${select.value}/`;
  });
}
