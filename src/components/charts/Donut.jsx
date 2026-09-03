import { titik } from '../../lib/svg.js';
import { PALETTE, num, persen, METRICS } from '../../lib/format.js';

const SIZE = 158, RL = 68, RD = 46;

/** Donat + legenda persentase di sampingnya. */
export default function Donut({ items, metric, nilaiTengah, labelTengah }) {
  const cx = SIZE / 2, cy = SIZE / 2;
  const jml = items.reduce((t, it) => t + it.v, 0) || 1;
  const fmt = METRICS[metric].fmt;

  let sudut = -Math.PI / 2;
  const potongan = items.map((it, i) => {
    const lebar = (it.v / jml) * Math.PI * 2;
    const a0 = sudut, a1 = sudut + lebar;
    sudut = a1;
    const besar = lebar > Math.PI ? 1 : 0;
    const p0 = titik(cx, cy, RL, a0), p1 = titik(cx, cy, RL, a1);
    const p2 = titik(cx, cy, RD, a1), p3 = titik(cx, cy, RD, a0);
    return {
      ...it,
      warna: PALETTE[i % PALETTE.length],
      d: `M${p0[0].toFixed(1)},${p0[1].toFixed(1)} A${RL},${RL} 0 ${besar} 1 ${p1[0].toFixed(1)},${p1[1].toFixed(1)} ` +
         `L${p2[0].toFixed(1)},${p2[1].toFixed(1)} A${RD},${RD} 0 ${besar} 0 ${p3[0].toFixed(1)},${p3[1].toFixed(1)} Z`
    };
  });

  return (
    <div className="donut">
      <div className="donut__chart">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="158"
             preserveAspectRatio="xMidYMid meet" role="img">
          {items.length === 1 ? (
            <circle cx={cx} cy={cy} r={(RL + RD) / 2} fill="none"
                    stroke={PALETTE[0]} strokeWidth={RL - RD} />
          ) : (
            potongan.map((p) => (
              <path key={p.k} d={p.d} fill={p.warna} stroke="#111821" strokeWidth="2">
                <title>{`${p.k}: ${fmt(p.v)} (${num(persen(p.v, jml), 1)}%)`}</title>
              </path>
            ))
          )}
          <text x={cx} y={cy - 3} textAnchor="middle" fill="#E9F0F7" fontSize="17" fontWeight="700">
            {nilaiTengah}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="#6B7C91" fontSize="10">
            {labelTengah}
          </text>
        </svg>
      </div>

      <div className="donut__legend">
        {items.map((it, i) => (
          <div className="donut__item" key={it.k}>
            <i style={{ background: PALETTE[i % PALETTE.length] }} />
            <span title={it.k}>{it.k}</span>
            <b>{num(persen(it.v, jml), 1)}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}
