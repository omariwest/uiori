export function initNav() {
  const button = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-site-nav]');
  if (!button || !nav) return;

  const closeNav = () => {
    nav.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    button.setAttribute('aria-expanded', 'false');
  };

  const openNav = () => {
    nav.classList.add('is-open');
    document.body.classList.add('nav-open');
    button.setAttribute('aria-expanded', 'true');
  };

  button.addEventListener('click', () => {
    const isOpen = nav.classList.contains('is-open');
    isOpen ? closeNav() : openNav();
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeNav);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeNav();
  });

  document.addEventListener('click', (event) => {
    if (!nav.classList.contains('is-open')) return;
    if (nav.contains(event.target) || button.contains(event.target)) return;
    closeNav();
  });
}
