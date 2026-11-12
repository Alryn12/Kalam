/**
 * Titik Masuk Utama Aplikasi Siswa Kalām (situs/js/app.js)
 * Tugas M1-A: TB-M1-01
 * Acuan: SRS-1 bagian 3 & 8; SRS-3 aturan umum UM; BP-1 & BP-6; docs/DESAIN.md
 */

import { bukaDb } from './antrean.js';
import {
  muatSesiLokal,
  muatKontenAwal,
  ambilTeks,
  ambilState
} from './state.js';
import { prosesAntreanLatar } from './api.js';
import {
  DAFTAR_ID_LAYAR_SISWA,
  SEMUA_ID_LAYAR_APLIKASI,
  daftarkanLayar,
  aturPerenderBawaan,
  mulaiRouter,
  arahKe
} from './router.js';

/**
 * Keterangan singkat nama layar dari BP-1 untuk mendampingi judul dari teks-ui.json
 */
const NAMA_RINGKAS_BP1 = {
  'S-01': 'Masuk',
  'S-02': 'Beranda',
  'S-03': 'Isi Unit',
  'S-10': 'Pengantar dan Janji Aman',
  'S-11': 'Cek Perangkat',
  'S-12': 'Cek Ketenangan Tempat',
  'S-13': 'Tes Baca (Dengar dan Ketuk)',
  'S-14': 'Kenyamananku',
  'S-15': 'Skala Keberanian',
  'S-16': 'Di Luar Pelajaran',
  'S-17': 'Suara Hari Pertama / Hari Ini',
  'S-18': 'Ketegangan',
  'S-19': 'Penutup Tahap 0',
  'S-20': 'Sesi 1 · Tonton',
  'S-21': 'Sesi 1 · Kata Kunci',
  'S-22': 'Sesi 1 · Tiru',
  'S-23': 'Sesi 1 · Rekam',
  'S-24': 'Sesi 1 · Refleksi',
  'S-30': 'Sesi 2 · Pemanasan',
  'S-31': 'Sesi 2 · Level 1 Ikut',
  'S-32': 'Sesi 2 · Level 2 Dengar-Balas',
  'S-33': 'Sesi 2 & 3 · Level 3 Kunci',
  'S-34': 'Dengar Pasangan',
  'S-35': 'Penutup Level',
  'S-36': 'Sesi 2 · Refleksi',
  'S-37': 'Blok Selesai',
  'S-40': 'Sesi 3 · Pengantar',
  'S-41': 'Sesi 3 · Ringkasan Putaran',
  'S-42': 'Kesiapan Bertemu Guru',
  'S-43': 'Misi Muhimmah (Level 4)',
  'S-44': 'Serahkan HP ke Guru',
  'S-45': 'Ketegangan Sesudah Setoran',
  'S-46': 'Unit Selesai',
  'S-50': 'Misi Keluarga',
  'S-51': 'Catatan Pakai',
  'S-52': 'Poin Partisipasiku',
  'S-60': 'Aku Bisa',
  'S-61': 'Grafik Perjalanan',
  'S-62': 'Kartu Kemajuan',
  'S-70': 'Dulu dan Sekarang',
  'S-71': 'Grafik Keberanian',
  'S-72': 'Refleksi Akhir',
  'S-73': 'Tahap After Selesai',
  'S-90': 'Status Pengiriman',
  'S-91': 'Pesan Sistem',
  'G-01': 'Setoran · Skrip Guru',
  'G-02': 'Setoran · Rubrik dan Catatan',
  'G-03': 'Setoran · Kata Kunci Unit'
};

/**
 * Mengambil judul layar dari teks-ui.json (BP-6) untuk layar S-xx atau G-0x
 */
function ambilJudulLayar(idLayar) {
  const state = ambilState();
  const dataContoh = {
    nama_panggilan: state.nama_panggilan || 'Teman',
    nama_unit: 'Unit 1 · Perkenalan',
    kode_siswa: state.kode_siswa || 'S001'
  };

  let judul =
    ambilTeks(idLayar, 'judul', dataContoh) ||
    ambilTeks(idLayar, 'judul_t0', dataContoh) ||
    ambilTeks(idLayar, 'judul_tab', dataContoh) ||
    ambilTeks(idLayar, 'pertanyaan', dataContoh) ||
    ambilTeks(idLayar, 'sapaan', dataContoh) ||
    NAMA_RINGKAS_BP1[idLayar] ||
    idLayar;

  return judul;
}

/**
 * Merender satu layar kosong (judul saja) untuk setiap layar S-xx sesuai TB-M1-01
 */
