/**
 * Klien Komunikasi Server kalam-api (situs/js/api.js)
 * Tugas M1-A: TB-M1-01
 * Acuan: SRS-1 bagian 3 & 9; SRS-3 bagian 1, FR-073, FR-084
 */

import { KALAM_CONFIG } from './config.js';
import {
  ambilState,
  buatIdIdempoten,
  hapusTokenSesi,
  perbaruiStatusServer
} from './state.js';
import {
  ambilSemuaAntrean,
  perbaruiStatusAntrean
} from './antrean.js';

const JEDA_COBA_ULANG_DETIK = [2, 5, 15]; // SRS-3 bagian 1: jeda 2, 5, 15 detik
let hitungGalatServerBerturut = 0;
const pendengarAntrean = new Set();

export function langgananPerubahanAntrean(fn) {
  if (typeof fn === 'function') pendengarAntrean.add(fn);
  return () => pendengarAntrean.delete(fn);
}

function beritahuPerubahanAntrean() {
  pendengarAntrean.forEach((fn) => {
    try { fn(); } catch (_) {}
  });
}

function tungguMd(md) {
  return new Promise((selesai) => setTimeout(selesai, md));
}

function tungguOnline() {
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    return Promise.resolve();
  }
  return new Promise((selesai) => {
    const saatOnline = () => {
      window.removeEventListener('online', saatOnline);
      selesai();
    };
    window.addEventListener('online', saatOnline, { once: true });
  });
}

/**
 * Mengirim satu permintaan POST text/plain berisi JSON ke kalam-api
 * dengan percobaan ulang otomatis (2, 5, 15 detik, lalu menunggu event online)
 * untuk kendala jaringan, E_SIBUK, dan E_SERVER (SRS-3 bagian 1).
 */
export async function panggilApi(aksi, data = {}, opsi = {}) {
  const url = (KALAM_CONFIG && KALAM_CONFIG.API_URL ? KALAM_CONFIG.API_URL : '').trim();
  if (!url) {
    return {
      ok: false,
      galat: 'E_SERVER',
      pesan: 'Alamat server kalam-api belum diisi pada js/config.js.'
    };
  }

  const state = ambilState();
  const token = opsi.token !== undefined ? opsi.token : (state.token || '');
  const idIdempoten = opsi.id_idempoten || buatIdIdempoten(data.kode || state.kode_siswa);

  const muatan = {
    aksi,
    token,
    id_idempoten: idIdempoten,
    data: data || {}
  };
  const badanJson = JSON.stringify(muatan);

  let indeksCoba = 0;
  const maksCoba = opsi.tanpaUlang ? 1 : (JEDA_COBA_ULANG_DETIK.length + 1);

  while (indeksCoba < maksCoba) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: badanJson
      });

      const teks = await resp.text();
      let hasil = null;
      try {
        hasil = JSON.parse(teks);
      } catch (_) {
        hasil = { ok: false, galat: 'E_SERVER', pesan: 'Respons server belum dapat dibaca.' };
      }

      if (hasil && hasil.ok) {
        hitungGalatServerBerturut = 0;
        if (hasil.data && hasil.data.status && typeof hasil.data.status === 'object') {
          await perbaruiStatusServer(hasil.data.status);
        }
        return hasil;
      }

      const kodeGalat = hasil && hasil.galat ? hasil.galat : 'E_SERVER';

      // Penanganan kode galat khusus sesuai SRS-3 bagian 1.1
      if (kodeGalat === 'E_TOKEN') {
        await hapusTokenSesi(true);
        if (typeof window !== 'undefined' && !opsi.janganArahkan) {
          window.location.hash = '#/s-01';
        }
        return hasil;
      }

      if (kodeGalat === 'E_PERSETUJUAN' && typeof window !== 'undefined' && !opsi.janganArahkan) {
        window.location.hash = '#/s-10';
        return hasil;
      }

      if (kodeGalat === 'E_TERKUNCI' && typeof window !== 'undefined' && !opsi.janganArahkan) {
        window.location.hash = '#/s-91?jenis=belum_terbuka&tujuan=S-03';
        return hasil;
      }

      // Hanya ulangi otomatis pada E_SIBUK dan E_SERVER
      if (kodeGalat !== 'E_SIBUK' && kodeGalat !== 'E_SERVER') {
        return hasil;
      }

      hitungGalatServerBerturut += 1;
      if (hitungGalatServerBerturut >= 5 && typeof window !== 'undefined' && !opsi.janganArahkan && !opsi.latar) {
        window.location.hash = '#/s-91?jenis=internet';
      }

      if (indeksCoba < JEDA_COBA_ULANG_DETIK.length) {
        await tungguMd(JEDA_COBA_ULANG_DETIK[indeksCoba] * 1000);
        indeksCoba += 1;
        continue;
      }

      // Setelah jeda 2, 5, 15 detik habis, jika offline tunggu online sekali lagi
      if (typeof navigator !== 'undefined' && !navigator.onLine && !opsi.tanpaTungguOnline) {
        await tungguOnline();
        opsi.tanpaTungguOnline = true;
        continue;
      }

      return hasil;
    } catch (_) {
      hitungGalatServerBerturut += 1;
      // Kendala jaringan / fetch terputus
      if (indeksCoba < JEDA_COBA_ULANG_DETIK.length && !opsi.tanpaUlang) {
        await tungguMd(JEDA_COBA_ULANG_DETIK[indeksCoba] * 1000);
        indeksCoba += 1;
        continue;
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine && !opsi.tanpaTungguOnline && !opsi.tanpaUlang) {
        await tungguOnline();
        opsi.tanpaTungguOnline = true;
        continue;
      }

      return {
        ok: false,
        galat: 'E_SERVER',
        pesan: 'Internet belum terhubung. Hasilmu tetap tersimpan di HP dan akan dikirim saat internet kembali.'
      };
    }
  }

  return {
    ok: false,
    galat: 'E_SERVER',
    pesan: 'Permintaan belum terkirim. Silakan coba kembali.'
  };
}

