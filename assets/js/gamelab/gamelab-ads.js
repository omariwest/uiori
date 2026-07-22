const isMobileBanner = window.matchMedia("(max-width: 900px)").matches;

const responsiveBannerUnit = isMobileBanner
  ? {
      key: "babcda142c9660822f41b73bf5b4fff2",
      height: 50,
      width: 320,
    }
  : {
      key: "5b05a16318cc7e567d4c703bee8a5027",
      height: 90,
      width: 728,
    };

const exactSizeUnits = {
  "320x50": {
    key: "babcda142c9660822f41b73bf5b4fff2",
    height: 50,
    width: 320,
  },
  "300x250": {
    key: "ba6e5c7514a83e657bbb373e12563ed4",
    height: 250,
    width: 300,
  },
};

const requestedAdSize = document.currentScript
  ?.getAttribute("data-ad-size")
  ?.trim();
const bannerUnit = Object.prototype.hasOwnProperty.call(
  exactSizeUnits,
  requestedAdSize,
)
  ? exactSizeUnits[requestedAdSize]
  : responsiveBannerUnit;

let shouldLoadAd = true;
if (requestedAdSize === "320x50") {
  const docWidth = document.documentElement.clientWidth;
  const adUnit = document.currentScript?.closest(".quick-quiz-ad__unit");
  const usableWidth = adUnit
    ? Math.min(docWidth, adUnit.clientWidth)
    : docWidth;
  if (usableWidth < 320) {
    shouldLoadAd = false;
  }
}

if (shouldLoadAd) {
  window.atOptions = {
    key: bannerUnit.key,
    format: "iframe",
    height: bannerUnit.height,
    width: bannerUnit.width,
    params: {},
  };

  document.write(
    `<script src="https://www.highperformanceformat.com/${bannerUnit.key}/invoke.js"></script>`,
  );
}
