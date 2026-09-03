/**
 * ============================================================
 *  DASHBOARD PIPA REJECT — WAREHOUSE FG PIPA LA PLANT
 *  PT Wahana Duta Jaya (Rucika)
 * ------------------------------------------------------------
 *  File  : apps-script/Code.gs
 *  Peran : BACKEND. Membaca sheet "Data" + "Master", membersihkan dan
 *          menormalkan isinya, lalu menyajikannya sebagai API JSON untuk
 *          aplikasi React yang di-hosting di Netlify. Juga membuat sheet
 *          RINGKASAN & DATA_CLEAN lewat menu spreadsheet.
 * ============================================================
 */

var CONFIG = {
  SPREADSHEET_ID : '1gksyhAsw9NNsh-kz0T2PltV5b1fNcIWF28n4U8YT08U',
  SHEET_DATA     : 'Data',
  SHEET_MASTER   : 'Master',
  SHEET_CLEAN    : 'DATA_CLEAN',   // dibuat otomatis oleh menu "Rapikan Data"
  SHEET_SUMMARY  : 'RINGKASAN',    // dibuat otomatis oleh menu "Buat / Update RINGKASAN"
  CACHE_SECONDS  : 300,            // cache 5 menit supaya API ringan
  API_KEY        : '',             // isi kalau endpoint mau dikunci (?key=...)
  PLANT          : 'LA PLANT',
  // Berat di Master campur satuan (gram & kg). Nilai di atas ambang ini
  // dianggap GRAM lalu dibagi 1000 supaya semua jadi KG.
  BERAT_GRAM_THRESHOLD : 100
};

/* ============================================================
 *  1. API JSON (dipakai aplikasi React di Netlify)
 * ========================================================== */

/**
 * Endpoint tunggal. Deploy sebagai Web App:
 *   Execute as     : Me
 *   Who has access : Anyone
 * Salin URL /exec ke variabel VITE_API_URL di Netlify.
 *
 * Parameter:
 *   ?key=...        wajib kalau CONFIG.API_KEY diisi
 *   ?refresh=1      abaikan cache, baca ulang spreadsheet
 *   ?callback=fn    balas JSONP (cadangan kalau CORS bermasalah)
 */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var hasil;
  try {
    if (CONFIG.API_KEY && p.key !== CONFIG.API_KEY) {
      hasil = { ok: false, error: 'Kunci API tidak cocok.' };
    } else {
      hasil = getDashboardData(p.refresh === '1' || p.refresh === 'true');
      hasil.ok = true;
    }
  } catch (err) {
    hasil = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return kirim_(hasil, p.callback);
}