let sedangKurasAntrean = false;

/**
 * Mengirim ulang item berstatus Menunggu di IndexedDB secara berurutan
 * dengan jeda acak 0-3 detik (SRS-3 FR-073).
 */
export async function prosesAntreanLatar(opsi = {}) {
  if (sedangKurasAntrean) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  const state = ambilState();
  if (!state.token) return;

  sedangKurasAntrean = true;
  try {
    const daftar = await ambilSemuaAntrean();
    const menunggu = daftar.filter((item) => item.status !== 'Terkirim');

    for (const item of menunggu) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) break;

      const jedaAcakMd = opsi.langsung ? 0 : Math.floor(Math.random() * 3000);
      if (jedaAcakMd > 0) await tungguMd(jedaAcakMd);

      const percobaanBaru = (item.percobaan_kirim || 0) + 1;
      await perbaruiStatusAntrean(item.id_idempoten, {
        status: 'Mengirim',
        percobaan_kirim: percobaanBaru
      });
      beritahuPerubahanAntrean();

      const hasil = await panggilApi(item.aksi, item.data, {
        id_idempoten: item.id_idempoten,
        tanpaTungguOnline: true,
        tanpaUlang: Boolean(opsi.tanpaUlangDalam),
        janganArahkan: true,
        latar: true
      });

      if (hasil && hasil.ok) {
        // FR-073: Terkirim ✓ hanya setelah server menjawab; lalu salinan lokal (base64 audio) dihapus
        const dataRingkas = item.data && typeof item.data === 'object'
          ? {
            jenis: item.data.jenis || undefined,
            unit: item.data.unit || undefined,
            id_kartu: item.data.id_kartu || undefined,
            bagian: item.data.bagian || undefined,
            tahap: item.data.tahap || undefined,
            aspek: item.data.aspek || undefined
          }
          : {};
        await perbaruiStatusAntrean(item.id_idempoten, {
          status: 'Terkirim',
          data: dataRingkas,
          pesan_terakhir: ''
        });
      } else {
        await perbaruiStatusAntrean(item.id_idempoten, {
          status: 'Menunggu',
          pesan_terakhir: hasil && hasil.pesan ? hasil.pesan : ''
        });
      }
      beritahuPerubahanAntrean();
    }
  } finally {
    sedangKurasAntrean = false;
    beritahuPerubahanAntrean();
  }
}
