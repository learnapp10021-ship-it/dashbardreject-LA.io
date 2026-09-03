# Dashboard Pipa Reject — Warehouse FG Pipa LA Plant

Frontend **React (Vite)** + backend **Google Apps Script**.
Frontend di-hosting di Netlify, datanya diambil dari Google Spreadsheet lewat API JSON.

```
Google Spreadsheet  ──►  Apps Script (Code.gs)  ──►  React (Netlify)
  sheet Data              bersihkan + normalkan        filter, grafik,
  sheet Master            /exec  → JSON                tabel, export CSV
```

Tidak ada library grafik. Semua grafik digambar sebagai SVG di komponen sendiri,
jadi bundle-nya kecil dan tidak ada permintaan ke CDN mana pun.

---

## Struktur folder

```
.
├─ apps-script/
│  └─ Code.gs                  Backend: API JSON + menu RINGKASAN / DATA_CLEAN
├─ src/
│  ├─ main.jsx                 Titik masuk React
│  ├─ App.jsx                  Susunan halaman & status aplikasi
│  ├─ api.js                   Pemanggil API Apps Script
│  ├─ index.css                Seluruh gaya (token → komponen)
│  ├─ lib/
│  │  ├─ format.js             Format angka, rupiah, tanggal, daftar metrik
│  │  ├─ aggregate.js          Filter & agregasi baris data
│  │  ├─ svg.js                Helper geometri grafik
│  │  ├─ csv.js                Export CSV
│  │  └─ demo.js               Data contoh untuk pengembangan lokal
│  └─ components/
│     ├─ Sidebar.jsx           Panel filter kiri
│     ├─ KpiCards.jsx          Kartu KPI + sparkline
│     ├─ Insights.jsx          Sorotan otomatis
│     ├─ Card.jsx, Delta.jsx   Potongan tampilan kecil
│     ├─ DataTable.jsx         Tabel detail (cari & urutkan)
│     └─ charts/               TrendChart, ParetoChart, GroupedChart,
│                              StackedChart, Donut, BarList, Sparkline
├─ index.html
├─ vite.config.js
├─ netlify.toml
└─ .env.example
```

---

## Langkah 1 — Pasang backend Apps Script

1. Buka spreadsheet data reject → **Extensions → Apps Script**.
2. Tempel isi `apps-script/Code.gs` ke file `Code.gs`.
3. Pastikan `CONFIG.SPREADSHEET_ID` sudah benar (sudah terisi ID spreadsheet yang dipakai).
4. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Salin URL yang berakhiran `/exec`. Bisa juga dilihat lagi lewat menu spreadsheet
   **Dashboard Reject → Lihat URL API**.
6. Uji dengan membuka URL itu di browser — harus muncul JSON yang diawali `{"rows":[...`.

Menu spreadsheet juga menyediakan **Buat / Update RINGKASAN** dan **Rapikan Data**
seperti sebelumnya.

> Setiap kali `Code.gs` diubah, jalankan **Deploy → Manage deployments → Edit → New version**,
> kalau tidak URL lama masih menyajikan kode lama.

## Langkah 2 — Jalankan di komputer sendiri

```bash
npm install
cp .env.example .env       # lalu isi VITE_API_URL dengan URL /exec tadi
npm run dev                # buka http://localhost:5173
```

Kalau `VITE_API_URL` dikosongkan, aplikasi tetap jalan memakai data contoh —
berguna untuk mengatur tampilan tanpa menyentuh data asli.

## Langkah 3 — Simpan ke GitHub

```bash
git init
git add .
git commit -m "Dashboard pipa reject: React + Apps Script"
git branch -M main
git remote add origin https://github.com/<akun>/<repo>.git
git push -u origin main
```

File `.env` sudah masuk `.gitignore`, jadi URL API tidak ikut terunggah.

## Langkah 4 — Hosting di Netlify

1. Netlify → **Add new site → Import an existing project → GitHub** → pilih repo.
2. Isian build sudah dibaca dari `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Site settings → Environment variables**, tambahkan:
   - `VITE_API_URL` = URL `/exec` dari Apps Script
   - `VITE_API_KEY` = isi hanya kalau `CONFIG.API_KEY` di Code.gs juga diisi
4. **Deploy site**.

> Vite menyisipkan variabel lingkungan **saat build**, bukan saat halaman dibuka.
> Jadi setiap kali `VITE_API_URL` diubah, jalankan **Trigger deploy → Clear cache and deploy site**.

---

## Catatan teknis

- **Cache.** Apps Script menyimpan hasil olahan 5 menit (`CONFIG.CACHE_SECONDS`).
  Tombol **Muat Ulang Data** memanggil `?refresh=1` yang melewati cache.
- **CORS.** Web App dengan akses *Anyone* sudah mengirim header yang dibutuhkan untuk
  permintaan GET. Kalau di jaringan tertentu tetap terblokir, endpoint juga menerima
  `?callback=namaFungsi` untuk JSONP.
- **Keamanan.** URL `/exec` yang publik bisa dibuka siapa pun yang tahu alamatnya.
  Kalau perlu dibatasi, isi `CONFIG.API_KEY` di `Code.gs` dan `VITE_API_KEY` di Netlify.
  Ini penghalang ringan, bukan otentikasi penuh — jangan taruh data yang benar-benar rahasia.
- **Perbandingan tahun** (grafik antar tahun, tabel rekap tahunan, kartu Δ) muncul otomatis
  begitu data sudah melewati satu tahun kalender.
- **Kualitas data.** Baris dengan jumlah non-angka, tanggal rusak, atau artikel yang tidak ada
  di sheet `Master` tetap ditampilkan dengan status **CEK**, dan jumlahnya dilaporkan di
  pita peringatan atas.
