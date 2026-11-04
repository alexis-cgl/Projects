const ring = document.getElementById('ring');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const turn = 2 * Math.PI;
const ribs = Array.from({ length: 36 }, () => {
  const rib = document.createElementNS(ring.namespaceURI, 'circle');
  rib.setAttribute('r', '1');
  rib.setAttribute('vector-effect', 'non-scaling-stroke');
  ring.append(rib);
  return rib;
});

// Le plan de projection reste fixe. Seule la longitude des fils évolue.
const tilt = 0.92;
const depth = Math.cos(tilt);
const height = 48 * Math.sin(tilt);

function draw(phase) {
  ribs.forEach((rib, index) => {
    const angle = index * turn / ribs.length + phase;
    const x = Math.cos(angle);
    const facing = Math.sin(angle);
    const y = facing * depth;
    rib.setAttribute('opacity', 0.65 + 0.35 * facing);
    rib.setAttribute('transform', `matrix(${48 * x} ${48 * y} 0 ${height} ${134 * x} ${134 * y})`);
  });
}

let frame;
let visible = false;
let previous;
let elapsed = 0;

function animate(now) {
  if (previous !== undefined) elapsed += now - previous;
  previous = now;
  draw(elapsed * turn / 56000);
  frame = requestAnimationFrame(animate);
}

function sync() {
  cancelAnimationFrame(frame);
  previous = undefined;
  if (reducedMotion.matches) draw(0);
  else if (visible && !document.hidden) frame = requestAnimationFrame(animate);
}

draw(0);
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  sync();
}).observe(ring.ownerSVGElement);
reducedMotion.addEventListener('change', sync);
document.addEventListener('visibilitychange', sync);
