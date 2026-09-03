import { total, kelompok, perBulan } from '../lib/aggregate.js';
import { num, persen, rupiah } from '../lib/format.js';

/** Kalimat sorotan yang dirakit otomatis dari data terfilter. */
function susunPoin(rows, years) {
  const poin = [];
  const q = total(rows, (r) => r.qty);
  const mq = perBulan(rows, (r) => r.qty);

  if (mq.vals.length) {
    const t = mq.vals.indexOf(Math.max(...mq.vals));
    poin.push({
      warna: '#4C8DFF',
      isi: <>Bulan tertinggi <b>{mq.labels[t]}</b> dengan <b>{num(mq.vals[t])} batang</b>{' '}
           ({num(persen(mq.vals[t], q), 1)}% dari periode ini).</>
    });
  }

  const gd = kelompok(rows, 'defect', (r) => r.qty);
  if (gd.length) {
    const tiga = gd.slice(0, 3).reduce((t, x) => t + x.v, 0);
    poin.push({
      warna: '#FB7185',
      isi: <><b>{gd[0].k}</b> jadi penyumbang terbesar ({num(persen(gd[0].v, q), 1)}%).
           Tiga defect teratas menutup <b>{num(persen(tiga, q), 1)}%</b> dari seluruh reject.</>
    });
  }

  const ga = kelompok(rows, 'area', (r) => r.qty);
  const gk = kelompok(rows, 'kat', (r) => r.qty);
  if (ga.length && gk.length) {
    poin.push({
      warna: '#FBBF24',
      isi: <>Paling banyak ditemukan di area <b>{ga[0].k}</b> ({num(persen(ga[0].v, q), 1)}%),
           didominasi kategori <b>{gk[0].k}</b>.</>
    });
  }

  const gi = kelompok(rows, 'item', (r) => r.rp);
  if (gi.length && gi[0].v > 0) {
    poin.push({
      warna: '#34D399',
      isi: <>Kerugian rupiah terbesar dari <b>{gi[0].k}</b> senilai <b>{rupiah(gi[0].v)}</b>.</>
    });
  }

  if (years.length > 1) {
    const kini = years[years.length - 1];
    const lalu = years[years.length - 2];
    const qk = total(rows.filter((r) => r.thn === kini), (r) => r.qty);
    const ql = total(rows.filter((r) => r.thn === lalu), (r) => r.qty);
    if (ql) {
      const d = ((qk - ql) / ql) * 100;
      poin.push({
        warna: '#A78BFA',
        isi: <>Tahun <b>{kini}</b> {d >= 0 ? 'naik' : 'turun'} <b>{num(Math.abs(d), 1)}%</b>{' '}
             dibanding {lalu} ({num(qk)} vs {num(ql)} batang).</>
      });
    }
  }
  return poin;
}

export default function Insights({ rows, years }) {
  const poin = susunPoin(rows, years);
  if (!poin.length) return null;

  return (
    <div className="insight">
      <h3>Sorotan Otomatis</h3>
      <ul>
        {poin.map((p, i) => (
          <li key={i}>
            <i style={{ background: p.warna }} />
            <span>{p.isi}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
