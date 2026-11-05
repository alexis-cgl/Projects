(() => {
  "use strict";
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  if (sessionStorage.getItem("rackflow-enter") === "1") {
    sessionStorage.removeItem("rackflow-enter");
    if (!reduce.matches && window.gsap) {
      gsap.fromTo(".rack-hero-copy", { opacity: 0, y: 35, scale: .95 }, { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: "power3.out" });
      gsap.fromTo(".product-window", { opacity: 0, scale: 1.35, filter: "blur(12px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.15, ease: "power3.out" });
    }
  }
  if (!reduce.matches && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.utils.toArray(".story-card").forEach((card, i) => {
      gsap.fromTo(card, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: .85, delay: i * .08, scrollTrigger: { trigger: card, start: "top 90%", once: true } });
    });
    gsap.fromTo(".hero-product", { y: -15 }, { y: 28, ease: "none", scrollTrigger: { trigger: ".rack-hero", start: "top top", end: "bottom top", scrub: .9 } });
  }
  const cabinet = document.getElementById("rackCabinet");
  const status = document.getElementById("demoStatus");
  const inspector = document.getElementById("inspectorContent");
  const svg = document.getElementById("cableSvg");
  const workspace = document.getElementById("rackStage");
  const alternate = document.getElementById("alternateView");
  const title = document.getElementById("workspaceTitle");
  const hint = document.getElementById("workspaceHint");
  const path = document.getElementById("workspacePath");
  if (!cabinet || !status || !inspector || !svg) return;
  const seed = [
    { id: 1, name: "SW-CORE-01", kind: "Switch réseau", size: "1U", ports: 8 },
    { id: 2, name: "PATCH-01", kind: "Panneau de brassage", size: "1U", ports: 8 },
    { id: 3, name: "HYPERV-01", kind: "Serveur", size: "2U", ports: 4 },
    { id: 4, name: "NAS-01", kind: "Stockage", size: "2U", ports: 2 }
  ];
  let devices = seed.map(d => ({ ...d }));
  let cables = [{ from: "1:0", to: "2:0" }, { from: "1:1", to: "3:0" }];
  let selected = null, pending = null, view = "rack", nextId = 5;
  function say(text) { status.textContent = text; }
  function escapeHtml(text) { return String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }
  function portLabel(key) { const [id, index] = key.split(":").map(Number); const device = devices.find(d => d.id === id); return (device ? device.name : "Inconnu") + " / P" + (index + 1); }
  function isConnected(key) { return cables.some(c => c.from === key || c.to === key); }
  function inspect() {
    const device = devices.find(d => d.id === selected);
    if (!device) { inspector.innerHTML = '<div class="empty-inspector"><span>⌖</span><p>Choisissez un équipement pour afficher ses détails.</p></div>'; return; }
    inspector.innerHTML = '<div class="inspector-detail"><p class="label">ÉQUIPEMENT SÉLECTIONNÉ</p><h4>' + escapeHtml(device.name) + '</h4><p>Type <strong>' + escapeHtml(device.kind) + '</strong></p><p>Hauteur <strong>' + escapeHtml(device.size) + '</strong></p><p>Ports <strong>' + device.ports + '</strong></p><p>Connexions <strong>' + cables.filter(c => c.from.startsWith(device.id + ":") || c.to.startsWith(device.id + ":")).length + '</strong></p><button class="inspector-btn" id="removeDevice" type="button">Supprimer cet appareil</button></div>';
    document.getElementById("removeDevice").addEventListener("click", () => {
      devices = devices.filter(d => d.id !== selected);
      cables = cables.filter(c => !c.from.startsWith(selected + ":") && !c.to.startsWith(selected + ":"));
      selected = null; pending = null; say("Équipement supprimé de la simulation."); render();
    });
  }
  function drawCables() {
    if (view !== "rack") return;
    const bounds = svg.getBoundingClientRect();
    svg.setAttribute("viewBox", "0 0 " + bounds.width + " " + bounds.height);
    svg.innerHTML = "";
    for (const cable of cables) {
      const a = cabinet.querySelector('[data-port="' + cable.from + '"]');
      const b = cabinet.querySelector('[data-port="' + cable.to + '"]');
      if (!a || !b) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const x1 = ra.left - bounds.left + ra.width / 2, y1 = ra.top - bounds.top + ra.height / 2;
      const x2 = rb.left - bounds.left + rb.width / 2, y2 = rb.top - bounds.top + rb.height / 2;
      const bow = Math.max(45, Math.abs(y2 - y1) * .2 + 26);
      const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathEl.setAttribute("d", "M" + x1 + " " + y1 + " C" + (x1 + bow) + " " + y1 + "," + (x2 + bow) + " " + y2 + "," + x2 + " " + y2);
      svg.appendChild(pathEl);
    }
  }
  function renderRack() {
    cabinet.innerHTML = devices.map(d => '<div class="demo-device' + (selected === d.id ? " selected" : "") + '" data-device="' + d.id + '" role="group" aria-label="' + escapeHtml(d.name) + '"><button type="button" class="device-name" data-select="' + d.id + '">' + escapeHtml(d.name) + '</button><span class="device-ports">' + Array.from({ length: d.ports }, (_, i) => { const key = d.id + ":" + i; return '<button type="button" class="port-button' + (pending === key ? " selected" : "") + (isConnected(key) ? " connected" : "") + '" data-port="' + key + '" aria-label="' + escapeHtml(d.name) + ', port ' + (i + 1) + '" aria-pressed="' + (pending === key) + '" title="' + escapeHtml(d.name) + ' / P' + (i + 1) + '"></button>'; }).join("") + '</span></div>').join("") + '<div class="rack-empty-space" aria-hidden="true"></div>';
    requestAnimationFrame(drawCables);
  }
  function renderAlternate() {
    if (view === "rack") return;
    if (view === "inventory") {
      alternate.innerHTML = '<h4>Inventaire des équipements</h4>' + devices.map(d => '<div class="alternate-row"><strong>' + escapeHtml(d.name) + '</strong><span>' + escapeHtml(d.kind) + ' · ' + d.size + '</span></div>').join("");
    } else {
      alternate.innerHTML = '<h4>Connexions simulées</h4>' + (cables.length ? cables.map((c, i) => '<div class="alternate-row"><span>' + escapeHtml(portLabel(c.from)) + ' → ' + escapeHtml(portLabel(c.to)) + '</span><button type="button" data-remove-cable="' + i + '" aria-label="Supprimer cette connexion">×</button></div>').join("") : '<p>Aucun câble pour le moment. Ouvrez la baie et cliquez sur deux ports.</p>');
    }
  }
  function render() {
    document.querySelectorAll(".sidebar-tab").forEach(tab => { const active = tab.dataset.view === view; tab.classList.toggle("selected", active); tab.setAttribute("aria-pressed", String(active)); });
    workspace.hidden = view !== "rack";
    alternate.hidden = view === "rack";
    title.innerHTML = view === "rack" ? 'Rack 01 <span class="rack-size">42U</span>' : view === "inventory" ? "Inventaire" : "Connexions";
    path.textContent = "SITE PRINCIPAL / DATACENTER A";
    hint.textContent = view === "rack" ? "Sélectionnez un équipement ou un port" : "ESPACE DE DÉMONSTRATION";
    if (view === "rack") renderRack(); else renderAlternate();
    inspect();
  }
  cabinet.addEventListener("click", event => {
    const port = event.target.closest("[data-port]");
    if (port) {
      const key = port.dataset.port;
      selected = Number(key.split(":")[0]);
      if (!pending) { pending = key; say("Port " + portLabel(key) + " sélectionné. Choisissez un second port pour relier les équipements."); }
      else if (pending === key) { pending = null; say("Sélection de port annulée."); }
      else if (pending.split(":")[0] === key.split(":")[0]) { pending = key; say("Sélectionnez un port d'un autre équipement."); }
      else if (isConnected(pending) || isConnected(key)) { pending = null; say("L'un des ports est déjà connecté. Choisissez deux ports libres."); }
      else { cables.push({ from: pending, to: key }); pending = null; say("Liaison ajoutée à la simulation."); }
      render(); return;
    }
    const select = event.target.closest("[data-select]");
    if (select) { selected = Number(select.dataset.select); pending = null; say("Inspecteur : " + devices.find(d => d.id === selected).name); render(); }
  });
  alternate.addEventListener("click", event => {
    const button = event.target.closest("[data-remove-cable]");
    if (!button) return;
    cables.splice(Number(button.dataset.removeCable), 1);
    say("Liaison supprimée."); render();
  });
  document.querySelectorAll(".sidebar-tab").forEach(tab => tab.addEventListener("click", () => { view = tab.dataset.view; pending = null; render(); }));
  document.getElementById("addDevice").addEventListener("click", () => {
    if (devices.length >= 8) { say("Limite de huit équipements atteinte dans cette démonstration."); return; }
    const name = "SERVER-" + String(nextId).padStart(2, "0");
    selected = nextId;
    devices.push({ id: nextId++, name, kind: "Serveur", size: "1U", ports: 4 });
    view = "rack"; pending = null; say(name + " ajouté au rack de démonstration."); render();
  });
  document.getElementById("resetDemo").addEventListener("click", () => {
    devices = seed.map(d => ({ ...d })); cables = [{ from: "1:0", to: "2:0" }, { from: "1:1", to: "3:0" }];
    nextId = 5; selected = null; pending = null; view = "rack"; say("Démonstration réinitialisée."); render();
  });
  const observer = new ResizeObserver(() => { if (view === "rack") drawCables(); });
  observer.observe(workspace);
  window.addEventListener("scroll", () => { if (view === "rack") requestAnimationFrame(drawCables); }, { passive: true });
  const features = [
    { number: "01", icon: "▤", caption: "ÉQUIPEMENTS / STRUCTURE / DISPOSITION" },
    { number: "02", icon: "⌁", caption: "PORTS / CONNEXIONS / TRAÇABILITÉ" },
    { number: "03", icon: "▦", caption: "INVENTAIRE / VISIBILITÉ / DOCUMENTATION" }
  ];
  document.querySelectorAll(".feature-step").forEach(button => button.addEventListener("click", () => {
    const feature = features[Number(button.dataset.step)];
    document.querySelectorAll(".feature-step").forEach(node => node.classList.toggle("active", node === button));
    const symbol = document.getElementById("featureSymbol");
    if (window.gsap && !reduce.matches) {
      gsap.fromTo(symbol, { opacity: .25, y: 15, rotateY: -20 }, { opacity: 1, y: 0, rotateY: 0, duration: .5, ease: "power3.out" });
    }
    symbol.textContent = feature.icon;
    document.getElementById("featureNumber").textContent = feature.number;
    document.getElementById("featureCaption").textContent = feature.caption;
  }));
  render();
})();
