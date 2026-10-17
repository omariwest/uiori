export function initReveal() {
  const items = document.querySelectorAll(".reveal");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!items.length || reducedMotion.matches || !("IntersectionObserver" in window)) return;

  document.documentElement.classList.add("reveal-enabled");
  const observer = new IntersectionObserver((entries, activeObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      activeObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });

  items.forEach((item) => observer.observe(item));
}
