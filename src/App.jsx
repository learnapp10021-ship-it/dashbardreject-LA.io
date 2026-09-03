import { useCallback, useEffect, useMemo, useState } from 'react';

import { ambilData } from './api.js';
import { unduhCSV } from './lib/csv.js';
import { DIMS, saring, total, kelompok, perBulan, periode } from './lib/aggregate.js';
import { BLN, METRICS, PALETTE, num, rupiah, ringkas, tanggalID } from './lib/format.js';

import Sidebar from './components/Sidebar.jsx';
import KpiCards from './components/KpiCards.jsx';
import Insights from './components/Insights.jsx';
import Card from './components/Card.jsx';
import Delta from './components/Delta.jsx';
import DataTable from './components/DataTable.jsx';
import TrendChart from './components/charts/TrendChart.jsx';
import ParetoChart from './components/charts/ParetoChart.jsx';
import GroupedChart from './components/charts/GroupedChart.jsx';
import StackedChart from './components/charts/StackedChart.jsx';
import Donut from './components/charts/Donut.jsx';
import BarList from './components/charts/BarList.jsx';

export default function App() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('memuat');   // memuat | siap | gagal
  const [pesanError, setPesanError] = useState('');
  const [filters, setFilters] = useState({});
  const [metric, setMetric] = useState('qty');

  /* ---------- Ambil data ---------- */
  const muat = useCallback(async (refresh = false) => {
    setStatus('memuat');
    try {
      const hasil = await ambilData(refresh);
      setData(hasil);
      setStatus('siap');
    } catch (err) {
      setPesanError(err.message || String(err));
      setStatus('gagal');
    }
  }, []);

  useEffect(() => { muat(false); }, [muat]);

  /* ---------- Filter ---------- */
  const toggleFilter = useCallback((dim, val) => {
    setFilters((prev) => {
      const next = { ...prev };
      const set = new Set(next[dim] || []);
      set.has(val) ? set.delete(val) : set.add(val);
      if (set.size) next[dim] = set; else delete next[dim];
      return next;
    });
  }, []);

  const hapusFilter = (dim, val) => toggleFilter(dim, val);
  const resetFilter = () => setFilters({});

  /* ---------- Turunan ---------- */
  const semua = data?.rows ?? [];
  const years = data?.years ?? [];
  const rows = useMemo(() => saring(semua, filters), [semua, filters]);
  const M = METRICS[metric];

  const pillAktif = useMemo(() => {
    const out = [];
    for (const d of DIMS) {
      const set = filters[d.key];
      if (!set) continue;
      for (const v of set) out.push({ dim: d.key, label: d.label, val: v });
    }
    return out;
  }, [filters]);

  /* ---------- Tampilan status ---------- */
  if (status === 'memuat' && !data) {
    return (
      <div className="state" style={{ paddingTop: 120 }}>
        <div className="spinner" />
        Mengambil data dari spreadsheet…
      </div>
    );
  }
  if (status === 'gagal') {
    return (
      <div style={{ padding: 24 }}>
        <div className="alert"><b>Gagal memuat data.</b> {pesanError}</div>
        <button className="btn btn--primary" style={{ width: 220 }} onClick={() => muat(true)}>
          Coba lagi
        </button>
      </div>
    );
  }

  const rentang = periode(rows);
  const banyakTahun = years.length > 1;

  return (
    <div className="shell">
      <Sidebar
        rows={semua}
        filters={filters}
        onToggle={toggleFilter}
        onReset={resetFilter}
        onReload={() => muat(true)}
        onExport={() => unduhCSV(rows)}
      />

      <main className="main">
        {/* ---------- Kepala ---------- */}
        <header className="hero">
          <div>
            <h1>Dashboard Pipa Reject</h1>
            <div className="hero__sub">
              {rentang
                ? `Periode ${tanggalID(rentang[0])} – ${tanggalID(rentang[1])}`
                : 'Belum ada tanggal valid'}
            </div>
          </div>
          <div className="hero__right">
            <div className="seg">
              {[['qty', 'Batang'], ['kg', 'Berat'], ['rp', 'Rupiah']].map(([k, label]) => (
                <button key={k} className={metric === k ? 'is-on' : ''} onClick={() => setMetric(k)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="hero__stamp">
              <div>{status === 'memuat' ? 'Memuat…' : `Diperbarui ${data.generatedAt}`}</div>
              <div>{num(rows.length)} dari {num(semua.length)} baris</div>
            </div>
          </div>
        </header>

        {/* ---------- Pill filter aktif ---------- */}
        {pillAktif.length > 0 && (
          <div className="fbar">
            {pillAktif.map((p) => (
              <span className="fbar__pill" key={`${p.dim}-${p.val}`}
                    onClick={() => hapusFilter(p.dim, p.val)}>
                {p.label}: <b>{p.dim === 'bln' ? BLN[Number(p.val)] : p.val}</b> ✕
              </span>
            ))}
          </div>
        )}

        <CatatanKualitas data={data} />

        {rows.length === 0 ? (
          <div className="state">
            Tidak ada data untuk kombinasi filter ini.<br />Coba longgarkan filter di panel kiri.
          </div>
        ) : (
          <div className="fade">
            <KpiCards rows={rows} years={years} />
            <Insights rows={rows} years={years} />

            <div className="grid grid--2">
              <Card judul={`Tren ${M.nama} per Bulan`}
                    keterangan="Batang mengikuti metrik terpilih, garis kuning nilai rupiah"
                    legenda={[{ c: '#4C8DFF', n: `${M.nama} (${M.unit})` }, { c: '#FBBF24', n: 'Nilai (Rp)' }]}>
                <TrenKartu rows={rows} metric={metric} />
              </Card>

              <Card judul="Pareto Jenis Defect"
                    keterangan="Urut terbesar, garis hijau kumulatif % — fokus perbaikan 80/20"
                    legenda={[{ c: '#FB7185', n: M.nama }, { c: '#34D399', n: 'Kumulatif %' }]}>
                <ParetoChart items={kelompok(rows, 'defect', M.get).slice(0, 12)} metric={metric} />
              </Card>
            </div>

            {banyakTahun && <BlokTahunan rows={rows} years={years} metric={metric} />}

            <div className="grid grid--3">
              <KartuDonat judul="Kategori Reject" rows={rows} dim="kat" metric={metric} />
              <KartuDonat judul="Area Temuan" rows={rows} dim="area" metric={metric} />
              <KartuDonat judul="Warna Coretan" rows={rows} dim="warna" metric={metric} />
            </div>

            <div className="grid grid--2">
              <Card judul="Top 10 Item"
                    keterangan={`Item dengan ${M.nama.toLowerCase()} reject terbesar`}>
                <BarList items={kelompok(rows, 'item', M.get).slice(0, 10)} metric={metric} />
              </Card>
              <KartuAsal rows={rows} metric={metric} />
            </div>

            <DataTable rows={rows} />
          </div>
        )}
      </main>
    </div>
  );
}

/* ============================================================
   Potongan tampilan pendukung
   ========================================================== */

function CatatanKualitas({ data }) {
  if (data.demo) {
    return (
      <div className="alert">
        <b>Mode contoh.</b> Variabel <code>VITE_API_URL</code> belum diisi, jadi yang tampil
        data contoh. Isi variabel itu di Netlify (atau file <code>.env</code>) dengan URL Web App
        Apps Script supaya data asli yang tampil.
      </div>
    );
  }
  const i = data.issues || {};
  const pesan = [];
  if (i.qtyInvalid) pesan.push(`${i.qtyInvalid} baris jumlah reject bukan angka`);
  if (i.tanggalInvalid) pesan.push(`${i.tanggalInvalid} baris tanggal tidak valid`);
  if (i.artikelTakDikenal) pesan.push(`${i.artikelTakDikenal} baris artikel tidak ada di Master`);
  if (data.masterIssues) pesan.push(`${data.masterIssues} item Master beratnya rusak`);
  if (!pesan.length) return null;

  return (
    <div className="alert">
      <b>Catatan kualitas data:</b> {pesan.join(' · ')}. Baris tersebut tetap tampil,
      tetapi berat dan nilainya dihitung 0.
    </div>
  );
}

function TrenKartu({ rows, metric }) {
  const m = perBulan(rows, METRICS[metric].get);
  const mr = perBulan(rows, (r) => r.rp);
  return (
    <TrendChart labels={m.labels} bars={m.vals}
                line={metric === 'rp' ? null : mr.vals} metric={metric} />
  );
}

function KartuDonat({ judul, rows, dim, metric }) {
  const items = kelompok(rows, dim, METRICS[metric].get).slice(0, 7);
  const jml = items.reduce((t, x) => t + x.v, 0);
  return (
    <Card judul={judul}>
      <Donut items={items} metric={metric}
             nilaiTengah={ringkas(metric, jml)}
             labelTengah={metric === 'rp' ? 'total nilai' : METRICS[metric].unit} />
    </Card>
  );
}

function KartuAsal({ rows, metric }) {
  const get = METRICS[metric].get;
  const asal = [...new Set(rows.map((r) => r.asal))].sort();
  const weeks = [...new Set(rows.map((r) => r.week))].sort();
  const series = asal.map((a, i) => ({
    nama: a,
    warna: PALETTE[i % PALETTE.length],
    data: weeks.map((w) => total(rows.filter((r) => r.asal === a && r.week === w), get))
  }));

  return (
    <Card judul="Asal Reject per Week"
          keterangan="Perbandingan temuan dari Produksi dan Warehouse"
          legenda={series.map((s) => ({ c: s.warna, n: s.nama }))}>
      <StackedChart labels={weeks} series={series} metric={metric} />
    </Card>
  );
}

function BlokTahunan({ rows, years, metric }) {
  const get = METRICS[metric].get;
  const series = years.map((y, i) => ({
    nama: String(y),
    warna: PALETTE[i % PALETTE.length],
    data: Array.from({ length: 12 }, (_, b) =>
      total(rows.filter((r) => r.thn === y && r.bln === b + 1), get))
  }));

  const metrik = [
    { n: 'Jumlah reject',  f: (r) => r.qty, fmt: (v) => `${num(v)} btg` },
    { n: 'Berat',          f: (r) => r.kg,  fmt: (v) => `${num(v, 1)} kg` },
    { n: 'Nilai kerugian', f: (r) => r.rp,  fmt: rupiah },
    { n: 'Kejadian',       f: () => 1,      fmt: (v) => `${num(v)}x` }
  ];

  return (
    <div className="grid grid--2">
      <Card judul="Perbandingan Antar Tahun"
            keterangan={`${METRICS[metric].nama} per bulan, ${years.join(' vs ')}`}
            legenda={series.map((s) => ({ c: s.warna, n: s.nama }))}>
        <GroupedChart labels={BLN.slice(1)} series={series} metric={metric} />
      </Card>

      <Card judul="Rekap Tahunan" keterangan="Selisih tahun terakhir terhadap tahun sebelumnya">
        <div className="tablewrap" style={{ maxHeight: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Metrik</th>
                {years.map((y) => <th key={y} className="is-num">{y}</th>)}
                <th className="is-num">Δ</th>
              </tr>
            </thead>
            <tbody>
              {metrik.map((m) => {
                const vals = years.map((y) => total(rows.filter((r) => r.thn === y), m.f));
                return (
                  <tr key={m.n}>
                    <td>{m.n}</td>
                    {vals.map((v, i) => <td key={i} className="is-num">{m.fmt(v)}</td>)}
                    <td className="is-num">
                      <Delta kini={vals[vals.length - 1]} lalu={vals[vals.length - 2]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
