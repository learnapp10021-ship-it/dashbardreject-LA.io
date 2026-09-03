import { skala, batangPath, garisPath, tickY } from '../../lib/svg.js';
import { ringkas, num, persen, potong, METRICS } from '../../lib/format.js';

const W = 720, H = 300, L = 58, R = 44, T = 14, B = 62;

/** Batang jenis defect + garis kumulatif persen (prinsip 80/20). */
export default function ParetoChart({ items, metric }) {
  const x0 = L, x1 = W - R, y0 = T, y1 = H - B;
  const n = items.length || 1;
  const lebar = (x1 - x0) / n;
  const bw = Math.min(34, lebar * 0.6);
  const jml = items.reduce((t, it) => t + it.v, 0) || 1;
  const sk = skala(items.length ? items[0].v : 1);
  const fmt = METRICS[metric].fmt;

  let kum = 0;
  const kumulatif = items.map((it) => {
    kum += it.v;
    return kum;
  });
  const titik = items.map((_, i) => [
    x0 + lebar * (i + 0.5),
    y1 - (kumulatif[i] / jml) * (y1 - y0)
  ]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="300" preserveAspectRatio="xMidYMid meet" role="img">
      <defs>
        <linearGradient id="gradPareto" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#FB7185" stopOpacity=".95" />
          <stop offset="100%" stopColor="#FB7185" stopOpacity=".28" />
        </linearGradient>
      </defs>

      {tickY(sk, y0, y1).map((t, i) => (
        <g key={`y${i}`}>
          <line x1={x0} x2={x1} y1={t.y} y2={t.y} stroke="rgba(255,255,255,.06)" />
          <text x={x0 - 8} y={t.y + 3.5} textAnchor="end" fill="#6B7C91" fontSize="10">
            {ringkas(metric, t.nilai)}
          </text>
        </g>
      ))}

      {items.map((it, i) => {
        const h = (it.v / sk.max) * (y1 - y0);
        const pusat = x0 + lebar * (i + 0.5);
        return (
          <g key={`b${i}`}>
            <path d={batangPath(pusat - bw / 2, y1 - h, bw, h)} fill="url(#gradPareto)">
              <title>{`${it.k}: ${fmt(it.v)}`}</title>
            </path>
            <text transform={`translate(${pusat + 4},${y1 + 14}) rotate(-28)`} textAnchor="end"
                  fill="#7C8CA0" fontSize="9.5">
              {potong(it.k, 18)}
            </text>
          </g>
        );
      })}

      <path d={garisPath(titik)} fill="none" stroke="#34D399" strokeWidth="2" strokeLinejoin="round" />
      {titik.map((p, i) => (
        <circle key={`c${i}`} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r="2.6" fill="#34D399">
          <title>{`Kumulatif ${num(persen(kumulatif[i], jml), 1)}%`}</title>
        </circle>
      ))}

      {[0, 1, 2, 3, 4].map((i) => (
        <text key={`p${i}`} x={x1 + 8} y={y1 - (y1 - y0) * (i / 4) + 3.5} fill="#6B7C91" fontSize="10">
          {i * 25}%
        </text>
      ))}
    </svg>
  );
}
