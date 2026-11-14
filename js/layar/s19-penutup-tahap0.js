/**
 * Layar S-19: Penutup Tahap 0 (situs/js/layar/s19-penutup-tahap0.js)
 * Tugas M1-E: TB-M1-07
 * Acuan: SRS-3 FR-013, R-01; IN-1 §3.8 (PN-01); BP-1 S-19; BP-6 S-19; docs/KEPUTUSAN.md SL-BARU-01
 *
 * Catatan SL-BARU-01 (docs/KEPUTUSAN.md):
 * Empat kalimat penyelamat dipindahkan ke awal Unit 1 Sesi 1 dan TIDAK ditampilkan di S-19.
 */

import { panggilApi, prosesAntreanLatar } from '../api.js';
import { arahKe } from '../router.js';
import { ambilState, ambilTeks, perbaruiStatusServer } from '../state.js';
import {
  ambilHasilSuaraS17,
  escapeHtml,
  hapusKemajuanTahap0,
  kirimAtauAntre,
  siapkanWadahLayar,
  waktuIsoWib
} from './tahap0-bantu.js';

export async function renderS19() {
  const judul = ambilTeks('S-19', 'judul') || 'Kamu sudah berani memulai';
  const wadah = siapkanWadahLayar('S-19', judul);
  if (!wadah) return;

  const infoSuara = await ambilHasilSuaraS17('T0');
  const apakahMelewati = Boolean(infoSuara && Number(infoSuara.dilewati) === 1);

  const pesanMerekam = ambilTeks('S-19', 'pesan') ||
    'Kamu sudah merekam suara pertamamu. Nanti kamu akan mendengarnya lagi bersama suara barumu.';
  const pesanLewati = ambilTeks('S-19', 'pesan_lewati') ||
    'Terima kasih sudah mencoba. Kamu bisa mulai dari sini. Unit 1 sekarang terbuka.';
  const teksTombol = ambilTeks('S-19', 'tombol') || 'Mulai Unit 1';

  let sedangKirim = false;
  let pesanInfo = '';

  function gambar() {
    wadah.innerHTML = `
      <section class="kartu" aria-labelledby="judul-s19">
        <div class="daftar-status">
          <span class="penanda-status penanda-status--terdeteksi">
            <span class="penanda-status__ikon" aria-hidden="true">&#10003;</span>
            <span>Langkah Awal Selesai</span>
          </span>
        </div>

        <h1 id="judul-s19" class="judul-layar">${escapeHtml(judul)}</h1>

        <div class="pesan-hangat">
          <p class="pesan-hangat__isi" style="font-size: var(--ukuran-teks-subjudul);">
            ${escapeHtml(apakahMelewati ? pesanLewati : pesanMerekam)}
          </p>
          ${!apakahMelewati ? `
            <p class="teks-keterangan" style="margin: var(--jarak-2) 0 0 0; font-weight: 600;">
              Unit 1 sekarang terbuka.
            </p>
          ` : ''}
        </div>

        ${pesanInfo ? `
          <div class="pesan-hangat pesan-hangat--aksen" role="status" aria-live="polite">
            <p class="pesan-hangat__isi">${escapeHtml(pesanInfo)}</p>
          </div>
        ` : ''}

        <button type="button" id="tombol-mulai-u1-s19" class="tombol tombol--utama" ${sedangKirim ? 'disabled' : ''}>
          ${escapeHtml(sedangKirim ? 'Membuka Unit 1…' : teksTombol)}
        </button>
      </section>
    `;

    const btnMulai = document.getElementById('tombol-mulai-u1-s19');
    if (btnMulai) {
      btnMulai.addEventListener('click', selesaikanTahap0);
    }
  }

  async function selesaikanTahap0() {
    if (sedangKirim) return;
    sedangKirim = true;
    pesanInfo = '';
    gambar();

    try {
      await prosesAntreanLatar({ langsung: true, tanpaUlangDalam: true });
    } catch (_) {}

    let hasil = await panggilApi('tahap0_selesai', {}, {
      tanpaTungguOnline: true,
      janganArahkan: true
    });

    // Jika S-18 belum sempat tercatat di server (E_URUTAN), kirim lewati S-18 lalu panggil ulang tahap0_selesai (R-01)
    if (hasil && !hasil.ok && hasil.galat === 'E_URUTAN') {
      await panggilApi('catat', {
        tahap: 'T0',
        aspek: 'ketegangan',
        butir: 'TG-01',
        nilai: '',
        flag: 'lewati'
      }, { tanpaTungguOnline: true, janganArahkan: true });

      hasil = await panggilApi('tahap0_selesai', {}, {
        tanpaTungguOnline: true,
        janganArahkan: true
      });
    }

    if (hasil && hasil.ok) {
      await hapusKemajuanTahap0();
      arahKe('S-02');
      return;
    }

    // Jika sedang tidak ada internet / server sibuk, antrekan tahap0_selesai dan buka Unit 1 di sesi lokal
    const kodeGalat = hasil && hasil.galat ? hasil.galat : 'E_SERVER';
    if (kodeGalat === 'E_SERVER' || kodeGalat === 'E_SIBUK') {
      await kirimAtauAntre('tahap0_selesai', {}, 'Selesai Tahap 0', 'ANGKA');
      const state = ambilState();
      const stLama = state.status_server || {};
      const daftarBlok = Array.isArray(stLama.blok_terbuka) && stLama.blok_terbuka.length > 0
        ? stLama.blok_terbuka
        : ['U1-BA'];
      await perbaruiStatusServer({
        ...stLama,
        tahap0_selesai: stLama.tahap0_selesai || waktuIsoWib(),
        unit_terbuka: Math.max(1, Number(stLama.unit_terbuka || 0)),
        blok_terbuka: daftarBlok
      });
      await hapusKemajuanTahap0();
      arahKe('S-02');
      return;
    }

    sedangKirim = false;
    pesanInfo = (hasil && hasil.pesan) || 'Belum dapat membuka Unit 1. Silakan coba lagi.';
    gambar();
  }

  gambar();
}
