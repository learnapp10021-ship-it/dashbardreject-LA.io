/* Format angka & tanggal — semua tampilan angka lewat sini. */

export const BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export const BLN = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

export const PALETTE = ['#4C8DFF', '#FBBF24', '#34D399', '#FB7185', '#A78BFA',
  '#38BDF8', '#F97316', '#2DD4BF', '#F472B6', '#84CC16'];

export function num(n, d = 0) {
  return (Number(n) || 0).toLocaleString('id-ID', {
    minimumFractionDigits: d,
    maximumFractionDigits: d
  });
}

export function rupiah(n) {
  return 'Rp ' + num(Math.round(Number(n) || 0));
}

export function rupiahRingkas(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e9) return 'Rp ' + (v / 1e9).toFixed(1) + 'M';
  if (Math.abs(v) >= 1e6) return 'Rp ' + (v / 1e6).toFixed(1) + 'jt';
  if (Math.abs(v) >= 1e3) return 'Rp ' + Math.round(v / 1e3) + 'rb';
  return 'Rp ' + num(v);
}

export function persen(a, b) {
  return b ? (a / b) * 100 : 0;
}

export function potong(s, n) {
  const t = String(s ?? '');
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

export function tanggalID(s) {
  const p = String(s ?? '').split('-');
  return p.length < 3 ? s : `${Number(p[2])} ${BLN[Number(p[1])]} ${p[0]}`;
}

/* Definisi metrik yang bisa dipilih di header. */
export const METRICS = {
  qty: { nama: 'Jumlah', unit: 'batang', get: (r) => r.qty, fmt: (v) => num(v) },
  kg:  { nama: 'Berat',  unit: 'kg',     get: (r) => r.kg,  fmt: (v) => num(v, 1) },
  rp:  { nama: 'Nilai',  unit: 'rupiah', get: (r) => r.rp,  fmt: (v) => rupiah(v) }
};

/** Format ringkas sesuai metrik aktif — dipakai di sumbu & label grafik. */
export function ringkas(metric, v) {
  return metric === 'rp' ? rupiahRingkas(v) : METRICS[metric].fmt(v);
}
