import { initNavigation } from "../components/navigation.js";
import { initFaq } from "../components/faq.js";

initNavigation();
initFaq();

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

document.querySelectorAll("[data-home-workflow]").forEach((block) => {
  const tabs = Array.from(block.querySelectorAll("[data-home-workflow-step]"));
  const panels = Array.from(block.querySelectorAll("[data-home-workflow-panel]"));
  let activeIndex = 0;

  function activateStep(step, shouldScrollTab = false) {
    const nextIndex = tabs.findIndex(
      (tab) => tab.dataset.homeWorkflowStep === step,
    );
    activeIndex = nextIndex >= 0 ? nextIndex : 0;

    tabs.forEach((tab, index) => {
      const isActive = index === activeIndex;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.homeWorkflowPanel === step;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });

    if (shouldScrollTab) {
      tabs[activeIndex]?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      activateStep(tab.dataset.homeWorkflowStep, true);
    });

    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + direction + tabs.length) % tabs.length;
      tabs[nextIndex].focus();
      activateStep(tabs[nextIndex].dataset.homeWorkflowStep, true);
    });
  });

  activateStep(tabs[0]?.dataset.homeWorkflowStep || "1");
});
