/* Jembatan ke backend Apps Script.
   URL diambil dari variabel lingkungan Netlify (VITE_API_URL). */

import { dataContoh } from './lib/demo.js';

const API_URL = import.meta.env.VITE_API_URL || '';
const API_KEY = import.meta.env.VITE_API_KEY || '';

function bangunUrl(refresh) {
  const u = new URL(API_URL);
  if (API_KEY) u.searchParams.set('key', API_KEY);
  if (refresh) u.searchParams.set('refresh', '1');
  u.searchParams.set('t', Date.now().toString());   // hindari cache browser
  return u.toString();
}

/**
 * Ambil dataset dari Apps Script.
 * Kalau VITE_API_URL belum diisi, kembalikan data contoh supaya
 * tampilan tetap bisa dikembangkan secara lokal.
 */
export async function ambilData(refresh = false) {
  if (!API_URL) return dataContoh();

  const res = await fetch(bangunUrl(refresh), { method: 'GET', redirect: 'follow' });
  if (!res.ok) throw new Error(`Server membalas ${res.status}`);

  const teks = await res.text();
  let data;
  try {
    data = JSON.parse(teks);
  } catch {
    // Biasanya terjadi kalau Web App belum di-set "Anyone" sehingga
    // yang terkirim adalah halaman login Google, bukan JSON.
    throw new Error('Balasan bukan JSON. Pastikan Web App di-deploy dengan akses "Anyone".');
  }
  if (data.ok === false) throw new Error(data.error || 'Permintaan ditolak server.');
  return data;
}
