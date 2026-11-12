/**
 * Pengelola State Klien, Cache Status, & Pemuat Konten Awal (situs/js/state.js)
 * Tugas M1-A: TB-M1-01
 * Acuan: SRS-1 bagian 4, 8, 9; SRS-2 bagian 1; SRS-3 FR-001, FR-070, FR-080, FR-084
 */

import { ambilSesi, simpanSesi, hapusSesi } from './antrean.js';

const BATAS_CACHE_STATUS_MD = 60 * 1000; // 60 detik sesuai SRS-1 §9 & FR-084

const stateAplikasi = {
  siap: false,
  kode_siswa: '',
  nama_panggilan: '',
  token: '',
  nomor_klien: 0,
  fase_aktif: 'T0',
  unit_aktif: 'U1',
  blok_aktif: 'U1-BA',
  status_server: null,
  waktu_status_dibaca: 0,
  teks_ui: {},
  parameter: {},
  cache_konten: {}
};

/**
 * Memuat data sesi yang tersimpan di IndexedDB saat aplikasi dibuka
 */
export async function muatSesiLokal() {
  try {
    const sesiTersimpan = await ambilSesi('sesi_siswa');
    if (sesiTersimpan && typeof sesiTersimpan === 'object') {
      stateAplikasi.kode_siswa = sesiTersimpan.kode_siswa || '';
      stateAplikasi.nama_panggilan = sesiTersimpan.nama_panggilan || '';
      stateAplikasi.token = sesiTersimpan.token || '';
      stateAplikasi.nomor_klien = Number(sesiTersimpan.nomor_klien || 0);
      if (sesiTersimpan.status_server) {
        stateAplikasi.status_server = sesiTersimpan.status_server;
        stateAplikasi.waktu_status_dibaca = Number(sesiTersimpan.waktu_status_dibaca || 0);
      }
    }
  } catch (_) {
    // Jika IndexedDB belum berisi sesi, biarkan kosong
  }
  return stateAplikasi;
}

/**
 * Menyimpan perubahan sesi (token, kode_siswa, nama_panggilan) ke IndexedDB
 */
export async function simpanSesiSiswa({ kode_siswa, nama_panggilan, token, status_server }) {
  if (kode_siswa !== undefined) stateAplikasi.kode_siswa = String(kode_siswa || '').trim().toUpperCase();
  if (nama_panggilan !== undefined) stateAplikasi.nama_panggilan = String(nama_panggilan || '').trim();
  if (token !== undefined) stateAplikasi.token = String(token || '').trim();
  if (status_server !== undefined) {
    stateAplikasi.status_server = status_server;
    stateAplikasi.waktu_status_dibaca = Date.now();
  }
  await simpanSesi('sesi_siswa', {
    kode_siswa: stateAplikasi.kode_siswa,
    nama_panggilan: stateAplikasi.nama_panggilan,
    token: stateAplikasi.token,
    nomor_klien: stateAplikasi.nomor_klien,
    status_server: stateAplikasi.status_server,
    waktu_status_dibaca: stateAplikasi.waktu_status_dibaca
  });
}

/**
 * Menghapus token saat keluar atau E_TOKEN (SRS-3 §1.1: nama panggilan tetap disimpan)
 */
export async function hapusTokenSesi(pertahankanNama = true) {
  stateAplikasi.token = '';
  stateAplikasi.status_server = null;
  stateAplikasi.waktu_status_dibaca = 0;
  if (!pertahankanNama) {
    stateAplikasi.kode_siswa = '';
    stateAplikasi.nama_panggilan = '';
    await hapusSesi('sesi_siswa');
    return;
  }
  await simpanSesi('sesi_siswa', {
    kode_siswa: stateAplikasi.kode_siswa,
    nama_panggilan: stateAplikasi.nama_panggilan,
    token: '',
    nomor_klien: stateAplikasi.nomor_klien,
    status_server: null,
    waktu_status_dibaca: 0
  });
}

