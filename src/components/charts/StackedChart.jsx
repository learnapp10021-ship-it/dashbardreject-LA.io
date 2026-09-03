import { skala, tickY } from '../../lib/svg.js';
import { ringkas, METRICS } from '../../lib/format.js';

const W = 720, H = 290, L = 58, R = 18, T = 14, B = 34;

/** Batang bertumpuk — asal reject (Produksi / Warehouse) per week. */
export default function StackedChart({ labels, series, metric }) {
  const x0 = L, x1 = W - R, y0 = T, y1 = H - B;
  const lebar = (x1 - x0) / (labels.length || 1);
  const bw = Math.min(52, lebar * 0.5);
  const maks = Math.max(0, ...labels.map((_, i) => series.reduce((t, s) => t + (s.data[i] || 0), 0)));
  const sk = skala(maks);
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
        let dasar = y1;
        return (
          <g key={`s${i}`}>
            {series.map((sr) => {
              const v = sr.data[i] || 0;
              if (!v) return null;
              const h = (v / sk.max) * (y1 - y0);
              dasar -= h;
              return (
                <rect key={sr.nama} x={(pusat - bw / 2).toFixed(1)} y={dasar.toFixed(1)}
                      width={bw.toFixed(1)} height={h.toFixed(1)} rx="3" fill={sr.warna}>
                  <title>{`${sr.nama} — ${lb}: ${fmt(v)}`}</title>
                </rect>
              );
            })}
            <text x={pusat} y={H - 12} textAnchor="middle" fill="#7C8CA0" fontSize="10">{lb}</text>
          </g>
        );
      })}
    </svg>
  );
}
