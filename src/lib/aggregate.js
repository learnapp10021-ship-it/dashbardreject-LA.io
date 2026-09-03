/* Agregasi baris data — tidak menyentuh tampilan sama sekali. */

import { BLN } from './format.js';

/** Daftar dimensi yang bisa difilter di panel kiri. */
export const DIMS = [
  { key: 'thn',    label: 'Tahun' },
  { key: 'bln',    label: 'Bulan' },
  { key: 'week',   label: 'Week' },
  { key: 'asal',   label: 'Asal Reject' },
  { key: 'area',   label: 'Area' },
  { key: 'kat',    label: 'Kategori Reject' },
  { key: 'defect', label: 'Jenis Defect' },
  { key: 'warna',  label: 'Warna Coretan' },
  { key: 'grup',   label: 'Group Ukuran' }
];

export function total(rows, fn) {
  let t = 0;
  for (const r of rows) t += Number(fn(r)) || 0;
  return t;
}

/** Kelompokkan berdasarkan satu kolom, urut dari terbesar. */
export function kelompok(rows, key, fn) {
  const map = new Map();
  for (const r of rows) {
    const k = r[key] === null || r[key] === '' || r[key] === undefined ? '(kosong)' : r[key];
    map.set(k, (map.get(k) || 0) + (Number(fn(r)) || 0));
  }
  return [...map.entries()]
    .map(([k, v]) => ({ k, v }))
    .sort((a, b) => b.v - a.v);
}

/** Deret bulanan berurutan: { labels, vals }. */
export function perBulan(rows, fn) {
  const map = new Map();
  for (const r of rows) {
    if (!r.thn) continue;
    const k = `${r.thn}-${String(r.bln).padStart(2, '0')}`;
    map.set(k, (map.get(k) || 0) + (Number(fn(r)) || 0));
  }
  const keys = [...map.keys()].sort();
  return {
    vals: keys.map((k) => map.get(k)),
    labels: keys.map((k) => {
      const [y, m] = k.split('-');
      return `${BLN[Number(m)]} '${y.slice(2)}`;
    })
  };
}

/** Nilai unik satu dimensi, sudah terurut. */
export function nilaiUnik(rows, key) {
  const set = new Set();
  for (const r of rows) {
    if (r[key] !== null && r[key] !== '' && r[key] !== undefined) set.add(r[key]);
  }
  const arr = [...set];
  return key === 'thn' || key === 'bln'
    ? arr.map(Number).sort((a, b) => a - b)
    : arr.sort();
}

/** Terapkan seluruh filter aktif. filters = { dim: Set } */
export function saring(rows, filters) {
  const aktif = Object.entries(filters).filter(([, set]) => set && set.size);
  if (!aktif.length) return rows;
  return rows.filter((r) => aktif.every(([dim, set]) => set.has(String(r[dim]))));
}

/** Rentang tanggal untuk teks periode. */
export function periode(rows) {
  const t = rows.map((r) => r.tgl).filter(Boolean).sort();
  return t.length ? [t[0], t[t.length - 1]] : null;
}
