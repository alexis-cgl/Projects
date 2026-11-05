(() => {
  "use strict";

  // A deliberately small client-side route layer. Projects remains plain HTML;
  // RackFlow lives in its own isolated document so its GSAP/Canvas lifecycle
  // cannot leak into the already-mounted Projects portal.
  const cards = [...document.querySelectorAll(".project-card")];
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const href = new URL("./rackflow.html", location.href).href;
  const HOME_STATE = "projects-world-state";
  let route = null;
  let transitioning = false;
  let pendingOpen = false;
  let originHref = location.href;
  const initialState = history.state;
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  function portal() { return window.ProjectsPortal; }
  function saveState() {
    const state = portal()?.snapshot() || { scrollY: window.scrollY, slide: 0 };
    try { sessionStorage.setItem(HOME_STATE, JSON.stringify(state)); } catch (_) {}
    return state;
  }
  function restoreState(state) { if (state) portal()?.restore(state); }
  function cloneCard(card) {
    const rect = card.getBoundingClientRect();
    const clone = card.cloneNode(true);
    clone.classList.add("world-flight");
    clone.removeAttribute("inert");
    clone.querySelectorAll("a").forEach(a => { a.removeAttribute("href"); a.setAttribute("tabindex", "-1"); });
    Object.assign(clone.style, {
      position: "fixed", top: rect.top + "px", left: rect.left + "px",
      width: rect.width + "px", height: rect.height + "px",
      maxHeight: "none", transform: "none", opacity: "1",
      filter: "none", overflow: "hidden", borderRadius: "27px", margin: "0"
    });
    const shell = clone.querySelector(".card-shell");
    if (shell) { shell.style.transform = "none"; shell.style.transition = "none"; }
    clone.setAttribute("aria-hidden", "true");
    document.body.appendChild(clone);
    return { clone, rect };
  }
  function decoration() {
    const backdrop = document.createElement("div");
    backdrop.className = "world-backdrop";
    const stars = document.createElement("div");
    stars.className = "world-stars";
    for (let i = 0; i < 20; i++) {
      const star = document.createElement("i");
      star.style.left = (7 + (i * 37 % 84)) + "%";
      star.style.top = (12 + (i * 43 % 76)) + "%";
      stars.appendChild(star);
    }
    document.body.append(backdrop, stars);
    return { backdrop, stars };
  }

  // Tilt acts on the inner surface, not the carousel's GSAP-transformed article.
  cards.forEach(card => {
    const shell = card.querySelector(".card-shell");
    if (!shell) return;
    let raf = 0;
    card.addEventListener("pointermove", event => {
      if (!finePointer.matches || motion.matches || route || transitioning) return;
      const rect = card.getBoundingClientRect();
      const px = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const py = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      card.style.setProperty("--mx", (px * 100) + "%");
      card.style.setProperty("--my", (py * 100) + "%");
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        shell.style.transform = "perspective(1200px) rotateX(" + ((.5 - py) * 6).toFixed(2) + "deg) rotateY(" + ((px - .5) * 7).toFixed(2) + "deg) translateZ(8px) scale(1.018)";
      });
    }, { passive: true });
    card.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      shell.style.transition = "transform 380ms cubic-bezier(.2,.8,.2,1)";
      shell.style.transform = "";
      setTimeout(() => { shell.style.transition = ""; }, 390);
    });
  });

  function targetCard() { return portal()?.getCard("rackflow") || document.querySelector(".rackflow-card"); }
  async function ensureCardReady() {
    if (!document.documentElement.classList.contains("enhanced")) return;
    if (targetCard()?.classList.contains("active")) return;
    portal()?.goTo(0);
    await new Promise(resolve => {
      const started = performance.now();
      function check() {
        if (targetCard()?.classList.contains("active") || performance.now() - started > 1700) resolve();
        else requestAnimationFrame(check);
      }
      requestAnimationFrame(check);
    });
  }
  function attachFrameNavigation(frame) {
    let doc;
    try { doc = frame.contentDocument; } catch (_) { return false; }
    if (!doc?.querySelector(".rackflow-page .rack-hero") && !doc?.querySelector(".rack-hero")) return false;
    doc.addEventListener("click", event => {
      const a = event.target.closest("a[href]");
      if (!a || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(a.href, frame.contentWindow.location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname.endsWith("/index.html") || (url.pathname.endsWith("/Projects/") && url.hash === "#catalogue")) {
        event.preventDefault();
        returnHome();
      } else if (url.pathname.endsWith("/rackflow.html") && url.hash) {
        // Hash scrolling inside an iframe shouldn't create extra browser-history entries.
        const destination = doc.querySelector(url.hash);
        if (destination) {
          event.preventDefault();
          destination.scrollIntoView({ behavior: motion.matches ? "instant" : "smooth" });
        }
      }
    }, true);
    doc.addEventListener("keydown", event => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        returnHome();
      }
    });
    return true;
  }

  async function loadRouteLayer() {
    const layer = document.createElement("div");
    layer.className = "world-route";
    layer.setAttribute("aria-label", "Page projet RackFlow");
    const frame = document.createElement("iframe");
    frame.title = "RackFlow — expérience interactive";
    frame.setAttribute("loading", "eager");
    layer.appendChild(frame);
    document.body.appendChild(layer);
    const loaded = new Promise(resolve => {
      const timeout = setTimeout(() => resolve(false), 6000);
      frame.addEventListener("load", () => {
        clearTimeout(timeout);
        resolve(attachFrameNavigation(frame));
      }, { once: true });
      frame.addEventListener("error", () => { clearTimeout(timeout); resolve(false); }, { once: true });
    });
    frame.src = href;
    return { layer, frame, loaded };
  }

  async function openRackFlow({ push = true } = {}) {
    if (transitioning || route || pendingOpen) return;
    pendingOpen = true;
    const state = saveState();
    if (push) originHref = location.href;
    await ensureCardReady();
    const card = targetCard();
    if (!card) { pendingOpen = false; location.assign(href); return; }
    const shell = card.querySelector(".card-shell");
    if (shell) shell.style.transform = "";
    const active = cloneCard(card);
    const { backdrop, stars } = decoration();
    const siblings = cards.filter(item => item !== card);
    const siblingOpacity = siblings.map(el => Number(getComputedStyle(el).opacity));
    const frameInfo = await loadRouteLayer();
    route = { ...frameInfo, ...active, backdrop, stars, siblings, siblingOpacity, state, originHref };
    transitioning = true;
    pendingOpen = false;
    portal()?.suspend(); // Freezes only this Canvas loop, avoiding tween conflicts.
    document.documentElement.classList.add("world-navigating");
    const frameReady = await frameInfo.loaded;
    if (!frameReady) {
      cleanupRoute();
      portal()?.resume();
      try { sessionStorage.setItem("projects-return-pending", "1"); } catch (_) {}
      location.assign(href);
      return;
    }

    function done() {
      active.clone.remove();
      backdrop.remove();
      stars.remove();
      frameInfo.layer.style.opacity = "1";
      frameInfo.layer.style.pointerEvents = "auto";
      document.documentElement.classList.remove("world-navigating");
      document.documentElement.classList.add("world-route-open");
      portal()?.suspend();
      if (push) history.pushState({ projectsRoute: "rackflow", originHref, state }, "", href);
      try { frameInfo.frame.contentWindow.focus(); } catch (_) {}
      transitioning = false;
    }
    if (motion.matches || !window.gsap) {
      frameInfo.layer.style.opacity = "1";
      done();
      return;
    }

    gsap.set(frameInfo.layer, { opacity: 0 });
    gsap.set(backdrop, { opacity: 0 });
    gsap.set(stars.children, { opacity: 0, scale: .3 });
    // One movement curve. The return plays its geometric reverse.
    const tl = gsap.timeline({ onComplete: done });
    const mid = { width: Math.min(innerWidth * .7, 720), height: Math.min(innerHeight * .76, 680) };
    tl.to(backdrop, { opacity: .85, duration: .24 }, 0)
      .to(siblings, { opacity: 0, duration: .24, ease: "power2.out" }, 0)
      .to(active.clone, {
        left: (innerWidth - mid.width) / 2, top: (innerHeight - mid.height) / 2,
        width: mid.width, height: mid.height, duration: .48, ease: "power3.inOut"
      }, .07)
      .to(active.clone, {
        left: 0, top: 0, width: innerWidth, height: innerHeight, borderRadius: 0,
        duration: .67, ease: "power4.inOut"
      }, .48)
      .to(active.clone, { scale: 1.10, filter: "blur(3px)", duration: .28, ease: "power3.in" }, .99)
      .to(frameInfo.layer, { opacity: 1, duration: .18 }, 1.06)
      .to(active.clone, { opacity: 0, duration: .18 }, 1.06)
      .to(backdrop, { opacity: 0, duration: .25 }, 1.06)
      .to(stars.children, { opacity: .95, x: () => (Math.random() - .5) * 160,
        y: () => (Math.random() - .5) * 160, scale: 2, stagger: .014, duration: .25 }, .8)
      .to(stars.children, { opacity: 0, duration: .25 }, 1.08);
  }

  function cleanupRoute() {
    if (!route) return;
    route.layer?.remove();
    route.clone?.remove();
    route.backdrop?.remove();
    route.stars?.remove();
    document.documentElement.classList.remove("world-route-open", "world-navigating");
    route = null;
    transitioning = false;
    pendingOpen = false;
  }

  function closeRackFlow() {
    if (!route || transitioning) return;
    transitioning = true;
    document.documentElement.classList.remove("world-route-open");
    document.documentElement.classList.add("world-navigating");
    const { layer, siblings, siblingOpacity, state } = route;
    restoreState(state);
    siblings.forEach(el => { el.style.opacity = "0"; });
    const card = targetCard();
    if (!card) { cleanupRoute(); portal()?.resume(); return; }
    const destination = cloneCard(card);
    const { backdrop, stars } = decoration();
    // The iframe is left intact and visually contracts from the *current*
    // RackFlow section, so the page itself appears to recede into the card.
    route.clone = destination.clone;
    route.backdrop = backdrop;
    route.stars = stars;
    layer.style.pointerEvents = "none";
    const target = card.getBoundingClientRect();
    const ratioX = target.width / innerWidth, ratioY = target.height / innerHeight;
    if (window.gsap) {
      gsap.set(destination.clone, { opacity: 0 });
      gsap.set(backdrop, { opacity: 0 });
    } else {
      destination.clone.style.opacity = '0';
      backdrop.style.opacity = '0';
    }
    function done() {
      // Restore under the outgoing project layer: no intermediate home frame.
      siblings.forEach(el => { el.style.opacity = ""; });
      portal()?.resume();
      portal()?.restore(state);
      cleanupRoute();
      const focus = card.querySelector('[data-cinematic="rackflow"]');
      focus?.focus({ preventScroll: true });
    }
    if (motion.matches || !window.gsap) { done(); return; }
    gsap.set(layer, { transformOrigin: "top left", x: 0, y: 0, scaleX: 1, scaleY: 1 });
    gsap.timeline({ onComplete: done })
      .to(backdrop, { opacity: .80, duration: .25 }, 0)
      .to(layer, { scale: .95, duration: .18, ease: "power3.out" }, .03)
      .to(layer, { scaleX: ratioX, scaleY: ratioY, x: target.left, y: target.top,
        borderRadius: 27, duration: .91, ease: "power4.inOut" }, .19)
      .to(destination.clone, { opacity: 1, duration: .27 }, .89)
      .to(layer, { opacity: 0, duration: .20 }, .92)
      .to(siblings, { opacity: i => siblingOpacity[i], duration: .32, ease: "power2.out" }, .91)
      .to(backdrop, { opacity: 0, duration: .35 }, 1.02)
      .to(destination.clone, { opacity: 0, duration: .12 }, 1.19);
  }

  function returnHome() {
    if (!route || transitioning) return;
    if (history.state?.projectsRoute === "rackflow") {
      history.back();
    } else closeRackFlow();
  }
  window.addEventListener("popstate", event => {
    if (event.state?.projectsRoute === "rackflow") {
      if (!route && !transitioning) openRackFlow({ push: false });
    } else if (route) closeRackFlow();
  });

  document.addEventListener("click", event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== new URL(href).pathname) return;
    event.preventDefault();
    openRackFlow();
  });

  // BFCache navigation is rare in this SPA path, but never leave canvas paused.
  window.addEventListener("pageshow", event => {
    if (event.persisted && !route) portal()?.resume();
  });
  // Do not block browser back/forward when no project is open.
  if (initialState?.projectsRoute === "rackflow" && location.pathname.endsWith("/rackflow.html")) {
    openRackFlow({ push: false });
  }
})();
