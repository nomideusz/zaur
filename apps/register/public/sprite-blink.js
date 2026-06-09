/**
 * Occasional blink for static Zaur sprite images on register pages.
 * Mirrors webmail ZaurSprite timing; respects prefers-reduced-motion.
 */
(function () {
  const BLINK_MS = 180;
  const HAPPY_SRC = '/zaur-sprite-happy.svg';
  const BLINK_SRC = '/zaur-sprite-blink.svg';

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async function blinkImage(img) {
    const happy = img.dataset.zaurHappySrc || img.getAttribute('src') || HAPPY_SRC;
    const blink = img.dataset.zaurBlinkSrc || BLINK_SRC;
    img.dataset.zaurHappySrc = happy;
    img.dataset.zaurBlinkSrc = blink;

    img.setAttribute('src', blink);
    await wait(BLINK_MS);
    img.setAttribute('src', happy);
  }

  function startBlinkLoop(img) {
    let alive = true;

    void (async () => {
      await wait(2000 + Math.random() * 3000);
      while (alive) {
        await blinkImage(img);
        if (Math.random() < 0.3) {
          await wait(120);
          await blinkImage(img);
        }
        await wait(2500 + Math.random() * 4500);
      }
    })();

    return () => {
      alive = false;
    };
  }

  function init() {
    if (prefersReducedMotion()) return;

    const cleanups = [];
    document.querySelectorAll('.z-auth-sprite img').forEach((img) => {
      if (!(img instanceof HTMLImageElement)) return;
      cleanups.push(startBlinkLoop(img));
    });

    return () => cleanups.forEach((stop) => stop());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
