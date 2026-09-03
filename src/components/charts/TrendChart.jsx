import { skala, batangPath, garisPath, tickY } from '../../lib/svg.js';
import { ringkas, rupiah, rupiahRingkas, METRICS } from '../../lib/format.js';

const W = 720, H = 290, L = 58, T = 14, B = 40;

/**
 * Batang mengikuti metrik aktif; garis kuning selalu nilai rupiah
 * (disembunyikan kalau metrik yang dipilih memang rupiah).
 */
export default function TrendChart({ labels, bars, line, metric }) {
  const R = line ? 56 : 18;
  const x0 = L, x1 = W - R, y0 = T, y1 = H - B;
  const n = labels.length || 1;
  const lebar = (x1 - x0) / n;
  const bw = Math.min(38, lebar * 0.55);

  const skB = skala(Math.max(0, ...bars));
  const skG = line ? skala(Math.max(0, ...line)) : null;
  const lompat = Math.ceil(n / 14);
  const fmtBar = METRICS[metric].fmt;

  const titikGaris = line
    ? line.map((v, i) => [x0 + lebar * (i + 0.5), y1 - (v / skG.max) * (y1 - y0)])
    : [];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="290" preserveAspectRatio="xMidYMid meet" role="img">
      <defs>
        <linearGradient id="gradTren" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4C8DFF" stopOpacity=".95" />
          <stop offset="100%" stopColor="#4C8DFF" stopOpacity=".28" />
        </linearGradient>
      </defs>

      {tickY(skB, y0, y1).map((t, i) => (
        <g key={`y${i}`}>
          <line x1={x0} x2={x1} y1={t.y} y2={t.y} stroke="rgba(255,255,255,.06)" />
          <text x={x0 - 8} y={t.y + 3.5} textAnchor="end" fill="#6B7C91" fontSize="10">
            {ringkas(metric, t.nilai)}
          </text>
        </g>
      ))}

      {bars.map((v, i) => {
        const h = (v / skB.max) * (y1 - y0);
        const pusat = x0 + lebar * (i + 0.5);
        return (
          <g key={`b${i}`}>
            <path d={batangPath(pusat - bw / 2, y1 - h, bw, h)} fill="url(#gradTren)">
              <title>{`${labels[i]}: ${fmtBar(v)}`}</title>
            </path>
            {i % lompat === 0 && (
              <text x={pusat} y={H - 16} textAnchor="middle" fill="#7C8CA0" fontSize="10">
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}

      {line && (
        <>
          <path d={garisPath(titikGaris)} fill="none" stroke="#FBBF24" strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" />
          {titikGaris.map((p, i) => (
            <circle key={`p${i}`} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r="2.6" fill="#FBBF24">
              <title>{`${labels[i]}: ${rupiah(line[i])}`}</title>
            </circle>
          ))}
          {tickY(skG, y0, y1).map((t, i) => (
            <text key={`r${i}`} x={x1 + 8} y={t.y + 3.5} fill="#6B7C91" fontSize="10">
              {rupiahRingkas(t.nilai)}
            </text>
          ))}
        </>
      )}
    </svg>
  );
}
