const GA4_MEASUREMENT_ID = "G-GLGJXPV0LS";

window.dataLayer = window.dataLayer || [];
window.gtag = function gtag() {
  window.dataLayer.push(arguments);
};

window.gtag("js", new Date());
window.gtag("config", GA4_MEASUREMENT_ID);

const loader = document.createElement("script");
loader.async = true;
loader.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
document.head.appendChild(loader);
