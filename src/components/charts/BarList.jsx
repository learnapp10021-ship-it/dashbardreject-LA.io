import { ringkas } from '../../lib/format.js';

/** Daftar batang mendatar — dipakai untuk Top 10 item. */
export default function BarList({ items, metric }) {
  const maks = items.length ? items[0].v : 1;
  return (
    <div className="blist">
      {items.map((it) => (
        <div className="blist__row" key={it.k}>
          <div className="blist__name" title={it.k}>{it.k}</div>
          <div className="blist__val">{ringkas(metric, it.v)}</div>
          <div className="blist__track">
            <div className="blist__fill"
                 style={{ width: `${Math.max(2, (it.v / maks) * 100).toFixed(1)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
