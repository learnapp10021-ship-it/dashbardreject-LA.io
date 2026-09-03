import Sparkline from './charts/Sparkline.jsx';
import Delta from './Delta.jsx';
import { total, perBulan } from '../lib/aggregate.js';
import { num, rupiah, rupiahRingkas } from '../lib/format.js';

function Kpi({ tanda, warna, label, nilai, satuan, catatan, deret, delta }) {
  return (
    <div className="kpi">
      <div className="kpi__top">
        <span className="kpi__label">{label}</span>
        <span className="kpi__mark" style={{ background: `${warna}22`, color: warna }}>{tanda}</span>
      </div>
      <div className="kpi__value">
        {nilai}{satuan && <small>{satuan}</small>}
      </div>
      <div className="kpi__foot">
        <span className="kpi__note">{catatan}</span>
        {delta}
      </div>
      {deret && <div className="kpi__spark"><Sparkline values={deret} color={warna} /></div>}
    </div>
  );
}

/** Empat kartu ringkasan + satu kartu perbandingan tahun kalau datanya ada. */
export default function KpiCards({ rows, years }) {
  const q = total(rows, (r) => r.qty);
  const kg = total(rows, (r) => r.kg);
  const rp = total(rows, (r) => r.rp);
  const nHari = new Set(rows.map((r) => r.tgl).filter(Boolean)).size || 1;

  const mq = perBulan(rows, (r) => r.qty);
  const mk = perBulan(rows, (r) => r.kg);
  const mr = perBulan(rows, (r) => r.rp);
  const akhir = (a) => (a.length ? a[a.length - 1] : 0);
  const sebelum = (a) => (a.length > 1 ? a[a.length - 2] : 0);
  const bulanTerakhir = mq.labels.length ? mq.labels[mq.labels.length - 1] : '—';

  const banyakTahun = years.length > 1;
  const kini = years[years.length - 1];
  const lalu = years[years.length - 2];
  const qKini = banyakTahun ? total(rows.filter((r) => r.thn === kini), (r) => r.qty) : 0;
  const qLalu = banyakTahun ? total(rows.filter((r) => r.thn === lalu), (r) => r.qty) : 0;

  return (
    <div className="kpis">
      <Kpi tanda="▦" warna="#4C8DFF" label="Total Pipa Reject"
           nilai={num(q)} satuan=" btg"
           catatan={`${num(rows.length)} kejadian · ${bulanTerakhir}`}
           deret={mq.vals} delta={<Delta kini={akhir(mq.vals)} lalu={sebelum(mq.vals)} />} />

      <Kpi tanda="◈" warna="#FBBF24" label="Total Berat"
           nilai={num(kg, 1)} satuan=" kg"
           catatan={`Rata-rata ${num(kg / (rows.length || 1), 1)} kg/kejadian`}
           deret={mk.vals} delta={<Delta kini={akhir(mk.vals)} lalu={sebelum(mk.vals)} />} />

      <Kpi tanda="Rp" warna="#34D399" label="Nilai Kerugian"
           nilai={rupiahRingkas(rp)}
           catatan={`${q ? rupiah(rp / q) : 'Rp 0'} per batang`}
           deret={mr.vals} delta={<Delta kini={akhir(mr.vals)} lalu={sebelum(mr.vals)} />} />

      <Kpi tanda="◷" warna="#A78BFA" label="Rata-rata Harian"
           nilai={num(q / nHari, 1)} satuan=" btg"
           catatan={`${nHari} hari ada temuan`}
           delta={<span className="delta delta--flat">{num((q / nHari) * 30)} /bln</span>} />

      {banyakTahun && (
        <Kpi tanda="⇄" warna="#38BDF8" label={`${kini} vs ${lalu}`}
             nilai={num(qKini)} satuan=" btg"
             catatan={`Tahun ${lalu}: ${num(qLalu)} btg`}
             delta={<Delta kini={qKini} lalu={qLalu} />} />
      )}
    </div>
  );
}
