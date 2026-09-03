import { skala, batangPath, tickY } from '../../lib/svg.js';
import { ringkas, METRICS } from '../../lib/format.js';

const W = 720, H = 290, L = 58, R = 18, T = 14, B = 34;

/** Batang berkelompok — dipakai untuk perbandingan antar tahun per bulan. */
export default function GroupedChart({ labels, series, metric }) {
  const x0 = L, x1 = W - R, y0 = T, y1 = H - B;
  const lebar = (x1 - x0) / (labels.length || 1);
  const maks = Math.max(0, ...series.flatMap((s) => s.data));
  const sk = skala(maks);
  const bw = Math.min(13, (lebar * 0.7) / series.length);
  const fmt = METRICS[metric].fmt;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="290" preserveAspectRatio="xMidYMid meet" role="img">
      {tickY(sk, y0, y1).map((t, i) => (
        <g key={`y${i}`}>
          <line x1={x0} x2={x1} y1={t.y} y2={t.y} stroke="rgba(255,255,255,.06)" />
          <text x={x0 - 8} y={t.y + 3.5} textAnchor="end" fill="#6B7C91" fontSize="10">
            {ringkas(metric, t.nilai)}
          </text>
        </g>
      ))}

      {labels.map((lb, i) => {
        const pusat = x0 + lebar * (i + 0.5);
        const mulai = pusat - (bw * series.length + 3 * (series.length - 1)) / 2;
        return (
          <g key={`g${i}`}>
            {series.map((sr, j) => {
              const v = sr.data[i] || 0;
              const h = (v / sk.max) * (y1 - y0);
              return (
                <path key={sr.nama} d={batangPath(mulai + j * (bw + 3), y1 - h, bw, h, 4)}
                      fill={sr.warna} opacity={j === series.length - 1 ? 1 : 0.62}>
                  <title>{`${sr.nama} ${lb}: ${fmt(v)}`}</title>
                </path>
              );
            })}
            <text x={pusat} y={H - 12} textAnchor="middle" fill="#7C8CA0" fontSize="10">{lb}</text>
          </g>
        );
      })}
    </svg>
  );
}
