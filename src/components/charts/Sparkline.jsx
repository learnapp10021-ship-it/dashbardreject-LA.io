import { useId } from 'react';
import { garisPath } from '../../lib/svg.js';

const W = 104, H = 28;

/** Garis mungil tren 12 bulan di dalam kartu KPI. */
export default function Sparkline({ values, color }) {
  const id = useId().replace(/:/g, '');
  if (!values || values.length < 2) return null;

  const maks = Math.max(...values);
  const min = Math.min(...values);
  const rentang = maks - min || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * W,
    H - 2 - ((v - min) / rentang) * (H - 5)
  ]);
  const garis = garisPath(pts);
  const akhir = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${garis} L${W} ${H} L0 ${H} Z`} fill={`url(#${id})`} />
      <path d={garis} fill="none" stroke={color} strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={akhir[0].toFixed(1)} cy={akhir[1].toFixed(1)} r="2.4" fill={color} />
    </svg>
  );
}
