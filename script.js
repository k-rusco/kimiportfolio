const carousel = document.getElementById("project-carousel");
const leftButton = document.getElementById("scroll-left");
const rightButton = document.getElementById("scroll-right");
const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

if (carousel && leftButton && rightButton) {
  leftButton.addEventListener("click", () => {
    carousel.scrollBy({ left: -280, behavior: "smooth" });
  });

  rightButton.addEventListener("click", () => {
    carousel.scrollBy({ left: 280, behavior: "smooth" });
  });
}

/** Centers the AUDIOVISUAL tile (third card) in the track on first load. */
function scrollCarouselItemIntoViewportCenter(track, item) {
  const trackRect = track.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  const delta =
    itemRect.left -
    trackRect.left -
    trackRect.width / 2 +
    itemRect.width / 2;
  track.scrollLeft += delta;
}

function centerCarouselInitialFeatured(track) {
  const items = track.querySelectorAll(".carousel-preview");
  const audiovisualCard = items[2];
  if (!audiovisualCard) return;

  const run = () => scrollCarouselItemIntoViewportCenter(track, audiovisualCard);

  const schedule =
    typeof requestAnimationFrame === "function"
      ? () => requestAnimationFrame(() => requestAnimationFrame(run))
      : () => run();

  if (document.readyState === "complete") {
    schedule();
  } else {
    window.addEventListener("load", schedule, { once: true });
  }
}

if (carousel) {
  centerCarouselInitialFeatured(carousel);
}

// Filters and the gallery lightbox are initialized by projects-data.js AFTER
// the project cards / detail content have been fetched and rendered, since
// those elements don't exist at initial page load anymore.
function initProjectFilters() {
  const filterButtons = document.querySelectorAll(".filter-btn");
  const filterItems = document.querySelectorAll(".filter-item");

  if (filterButtons.length === 0) return;

  function applyFilter(selectedCategory) {
    filterButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === selectedCategory);
    });

    filterItems.forEach((item) => {
      const itemCategories = item.dataset.category || "";
      // No selected category means "show everything".
      const shouldShow =
        !selectedCategory ||
        selectedCategory === "all" ||
        itemCategories.includes(selectedCategory);

      item.style.display = shouldShow ? "block" : "none";
    });
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const isActive = button.classList.contains("active");
      applyFilter(isActive ? null : button.dataset.filter);
    });
  });

  const filterParams = new URLSearchParams(window.location.search);
  const initialFilter = filterParams.get("filter");
  applyFilter(initialFilter);
}

function initProjectBackLink() {
  const backLink = document.querySelector(".project-back-link");
  if (!backLink) return;

  const ref = document.referrer;
  if (ref && ref.includes("portfolio.html")) {
    try {
      const refUrl = new URL(ref);
      const filterParam = refUrl.searchParams.get("filter");
      backLink.href = filterParam
        ? `portfolio.html?filter=${filterParam}`
        : "portfolio.html";
    } catch (_) {
      backLink.href = "portfolio.html";
    }
  }
}

