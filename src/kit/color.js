// Colors are CSS strings. These helpers add alpha / mix hues without p5.

function parse(c) {
  if (typeof c !== 'string') return { r: 0, g: 0, b: 0, a: 1 };
  const s = c.trim();
  if (s.startsWith('#')) {
    let h = s.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split('').map((ch) => ch + ch).join('');
    const n = parseInt(h.slice(0, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a };
  }
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const p = m[1].split(/[, /]+/).map(Number);
    return { r: p[0] || 0, g: p[1] || 0, b: p[2] || 0, a: p[3] ?? 1 };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

export function alpha(c, a = 1) {
  const { r, g, b, a: ca } = parse(c);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${(
    ca * a
  ).toFixed(4)})`;
}

export function mix(c1, c2, k = 0.5) {
  const A = parse(c1);
  const B = parse(c2);
  const f = Math.max(0, Math.min(1, k));
  const ch = (x, y) => Math.round(x + (y - x) * f);
  return `rgb(${ch(A.r, B.r)}, ${ch(A.g, B.g)}, ${ch(A.b, B.b)})`;
}

export function shade(c, k = 0.2) {
  return k >= 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k);
}

export function luminance(c) {
  const { r, g, b } = parse(c);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function readHex(c) {
  return parse(c);
}
