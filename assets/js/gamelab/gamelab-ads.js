const isMobileBanner = window.matchMedia("(max-width: 900px)").matches;

const bannerUnit = isMobileBanner
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
