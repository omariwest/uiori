export function initTodayPage() {
  document.querySelectorAll('[data-today-country-jump]').forEach((select) => {
    select.addEventListener('change', () => {
      if (select.value) window.location.href = select.value;
    });
  });
}