function kirim_(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback && /^[A-Za-z_$][\w$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Dashboard Reject')
    .addItem('Buat / Update RINGKASAN', 'buildSummary')
    .addItem('Rapikan Data (buat sheet DATA_CLEAN)', 'writeCleanSheet')
    .addSeparator()
    .addItem('Lihat URL API', 'tampilkanUrlApi')
    .addItem('Bersihkan Cache', 'clearCache')
    .addToUi();
}

function tampilkanUrlApi() {
  var url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().alert(
    'URL API (isi ke VITE_API_URL di Netlify):\n\n' +
    (url || 'Belum di-deploy. Buka Deploy > New deployment > Web app.'));
}

function clearCache() {
  CacheService.getScriptCache().remove('reject_data_v1');
  try { SpreadsheetApp.getUi().alert('Cache dibersihkan.'); } catch (e) {}
}

/* ============================================================
 *  2. API UNTUK DASHBOARD
 * ========================================================== */

/**
 * Dipanggil dari client: google.script.run.getDashboardData()
 * @param {boolean} force  true = abaikan cache
 */
function getDashboardData(force) {
  var cache = CacheService.getScriptCache();
  if (!force) {
    var hit = cache.get('reject_data_v1');
    if (hit) {
      try { return JSON.parse(hit); } catch (e) {}
    }
  }
  var payload = buildDataset_();
  var json = JSON.stringify(payload);
  // cache hanya kalau muat (limit 100KB per key)
  if (json.length < 95000) cache.put('reject_data_v1', json, CONFIG.CACHE_SECONDS);
  return payload;
}

/* ============================================================
 *  3. PEMBACAAN & PEMBERSIHAN DATA
 * ========================================================== */

function ss_() {
  return CONFIG.SPREADSHEET_ID
    ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

/** Peta header -> index kolom (case & spasi insensitive). */
function headerMap_(headerRow) {
  var map = {};
  headerRow.forEach(function (h, i) {
    var k = String(h || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (k && map[k] === undefined) map[k] = i;
  });
  return map;
}

function col_(map, names) {
  for (var i = 0; i < names.length; i++) {
    var k = names[i].toLowerCase();
    if (map[k] !== undefined) return map[k];
  }
  return -1;
}

/** Master artikel: artikel -> {nama, beratKg, harga, kelas, group, jenisItem} */
function loadMaster_() {
  var sh = ss_().getSheetByName(CONFIG.SHEET_MASTER);
  var out = { byArticle: {}, byName: {}, issues: 0 };
  if (!sh) return out;

  var values = sh.getDataRange().getValues();
  if (values.length < 2) return out;

  var map = headerMap_(values[0]);
  var cArt   = col_(map, ['artikel', 'article', 'kode artikel']);
  var cNama  = col_(map, ['nama item', 'nama']);
  var cBerat = col_(map, ['berat/btg', 'berat per btg', 'berat']);
  var cKelas = col_(map, ['kelas', 'class']);
  var cGroup = col_(map, ['group', 'kelompok']);
  var cHarga = col_(map, ['harga', 'price']);
  var cJenis = col_(map, ['jenis item', 'jenis']);

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var art = toArticle_(cArt >= 0 ? row[cArt] : '');
    var nama = String(cNama >= 0 ? row[cNama] : '').trim();
    if (!art && !nama) continue;

    var beratRaw = cBerat >= 0 ? row[cBerat] : '';
    var berat = toBeratKg_(beratRaw);
    if (berat === null) out.issues++;

    var item = {
      artikel  : art,
      nama     : nama,
      beratKg  : berat,
      harga    : parseRupiah_(cHarga >= 0 ? row[cHarga] : ''),
      kelas    : String(cKelas >= 0 ? row[cKelas] : '').trim(),
      group    : String(cGroup >= 0 ? row[cGroup] : '').trim(),
      jenisItem: String(cJenis >= 0 ? row[cJenis] : '').trim()
    };
    if (art)  out.byArticle[art] = item;
    if (nama) out.byName[nama.toUpperCase()] = item;
  }
  return out;
}

/**
 * Bangun dataset bersih untuk dashboard.
 * Total Berat & Total Harga SELALU dihitung ulang dari Master
 * (kolom di sheet Data sering kosong / salah isi).
 */
function buildDataset_() {
  var master = loadMaster_();
  var sh = ss_().getSheetByName(CONFIG.SHEET_DATA);
  if (!sh) throw new Error('Sheet "' + CONFIG.SHEET_DATA + '" tidak ditemukan.');

  var values = sh.getDataRange().getValues();
  var rows = [], issues = {
    total: 0, qtyInvalid: 0, tanggalInvalid: 0,
    artikelTakDikenal: 0, hargaKosong: 0, beratKosong: 0
  };
  if (values.length < 2) {
    return { rows: [], years: [], issues: issues, generatedAt: nowStr_(), plant: CONFIG.PLANT };
  }

  var map = headerMap_(values[0]);
  var C = {
    ts    : col_(map, ['timestamp', 'waktu input']),
    week  : col_(map, ['week', 'minggu']),
    area  : col_(map, ['lokasi temuan', 'area', 'lokasi']),
    tgl   : col_(map, ['tanggal temuan', 'tanggal']),
    pic   : col_(map, ['nama yang menemukan', 'pic', 'penemu']),
    jnsIt : col_(map, ['jenis item']),
    kelIt : col_(map, ['kelompok item pipa retail', 'kelompok item']),
    art   : col_(map, ['article', 'artikel']),
    nama  : col_(map, ['nama item']),
    asal  : col_(map, ['asal reject']),
    defect: col_(map, ['jenis defect']),
    kat   : col_(map, ['category defect', 'kategori defect', 'kategori reject']),
    qty   : col_(map, ['jumlah pipa reject', 'jumlah', 'qty']),
    rak   : col_(map, ['asal rak']),
    tumpak: col_(map, ['nomor tumpak']),
    img   : col_(map, ['gambar pipa reject', 'gambar']),
    warna : col_(map, ['warna coretan'])
  };

  for (var r = 1; r < values.length; r++) {
    var v = values[r];
    if (v.join('').trim() === '') continue;

    var d = parseDate_(C.tgl >= 0 ? v[C.tgl] : null) || parseDate_(C.ts >= 0 ? v[C.ts] : null);
    var okDate = !!d;
    if (!okDate) issues.tanggalInvalid++;

    var qtyRaw = C.qty >= 0 ? v[C.qty] : '';
    var qty = toNumber_(qtyRaw);
    var okQty = qty !== null && qty > 0;
    if (!okQty) { issues.qtyInvalid++; qty = 0; }

    var art  = toArticle_(C.art >= 0 ? v[C.art] : '');
    var nama = String(C.nama >= 0 ? v[C.nama] : '').trim();
    // kadang kolom "Nama Item" keisi angka artikel — perbaiki
    if (/^\d{8,}$/.test(nama.replace(/[.,]/g, ''))) { if (!art) art = toArticle_(nama); nama = ''; }

    var m = (art && master.byArticle[art]) ||
            (nama && master.byName[nama.toUpperCase()]) || null;
    if (!m) issues.artikelTakDikenal++;

    var beratKg = m ? m.beratKg : null;
    var harga   = m ? m.harga : null;
    if (beratKg === null) issues.beratKosong++;
    if (!harga) issues.hargaKosong++;

    var namaFinal = nama || (m ? m.nama : '') || (art ? 'ART ' + art : '(tanpa nama)');

    var rec = {
      tgl   : okDate ? Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd') : '',
      thn   : okDate ? d.getFullYear() : null,
      bln   : okDate ? (d.getMonth() + 1) : null,
      week  : weekLabel_(C.week >= 0 ? v[C.week] : '', d),
      area  : clean_(C.area >= 0 ? v[C.area] : '', 'AREA'),
      asal  : clean_(C.asal >= 0 ? v[C.asal] : '', 'Asal'),
      kat   : clean_(C.kat >= 0 ? v[C.kat] : '', 'Kategori'),
      defect: clean_(C.defect >= 0 ? v[C.defect] : '', 'Defect'),
      warna : cleanWarna_(C.warna >= 0 ? v[C.warna] : ''),
      pic   : clean_(C.pic >= 0 ? v[C.pic] : '', 'PIC'),
      item  : namaFinal,
      art   : art,
      grup  : m ? m.group : '',
      kelas : m ? m.kelas : '',
      jenis : String(C.jnsIt >= 0 ? v[C.jnsIt] : (m ? m.jenisItem : '')).trim(),
      rak   : String(C.rak >= 0 ? v[C.rak] : '').trim(),
      qty   : qty,
      kg    : beratKg !== null ? round_(beratKg * qty, 2) : 0,
      rp    : harga ? Math.round(harga * qty) : 0,
      valid : okDate && okQty && !!m
    };
    rows.push(rec);
    issues.total++;
  }

  var years = {};
  rows.forEach(function (x) { if (x.thn) years[x.thn] = true; });

  return {
    rows        : rows,
    years       : Object.keys(years).map(Number).sort(),
    issues      : issues,
    masterIssues: master.issues,
    generatedAt : nowStr_(),
    plant       : CONFIG.PLANT
  };
}

/* ============================================================
 *  4. SHEET DATA_CLEAN (opsional, dari menu)
 * ========================================================== */

function writeCleanSheet(dataOpt) {
  var data = dataOpt || buildDataset_();
  var ss = ss_();
  var sh = ss.getSheetByName(CONFIG.SHEET_CLEAN) || ss.insertSheet(CONFIG.SHEET_CLEAN);
  sh.clear();

  var header = ['Tanggal', 'Tahun', 'Bulan', 'Week', 'Area', 'Asal Reject', 'Kategori Reject',
                'Jenis Defect', 'Warna Coretan', 'PIC', 'Nama Item', 'Artikel', 'Group', 'Kelas',
                'Jenis Item', 'Asal Rak', 'Jumlah (btg)', 'Total Berat (kg)', 'Total Harga (Rp)', 'Valid'];
  var out = [header];
  data.rows.forEach(function (r) {
    out.push([r.tgl, r.thn, r.bln, r.week, r.area, r.asal, r.kat, r.defect, r.warna, r.pic,
              r.item, r.art, r.grup, r.kelas, r.jenis, r.rak, r.qty, r.kg, r.rp, r.valid ? 'OK' : 'CEK']);
  });
  sh.getRange(1, 1, out.length, header.length).setValues(out);
  sh.getRange(1, 1, 1, header.length).setFontWeight('bold')
    .setBackground('#1f2937').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.getRange(2, 17, Math.max(out.length - 1, 1), 1).setNumberFormat('#,##0');
  sh.getRange(2, 18, Math.max(out.length - 1, 1), 1).setNumberFormat('#,##0.00');
  sh.getRange(2, 19, Math.max(out.length - 1, 1), 1).setNumberFormat('"Rp"#,##0');
  sh.autoResizeColumns(1, header.length);

  if (dataOpt) return data.issues;   // dipanggil dari buildSummary, tanpa alert
  try {
    SpreadsheetApp.getUi().alert(
      'Sheet ' + CONFIG.SHEET_CLEAN + ' selesai dibuat.\n\n' +
      'Baris terbaca      : ' + data.issues.total + '\n' +
      'Jumlah tidak valid : ' + data.issues.qtyInvalid + '\n' +
      'Tanggal bermasalah : ' + data.issues.tanggalInvalid + '\n' +
      'Artikel tak dikenal: ' + data.issues.artikelTakDikenal);
  } catch (e) {}
  return data.issues;
}

/* ============================================================
 *  4b. SHEET RINGKASAN (dari menu)
 * ========================================================== */

var STYLE = {
  title  : { bg:'#0f172a', font:'#ffffff' },
  section: { bg:'#1e293b', font:'#ffffff' },
  header : { bg:'#475569', font:'#ffffff' },
  total  : { bg:'#e2e8f0' },
  kpi    : { bg:'#f1f5f9' },
  note   : { bg:'#fef3c7' }
};
var F = { txt:'@', num:'#,##0', num2:'#,##0.00', pct:'0.0%', rp:'"Rp"#,##0' };

/** Bangun sheet RINGKASAN yang rapi & mudah dibaca. */
function buildSummary() {
  var data = buildDataset_();
  writeCleanSheet(data);                       // DATA_CLEAN ikut diperbarui

  var rows = data.rows, years = data.years || [];
  var ss = ss_();
  var sh = ss.getSheetByName(CONFIG.SHEET_SUMMARY) || ss.insertSheet(CONFIG.SHEET_SUMMARY);
  sh.clear();
  sh.clearConditionalFormatRules();

  var W = Math.max(6, years.length + 2);       // lebar tabel terlebar
  var tot = totals_(rows);
  var per = periode_(rows);
  var r = 1;

  /* ---- Judul ---- */
  sh.getRange(r, 1, 1, W).merge()
    .setValue('RINGKASAN PIPA REJECT — WAREHOUSE FG PIPA ' + CONFIG.PLANT)
    .setBackground(STYLE.title.bg).setFontColor(STYLE.title.font)
    .setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sh.setRowHeight(r, 34); r++;

  sh.getRange(r, 1, 1, W).merge()
    .setValue('Periode data: ' + per + '   |   Diperbarui: ' + nowStr_() +
              '   |   Sumber: sheet ' + CONFIG.SHEET_DATA + ' + ' + CONFIG.SHEET_MASTER +
              '   |   Angka dihitung ulang otomatis, jangan diketik manual')
    .setBackground('#334155').setFontColor('#e2e8f0').setFontSize(9)
    .setHorizontalAlignment('center');
  r += 2;

  /* ---- Indikator utama ---- */
  var topDefect = aggBy_(rows, function (x) { return x.defect; })[0];
  var topArea   = aggBy_(rows, function (x) { return x.area; })[0];
  var topItem   = aggBy_(rows, function (x) { return x.item; })[0];
  var topMonth  = aggBy_(rows, function (x) {
    return x.thn ? (x.thn + '-' + ('0' + x.bln).slice(-2)) : '(tanggal kosong)'; })[0];

  var kpi = [
    ['Total pipa reject',            tot.q,                              'batang',  F.num],
    ['Total berat',                  tot.kg,                             'kg',      F.num2],
    ['Total nilai kerugian',         tot.rp,                             'rupiah',  F.rp],
    ['Jumlah kejadian (baris input)', rows.length,                       'kejadian', F.num],
    ['Rata-rata per kejadian',       rows.length ? tot.q / rows.length : 0, 'batang/kejadian', F.num2],
    ['Nilai rata-rata per batang',   tot.q ? tot.rp / tot.q : 0,         'rupiah/batang', F.rp],
    ['Bulan tertinggi',              topMonth ? monthLabel_(topMonth.k) : '-',
                                     topMonth ? fmtID_(topMonth.q) + ' batang' : '', F.txt],
    ['Jenis defect terbanyak',       topDefect ? topDefect.k : '-',
                                     topDefect ? fmtID_(topDefect.q) + ' batang (' +
                                       (share_(topDefect.q, tot.q) * 100).toFixed(1) + '%)' : '', F.txt],
    ['Area penyumbang terbesar',     topArea ? topArea.k : '-',
                                     topArea ? fmtID_(topArea.q) + ' batang' : '', F.txt],
    ['Item paling sering reject',    topItem ? topItem.k : '-',
                                     topItem ? fmtID_(topItem.q) + ' batang' : '', F.txt]
  ];
  var kpiStart = r + 2;   // baris data pertama (judul + header di atasnya)
  r = section_(sh, r, 'INDIKATOR UTAMA',
      ['Indikator', 'Nilai', 'Keterangan'],
      kpi.map(function (x) { return [x[0], x[1], x[2]]; }),
      [F.txt, F.num, F.txt], null, W);
  kpi.forEach(function (x, i) {
    sh.getRange(kpiStart + i, 2).setNumberFormat(x[3])
      .setFontWeight('bold').setHorizontalAlignment(x[3] === F.txt ? 'left' : 'right');
  });
  sh.getRange(kpiStart, 1, kpi.length, 3).setBackground(STYLE.kpi.bg);
  sh.getRange(kpiStart, 3, kpi.length, 1).setHorizontalAlignment('left');

  var stdH = ['Keterangan', 'Jumlah (btg)', '% Batang', 'Berat (kg)', 'Nilai (Rp)', 'Kejadian'];
  var stdF = [F.txt, F.num, F.pct, F.num2, F.rp, F.num];

  /* ---- 1. Rekap per bulan ---- */
  var byMonth = aggBy_(rows, function (x) {
    return x.thn ? (x.thn + '-' + ('0' + x.bln).slice(-2)) : '(tanggal kosong)';
  }, true);
  r = section_(sh, r, '1. REKAP PER BULAN',
      ['Bulan', 'Jumlah (btg)', '% Batang', 'Berat (kg)', 'Nilai (Rp)', 'Kejadian'],
      byMonth.map(function (g) {
        return [monthLabel_(g.k), g.q, share_(g.q, tot.q), g.kg, g.rp, g.n];
      }), stdF, totalRow_(tot, rows.length), W);

  /* ---- 2. Perbandingan tahun ---- */
  if (years.length > 1) {
    var hdr = ['Metrik'].concat(years.map(String)).concat(['Δ ' + years[years.length - 1] + ' vs ' + years[years.length - 2]]);
    var mets = [
      { n: 'Jumlah reject (batang)', f: function (a) { return a.q; },  fmt: F.num },
      { n: 'Berat (kg)',             f: function (a) { return a.kg; }, fmt: F.num2 },
      { n: 'Nilai kerugian (Rp)',    f: function (a) { return a.rp; }, fmt: F.rp },
      { n: 'Jumlah kejadian',        f: function (a) { return a.n; },  fmt: F.num }
    ];
    var mat = mets.map(function (m) {
      var vals = years.map(function (y) { return m.f(totals_(rows.filter(function (x) { return x.thn === y; }))); });
      var a = vals[vals.length - 1], b = vals[vals.length - 2];
      return [m.n].concat(vals).concat([b ? (a - b) / b : '']);
    });
    var fmts = [F.txt].concat(years.map(function () { return F.num; })).concat([F.pct]);
    // format kolom nilai mengikuti metrik → diatur per baris setelah ditulis
    r = section_(sh, r, '2. PERBANDINGAN ANTAR TAHUN', hdr, mat, fmts, null, W);
    var firstDataRow = r - mat.length - 1;      // baris data pertama tabel di atas
    mets.forEach(function (m, i) {
      sh.getRange(firstDataRow + i, 2, 1, years.length).setNumberFormat(m.fmt);
    });

    // rekap per bulan per tahun
    var hdr2 = ['Bulan'].concat(years.map(String)).concat(['Δ %']);
    var mat2 = [];
    for (var b = 1; b <= 12; b++) {
      (function (bln) {
        var vals = years.map(function (y) {
          return totals_(rows.filter(function (x) { return x.thn === y && x.bln === bln; })).q;
        });
        var a2 = vals[vals.length - 1], b2 = vals[vals.length - 2];
        mat2.push([BULAN_ID[bln]].concat(vals).concat([b2 ? (a2 - b2) / b2 : '']));
      })(b);
    }
    var totYear = years.map(function (y) {
      return totals_(rows.filter(function (x) { return x.thn === y; })).q;
    });
    var ta = totYear[totYear.length - 1], tb = totYear[totYear.length - 2];
    r = section_(sh, r, '2b. JUMLAH REJECT PER BULAN PER TAHUN (batang)', hdr2, mat2, fmts,
        ['TOTAL'].concat(totYear).concat([tb ? (ta - tb) / tb : '']), W);
  }

  /* ---- 3. Pareto jenis defect ---- */
  var byDefect = aggBy_(rows, function (x) { return x.defect; });
  var cum = 0;
  r = section_(sh, r, (years.length > 1 ? '3' : '2') + '. PARETO JENIS DEFECT (prioritas perbaikan)',
      ['Jenis Defect', 'Jumlah (btg)', '% Batang', 'Kumulatif %', 'Nilai (Rp)', 'Kejadian'],
      byDefect.map(function (g) {
        cum += g.q;
        return [g.k, g.q, share_(g.q, tot.q), share_(cum, tot.q), g.rp, g.n];
      }),
      [F.txt, F.num, F.pct, F.pct, F.rp, F.num],
      ['TOTAL', tot.q, 1, '', tot.rp, rows.length], W);

  /* ---- 4-8. Rekap dimensi lain ---- */
  var dims = [
    { key: 'kat',   judul: 'KATEGORI REJECT',           label: 'Kategori Reject' },
    { key: 'asal',  judul: 'ASAL REJECT',               label: 'Asal Reject' },
    { key: 'area',  judul: 'AREA TEMUAN',               label: 'Area' },
    { key: 'week',  judul: 'REKAP PER WEEK',            label: 'Week', sortKey: true },
    { key: 'warna', judul: 'WARNA CORETAN (QUALITY)',   label: 'Warna Coretan' },
    { key: 'grup',  judul: 'GROUP UKURAN PIPA',         label: 'Group Ukuran' },
    { key: 'pic',   judul: 'PENEMU / PIC',              label: 'Nama Penemu' }
  ];
  var no = (years.length > 1 ? 4 : 3);
  dims.forEach(function (d) {
    var g = aggBy_(rows, function (x) { return x[d.key]; }, d.sortKey);
    r = section_(sh, r, no + '. ' + d.judul,
        [d.label, 'Jumlah (btg)', '% Batang', 'Berat (kg)', 'Nilai (Rp)', 'Kejadian'],
        g.map(function (x) { return [x.k, x.q, share_(x.q, tot.q), x.kg, x.rp, x.n]; }),
        stdF, totalRow_(tot, rows.length), W);
    no++;
  });

  /* ---- Top item ---- */
  var byItem = aggBy_(rows, function (x) { return x.item; });
  var top = byItem.slice(0, 15);
  r = section_(sh, r, no + '. TOP 15 ITEM PALING SERING REJECT',
      ['Nama Item', 'Jumlah (btg)', '% Batang', 'Berat (kg)', 'Nilai (Rp)', 'Kejadian'],
      top.map(function (x) { return [x.k, x.q, share_(x.q, tot.q), x.kg, x.rp, x.n]; }),
      stdF, null, W);
  no++;

  /* ---- Catatan kualitas data ---- */
  var iss = data.issues || {};
  var noteRows = [
    ['Baris terbaca dari sheet ' + CONFIG.SHEET_DATA, iss.total || 0],
    ['Jumlah reject tidak terbaca sebagai angka (dihitung 0)', iss.qtyInvalid || 0],
    ['Tanggal tidak valid / kosong', iss.tanggalInvalid || 0],
    ['Artikel tidak ditemukan di sheet ' + CONFIG.SHEET_MASTER, iss.artikelTakDikenal || 0],
    ['Item Master dengan berat/btg rusak', data.masterIssues || 0]
  ];
  r = section_(sh, r, no + '. CATATAN KUALITAS DATA (perlu dirapikan di sheet sumber)',
      ['Temuan', 'Jumlah baris'], noteRows, [F.txt, F.num], null, W);
  sh.getRange(r - noteRows.length - 1, 1, noteRows.length, 2).setBackground(STYLE.note.bg);

  /* ---- Rapikan tampilan ---- */
  sh.setColumnWidth(1, 260);
  for (var c2 = 2; c2 <= W; c2++) sh.setColumnWidth(c2, 118);
  sh.setFrozenRows(2);
  try { sh.setTabColor('#1e293b'); } catch (e) {}
  sh.getRange(1, 1, sh.getMaxRows(), W).setFontFamily('Arial').setFontSize(10);
  sh.getRange(1, 1, 1, W).setFontSize(14);
  SpreadsheetApp.flush();

  try {
    SpreadsheetApp.getUi().alert('Sheet ' + CONFIG.SHEET_SUMMARY + ' selesai diperbarui.\n\n' +
      'Total ' + fmtID_(tot.q) + ' batang · ' + fmtID_(Math.round(tot.kg)) + ' kg · Rp ' +
      fmtID_(Math.round(tot.rp)) + '\nPeriode: ' + per);
  } catch (e) {}
  return true;
}

/** Tulis satu blok tabel: judul + header + isi + (opsional) baris total. */
function section_(sh, r, title, headers, matrix, formats, totalRow, W) {
  var n = headers.length;
  sh.getRange(r, 1, 1, Math.max(n, W)).merge().setValue(title)
    .setBackground(STYLE.section.bg).setFontColor(STYLE.section.font)
    .setFontWeight('bold').setFontSize(11).setVerticalAlignment('middle');
  sh.setRowHeight(r, 24);
  r++;

  sh.getRange(r, 1, 1, n).setValues([headers])
    .setBackground(STYLE.header.bg).setFontColor(STYLE.header.font)
    .setFontWeight('bold').setHorizontalAlignment('center').setWrap(true);
  var headRow = r;
  r++;

  if (!matrix.length) matrix = [['(belum ada data)'].concat(new Array(n - 1).fill(''))];
  sh.getRange(r, 1, matrix.length, n).setValues(matrix);
  for (var c = 0; c < n; c++) {
    sh.getRange(r, c + 1, matrix.length, 1).setNumberFormat(formats[c] || F.txt);
    if (c > 0) sh.getRange(r, c + 1, matrix.length, 1).setHorizontalAlignment('right');
  }
  // baris selang-seling supaya mudah dibaca
  for (var i = 0; i < matrix.length; i += 2) {
    sh.getRange(r + i, 1, 1, n).setBackground('#f8fafc');
  }
  var dataRows = matrix.length;
  r += dataRows;

  if (totalRow) {
    sh.getRange(r, 1, 1, n).setValues([totalRow.slice(0, n)])
      .setBackground(STYLE.total.bg).setFontWeight('bold');
    for (var c3 = 0; c3 < n; c3++) {
      sh.getRange(r, c3 + 1).setNumberFormat(formats[c3] || F.txt);
      if (c3 > 0) sh.getRange(r, c3 + 1).setHorizontalAlignment('right');
    }
    r++;
  }
  sh.getRange(headRow, 1, r - headRow, n)
    .setBorder(true, true, true, true, true, true, '#cbd5e1', null);
  return r + 1;   // satu baris kosong sebagai jarak
}

var BULAN_ID = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function totals_(rows) {
  var t = { q: 0, kg: 0, rp: 0, n: rows.length };
  rows.forEach(function (r) { t.q += r.qty; t.kg += r.kg; t.rp += r.rp; });
  t.kg = round_(t.kg, 2);
  return t;
}

function totalRow_(tot, n) {
  return ['TOTAL', tot.q, 1, tot.kg, tot.rp, n];
}

function share_(a, b) { return b ? a / b : 0; }

/** Kelompokkan baris. sortByKey=true → urut nama kunci, selain itu urut jumlah terbesar. */
function aggBy_(rows, keyFn, sortByKey) {
  var m = {};
  rows.forEach(function (r) {
    var k = keyFn(r);
    if (k === null || k === undefined || k === '') k = '(kosong)';
    if (!m[k]) m[k] = { k: k, q: 0, kg: 0, rp: 0, n: 0 };
    m[k].q += r.qty; m[k].kg += r.kg; m[k].rp += r.rp; m[k].n++;
  });
  var arr = Object.keys(m).map(function (k) {
    m[k].kg = round_(m[k].kg, 2); return m[k];
  });
  arr.sort(sortByKey
    ? function (a, b) { return a.k > b.k ? 1 : a.k < b.k ? -1 : 0; }
    : function (a, b) { return b.q - a.q; });
  return arr;
}

function monthLabel_(k) {
  var p = String(k).split('-');
  if (p.length < 2) return k;
  return (BULAN_ID[+p[1]] || p[1]) + ' ' + p[0];
}

function periode_(rows) {
  var t = rows.map(function (r) { return r.tgl; }).filter(String).sort();
  if (!t.length) return '(belum ada tanggal valid)';
  return t[0] + ' s/d ' + t[t.length - 1];
}

function fmtID_(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/* ============================================================
 *  5. HELPER
 * ========================================================== */

function toNumber_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  if (v instanceof Date) return null;
  var s = String(v).replace(/[^\d,.\-]/g, '').trim();
  if (!s) return null;
  // format Indonesia: 1.234,56  -> 1234.56
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  var n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseRupiah_(v) {
  var n = toNumber_(v);
  return n === null ? 0 : n;
}

/** Normalisasi berat jadi KG (Master campur gram & kg, ada juga sel rusak jadi tanggal). */
function toBeratKg_(v) {
  if (v instanceof Date) return null;            // sel rusak (mis. "28/3" terbaca tanggal)
  var n = toNumber_(v);
  if (n === null || n <= 0) return null;
  return n > CONFIG.BERAT_GRAM_THRESHOLD ? n / 1000 : n;
}

function toArticle_(v) {
  if (v === null || v === undefined || v === '') return '';
  var s = (typeof v === 'number') ? v.toFixed(0) : String(v).trim();
  s = s.replace(/\.0+$/, '').replace(/[^\d]/g, '');
  return s;
}

function parseDate_(v) {
  if (!v && v !== 0) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === 'number') {                    // serial number spreadsheet
    var base = new Date(Date.UTC(1899, 11, 30));
    return new Date(base.getTime() + v * 86400000);
  }
  var s = String(v).trim();
  var m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);   // dd/MM/yyyy
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);                   // yyyy-MM-dd
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** "Minggu Awal (Week 1)" -> "Week 1"; kalau kosong dihitung dari tanggal. */
function weekLabel_(v, d) {
  var s = String(v || '');
  var m = s.match(/(\d)/);
  if (m) return 'Week ' + m[1];
  if (d) return 'Week ' + Math.min(5, Math.ceil(d.getDate() / 7));
  return '(kosong)';
}

function clean_(v, label) {
  var s = String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim();
  if (!s) return '(kosong)';
  return s;
}

function cleanWarna_(v) {
  var s = String(v || '').replace(/\s+/g, ' ').trim();
  if (!s) return '(kosong)';
  // pisah multi-pilihan, buang duplikat, urutkan
  var parts = s.split(',').map(function (x) { return x.trim(); }).filter(String);
  var seen = {}, out = [];
  parts.forEach(function (p) {
    var k = p.toUpperCase();
    if (!seen[k]) { seen[k] = 1; out.push(p); }
  });
  return out.join(', ') || '(kosong)';
}

function round_(n, d) {
  var f = Math.pow(10, d || 0);
  return Math.round(n * f) / f;
}

function nowStr_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd MMM yyyy HH:mm');
}
