import { useMemo, useState } from 'react';
import { num, rupiah, tanggalID } from '../lib/format.js';

const KOLOM = [
  ['tgl', 'Tanggal'], ['week', 'Week'], ['area', 'Area'], ['asal', 'Asal'],
  ['kat', 'Kategori'], ['defect', 'Jenis Defect'], ['warna', 'Coretan'],
  ['item', 'Nama Item'], ['pic', 'PIC'],
  ['qty', 'Btg'], ['kg', 'Kg'], ['rp', 'Nilai']
];
const ANGKA = new Set(['qty', 'kg', 'rp']);
const BATAS = 300;

/** Tabel detail: cari, urutkan, dan tandai baris yang perlu dicek. */
export default function DataTable({ rows }) {
  const [cari, setCari] = useState('');
  const [sort, setSort] = useState({ key: 'tgl', dir: -1 });

  const hasil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    const disaring = q
      ? rows.filter((r) =>
          `${r.item} ${r.defect} ${r.kat} ${r.pic} ${r.area} ${r.warna}`.toLowerCase().includes(q))
      : rows;

    return [...disaring].sort((a, b) => {
      let x = a[sort.key], y = b[sort.key];
      if (typeof x === 'string') { x = x.toLowerCase(); y = String(y).toLowerCase(); }
      return x > y ? sort.dir : x < y ? -sort.dir : 0;
    });
  }, [rows, cari, sort]);

  const urutkan = (key) =>
    setSort((s) => ({ key, dir: s.key === key ? -s.dir : -1 }));

  return (
    <div className="card">
      <div className="card__head">
        <h3 className="card__title">Detail Data</h3>
        <input className="input" value={cari} onChange={(e) => setCari(e.target.value)}
               placeholder="Cari item, defect, PIC…" />
      </div>
      <div className="card__cap">
        Klik judul kolom untuk mengurutkan. Status CEK menandai baris yang perlu dirapikan di sheet sumber.
      </div>

      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              {KOLOM.map(([key, judul]) => (
                <th key={key} className={ANGKA.has(key) ? 'is-num' : ''} onClick={() => urutkan(key)}>
                  {judul}{sort.key === key ? (sort.dir === -1 ? ' ↓' : ' ↑') : ''}
                </th>
              ))}
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {hasil.slice(0, BATAS).map((r, i) => (
              <tr key={`${r.tgl}-${r.item}-${i}`}>
                <td>{tanggalID(r.tgl)}</td>
                <td>{r.week}</td>
                <td>{r.area}</td>
                <td>{r.asal}</td>
                <td>{r.kat}</td>
                <td>{r.defect}</td>
                <td>{r.warna}</td>
                <td>{r.item}</td>
                <td>{r.pic}</td>
                <td className="is-num">{num(r.qty)}</td>
                <td className="is-num">{num(r.kg, 1)}</td>
                <td className="is-num">{rupiah(r.rp)}</td>
                <td>
                  <span className={`badge badge--${r.valid ? 'ok' : 'warn'}`}>
                    {r.valid ? 'OK' : 'CEK'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {hasil.length > BATAS && (
          <div style={{ padding: 9, color: 'var(--dim)' }}>
            Menampilkan {BATAS} dari {num(hasil.length)} baris — persempit dengan filter.
          </div>
        )}
      </div>
    </div>
  );
}