function renderLayarKosong({ idLayar }) {
  const wadah = document.getElementById('akar-aplikasi');
  if (!wadah) return;

  const terdaftar = SEMUA_ID_LAYAR_APLIKASI.includes(idLayar);
  const kodeTampil = terdaftar ? idLayar : 'S-01';
  const judulLayar = ambilJudulLayar(kodeTampil);
  const sublabelBp1 = NAMA_RINGKAS_BP1[kodeTampil] || '';

  const indeksSekarang = DAFTAR_ID_LAYAR_SISWA.indexOf(kodeTampil);
  const idSebelum =
    indeksSekarang > 0
      ? DAFTAR_ID_LAYAR_SISWA[indeksSekarang - 1]
      : DAFTAR_ID_LAYAR_SISWA[DAFTAR_ID_LAYAR_SISWA.length - 1];
  const idBerikut =
    indeksSekarang >= 0 && indeksSekarang < DAFTAR_ID_LAYAR_SISWA.length - 1
      ? DAFTAR_ID_LAYAR_SISWA[indeksSekarang + 1]
      : DAFTAR_ID_LAYAR_SISWA[0];

  const opsiSelect = SEMUA_ID_LAYAR_APLIKASI.map((id) => {
    const dipilih = id === kodeTampil ? 'selected' : '';
    const judulOpsi = ambilJudulLayar(id);
    return `<option value="${id}" ${dipilih}>${id} — ${judulOpsi}</option>`;
  }).join('');

  wadah.innerHTML = `
    <section class="kartu" aria-labelledby="judul-utama-layar">
      <div class="daftar-status" style="margin-bottom: var(--jarak-2);">
        <span class="penanda-status penanda-status--terdeteksi">
          <span class="penanda-status__ikon" aria-hidden="true">✓</span>
          <span>Layar ${kodeTampil}</span>
        </span>
        <span class="teks-keterangan">${sublabelBp1}</span>
      </div>
      <h1 id="judul-utama-layar" class="judul-layar">${judulLayar}</h1>
    </section>

    <nav class="kartu" aria-label="Navigasi kerangka layar S-xx">
      <div class="kelompok-input">
        <label class="label-input" for="pemilih-layar-kerangka">Pilih layar kerangka (${DAFTAR_ID_LAYAR_SISWA.length} layar S-xx + 3 layar G-0x)</label>
        <select id="pemilih-layar-kerangka" class="input-teks">
          ${opsiSelect}
        </select>
      </div>
      <div class="baris-tombol" style="margin-top: var(--jarak-3);">
        <button type="button" id="tombol-layar-berikut" class="tombol tombol--utama">
          Layar berikutnya (${idBerikut})
        </button>
        <button type="button" id="tombol-layar-sebelum" class="tombol tombol--sekunder">
          Layar sebelumnya (${idSebelum})
        </button>
      </div>
    </nav>
  `;

  document.title = `${kodeTampil} · ${judulLayar} — Kalām`;

  const pemilih = document.getElementById('pemilih-layar-kerangka');
  if (pemilih) {
    pemilih.addEventListener('change', (e) => {
      arahKe(e.target.value);
    });
  }

  const btnBerikut = document.getElementById('tombol-layar-berikut');
  if (btnBerikut) {
    btnBerikut.addEventListener('click', () => arahKe(idBerikut));
  }

  const btnSebelum = document.getElementById('tombol-layar-sebelum');
  if (btnSebelum) {
    btnSebelum.addEventListener('click', () => arahKe(idSebelum));
  }
}

/**
 * Inisialisasi aplikasi saat halaman dibuka
 */
async function inisialisasiAplikasi() {
  const wadah = document.getElementById('akar-aplikasi');
  try {
    await bukaDb();
    await muatSesiLokal();
    await muatKontenAwal();

    // Daftarkan seluruh layar S-xx dan G-01..G-03 ke perender layar kosong (TB-M1-01)
    SEMUA_ID_LAYAR_APLIKASI.forEach((idLayar) => {
      daftarkanLayar(idLayar, renderLayarKosong);
    });
    aturPerenderBawaan(renderLayarKosong);

    // Jalankan router hash
    const state = ambilState();
    const layarAwal = state.token ? 'S-02' : 'S-01';
    mulaiRouter(layarAwal);

    // Jadwalkan pengurasan antrean saat online dan saat aplikasi dibuka
    window.addEventListener('online', () => {
      prosesAntreanLatar();
    });
    prosesAntreanLatar();
  } catch (err) {
    console.error('[Log Teknis Kalām] Kendala inisialisasi awal:', err);
    if (wadah) {
      wadah.innerHTML = `
        <section class="kartu">
          <h1 class="judul-layar">Pesan sistem</h1>
          <p class="teks-instruksi">Aplikasi sedang menyiapkan tampilan. Silakan muat ulang halaman ini.</p>
          <div class="baris-tombol">
            <button type="button" class="tombol tombol--utama" onclick="window.location.reload()">Muat ulang</button>
          </div>
        </section>
      `;
    }
  }
}

document.addEventListener('DOMContentLoaded', inisialisasiAplikasi);
