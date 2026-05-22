export function initSearchLinks() {
  document.querySelectorAll('[data-country-jump]').forEach((select) => {
    select.addEventListener('change', () => {
      if (select.value) window.location.href = `/countries/${select.value}/`;
    });
  });
}
