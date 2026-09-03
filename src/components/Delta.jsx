import { num } from '../lib/format.js';

/**
 * Pill selisih persen. Naik = merah (reject bertambah itu buruk),
 * turun = hijau.
 */
export default function Delta({ kini, lalu }) {
  if (!lalu) return <span className="delta delta--flat">baru</span>;
  const p = ((kini - lalu) / lalu) * 100;
  const kelas = Math.abs(p) < 0.05 ? 'flat' : p > 0 ? 'up' : 'down';
  const tanda = kelas === 'flat' ? '•' : p > 0 ? '▲' : '▼';
  return (
    <span className={`delta delta--${kelas}`}>
      {tanda} {num(Math.abs(p), 1)}%
    </span>
  );
}
