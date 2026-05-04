(() => {
  const cfg = window.ZINE;
  if (!cfg || !Array.isArray(cfg.pages) || cfg.pages.length === 0) {
    console.error("window.ZINE.pages missing");
    return;
  }
  const pages = cfg.pages;

  // Derive thumb path: "pages/foo.png" -> "pages/thumbs/foo.jpg"
  const thumbFor = (hi) => {
    const slash = hi.lastIndexOf("/");
    const dir = hi.slice(0, slash);
    const file = hi.slice(slash + 1);
    const base = file.replace(/\.(png|jpg|jpeg|webp)$/i, "");
    return `${dir}/thumbs/${base}.jpg`;
  };

  const leftImage = document.getElementById("zine-left");
  const rightImage = document.getElementById("zine-right");
  const pageInfo = document.getElementById("page-info");
  const prevButton = document.getElementById("prev-page");
  const nextButton = document.getElementById("next-page");
  const book = document.getElementById("book");
  const leftPage = document.getElementById("left-page");
  const rightPage = document.getElementById("right-page");

  let spreadIndex = 0;
  let spreads = [];

  // Track which high-res pages have finished loading.
  const hiLoaded = new Set();
  const hiPending = new Map(); // index -> Image()

  const preloadHi = (i) => {
    if (i == null || hiLoaded.has(i) || hiPending.has(i)) return;
    const img = new Image();
    img.onload = () => {
      hiLoaded.add(i);
      hiPending.delete(i);
      // If this page is currently displayed, swap thumb -> hi-res.
      const [l, r] = spreads[spreadIndex] || [];
      if (l === i) leftImage.src = pages[i];
      if (r === i) rightImage.src = pages[i];
    };
    img.onerror = () => hiPending.delete(i);
    img.src = pages[i];
    hiPending.set(i, img);
  };

  const setSrc = (imgEl, idx) => {
    if (idx === null) {
      imgEl.removeAttribute("src");
      return;
    }
    imgEl.src = hiLoaded.has(idx) ? pages[idx] : thumbFor(pages[idx]);
  };

  const isMobile = () => window.matchMedia("(max-width: 767px)").matches;

  const buildSpreads = () => {
    spreads = [];
    if (isMobile() || pages.length === 1) {
      pages.forEach((_, i) => spreads.push([null, i]));
      return;
    }
    spreads.push([null, 0]);
    for (let i = 1; i <= pages.length - 2; i += 2) {
      spreads.push([i, i + 1]);
    }
    if (pages.length % 2 === 0) {
      spreads.push([null, pages.length - 1]);
    }
  };

  const renderSpread = () => {
    const [left, right] = spreads[spreadIndex] || [null, null];
    setSrc(leftImage, left);
    setSrc(rightImage, right);

    const isSingle = left === null && right !== null;
    if (isSingle) {
      book.classList.add("single-page");
      if (right === 0) pageInfo.textContent = "Cover";
      else if (right === pages.length - 1) pageInfo.textContent = "Back Cover";
      else pageInfo.textContent = `Page ${right + 1} of ${pages.length}`;
    } else {
      book.classList.remove("single-page");
      pageInfo.textContent = `Pages ${left + 1}–${right + 1} of ${pages.length}`;
    }

    prevButton.disabled = spreadIndex <= 0;
    nextButton.disabled = spreadIndex >= spreads.length - 1;

    // Prioritize: this spread + prev + next high-res.
    [-1, 0, 1].forEach((d) => {
      const sp = spreads[spreadIndex + d];
      if (!sp) return;
      preloadHi(sp[0]);
      preloadHi(sp[1]);
    });
  };

  const goPrev = () => {
    if (spreadIndex <= 0) return;
    spreadIndex--;
    renderSpread();
  };
  const goNext = () => {
    if (spreadIndex >= spreads.length - 1) return;
    spreadIndex++;
    renderSpread();
  };

  buildSpreads();
  renderSpread();

  prevButton.addEventListener("click", goPrev);
  nextButton.addEventListener("click", goNext);
  leftPage.addEventListener("click", goPrev);
  rightPage.addEventListener("click", goNext);

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") goPrev();
    else if (e.key === "ArrowRight") goNext();
  });

  window.addEventListener("resize", () => {
    const prevLen = spreads.length;
    buildSpreads();
    if (prevLen !== spreads.length) {
      spreadIndex = Math.min(spreadIndex, spreads.length - 1);
    }
    renderSpread();
  });

  // After the active spread is wired up, lazily preload the rest in
  // background so a fast click-through still hits hi-res by the time
  // the user gets there.
  window.addEventListener("load", () => {
    let i = 0;
    const tick = () => {
      while (i < pages.length && (hiLoaded.has(i) || hiPending.has(i))) i++;
      if (i >= pages.length) return;
      preloadHi(i);
      i++;
      // Throttle so first paint stays snappy.
      setTimeout(tick, 250);
    };
    setTimeout(tick, 800);
  });
})();
