(() => {
  "use strict";
  const year = document.querySelector("#year");
  if (year) year.textContent = new Date().getFullYear();
  const cards = [...document.querySelectorAll(".project-card")];
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  let inTransition = false;

  cards.forEach(card => {
    const shell = card.querySelector(".card-shell");
    if (!shell) return;
    let raf = 0;
    card.addEventListener("pointermove", event => {
      if (!finePointer.matches || motion.matches || inTransition) return;
      const rect = card.getBoundingClientRect();
      const px = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const py = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      card.style.setProperty("--mx", px * 100 + "%");
      card.style.setProperty("--my", py * 100 + "%");
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        shell.style.transform = "perspective(1200px) rotateX(" + ((0.5 - py) * 6).toFixed(2) + "deg) rotateY(" + ((px - 0.5) * 7).toFixed(2) + "deg) translateZ(8px) scale(1.018)";
      });
    }, { passive: true });
    card.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      shell.style.transition = "transform 380ms cubic-bezier(.2,.8,.2,1)";
      shell.style.transform = "";
      setTimeout(() => { shell.style.transition = ""; }, 390);
    });
  });

  const rackLink = document.querySelector('[data-cinematic="rackflow"]');
  if (!rackLink) return;
  rackLink.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || inTransition) return;
    if (motion.matches || !window.gsap || document.visibilityState === "hidden") return;
    event.preventDefault();
    inTransition = true;
    const card = rackLink.closest(".project-card");
    const rect = card.getBoundingClientRect();
    const overlay = document.createElement("div");
    overlay.className = "portal-overlay";
    const vignette = document.createElement("div");
    vignette.className = "portal-vignette";
    const field = document.createElement("div");
    field.className = "portal-particles";
    document.body.append(overlay, field, vignette);
    document.documentElement.classList.add("launching");
    const clone = card.cloneNode(true);
    clone.classList.add("portal-launch");
    clone.removeAttribute("inert");
    Object.assign(clone.style, {
      position: "fixed", top: rect.top + "px", left: rect.left + "px",
      width: rect.width + "px", height: rect.height + "px", margin: 0, opacity: 1,
      transform: "none", filter: "none", maxHeight: "none", overflow: "hidden"
    });
    clone.querySelectorAll("a").forEach(link => link.removeAttribute("href"));
    document.body.appendChild(clone);
    const siblings = cards.filter(other => other !== card);
    // Only animate the detached clone so the pinned GSAP carousel remains undisturbed.
    for (let i = 0; i < 24; i++) {
      const dot = document.createElement("i");
      dot.style.left = (10 + (i * 43 % 80)) + "%";
      dot.style.top = (10 + (i * 29 % 80)) + "%";
      field.appendChild(dot);
    }
    const tl = gsap.timeline({
      onComplete() {
        sessionStorage.setItem("rackflow-enter", "1");
        window.location.assign(rackLink.href);
      }
    });
    const targetW = Math.min(innerWidth * .68, 690);
    const targetH = Math.min(innerHeight * .77, 670);
    tl.to(overlay, { opacity: .76, duration: .24, ease: "power2.out" }, 0)
      .to(siblings, { opacity: 0, duration: .25 }, 0)
      .to(clone, { left: (innerWidth - targetW) / 2, top: (innerHeight - targetH) / 2,
        width: targetW, height: targetH, borderRadius: 24, duration: .52, ease: "power3.inOut" }, .08)
      .to(overlay, { opacity: 1, duration: .36 }, .42)
      .to(clone, { scale: Math.max(innerWidth / targetW, innerHeight / targetH) * 2.25,
        borderRadius: 0, filter: "blur(5px)", duration: .83, ease: "power4.in" }, .58)
      .to(vignette, { opacity: 1, duration: .54 }, .73)
      .to(field.children, { x: () => (Math.random() - .5) * innerWidth * 1.4,
        y: () => (Math.random() - .5) * innerHeight, scale: 3, opacity: 0,
        stagger: .014, duration: .78, ease: "power3.in" }, .64);
    // The navigation is still usable if animations are interrupted.
    window.addEventListener("pagehide", () => tl.kill(), { once: true });
  });
})();
