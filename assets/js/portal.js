(() => {
  const canvas = document.querySelector('#portal');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;

  const stage = document.querySelector('.experience');
  const cards = [...document.querySelectorAll('.deck article')];
  const controls = document.querySelector('.controls');
  const counter = document.querySelector('.counter');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { center: 0, open: 0, orbit: 0, reveal: 0, slide: 0 };
  const turn = Math.PI * 2;
  let width, height, phase = 0, previous = 0, speed = 0;
  let timeline, context, frame = 0, active = -1, inView = true;
  let paused = false;
  let paintCount = 0;
  let centers = [];
  let lastRing;
  const particles = Array.from({ length: 64 }, (_, i) => ({
    angle: i * 2.39996, radius: 0.4 + (i % 13) / 13, size: 0.6 + (i % 3) * 0.4
  }));

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function ringPosition() {
    const mobile = width < 680;
    return {
      x: width * ((mobile ? 0.70 : 0.75) * (1 - state.center) + 0.5 * state.center),
      y: height * ((mobile ? 0.77 : 0.46) * (1 - state.center) + 0.49 * state.center),
      size: Math.min(width * (mobile ? 0.27 : 0.20), height * 0.30) * (1 + state.center * 0.18)
    };
  }

  // Rotation locale du tore, suivie de son orientation dans l’espace.
  function project(u, v, phaseOffset = 0) {
    u += phase + phaseOffset;
    const tube = 0.30 - state.open * 0.17;
    const radius = 0.72 + state.open * 0.12 + tube * Math.cos(v);
    let x = radius * Math.cos(u);
    let y = radius * Math.sin(u);
    let z = tube * Math.sin(v);
    const ax = 0.90 - state.center * 0.65;
    const ay = Math.sin(state.center * Math.PI) * 0.75;
    const az = -0.34 + state.center * 0.52;
    [y, z] = [y * Math.cos(ax) - z * Math.sin(ax), y * Math.sin(ax) + z * Math.cos(ax)];
    [x, z] = [x * Math.cos(ay) + z * Math.sin(ay), -x * Math.sin(ay) + z * Math.cos(ay)];
    return [x * Math.cos(az) - y * Math.sin(az), x * Math.sin(az) + y * Math.cos(az), z];
  }

  function wire(ring, offset, opacity) {
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = 'rgba(199,145,255,' + opacity + ')';
    ctx.beginPath();
    for (let rib = 0; rib < 48; rib++) {
      for (let segment = 0; segment <= 32; segment++) {
        const [x, y] = project(rib * turn / 48, segment * turn / 32, offset);
        const px = ring.x + x * ring.size;
        const py = ring.y + y * ring.size;
        if (segment === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(199,145,255,' + opacity * 0.45 + ')';
    for (let latitude = 0; latitude < 8; latitude++) {
      for (let segment = 0; segment <= 96; segment++) {
        const [x, y] = project(segment * turn / 96, latitude * turn / 8, offset);
        if (segment === 0) ctx.moveTo(ring.x + x * ring.size, ring.y + y * ring.size);
        else ctx.lineTo(ring.x + x * ring.size, ring.y + y * ring.size);
      }
    }
    ctx.stroke();
  }

  function paint() {
    paintCount++;
    ctx.clearRect(0, 0, width, height);
    const ring = ringPosition();
    const glow = ctx.createRadialGradient(ring.x, ring.y, 0, ring.x, ring.y, ring.size * 1.6);
    glow.addColorStop(0, 'rgba(183,100,255,' + (0.03 + state.open * 0.36) + ')');
    glow.addColorStop(0.4, 'rgba(117,40,236,' + (0.07 + state.open * 0.18) + ')');
    glow.addColorStop(1, 'rgba(75,10,160,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    const energy = Math.sin(state.orbit * Math.PI) * state.reveal;
    ctx.globalCompositeOperation = 'lighter';
    if (lastRing && speed > 0.03) {
      wire(lastRing, -0.06, 0.08 * speed);
      wire(ring, -0.03, 0.12 * speed);
    }
    wire(ring, 0, 0.60 - state.reveal * 0.25);
    lastRing = ring;

    for (const particle of particles) {
      const angle = particle.angle + phase * 0.5;
      const radius = ring.size * (0.8 + particle.radius * (1.3 - energy * 0.6));
      ctx.fillStyle = 'rgba(204,163,255,' + (0.12 + energy * 0.65) + ')';
      ctx.beginPath();
      ctx.arc(ring.x + Math.cos(angle) * radius, ring.y + Math.sin(angle) * radius * 0.65, particle.size, 0, turn);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(193,134,255,' + energy * 0.55 + ')';
    centers.forEach(point => {
      ctx.beginPath();
      ctx.moveTo(ring.x, ring.y);
      ctx.quadraticCurveTo(ring.x + (point.x - ring.x) * 0.35, ring.y - ring.size, point.x, point.y);
      ctx.stroke();
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  function layoutCards() {
    if (!timeline) return;
    const orbit = state.orbit;
    const settle = gsap.parseEase('power4.inOut')(orbit);
    const gap = Math.min(width * 0.60, 440);
    const ready = orbit > 0.98;
    document.querySelector('.intro').inert = state.center > 0.5;
    const selected = Math.round(state.slide);
    centers = [];
    cards.forEach((card, i) => {
      const angle = i * turn / cards.length + orbit * turn * 0.80;
      const distance = (i - state.slide);
      const orbitalX = Math.cos(angle) * Math.min(width * 0.28, 280) * state.reveal;
      const orbitalY = Math.sin(angle) * 100 * state.reveal;
      const x = orbitalX * (1 - settle) + distance * gap * settle;
      const y = orbitalY * (1 - settle) + 20 * settle;
      const side = Math.min(Math.abs(distance), 1);
      gsap.set(card, {
        xPercent: -50, yPercent: -50, x, y,
        z: -220 * (1 - settle) + -100 * side * settle,
        rotationY: -Math.sin(angle) * 35 * (1 - settle) - distance * 12 * settle,
        rotationZ: Math.sin(angle) * 12 * (1 - settle),
        scale: (0.18 + state.reveal * 0.82) * (1 - side * 0.14 * settle),
        opacity: state.reveal * (1 - side * 0.58 * settle),
        filter: 'blur(' + ((1 - state.reveal) * 9 + side * 1.6 * settle) + 'px)',
        zIndex: Math.round(100 - side * 10)
      });
      const accessible = ready && i === selected;
      card.inert = !accessible;
      card.classList.toggle('active', accessible);
      centers.push({ x: width / 2 + x, y: height / 2 + y });
    });
    if (active !== selected) {
      active = selected;
      counter.textContent = (selected + 1) + ' / ' + cards.length + ' — ' + cards[selected].querySelector('h3').textContent;
    }
    controls.inert = !ready;
    controls.querySelector('[data-step="-1"]').disabled = selected === 0;
    controls.querySelector('[data-step="1"]').disabled = selected === cards.length - 1;
  }

  function goTo(index, immediate = false) {
    if (!timeline) return;
    const target = gsap.utils.clamp(0, cards.length - 1, index);
    const trigger = timeline.scrollTrigger;
    // La phase horizontale occupe les deux dernières unités de la timeline.
    window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * (5 + target / Math.max(1, cards.length - 1) * 2) / 7, behavior: immediate ? 'instant' : 'smooth' });
  }

  function setup() {
    context?.revert(); // Revert ONLY this view's GSAP timeline and ScrollTrigger.
    context = null;
    timeline = null;
    document.documentElement.classList.remove('enhanced');
    Object.assign(state, { center: 0, open: 0, orbit: 0, reveal: 0, slide: 0 });
    const animated = !motion.matches && window.gsap && window.ScrollTrigger && innerHeight >= 580;
    if (window.gsap) gsap.set([cards, '.intro', '.coordinate', '.catalogue-heading', controls], { clearProps: 'all' });
    cards.forEach(card => { card.inert = false; card.classList.remove('active'); });
    document.querySelector('.intro').inert = false;
    controls.hidden = !animated;
    controls.inert = false;
    centers = [];
    active = -1;
    if (animated) {
      gsap.registerPlugin(ScrollTrigger);
      document.documentElement.classList.add('enhanced');
      cards.forEach(card => { card.inert = true; });
      context = gsap.context(() => {
      timeline = gsap.timeline({
        defaults: { ease: 'power4.inOut' },
        scrollTrigger: {
          trigger: stage, start: 'top top', end: () => '+=' + innerHeight * 3.8,
          pin: true, scrub: 1.2, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate(self) {
            speed = Math.min(Math.abs(self.getVelocity()) / 2500, 1);
            document.querySelector('.progress').textContent = (self.progress < 0.3 ? '01' : self.progress < 0.7 ? '02' : '03') + ' / 03';
          }
        }
      });
      timeline.to('.intro, .coordinate', { opacity: 0, y: -45, duration: 1.5 }, 0)
        .to(state, { center: 1, duration: 2.5 }, 0)
        .to(state, { open: 1, duration: 1.5 }, 2)
        .to(state, { reveal: 1, duration: 1.3 }, 2.8)
        .to(state, { orbit: 1, duration: 2 }, 3)
        .to('.catalogue-heading', { opacity: 1, duration: 1 }, 4)
        .to(controls, { opacity: 1, duration: 0.5 }, 4.5)
        .to(state, { slide: cards.length - 1, duration: 2 }, 5);
      }, stage);
      ScrollTrigger.refresh();
    }
    resize();
    paint();
  }

  controls.addEventListener('click', event => {
    const button = event.target.closest('[data-step]');
    if (button) goTo(Math.round(state.slide) + Number(button.dataset.step));
  });
  document.querySelector('.deck').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || state.orbit < 0.98) return;
    event.preventDefault();
    goTo(Math.round(state.slide) + (event.key === 'ArrowRight' ? 1 : -1));
  });
  document.querySelectorAll('a[href="#catalogue"]').forEach(link => link.addEventListener('click', event => {
    if (!timeline) return;
    event.preventDefault();
    goTo(0);
    setTimeout(() => document.querySelector('.deck').focus({ preventScroll: true }), 900);
  }));

  let touchStart;
  const deck = document.querySelector('.deck');
  deck.addEventListener('touchstart', event => {
    touchStart = event.touches[0];
  }, { passive: true });
  deck.addEventListener('touchend', event => {
    if (!touchStart || state.orbit < 0.98) return;
    const end = event.changedTouches[0];
    const distance = end.clientX - touchStart.clientX;
    if (Math.abs(distance) > 60 && Math.abs(distance) > Math.abs(end.clientY - touchStart.clientY)) {
      goTo(Math.round(state.slide) + (distance < 0 ? 1 : -1));
    }
    touchStart = null;
  }, { passive: true });

  function snapshot() {
    return {
      scrollY: window.scrollY,
      progress: timeline?.scrollTrigger?.progress ?? null,
      slide: Math.round(state.slide),
      selected: cards[Math.round(state.slide)]?.dataset.project || 'rackflow',
      viewportWidth: innerWidth,
      viewportHeight: innerHeight
    };
  }

  function restore(saved) {
    if (!saved || !Number.isFinite(saved.scrollY)) return;
    const trigger = timeline?.scrollTrigger;
    const progress = Number.isFinite(saved.progress) ? Math.max(0, Math.min(1, saved.progress)) : null;
    const targetScroll = trigger && progress !== null && saved.viewportHeight !== innerHeight
      ? trigger.start + (trigger.end - trigger.start) * progress : saved.scrollY;
    // Bypass animated scrolling during restoration, or scrub:1.2 causes a visible rewind.
    window.scrollTo({ top: targetScroll, behavior: 'instant' });
    if (trigger) {
      // A scrub tween can keep advancing after history navigation and silently
      // change state.slide on the next frame. Stop it before/after syncing.
      trigger.getTween?.()?.kill();
      trigger.update();
      trigger.getTween?.()?.kill();
      if (progress !== null) timeline.progress(progress, true);
      if (Number.isFinite(saved.slide)) state.slide = saved.slide;
      layoutCards();
    }
    paint();
  }

  function animate(now) {
    frame = 0;
    if (paused) return;
    const delta = Math.min((now - previous) / 1000 || 0, 0.05);
    previous = now;
    if (!document.hidden) {
      // ScrollTrigger-pinned elements can be reported outside the intersection
      // threshold briefly after BFCache restoration. Keep the phase continuous
      // and draw whenever the pinned scroll experience itself is active.
      if (!motion.matches) phase += delta * 0.20 * (1 - state.center * 0.4);
      speed *= Math.exp(-delta * 4);
      if (inView || timeline?.scrollTrigger?.isActive) {
        layoutCards();
        paint();
      }
    }
    frame = requestAnimationFrame(animate);
  }
  function suspend() {
    paused = true;
    timeline?.scrollTrigger?.getTween?.()?.kill();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }
  function resume() {
    paused = false;
    previous = 0;
    inView = true; // Paint immediately while observers settle after return.
    // This route retains the same home DOM and viewport. Refreshing every
    // time rebuilds a pin spacer and can push the carousel to its final slide.
    // Resize/setup and BFCache re-entry perform refresh when genuinely needed.
    layoutCards();
    paint();
    if (!frame) frame = requestAnimationFrame(animate);
  }
  const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; });
  observer.observe(stage);
  motion.addEventListener('change', () => {
    const saved = snapshot();
    setup();
    restore(saved);
  });
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const saved = snapshot();
      setup();
      restore(saved);
    }, 180);
  });
  // A page in the bfcache is not a freshly mounted page: revive the same RAF.
  window.addEventListener('pagehide', suspend);
  window.addEventListener('pageshow', event => {
    if (event.persisted) resume();
  });
  window.ProjectsPortal = { snapshot, restore, suspend, resume, goTo,
    getCard: key => cards.find(c => c.dataset.project === key) || null,
    get phase() { return phase; },
    get inView() { return inView; },
    get paintCount() { return paintCount; },
    get frameActive() { return !!frame && !paused; } };
  setup();
  try {
    if (sessionStorage.getItem('projects-return-pending') === '1') {
      const saved = JSON.parse(sessionStorage.getItem('projects-world-state') || 'null');
      sessionStorage.removeItem('projects-return-pending');
      restore(saved);
    }
  } catch (_) { sessionStorage.removeItem('projects-return-pending'); }
  frame = requestAnimationFrame(animate);
})();
