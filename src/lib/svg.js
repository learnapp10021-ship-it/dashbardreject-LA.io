/* Helper geometri untuk grafik SVG buatan sendiri (tanpa library grafik). */

/** Skala sumbu yang "bulat": { max, step }. */
export function skala(maks, jml = 4) {
  if (!(maks > 0)) return { max: 1, step: 0.25 };
  const kasar = maks / jml;
  const mag = Math.pow(10, Math.floor(Math.log10(kasar)));
  const norm = kasar / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  return { max: Math.ceil(maks / step) * step, step };
}

/** Path batang dengan dua sudut atas membulat. */
export function batangPath(x, y, w, h, r = 5) {
  x = Number(x); y = Number(y); w = Number(w);
  h = Number(h) > 0.6 ? Number(h) : 0.6;
  r = Math.min(r, w / 2, h);
  const p = (n) => Math.round(n * 10) / 10;
  return `M${p(x)},${p(y + h)} V${p(y + r)} Q${p(x)},${p(y)} ${p(x + r)},${p(y)} ` +
         `H${p(x + w - r)} Q${p(x + w)},${p(y)} ${p(x + w)},${p(y + r)} V${p(y + h)} Z`;
}

/** Path garis dari deretan titik [[x,y], ...]. */
export function garisPath(pts) {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
}

/** Titik pada lingkaran (untuk donat). */
export function titik(cx, cy, r, sudut) {
  return [cx + r * Math.cos(sudut), cy + r * Math.sin(sudut)];
}

/** Lima garis bantu + label sumbu Y. */
export function tickY(sk, y0, y1, jml = 4) {
  return Array.from({ length: jml + 1 }, (_, i) => {
    const nilai = (sk.max / jml) * i;
    return { nilai, y: y1 - (nilai / sk.max) * (y1 - y0) };
  });
}