/**
 * Membuat id_idempoten unik sesuai SRS-2 §1: {kode}.{waktu_ms}.{nomor_klien}
 */
export function buatIdIdempoten(kodeKhusus) {
  stateAplikasi.nomor_klien = (stateAplikasi.nomor_klien || 0) + 1;
  const kode = String(kodeKhusus || stateAplikasi.kode_siswa || 'S000').trim().toUpperCase();
  return `${kode}.${Date.now()}.${stateAplikasi.nomor_klien}`;
}

/**
 * Memeriksa apakah cache status server 60 detik masih berlaku
 */
export function apakahStatusCacheSegar() {
  if (!stateAplikasi.status_server || !stateAplikasi.waktu_status_dibaca) return false;
  return Date.now() - stateAplikasi.waktu_status_dibaca < BATAS_CACHE_STATUS_MD;
}

/**
 * Memperbarui status server di memori dan IndexedDB
 */
export async function perbaruiStatusServer(statusBaru) {
  if (!statusBaru || typeof statusBaru !== 'object') return;
  stateAplikasi.status_server = statusBaru;
  stateAplikasi.waktu_status_dibaca = Date.now();
  await simpanSesiSiswa({ status_server: statusBaru });
}

/**
 * Pemuat berkas JSON dari folder konten/ dengan cache memori (FR-080)
 */
export async function muatKontenJson(jalur) {
  if (stateAplikasi.cache_konten[jalur]) {
    return stateAplikasi.cache_konten[jalur];
  }
  const resp = await fetch(jalur, { cache: 'no-cache' });
  if (!resp.ok) {
    throw new Error(`Tidak dapat memuat berkas konten: ${jalur} (${resp.status})`);
  }
  const data = await resp.json();
  stateAplikasi.cache_konten[jalur] = data;
  return data;
}

/**
 * Memuat katalog teks antarmuka (konten/umum/teks-ui.json) dan parameter awal (konten/umum/parameter.json)
 */
export async function muatKontenAwal() {
  const [teksUi, parameter] = await Promise.all([
    muatKontenJson('konten/umum/teks-ui.json'),
    muatKontenJson('konten/umum/parameter.json').catch(() => ({}))
  ]);
  stateAplikasi.teks_ui = teksUi || {};
  stateAplikasi.parameter = parameter || {};
  stateAplikasi.siap = true;
  return { teksUi: stateAplikasi.teks_ui, parameter: stateAplikasi.parameter };
}

/**
 * Mengambil teks dari teks-ui.json berdasarkan kunci "{layar}.{elemen}" atau (layar, elemen)
 * serta menyisipkan nilai {placeholder} bila diberikan.
 */
export function ambilTeks(kunciAtauLayar, elemenAtauData, dataPengganti) {
  let idLayar = '';
  let namaElemen = '';
  let parameterSisip = null;

  if (typeof elemenAtauData === 'string') {
    idLayar = kunciAtauLayar;
    namaElemen = elemenAtauData;
    parameterSisip = dataPengganti || null;
  } else {
    const bagian = String(kunciAtauLayar || '').split('.');
    idLayar = bagian[0] || '';
    namaElemen = bagian.slice(1).join('.') || 'judul';
    parameterSisip = elemenAtauData || null;
  }

  const kelompokLayar = stateAplikasi.teks_ui[idLayar] || {};
  let kalimat = kelompokLayar[namaElemen];
  if (kalimat === undefined) {
    kalimat = stateAplikasi.teks_ui[`${idLayar}.${namaElemen}`] || '';
  }

  if (parameterSisip && typeof parameterSisip === 'object' && kalimat) {
    Object.keys(parameterSisip).forEach((k) => {
      const nilai = parameterSisip[k] != null ? String(parameterSisip[k]) : '';
      kalimat = kalimat.replace(new RegExp(`\\{${k}\\}`, 'g'), nilai);
    });
  }
  return kalimat;
}

export function ambilState() {
  return stateAplikasi;
}
