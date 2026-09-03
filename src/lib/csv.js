/* Ekspor baris terfilter ke CSV (pemisah titik koma, ramah Excel Indonesia). */

import { BULAN } from './format.js';

const JUDUL = ['Tanggal', 'Tahun', 'Bulan', 'Week', 'Area', 'Asal Reject', 'Kategori Reject',
  'Jenis Defect', 'Warna Coretan', 'PIC', 'Nama Item', 'Artikel', 'Group', 'Kelas',
  'Jumlah (btg)', 'Berat (kg)', 'Nilai (Rp)', 'Status'];

const kutip = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function unduhCSV(rows) {
  const baris = [JUDUL.join(';')];
  for (const r of rows) {
    baris.push([
      r.tgl, r.thn, BULAN[r.bln] || '', r.week, r.area, r.asal, r.kat, r.defect, r.warna,
      r.pic, r.item, r.art, r.grup, r.kelas, r.qty, r.kg, r.rp, r.valid ? 'OK' : 'CEK'
    ].map(kutip).join(';'));
  }

  const blob = new Blob(['\ufeff' + baris.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reject_pipa_LA_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
