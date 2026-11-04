// Projette chaque section circulaire de l’anneau dans le plan du SVG.
const ring = document.getElementById('ring');
const sections = 76;
const segments = 40;
const turn = 2 * Math.PI;

for (let section = 0; section < sections; section++) {
  const angle = section * turn / sections;
  const points = [];

  for (let segment = 0; segment <= segments; segment++) {
    const arc = segment * turn / segments;
    const radius = 1.62 + 0.63 * Math.cos(arc);
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle) * 0.55 - 0.83 * 0.63 * Math.sin(arc);
    const left = 220 + 85 * (0.91 * x + 0.41 * y);
    const top = 160 + 85 * (0.91 * y - 0.41 * x);
    points.push(`${left.toFixed(1)},${top.toFixed(1)}`);
  }

  const polygon = document.createElementNS(ring.namespaceURI, 'polygon');
  polygon.setAttribute('points', points.join(' '));
  ring.append(polygon);
}