function initGalleryLightbox() {
  const galleryOverlay = document.querySelector(".project-gallery-overlay");
  if (!galleryOverlay) return;
  const galleryImg = galleryOverlay.querySelector(".gallery-current-img");
  let galleryVideo = galleryOverlay.querySelector(".gallery-current-video");
  if (!galleryVideo) {
    galleryVideo = document.createElement("video");
    galleryVideo.className = "gallery-current-video";
    galleryVideo.controls = true;
    galleryVideo.playsInline = true;
    galleryVideo.hidden = true;
    galleryOverlay.appendChild(galleryVideo);
  }

  let galleryIframe = galleryOverlay.querySelector(".gallery-current-iframe");
  if (!galleryIframe) {
    galleryIframe = document.createElement("iframe");
    galleryIframe.className = "gallery-current-iframe";
    galleryIframe.title = "YouTube video player";
    galleryIframe.setAttribute("frameborder", "0");
    galleryIframe.setAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    );
    galleryIframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    galleryIframe.setAttribute("allowfullscreen", "");
    galleryIframe.hidden = true;
    galleryOverlay.appendChild(galleryIframe);
  }

  document.querySelectorAll(".project-gallery-video-thumb").forEach((video) => {
    video.addEventListener("loadedmetadata", () => {
      video.currentTime = 0.001;
    });
  });

  const galleryItems = Array.from(
    document.querySelectorAll(".project-gallery-trigger")
  );
  let currentIdx = 0;

  function isVideoTrigger(el) {
    return el.tagName === "VIDEO" || el.hasAttribute("data-gallery-video");
  }

  function isYoutubeTrigger(el) {
    return el.hasAttribute("data-gallery-youtube");
  }

  function getTriggerSrc(el) {
    return el.dataset.galleryVideo || el.currentSrc || el.getAttribute("src") || el.src;
  }

  function pauseGalleryVideo() {
    galleryVideo.pause();
    galleryVideo.removeAttribute("src");
    galleryVideo.load();
    galleryVideo.hidden = true;
  }

  function pauseGalleryYoutube() {
    galleryIframe.removeAttribute("src");
    galleryIframe.hidden = true;
  }

  function pauseGalleryMedia() {
    pauseGalleryVideo();
    pauseGalleryYoutube();
  }

  function showGalleryItem(idx) {
    const item = galleryItems[idx];

    if (isYoutubeTrigger(item)) {
      pauseGalleryVideo();
      galleryImg.hidden = true;
      galleryIframe.hidden = false;
      galleryIframe.src = item.dataset.galleryYoutube;
      return;
    }

    const src = getTriggerSrc(item);

    if (isVideoTrigger(item)) {
      pauseGalleryYoutube();
      galleryImg.hidden = true;
      galleryVideo.hidden = false;
      galleryVideo.src = src;
      galleryVideo.play().catch(() => {});
      return;
    }

    pauseGalleryMedia();
    galleryImg.hidden = false;
    galleryImg.src = src;
  }

  function openGallery(idx) {
    currentIdx = idx;
    showGalleryItem(idx);
    galleryOverlay.classList.add("is-open");
  }

  function closeGallery() {
    galleryOverlay.classList.remove("is-open");
    pauseGalleryMedia();
  }

  function showPrev() {
    currentIdx = (currentIdx - 1 + galleryItems.length) % galleryItems.length;
    showGalleryItem(currentIdx);
  }

  function showNext() {
    currentIdx = (currentIdx + 1) % galleryItems.length;
    showGalleryItem(currentIdx);
  }

  galleryItems.forEach((item, i) => {
    item.addEventListener("click", () => openGallery(i));
  });

  galleryOverlay.querySelector(".gallery-close").addEventListener("click", closeGallery);
  galleryOverlay.querySelector(".gallery-arrow-left").addEventListener("click", showPrev);
  galleryOverlay.querySelector(".gallery-arrow-right").addEventListener("click", showNext);

  galleryOverlay.addEventListener("click", (e) => {
    if (e.target === galleryOverlay) closeGallery();
  });

  document.addEventListener("keydown", (e) => {
    if (!galleryOverlay.classList.contains("is-open")) return;
    if (e.key === "Escape") closeGallery();
    if (e.key === "ArrowLeft") showPrev();
    if (e.key === "ArrowRight") showNext();
  });
}

if (window.matchMedia("(pointer: fine) and (min-width: 981px)").matches) {
  const spotlight = document.createElement("div");
  spotlight.className = "cursor-spotlight";
  spotlight.setAttribute("aria-hidden", "true");
  document.body.appendChild(spotlight);

  const interactiveSelector =
    'a, button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]';

  window.addEventListener(
    "mousemove",
    (e) => {
      spotlight.style.left = `${e.clientX}px`;
      spotlight.style.top = `${e.clientY}px`;

      const hoveredElement = document.elementFromPoint(e.clientX, e.clientY);
      const isOverImage = hoveredElement?.closest("img");
      const isOverSvg =
        isOverImage && isOverImage.src && isOverImage.src.endsWith(".svg");
      const isOverInteractive = hoveredElement?.closest(interactiveSelector);

      spotlight.classList.toggle("is-over-svg", !!isOverSvg);
      spotlight.classList.toggle("is-over-image", !!isOverImage && !isOverSvg);
      spotlight.classList.toggle(
        "is-over-interactive",
        !isOverImage && !!isOverInteractive
      );
    },
    { passive: true }
  );
}

