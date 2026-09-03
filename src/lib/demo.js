/* Data contoh — dipakai hanya kalau VITE_API_URL belum diisi,
   supaya `npm run dev` tetap bisa jalan tanpa spreadsheet. */

export function dataContoh() {
  const kat = ['Storage', 'Handling Susun', 'Handling Muat', 'Printing'];
  const defek = ['Pecah, Proses muat', 'Baret', 'Dimensi', 'Afkir QA', 'Bengkok', 'Gores forklift'];
  const area = ['A', 'B', 'C'];
  const asal = ['Produksi', 'Warehouse'];
  const warna = ['Hijau (D)', 'Biru (B)', 'Tidak ada Coretan'];
  const grup = ['1/2" - 1-1/2"', '2" - 2-1/2"', '3" - 5"'];
  const pic = ['Kelik', 'Budi', 'Sari'];
  const item = [
    ['STD AW 1/2" SC 4M', 0.62, 10117],
    ['STD AW 3" SC 5.8M', 7.47, 124288],
    ['STD D 4" SC 4M', 4.41, 68929],
    ['STD AW 2" SC 5.8M', 3.74, 62789],
    ['STD AW 1 1/4" SC 4M', 1.77, 27593]
  ];

  let seed = 7;
  const acak = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pilih = (a) => a[Math.floor(acak() * a.length)];

  const rows = [];
  const kini = new Date();
  const thn = kini.getFullYear();

  for (const y of [thn - 1, thn]) {
    for (let b = 1; b <= 12; b++) {
      if (y === thn && b > kini.getMonth() + 1) continue;
      const n = 3 + Math.floor(acak() * 5);
      for (let i = 0; i < n; i++) {
        const it = pilih(item);
        const q = 1 + Math.floor(acak() * 14);
        const d = 1 + Math.floor(acak() * 27);
        rows.push({
          tgl: `${y}-${String(b).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          thn: y,
          bln: b,
          week: 'Week ' + Math.min(5, Math.ceil(d / 7)),
          area: pilih(area),
          asal: pilih(asal),
          kat: pilih(kat),
          defect: pilih(defek),
          warna: pilih(warna),
          pic: pilih(pic),
          item: it[0],
          art: '1017201',
          grup: pilih(grup),
          kelas: pilih(['A', 'B', 'C']),
          jenis: 'AW',
          rak: 'R' + (1 + Math.floor(acak() * 8)),
          qty: q,
          kg: Math.round(it[1] * q * 100) / 100,
          rp: it[2] * q,
          valid: acak() > 0.08
        });
      }
    }
  }

  return {
    ok: true,
    demo: true,
    rows,
    years: [thn - 1, thn],
    generatedAt: 'data contoh',
    plant: 'LA PLANT',
    issues: { total: rows.length, qtyInvalid: 0, tanggalInvalid: 0, artikelTakDikenal: 0 },
    masterIssues: 0
  };
}
